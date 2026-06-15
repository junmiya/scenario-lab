import type { ExportPresetDef } from '../types';

/**
 * Screenplay export presets. The screenplay docx generation (vertical grid,
 * 登場人物→あらすじ→本文 ordering) remains in services/exportService.ts; this file
 * declares the selectable presets for the mode registry. Behavior unchanged.
 */
export const SCREENPLAY_EXPORT_PRESETS: ExportPresetDef[] = [
  { id: 'screenplay-vertical', label: '縦書き脚本', writingDirection: 'vertical' },
];
