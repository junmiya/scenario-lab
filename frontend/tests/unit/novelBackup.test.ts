import { describe, it, expect } from 'vitest';
import {
  serializeNovelBackupJson,
  parseNovelBackupJson,
  buildNovelMarkdown,
  type NovelBackupInput,
} from '../../src/services/novelBackupService';

function sampleInput(): NovelBackupInput {
  return {
    title: '銀河の終わりに',
    authorName: '宮本',
    synopsis: '遠未来の物語。',
    novelContent: {
      chapters: [
        {
          id: 'ch-1',
          title: '第一章 出発',
          order: 0,
          body: '　宇宙船は港を離れた。\n　星々が流れる。',
          sections: [{ id: 'sec-1', title: '一 朝', order: 0, body: '　目覚めると無重力。' }],
        },
        { id: 'ch-2', title: '第二章 邂逅', order: 1, body: '' },
      ],
    },
    novelSettings: {
      writingDirection: 'vertical',
      lineLength: 20,
      linesPerPage: 20,
      pageCount: 10,
    },
    worldbuilding: {
      theme: '喪失と再生',
      characters: [{ id: 'chr-1', name: 'カイ', age: '17', traits: '無口' }],
      worldview: 'ワープ航法が一般化した28世紀。',
      timeline: [{ id: 'tl-1', when: '2750', event: '第一次ワープ実験', related: 'カイの祖父' }],
      glossary: [{ id: 'gl-1', term: '魔石', reading: 'ませき', description: '魔力の結晶' }],
    },
  };
}

describe('novel backup (FR-031)', () => {
  it('round-trips JSON losslessly (export → import equals original payload)', () => {
    const input = sampleInput();
    const json = serializeNovelBackupJson(input);
    const restored = parseNovelBackupJson(json);

    expect(restored.format).toBe('scenario-lab-novel');
    expect(restored.version).toBe(1);
    expect(restored.title).toBe(input.title);
    expect(restored.synopsis).toBe(input.synopsis);
    expect(restored.novelContent).toEqual(input.novelContent);
    expect(restored.novelSettings).toEqual(input.novelSettings);
    expect(restored.worldbuilding).toEqual(input.worldbuilding);
    // Body text with newlines + full-width indent survives exactly.
    expect(restored.novelContent.chapters[0]?.body).toBe(
      '　宇宙船は港を離れた。\n　星々が流れる。',
    );
  });

  it('rejects non-backup or wrong-version JSON', () => {
    expect(() => parseNovelBackupJson('{"foo":1}')).toThrow();
    expect(() => parseNovelBackupJson('not json')).toThrow();
    expect(() =>
      parseNovelBackupJson(JSON.stringify({ format: 'scenario-lab-novel', version: 99 })),
    ).toThrow();
  });

  it('builds readable Markdown with theme, worldbuilding tables and chapter headings', () => {
    const md = buildNovelMarkdown(sampleInput());
    expect(md).toContain('# 銀河の終わりに');
    expect(md).toContain('## テーマ');
    expect(md).toContain('喪失と再生');
    expect(md).toContain('### 第一章 出発');
    expect(md).toContain('#### 一 朝');
    expect(md).toContain('| 日時 | イベント | 関係人物 |');
    expect(md).toContain('魔石');
  });
});
