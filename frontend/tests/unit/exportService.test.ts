import { describe, expect, it } from 'vitest';
import { createExportPayload } from '../../src/services/exportService';

describe('exportService', () => {
  it('fails when required metadata is missing', async () => {
    await expect(
      createExportPayload({
        title: '',
        authorName: 'a',
        synopsis: '',
        characterText: '',
        content: 'body',
        lineLength: 20,
        linesPerPage: 20,
      }),
    ).rejects.toThrow('EXPORT_METADATA_REQUIRED');
  });

  it('creates docx payload with sanitized filename', async () => {
    const result = await createExportPayload({
      title: 'My Script!',
      authorName: 'A',
      synopsis: '',
      characterText: '',
      content: 'body',
      lineLength: 20,
      linesPerPage: 20,
    });
    expect(result.fileName).toBe('My_Script_.docx');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('generates docx with correct blob type', async () => {
    const result = await createExportPayload({
      title: 'テスト脚本',
      authorName: '太郎',
      synopsis: 'あらすじテスト',
      characterText: '太郎（主人公）',
      content: '○場面１\nセリフ「こんにちは」',
      lineLength: 20,
      linesPerPage: 20,
    });

    expect(result.fileName).toBe('テスト脚本.docx');
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
