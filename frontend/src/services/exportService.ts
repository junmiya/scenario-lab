import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageTextDirectionType,
  DocumentGridType,
  SectionType,
} from 'docx';
import JSZip from 'jszip';

export interface ExportInput {
  title: string;
  authorName: string;
  synopsis: string;
  characterText: string;
  content: string;
  lineLength: number;      // chars per column (字数/行)
  linesPerPage: number;    // columns per page (行数/枚)
}

export interface ExportPayload {
  fileName: string;
  blob: Blob;
}

// ────────────────────────────────────────
// 標準エクスポート（テンプレートなし）
// ────────────────────────────────────────

const FONT_CONFIG = {
  eastAsia: '游明朝',
  ascii: 'Yu Mincho',
  hAnsi: 'Yu Mincho',
  cs: 'MS 明朝',
};
const FONT_SIZE_PT = 12;
const TITLE_FONT_SIZE_PT = 16;
const HEADING_FONT_SIZE_PT = 14;

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN_TOP = 1701;
const MARGIN_BOTTOM = 1701;
const MARGIN_LEFT = 1418;
const MARGIN_RIGHT = 1418;

function assertRequiredMetadata(input: ExportInput): void {
  if (!input.title.trim() || !input.authorName.trim()) {
    throw new Error('EXPORT_METADATA_REQUIRED');
  }
}

export function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9\u3040-\u9FFF-_]/g, '_');
}

function computeGrid(lineLength: number, linesPerPage: number) {
  const textWidth = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const textHeight = A4_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const linePitch = Math.round(textWidth / linesPerPage);
  const fontSizeTwips = FONT_SIZE_PT * 20;
  const desiredCharPitch = Math.round(textHeight / lineLength);
  const charSpace = Math.max(0, desiredCharPitch - fontSizeTwips);
  return { linePitch, charSpace };
}

function buildTextParagraphs(content: string): Paragraph[] {
  return content.split('\n').map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({ text: line || '\u3000', font: FONT_CONFIG, size: FONT_SIZE_PT * 2 }),
        ],
      }),
  );
}

function buildSectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, font: FONT_CONFIG, size: HEADING_FONT_SIZE_PT * 2 }),
    ],
  });
}

/** 標準エクスポート: docx ライブラリで一から生成 */
export async function createExportPayload(input: ExportInput): Promise<ExportPayload> {
  assertRequiredMetadata(input);

  const { linePitch, charSpace } = computeGrid(input.lineLength, input.linesPerPage);
  const gridProps = { type: DocumentGridType.LINES_AND_CHARS, linePitch, charSpace };
  const pageProps = {
    size: { width: A4_WIDTH, height: A4_HEIGHT },
    margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    textDirection: PageTextDirectionType.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
  };

  const sections: any[] = [
    {
      properties: { page: pageProps, grid: gridProps },
      children: [
        ...Array.from({ length: 6 }, () => new Paragraph({ children: [] })),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: input.title, bold: true, font: FONT_CONFIG, size: TITLE_FONT_SIZE_PT * 2 })],
        }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `作　${input.authorName}`, font: FONT_CONFIG, size: FONT_SIZE_PT * 2 })],
        }),
      ],
    },
  ];

  if (input.characterText.trim()) {
    sections.push({
      properties: { type: SectionType.NEXT_PAGE, page: pageProps, grid: gridProps },
      children: [buildSectionHeading('登場人物'), new Paragraph({ children: [] }), ...buildTextParagraphs(input.characterText)],
    });
  }

  if (input.synopsis.trim()) {
    sections.push({
      properties: { type: SectionType.NEXT_PAGE, page: pageProps, grid: gridProps },
      children: [buildSectionHeading('あらすじ'), new Paragraph({ children: [] }), ...buildTextParagraphs(input.synopsis)],
    });
  }

  sections.push({
    properties: { type: SectionType.NEXT_PAGE, page: pageProps, grid: gridProps },
    children: buildTextParagraphs(input.content),
  });

  const doc = new Document({ sections });
  const blob = await Packer.toBlob(doc);
  return { fileName: `${sanitizeFileName(input.title)}.docx`, blob };
}

// ────────────────────────────────────────
// テンプレート注入エクスポート（マッピングベース）
// ────────────────────────────────────────

import type { FieldMapping, MappedField } from '../types/formatPreset';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

interface ParagraphEntry {
  element: Element;
  sectionIndex: number;
  paragraphIndex: number;
  hasSectPr: boolean;
}

/** テンプレートの全段落をセクション・段落番号付きで収集 */
function collectParagraphs(body: Element): ParagraphEntry[] {
  const result: ParagraphEntry[] = [];
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
      result.push({ element: el, sectionIndex: sectionIdx, paragraphIndex: paraIdx, hasSectPr });
      if (hasSectPr) { sectionIdx++; paraIdx = 0; } else { paraIdx++; }
    }
  }
  return result;
}

