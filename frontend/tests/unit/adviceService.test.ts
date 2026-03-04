import { describe, expect, it, vi } from 'vitest';

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

import { generateAdvice, listAdviceModels } from '../../src/services/adviceService';

describe('adviceService', () => {
  it('returns local advice when functions API is not configured', async () => {
    const result = await generateAdvice({
      documentId: 'doc-local',
      synopsis: 'short synopsis',
      content: 'content body',
      panelAProvider: 'gemini',
      panelBProvider: 'openai',
      panelAPreset: 'standard',
      panelBPreset: 'standard',
    });

    expect(result.panelA.provider).toBe('gemini');
    expect(result.panelB.provider).toBe('openai');
    // Without API key, gemini returns an error message; openai returns unsupported fallback
    expect(result.panelA.structureFeedback).toBeTruthy();
    expect(result.panelB.structureFeedback).toContain('プロトタイプモードでは未対応');
  });

  it('returns fallback model descriptors when functions API is not configured', async () => {
    const models = await listAdviceModels();

    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'gemini', enabled: true }),
        expect.objectContaining({ provider: 'openai', enabled: false }),
        expect.objectContaining({ provider: 'anthropic', enabled: false }),
      ]),
    );
  });
});
