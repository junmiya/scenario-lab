import { useEffect, useState, type ReactElement } from 'react';
import { listVersions, type ScriptVersion } from '../../lib/firebase/firestoreService';
import { History, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface VersionHistoryProps {
    scriptId: string;
    onRestore: (version: ScriptVersion) => void;
    refreshKey?: number; // increment to trigger reload
}

export function VersionHistory({ scriptId, onRestore, refreshKey }: VersionHistoryProps): ReactElement {
    const [versions, setVersions] = useState<ScriptVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!scriptId || !open) return;
        void loadVersions();
    }, [scriptId, open, refreshKey]);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const result = await listVersions(scriptId);
            setVersions(result);
        } catch (error) {
            console.error('Failed to load versions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: unknown): string => {
        if (!timestamp) return '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const date = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as string);
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const handleRestore = (v: ScriptVersion) => {
        if (!confirm(`${formatDate(v.savedAt)} のバージョンに復元しますか？\n（保存はされません。内容を確認してから保存してください）`)) return;
        onRestore(v);
    };

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 0.75rem', backgroundColor: 'transparent',
                    color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', fontSize: '0.8125rem',
                    cursor: 'pointer',
                }}
            >
                <History size={14} />
                履歴
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: '0.5rem',
                    width: '280px', backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 20,
                }}>
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>バージョン履歴</span>
                    </div>
                    {loading && <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>読み込み中...</div>}
                    {!loading && versions.length === 0 && (
                        <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>まだ保存履歴はありません。</div>
                    )}
                    {!loading && versions.map((v, i) => (
                        <div key={v.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)',
                        }}>
                            <div>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                                    {formatDate(v.savedAt)}
                                </span>
                                {i === 0 && <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginLeft: '0.375rem' }}>(最新)</span>}
                            </div>
                            <button
                                onClick={() => handleRestore(v)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.25rem 0.5rem', backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)', fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                                title="復元"
                            >
                                <RotateCcw size={12} /> 復元
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
