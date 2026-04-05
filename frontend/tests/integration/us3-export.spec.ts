import { describe, expect, it } from 'vitest';
import { buildDiff } from '../../src/components/advice/DiffView';
import { createExportPayload } from '../../src/services/exportService';

describe('US3 structure and export flow', () => {
  it('builds before/after diff entries', () => {
    const diff = buildDiff('old line', 'new line');
    expect(diff.before).toBe('old line');
    expect(diff.after).toBe('new line');
  });

  it('creates export payload only with required metadata', async () => {
    const payload = await createExportPayload({
      title: 'My Script',
      authorName: 'Author',
      synopsis: '',
      characterText: '',
      content: '本文',
      lineLength: 20,
      linesPerPage: 20,
    });

    expect(payload.fileName.endsWith('.docx')).toBe(true);
    expect(payload.blob.size).toBeGreaterThan(0);
  });
});
