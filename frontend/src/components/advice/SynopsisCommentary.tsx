import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { MessageSquare, Lightbulb } from 'lucide-react';
import { callAi, type AiProvider } from '../../lib/aiClient';

/** Classify the inner text of a 【...】 marker as addition, deletion, or plain */
function classifyMarker(inner: string): { type: 'add' | 'del' | 'plain'; text: string } {
    // 【+text】 or 【＋text】
    if (/^[+＋]/.test(inner)) return { type: 'add', text: inner.replace(/^[+＋]\s*/, '') };
    // 【-text】 or 【−text】 or 【ー text】
    if (/^[-−ー]/.test(inner)) return { type: 'del', text: inner.replace(/^[-−ー]\s*/, '') };
    // 【追加:text】 【追加：text】 【追記:text】 【変更:text】
    if (/^(追加|追記|変更|加筆)[：:]?\s*/.test(inner)) return { type: 'add', text: inner.replace(/^(追加|追記|変更|加筆)[：:]?\s*/, '') };
    // 【削除:text】 【削除：text】 【削除】
    if (/^削除[：:]?\s*/.test(inner)) return { type: 'del', text: inner.replace(/^削除[：:]?\s*/, '') || '削除' };
    return { type: 'plain', text: inner };
}

/** Render text with additions in blue and deletions in red */
function renderRevision(text: string): ReactNode {
    const parts = text.split(/(【[^】]*】)/g);
    return parts.map((part, i) => {
        if (part.startsWith('【') && part.endsWith('】')) {
            const inner = part.slice(1, -1);
            const { type, text: content } = classifyMarker(inner);

            if (type === 'add') {
                return (
                    <span key={i} style={{
                        color: '#2563eb',
                        fontWeight: 600,
                        textDecoration: 'underline',
                        textDecorationColor: '#93c5fd',
                    }}>
                        {content}
                    </span>
                );
            }
            if (type === 'del') {
                return (
                    <span key={i} style={{
                        color: '#dc2626',
                        fontWeight: 600,
                        textDecoration: 'line-through',
                        textDecorationColor: '#fca5a5',
                    }}>
                        {content}
                    </span>
                );
            }
            // Plain 【...】 — yellow highlight
            return (
                <span key={i} style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontWeight: 600,
                    borderRadius: '2px',
                    padding: '0 2px',
                }}>
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
執筆中の場合もその時点での印象と、次に書くべき方向性を含めた修正案を提示してください。`;

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
執筆中の場合もその時点での印象と、企画として強化すべき方向性を含めた修正案を提示してください。`;


const STORAGE_PREFIX = 'synopsis-commentary-';
const DEFAULT_MSG = 'あらすじを入力すると、AIが自動でコメントします...';

function loadCached(scriptId?: string): { story: string; market: string } {
    if (!scriptId) return { story: DEFAULT_MSG, market: DEFAULT_MSG };
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${scriptId}`);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { story: DEFAULT_MSG, market: DEFAULT_MSG };
}

function saveCached(scriptId: string | undefined, story: string, market: string) {
    if (!scriptId) return;
    localStorage.setItem(`${STORAGE_PREFIX}${scriptId}`, JSON.stringify({ story, market }));
}

type Perspective = 'story' | 'market';

export function SynopsisCommentary({ synopsis, scriptId, charsPerColumn = 20 }: SynopsisCommentaryProps): ReactElement {
    const cached = useRef(loadCached(scriptId));
    const [storyComment, setStoryComment] = useState(cached.current.story);
    const [marketComment, setMarketComment] = useState(cached.current.market);
    const [storyLoading, setStoryLoading] = useState(false);
    const [marketLoading, setMarketLoading] = useState(false);
    const [perspective, setPerspective] = useState<Perspective>('story');
    const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef(0);
    const initialValueRef = useRef(synopsis);
    const hasEditedRef = useRef(false);

    const isLoading = storyLoading || marketLoading;
    const activeComment = perspective === 'story' ? storyComment : marketComment;
    const activeLoading = perspective === 'story' ? storyLoading : marketLoading;

    // Persist comments to localStorage
    useEffect(() => {
        if (storyComment !== DEFAULT_MSG || marketComment !== DEFAULT_MSG) {
            saveCached(scriptId, storyComment, marketComment);
        }
    }, [storyComment, marketComment, scriptId]);

    const generate = () => {
        if (synopsis.replace(/[\r\n\s]/g, '').length < 10) return;
        const currentGeneration = ++abortRef.current;
        const userText = `あらすじ:\n${synopsis}`;

        setStoryLoading(true);
        void callAi(aiProvider, STORY_PROMPT, userText)
            .then((result) => { if (abortRef.current === currentGeneration) setStoryComment(result); })
            .catch((err) => { if (abortRef.current === currentGeneration) setStoryComment(`エラー: ${err instanceof Error ? err.message : String(err)}`); })
            .finally(() => { if (abortRef.current === currentGeneration) setStoryLoading(false); });

        setMarketLoading(true);
        void callAi(aiProvider, MARKET_PROMPT, userText)
            .then((result) => { if (abortRef.current === currentGeneration) setMarketComment(result); })
            .catch((err) => { if (abortRef.current === currentGeneration) setMarketComment(`エラー: ${err instanceof Error ? err.message : String(err)}`); })
            .finally(() => { if (abortRef.current === currentGeneration) setMarketLoading(false); });
    };

    // Auto-generate on user edits (debounced)
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!hasEditedRef.current) {
            if (synopsis !== initialValueRef.current) initialValueRef.current = synopsis;
            if (synopsis === initialValueRef.current && synopsis.replace(/[\r\n\s]/g, '').length >= 10) hasEditedRef.current = true;
            return;
        }

        if (synopsis.replace(/[\r\n\s]/g, '').length < 10) return;

        timerRef.current = setTimeout(generate, DEBOUNCE_MS);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [synopsis]);

    const tabStyle = (active: boolean): React.CSSProperties => ({
        padding: '0.375rem 0.75rem',
        fontSize: '0.8125rem',
        fontWeight: active ? 600 : 400,
        backgroundColor: active ? 'var(--color-surface)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        borderBottom: active ? '1px solid var(--color-surface)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        cursor: 'pointer',
        marginBottom: '-1px',
        transition: 'all 0.15s',
    });

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            {/* Tab bar + generate button + legend */}
            <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setPerspective('story')} style={tabStyle(perspective === 'story')}>
                    <MessageSquare size={14} style={{ color: '#6366f1', verticalAlign: 'text-bottom', marginRight: '0.375rem' }} />
                    ストーリー分析
                </button>
                <button type="button" onClick={() => setPerspective('market')} style={tabStyle(perspective === 'market')}>
                    <Lightbulb size={14} style={{ color: '#f59e0b', verticalAlign: 'text-bottom', marginRight: '0.375rem' }} />
                    プロデューサー視点
                </button>
                <div style={{ marginLeft: 'auto', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeComment !== DEFAULT_MSG && !activeLoading && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>追加</span>
                            {' / '}
                            <span style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'line-through' }}>削除</span>
                        </span>
                    )}
                    <select
                        value={aiProvider}
                        onChange={(e) => setAiProvider(e.target.value as AiProvider)}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--color-surface)', color: 'var(--text-primary)' }}
                    >
                        <option value="gemini">Gemini</option>
                        <option value="claude">Claude</option>
                    </select>
                    <button type="button" onClick={generate} disabled={isLoading || synopsis.replace(/[\r\n\s]/g, '').length < 10} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}>
                        {isLoading ? '生成中...' : 'AI分析'}
                    </button>
                </div>
            </div>

            {/* Vertical writing content panel */}
            <div className="vertical-editor-container" style={{ borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                <div className="vertical-editor-scroll-area">
                    <div
                        className="vertical-editor"
                        style={{
                            minWidth: '100%',
                            width: 'fit-content',
                            height: `calc(${charsPerColumn}em + var(--space-lg) * 2)`,
                            cursor: 'default',
                            opacity: activeLoading ? 0.5 : 1,
                            transition: 'opacity 0.3s',
                        }}
                    >
                        {renderRevision(activeComment)}
                    </div>
                </div>
            </div>
        </div>
    );
}
