import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/ui/Layout';
import { listScripts, createScript, deleteScript, type FirestoreScript } from '../lib/firebase/firestoreService';
import { Plus, FileText, Trash2, Clock } from 'lucide-react';

export function CatalogPage(): ReactElement {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [scripts, setScripts] = useState<FirestoreScript[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!user) return;
        void loadScripts();
    }, [user]);

    const loadScripts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await listScripts(user.uid);
            setScripts(result);
        } catch (error) {
            console.error('Failed to load scripts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!user) return;
        setCreating(true);
        try {
            const newId = await createScript(user.uid, {
                title: '新しい脚本',
                authorName: user.displayName || '',
                settings: { lineLength: 20, pageCount: 10 },
            });
            navigate(`/editor/${newId}`);
        } catch (error) {
            console.error('Failed to create script:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (scriptId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!confirm('この脚本を削除しますか？')) return;
        try {
            await deleteScript(scriptId);
            setScripts((prev) => prev.filter((s) => s.id !== scriptId));
        } catch (error) {
            console.error('Failed to delete script:', error);
        }
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Layout>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            マイ脚本
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            作品を選択して編集するか、新しい脚本を作成してください。
                        </p>
                    </div>
                    <button
                        onClick={() => void handleCreate()}
                        disabled={creating}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.625rem 1.25rem',
                            backgroundColor: 'var(--text-primary)',
                            color: 'var(--color-surface)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            cursor: creating ? 'not-allowed' : 'pointer',
                            opacity: creating ? 0.6 : 1,
                            transition: 'all 0.2s',
                            border: 'none',
                        }}
                    >
                        <Plus size={18} />
                        新規作成
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                        読み込み中...
                    </div>
                )}

                {/* Empty State */}
                {!loading && scripts.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        border: '2px dashed var(--border)',
                        borderRadius: 'var(--radius-xl)',
                        backgroundColor: 'var(--color-surface)',
                    }}>
                        <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                            まだ脚本がありません
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            「新規作成」ボタンをクリックして、最初の脚本を書き始めましょう。
                        </p>
                    </div>
                )}

                {/* Script Cards Grid */}
                {!loading && scripts.length > 0 && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '1rem',
                    }}>
                        {scripts.map((script) => (
                            <div
                                key={script.id}
                                onClick={() => navigate(`/editor/${script.id}`)}
                                style={{
                                    padding: '1.25rem',
                                    borderRadius: 'var(--radius-xl)',
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                    e.currentTarget.style.borderColor = 'var(--text-secondary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        margin: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flexGrow: 1,
                                    }}>
                                        {script.title || '(無題)'}
                                    </h3>
                                    <button
                                        onClick={(e) => void handleDelete(script.id, e)}
                                        style={{
                                            padding: '0.25rem',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            marginLeft: '0.5rem',
                                        }}
                                        title="削除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p style={{
                                    fontSize: '0.8125rem',
                                    color: 'var(--text-secondary)',
                                    margin: '0.5rem 0',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {script.authorName || '著者未設定'}
                                </p>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                }}>
                                    <Clock size={12} />
                                    {formatDate(script.updatedAt)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
