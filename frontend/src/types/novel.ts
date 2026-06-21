/**
 * Novel-mode data structures (data-model.md §2-4).
 * Body is a 2-level hierarchy: chapter > section (3+ levels are not allowed).
 * Stored nested inside the script document, not as separate collections.
 */

/** A section (2nd level). Cannot contain further nesting. */
export interface NovelSection {
  id: string;
  title: string;
  order: number;
  body: string;
}

/** A chapter (1st level). May contain optional sections; chapter-only is valid. */
export interface NovelChapter {
  id: string;
  title: string;
  order: number;
  /** Body directly under the chapter (used when the chapter has no sections). */
  body: string;
  sections?: NovelSection[];
}

export interface NovelContent {
  chapters: NovelChapter[];
}

/** Novel-specific layout settings. */
export interface NovelSettings {
  /** Default 'vertical' (Q1). */
  writingDirection: 'vertical' | 'horizontal';
  /** Default 20 (Q2 — 400-char manuscript grid). */
  lineLength: number;
  /** Default 20 (Q2). */
  linesPerPage: number;
  /** Optional page count used by the chapter-list progress metric. */
  pageCount: number;
}

// ── Worldbuilding (設定資料 4 fields, FR-015) ──

/** Character entry — reuses the screenplay CharacterTable shape. */
export interface WorldbuildingCharacter {
  id: string;
  name: string;
  age?: string;
  traits?: string;
  background?: string;
  relationships?: string;
  notes?: string;
}

/** Timeline row: 日時 / イベント / 関係人物. */
export interface TimelineEntry {
  id: string;
  when: string;
  event: string;
  related?: string;
}

/** Glossary row: 用語 / 読み / 説明. */
export interface GlossaryEntry {
  id: string;
  term: string;
  reading?: string;
  description: string;
}

/** Setting reference material. All fields optional (empty is valid). */
export interface Worldbuilding {
  /** Work theme — set first; seeds AI auto-generation (FR-027/FR-028). */
  theme: string;
  characters: WorldbuildingCharacter[];
  worldview: string;
  timeline: TimelineEntry[];
  glossary: GlossaryEntry[];
}

export const DEFAULT_NOVEL_SETTINGS: NovelSettings = {
  writingDirection: 'vertical',
  lineLength: 20,
  linesPerPage: 20,
  pageCount: 10,
};

export function createEmptyNovelContent(): NovelContent {
  return { chapters: [] };
}

export function createEmptyWorldbuilding(): Worldbuilding {
  return { theme: '', characters: [], worldview: '', timeline: [], glossary: [] };
}
