export interface ExportInput {
  title: string;
  authorName: string;
  content: string;
}

export interface ExportPayload {
  fileName: string;
  content: string;
  mimeType: string;
}

function assertRequiredMetadata(input: ExportInput): void {
  if (!input.title.trim() || !input.authorName.trim()) {
    throw new Error('EXPORT_METADATA_REQUIRED');
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9\u3040-\u9FFF-_]/g, '_');
}

/**
 * Format content as a Japanese screenplay plain-text file.
 *
 * Layout:
 *   - Title page: title and author centred with blank padding
 *   - Page break marker
 *   - Body (already formatted in the editor with ○ scene headings, 「」 dialogue, etc.)
 */
export function createExportPayload(input: ExportInput): ExportPayload {
  assertRequiredMetadata(input);

  const fileName = `${sanitizeFileName(input.title)}.txt`;

  const titleBlock = [
    '',
    '',
    '',
    `　　　　　　${input.title}`,
    '',
    '',
    `　　　　　　　　　　　　作　${input.authorName}`,
    '',
    '',
    '',
    '＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝',
    '',
  ];

  const content = [...titleBlock, input.content].join('\n');

  return {
    fileName,
    content,
    mimeType: 'text/plain;charset=utf-8',
  };
}

/**
 * Save a file with a "Save As" dialog (File System Access API).
 * Falls back to a classic download if the browser doesn't support showSaveFilePicker.
 */
export async function savePayloadAs(payload: ExportPayload): Promise<string> {
  const blob = new Blob([payload.content], { type: payload.mimeType });

  // Use File System Access API when available (Chrome / Edge)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: payload.fileName,
        types: [
          {
            description: 'テキストファイル',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle.name as string;
    } catch (e: any) {
      // User cancelled the dialog
      if (e?.name === 'AbortError') {
        return '';
      }
      throw e;
    }
  }

  // Fallback: classic download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = payload.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return payload.fileName;
}
