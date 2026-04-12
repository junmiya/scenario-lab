import JSZip from 'jszip';
import type { FormatPreset, FieldMapping, MappedField } from '../types/formatPreset';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

type ParsedPreset = Omit<FormatPreset, 'id' | 'ownerId' | 'name' | 'createdAt' | 'updatedAt'>;

function getAttr(el: Element, ns: string, attr: string): string | null {
  return el.getAttributeNS(ns, attr) || el.getAttribute(`w:${attr}`);
}

function numAttr(el: Element, ns: string, attr: string): number | null {
  const v = getAttr(el, ns, attr);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function findElements(doc: Document, localName: string): Element[] {
  let els = doc.getElementsByTagNameNS(W_NS, localName);
  if (els.length === 0) els = doc.getElementsByTagName(`w:${localName}`);
  return Array.from(els);
}

function getParagraphText(p: Element): string {
  const runs = p.getElementsByTagNameNS(W_NS, 'r');
  let text = '';
  for (let r = 0; r < runs.length; r++) {
    const ts = runs[r]!.getElementsByTagNameNS(W_NS, 't');
    for (let t = 0; t < ts.length; t++) {
      text += ts[t]!.textContent ?? '';
    }
  }
  return text;
}

// ────────────────────────────────────────
// フィールドマッピング自動検出
// ────────────────────────────────────────

const FIELD_PATTERNS: { field: MappedField; pattern: RegExp; action: FieldMapping['action'] }[] = [
  { field: 'title',         pattern: /タイトル|題名|作品名/,             action: 'replace' },
  { field: 'authorName',    pattern: /名前|氏名|著者|作者/,             action: 'replace' },
  { field: 'characterText', pattern: /登場人物/,                        action: 'insertAfter' },
  { field: 'synopsis',      pattern: /あらすじ|梗概|概要/,              action: 'insertAfter' },
  { field: 'content',       pattern: /本文|シナリオ/,                   action: 'replace' },
];

interface ParagraphInfo {
  element: Element;
  text: string;
  sectionIndex: number;
  paragraphIndex: number;
  hasSectPr: boolean;
}

function parseParagraphs(doc: Document): ParagraphInfo[] {
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
    ?? doc.getElementsByTagName('w:body')[0];
  if (!body) return [];

  const result: ParagraphInfo[] = [];
  let sectionIdx = 0;
  let paraIdx = 0;

  for (let i = 0; i < body.childNodes.length; i++) {
    const c = body.childNodes[i]!;
    if (c.nodeType !== 1) continue;
    const el = c as Element;
    const ln = el.localName || el.nodeName.replace(/^w:/, '');

    if (ln === 'sectPr') {
      sectionIdx++;
      paraIdx = 0;
      continue;
    }

    if (ln === 'p') {
      let hasSectPr = false;
      const pPrs = el.getElementsByTagNameNS(W_NS, 'pPr');
      if (pPrs.length > 0) {
        const sp = pPrs[0]!.getElementsByTagNameNS(W_NS, 'sectPr');
        if (sp.length > 0) hasSectPr = true;
      }

      result.push({
        element: el,
        text: getParagraphText(el),
        sectionIndex: sectionIdx,
        paragraphIndex: paraIdx,
        hasSectPr,
      });

      if (hasSectPr) {
        sectionIdx++;
        paraIdx = 0;
      } else {
        paraIdx++;
      }
    }
  }

  return result;
}

export function detectFieldMappings(doc: Document): FieldMapping[] {
  const paragraphs = parseParagraphs(doc);
  const mappings: FieldMapping[] = [];
  const usedFields = new Set<MappedField>();

  for (const para of paragraphs) {
    if (!para.text.trim()) continue;

    for (const { field, pattern, action } of FIELD_PATTERNS) {
      if (usedFields.has(field)) continue;
      if (pattern.test(para.text)) {
        mappings.push({
          field,
          keyword: para.text.trim(),
          sectionIndex: para.sectionIndex,
          paragraphIndex: para.paragraphIndex,
          action,
        });
        usedFields.add(field);
        break;
      }
    }
  }

  // content: 本文セクションが検出されなかった場合、最後のセクションをまるごと content にする
  if (!usedFields.has('content') && paragraphs.length > 0) {
    const lastSection = paragraphs[paragraphs.length - 1]!.sectionIndex;
    const firstInLastSection = paragraphs.find((p) => p.sectionIndex === lastSection);
    if (firstInLastSection) {
      mappings.push({
        field: 'content',
        keyword: '(最終セクション全体)',
        sectionIndex: lastSection,
        paragraphIndex: firstInLastSection.paragraphIndex,
        action: 'replace',
      });
    }
  }

  return mappings;
}

// ────────────────────────────────────────
// グリッド値の解析（UI表示用）
// ────────────────────────────────────────

async function extractDisplayValues(zip: JSZip): Promise<{ lineLength: number | null; linesPerPage: number | null; fontEastAsia: string }> {
  let lineLength: number | null = null;
  let linesPerPage: number | null = null;
  let fontEastAsia = '游明朝';

  const parser = new DOMParser();
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) return { lineLength, linesPerPage, fontEastAsia };

  const text = await docXmlFile.async('text');
  const doc = parser.parseFromString(text, 'application/xml');

  const sectPrs = findElements(doc, 'sectPr');
  const bodySectPr = sectPrs.length > 0 ? sectPrs[sectPrs.length - 1]! : null;

  if (bodySectPr) {
    const docGridList = bodySectPr.getElementsByTagNameNS(W_NS, 'docGrid');
    const docGrid = docGridList[0] ?? bodySectPr.getElementsByTagName('w:docGrid')[0];

    if (docGrid) {
      const lp = numAttr(docGrid, W_NS, 'linePitch');
      const cs = numAttr(docGrid, W_NS, 'charSpace');
      const gridType = getAttr(docGrid, W_NS, 'type');

      const pgSz = (bodySectPr.getElementsByTagNameNS(W_NS, 'pgSz')[0]
        ?? bodySectPr.getElementsByTagName('w:pgSz')[0]) as Element | undefined;
      const pgMar = (bodySectPr.getElementsByTagNameNS(W_NS, 'pgMar')[0]
        ?? bodySectPr.getElementsByTagName('w:pgMar')[0]) as Element | undefined;

      if (pgSz && pgMar && lp && lp > 0) {
        const pw = numAttr(pgSz, W_NS, 'w') ?? 0;
        const ph = numAttr(pgSz, W_NS, 'h') ?? 0;
        const ml = numAttr(pgMar, W_NS, 'left') ?? 0;
        const mr = numAttr(pgMar, W_NS, 'right') ?? 0;
        const mt = numAttr(pgMar, W_NS, 'top') ?? 0;
        const mb = numAttr(pgMar, W_NS, 'bottom') ?? 0;

        linesPerPage = Math.round((pw - ml - mr) / lp);

        if (cs !== null) {
          let fsPt = 12;
          const stylesFile = zip.file('word/styles.xml');
          if (stylesFile) {
            const stylesText = await stylesFile.async('text');
            const stylesDoc = parser.parseFromString(stylesText, 'application/xml');
            for (const sz of findElements(stylesDoc, 'sz')) {
              const val = numAttr(sz, W_NS, 'val');
              if (val !== null) { fsPt = val / 2; break; }
            }
          }
          const fontTwips = fsPt * 20;
          const charPitch = gridType === 'snapToChars'
            ? fontTwips + cs / 204.8
            : cs + fontTwips;
          if (charPitch > 0) lineLength = Math.round((ph - mt - mb) / charPitch);
        }
      }
    }
  }

  for (const rf of findElements(doc, 'rFonts')) {
    const ea = getAttr(rf, W_NS, 'eastAsia');
    if (ea) { fontEastAsia = ea; break; }
  }

  return { lineLength, linesPerPage, fontEastAsia };
}

// ────────────────────────────────────────
// メインパーサー
// ────────────────────────────────────────

export async function parseDocxTemplate(file: File): Promise<ParsedPreset> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  if (!zip.file('word/document.xml')) {
    throw new Error('TEMPLATE_INVALID: word/document.xml not found');
  }

  const templateBase64 = await zip.generateAsync({ type: 'base64' });
  const { lineLength, linesPerPage, fontEastAsia } = await extractDisplayValues(zip);

  // マッピング検出
  const parser = new DOMParser();
  const docXmlText = await zip.file('word/document.xml')!.async('text');
  const doc = parser.parseFromString(docXmlText, 'application/xml');
  const fieldMappings = detectFieldMappings(doc);

  console.log('[template] mappings:', fieldMappings);
  console.log('[template] display:', { lineLength, linesPerPage, fontEastAsia });

  return {
    templateBase64,
    fieldMappings,
    lineLength,
    linesPerPage,
    fontEastAsia,
    sourceFileName: file.name,
  };
}
