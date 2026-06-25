import type { ReactElement } from 'react';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { NovelContent } from '../../types/novel';
import { computeChapterMetrics } from '../../stores/editorStore';

interface ChapterListProps {
  content: NovelContent;
  /** Capacity (chars) used to show a per-chapter progress hint. 0 hides progress. */
  totalCapacity?: number;
  activeChapterId: string | null;
  activeSectionId: string | null;
  onSelectChapter: (chapterId: string) => void;
  onSelectSection: (chapterId: string, sectionId: string) => void;
  onAddChapter: () => void;
  onRemoveChapter: (chapterId: string) => void;
  onMoveChapter: (chapterId: string, direction: -1 | 1) => void;
  onAddSection: (chapterId: string) => void;
  onRemoveSection: (chapterId: string, sectionId: string) => void;
}

const labelStyle = { fontSize: '0.6875rem', color: 'var(--text-secondary)' } as const;

/**
 * Novel structure panel (FR-008): a dynamic chapter list with title, char count,
 * section count and progress, plus add/move/remove and section navigation.
 * Replaces the screenplay 起承転結 ratio guide in novel mode.
 */
export function ChapterList({
  content,
  totalCapacity = 0,
  activeChapterId,
  activeSectionId,
  onSelectChapter,
  onSelectSection,
  onAddChapter,
  onRemoveChapter,
  onMoveChapter,
  onAddSection,
  onRemoveSection,
}: ChapterListProps): ReactElement {
  const metrics = computeChapterMetrics(content);
  const sorted = [...content.chapters].sort((a, b) => a.order - b.order);

  return (
    <section aria-label="章一覧" className="section-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>章一覧</h3>
        <button type="button" onClick={onAddChapter} style={{ display: 'flex', gap: '0.25rem' }}>
          <Plus size={14} /> 章を追加
        </button>
      </div>

      {sorted.length === 0 ? (
        <p style={labelStyle}>
          章がありません。「章を追加」から始めるか、章なしで本文を書くこともできます。
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sorted.map((chapter, index) => {
            const m = metrics.find((x) => x.id === chapter.id);
            const isActiveChapter = chapter.id === activeChapterId && activeSectionId === null;
            const progress =
              totalCapacity > 0 ? Math.round(((m?.charCount ?? 0) / totalCapacity) * 100) : null;
            const chapterSections = [...(chapter.sections ?? [])].sort((a, b) => a.order - b.order);
            return (
              <li key={chapter.id} style={{ marginBottom: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: isActiveChapter
                      ? 'var(--color-primary-light, #dbeafe)'
                      : 'var(--color-surface)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChapter(chapter.id)}
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontWeight: isActiveChapter ? 700 : 500,
                    }}
                    title="この章の本文を編集"
                  >
                    {chapter.title || `（第${index + 1}章）`}
                    <span style={{ ...labelStyle, marginLeft: '0.5rem' }}>
                      {m?.charCount ?? 0}字 / {m?.sectionCount ?? 0}節
                      {progress !== null ? ` / ${progress}%` : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveChapter(chapter.id, -1)}
                    disabled={index === 0}
                    title="上へ"
                    style={iconBtn(index === 0)}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveChapter(chapter.id, 1)}
                    disabled={index === sorted.length - 1}
                    title="下へ"
                    style={iconBtn(index === sorted.length - 1)}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddSection(chapter.id)}
                    title="節を追加"
                    style={iconBtn(false)}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => onRemoveChapter(chapter.id)}
                    title="章を削除"
                    style={{ ...iconBtn(false), color: 'var(--color-danger, #dc2626)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {chapterSections.length > 0 && (
                  <ul style={{ listStyle: 'none', paddingLeft: '1rem', margin: '0.25rem 0 0' }}>
                    {chapterSections.map((section, sIndex) => {
                      const isActiveSection =
                        chapter.id === activeChapterId && section.id === activeSectionId;
                      return (
                        <li
                          key={section.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectSection(chapter.id, section.id)}
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.8125rem',
                              color: isActiveSection
                                ? 'var(--color-primary, #2563eb)'
                                : 'var(--text-secondary)',
                              fontWeight: isActiveSection ? 600 : 400,
                            }}
                          >
                            {section.title || `（第${sIndex + 1}節）`}
                          </button>
                          <button
                            type="button"
                            className="btn-danger"
                            onClick={() => onRemoveSection(chapter.id, section.id)}
                            title="節を削除"
                            style={{ ...iconBtn(false), color: 'var(--color-danger, #dc2626)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function iconBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.25rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.3 : 1,
    color: 'var(--text-secondary)',
    display: 'inline-flex',
  };
}
