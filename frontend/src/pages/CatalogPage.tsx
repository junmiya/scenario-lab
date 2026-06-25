import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/ui/Layout';
import {
  listScripts,
  createScript,
  deleteScript,
  resolveScriptContentType,
  type ContentType,
  type FirestoreScript,
} from '../lib/firebase/firestoreService';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';
import { Plus, FileText, Trash2, Clock, Send } from 'lucide-react';
import { SubmitToGroupDialog } from '../components/groups/SubmitToGroupDialog';

export function CatalogPage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const flags = useFeatureFlags();
  const [scripts, setScripts] = useState<FirestoreScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<{ id: string; title: string } | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);

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

  const handleCreate = async (contentType: ContentType = 'screenplay') => {
    if (!user) return;
    setCreating(true);
    setShowModeModal(false);
    try {
      const newId = await createScript(user.uid, {
        title: contentType === 'novel' ? '新しい小説' : '新しい脚本',
        authorName: user.displayName || '',
        settings: { lineLength: 20, pageCount: 10 },
        contentType,
      });
      navigate(`/editor/${newId}`);
    } catch (error) {
      console.error('Failed to create work:', error);
    } finally {
      setCreating(false);
    }
  };

  // Novel mode on → ask which mode; off → keep legacy single-click screenplay create.
  const onNewClick = (): void => {
    if (flags.novelMode) {
      setShowModeModal(true);
    } else {
      void handleCreate('screenplay');
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

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return '';
    const ts = timestamp as { toDate?: () => Date };
    const date = ts.toDate ? ts.toDate() : new Date(timestamp as string | number);
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              マイ作品
            </h1>
            <p
              style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}
            >
              作品を選択して編集するか、新しい作品を作成してください。
            </p>
          </div>
          <button
            onClick={onNewClick}
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
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              まだ作品がありません
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              「新規作成」ボタンをクリックして、最初の作品を書き始めましょう。
            </p>
          </div>
        )}

        {/* Script Cards Grid */}
        {!loading && scripts.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexGrow: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '0.0625rem 0.375rem',
                        marginRight: '0.375rem',
                        borderRadius: 'var(--radius-sm)',
                        verticalAlign: 'middle',
                        backgroundColor:
                          resolveScriptContentType(script.contentType) === 'novel'
                            ? 'var(--color-primary-light, #dbeafe)'
                            : 'var(--color-surface-alt, #f1f5f9)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {resolveScriptContentType(script.contentType) === 'novel' ? '小説' : '脚本'}
                    </span>
                    {script.title || '(無題)'}
                  </h3>
                  <div
                    style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, marginLeft: '0.5rem' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmitTarget({ id: script.id, title: script.title });
                      }}
                      style={{
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                      title="グループに提出"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={(e) => void handleDelete(script.id, e)}
                      style={{
                        padding: '0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    margin: '0.5rem 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {script.authorName || '著者未設定'}
                </p>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Clock size={12} />
                  {formatDate(script.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        {/* 提出ダイアログ */}
        {submitTarget && (
          <SubmitToGroupDialog
            scriptId={submitTarget.id}
            scriptTitle={submitTarget.title}
            onClose={() => setSubmitTarget(null)}
            onSubmitted={() => setSubmitTarget(null)}
          />
        )}

        {/* モード選択モーダル（脚本／小説） */}
        {showModeModal && (
          <div
            role="dialog"
            aria-label="作品タイプの選択"
            onClick={() => setShowModeModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                width: 'min(420px, 90vw)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>新しい作品を作成</h3>
              <p
                style={{
                  margin: '0 0 1rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                作品タイプを選択してください。作成後は変更できません。
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => void handleCreate('screenplay')}
                  disabled={creating}
                  style={modeButtonStyle}
                >
                  <FileText size={24} />
                  <span style={{ fontWeight: 600 }}>脚本</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    柱・ト書き・セリフ／縦書き
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreate('novel')}
                  disabled={creating}
                  style={modeButtonStyle}
                >
                  <FileText size={24} />
                  <span style={{ fontWeight: 600 }}>小説</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    章立て・設定資料／縦書き
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowModeModal(false)}
                style={{
                  marginTop: '1rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const modeButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '1.25rem 1rem',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg-primary, #fff)',
  cursor: 'pointer',
};
