import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth } from '../contexts/AuthContext';
import {
  listUsers,
  updateUserRole,
  getFeatureFlags,
  updateFeatureFlags,
  getAdminStats,
  listAllGroups,
  deleteGroup,
  type FeatureFlags,
  type AdminStats,
  type FirestoreGroup,
} from '../lib/firebase/firestoreService';
import type { UserProfile, UserRole } from '../lib/firebase/authService';
import {
  Shield,
  ToggleLeft,
  ToggleRight,
  Users,
  FileText,
  Layers,
  Send,
  Trash2,
} from 'lucide-react';

type AdminTab = 'dashboard' | 'users' | 'groups';

const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'システム管理者',
  operator: '運営者',
  teacher: '先生',
  student: '生徒',
  evaluator: '評価者',
};

const ROLE_OPTIONS: UserRole[] = ['system_admin', 'operator', 'teacher', 'student', 'evaluator'];

function formatDate(ts: unknown): string {
  if (!ts) return '—';
  const timestamp = ts as { toDate?: () => Date };
  const d = timestamp.toDate ? timestamp.toDate() : new Date(ts as string | number);
  return d.toLocaleDateString('ja-JP');
}

/** 白背景のカードパネル */
function Card({ title, children }: { title: string; children: React.ReactNode }): ReactElement {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </div>
  );
}

// ────────────────────────────────────────
// ダッシュボードタブ
// ────────────────────────────────────────

