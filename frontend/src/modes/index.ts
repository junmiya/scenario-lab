import type { ContentType, ModeProfile } from './types';
import { SCREENPLAY_TOOLBAR_ACTIONS } from './screenplay/toolbar';
import { SCREENPLAY_STRUCTURE } from './screenplay/structure';
import { SCREENPLAY_PROMPTS } from './screenplay/prompts';
import { SCREENPLAY_EXPORT_PRESETS } from './screenplay/exportProfile';
import { SCREENPLAY_DEFAULT_SETTINGS } from './screenplay/defaults';
import { NOVEL_TOOLBAR_ACTIONS } from './novel/toolbar';
import { NOVEL_STRUCTURE } from './novel/structure';
import { NOVEL_PROMPTS } from './novel/prompts';
import { NOVEL_EXPORT_PRESETS } from './novel/exportProfile';
import { NOVEL_DEFAULT_SETTINGS } from './novel/defaults';

export type { ContentType, ModeProfile } from './types';

/** Default content type for documents without an explicit value (backward compatible). */
export const DEFAULT_CONTENT_TYPE: ContentType = 'screenplay';

/**
 * Normalize a possibly-undefined contentType from Firestore into a concrete value.
 * Pre-migration documents have no `contentType` field and are treated as screenplay.
 */
export function resolveContentType(value: string | undefined | null): ContentType {
  return value === 'novel' ? 'novel' : 'screenplay';
}

const SCREENPLAY_PROFILE: ModeProfile = {
  contentType: 'screenplay',
  label: '脚本',
  toolbar: SCREENPLAY_TOOLBAR_ACTIONS,
  structure: SCREENPLAY_STRUCTURE,
  prompts: SCREENPLAY_PROMPTS,
  exportPresets: SCREENPLAY_EXPORT_PRESETS,
  defaults: {
    settings: SCREENPLAY_DEFAULT_SETTINGS,
    writingDirection: 'vertical',
  },
};

const NOVEL_PROFILE: ModeProfile = {
  contentType: 'novel',
  label: '小説',
  toolbar: NOVEL_TOOLBAR_ACTIONS,
  structure: NOVEL_STRUCTURE,
  prompts: NOVEL_PROMPTS,
  exportPresets: NOVEL_EXPORT_PRESETS,
  defaults: {
    settings: NOVEL_DEFAULT_SETTINGS,
    writingDirection: 'vertical',
  },
};

/** Mode registry: contentType → ModeProfile. */
const MODE_REGISTRY: Partial<Record<ContentType, ModeProfile>> = {
  screenplay: SCREENPLAY_PROFILE,
  novel: NOVEL_PROFILE,
};

/** Resolve a mode profile by content type, falling back to screenplay. */
export function getModeProfile(contentType: string | undefined | null): ModeProfile {
  const resolved = resolveContentType(contentType);
  return MODE_REGISTRY[resolved] ?? SCREENPLAY_PROFILE;
}

/** Internal: register a mode profile (used as novel/etc. profiles are implemented). */
export function registerModeProfile(profile: ModeProfile): void {
  MODE_REGISTRY[profile.contentType] = profile;
}
