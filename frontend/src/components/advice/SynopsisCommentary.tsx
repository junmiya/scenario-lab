import { useEffect, useRef, useState, type ReactElement } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageSquare, Lightbulb } from 'lucide-react';

interface SynopsisCommentaryProps {
    synopsis: string;
}

const DEBOUNCE_MS = 2000; // Wait 2 seconds after typing stops

const STORY_PROMPT = `あなたはプロの脚本家・ストーリーテラーです。
以下のあらすじについて、物語としての完成度を分析し、具体的な修正ポイントをアドバイスしてください。

分析ポイント:
- 起承転結の流れは明確か
- 主人公の目的・葛藤は伝わるか
- 読者を惹きつける要素はあるか

出力形式:
まず現状の評価を1〜2行で述べ、その後「修正ポイント:」として具体的な改善案を2〜3点挙げてください。
改善案は「〜を〜に変更する」「〜を追加する」など、執筆者がすぐ行動できる具体的な提案にしてください。
全体で5〜8行程度にまとめてください。
執筆中の場合もその時点での印象と、次に書くべき方向性を提案してください。`;

const MARKET_PROMPT = `あなたは映画・ドラマのプロデューサーです。
以下のあらすじについて、商業的な観点から分析し、具体的な修正ポイントをアドバイスしてください。

分析ポイント:
- ターゲット層は明確か
- 既存作品との差別化ポイントはあるか
- 映像化した際のインパクトはあるか

出力形式:
まず現状の評価を1〜2行で述べ、その後「修正ポイント:」として具体的な改善案を2〜3点挙げてください。
改善案は「〜のシーンを加える」「〜の設定を際立たせる」など、執筆者がすぐ行動できる具体的な提案にしてください。
全体で5〜8行程度にまとめてください。
執筆中の場合もその時点での印象と、企画として強化すべき方向性を提案してください。`;

async function callGemini(systemPrompt: string, synopsis: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return 'APIキーが未設定です。';
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `【あらすじ】\n${synopsis}` }] }],
        systemInstruction: { role: 'model', parts: [{ text: systemPrompt }] },
    });

    return result.response.text();
}

export function SynopsisCommentary({ synopsis }: SynopsisCommentaryProps): ReactElement {
    const [storyComment, setStoryComment] = useState('あらすじを入力すると、AIが自動でコメントします...');
    const [marketComment, setMarketComment] = useState('あらすじを入力すると、AIが自動でコメントします...');
    const [storyLoading, setStoryLoading] = useState(false);
    const [marketLoading, setMarketLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortRef = useRef(0);

    useEffect(() => {
        // Clear previous debounce timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Don't trigger for empty or very short text
        if (synopsis.replace(/[\r\n\s]/g, '').length < 10) {
            setStoryComment('あらすじを入力すると、AIが自動でコメントします...');
            setMarketComment('あらすじを入力すると、AIが自動でコメントします...');
            return;
        }

        // Debounce: wait for user to stop typing
        timerRef.current = setTimeout(() => {
            const currentGeneration = ++abortRef.current;

            // Story perspective
            setStoryLoading(true);
            void callGemini(STORY_PROMPT, synopsis)
                .then((result) => {
                    if (abortRef.current === currentGeneration) {
                        setStoryComment(result);
                    }
                })
                .catch((err) => {
                    if (abortRef.current === currentGeneration) {
                        setStoryComment(`エラー: ${err instanceof Error ? err.message : String(err)}`);
                    }
                })
                .finally(() => {
                    if (abortRef.current === currentGeneration) {
                        setStoryLoading(false);
                    }
                });

            // Market perspective
            setMarketLoading(true);
            void callGemini(MARKET_PROMPT, synopsis)
                .then((result) => {
                    if (abortRef.current === currentGeneration) {
                        setMarketComment(result);
                    }
                })
                .catch((err) => {
                    if (abortRef.current === currentGeneration) {
                        setMarketComment(`エラー: ${err instanceof Error ? err.message : String(err)}`);
                    }
                })
                .finally(() => {
                    if (abortRef.current === currentGeneration) {
                        setMarketLoading(false);
                    }
                });
        }, DEBOUNCE_MS);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [synopsis]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            {/* Story Perspective */}
            <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <MessageSquare size={16} style={{ color: '#6366f1' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ストーリー分析
                    </span>
                    {storyLoading && (
                        <span style={{ fontSize: '0.75rem', color: '#6366f1', marginLeft: 'auto' }}>生成中...</span>
                    )}
                </div>
                <p style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    opacity: storyLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                }}>
                    {storyComment}
                </p>
            </div>

            {/* Market Perspective */}
            <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Lightbulb size={16} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        プロデューサー視点
                    </span>
                    {marketLoading && (
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: 'auto' }}>生成中...</span>
                    )}
                </div>
                <p style={{
                    fontSize: '0.8125rem',
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    opacity: marketLoading ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                }}>
                    {marketComment}
                </p>
            </div>
        </div>
    );
}
