import { describe, it, expect } from 'vitest';
import {
  createInitialEditorState,
  addChapter,
  updateChapter,
  addSection,
  updateSection,
  addTimelineEntry,
  setWorldview,
  type EditorState,
} from '../../src/stores/editorStore';
import {
  resolveScriptContentType,
  type FirestoreScript,
} from '../../src/lib/firebase/firestoreService';

/**
 * US1 integration: novel create → chapter/section edit → save → reload reconstructs
 * the full structure. Mirrors the save/load mapping in EditorPage without Firestore.
 */

// ── Mirror of EditorPage save mapping (novel branch) ──
function toFirestore(state: EditorState): Partial<FirestoreScript> {
  return {
    contentType: state.contentType,
    title: state.title,
    synopsis: state.synopsis,
    ...(state.novelContent ? { novelContent: state.novelContent } : {}),
    ...(state.novelSettings ? { novelSettings: state.novelSettings } : {}),
    ...(state.worldbuilding ? { worldbuilding: state.worldbuilding } : {}),
  };
}

// ── Mirror of EditorPage load mapping (novel branch) ──
function fromFirestore(doc: Partial<FirestoreScript>): EditorState {
  const contentType = resolveScriptContentType(doc.contentType);
  const base = createInitialEditorState(contentType);
  return {
    ...base,
    title: doc.title ?? '',
    synopsis: doc.synopsis ?? '',
    ...(contentType === 'novel'
      ? {
          novelContent: doc.novelContent ?? { chapters: [] },
          novelSettings: doc.novelSettings ?? {
            writingDirection: 'vertical',
            lineLength: 20,
            linesPerPage: 20,
            pageCount: 10,
          },
          worldbuilding: doc.worldbuilding ?? {
            characters: [],
            worldview: '',
            timeline: [],
            glossary: [],
          },
        }
      : {}),
  };
}

describe('US1 novel create → edit → save → reload', () => {
  it('creates a novel with contentType novel and default vertical settings', () => {
    const state = createInitialEditorState('novel');
    expect(state.contentType).toBe('novel');
    expect(state.novelSettings?.writingDirection).toBe('vertical');
    expect(state.novelContent?.chapters).toEqual([]);
    expect(state.worldbuilding).toEqual({
      characters: [],
      worldview: '',
      timeline: [],
      glossary: [],
    });
  });

  it('round-trips chapters, sections, body and worldbuilding through save/reload', () => {
    let state = createInitialEditorState('novel');
    state = { ...state, title: '銀河の終わりに', synopsis: '遠未来の物語。' };

    // Build chapter > section structure with bodies.
    let nc = state.novelContent!;
    nc = addChapter(nc, '第一章 出発', 'ch-1');
    nc = updateChapter(nc, 'ch-1', { body: '宇宙船は静かに港を離れた。' });
    nc = addSection(nc, 'ch-1', '一 朝', 'sec-1');
    nc = updateSection(nc, 'ch-1', 'sec-1', { body: '目覚めると船内は無重力だった。' });
    nc = addChapter(nc, '第二章 邂逅', 'ch-2');
    state = { ...state, novelContent: nc };

    // Worldbuilding.
    let wb = state.worldbuilding!;
    wb = setWorldview(wb, 'ワープ航法が一般化した28世紀。');
    wb = addTimelineEntry(wb, { when: '2750', event: '第一次ワープ実験' }, 'tl-1');
    state = { ...state, worldbuilding: wb };

    // Save → reload.
    const saved = toFirestore(state);
    const reloaded = fromFirestore(saved);

    // Structure preserved.
    expect(reloaded.contentType).toBe('novel');
    expect(reloaded.title).toBe('銀河の終わりに');
    expect(reloaded.synopsis).toBe('遠未来の物語。');
    expect(reloaded.novelContent).toEqual(state.novelContent);
    expect(reloaded.novelContent?.chapters).toHaveLength(2);
    expect(reloaded.novelContent?.chapters[0]?.sections?.[0]?.body).toBe(
      '目覚めると船内は無重力だった。',
    );
    expect(reloaded.worldbuilding?.worldview).toBe('ワープ航法が一般化した28世紀。');
    expect(reloaded.worldbuilding?.timeline).toHaveLength(1);
  });

  it('treats a legacy doc without contentType as screenplay (backward compatible)', () => {
    const reloaded = fromFirestore({ title: '昔の脚本', content: '○公園（昼）' });
    expect(reloaded.contentType).toBe('screenplay');
    expect(reloaded.novelContent).toBeUndefined();
  });
});
