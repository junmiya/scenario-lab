import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth, useUserRole } from '../contexts/AuthContext';
import { listMyGroups, createGroup, type FirestoreGroup } from '../lib/firebase/firestoreService';
import { Users, Plus, ChevronRight } from 'lucide-react';

export function GroupListPage(): ReactElement {
  const { user } = useAuth();
  const role = useUserRole();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<FirestoreGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canCreate = role === 'operator' || role === 'system_admin';
  console.log('[groups] role:', role, 'canCreate:', canCreate);

  useEffect(() => {
    if (!user) return;
    void loadGroups();
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await listMyGroups(user.uid);
      setGroups(result);
      if (result.length === 0) {
        setErrorMsg(`グループ0件（uid: ${user.uid.substring(0, 8)}...）`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMsg(`読み込みエラー: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    console.log('[groups] creating:', newName.trim());
    setCreating(true);
    try {
      const id = await createGroup(
        user.uid,
        newName.trim(),
        newDesc.trim(),
        user.displayName ?? undefined,
        user.email ?? undefined,
      );
      console.log('[groups] created:', id);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      navigate(`/groups/${id}`);
    } catch (error) {
      console.error('[groups] Failed to create:', error);
      alert(
        `グループ作成に失敗しました:\n${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout headerTitle="グループ">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
              グループ
            </h1>
            <p
              style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}
            >
              参加しているグループの一覧です。
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
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
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Plus size={18} />
              新規作成
            </button>
          )}
        </div>

        {/* グループ作成ダイアログ */}
        {showCreate && (
          <div
            style={{
              padding: '1.5rem',
              marginBottom: '1.5rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border)',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              新しいグループを作成
            </h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}
              >
                グループ名
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例: 脚本教室A"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.25rem',
                }}
              >
                説明（任意）
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  border: 'none',
                  opacity: creating || !newName.trim() ? 0.5 : 1,
                }}
              >
                作成
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewDesc('');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            読み込み中...
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Users size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              参加しているグループがありません
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {canCreate
                ? '「新規作成」ボタンでグループを作成できます。'
                : '運営者からグループに招待してもらってください。'}
            </p>
            {errorMsg && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {errorMsg}
              </p>
            )}
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    {g.name}
                  </h3>
                  {g.description && (
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                        margin: '0.25rem 0 0',
                      }}
                    >
                      {g.description}
                    </p>
                  )}
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      margin: '0.25rem 0 0',
                    }}
                  >
                    メンバー {g.memberCount ?? 0}人
                  </p>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
