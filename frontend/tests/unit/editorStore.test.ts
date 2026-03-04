import { describe, expect, it } from 'vitest';
import {
  createInitialEditorState,
  recalculateGuideMetrics,
  updateContent,
} from '../../src/stores/editorStore';

describe('editorStore', () => {
  it('creates initial state with default capacity', () => {
    const state = createInitialEditorState();
    expect(state.metrics.totalCapacity).toBe(200);
    expect(state.metrics.filledRatio).toBe(0);
  });

  it('updates metrics when content changes', () => {
    const initial = createInitialEditorState();
    const next = updateContent(initial, 'a'.repeat(50));
    const metrics = recalculateGuideMetrics(next.content, next.settings);
    expect(metrics.filledRatio).toBeGreaterThan(0);
  });
});
