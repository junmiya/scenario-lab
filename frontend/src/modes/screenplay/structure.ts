import type { StructureDef } from '../types';

/**
 * Screenplay structure guide: 起承転結 ratio segments.
 * Migrated verbatim from pages/EditorPage.tsx `structureSegments` — behavior unchanged.
 */
export const SCREENPLAY_STRUCTURE: StructureDef = {
  kind: 'ratio',
  segments: [
    { id: 'intro', label: '起', ratio: 0.25 },
    { id: 'development', label: '承', ratio: 0.35 },
    { id: 'turn', label: '転', ratio: 0.2 },
    { id: 'closing', label: '結', ratio: 0.2 },
  ],
};
