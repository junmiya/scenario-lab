import { describe, expect, it } from 'vitest';
import { applyToolbarAction } from '../../src/components/toolbar/ScriptToolbar';
import { createInitialEditorState, recalculateGuideMetrics } from '../../src/stores/editorStore';

describe('US1 vertical editor flow', () => {
  it('applies helper actions and keeps content editable', () => {
    const inserted = applyToolbarAction('', 'scene');
    expect(inserted).toContain('○');

    const dialogue = applyToolbarAction(inserted, 'dialogue');
    expect(dialogue).toContain('「」');
  });

  it('recalculates guide metrics from line and page settings', () => {
    const state = createInitialEditorState();
    const metrics = recalculateGuideMetrics(
      'a'.repeat(150),
      { lineLength: 25, pageCount: 12 },
    );

    expect(metrics.totalCapacity).toBe(300);
    expect(metrics.filledRatio).toBeGreaterThan(0);
  });
});
