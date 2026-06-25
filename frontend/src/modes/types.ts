import type { EditorSettings } from '../stores/editorStore';

/**
 * Content type discriminator for the mode registry.
 * Documents without an explicit value are treated as 'screenplay' (backward compatible).
 */
export type ContentType = 'screenplay' | 'novel';

/** A single toolbar insert action (柱/ト書き/セリフ or 章/節/会話/地の文). */
export interface ToolbarActionDef {
  /** Stable action id, e.g. 'scene', 'dialogue', 'chapter'. */
  id: string;
  /** Button label shown in the UI (柱, 章, …). */
  label: string;
  /** Text inserted into the editor when the action is applied. */
  template: string;
  /** When true, move the caret to the line start after insertion (e.g. dialogue). */
  cursorToLineStart?: boolean;
}

/** A structure-guide segment. Screenplay uses ratio segments (起承転結); novel uses a chapter list. */
export interface StructureSegmentDef {
  id: string;
  label: string;
  /** Proportion of the whole work (screenplay 起承転結). Omitted for novel chapter lists. */
  ratio?: number;
}

export interface StructureDef {
  /** 'ratio' = fixed segments with proportions; 'chapterList' = dynamic chapter list. */
  kind: 'ratio' | 'chapterList';
  segments: StructureSegmentDef[];
}

/** System prompts for a single advice panel (structure + emotional axes). */
export interface PanelPrompts {
  /** Optional panel label override (e.g. 編集者 / 文芸評論家). */
  label?: string;
  structure: string;
  emotional: string;
}

/**
 * Prompt set for a mode. `default` is used for both panels unless a panel override is given.
 * Screenplay uses `default` only (panels differ by provider). Novel overrides panelA/panelB.
 */
export interface PromptSet {
  default: PanelPrompts;
  panelA?: PanelPrompts;
  panelB?: PanelPrompts;
}

export interface ExportPresetDef {
  id: string;
  label: string;
  writingDirection: 'vertical' | 'horizontal';
}

/**
 * Mode profile: the single source of truth for everything that differs between
 * screenplay and novel modes. Pure definitions only — no React or Firestore imports.
 */
export interface ModeProfile {
  contentType: ContentType;
  /** Human label for the mode (脚本 / 小説). */
  label: string;
  toolbar: ToolbarActionDef[];
  structure: StructureDef;
  prompts: PromptSet;
  exportPresets: ExportPresetDef[];
  defaults: {
    settings: EditorSettings;
    writingDirection?: 'vertical' | 'horizontal';
  };
}
