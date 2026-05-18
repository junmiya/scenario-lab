import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { MessageSquare, Lightbulb, SpellCheck } from 'lucide-react';
import { callAi, type AiProvider } from '../../lib/aiClient';

/** Classify the inner text of a 【...】 marker as addition, deletion, or plain */
function classifyMarker(inner: string): { type: 'add' | 'del' | 'plain'; text: string } {
  // 【+text】 or 【＋text】
  if (/^[+＋]/.test(inner)) return { type: 'add', text: inner.replace(/^[+＋]\s*/, '') };
  // 【-text】 or 【−text】 or 【ー text】
  if (/^[-−ー]/.test(inner)) return { type: 'del', text: inner.replace(/^[-−ー]\s*/, '') };
  // 【追加:text】 【追加：text】 【追記:text】 【変更:text】
  if (/^(追加|追記|変更|加筆)[：:]?\s*/.test(inner))
    return { type: 'add', text: inner.replace(/^(追加|追記|変更|加筆)[：:]?\s*/, '') };
  // 【削除:text】 【削除：text】 【削除】
  if (/^削除[：:]?\s*/.test(inner))
    return { type: 'del', text: inner.replace(/^削除[：:]?\s*/, '') || '削除' };
  return { type: 'plain', text: inner };
}

/** Count effective characters (plain + additions, excluding deletions and markers) */
export function countEffectiveChars(text: string): number {
  const parts = text.split(/(【[^】]*】)/g);
  let count = 0;
  for (const part of parts) {
    if (part.startsWith('【') && part.endsWith('】')) {
      const inner = part.slice(1, -1);
      const { type, text: content } = classifyMarker(inner);
      if (type !== 'del') count += content.replace(/[\r\n]/g, '').length;
    } else {
      count += part.replace(/[\r\n]/g, '').length;
    }
  }
  return count;
}

/** Render text with additions in blue and deletions in red.
 *  When showDeletions is false, deleted spans are hidden entirely. */
export function renderRevision(text: string, showDeletions = true): ReactNode {
  const parts = text.split(/(【[^】]*】)/g);
  return parts.map((part, i) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      const inner = part.slice(1, -1);
      const { type, text: content } = classifyMarker(inner);

      if (type === 'add') {
        return (
          <span
            key={i}
            style={{
              color: '#1d4ed8',
              fontWeight: 600,
              backgroundColor: '#dbeafe',
              borderRadius: '2px',
              padding: '0 2px',
            }}
          >
            {content}
          </span>
        );
      }
      if (type === 'del') {
        if (!showDeletions) return null;
        return (
          <span
            key={i}
            style={{
              color: '#dc2626',
              fontWeight: 600,
              backgroundColor: '#fee2e2',
              borderRadius: '2px',
              padding: '0 2px',
              opacity: 0.7,
            }}
          >
            {content}
          </span>
        );
      }
      // Plain 【...】 — yellow highlight
      return (
        <span
          key={i}
          style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontWeight: 600,
            borderRadius: '2px',
            padding: '0 2px',
          }}
        >
          {content}
        </span>
      );
    }
    return part;
  });
}

interface SynopsisCommentaryProps {
  synopsis: string;
  scriptId?: string;
  charsPerColumn?: number;
  pageCount?: number;
  children?: ReactNode;
  initialCache?: SynopsisCommentaryCache | undefined;
  onCacheChange?: ((cache: SynopsisCommentaryCache) => void) | undefined;
}

const DEBOUNCE_MS = 2000; // Wait 2 seconds after typing stops

const STORY_PROMPT = `あなたはプロの脚本家・ストーリーテラーです。
以下のあらすじについて、物語としての完成度を分析し、具体的な修正ポイントと修正案を提示してください。

分析ポイント:
- 起承転結の流れは明確か
- 主人公の目的・葛藤は伝わるか
- 読者を惹きつける要素はあるか

出力形式:
1.「■ 評価:」現状の評価を1〜2行で述べる
2.「■ 修正ポイント:」改善すべき点を2〜3点、それぞれ理由とともに挙げる
3.「■ 修正案:」元のあらすじ全文をベースに、修正箇所をマーカーで囲んで書き直した全文を提示する

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載

例:
主人公の太郎は【追加:孤独を抱えながらも希望を捨てない青年で、】東京で【削除:のんびりと】暮らしている。

重要: マーカーは必ず【追加:】と【削除:】の形式を使用してください。

修正案は原文の良い部分は残しつつ、改善箇所のみ書き換えてください。
執筆中の場合もその時点での印象と、次に書くべき方向性を含めた修正案を提示してください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

const MARKET_PROMPT = `あなたは映画・ドラマのプロデューサーです。
以下のあらすじについて、商業的な観点から分析し、具体的な修正ポイントと修正案を提示してください。

