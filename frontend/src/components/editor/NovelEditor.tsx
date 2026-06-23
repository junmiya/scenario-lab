import { useRef, useState, type Dispatch, type ReactElement, type SetStateAction } from 'react';
import { VerticalEditor, type EditorHandle } from './VerticalEditor';
import { ChapterList } from './ChapterList';
import { WorldbuildingPanel } from './WorldbuildingPanel';
import { ScriptToolbar } from '../toolbar/ScriptToolbar';
import { getModeProfile } from '../../modes';
import type { ToolbarActionDef } from '../../modes/types';
import {
  type EditorState,
  addChapter,
  updateChapter,
  removeChapter,
  moveChapter,
  addSection,
  updateSection,
  removeSection,
  novelTotalChars,
} from '../../stores/editorStore';
import {
  createEmptyNovelContent,
  createEmptyWorldbuilding,
  type NovelContent,
  type NovelSettings,
} from '../../types/novel';
import {
  serializeNovelBackupJson,
  parseNovelBackupJson,
  buildNovelMarkdown,
  downloadTextFile,
  backupFilename,
} from '../../services/novelBackupService';
import { NovelAdvicePanel } from '../advice/NovelAdvicePanel';
import { NovelDiscussionPanel, type NovelDiscussionMessage } from '../advice/NovelDiscussionPanel';

interface NovelEditorProps {
  state: EditorState;
  setState: Dispatch<SetStateAction<EditorState>>;
}

/**
 * Novel editing experience (US1): chapter list + active chapter/section body editor +
 * 設定資料. Isolated from the screenplay EditorPage path so screenplay behavior is
 * untouched. The body editor uses vertical writing by default (Q1 / FR-007).
 */
