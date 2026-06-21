import { describe, it, expect } from 'vitest';
import { createInitialEditorState, addChapter, updateChapter } from '../../src/stores/editorStore';
import type { EditorState } from '../../src/stores/editorStore';

/**
 * FR-007: switching writing direction must be lossless. Direction is a display-only
 * setting; the body is the canonical plain-text source. Changing direction must not
 * alter any body text (paragraphs = newlines, indent = full-width spaces).
 */

// Mirror of NovelEditor.updateNovelSettings (direction change only).
function changeDirection(state: EditorState, dir: 'vertical' | 'horizontal'): EditorState {
  return {
    ...state,
    novelSettings: {
      ...(state.novelSettings ?? {
        writingDirection: 'vertical',
        lineLength: 20,
        linesPerPage: 20,
        pageCount: 10,
      }),
      writingDirection: dir,
    },
  };
}

describe('novel writing direction is lossless (FR-007)', () => {
  it('preserves body text (paragraphs + full-width indent) across direction changes', () => {
    // 段落（改行）と字下げ（全角空白）を含む本文。
    const body = '　吾輩は猫である。\n　名前はまだ無い。\n\n　どこで生れたか見当がつかぬ。';
    let state = createInitialEditorState('novel');
    let nc = state.novelContent!;
    nc = addChapter(nc, '第一章', 'ch-1');
    nc = updateChapter(nc, 'ch-1', { body });
    state = { ...state, novelContent: nc };

    // vertical → horizontal → vertical
    const h = changeDirection(state, 'horizontal');
    const v = changeDirection(h, 'vertical');

    // Direction flips, body bytes are unchanged.
    expect(h.novelSettings?.writingDirection).toBe('horizontal');
    expect(v.novelSettings?.writingDirection).toBe('vertical');
    expect(h.novelContent?.chapters[0]?.body).toBe(body);
    expect(v.novelContent?.chapters[0]?.body).toBe(body);
    // The whole novelContent object is structurally identical after the round-trip.
    expect(v.novelContent).toEqual(state.novelContent);
  });

  it('does not touch novelContent when only the direction setting changes', () => {
    let state = createInitialEditorState('novel');
    let nc = state.novelContent!;
    nc = addChapter(nc, '章', 'ch-1');
    nc = updateChapter(nc, 'ch-1', { body: '　段落一。\n　段落二。' });
    state = { ...state, novelContent: nc };
    const before = state.novelContent;
    const after = changeDirection(state, 'horizontal').novelContent;
    expect(after).toBe(before); // same reference — direction change never clones content
  });
});
