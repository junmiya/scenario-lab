import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Clapperboard, Pen, SpellCheck } from 'lucide-react';
import { callAi, type AiProvider } from '../../lib/aiClient';
import { renderRevision, countEffectiveChars } from './SynopsisCommentary';

interface CommentEntry {
  text: string;
  provider: AiProvider;
  timestamp: number;
}

export interface ContentCommentaryCache {
  director: CommentEntry[];
  scriptdoctor: CommentEntry[];
  proofreader: CommentEntry[];
}

interface ContentCommentaryProps {
  content: string;
  scriptId?: string;
  charsPerColumn?: number;
  pageCount?: number;
  children?: ReactNode;
  afterDirector?: ReactNode | undefined;
  initialCache?: ContentCommentaryCache | undefined;
  onCacheChange?: ((cache: ContentCommentaryCache) => void) | undefined;
}

const DEBOUNCE_MS = 2000;

const DIRECTOR_PROMPT = `あなたはプロの映画・ドラマ演出家です。
以下の脚本本文の全文を演出の観点から分析し、修正箇所をマーカーで示した全文修正案を出力してください。

分析の視点:
- シーンの構成・テンポは適切か
- 映像として成立するト書きになっているか
- 場面転換の流れは自然か

出力形式（厳守）:
元の脚本本文の全文をそのまま出力し、修正が必要な箇所のみマーカーで囲んでください。
修正不要な箇所はそのまま記載してください。省略せず全文を出力してください。

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載（省略禁止）

例:
○リビング（夜）
【追加:窓の外には雨が降り続いている。】
　太郎が【削除:座っている】【追加:ソファに深く沈み込んでいる】。

重要: 全文を省略せず出力すること。マーカーは必ず【追加:】と【削除:】の形式のみ使用。
執筆中の場合もその時点の全文をベースに修正案を提示してください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

const SCRIPT_DOCTOR_PROMPT = `あなたはプロの脚本ドクター（スクリプトドクター）です。
以下の脚本本文の全文を脚本技術の観点から分析し、修正箇所をマーカーで示した全文修正案を出力してください。

分析の視点:
- セリフは登場人物の個性を反映しているか
- 対話のテンポ・リズムは良いか
- ドラマチックな緊張感・感情の起伏はあるか

出力形式（厳守）:
元の脚本本文の全文をそのまま出力し、修正が必要な箇所のみマーカーで囲んでください。
修正不要な箇所はそのまま記載してください。省略せず全文を出力してください。

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載（省略禁止）

例:
太郎「【削除:おい、聞いてるか】【追加:なあ…聞こえてるだろ】」
花子「【追加:……】分かってる【削除:よ】【追加:わよ】」

重要: 全文を省略せず出力すること。マーカーは必ず【追加:】と【削除:】の形式のみ使用。
執筆中の場合もその時点の全文をベースに修正案を提示してください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

const CONTENT_PROOFREADER_PROMPT = `あなたは校正技能検定上級相当のプロ校正者「校正マスター」です。
以下の脚本本文の全文を、出版校正の3ステップに基づいて厳密にチェックし、修正箇所をマーカーで示した全文修正案を出力してください。

【ステップ1: 表記・機械的チェック】
- 誤字脱字・変換ミス
- 表記ゆれ（漢字/ひらがな、送り仮名の不統一、全角/半角の混在）
- 句読点・記号の統一（「、」「。」「,」「.」の混在等）
- 数字表記の統一（漢数字/アラビア数字）
- セリフ記号（「」）の開閉対応

【ステップ2: 意味・内容の整合性チェック】
- 主語と述語の対応（ねじれ文の検出）
- 登場人物名の一貫性（途中で名前を変更した際の旧名残り、同一人物の別表記）
- 内容の矛盾・重複（前後で食い違う記述）
- 柱書き（シーン見出し）の書式統一
- 文体の統一（です・ます/だ・である の混在）

【ステップ3: 読み手目線の最終チェック】
- 冗長表現・二重表現（例:「まず最初に」「約〜ほど」）
- 不自然な語順・わかりにくい文構造
- ト書きの読みやすさ・簡潔さ
- セリフの自然さ・口語としての違和感

出力形式（厳守）:
元の脚本本文の全文をそのまま出力し、修正が必要な箇所のみマーカーで囲んでください。
修正不要な箇所はそのまま記載してください。省略せず全文を出力してください。

マーカーのルール（厳守）:
- 追加・変更した箇所 → 【追加:修正後のテキスト】
- 削除した箇所 → 【削除:削除されたテキスト】
- 変更なしの箇所 → そのまま記載（省略禁止）

重要: 全文を省略せず出力すること。マーカーは必ず【追加:】と【削除:】の形式のみ使用。
修正案は原文の内容や意図を変えず、文章の正確さ・読みやすさを高める方向で改善箇所のみ書き換えてください。

字数制約: ユーザーメッセージに記載された目安容量（字数制限）を厳守してください。修正案の文字数は【削除:...】部分を除いてカウントし、この制限を超えないように調整してください。`;

