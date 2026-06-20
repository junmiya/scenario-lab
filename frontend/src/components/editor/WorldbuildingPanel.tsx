import type { ReactElement } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Worldbuilding, WorldbuildingCharacter } from '../../types/novel';
import {
  setWorldview,
  addTimelineEntry,
  updateTimelineEntry,
  removeTimelineEntry,
  addGlossaryEntry,
  updateGlossaryEntry,
  removeGlossaryEntry,
} from '../../stores/editorStore';

interface WorldbuildingPanelProps {
  value: Worldbuilding;
  onChange: (value: Worldbuilding) => void;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const cellInput: React.CSSProperties = {
  width: '100%',
  fontSize: '0.8125rem',
  padding: '0.25rem 0.375rem',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
};

const th: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: 'var(--text-secondary)',
  textAlign: 'left',
  padding: '0.25rem 0.375rem',
  fontWeight: 600,
};

/**
 * Novel setting-reference editor (FR-015): 人物 / 世界観 / 年表 / 用語集.
 * All fields optional — empty is valid. Each field is passed to AI advice with its
 * own label in Phase 4 (US2).
 */
export function WorldbuildingPanel({ value, onChange }: WorldbuildingPanelProps): ReactElement {
  const updateCharacters = (characters: WorldbuildingCharacter[]): void => {
    onChange({ ...value, characters });
  };

  return (
    <section aria-label="設定資料" className="section-container">
      <h3>設定資料</h3>

      {/* ── 人物 ── */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>人物</h4>
          <button
            type="button"
            onClick={() => updateCharacters([...value.characters, { id: makeId('chr'), name: '' }])}
            style={{ display: 'flex', gap: '0.25rem' }}
          >
            <Plus size={14} /> 人物を追加
          </button>
        </div>
        {value.characters.length === 0 ? (
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>未登録</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>名前</th>
                <th style={th}>年齢</th>
                <th style={th}>属性</th>
                <th style={th}>背景</th>
                <th style={{ ...th, width: '2rem' }} />
              </tr>
            </thead>
            <tbody>
              {value.characters.map((c) => (
                <tr key={c.id}>
                  <td>
                    <input
                      aria-label="人物名"
                      style={cellInput}
                      value={c.name}
                      onChange={(e) =>
                        updateCharacters(
                          value.characters.map((x) =>
                            x.id === c.id ? { ...x, name: e.currentTarget.value } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={c.age ?? ''}
                      onChange={(e) =>
                        updateCharacters(
                          value.characters.map((x) =>
                            x.id === c.id ? { ...x, age: e.currentTarget.value } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={c.traits ?? ''}
                      onChange={(e) =>
                        updateCharacters(
                          value.characters.map((x) =>
                            x.id === c.id ? { ...x, traits: e.currentTarget.value } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={c.background ?? ''}
                      onChange={(e) =>
                        updateCharacters(
                          value.characters.map((x) =>
                            x.id === c.id ? { ...x, background: e.currentTarget.value } : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-danger"
                      title="削除"
                      onClick={() =>
                        updateCharacters(value.characters.filter((x) => x.id !== c.id))
                      }
                      style={{ padding: '0.25rem', color: 'var(--color-danger, #dc2626)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 世界観 ── */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h4 style={{ margin: '0 0 0.5rem' }}>世界観</h4>
        <textarea
          aria-label="世界観"
          value={value.worldview}
          onChange={(e) => onChange(setWorldview(value, e.currentTarget.value))}
          placeholder="舞台設定・歴史・ルールなどを自由に記述..."
          rows={4}
          style={{ ...cellInput, resize: 'vertical', minHeight: '4rem' }}
        />
      </div>

      {/* ── 年表 ── */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>年表</h4>
          <button
            type="button"
            onClick={() => onChange(addTimelineEntry(value, {}, makeId('tl')))}
            style={{ display: 'flex', gap: '0.25rem' }}
          >
            <Plus size={14} /> 行を追加
          </button>
        </div>
        {value.timeline.length === 0 ? (
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>未登録</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>日時</th>
                <th style={th}>イベント</th>
                <th style={th}>関係人物</th>
                <th style={{ ...th, width: '2rem' }} />
              </tr>
            </thead>
            <tbody>
              {value.timeline.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input
                      style={cellInput}
                      value={t.when}
                      onChange={(e) =>
                        onChange(updateTimelineEntry(value, t.id, { when: e.currentTarget.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={t.event}
                      onChange={(e) =>
                        onChange(updateTimelineEntry(value, t.id, { event: e.currentTarget.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={t.related ?? ''}
                      onChange={(e) =>
                        onChange(
                          updateTimelineEntry(value, t.id, { related: e.currentTarget.value }),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-danger"
                      title="削除"
                      onClick={() => onChange(removeTimelineEntry(value, t.id))}
                      style={{ padding: '0.25rem', color: 'var(--color-danger, #dc2626)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 用語集 ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 0.5rem' }}>用語集</h4>
          <button
            type="button"
            onClick={() => onChange(addGlossaryEntry(value, {}, makeId('gl')))}
            style={{ display: 'flex', gap: '0.25rem' }}
          >
            <Plus size={14} /> 行を追加
          </button>
        </div>
        {value.glossary.length === 0 ? (
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>未登録</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>用語</th>
                <th style={th}>読み</th>
                <th style={th}>説明</th>
                <th style={{ ...th, width: '2rem' }} />
              </tr>
            </thead>
            <tbody>
              {value.glossary.map((g) => (
                <tr key={g.id}>
                  <td>
                    <input
                      style={cellInput}
                      value={g.term}
                      onChange={(e) =>
                        onChange(updateGlossaryEntry(value, g.id, { term: e.currentTarget.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={g.reading ?? ''}
                      onChange={(e) =>
                        onChange(
                          updateGlossaryEntry(value, g.id, { reading: e.currentTarget.value }),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      style={cellInput}
                      value={g.description}
                      onChange={(e) =>
                        onChange(
                          updateGlossaryEntry(value, g.id, { description: e.currentTarget.value }),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-danger"
                      title="削除"
                      onClick={() => onChange(removeGlossaryEntry(value, g.id))}
                      style={{ padding: '0.25rem', color: 'var(--color-danger, #dc2626)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
