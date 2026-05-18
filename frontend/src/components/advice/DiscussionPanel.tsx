import { useState, useCallback, type ReactElement } from 'react';
import { callAi, type AiProvider } from '../../lib/aiClient';

export interface DiscussionMessage {
  role: 'A' | 'B';
  provider: AiProvider;
  text: string;
  timestamp: number;
}

export interface DiscussionPanelProps {
  synopsis: string;
  content: string;
  providerA: AiProvider;
  providerB: AiProvider;
  onProviderAChange: (p: AiProvider) => void;
  onProviderBChange: (p: AiProvider) => void;
  messages: DiscussionMessage[];
  onMessagesChange: (msgs: DiscussionMessage[]) => void;
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
};

const PROVIDER_COLORS: Record<'A' | 'B', string> = {
  A: '#2563eb',
  B: '#059669',
};

const ROUNDS = 3; // Each side speaks 3 times (A→B→A→B→A→B)

const SCORER_A_SYSTEM = `あなたは「採点者A」です。脚本の「構成・ストーリー展開」を中心に採点・講評する評論家です。
以下のルールに従ってください:
- 議論の最初のターンでは、あらすじと本文を読んで自分の評価を述べてください。
- 2ターン目以降は、相手（採点者B）の意見を踏まえて、同意する点・反論する点を明確にしながら議論を深めてください。
- 日本語で回答してください。簡潔に、300字以内で。
- 建設的な批評と具体的な改善提案を心がけてください。`;

const SCORER_B_SYSTEM = `あなたは「採点者B」です。脚本の「キャラクター・感情表現・セリフ」を中心に採点・講評する評論家です。
以下のルールに従ってください:
- 議論の最初のターンでは、あらすじと本文を読んで自分の評価を述べてください。
- 2ターン目以降は、相手（採点者A）の意見を踏まえて、同意する点・反論する点を明確にしながら議論を深めてください。
- 日本語で回答してください。簡潔に、300字以内で。
- 建設的な批評と具体的な改善提案を心がけてください。`;

function buildContext(synopsis: string, content: string): string {
  const parts: string[] = [];
  if (synopsis) parts.push(`【あらすじ】\n${synopsis}`);
  if (content) parts.push(`【本文】\n${content.slice(0, 6000)}`);
  return parts.join('\n\n') || '（本文が入力されていません）';
}

function buildUserPrompt(
  scriptContext: string,
  history: DiscussionMessage[],
  isA: boolean,
): string {
  if (history.length === 0) {
    return `以下の脚本について、あなたの専門観点から評価・講評してください。\n\n${scriptContext}`;
  }

  const conversation = history
    .map((m) => {
      const label = m.role === 'A' ? '採点者A' : '採点者B';
      return `【${label}】\n${m.text}`;
    })
    .join('\n\n');

  const self = isA ? '採点者A' : '採点者B';
  const other = isA ? '採点者B' : '採点者A';

  return `以下の脚本と、これまでの議論を踏まえて、${other}の最新の意見に対して${self}として応答してください。\n\n${scriptContext}\n\n--- これまでの議論 ---\n${conversation}`;
}

export function DiscussionPanel({
  synopsis,
  content,
  providerA,
  providerB,
  onProviderAChange,
  onProviderBChange,
  messages,
  onMessagesChange,
}: DiscussionPanelProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasEnoughText = (synopsis + content).replace(/[\r\n\s]/g, '').length >= 10;

  const startDiscussion = useCallback(async () => {
    if (!hasEnoughText) return;
    setLoading(true);
    setError('');

    const scriptContext = buildContext(synopsis, content);
    const newMessages: DiscussionMessage[] = [];

    try {
      for (let round = 0; round < ROUNDS; round++) {
        // Scorer A speaks
        const aPrompt = buildUserPrompt(scriptContext, newMessages, true);
        const aText = await callAi(providerA, SCORER_A_SYSTEM, aPrompt);
        const aMsg: DiscussionMessage = {
          role: 'A',
          provider: providerA,
          text: aText,
          timestamp: Date.now(),
        };
        newMessages.push(aMsg);
        onMessagesChange([...newMessages]);

        // Scorer B speaks
        const bPrompt = buildUserPrompt(scriptContext, newMessages, false);
        const bText = await callAi(providerB, SCORER_B_SYSTEM, bPrompt);
        const bMsg: DiscussionMessage = {
          role: 'B',
          provider: providerB,
          text: bText,
          timestamp: Date.now(),
        };
        newMessages.push(bMsg);
        onMessagesChange([...newMessages]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [synopsis, content, providerA, providerB, hasEnoughText, onMessagesChange]);

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: PROVIDER_COLORS.A }}>
            採点者A
          </span>
          <select
            value={providerA}
            onChange={(e) => onProviderAChange(e.target.value as AiProvider)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="gemini">Gemini</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>vs</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: PROVIDER_COLORS.B }}>
            採点者B
          </span>
          <select
            value={providerB}
            onChange={(e) => onProviderBChange(e.target.value as AiProvider)}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            <option value="gemini">Gemini</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void startDiscussion()}
          disabled={loading || !hasEnoughText}
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
        >
          {loading ? '議論中...' : messages.length > 0 ? '再議論' : '議論開始'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{error}</p>}

      {/* Messages */}
      {messages.length === 0 && !loading && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          採点者AとBのモデルを選んで「議論開始」を押すと、あらすじと本文についてAI同士が議論します。
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {messages.map((msg, i) => {
          const isA = msg.role === 'A';
          const color = isA ? PROVIDER_COLORS.A : PROVIDER_COLORS.B;
          const label = isA ? '採点者A' : '採点者B';
          const providerLabel = PROVIDER_LABELS[msg.provider];
          return (
            <div
              key={i}
              style={{
                padding: '0.625rem 0.75rem',
                border: `1px solid ${color}33`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 'var(--radius-md)',
                backgroundColor: `${color}08`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  marginBottom: '0.375rem',
                }}
              >
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{label}</span>
                <span
                  style={{
                    fontSize: '0.5625rem',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--color-surface)',
                    padding: '0.0625rem 0.25rem',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {providerLabel}
                </span>
                <span style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)' }}>
                  Round {Math.floor(i / 2) + 1}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-primary)',
                }}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        {loading && messages.length > 0 && (
          <div
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
            }}
          >
            {messages.length % 2 === 0 ? '採点者A' : '採点者B'}が考え中...
          </div>
        )}
      </div>
    </div>
  );
}