export function NovelEditor({ state, setState }: NovelEditorProps): ReactElement {
  const profile = getModeProfile('novel');
  const novelContent = state.novelContent ?? createEmptyNovelContent();
  const worldbuilding = state.worldbuilding ?? createEmptyWorldbuilding();
  const direction = state.novelSettings?.writingDirection ?? 'vertical';
  const lineLength = state.novelSettings?.lineLength ?? 20;
  const totalCapacity =
    (state.novelSettings?.lineLength ?? 20) *
    (state.novelSettings?.linesPerPage ?? 20) *
    (state.novelSettings?.pageCount ?? 10);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [discussionMessages, setDiscussionMessages] = useState<NovelDiscussionMessage[]>([]);
  const bodyRef = useRef<EditorHandle | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  // Flatten chapters/sections into a single body string for AI context.
  const flatBody = [...novelContent.chapters]
    .sort((a, b) => a.order - b.order)
    .map((c) => {
      const sectionText = [...(c.sections ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((s) => s.body)
        .join('\n');
      return [c.body, sectionText].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');

  // Theme/worldbuilding summary appended to advice prompts for context.
  const contextSummary = [
    worldbuilding.theme ? `テーマ: ${worldbuilding.theme}` : '',
    worldbuilding.worldview ? `世界観: ${worldbuilding.worldview}` : '',
    worldbuilding.characters.length > 0
      ? `登場人物: ${worldbuilding.characters
          .map((c) => c.name)
          .filter(Boolean)
          .join('、')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const backupInput = () => ({
    title: state.title,
    authorName: state.authorName,
    synopsis: state.synopsis,
    novelContent,
    novelSettings: state.novelSettings ?? defaultNovelSettings,
    worldbuilding,
  });

  const onExportJson = (): void => {
    downloadTextFile(
      backupFilename(state.title, 'json'),
      serializeNovelBackupJson(backupInput()),
      'application/json',
    );
    setBackupMessage('JSON バックアップを書き出しました');
  };

  const onExportMarkdown = (): void => {
    downloadTextFile(
      backupFilename(state.title, 'md'),
      buildNovelMarkdown(backupInput()),
      'text/markdown',
    );
    setBackupMessage('Markdown を書き出しました');
  };

  const onImportJson = async (file: File): Promise<void> => {
    try {
      const backup = parseNovelBackupJson(await file.text());
      if (!confirm('現在の作品を復元データで上書きします。よろしいですか？')) return;
      setState((current) => ({
        ...current,
        contentType: 'novel',
        title: backup.title,
        authorName: backup.authorName,
        synopsis: backup.synopsis,
        novelContent: backup.novelContent,
        novelSettings: backup.novelSettings,
        worldbuilding: backup.worldbuilding,
      }));
      setActiveChapterId(null);
      setActiveSectionId(null);
      setBackupMessage('JSON から完全復元しました（保存で確定）');
    } catch (error) {
      setBackupMessage(`復元に失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const setNovelContent = (next: NovelContent): void => {
    setState((current) => ({ ...current, novelContent: next }));
  };

  const defaultNovelSettings: NovelSettings = {
    writingDirection: 'vertical',
    lineLength: 20,
    linesPerPage: 20,
    pageCount: 10,
  };
  const updateNovelSettings = (patch: Partial<NovelSettings>): void => {
    setState((current) => ({
      ...current,
      novelSettings: { ...(current.novelSettings ?? defaultNovelSettings), ...patch },
    }));
  };

  // Resolve the active chapter and (optional) section.
  const activeChapter = novelContent.chapters.find((c) => c.id === activeChapterId) ?? null;
  const activeSection =
    activeChapter && activeSectionId
      ? ((activeChapter.sections ?? []).find((s) => s.id === activeSectionId) ?? null)
      : null;
  const activeBody = activeSection ? activeSection.body : (activeChapter?.body ?? '');

  const onBodyChange = (text: string): void => {
    if (!activeChapter) return;
    if (activeSection) {
      setNovelContent(
        updateSection(novelContent, activeChapter.id, activeSection.id, { body: text }),
      );
    } else {
      setNovelContent(updateChapter(novelContent, activeChapter.id, { body: text }));
    }
  };

  const handleAddChapter = (): void => {
    const id = `ch-${crypto.randomUUID()}`;
    setNovelContent(addChapter(novelContent, '', id));
    setActiveChapterId(id);
    setActiveSectionId(null);
  };

  const handleAddSection = (chapterId: string): void => {
    const id = `sec-${crypto.randomUUID()}`;
    setNovelContent(addSection(novelContent, chapterId, '', id));
    setActiveChapterId(chapterId);
    setActiveSectionId(id);
  };

  const handleRemoveChapter = (chapterId: string): void => {
    setNovelContent(removeChapter(novelContent, chapterId));
    if (activeChapterId === chapterId) {
      setActiveChapterId(null);
      setActiveSectionId(null);
    }
  };

  const handleRemoveSection = (chapterId: string, sectionId: string): void => {
    setNovelContent(removeSection(novelContent, chapterId, sectionId));
    if (activeSectionId === sectionId) setActiveSectionId(null);
  };

  const onToolbarAction = (action: ToolbarActionDef): void => {
    if (action.id === 'chapter') {
      handleAddChapter();
      return;
    }
    if (action.id === 'section') {
      if (activeChapter) handleAddSection(activeChapter.id);
      return;
    }
    // dialogue / narration: insert into the active body editor.
    if (!activeChapter) return;
    if (bodyRef.current) {
      bodyRef.current.focus();
      bodyRef.current.insertText(action.template);
      if (action.cursorToLineStart) {
        const sel = window.getSelection();
        if (sel) sel.modify('move', 'backward', 'lineboundary');
      }
    } else {
      onBodyChange(`${activeBody}${action.template}`);
    }
  };

  const activeTitle = activeSection
    ? activeSection.title || '（無題の節）'
    : activeChapter
      ? activeChapter.title || '（無題の章）'
      : null;

  return (
    <>
      {/* ── 書式設定（最初に設定・途中変更可, FR-007） ── */}
      <section className="section-container" aria-label="書式設定">
        <h3>書式設定</h3>
        <div
          style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'end', flexWrap: 'wrap' }}
        >
          <label style={{ fontSize: '0.8125rem' }}>
            書字方向{' '}
            <select
              value={direction}
              onChange={(e) =>
                updateNovelSettings({
                  writingDirection: e.currentTarget.value as 'vertical' | 'horizontal',
                })
              }
            >
              <option value="vertical">縦書き</option>
              <option value="horizontal">横書き</option>
            </select>
          </label>
          <label style={{ fontSize: '0.8125rem' }}>
            字数/行
            <input
              type="number"
              min={10}
              max={40}
              value={lineLength}
              onChange={(e) => updateNovelSettings({ lineLength: Number(e.currentTarget.value) })}
              style={{ width: '4rem' }}
            />
          </label>
          <label style={{ fontSize: '0.8125rem' }}>
            行数/枚
            <input
              type="number"
              min={1}
              max={40}
              value={state.novelSettings?.linesPerPage ?? 20}
              onChange={(e) => updateNovelSettings({ linesPerPage: Number(e.currentTarget.value) })}
              style={{ width: '4rem' }}
            />
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            変更は本文・設定資料の表示のみ切り替え（テキストは保持）
          </span>
        </div>
      </section>

      {/* ── 設定資料 ── */}
      <WorldbuildingPanel
        value={worldbuilding}
        onChange={(wb) => setState((current) => ({ ...current, worldbuilding: wb }))}
      />

      {/* ── あらすじ（AI評価を上下に, FR-029） ── */}
      <section className="section-container" aria-label="あらすじ">
        <h3>あらすじ</h3>
        <NovelAdvicePanel label="あらすじ" text={state.synopsis} contextSummary={contextSummary}>
          <VerticalEditor
            value={state.synopsis}
            onChange={(value) => setState((current) => ({ ...current, synopsis: value }))}
            lineCount={Math.max(5, lineLength)}
            charsPerColumn={lineLength}
            placeholder="あらすじを入力..."
          />
        </NovelAdvicePanel>
      </section>

      {/* ── 章一覧 ── */}
      <ChapterList
        content={novelContent}
        totalCapacity={totalCapacity}
        activeChapterId={activeChapterId}
        activeSectionId={activeSectionId}
        onSelectChapter={(id) => {
          setActiveChapterId(id);
          setActiveSectionId(null);
        }}
        onSelectSection={(chId, secId) => {
          setActiveChapterId(chId);
          setActiveSectionId(secId);
        }}
        onAddChapter={handleAddChapter}
        onRemoveChapter={handleRemoveChapter}
        onMoveChapter={(id, dir) => setNovelContent(moveChapter(novelContent, id, dir))}
        onAddSection={handleAddSection}
        onRemoveSection={handleRemoveSection}
      />

      {/* ── 本文（章・節） ── */}
      <section className="section-container" aria-label="本文">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>本文{activeTitle ? ` — ${activeTitle}` : ''}</h3>
          <ScriptToolbar
            label="小説ツールバー"
            actions={profile.toolbar}
            onAction={onToolbarAction}
          />
        </div>

        {/* 総字数（書字方向は書式設定セクションで切替） */}
        <div style={{ display: 'flex', gap: '0.75rem', margin: '0.5rem 0' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            総字数: {novelTotalChars(novelContent)}字 ／{' '}
            {direction === 'vertical' ? '縦書き' : '横書き'}
          </span>
        </div>

        <NovelAdvicePanel label="本文" text={flatBody} contextSummary={contextSummary}>
          {!activeChapter ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              章一覧から章（または節）を選ぶと本文を編集できます。章がなければ「章を追加」してください。
            </p>
          ) : direction === 'vertical' ? (
            <div className="novel-body-vertical">
              <VerticalEditor
                ref={bodyRef}
                key={activeSection ? activeSection.id : activeChapter.id}
                value={activeBody}
                onChange={onBodyChange}
                lineCount={Math.max(10, lineLength)}
                charsPerColumn={lineLength}
                placeholder="本文を入力..."
              />
            </div>
          ) : (
            <textarea
              aria-label="本文"
              className="novel-body-horizontal"
              value={activeBody}
              onChange={(e) => onBodyChange(e.currentTarget.value)}
              placeholder="本文を入力..."
              rows={14}
              style={{
                width: '100%',
                minHeight: '20rem',
                padding: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                lineHeight: 1.8,
                resize: 'vertical',
              }}
            />
          )}
        </NovelAdvicePanel>
      </section>

      {/* ── AI 対話批評（著者の相談・FR-030） ── */}
      <section className="section-container" aria-label="AI対話批評">
        <h3>AI対話批評</h3>
        <NovelDiscussionPanel
          synopsis={state.synopsis}
          content={flatBody}
          messages={discussionMessages}
          onMessagesChange={setDiscussionMessages}
        />
      </section>

      {/* ── バックアップ（JSON 完全復元 / Markdown 可読, FR-031） ── */}
      <section className="section-container" aria-label="バックアップ">
        <h3>バックアップ</h3>
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button type="button" onClick={onExportJson}>
            JSON バックアップ
          </button>
          <button type="button" onClick={() => importRef.current?.click()}>
            JSON から復元
          </button>
          <button type="button" onClick={onExportMarkdown}>
            Markdown 書き出し
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) void onImportJson(file);
              e.currentTarget.value = '';
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            JSON は完全復元用、Markdown は閲覧用
          </span>
        </div>
        {backupMessage ? <p className="status-text">{backupMessage}</p> : null}
      </section>
    </>
  );
}
