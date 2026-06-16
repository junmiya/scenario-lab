import type { EditorSettings } from '../../stores/editorStore';

/**
 * Novel default layout: 20 chars × 20 lines × 10 pages (400-char manuscript grid, Q2).
 * Writing direction defaults to vertical (Q1) — see ModeProfile.defaults.writingDirection.
 */
export const NOVEL_DEFAULT_SETTINGS: EditorSettings = {
  lineLength: 20,
  linesPerPage: 20,
  pageCount: 10,
};
