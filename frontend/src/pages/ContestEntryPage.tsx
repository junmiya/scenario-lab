import { useEffect, useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth, useUserRole } from '../contexts/AuthContext';
import {
    getContest, getContestEntry, getEvaluation, saveEvaluation, listEvaluations, updateContest,
    type Contest, type ContestEntry, type Evaluation, type ScoringCriterion,
} from '../lib/firebase/firestoreService';
import { ArrowLeft, Star, Send } from 'lucide-react';

export function ContestEntryPage(): ReactElement {
    const { contestId, entryId } = useParams<{ contestId: string; entryId: string }>();
    const { user } = useAuth();
    const role = useUserRole();
    const navigate = useNavigate();

    const [contest, setContest] = useState<Contest | null>(null);
    const [entry, setEntry] = useState<ContestEntry | null>(null);
    const [loading, setLoading] = useState(true);

    // 評価
    const [myEvaluation, setMyEvaluation] = useState<Evaluation | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);

    const isEvaluator = role === 'evaluator';
    const canJudge = isEvaluator && contest?.status === 'judging';

    useEffect(() => {
        if (!contestId || !entryId) return;
        void loadData();
    }, [contestId, entryId]);

    const loadData = async () => {
        if (!contestId || !entryId || !user) return;
        setLoading(true);
        try {
            const [c, e] = await Promise.all([getContest(contestId), getContestEntry(contestId, entryId)]);
            setContest(c);
            setEntry(e);
            if (c && isEvaluator) {
                const ev = await getEvaluation(contestId, entryId, user.uid);
                if (ev) {
                    setMyEvaluation(ev);
                    const scoreMap: Record<string, number> = {};
                    ev.scores.forEach((s) => { scoreMap[s.criterionId] = s.score; });
                    setScores(scoreMap);
                    setFeedback(ev.feedback);
                }
            }
            // Load all evaluations for operators/admins
            if (role === 'operator' || role === 'system_admin') {
                const evals = await listEvaluations(contestId, entryId);
                setAllEvaluations(evals);
            }
        } catch (error) {
            console.error('Failed to load:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvaluation = async () => {
        if (!contestId || !entryId || !user || !contest) return;
        setSaving(true);
        try {
            const scoreEntries = contest.scoringCriteria.map((c) => ({
                criterionId: c.id,
                score: scores[c.id] ?? 0,
            }));
            const totalScore = scoreEntries.reduce((sum, s) => {
                const criterion = contest.scoringCriteria.find((c) => c.id === s.criterionId);
                return sum + s.score * (criterion?.weight ?? 1);
            }, 0);

            const evaluation: Evaluation = {
                evaluatorId: user.uid,
                evaluatorName: user.displayName || 'Evaluator',
                scores: scoreEntries,
                totalScore,
                feedback: feedback.trim(),
            };
            await saveEvaluation(contestId, entryId, evaluation);
            setMyEvaluation(evaluation);
        } catch (error) {
            console.error('Failed to save evaluation:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Layout headerTitle="エントリー"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div></Layout>;
    }
    if (!contest || !entry) {
        return <Layout headerTitle="エントリー"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>エントリーが見つかりません。</div></Layout>;
    }

    const snap = entry.scriptSnapshot;

    return (
        <Layout
            headerTitle={snap.title}
            headerActions={
                <button onClick={() => navigate(`/contests/${contestId}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <ArrowLeft size={16} /> 戻る
                </button>
            }
        >
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{snap.title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{snap.authorName}</p>

                {/* スコア表示（結果発表時） */}
                {contest.status === 'published' && entry.totalScore != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-lg)', border: '1px solid #fbbf24' }}>
                        <Star size={24} style={{ color: '#d97706' }} />
                        <div>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706' }}>{entry.totalScore.toFixed(1)}点</span>
                            {entry.rank != null && <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginLeft: '0.75rem' }}>第{entry.rank}位</span>}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {/* 左: 脚本 */}
                    <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                        {snap.synopsis && (
                            <section style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>あらすじ</h3>
                                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', maxHeight: '200px', overflowX: 'auto', fontSize: '0.9375rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{snap.synopsis}</div>
                            </section>
                        )}
                        <section style={{ padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>本文</h3>
                            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', maxHeight: '500px', overflowX: 'auto', fontSize: '0.9375rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{snap.content || '（本文なし）'}</div>
                        </section>
                    </div>

                    {/* 右: 採点 */}
                    <div style={{ flex: '0 0 35%' }}>
                        {canJudge && (
                            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>採点</h3>
                                {contest.scoringCriteria.map((c) => (
                                    <div key={c.id} style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            <span>{c.name}</span>
                                            <span>{scores[c.id] ?? 0} / {c.maxScore}</span>
                                        </label>
                                        <input
                                            type="range" min={0} max={c.maxScore} step={1}
                                            value={scores[c.id] ?? 0}
                                            onChange={(e) => setScores((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ))}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>フィードバック</label>
                                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="この作品への評価コメント..." style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>
                                <button
                                    onClick={() => void handleSaveEvaluation()}
                                    disabled={saving}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.375rem', width: '100%', justifyContent: 'center',
                                        padding: '0.625rem', backgroundColor: '#d97706', color: '#fff',
                                        borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem',
                                        cursor: 'pointer', border: 'none', opacity: saving ? 0.5 : 1,
                                    }}
                                >
                                    <Send size={16} /> {myEvaluation ? '更新' : '採点を送信'}
                                </button>
                                {myEvaluation && <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem', textAlign: 'center' }}>採点済み</p>}
                            </div>
                        )}

                        {/* 評価一覧（運営者向け） */}
                        {allEvaluations.length > 0 && (
                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>評価一覧 ({allEvaluations.length})</h3>
                                {allEvaluations.map((ev) => (
                                    <div key={ev.evaluatorId} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ev.evaluatorName}</span>
                                            <span style={{ fontWeight: 600, color: '#d97706' }}>{ev.totalScore.toFixed(1)}点</span>
                                        </div>
                                        {ev.feedback && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{ev.feedback}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
