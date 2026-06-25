import { describe, it, expect } from 'vitest';
import {
  addChapter,
  updateChapter,
  removeChapter,
  moveChapter,
  addSection,
  updateSection,
  removeSection,
  computeChapterMetrics,
  novelTotalChars,
} from '../../../src/stores/editorStore';
import { createEmptyNovelContent } from '../../../src/types/novel';

describe('novel content chapter/section CRUD (US1)', () => {
  it('adds chapters with contiguous order', () => {
    let nc = createEmptyNovelContent();
    nc = addChapter(nc, '第一章', 'ch-1');
    nc = addChapter(nc, '第二章', 'ch-2');
    expect(nc.chapters.map((c) => [c.title, c.order])).toEqual([
      ['第一章', 0],
      ['第二章', 1],
    ]);
  });

  it('updates chapter title and body', () => {
    let nc = addChapter(createEmptyNovelContent(), '仮', 'ch-1');
    nc = updateChapter(nc, 'ch-1', { title: '序章', body: '吾輩は猫である。' });
    expect(nc.chapters[0]).toMatchObject({ title: '序章', body: '吾輩は猫である。' });
  });

  it('removes a chapter and renumbers order', () => {
    let nc = createEmptyNovelContent();
    nc = addChapter(nc, 'A', 'ch-1');
    nc = addChapter(nc, 'B', 'ch-2');
    nc = addChapter(nc, 'C', 'ch-3');
    nc = removeChapter(nc, 'ch-2');
    expect(nc.chapters.map((c) => [c.id, c.order])).toEqual([
      ['ch-1', 0],
      ['ch-3', 1],
    ]);
  });

  it('moves a chapter up/down and is a no-op at the boundary', () => {
    let nc = createEmptyNovelContent();
    nc = addChapter(nc, 'A', 'ch-1');
    nc = addChapter(nc, 'B', 'ch-2');
    nc = moveChapter(nc, 'ch-2', -1);
    expect(nc.chapters.map((c) => c.id)).toEqual(['ch-2', 'ch-1']);
    const same = moveChapter(nc, 'ch-2', -1); // already first
    expect(same.chapters.map((c) => c.id)).toEqual(['ch-2', 'ch-1']);
  });

  it('enforces a 2-level hierarchy (sections have no children)', () => {
    let nc = addChapter(createEmptyNovelContent(), '章', 'ch-1');
    nc = addSection(nc, 'ch-1', '節1', 'sec-1');
    nc = updateSection(nc, 'ch-1', 'sec-1', { body: '本文' });
    const section = nc.chapters[0]!.sections![0]!;
    expect(section).toMatchObject({ title: '節1', body: '本文', order: 0 });
    // NovelSection has no `sections` field — 3rd level is structurally impossible.
    expect('sections' in section).toBe(false);
  });

  it('removes a section and renumbers', () => {
    let nc = addChapter(createEmptyNovelContent(), '章', 'ch-1');
    nc = addSection(nc, 'ch-1', 'S1', 'sec-1');
    nc = addSection(nc, 'ch-1', 'S2', 'sec-2');
    nc = removeSection(nc, 'ch-1', 'sec-1');
    expect(nc.chapters[0]!.sections).toEqual([{ id: 'sec-2', title: 'S2', order: 0, body: '' }]);
  });

  it('computes chapter metrics (char count excludes newlines, counts sections)', () => {
    let nc = addChapter(createEmptyNovelContent(), '章', 'ch-1');
    nc = updateChapter(nc, 'ch-1', { body: 'あいう\nえお' }); // 5 chars
    nc = addSection(nc, 'ch-1', '節', 'sec-1');
    nc = updateSection(nc, 'ch-1', 'sec-1', { body: 'かきく' }); // 3 chars
    const [m] = computeChapterMetrics(nc);
    expect(m).toMatchObject({ id: 'ch-1', charCount: 8, sectionCount: 1 });
    expect(novelTotalChars(nc)).toBe(8);
  });

  it('handles the chapter-zero edge case (empty content)', () => {
    const nc = createEmptyNovelContent();
    expect(computeChapterMetrics(nc)).toEqual([]);
    expect(novelTotalChars(nc)).toBe(0);
  });
});
