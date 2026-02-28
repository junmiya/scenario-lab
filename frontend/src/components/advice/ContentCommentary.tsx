import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Clapperboard, Pen } from 'lucide-react';
import { callAi, type AiProvider } from '../../lib/aiClient';

interface ContentCommentaryProps {
    content: string;
    scriptId?: string;
}

const DEBOUNCE_MS = 2000;

const DIRECTOR_PROMPT = `あなたはプロの映画・ドラマ演出家です。
以下の脚本本文について、演出の観点から分析し、具体的な修正ポイントをアドバイスしてください。

分析ポイント:
- シーンの構成・テンポは適切か
- 映像として成立するト書きになっているか
- 場面転換の流れは自然か

出力形式:
まず現状の評価を1〜2行で述べ、その後「修正ポイント:」として具体的な改善案を2〜3点挙げてください。
改善案は「〜のシーンを〜に変更する」「〜の描写を追加する」など、執筆者がすぐ行動できる具体的な提案にしてください。
全体で5〜8行程度にまとめてください。
執筆中の場合もその時点での印象と、次に書くべき方向性を提案してください。`;

const SCRIPT_DOCTOR_PROMPT = `あなたはプロの脚本ドクター（スクリプトドクター）です。
以下の脚本本文について、脚本技術の観点から分析し、具体的な修正ポイントをアドバイスしてください。

分析ポイント:
- セリフは登場人物の個性を反映しているか
- 対話のテンポ・リズムは良いか
- ドラマチックな緊張感・感情の起伏はあるか

出力形式:
まず現状の評価を1〜2行で述べ、その後「修正ポイント:」として具体的な改善案を2〜3点挙げてください。
改善案は「〜のセリフを〜に修正する」「〜の場面に〜を加える」など、執筆者がすぐ行動できる具体的な提案にしてください。
全体で5〜8行程度にまとめてください。
執筆中の場合もその時点での印象と、次に書くべき方向性を提案してください。`;


const STORAGE_PREFIX = 'content-commentary-';
const DEFAULT_MSG = '本文を入力すると、AIが自動でコメントします...';

function loadCached(scriptId?: string): { director: string; doctor: string } {
    if (!scriptId) return { director: DEFAULT_MSG, doctor: DEFAULT_MSG };
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${scriptId}`);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { director: DEFAULT_MSG, doctor: DEFAULT_MSG };
}

function saveCached(scriptId: string | undefined, director: string, doctor: string) {
    if (!scriptId) return;
    localStorage.setItem(`${STORAGE_PREFIX}${scriptId}`, JSON.stringify({ director, doctor }));
}

export function ContentCommentary({ content, scriptId }: ContentCommentaryProps): ReactElement {
    const cached = useRef(loadCached(scriptId));
    const [directorComment, setDirectorComment] = useState(cached.current.director);
    const [doctorComment, setDoctorComment] = useState(cached.current.doctor);
    const [directorLoading, setDirectorLoading] = useState(false);
    const [doctorLoading, setDoctorLoading] = useState(false);
    const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef(0);
    const initialValueRef = useRef(content);
    const hasEditedRef = useRef(false);

    const isLoading = directorLoading || doctorLoading;

    // Persist comments to localStorage
    useEffect(() => {
        if (directorComment !== DEFAULT_MSG || doctorComment !== DEFAULT_MSG) {
            saveCached(scriptId, directorComment, doctorComment);
        }
    }, [directorComment, doctorComment, scriptId]);

    const generate = () => {
        if (content.replace(/[\r\n\s]/g, '').length < 10) return;
        const currentGeneration = ++abortRef.current;
        const userText = `脚本本文:\n${content}`;

        setDirectorLoading(true);
        void callAi(aiProvider, DIRECTOR_PROMPT, userText)
            .then((result) => { if (abortRef.current === currentGeneration) setDirectorComment(result); })
            .catch((err) => { if (abortRef.current === currentGeneration) setDirectorComment(`エラー: ${err instanceof Error ? err.message : String(err)}`); })
            .finally(() => { if (abortRef.current === currentGeneration) setDirectorLoading(false); });

        setDoctorLoading(true);
        void callAi(aiProvider, SCRIPT_DOCTOR_PROMPT, userText)
            .then((result) => { if (abortRef.current === currentGeneration) setDoctorComment(result); })
            .catch((err) => { if (abortRef.current === currentGeneration) setDoctorComment(`エラー: ${err instanceof Error ? err.message : String(err)}`); })
            .finally(() => { if (abortRef.current === currentGeneration) setDoctorLoading(false); });
    };

    // Auto-generate on user edits (debounced)
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        if (!hasEditedRef.current) {
            if (content !== initialValueRef.current) initialValueRef.current = content;
            if (content === initialValueRef.current && content.replace(/[\r\n\s]/g, '').length >= 10) hasEditedRef.current = true;
            return;
        }

        if (content.replace(/[\r\n\s]/g, '').length < 10) return;

        timerRef.current = setTimeout(generate, DEBOUNCE_MS);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [content]);

    return (
        <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem', gap: '0.5rem', alignItems: 'center' }}>
            <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as AiProvider)}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.375rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--color-surface)', color: 'var(--text-primary)' }}
            >
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
            </select>
            <button type="button" onClick={generate} disabled={isLoading || content.replace(/[\r\n\s]/g, '').length < 10} style={{ fontSize: '0.8125rem' }}>
                {isLoading ? '生成中...' : 'AIコメント生成'}
            </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Director Perspective */}
            <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Clapperboard size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        演出家視点
                    </span>
                    {directorLoading && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: 'auto' }}>生成中...</span>
                    )}
                </div>
                <p style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    opacity: directorLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                }}>
                    {directorComment}
                </p>
            </div>

            {/* Script Doctor Perspective */}
            <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Pen size={16} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        脚本ドクター視点
                    </span>
                    {doctorLoading && (
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: 'auto' }}>生成中...</span>
                    )}
                </div>
                <p style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    opacity: doctorLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                }}>
                    {doctorComment}
                </p>
            </div>
        </div>
        </div>
    );
}
