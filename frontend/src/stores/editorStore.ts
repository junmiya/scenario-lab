import type {
  NovelChapter,
  NovelContent,
  NovelSection,
  NovelSettings,
  TimelineEntry,
  GlossaryEntry,
  Worldbuilding,
} from '../types/novel';
import {
  DEFAULT_NOVEL_SETTINGS,
  createEmptyNovelContent,
  createEmptyWorldbuilding,
} from '../types/novel';

export interface EditorSettings {
  lineLength: number;
  linesPerPage: number;
  pageCount: number;
}

export interface GuideMetrics {
  totalCapacity: number;
  filledRatio: number;
  currentLines: number;
}

export type ContentType = 'screenplay' | 'novel';

export interface EditorState {
  contentType: ContentType;
  title: string;
  authorName: string;
  synopsis: string;
  characterText: string;
  content: string;
  settings: EditorSettings;
  metrics: GuideMetrics;
  synopsisSettings: EditorSettings;
  synopsisMetrics: GuideMetrics;
  characterSettings: EditorSettings;
  characterMetrics: GuideMetrics;
  // ── Novel mode (contentType === 'novel'). Undefined in screenplay mode. ──
  novelContent?: NovelContent;
  novelSettings?: NovelSettings;
  worldbuilding?: Worldbuilding;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  lineLength: 20,
  linesPerPage: 20,
  pageCount: 10,
};

export const DEFAULT_SYNOPSIS_SETTINGS: EditorSettings = {
  lineLength: 20,
  linesPerPage: 20,
  pageCount: 2,
};

export const DEFAULT_CHARACTER_SETTINGS: EditorSettings = {
  lineLength: 20,
  linesPerPage: 20,
  pageCount: 2,
};

export function recalculateGuideMetrics(content: string, settings: EditorSettings): GuideMetrics {
  const totalCapacity = settings.lineLength * settings.linesPerPage * settings.pageCount;
  const contentLength = content.replace(/[\r\n]/g, '').length;
  const filledRatio = totalCapacity > 0 ? Math.min(contentLength / totalCapacity, 1) : 0;

  let currentLines = 0;
  if (content.length === 0) {
    currentLines = 0;
  } else if (settings.lineLength > 0) {
    const paragraphs = content.split('\n');
    for (const p of paragraphs) {
      if (p.length === 0) {
        currentLines += 1;
      } else {
        currentLines += Math.ceil(p.length / settings.lineLength);
      }
    }
  }

  return { totalCapacity, filledRatio, currentLines };
}

function calcCapacity(s: EditorSettings): number {
  return s.lineLength * s.linesPerPage * s.pageCount;
}

export function createInitialEditorState(contentType: ContentType = 'screenplay'): EditorState {
  return {
    contentType,
    title: '',
    authorName: '',
    synopsis: '',
    characterText: '',
    content: '',
    settings: DEFAULT_SETTINGS,
    metrics: {
      totalCapacity: calcCapacity(DEFAULT_SETTINGS),
      filledRatio: 0,
      currentLines: 0,
    },
    synopsisSettings: DEFAULT_SYNOPSIS_SETTINGS,
    synopsisMetrics: {
      totalCapacity: calcCapacity(DEFAULT_SYNOPSIS_SETTINGS),
      filledRatio: 0,
      currentLines: 0,
    },
    characterSettings: DEFAULT_CHARACTER_SETTINGS,
    characterMetrics: {
      totalCapacity: calcCapacity(DEFAULT_CHARACTER_SETTINGS),
      filledRatio: 0,
      currentLines: 0,
    },
    ...(contentType === 'novel'
      ? {
          novelContent: createEmptyNovelContent(),
          novelSettings: { ...DEFAULT_NOVEL_SETTINGS },
          worldbuilding: createEmptyWorldbuilding(),
        }
      : {}),
  };
}

export function updateContent(state: EditorState, content: string): EditorState {
  const next = { ...state, content };
  return { ...next, metrics: recalculateGuideMetrics(next.content, next.settings) };
}

export function updateSettings(state: EditorState, settings: EditorSettings): EditorState {
  const next = { ...state, settings };
  return { ...next, metrics: recalculateGuideMetrics(next.content, next.settings) };
}

export function updateSynopsis(state: EditorState, synopsis: string): EditorState {
  const next = { ...state, synopsis };
  return {
    ...next,
    synopsisMetrics: recalculateGuideMetrics(next.synopsis, next.synopsisSettings),
  };
}

export function updateSynopsisSettings(
  state: EditorState,
  synopsisSettings: EditorSettings,
): EditorState {
  const next = { ...state, synopsisSettings };
  return {
    ...next,
    synopsisMetrics: recalculateGuideMetrics(next.synopsis, next.synopsisSettings),
  };
}

export function updateCharacterText(state: EditorState, characterText: string): EditorState {
  const next = { ...state, characterText };
  return {
    ...next,
    characterMetrics: recalculateGuideMetrics(next.characterText, next.characterSettings),
  };
}

export function updateCharacterSettings(
  state: EditorState,
  characterSettings: EditorSettings,
): EditorState {
  const next = { ...state, characterSettings };
  return {
    ...next,
    characterMetrics: recalculateGuideMetrics(next.characterText, next.characterSettings),
  };
}

// ────────────────────────────────────────
// 小説モード: 章・節 CRUD（NovelContent に対する純粋関数）
// 階層は「章 > 節」の 2 階層固定。節は任意（章のみでも有効）。
// ────────────────────────────────────────

