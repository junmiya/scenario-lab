import type { StructureDef } from '../types';

/**
 * Novel structure guide: a dynamic chapter list (FR-008), not the 起承転結 ratio segments.
 * Segments are derived at runtime from NovelContent.chapters (title + char count + section
 * count + progress); this static definition only declares the kind. The ChapterList
 * component builds the live list from the editor state.
 */
export const NOVEL_STRUCTURE: StructureDef = {
  kind: 'chapterList',
  segments: [],
};
