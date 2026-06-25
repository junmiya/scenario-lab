import { useState, type ReactElement, type ReactNode } from 'react';
import { callAi, type AiProvider } from '../../lib/aiClient';
import { NOVEL_ADVICE_EXPERTS } from '../../modes/novel/prompts';

interface NovelAdvicePanelProps {
  /** Target label shown in the header (e.g. 'あらすじ' / '本文'). */
  label: string;
  /** Text to evaluate. */
  text: string;
  /** Optional worldbuilding/theme summary appended to the prompt for context. */
  contextSummary?: string;
  /** The editor is passed as children so advice controls sit above and results below (上下). */
  children?: ReactNode;
}

/**
 * Novel AI advice (FR-029): 編集者 / 文芸評論家 / 校正者 evaluate あらすじ・本文.
 * Results are shown in a tabbed panel (one expert per tab) like scenario mode.
 * Controls render above the editor (children), the tabbed result below — "上下".
 */
export function NovelAdvicePanel({
  label,
  text,
  contextSummary,
  children,
}: NovelAdvicePanelProps): ReactElement {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>(NOVEL_ADVICE_EXPERTS[0]!.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasText = text.replace(/[\r\n\s]/g, '').length >= 10;
  const hasResults = Object.keys(results).length > 0;

  const runAdvice = async (): Promise<void> => {
    if (!hasText) return;
    setLoading(true);
    setError('');
    const userText = [contextSummary ? `【設定】\n${contextSummary}` : '', `【${label}】\n${text}`]
      .filter(Boolean)
      .join('\n\n');
    try {
      const entries = await Promise.all(
        NOVEL_ADVICE_EXPERTS.map(
          async (expert) => [expert.id, await callAi(provider, expert.system, userText)] as const,
        ),
      );
      setResults(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 上: コントロール */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          AI評価（{label}）
        </span>
        <select
          value={provider}
          onChange={(e) => setProvider(e.currentTarget.value as AiProvider)}
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
        >
          <option value="gemini">Gemini</option>
          <option value="claude">Claude</option>
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void runAdvice()}
          disabled={loading || !hasText}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
        >
          {loading ? '評価中...' : hasResults ? '再評価' : 'AI評価'}
        </button>
        {!hasText && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            10文字以上で評価できます
          </span>
        )}
      </div>

      {/* 中: エディタ本体 */}
      {children}

      {/* 下: タブ形式の評価結果 */}
      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</p>}
      {hasResults && (
        <div style={{ marginTop: '0.5rem' }}>
          {/* タブバー */}
          <div
            role="tablist"
            style={{
              display: 'flex',
              gap: '0.25rem',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {NOVEL_ADVICE_EXPERTS.map((expert) => {
              const isActive = expert.id === activeTab;
              return (
                <button
                  key={expert.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(expert.id)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 700 : 400,
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    borderBottom: isActive
                      ? '2px solid var(--color-primary, #2563eb)'
                      : '2px solid transparent',
                    background: 'transparent',
                    color: isActive ? 'var(--color-primary, #2563eb)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {expert.label}
                </button>
              );
            })}
          </div>
          {/* 選択中タブの内容 */}
          <div
            role="tabpanel"
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
              padding: '0.625rem 0.25rem',
            }}
          >
            {results[activeTab]}
          </div>
        </div>
      )}
    </div>
  );
}
