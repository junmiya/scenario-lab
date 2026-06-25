import { DEFAULT_SETTINGS } from '../../stores/editorStore';

/**
 * Screenplay default layout: 20 chars × 20 lines × 10 pages (ペラ準拠).
 * Re-exported from the existing editorStore default to keep a single source of truth
 * during the migration (behavior unchanged).
 */
export const SCREENPLAY_DEFAULT_SETTINGS = DEFAULT_SETTINGS;
