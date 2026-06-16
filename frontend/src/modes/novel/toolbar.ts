import type { ToolbarActionDef } from '../types';

/**
 * Novel toolbar actions (章 / 節 / 会話 / 地の文). FR-006.
 * - chapter / section: insert heading markers handled by the editor store (2-level hierarchy).
 * - dialogue (会話): 「」 with caret moved to line start, like screenplay dialogue.
 * - narration (地の文): full-width indent for a new paragraph.
 */
export const NOVEL_TOOLBAR_ACTIONS: ToolbarActionDef[] = [
  { id: 'chapter', label: '章を挿入', template: '' },
  { id: 'section', label: '節を挿入', template: '' },
  { id: 'dialogue', label: '会話', template: '「」', cursorToLineStart: true },
  { id: 'narration', label: '地の文', template: '　' }, // 1 full-width indent space
];
