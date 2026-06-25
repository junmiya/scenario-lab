import type { ToolbarActionDef } from '../types';

/**
 * Screenplay toolbar actions (柱 / ト書き / セリフ).
 * Migrated verbatim from components/toolbar/ScriptToolbar.tsx INSERT_TEMPLATES — behavior unchanged.
 */
export const SCREENPLAY_TOOLBAR_ACTIONS: ToolbarActionDef[] = [
  { id: 'scene', label: '柱', template: '○' },
  { id: 'action', label: 'ト書き', template: '　　　' }, // 3 full-width spaces
  { id: 'dialogue', label: 'セリフ', template: '「」', cursorToLineStart: true },
];
