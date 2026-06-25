import { describe, it, expect } from 'vitest';
import {
  setWorldview,
  addTimelineEntry,
  updateTimelineEntry,
  removeTimelineEntry,
  addGlossaryEntry,
  updateGlossaryEntry,
  removeGlossaryEntry,
} from '../../src/stores/editorStore';
import { createEmptyWorldbuilding } from '../../src/types/novel';

describe('worldbuilding 4-field CRUD (US1 / FR-015)', () => {
  it('starts empty and allows empty save', () => {
    const wb = createEmptyWorldbuilding();
    expect(wb).toEqual({ theme: '', characters: [], worldview: '', timeline: [], glossary: [] });
  });

  it('sets the worldview free-text field', () => {
    const wb = setWorldview(createEmptyWorldbuilding(), '魔法が衰退した近未来。');
    expect(wb.worldview).toBe('魔法が衰退した近未来。');
  });

  it('adds, updates, and removes timeline rows', () => {
    let wb = createEmptyWorldbuilding();
    wb = addTimelineEntry(wb, { when: '1900', event: '建国' }, 'tl-1');
    wb = addTimelineEntry(wb, { when: '1920', event: '戦争' }, 'tl-2');
    expect(wb.timeline).toHaveLength(2);
    wb = updateTimelineEntry(wb, 'tl-1', { related: '主人公の祖父' });
    expect(wb.timeline[0]).toMatchObject({ when: '1900', event: '建国', related: '主人公の祖父' });
    wb = removeTimelineEntry(wb, 'tl-1');
    expect(wb.timeline.map((t) => t.id)).toEqual(['tl-2']);
  });

  it('adds, updates, and removes glossary rows', () => {
    let wb = createEmptyWorldbuilding();
    wb = addGlossaryEntry(
      wb,
      { term: '魔石', reading: 'ませき', description: '魔力の結晶' },
      'gl-1',
    );
    expect(wb.glossary[0]).toMatchObject({ term: '魔石', reading: 'ませき' });
    wb = updateGlossaryEntry(wb, 'gl-1', { description: '魔力を蓄えた鉱石' });
    expect(wb.glossary[0]!.description).toBe('魔力を蓄えた鉱石');
    wb = removeGlossaryEntry(wb, 'gl-1');
    expect(wb.glossary).toEqual([]);
  });
});
