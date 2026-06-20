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
} from '../../types/novel';

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
  const bodyRef = useRef<EditorHandle | null>(null);

  const setNovelContent = (next: NovelContent): void => {
    setState((current) => ({ ...current, novelContent: next }));
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
      {/* ── 設定資料 ── */}
      <WorldbuildingPanel
        value={worldbuilding}
        onChange={(wb) => setState((current) => ({ ...current, worldbuilding: wb }))}
      />

      {/* ── あらすじ（小説・プレーン） ── */}
      <section className="section-container" aria-label="あらすじ">
        <h3>あらすじ</h3>
        <VerticalEditor
          value={state.synopsis}
          onChange={(value) => setState((current) => ({ ...current, synopsis: value }))}
          lineCount={Math.max(5, lineLength)}
          charsPerColumn={lineLength}
          placeholder="あらすじを入力..."
        />
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

        {/* 書字方向 */}
        <div style={{ display: 'flex', gap: '0.75rem', margin: '0.5rem 0' }}>
          <label style={{ fontSize: '0.8125rem' }}>
            書字方向{' '}
            <select
              value={direction}
              onChange={(e) =>
                setState((current) => ({
                  ...current,
                  novelSettings: {
                    ...(current.novelSettings ?? {
                      writingDirection: 'vertical',
                      lineLength: 20,
                      linesPerPage: 20,
                      pageCount: 10,
                    }),
                    writingDirection: e.currentTarget.value as 'vertical' | 'horizontal',
                  },
                }))
              }
            >
              <option value="vertical">縦書き</option>
              <option value="horizontal">横書き</option>
            </select>
          </label>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            総字数: {novelTotalChars(novelContent)}字
          </span>
        </div>

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
      </section>
    </>
  );
}