let novelIdCounter = 0;
function genNovelId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  novelIdCounter += 1;
  return `${prefix}-${novelIdCounter}`;
}

/** Re-number chapter/section `order` to a contiguous 0-based sequence. */
function renumber<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function addChapter(nc: NovelContent, title = '', id: string = genNovelId('ch')): NovelContent {
  const chapter: NovelChapter = { id, title, order: nc.chapters.length, body: '' };
  return { ...nc, chapters: [...nc.chapters, chapter] };
}

export function updateChapter(
  nc: NovelContent,
  chapterId: string,
  patch: Partial<Pick<NovelChapter, 'title' | 'body'>>,
): NovelContent {
  return {
    ...nc,
    chapters: nc.chapters.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
  };
}

export function removeChapter(nc: NovelContent, chapterId: string): NovelContent {
  return { ...nc, chapters: renumber(nc.chapters.filter((c) => c.id !== chapterId)) };
}

/** Move a chapter by one position (direction: -1 up, +1 down). No-op at the boundary. */
export function moveChapter(nc: NovelContent, chapterId: string, direction: -1 | 1): NovelContent {
  const sorted = [...nc.chapters].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((c) => c.id === chapterId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= sorted.length) return nc;
  [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
  return { ...nc, chapters: renumber(sorted) };
}

export function addSection(
  nc: NovelContent,
  chapterId: string,
  title = '',
  id: string = genNovelId('sec'),
): NovelContent {
  return {
    ...nc,
    chapters: nc.chapters.map((c) => {
      if (c.id !== chapterId) return c;
      const sections = c.sections ?? [];
      const section: NovelSection = { id, title, order: sections.length, body: '' };
      return { ...c, sections: [...sections, section] };
    }),
  };
}

export function updateSection(
  nc: NovelContent,
  chapterId: string,
  sectionId: string,
  patch: Partial<Pick<NovelSection, 'title' | 'body'>>,
): NovelContent {
  return {
    ...nc,
    chapters: nc.chapters.map((c) => {
      if (c.id !== chapterId || !c.sections) return c;
      return {
        ...c,
        sections: c.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
      };
    }),
  };
}

export function removeSection(
  nc: NovelContent,
  chapterId: string,
  sectionId: string,
): NovelContent {
  return {
    ...nc,
    chapters: nc.chapters.map((c) => {
      if (c.id !== chapterId || !c.sections) return c;
      return { ...c, sections: renumber(c.sections.filter((s) => s.id !== sectionId)) };
    }),
  };
}

export interface ChapterMetric {
  id: string;
  title: string;
  /** Newline-excluded character count of the chapter body + all section bodies. */
  charCount: number;
  sectionCount: number;
}

function bodyCharCount(text: string): number {
  return text.replace(/[\r\n]/g, '').length;
}

/** Per-chapter metrics for the chapter-list panel (FR-008), ordered by `order`. */
export function computeChapterMetrics(nc: NovelContent): ChapterMetric[] {
  return [...nc.chapters]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const sectionChars = (c.sections ?? []).reduce((sum, s) => sum + bodyCharCount(s.body), 0);
      return {
        id: c.id,
        title: c.title,
        charCount: bodyCharCount(c.body) + sectionChars,
        sectionCount: (c.sections ?? []).length,
      };
    });
}

/** Total newline-excluded character count across all chapters/sections. */
export function novelTotalChars(nc: NovelContent): number {
  return computeChapterMetrics(nc).reduce((sum, m) => sum + m.charCount, 0);
}

// ────────────────────────────────────────
// 小説モード: 設定資料（worldbuilding）CRUD（FR-015）
// 人物 / 世界観 / 年表 / 用語集。すべて任意項目。
// ────────────────────────────────────────

export function setWorldview(wb: Worldbuilding, worldview: string): Worldbuilding {
  return { ...wb, worldview };
}

export function addTimelineEntry(
  wb: Worldbuilding,
  entry: Partial<Omit<TimelineEntry, 'id'>> = {},
  id: string = genNovelId('tl'),
): Worldbuilding {
  const row: TimelineEntry = { id, when: '', event: '', related: '', ...entry };
  return { ...wb, timeline: [...wb.timeline, row] };
}

export function updateTimelineEntry(
  wb: Worldbuilding,
  id: string,
  patch: Partial<Omit<TimelineEntry, 'id'>>,
): Worldbuilding {
  return { ...wb, timeline: wb.timeline.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function removeTimelineEntry(wb: Worldbuilding, id: string): Worldbuilding {
  return { ...wb, timeline: wb.timeline.filter((t) => t.id !== id) };
}

export function addGlossaryEntry(
  wb: Worldbuilding,
  entry: Partial<Omit<GlossaryEntry, 'id'>> = {},
  id: string = genNovelId('gl'),
): Worldbuilding {
  const row: GlossaryEntry = { id, term: '', reading: '', description: '', ...entry };
  return { ...wb, glossary: [...wb.glossary, row] };
}

export function updateGlossaryEntry(
  wb: Worldbuilding,
  id: string,
  patch: Partial<Omit<GlossaryEntry, 'id'>>,
): Worldbuilding {
  return { ...wb, glossary: wb.glossary.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
}

export function removeGlossaryEntry(wb: Worldbuilding, id: string): Worldbuilding {
  return { ...wb, glossary: wb.glossary.filter((g) => g.id !== id) };
}