分析ポイント:
- ターゲット層は明確か
- 既存作品との差別化ポイントはあるか
- 映像化した際のインパクトはあるか

出力形式:
1.「■ 評価:」現状の評価を1〜2行で述べる
2.「■ 修正ポイント:」改善すべき点を2〜3点、それぞれ理由とともに挙げる
3.「■ 修正案:」元のあらすじ全文をベースに、修正箇所をマーカーで囲んで書き直した全文を提示する

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載

例:
主人公の太郎は【追加:孤独を抱えながらも希望を捨てない青年で、】東京で【削除:のんびりと】暮らしている。

重要: マーカーは必ず【追加:】と【削除:】の形式を使用してください。

修正案は原文の良い部分は残しつつ、商業的な魅力を高める方向で改善箇所のみ書き換えてください。
執筆中の場合もその時点での印象と、企画として強化すべき方向性を含めた修正案を提示してください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

const PROOFREADER_PROMPT = `あなたは校正技能検定上級相当のプロ校正者「校正マスター」です。
以下の文章を、出版校正の3ステップに基づいて厳密にチェックし、修正案を提示してください。

【ステップ1: 表記・機械的チェック】
- 誤字脱字・変換ミス
- 表記ゆれ（漢字/ひらがな、送り仮名の不統一、全角/半角の混在）
- 句読点・記号の統一（「、」「。」「,」「.」の混在等）
- 数字表記の統一（漢数字/アラビア数字）

【ステップ2: 意味・内容の整合性チェック】
- 主語と述語の対応（ねじれ文の検出）
- 登場人物名の一貫性（途中で名前を変更した際の旧名残り、同一人物の別表記）
- 内容の矛盾・重複（前後で食い違う記述）
- 事実関係の整合性（時系列の矛盾、設定の不一致）
- 文体の統一（です・ます/だ・である の混在）

【ステップ3: 読み手目線の最終チェック】
- 冗長表現・二重表現（例:「まず最初に」「約〜ほど」）
- 不自然な語順・わかりにくい文構造
- 読みやすさ・リズム・語感の違和感
- 敬語・語調の適切性

出力形式:
1.「■ 評価:」文章品質の総合評価を1〜2行で述べる
2.「■ 修正ポイント:」改善すべき点を2〜3点、該当するステップ番号とともに挙げる
3.「■ 修正案:」元の全文をベースに、修正箇所をマーカーで囲んで書き直した全文を提示する

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載

例:
太郎は【削除:すごいとても】【追加:非常に】優秀な【追加:人物で、】周囲から信頼【削除:させている】【追加:されている】。

重要: マーカーは必ず【追加:】と【削除:】の形式を使用してください。

修正案は原文の内容や意図を変えず、文章の正確さ・読みやすさを高める方向で改善箇所のみ書き換えてください。
執筆中の場合もその時点での文章をチェックし、修正案を提示してください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

type SubRole = 'producer' | 'proofreader';

const SUB_ROLE_LABELS: Record<SubRole, string> = {
  producer: 'プロデューサー視点',
  proofreader: '校正マスター',
};

const SUB_ROLE_ICONS: Record<SubRole, { color: string }> = {
  producer: { color: '#f59e0b' },
  proofreader: { color: '#8b5cf6' },
};

interface CommentEntry {
  text: string;
  provider: AiProvider;
  timestamp: number;
}

export interface SynopsisCommentaryCache {
  story: CommentEntry[];
  producer: CommentEntry[];
  proofreader: CommentEntry[];
}

const STORAGE_PREFIX = 'synopsis-commentary-';
const DEFAULT_MSG = 'あらすじを入力すると、AIが自動でコメントします...';

interface CachedData {
  story: CommentEntry[];
  producer: CommentEntry[];
  proofreader: CommentEntry[];
}

function loadCached(scriptId?: string): CachedData {
  if (!scriptId) return { story: [], producer: [], proofreader: [] };
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${scriptId}`);
    if (!raw) return { story: [], producer: [], proofreader: [] };
    const parsed = JSON.parse(raw);
    // Migrate from old { story: string, market: string } format
    if (typeof parsed.story === 'string' && parsed.story !== DEFAULT_MSG) {
      return {
        story: [{ text: parsed.story, provider: 'gemini' as AiProvider, timestamp: Date.now() }],
        producer:
          typeof parsed.market === 'string' && parsed.market !== DEFAULT_MSG
            ? [{ text: parsed.market, provider: 'gemini' as AiProvider, timestamp: Date.now() }]
            : [],
        proofreader: [],
      };
    }
    // Migrate from { story, market } array format
    if (Array.isArray(parsed.market) && !parsed.producer) {
      return {
        story: Array.isArray(parsed.story) ? parsed.story : [],
        producer: parsed.market,
        proofreader: [],
      };
    }
    return {
      story: Array.isArray(parsed.story) ? parsed.story : [],
      producer: Array.isArray(parsed.producer) ? parsed.producer : [],
      proofreader: Array.isArray(parsed.proofreader)
        ? parsed.proofreader
        : Array.isArray(parsed.doctor)
          ? parsed.doctor
          : [],
    };
  } catch {
    /* ignore */
  }
  return { story: [], producer: [], proofreader: [] };
}

