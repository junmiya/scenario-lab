import { useState, type ReactElement, type ReactNode } from 'react';
import { callAi, type AiProvider } from '../../lib/aiClient';
import { NOVEL_ADVICE_EXPERTS } from '../../modes/novel/prompts';

interface AdviceResult {
  id: string;
  label: string;
  text: string;
}

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
 * Novel AI advice (FR-029): 編集者 / 文芸評論家 / 校正者 の 3 専門家が あらすじ・本文 を講評。
 * Controls render above the editor (children), results below — "上下" placement like
 * screenplay mode. Uses the shared callAi plumbing with novel-specific prompts.
 */
export function NovelAdvicePanel({
  label,
  text,
  contextSummary,
  children,
}: NovelAdvicePanelProps): ReactElement {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [results, setResults] = useState<AdviceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasText = text.replace(/[\r\n\s]/g, '').length >= 10;

  const runAdvice = async (): Promise<void> => {
    if (!hasText) return;
    setLoading(true);
    setError('');
    const userText = [contextSummary ? `【設定】\n${contextSummary}` : '', `【${label}】\n${text}`]
      .filter(Boolean)
      .join('\n\n');
    try {
      const next = await Promise.all(
        NOVEL_ADVICE_EXPERTS.map(async (expert) => ({
          id: expert.id,
          label: expert.label,
          text: await callAi(provider, expert.system, userText),
        })),
      );
      setResults(next);
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
          {loading ? '評価中...' : results.length > 0 ? '再評価' : 'AI評価'}
        </button>
        {!hasText && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            10文字以上で評価できます
          </span>
        )}
      </div>

      {/* 中: エディタ本体 */}
      {children}

      {/* 下: 評価結果 */}
      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</p>}
      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          {results.map((r) => (
            <div
              key={r.id}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.625rem 0.75rem',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-primary, #2563eb)',
                  marginBottom: '0.375rem',
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)',
                }}
              >
                {r.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