/** 段落のテキスト run を差し替える（pPr の style や sectPr は保持） */
function replaceParagraphText(p: Element, text: string, doc: XMLDocument): void {
  // 既存の run を全削除
  const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'));
  for (const r of runs) p.removeChild(r);

  // 新しい run を追加（テンプレートのフォント情報は pPr/rPr から継承される）
  const r = doc.createElementNS(W_NS, 'w:r');
  const t = doc.createElementNS(W_NS, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.textContent = text;
  r.appendChild(t);
  p.appendChild(r);
}

/** テキストを複数段落として段落の後に挿入 */
function insertLinesAfter(refPara: Element, lines: string[], doc: XMLDocument, body: Element): void {
  const parser = new DOMParser();
  let insertBefore = refPara.nextSibling;

  for (const line of lines) {
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const xml = `<w:p xmlns:w="${W_NS}"><w:r><w:t xml:space="preserve">${escaped || '\u3000'}</w:t></w:r></w:p>`;
    const tmpDoc = parser.parseFromString(`<root xmlns:w="${W_NS}">${xml}</root>`, 'application/xml');
    const imported = doc.importNode(tmpDoc.documentElement.firstChild!, true);
    if (insertBefore) {
      body.insertBefore(imported, insertBefore);
    } else {
      body.appendChild(imported);
    }
    // 次の挿入は今追加したノードの後
    insertBefore = imported.nextSibling;
  }
}

/** セクション内のマッピング対象以外の段落を全削除して content で埋める */
function fillSection(sectionIndex: number, lines: string[], paragraphs: ParagraphEntry[], doc: XMLDocument, body: Element): void {
  const sectionParas = paragraphs.filter((p) => p.sectionIndex === sectionIndex && !p.hasSectPr);

  // 最初の段落の前に挿入する位置を記録
  const firstPara = sectionParas[0];
  const insertBefore = firstPara?.element ?? null;

  // 既存段落を削除
  for (const p of sectionParas) {
    body.removeChild(p.element);
  }

  // 新しいコンテンツを挿入
  const parser = new DOMParser();
  for (const line of lines) {
    const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const xml = `<w:p xmlns:w="${W_NS}"><w:r><w:t xml:space="preserve">${escaped || '\u3000'}</w:t></w:r></w:p>`;
    const tmpDoc = parser.parseFromString(`<root xmlns:w="${W_NS}">${xml}</root>`, 'application/xml');
    const imported = doc.importNode(tmpDoc.documentElement.firstChild!, true);
    if (insertBefore) {
      body.insertBefore(imported, insertBefore);
    } else {
      body.appendChild(imported);
    }
  }
}

/**
 * テンプレート注入エクスポート:
 * fieldMappings に従い、テンプレートのプレースホルダーを実コンテンツに差し替える。
 * フォーマット（sectPr, styles, footer 等）は完全に保持。
 */
export async function createExportFromTemplate(
  input: ExportInput,
  templateBase64: string,
  fieldMappings: FieldMapping[],
): Promise<ExportPayload> {
  assertRequiredMetadata(input);

  const zip = await JSZip.loadAsync(templateBase64, { base64: true });
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('TEMPLATE_INVALID');

  const docXmlText = await docXmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlText, 'application/xml') as XMLDocument;
  const body = xmlDoc.getElementsByTagNameNS(W_NS, 'body')[0]
    ?? xmlDoc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('TEMPLATE_INVALID: no w:body');

  const paragraphs = collectParagraphs(body);

  // フィールド値のマップ
  const fieldValues: Record<MappedField, string> = {
    title: input.title,
    authorName: input.authorName,
    characterText: input.characterText,
    synopsis: input.synopsis,
    content: input.content,
  };

  console.log('[export-template] applying', fieldMappings.length, 'mappings');

  // content は特殊処理（セクション全体を差し替え）なので最後に処理
  const contentMapping = fieldMappings.find((m) => m.field === 'content');
  const otherMappings = fieldMappings.filter((m) => m.field !== 'content');

  // 1. replace / insertAfter マッピングを処理
  for (const mapping of otherMappings) {
    const para = paragraphs.find(
      (p) => p.sectionIndex === mapping.sectionIndex && p.paragraphIndex === mapping.paragraphIndex,
    );
    if (!para) {
      console.warn('[export-template] paragraph not found for mapping:', mapping);
      continue;
    }

    const value = fieldValues[mapping.field];
    if (!value.trim()) continue;

    if (mapping.action === 'replace') {
      replaceParagraphText(para.element, value, xmlDoc);
    } else if (mapping.action === 'insertAfter') {
      const lines = value.split('\n');
      insertLinesAfter(para.element, lines, xmlDoc, body as Element);
    }
  }

  // 2. content マッピング: セクション全体を差し替え
  if (contentMapping) {
    const lines = input.content.split('\n');
    // あらすじがあり、content と同じセクションにマッピングされていない場合、content の前に挿入
    if (input.synopsis.trim() && !fieldMappings.some((m) => m.field === 'synopsis')) {
      lines.unshift('', 'あらすじ', '', ...input.synopsis.split('\n'), '');
    }
    fillSection(contentMapping.sectionIndex, lines, paragraphs, xmlDoc, body as Element);
  }

  // シリアライズして書き戻し
  const serializer = new XMLSerializer();
  zip.file('word/document.xml', serializer.serializeToString(xmlDoc));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return { fileName: `${sanitizeFileName(input.title)}.docx`, blob };
}

// ────────────────────────────────────────
// Save As ダイアログ
// ────────────────────────────────────────

export async function savePayloadAs(payload: ExportPayload): Promise<string> {
  console.log('[save] showSaveFilePicker supported:', 'showSaveFilePicker' in window);
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: payload.fileName,
        types: [
          {
            description: 'Word文書',
            accept: { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(payload.blob);
      await writable.close();
      return handle.name as string;
    } catch (e: any) {
      if (e?.name === 'AbortError') return '';
      throw e;
    }
  }

  const url = URL.createObjectURL(payload.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = payload.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return payload.fileName;
}