function saveCached(
  scriptId: string | undefined,
  story: CommentEntry[],
  producer: CommentEntry[],
  proofreader: CommentEntry[],
) {
  if (!scriptId) return;
  localStorage.setItem(
    `${STORAGE_PREFIX}${scriptId}`,
    JSON.stringify({ story, producer, proofreader }),
  );
}

export function SynopsisCommentary({
  synopsis,
  scriptId,
  charsPerColumn = 20,
  pageCount = 2,
  children,
  initialCache,
  onCacheChange,
}: SynopsisCommentaryProps): ReactElement {
  const cached = useRef(initialCache ?? loadCached(scriptId));

  // Story panel state
  const [storyHistory, setStoryHistory] = useState<CommentEntry[]>(cached.current.story);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyProvider, setStoryProvider] = useState<AiProvider>('gemini');
  const [storyAuto, setStoryAuto] = useState(false);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyAbortRef = useRef(0);

  // Story deletion visibility
  const [storyShowDel, setStoryShowDel] = useState(true);

  // Producer panel state
  const [producerHistory, setProducerHistory] = useState<CommentEntry[]>(cached.current.producer);
  const [producerIndex, setProducerIndex] = useState(0);
  const [producerLoading, setProducerLoading] = useState(false);
  const [producerProvider, setProducerProvider] = useState<AiProvider>('gemini');
  const [producerAuto, setProducerAuto] = useState(false);
  const producerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const producerAbortRef = useRef(0);
  const [producerShowDel, setProducerShowDel] = useState(true);

  // Doctor panel state
  const [proofreaderHistory, setProofreaderHistory] = useState<CommentEntry[]>(
    cached.current.proofreader,
  );
  const [proofreaderIndex, setProofreaderIndex] = useState(0);
  const [proofreaderLoading, setProofreaderLoading] = useState(false);
  const [proofreaderProvider, setProofreaderProvider] = useState<AiProvider>('gemini');
  const [proofreaderAuto, setProofreaderAuto] = useState(false);
  const proofreaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proofreaderAbortRef = useRef(0);
  const [proofreaderShowDel, setProofreaderShowDel] = useState(true);

  // Market role selection
  const [subRole, setSubRole] = useState<SubRole>('producer');

  // Collapse state
  const [storyCollapsed, setStoryCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const initialValueRef = useRef(synopsis);
  const hasEditedRef = useRef(false);

  const hasEnoughText = synopsis.replace(/[\r\n\s]/g, '').length >= 10;

  const storyComment = storyHistory[storyIndex]?.text ?? DEFAULT_MSG;
  const producerComment = producerHistory[producerIndex]?.text ?? DEFAULT_MSG;
  const proofreaderComment = proofreaderHistory[proofreaderIndex]?.text ?? DEFAULT_MSG;

  // Persist comments to localStorage + notify parent
  useEffect(() => {
    if (storyHistory.length > 0 || producerHistory.length > 0 || proofreaderHistory.length > 0) {
      saveCached(scriptId, storyHistory, producerHistory, proofreaderHistory);
      onCacheChange?.({
        story: storyHistory,
        producer: producerHistory,
        proofreader: proofreaderHistory,
      });
    }
  }, [storyHistory, producerHistory, proofreaderHistory, scriptId, onCacheChange]);

  const totalCapacity = charsPerColumn * pageCount;

  const generateStory = () => {
    if (!hasEnoughText) return;
    const gen = ++storyAbortRef.current;
    const provider = storyProvider;
    const userText = `あらすじ:\n${synopsis}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setStoryLoading(true);
    void callAi(provider, STORY_PROMPT, userText)
      .then((r) => {
        if (storyAbortRef.current === gen) {
          setStoryHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setStoryIndex(0);
        }
      })
      .catch((err) => {
        if (storyAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setStoryHistory((prev) => [{ text: msg, provider, timestamp: Date.now() }, ...prev]);
          setStoryIndex(0);
        }
      })
      .finally(() => {
        if (storyAbortRef.current === gen) setStoryLoading(false);
      });
  };

  const generateProducer = () => {
    if (!hasEnoughText) return;
    const gen = ++producerAbortRef.current;
    const provider = producerProvider;
    const userText = `あらすじ:\n${synopsis}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setProducerLoading(true);
    void callAi(provider, MARKET_PROMPT, userText)
      .then((r) => {
        if (producerAbortRef.current === gen) {
          setProducerHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setProducerIndex(0);
        }
      })
      .catch((err) => {
        if (producerAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setProducerHistory((prev) => [{ text: msg, provider, timestamp: Date.now() }, ...prev]);
          setProducerIndex(0);
        }
      })
      .finally(() => {
        if (producerAbortRef.current === gen) setProducerLoading(false);
      });
  };

  const generateProofreader = () => {
    if (!hasEnoughText) return;
    const gen = ++proofreaderAbortRef.current;
    const provider = proofreaderProvider;
    const userText = `あらすじ:\n${synopsis}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setProofreaderLoading(true);
    void callAi(provider, PROOFREADER_PROMPT, userText)
      .then((r) => {
        if (proofreaderAbortRef.current === gen) {
          setProofreaderHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setProofreaderIndex(0);
        }
      })
      .catch((err) => {
        if (proofreaderAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setProofreaderHistory((prev) => [
            { text: msg, provider, timestamp: Date.now() },
            ...prev,
          ]);
          setProofreaderIndex(0);
        }
      })
      .finally(() => {
        if (proofreaderAbortRef.current === gen) setProofreaderLoading(false);
      });
  };

  // Track whether user has started editing
  useEffect(() => {
    if (!hasEditedRef.current) {
      if (synopsis !== initialValueRef.current) initialValueRef.current = synopsis;
      if (synopsis === initialValueRef.current && hasEnoughText) hasEditedRef.current = true;
    }
  }, [synopsis]);

  // Auto-generate story (debounced)
  useEffect(() => {
    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    if (!storyAuto || !hasEditedRef.current || !hasEnoughText) return;
    storyTimerRef.current = setTimeout(generateStory, DEBOUNCE_MS);
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [synopsis, storyAuto]);

  // Auto-generate producer (debounced)
  useEffect(() => {
    if (producerTimerRef.current) clearTimeout(producerTimerRef.current);
    if (!producerAuto || !hasEditedRef.current || !hasEnoughText) return;
    producerTimerRef.current = setTimeout(generateProducer, DEBOUNCE_MS);
    return () => {
      if (producerTimerRef.current) clearTimeout(producerTimerRef.current);
    };
  }, [synopsis, producerAuto]);

  // Auto-generate doctor (debounced)
  useEffect(() => {
    if (proofreaderTimerRef.current) clearTimeout(proofreaderTimerRef.current);
    if (!proofreaderAuto || !hasEditedRef.current || !hasEnoughText) return;
    proofreaderTimerRef.current = setTimeout(generateProofreader, DEBOUNCE_MS);
    return () => {
      if (proofreaderTimerRef.current) clearTimeout(proofreaderTimerRef.current);
    };
  }, [synopsis, proofreaderAuto]);

  const controlsStyle: React.CSSProperties = {
    fontSize: '0.6875rem',
    padding: '0.125rem 0.25rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--text-primary)',
  };

  const panelHeader = (
    icon: ReactNode,
    label: string,
    loading: boolean,
    loadingColor: string,
    auto: boolean,
    setAuto: (v: (prev: boolean) => boolean) => void,
    provider: AiProvider,
    setProvider: (v: AiProvider) => void,
    onGenerate: () => void,
    historyLen: number,
    historyIdx: number,
    setHistoryIdx: (v: number) => void,
    showDel: boolean,
    setShowDel: (v: (prev: boolean) => boolean) => void,
    hasTabsAbove = false,
    collapsed = false,
    onToggleCollapse?: () => void,
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.375rem 0.75rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderBottom: collapsed ? '1px solid var(--color-border)' : 'none',
        borderRadius: hasTabsAbove
          ? collapsed
            ? '0 0 var(--radius-lg) var(--radius-lg)'
            : '0'
          : collapsed
            ? 'var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) 0 0',
        cursor: onToggleCollapse ? 'pointer' : undefined,
      }}
      onClick={onToggleCollapse}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        {onToggleCollapse && (
          <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
            {collapsed ? '▶' : '▼'}
          </span>
        )}
        {!hasTabsAbove && icon}
        {!hasTabsAbove && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </span>
        )}
        {loading && <span style={{ fontSize: '0.6875rem', color: loadingColor }}>生成中...</span>}
        {historyLen > 0 && !loading && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.6875rem',
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.125rem 0.375rem',
            }}
          >
            <button
              type="button"
              disabled={historyIdx >= historyLen - 1}
              onClick={() => setHistoryIdx(historyIdx + 1)}
              style={{
                fontSize: '0.6875rem',
                padding: '0 0.125rem',
                border: 'none',
                background: 'none',
                cursor: historyIdx < historyLen - 1 ? 'pointer' : 'default',
                color:
                  historyIdx < historyLen - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                opacity: historyIdx < historyLen - 1 ? 1 : 0.3,
              }}
            >
              &#9664;
            </button>
            <span style={{ color: 'var(--text-primary)', minWidth: '2em', textAlign: 'center' }}>
              {historyIdx + 1}/{historyLen}
            </span>
            <button
              type="button"
              disabled={historyIdx <= 0}
              onClick={() => setHistoryIdx(historyIdx - 1)}
              style={{
                fontSize: '0.6875rem',
                padding: '0 0.125rem',
                border: 'none',
                background: 'none',
                cursor: historyIdx > 0 ? 'pointer' : 'default',
                color: historyIdx > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                opacity: historyIdx > 0 ? 1 : 0.3,
              }}
            >
              &#9654;
            </button>
          </span>
        )}
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}
        >
          <span
            style={{
              color: '#1d4ed8',
              fontWeight: 600,
              backgroundColor: '#dbeafe',
              borderRadius: '2px',
              padding: '0 2px',
            }}
          >
            追加
          </span>{' '}
          <button
            type="button"
            onClick={() => setShowDel((v) => !v)}
            style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              borderRadius: '2px',
              padding: '0 2px',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: showDel ? '#fee2e2' : '#f3f4f6',
              color: showDel ? '#dc2626' : '#9ca3af',
              opacity: showDel ? 0.7 : 0.4,
              textDecoration: showDel ? 'none' : 'line-through',
            }}
          >
            削除
          </button>
        </span>
        <button
          type="button"
          onClick={() => setAuto((v) => !v)}
          style={{
            fontSize: '0.625rem',
            padding: '0.125rem 0.375rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            backgroundColor: auto ? '#dbeafe' : 'var(--color-bg-primary)',
            color: auto ? '#1d4ed8' : 'var(--text-secondary)',
            fontWeight: auto ? 600 : 400,
          }}
        >
          {auto ? '自動' : '手動'}
        </button>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as AiProvider)}
          style={{ ...controlsStyle, fontSize: '0.625rem' }}
        >
          <option value="gemini">Gemini</option>
          <option value="claude">Claude</option>
        </select>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || !hasEnoughText}
          style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}
        >
          {loading ? '...' : 'AI分析'}
        </button>
      </div>
    </div>
  );

  const panelBody = (comment: string, loading: boolean, showDel: boolean) => {
    const isDefault = comment === DEFAULT_MSG;
    const effectiveCount = isDefault ? 0 : countEffectiveChars(comment);
    const overLimit = totalCapacity > 0 && effectiveCount > totalCapacity;
    return (
      <div>
        <div
          className="vertical-editor-container"
          style={{
            borderTop: 'none',
            borderRadius: isDefault ? '0 0 var(--radius-lg) var(--radius-lg)' : '0',
          }}
        >
          <div className="vertical-editor-scroll-area">
            <div
              className="vertical-editor"
              style={{
                minWidth: '100%',
                width: 'fit-content',
                height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`,
                cursor: 'default',
                opacity: loading ? 0.5 : 1,
                transition: 'opacity 0.3s',
              }}
            >
              {renderRevision(comment, showDel)}
            </div>
          </div>
        </div>
        {!isDefault && (
          <div
            style={{
              fontSize: '0.625rem',
              padding: '0.25rem 0.75rem',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderTop: 'none',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              color: overLimit ? '#dc2626' : 'var(--text-secondary)',
              fontWeight: overLimit ? 600 : 400,
            }}
          >
            修正案: {effectiveCount}字（削除除く）/ 目安 {totalCapacity}字
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Story panel (top) */}
      <div style={{ marginBottom: '0.75rem' }}>
        {panelHeader(
          <MessageSquare size={12} style={{ color: '#6366f1' }} />,
          'ストーリー分析',
          storyLoading,
          '#6366f1',
          storyAuto,
          setStoryAuto,
          storyProvider,
          setStoryProvider,
          generateStory,
          storyHistory.length,
          storyIndex,
          setStoryIndex,
          storyShowDel,
          setStoryShowDel,
          false,
          storyCollapsed,
          () => setStoryCollapsed((v) => !v),
        )}
        {!storyCollapsed && panelBody(storyComment, storyLoading, storyShowDel)}
      </div>

      {/* Editor slot (middle) */}
      {children}

      {/* Market panel (bottom) */}
      <div style={{ marginTop: '0.75rem' }}>
        {/* Role tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['producer', 'proofreader'] as SubRole[]).map((r) => {
            const active = subRole === r;
            const iconColor = SUB_ROLE_ICONS[r].color;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSubRole(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.6875rem',
                  fontWeight: active ? 600 : 400,
                  padding: '0.375rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderBottom: active ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                  backgroundColor: active ? 'var(--color-surface)' : 'var(--color-bg-primary)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  marginRight: '-1px',
                  position: 'relative',
                  zIndex: active ? 1 : 0,
                }}
              >
                {r === 'producer' ? (
                  <Lightbulb
                    size={11}
                    style={{ color: active ? iconColor : 'var(--text-secondary)' }}
                  />
                ) : (
                  <SpellCheck
                    size={11}
                    style={{ color: active ? iconColor : 'var(--text-secondary)' }}
                  />
                )}
                {SUB_ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
        {subRole === 'producer' ? (
          <>
            {panelHeader(
              <Lightbulb size={12} style={{ color: SUB_ROLE_ICONS.producer.color }} />,
              SUB_ROLE_LABELS.producer,
              producerLoading,
              SUB_ROLE_ICONS.producer.color,
              producerAuto,
              setProducerAuto,
              producerProvider,
              setProducerProvider,
              generateProducer,
              producerHistory.length,
              producerIndex,
              setProducerIndex,
              producerShowDel,
              setProducerShowDel,
              true,
              bottomCollapsed,
              () => setBottomCollapsed((v) => !v),
            )}
            {!bottomCollapsed && panelBody(producerComment, producerLoading, producerShowDel)}
          </>
        ) : (
          <>
            {panelHeader(
              <SpellCheck size={12} style={{ color: SUB_ROLE_ICONS.proofreader.color }} />,
              SUB_ROLE_LABELS.proofreader,
              proofreaderLoading,
              SUB_ROLE_ICONS.proofreader.color,
              proofreaderAuto,
              setProofreaderAuto,
              proofreaderProvider,
              setProofreaderProvider,
              generateProofreader,
              proofreaderHistory.length,
              proofreaderIndex,
              setProofreaderIndex,
              proofreaderShowDel,
              setProofreaderShowDel,
              true,
              bottomCollapsed,
              () => setBottomCollapsed((v) => !v),
            )}
            {!bottomCollapsed &&
              panelBody(proofreaderComment, proofreaderLoading, proofreaderShowDel)}
          </>
        )}
      </div>
    </>
  );
}