type BottomRole = 'scriptdoctor' | 'proofreader';

const BOTTOM_ROLE_LABELS: Record<BottomRole, string> = {
  scriptdoctor: '脚本ドクター視点',
  proofreader: '校正マスター',
};

const BOTTOM_ROLE_ICONS: Record<BottomRole, { color: string }> = {
  scriptdoctor: { color: '#ef4444' },
  proofreader: { color: '#8b5cf6' },
};

const STORAGE_PREFIX = 'content-commentary-';
const DEFAULT_MSG = '本文を入力すると、AIが自動でコメントします...';

interface CachedData {
  director: CommentEntry[];
  scriptdoctor: CommentEntry[];
  proofreader: CommentEntry[];
}

function loadCached(scriptId?: string): CachedData {
  if (!scriptId) return { director: [], scriptdoctor: [], proofreader: [] };
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${scriptId}`);
    if (!raw) return { director: [], scriptdoctor: [], proofreader: [] };
    const parsed = JSON.parse(raw);
    // Migrate from old { director: string, doctor: string } format
    if (typeof parsed.director === 'string' && parsed.director !== DEFAULT_MSG) {
      return {
        director: [
          { text: parsed.director, provider: 'gemini' as AiProvider, timestamp: Date.now() },
        ],
        scriptdoctor:
          typeof parsed.doctor === 'string' && parsed.doctor !== DEFAULT_MSG
            ? [{ text: parsed.doctor, provider: 'gemini' as AiProvider, timestamp: Date.now() }]
            : [],
        proofreader: [],
      };
    }
    // Migrate from { director, doctor } array format
    if (Array.isArray(parsed.doctor) && !parsed.scriptdoctor) {
      return {
        director: Array.isArray(parsed.director) ? parsed.director : [],
        scriptdoctor: parsed.doctor,
        proofreader: [],
      };
    }
    return {
      director: Array.isArray(parsed.director) ? parsed.director : [],
      scriptdoctor: Array.isArray(parsed.scriptdoctor) ? parsed.scriptdoctor : [],
      proofreader: Array.isArray(parsed.proofreader) ? parsed.proofreader : [],
    };
  } catch {
    /* ignore */
  }
  return { director: [], scriptdoctor: [], proofreader: [] };
}

function saveCached(
  scriptId: string | undefined,
  director: CommentEntry[],
  scriptdoctor: CommentEntry[],
  proofreader: CommentEntry[],
) {
  if (!scriptId) return;
  localStorage.setItem(
    `${STORAGE_PREFIX}${scriptId}`,
    JSON.stringify({ director, scriptdoctor, proofreader }),
  );
}

export function ContentCommentary({
  content,
  scriptId,
  charsPerColumn = 20,
  pageCount = 10,
  children,
  afterDirector,
  initialCache,
  onCacheChange,
}: ContentCommentaryProps): ReactElement {
  const cached = useRef(initialCache ?? loadCached(scriptId));

  // Director panel state
  const [directorHistory, setDirectorHistory] = useState<CommentEntry[]>(cached.current.director);
  const [directorIndex, setDirectorIndex] = useState(0);
  const [directorLoading, setDirectorLoading] = useState(false);
  const [directorProvider, setDirectorProvider] = useState<AiProvider>('gemini');
  const [directorAuto, setDirectorAuto] = useState(false);
  const directorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directorAbortRef = useRef(0);
  const [directorShowDel, setDirectorShowDel] = useState(true);

  // Script Doctor panel state
  const [sdHistory, setSdHistory] = useState<CommentEntry[]>(cached.current.scriptdoctor);
  const [sdIndex, setSdIndex] = useState(0);
  const [sdLoading, setSdLoading] = useState(false);
  const [sdProvider, setSdProvider] = useState<AiProvider>('gemini');
  const [sdAuto, setSdAuto] = useState(false);
  const sdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sdAbortRef = useRef(0);
  const [sdShowDel, setSdShowDel] = useState(true);

  // Proofreader panel state
  const [prHistory, setPrHistory] = useState<CommentEntry[]>(cached.current.proofreader);
  const [prIndex, setPrIndex] = useState(0);
  const [prLoading, setPrLoading] = useState(false);
  const [prProvider, setPrProvider] = useState<AiProvider>('gemini');
  const [prAuto, setPrAuto] = useState(false);
  const prTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prAbortRef = useRef(0);
  const [prShowDel, setPrShowDel] = useState(true);

  // Bottom role selection
  const [bottomRole, setBottomRole] = useState<BottomRole>('scriptdoctor');

  // Collapse state
  const [directorCollapsed, setDirectorCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const initialValueRef = useRef(content);
  const hasEditedRef = useRef(false);

  const hasEnoughText = content.replace(/[\r\n\s]/g, '').length >= 10;

  const directorComment = directorHistory[directorIndex]?.text ?? DEFAULT_MSG;
  const sdComment = sdHistory[sdIndex]?.text ?? DEFAULT_MSG;
  const prComment = prHistory[prIndex]?.text ?? DEFAULT_MSG;

  // Persist to localStorage + notify parent
  useEffect(() => {
    if (directorHistory.length > 0 || sdHistory.length > 0 || prHistory.length > 0) {
      saveCached(scriptId, directorHistory, sdHistory, prHistory);
      onCacheChange?.({
        director: directorHistory,
        scriptdoctor: sdHistory,
        proofreader: prHistory,
      });
    }
  }, [directorHistory, sdHistory, prHistory, scriptId, onCacheChange]);

  const totalCapacity = charsPerColumn * pageCount;

  const generateDirector = () => {
    if (!hasEnoughText) return;
    const gen = ++directorAbortRef.current;
    const provider = directorProvider;
    const userText = `脚本本文:\n${content}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setDirectorLoading(true);
    void callAi(provider, DIRECTOR_PROMPT, userText)
      .then((r) => {
        if (directorAbortRef.current === gen) {
          setDirectorHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setDirectorIndex(0);
        }
      })
      .catch((err) => {
        if (directorAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setDirectorHistory((prev) => [{ text: msg, provider, timestamp: Date.now() }, ...prev]);
          setDirectorIndex(0);
        }
      })
      .finally(() => {
        if (directorAbortRef.current === gen) setDirectorLoading(false);
      });
  };

  const generateScriptDoctor = () => {
    if (!hasEnoughText) return;
    const gen = ++sdAbortRef.current;
    const provider = sdProvider;
    const userText = `脚本本文:\n${content}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setSdLoading(true);
    void callAi(provider, SCRIPT_DOCTOR_PROMPT, userText)
      .then((r) => {
        if (sdAbortRef.current === gen) {
          setSdHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setSdIndex(0);
        }
      })
      .catch((err) => {
        if (sdAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setSdHistory((prev) => [{ text: msg, provider, timestamp: Date.now() }, ...prev]);
          setSdIndex(0);
        }
      })
      .finally(() => {
        if (sdAbortRef.current === gen) setSdLoading(false);
      });
  };

  const generateProofreader = () => {
    if (!hasEnoughText) return;
    const gen = ++prAbortRef.current;
    const provider = prProvider;
    const userText = `脚本本文:\n${content}\n\n【字数設定】${charsPerColumn}文字/行 × ${pageCount}枚 = 目安容量${totalCapacity}字。修正案はこの字数に収めてください。`;
    setPrLoading(true);
    void callAi(provider, CONTENT_PROOFREADER_PROMPT, userText)
      .then((r) => {
        if (prAbortRef.current === gen) {
          setPrHistory((prev) => [{ text: r, provider, timestamp: Date.now() }, ...prev]);
          setPrIndex(0);
        }
      })
      .catch((err) => {
        if (prAbortRef.current === gen) {
          const msg = `エラー: ${err instanceof Error ? err.message : String(err)}`;
          setPrHistory((prev) => [{ text: msg, provider, timestamp: Date.now() }, ...prev]);
          setPrIndex(0);
        }
      })
      .finally(() => {
        if (prAbortRef.current === gen) setPrLoading(false);
      });
  };

  // Track whether user has started editing
  useEffect(() => {
    if (!hasEditedRef.current) {
      if (content !== initialValueRef.current) initialValueRef.current = content;
      if (content === initialValueRef.current && hasEnoughText) hasEditedRef.current = true;
    }
  }, [content]);

  // Auto-generate director (debounced)
  useEffect(() => {
    if (directorTimerRef.current) clearTimeout(directorTimerRef.current);
    if (!directorAuto || !hasEditedRef.current || !hasEnoughText) return;
    directorTimerRef.current = setTimeout(generateDirector, DEBOUNCE_MS);
    return () => {
      if (directorTimerRef.current) clearTimeout(directorTimerRef.current);
    };
  }, [content, directorAuto]);

  // Auto-generate script doctor (debounced)
  useEffect(() => {
    if (sdTimerRef.current) clearTimeout(sdTimerRef.current);
    if (!sdAuto || !hasEditedRef.current || !hasEnoughText) return;
    sdTimerRef.current = setTimeout(generateScriptDoctor, DEBOUNCE_MS);
    return () => {
      if (sdTimerRef.current) clearTimeout(sdTimerRef.current);
    };
  }, [content, sdAuto]);

  // Auto-generate proofreader (debounced)
  useEffect(() => {
    if (prTimerRef.current) clearTimeout(prTimerRef.current);
    if (!prAuto || !hasEditedRef.current || !hasEnoughText) return;
    prTimerRef.current = setTimeout(generateProofreader, DEBOUNCE_MS);
    return () => {
      if (prTimerRef.current) clearTimeout(prTimerRef.current);
    };
  }, [content, prAuto]);

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
      {/* Director panel (top) */}
      <div style={{ marginBottom: '0.75rem' }}>
        {panelHeader(
          <Clapperboard size={12} style={{ color: '#10b981' }} />,
          '演出家視点',
          directorLoading,
          '#10b981',
          directorAuto,
          setDirectorAuto,
          directorProvider,
          setDirectorProvider,
          generateDirector,
          directorHistory.length,
          directorIndex,
          setDirectorIndex,
          directorShowDel,
          setDirectorShowDel,
          false,
          directorCollapsed,
          () => setDirectorCollapsed((v) => !v),
        )}
        {!directorCollapsed && panelBody(directorComment, directorLoading, directorShowDel)}
      </div>

      {/* After director slot (e.g. structure guide) */}
      {afterDirector}

      {/* Editor slot (middle) */}
      {children}

      {/* Bottom panel with tabs */}
      <div style={{ marginTop: '0.75rem' }}>
        {/* Role tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['scriptdoctor', 'proofreader'] as BottomRole[]).map((r) => {
            const active = bottomRole === r;
            const iconColor = BOTTOM_ROLE_ICONS[r].color;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setBottomRole(r)}
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
                {r === 'scriptdoctor' ? (
                  <Pen size={11} style={{ color: active ? iconColor : 'var(--text-secondary)' }} />
                ) : (
                  <SpellCheck
                    size={11}
                    style={{ color: active ? iconColor : 'var(--text-secondary)' }}
                  />
                )}
                {BOTTOM_ROLE_LABELS[r]}
              </button>
            );
          })}
        </div>
        {bottomRole === 'scriptdoctor' ? (
          <>
            {panelHeader(
              <Pen size={12} style={{ color: BOTTOM_ROLE_ICONS.scriptdoctor.color }} />,
              BOTTOM_ROLE_LABELS.scriptdoctor,
              sdLoading,
              BOTTOM_ROLE_ICONS.scriptdoctor.color,
              sdAuto,
              setSdAuto,
              sdProvider,
              setSdProvider,
              generateScriptDoctor,
              sdHistory.length,
              sdIndex,
              setSdIndex,
              sdShowDel,
              setSdShowDel,
              true,
              bottomCollapsed,
              () => setBottomCollapsed((v) => !v),
            )}
            {!bottomCollapsed && panelBody(sdComment, sdLoading, sdShowDel)}
          </>
        ) : (
          <>
            {panelHeader(
              <SpellCheck size={12} style={{ color: BOTTOM_ROLE_ICONS.proofreader.color }} />,
              BOTTOM_ROLE_LABELS.proofreader,
              prLoading,
              BOTTOM_ROLE_ICONS.proofreader.color,
              prAuto,
              setPrAuto,
              prProvider,
              setPrProvider,
              generateProofreader,
              prHistory.length,
              prIndex,
              setPrIndex,
              prShowDel,
              setPrShowDel,
              true,
              bottomCollapsed,
              () => setBottomCollapsed((v) => !v),
            )}
            {!bottomCollapsed && panelBody(prComment, prLoading, prShowDel)}
          </>
        )}
      </div>
    </>
  );
}
