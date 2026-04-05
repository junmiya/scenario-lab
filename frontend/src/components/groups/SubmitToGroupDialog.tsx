import { useEffect, useState, type ReactElement } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listMyGroups, createSubmission, getScript, type FirestoreGroup } from '../../lib/firebase/firestoreService';
import { Send, X } from 'lucide-react';

interface SubmitToGroupDialogProps {
    scriptId: string;
    scriptTitle: string;
    onClose: () => void;
    onSubmitted: () => void;
}

export function SubmitToGroupDialog({ scriptId, scriptTitle, onClose, onSubmitted }: SubmitToGroupDialogProps): ReactElement {
    const { user } = useAuth();
    const [groups, setGroups] = useState<FirestoreGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        void loadGroups();
    }, [user]);

    const loadGroups = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await listMyGroups(user.uid);
            setGroups(result);
        } catch (err) {
            console.error('Failed to load groups:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!user || !selectedGroupId) return;
        setSubmitting(true);
        setError('');
        try {
            const script = await getScript(scriptId);
            if (!script) {
                setError('脚本が見つかりません。');
                return;
            }
            await createSubmission(selectedGroupId, scriptId, user.uid, script);
            onSubmitted();
        } catch (err) {
            console.error('Failed to submit:', err);
            setError('提出に失敗しました。');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
        }} onClick={onClose}>
            <div
                style={{
                    backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                    padding: '1.5rem', width: '100%', maxWidth: '420px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        グループに提出
                    </h3>
                    <button onClick={onClose} style={{ padding: '0.25rem', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                    「{scriptTitle}」を提出するグループを選択してください。
                </p>

                {loading ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>読み込み中...</p>
                ) : groups.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>参加しているグループがありません。</p>
                ) : (
                    <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        style={{
                            width: '100%', padding: '0.625rem 0.75rem',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box',
                        }}
                    >
                        <option value="">グループを選択</option>
                        {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>
                )}

                {error && <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>{error}</p>}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1rem', backgroundColor: 'transparent',
                            color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer',
                        }}
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => void handleSubmit()}
                        disabled={submitting || !selectedGroupId}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 1rem', backgroundColor: 'var(--text-primary)',
                            color: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                            fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                            opacity: submitting || !selectedGroupId ? 0.5 : 1,
                        }}
                    >
                        <Send size={14} />
                        提出
                    </button>
                </div>
            </div>
        </div>
    );
}