function DashboardTab({
  stats,
  flags,
  onToggleFlag,
  flagsSaving,
}: {
  stats: AdminStats | null;
  flags: FeatureFlags | null;
  onToggleFlag: (key: keyof FeatureFlags) => void;
  flagsSaving: boolean;
}): ReactElement {
  const FLAG_LABELS: Record<keyof FeatureFlags, string> = {
    groups: 'グループ機能',
    contests: 'コンテスト機能',
    corrections: '添削機能',
    comments: 'コメント機能',
    aiAdvice: 'AIアドバイス',
    aiDiscussion: 'AI採点者議論',
  };

  const statItems = [
    {
      icon: <Users size={20} />,
      value: stats?.userCount,
      label: 'ユーザー',
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      icon: <FileText size={20} />,
      value: stats?.scriptCount,
      label: '脚本',
      color: '#8b5cf6',
      bg: '#f5f3ff',
    },
    {
      icon: <Layers size={20} />,
      value: stats?.groupCount,
      label: 'グループ',
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      icon: <Send size={20} />,
      value: stats?.submissionCount,
      label: '提出',
      color: '#10b981',
      bg: '#ecfdf5',
    },
  ];

  return (
    <div>
      {/* 統計カード */}
      <Card title="利用状況">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
          }}
        >
          {statItems.map(({ icon, value, label, color, bg }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '10px',
                backgroundColor: bg,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '10px',
                  backgroundColor: color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1,
                  }}
                >
                  {value ?? '—'}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem',
                  }}
                >
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ロール別内訳 */}
      {stats && (
        <Card title="ロール別ユーザー">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {ROLE_OPTIONS.map((role) => (
              <div
                key={role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  fontSize: '0.8125rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{ROLE_LABELS[role]}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '10px',
                    padding: '0.125rem 0.5rem',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  {stats.roleBreakdown[role] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 機能ON/OFF */}
      <Card title="機能ON/OFF">
        <div>
          {flags &&
            (Object.keys(FLAG_LABELS) as (keyof FeatureFlags)[]).map((key) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  {FLAG_LABELS[key]}
                </span>
                <button
                  onClick={() => onToggleFlag(key)}
                  disabled={flagsSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.25rem 0.625rem',
                    backgroundColor: flags[key] ? '#16a34a' : '#d1d5db',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {flags[key] ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  {flags[key] ? 'ON' : 'OFF'}
                </button>
              </div>
            ))}
          {!flags && (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              読み込み中...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────
// ユーザー管理タブ
// ────────────────────────────────────────

function UsersTab({
  users,
  loading,
  currentUid: _currentUid,
  onRoleChange,
  updatingUid,
}: {
  users: UserProfile[];
  loading: boolean;
  currentUid: string;
  onRoleChange: (uid: string, role: UserRole) => void;
  updatingUid: string | null;
}): ReactElement {
  const [filter, setFilter] = useState('');
  const filtered = filter
    ? users.filter(
        (u) =>
          (u.displayName ?? '').toLowerCase().includes(filter.toLowerCase()) ||
          (u.email ?? '').toLowerCase().includes(filter.toLowerCase()),
      )
    : users;

  return (
    <Card title={`ユーザー一覧（${users.length}件）`}>
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="名前またはメールで検索..."
          style={{
            width: '100%',
            maxWidth: '320px',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  ユーザー
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  メール
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  ロール
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.uid}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.photoURL ? (
                        <img
                          src={u.photoURL}
                          alt=""
                          style={{ width: 32, height: 32, borderRadius: '50%' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {(u.displayName ?? '?')[0]}
                        </div>
                      )}
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {u.displayName || '(未設定)'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-secondary)' }}>
                    {u.email || '—'}
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <select
                      value={u.role || 'student'}
                      onChange={(e) => onRoleChange(u.uid, e.target.value as UserRole)}
                      disabled={updatingUid === u.uid}
                      style={{
                        padding: '0.375rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
              }}
            >
              {filter ? '該当するユーザーがいません' : 'ユーザーがいません'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────
// グループ管理タブ
// ────────────────────────────────────────

function GroupsTab({
  groups,
  loading,
  onDelete,
  onNavigate,
}: {
  groups: FirestoreGroup[];
  loading: boolean;
  onDelete: (id: string, name: string) => void;
  onNavigate: (id: string) => void;
}): ReactElement {
  return (
    <Card title={`グループ一覧（${groups.length}件）`}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          読み込み中...
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          グループがありません
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  グループ名
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  メンバー
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem 0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  作成日
                </th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <button
                      onClick={() => onNavigate(g.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#3b82f6',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                      }}
                    >
                      {g.name}
                    </button>
                    {g.description && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.125rem',
                        }}
                      >
                        {g.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-secondary)' }}>
                    {g.memberCount ?? 0}人
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-secondary)' }}>
                    {formatDate(g.createdAt)}
                  </td>
                  <td style={{ padding: '0.625rem 0.5rem' }}>
                    <button
                      onClick={() => onDelete(g.id, g.name)}
                      title="削除"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.375rem',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ────────────────────────────────────────
// メインページ
// ────────────────────────────────────────

export function AdminUsersPage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [flagsSaving, setFlagsSaving] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [groups, setGroups] = useState<FirestoreGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    void loadStats();
    void loadFlags();
    void loadUsers();
    void loadGroups();
  }, []);

  const loadStats = async () => {
    try {
      setStats(await getAdminStats());
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };
  const loadFlags = async () => {
    try {
      setFlags(await getFeatureFlags());
    } catch (e) {
      console.error('Failed to load flags:', e);
    }
  };
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      setUsers(await listUsers());
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setUsersLoading(false);
    }
  };
  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      setGroups(await listAllGroups());
    } catch (e) {
      console.error('Failed to load groups:', e);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleToggleFlag = async (key: keyof FeatureFlags) => {
    if (!flags) return;
    const newFlags = { ...flags, [key]: !flags[key] };
    setFlags(newFlags);
    setFlagsSaving(true);
    try {
      await updateFeatureFlags({ [key]: newFlags[key] });
    } catch {
      setFlags(flags);
    } finally {
      setFlagsSaving(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    if (uid === user?.uid && newRole !== 'system_admin') {
      if (
        !confirm(
          '自分のロールを変更すると管理画面にアクセスできなくなる可能性があります。続けますか？',
        )
      )
        return;
    }
    setUpdatingUid(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error('Failed to update role:', e);
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`グループ「${name}」を削除しますか？この操作は元に戻せません。`)) return;
    try {
      await deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setStats((s) => (s ? { ...s, groupCount: s.groupCount - 1 } : s));
    } catch (e) {
      console.error('Failed to delete group:', e);
    }
  };

  const tabs: { key: AdminTab; label: string; icon: ReactElement }[] = [
    { key: 'dashboard', label: 'ダッシュボード', icon: <Shield size={16} /> },
    { key: 'users', label: 'ユーザー', icon: <Users size={16} /> },
    { key: 'groups', label: 'グループ', icon: <Layers size={16} /> },
  ];

  return (
    <Layout headerTitle="管理">
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* タブナビゲーション */}
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            marginBottom: '1.5rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '10px',
            padding: '0.25rem',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: tab === t.key ? 'var(--color-surface)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* タブコンテンツ */}
        {tab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            flags={flags}
            onToggleFlag={(k) => void handleToggleFlag(k)}
            flagsSaving={flagsSaving}
          />
        )}
        {tab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            currentUid={user?.uid ?? ''}
            onRoleChange={(uid, role) => void handleRoleChange(uid, role)}
            updatingUid={updatingUid}
          />
        )}
        {tab === 'groups' && (
          <GroupsTab
            groups={groups}
            loading={groupsLoading}
            onDelete={(id, name) => void handleDeleteGroup(id, name)}
            onNavigate={(id) => navigate(`/groups/${id}`)}
          />
        )}
      </div>
    </Layout>
  );
}
