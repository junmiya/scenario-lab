import type { NovelContent, NovelSettings, Worldbuilding } from '../types/novel';

/**
 * Novel backup (FR-031): full-fidelity JSON for lossless restore + human-readable
 * Markdown for viewing. Re-importing the JSON reconstructs the work exactly.
 */

const BACKUP_FORMAT = 'scenario-lab-novel';
const BACKUP_VERSION = 1 as const;

export interface NovelBackupInput {
  title: string;
  authorName: string;
  synopsis: string;
  novelContent: NovelContent;
  novelSettings: NovelSettings;
  worldbuilding: Worldbuilding;
  novelCommentary?: unknown;
}

export interface NovelBackup extends NovelBackupInput {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  contentType: 'novel';
  exportedAt: string;
}

export function buildNovelBackup(input: NovelBackupInput): NovelBackup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    contentType: 'novel',
    exportedAt: new Date().toISOString(),
    ...input,
  };
}

/** Serialize a backup to pretty JSON (lossless). */
export function serializeNovelBackupJson(input: NovelBackupInput): string {
  return JSON.stringify(buildNovelBackup(input), null, 2);
}

/**
 * Parse and validate a backup JSON string. Throws on wrong format/version so a
 * stray file cannot silently corrupt a work.
 */
export function parseNovelBackupJson(text: string): NovelBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON の解析に失敗しました（ファイルが壊れている可能性があります）');
  }
  const obj = data as Partial<NovelBackup>;
  if (obj.format !== BACKUP_FORMAT) {
    throw new Error('小説バックアップ形式ではありません');
  }
  if (obj.version !== BACKUP_VERSION) {
    throw new Error(`未対応のバックアップバージョンです: ${String(obj.version)}`);
  }
  if (!obj.novelContent || !obj.novelSettings || !obj.worldbuilding) {
    throw new Error('バックアップに必要なフィールドが欠けています');
  }
  return obj as NovelBackup;
}

function mdEscape(text: string): string {
  return text.replace(/\|/g, '\\|');
}

/** Build a human-readable Markdown view (not re-importable — use JSON for restore). */
export function buildNovelMarkdown(input: NovelBackupInput): string {
  const { title, authorName, synopsis, novelContent, worldbuilding } = input;
  const lines: string[] = [];
  lines.push(`# ${title || '無題の小説'}`);
  if (authorName) lines.push(`\n著者: ${authorName}`);

  if (worldbuilding.theme.trim()) {
    lines.push('\n## テーマ\n', worldbuilding.theme);
  }
  if (synopsis.trim()) {
    lines.push('\n## あらすじ\n', synopsis);
  }
  if (worldbuilding.worldview.trim()) {
    lines.push('\n## 世界観\n', worldbuilding.worldview);
  }
  if (worldbuilding.characters.length > 0) {
    lines.push('\n## 登場人物');
    for (const c of worldbuilding.characters) {
      const meta = [c.age, c.traits, c.background].filter(Boolean).join(' / ');
      lines.push(`- **${c.name || '（無名）'}**${meta ? `: ${meta}` : ''}`);
    }
  }
  if (worldbuilding.timeline.length > 0) {
    lines.push('\n## 年表\n', '| 日時 | イベント | 関係人物 |', '| --- | --- | --- |');
    for (const t of worldbuilding.timeline) {
      lines.push(`| ${mdEscape(t.when)} | ${mdEscape(t.event)} | ${mdEscape(t.related ?? '')} |`);
    }
  }
  if (worldbuilding.glossary.length > 0) {
    lines.push('\n## 用語集\n', '| 用語 | 読み | 説明 |', '| --- | --- | --- |');
    for (const g of worldbuilding.glossary) {
      lines.push(
        `| ${mdEscape(g.term)} | ${mdEscape(g.reading ?? '')} | ${mdEscape(g.description)} |`,
      );
    }
  }

  lines.push('\n## 本文');
  const chapters = [...novelContent.chapters].sort((a, b) => a.order - b.order);
  if (chapters.length === 0) {
    lines.push('\n（本文未入力）');
  }
  for (const chapter of chapters) {
    lines.push(`\n### ${chapter.title || '（無題の章）'}`);
    if (chapter.body.trim()) lines.push('\n' + chapter.body);
    const sections = [...(chapter.sections ?? [])].sort((a, b) => a.order - b.order);
    for (const section of sections) {
      lines.push(`\n#### ${section.title || '（無題の節）'}`);
      if (section.body.trim()) lines.push('\n' + section.body);
    }
  }

  return lines.join('\n');
}

/** Trigger a browser download of `content` as `filename`. */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Safe filename stem from a title (fallback to 'novel'). */
export function backupFilename(title: string, ext: string): string {
  const stem = (title || 'novel').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  return `${stem}.${ext}`;
}
