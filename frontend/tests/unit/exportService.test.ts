import { describe, expect, it } from 'vitest';
import { createExportPayload } from '../../src/services/exportService';

describe('exportService', () => {
  it('fails when required metadata is missing', () => {
    expect(() => createExportPayload({ title: '', authorName: 'a', content: 'body' })).toThrow(
      'EXPORT_METADATA_REQUIRED',
    );
  });

  it('creates txt payload with sanitized filename', () => {
    const result = createExportPayload({ title: 'My Script!', authorName: 'A', content: 'body' });
    expect(result.fileName).toBe('My_Script_.txt');
    expect(result.mimeType).toBe('text/plain;charset=utf-8');
  });

  it('includes title and author in screenplay format', () => {
    const result = createExportPayload({
      title: 'テスト脚本',
      authorName: '太郎',
      content: '○場面１',
    });

    expect(result.fileName).toBe('テスト脚本.txt');
    expect(result.content).toContain('テスト脚本');
    expect(result.content).toContain('作　太郎');
    expect(result.content).toContain('○場面１');
  });
});
