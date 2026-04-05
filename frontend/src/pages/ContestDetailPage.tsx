import { useEffect, useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth, useUserRole } from '../contexts/AuthContext';
import {
    getContest, updateContest, listContestEntries, createContestEntry, getScript, listScripts,
    type Contest, type ContestEntry, type FirestoreScript,
} from '../lib/firebase/firestoreService';
import { Trophy, Send, ChevronRight, Clock, Settings } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    draft: '下書き', open: '募集中', closed: '締切', judging: '審査中', published: '結果発表',
};

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
    draft: { next: 'open', label: '募集開始' },
    open: { next: 'closed', label: '募集締切' },
    closed: { next: 'judging', label: '審査開始' },
    judging: { next: 'published', label: '結果公開' },
};

export function ContestDetailPage(): ReactElement {
    const { contestId } = useParams<{ contestId: string }>();
    const { user } = useAuth();
    const role = useUserRole();
    const navigate = useNavigate();

    const [contest, setContest] = useState<Contest | null>(null);
    const [entries, setEntries] = useState<ContestEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // 応募ダイアログ
    const [showSubmit, setShowSubmit] = useState(false);
    const [myScripts, setMyScripts] = useState<FirestoreScript[]>([]);
    const [selectedScriptId, setSelectedScriptId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isOwner = contest?.createdBy === user?.uid;
    const canManage = isOwner || role === 'system_admin';

    useEffect(() => {
        if (!contestId) return;
        void loadData();
    }, [contestId]);

    const loadData = async () => {
        if (!contestId) return;
        setLoading(true);
        try {
            const [c, e] = await Promise.all([getContest(contestId), listContestEntries(contestId)]);
            setContest(c);
            setEntries(e);
        } catch (error) {
            console.error('Failed to load:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async () => {
        if (!contestId || !contest) return;
        const flow = STATUS_FLOW[contest.status];
        if (!flow) return;
        try {
            await updateContest(contestId, { status: flow.next as Contest['status'] });
            setContest((prev) => prev ? { ...prev, status: flow.next as Contest['status'] } : null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleShowSubmit = async () => {
        if (!user) return;
        setShowSubmit(true);
        try {
            const scripts = await listScripts(user.uid);
            setMyScripts(scripts);
        } catch (error) {
            console.error('Failed to load scripts:', error);
        }
    };

    const handleSubmitEntry = async () => {
        if (!contestId || !user || !selectedScriptId) return;
        setSubmitting(true);
        try {
            const script = await getScript(selectedScriptId);
            if (!script) return;
            await createContestEntry(contestId, selectedScriptId, user.uid, script);
            setShowSubmit(false);
            setSelectedScriptId('');
            await loadData();
        } catch (error) {
            console.error('Failed to submit entry:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Layout headerTitle="コンテスト"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div></Layout>;
    }
    if (!contest) {
        return <Layout headerTitle="コンテスト"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>コンテストが見つかりません。</div></Layout>;
    }

    const sortedEntries = contest.status === 'published'
        ? [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        : entries;

    return (
        <Layout headerTitle={contest.name}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Trophy size={24} style={{ color: '#d97706' }} />
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{contest.name}</h1>
                        </div>
                        {contest.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{contest.description}</p>}
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            ステータス: {STATUS_LABELS[contest.status] || contest.status} ・ エントリー {entries.length}件
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {contest.status === 'open' && (
                            <button
                                onClick={() => void handleShowSubmit()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', backgroundColor: '#d97706', color: '#fff',
                                    borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8125rem',
                                    cursor: 'pointer', border: 'none',
                                }}
                            >
                                <Send size={16} /> 応募
                            </button>
                        )}
                        {canManage && STATUS_FLOW[contest.status] && (
                            <button
                                onClick={() => void handleStatusChange()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', backgroundColor: 'var(--text-primary)', color: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8125rem',
                                    cursor: 'pointer', border: 'none',
                                }}
                            >
                                <Settings size={16} /> {STATUS_FLOW[contest.status]!.label}
                            </button>
                        )}
                    </div>
                </div>

                {/* 採点基準 */}
                {contest.scoringCriteria.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>採点基準</h3>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {contest.scoringCriteria.map((c) => (
                                <span key={c.id} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    {c.name} ({c.maxScore}点)
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* エントリー一覧 */}
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>
                    エントリー ({entries.length})
                </h2>

                {entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '2px dashed var(--border)', borderRadius: 'var(--radius-xl)', backgroundColor: 'var(--color-surface)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>まだエントリーはありません。</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sortedEntries.map((e) => (
                            <div
                                key={e.id}
                                onClick={() => navigate(`/contests/${contestId}/entries/${e.id}`)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                                onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                                onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {contest.status === 'published' && e.rank != null && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                                                backgroundColor: e.rank === 1 ? '#fbbf24' : e.rank === 2 ? '#d1d5db' : e.rank === 3 ? '#d97706' : '#f3f4f6',
                                                color: e.rank <= 3 ? '#fff' : 'var(--text-secondary)',
                                                fontWeight: 700, fontSize: '0.75rem',
                                            }}>
                                                {e.rank}
                                            </span>
                                        )}
                                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{e.scriptTitle || '(無題)'}</h3>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{e.authorName}</span>
                                        {contest.status === 'published' && e.totalScore != null && (
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#d97706' }}>
                                                {e.totalScore.toFixed(1)}点
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* 応募ダイアログ */}
                {showSubmit && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowSubmit(false)}>
                        <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} onClick={(ev) => ev.stopPropagation()}>
                            <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>コンテストに応募</h3>
                            <select value={selectedScriptId} onChange={(ev) => setSelectedScriptId(ev.target.value)} style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box' }}>
                                <option value="">脚本を選択</option>
                                {myScripts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowSubmit(false)} style={{ padding: '0.5rem 1rem', backgroundColor: 'transparent', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer' }}>キャンセル</button>
                                <button onClick={() => void handleSubmitEntry()} disabled={submitting || !selectedScriptId} style={{ padding: '0.5rem 1rem', backgroundColor: '#d97706', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none', opacity: submitting || !selectedScriptId ? 0.5 : 1 }}>応募</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
