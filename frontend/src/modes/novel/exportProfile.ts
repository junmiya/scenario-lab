import type { ExportPresetDef } from '../types';

/**
 * Novel export presets (FR-016). The docx generation (章=見出し1 / 節=見出し2, indent,
 * writingDirection-aware page direction) lands in Phase 5 (US3); this declares the
 * selectable presets for the mode registry.
 */
export const NOVEL_EXPORT_PRESETS: ExportPresetDef[] = [
  { id: 'novel-manuscript-vertical', label: '縦書き原稿用紙', writingDirection: 'vertical' },
  { id: 'novel-bunko-horizontal', label: '文庫横書き', writingDirection: 'horizontal' },
  { id: 'novel-web-plain', label: 'Web小説プレーン', writingDirection: 'horizontal' },
];
