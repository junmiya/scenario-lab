import { describe, it, expect } from 'vitest';
import { getModeProfile, resolveContentType } from '../../../src/modes';
import { SCREENPLAY_TOOLBAR_ACTIONS } from '../../../src/modes/screenplay/toolbar';
import { SCREENPLAY_STRUCTURE } from '../../../src/modes/screenplay/structure';
import {
  SCREENPLAY_STRUCTURE_PROMPT,
  SCREENPLAY_EMOTIONAL_PROMPT,
} from '../../../src/modes/screenplay/prompts';
import { DEFAULT_SETTINGS } from '../../../src/stores/editorStore';

/**
 * Regression guard for the screenplay-logic migration into the modes layer.
 * These values were migrated verbatim from ScriptToolbar / EditorPage / adviceService;
 * they MUST remain identical so existing screenplay behavior never regresses (SC-005).
 */
describe('screenplay mode profile (migration regression)', () => {
  it('keeps the 柱/ト書き/セリフ toolbar templates verbatim', () => {
    expect(SCREENPLAY_TOOLBAR_ACTIONS).toEqual([
      { id: 'scene', label: '柱', template: '○' },
      { id: 'action', label: 'ト書き', template: '　　　' },
      { id: 'dialogue', label: 'セリフ', template: '「」', cursorToLineStart: true },
    ]);
  });

  it('keeps the 起承転結 ratio segments verbatim', () => {
    expect(SCREENPLAY_STRUCTURE).toEqual({
      kind: 'ratio',
      segments: [
        { id: 'intro', label: '起', ratio: 0.25 },
        { id: 'development', label: '承', ratio: 0.35 },
        { id: 'turn', label: '転', ratio: 0.2 },
        { id: 'closing', label: '結', ratio: 0.2 },
      ],
    });
  });

  it('keeps the screenplay advice prompts verbatim', () => {
    expect(SCREENPLAY_STRUCTURE_PROMPT).toContain('あなたはプロの脚本家です');
    expect(SCREENPLAY_STRUCTURE_PROMPT).toContain('起承転結の流れ');
    expect(SCREENPLAY_EMOTIONAL_PROMPT).toContain('感情表現・キャラクター描写');
    // Prompt isolation: screenplay prompts must not contain novel-specific vocabulary.
    expect(SCREENPLAY_STRUCTURE_PROMPT).not.toContain('地の文');
    expect(SCREENPLAY_EMOTIONAL_PROMPT).not.toContain('章タイトル');
  });

  it('uses the existing screenplay default layout (20x20x10)', () => {
    const profile = getModeProfile('screenplay');
    expect(profile.defaults.settings).toEqual(DEFAULT_SETTINGS);
    expect(profile.defaults.writingDirection).toBe('vertical');
  });

  it('falls back to screenplay for undefined / unknown content types', () => {
    expect(resolveContentType(undefined)).toBe('screenplay');
    expect(resolveContentType(null)).toBe('screenplay');
    expect(resolveContentType('')).toBe('screenplay');
    expect(resolveContentType('novel')).toBe('novel');
    expect(getModeProfile(undefined).contentType).toBe('screenplay');
  });
});
