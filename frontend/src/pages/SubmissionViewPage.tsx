import { useEffect, useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { CommentThread } from '../components/comments/CommentThread';
import { useAuth } from '../contexts/AuthContext';
import { getSubmission, updateSubmissionStatus, type GroupSubmission } from '../lib/firebase/firestoreService';
import { ArrowLeft, CheckCircle, PenLine } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    submitted: '提出済み',
    in_review: 'レビュー中',
    reviewed: 'レビュー完了',
};

export function SubmissionViewPage(): ReactElement {
    const { groupId, submissionId } = useParams<{ groupId: string; submissionId: string }>();
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<GroupSubmission | null>(null);
    const [loading, setLoading] = useState(true);

    const isTeacherOrOperator = userProfile?.role === 'teacher' || userProfile?.role === 'operator' || userProfile?.role === 'system_admin';

    useEffect(() => {
        if (!groupId || !submissionId) return;
        void loadSubmission();
    }, [groupId, submissionId]);

    const loadSubmission = async () => {
        if (!groupId || !submissionId) return;
        setLoading(true);
        try {
            const s = await getSubmission(groupId, submissionId);
            setSubmission(s);
        } catch (error) {
            console.error('Failed to load submission:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReviewed = async () => {
        if (!groupId || !submissionId || !user) return;
        try {
            await updateSubmissionStatus(groupId, submissionId, 'reviewed', user.uid);
            setSubmission((prev) => prev ? { ...prev, status: 'reviewed' } : null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (loading) {
        return (
            <Layout headerTitle="提出物">
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div>
            </Layout>
        );
    }

    if (!submission) {
        return (
            <Layout headerTitle="提出物">
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>提出物が見つかりません。</div>
            </Layout>
        );
    }

    const snap = submission.scriptSnapshot;

    return (
        <Layout
            headerTitle={snap.title}
            headerActions={
                <button
                    onClick={() => navigate(`/groups/${groupId}`)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.75rem', backgroundColor: 'transparent',
                        color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer',
                    }}
                >
                    <ArrowLeft size={16} />
                    グループに戻る
                </button>
            }
        >
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {snap.title || '(無題)'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {snap.authorName} ・ {STATUS_LABELS[submission.status]}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => navigate(`/groups/${groupId}/submissions/${submissionId}/corrections`)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.375rem',
                                padding: '0.5rem 1rem', backgroundColor: '#dc2626',
                                color: '#fff', borderRadius: 'var(--radius-md)',
                                fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                            }}
                        >
                            <PenLine size={16} />
                            添削
                        </button>
                        {isTeacherOrOperator && submission.status !== 'reviewed' && (
                            <button
                                onClick={() => void handleMarkReviewed()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 1rem', backgroundColor: '#16a34a',
                                    color: '#fff', borderRadius: 'var(--radius-md)',
                                    fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                                }}
                            >
                                <CheckCircle size={16} />
                                レビュー完了
                            </button>
                        )}
                    </div>
                </div>

                {/* あらすじ */}
                {snap.synopsis && (
                    <section style={{
                        marginBottom: '1.5rem', padding: '1.25rem',
                        backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border)',
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>あらすじ</h2>
                        <div style={{
                            writingMode: 'vertical-rl', textOrientation: 'mixed',
                            maxHeight: '300px', overflowX: 'auto', overflowY: 'hidden',
                            padding: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.8,
                            color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                        }}>
                            {snap.synopsis}
                        </div>
                    </section>
                )}

                {/* 本文 */}
                <section style={{
                    marginBottom: '1.5rem', padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)',
                }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>本文</h2>
                    <div style={{
                        writingMode: 'vertical-rl', textOrientation: 'mixed',
                        maxHeight: '500px', overflowX: 'auto', overflowY: 'hidden',
                        padding: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.8,
                        color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                    }}>
                        {snap.content || '（本文なし）'}
                    </div>
                </section>

                {/* 登場人物 */}
                {snap.characterText && (
                    <section style={{
                        marginBottom: '1.5rem', padding: '1.25rem',
                        backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border)',
                    }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>登場人物</h2>
                        <div style={{
                            writingMode: 'vertical-rl', textOrientation: 'mixed',
                            maxHeight: '200px', overflowX: 'auto', overflowY: 'hidden',
                            padding: '0.5rem', fontSize: '0.9375rem', lineHeight: 1.8,
                            color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
                        }}>
                            {snap.characterText}
                        </div>
                    </section>
                )}

                {/* コメント */}
                <section style={{
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)',
                }}>
                    <CommentThread
                        scriptId={submission.scriptId}
                        submissionId={submissionId!}
                        groupId={groupId!}
                    />
                </section>
            </div>
        </Layout>
    );
}
