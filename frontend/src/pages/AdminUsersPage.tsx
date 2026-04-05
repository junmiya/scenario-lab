import { useEffect, useState, type ReactElement } from 'react';
import { Layout } from '../components/ui/Layout';
import { useAuth } from '../contexts/AuthContext';
import { listUsers, updateUserRole, getFeatureFlags, updateFeatureFlags, type FeatureFlags } from '../lib/firebase/firestoreService';
import type { UserProfile, UserRole } from '../lib/firebase/authService';
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
    system_admin: 'システム管理者',
    operator: '運営者',
    teacher: '先生',
    student: '生徒',
    evaluator: '評価者',
};

const ROLE_OPTIONS: UserRole[] = ['system_admin', 'operator', 'teacher', 'student', 'evaluator'];

export function AdminUsersPage(): ReactElement {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUid, setUpdatingUid] = useState<string | null>(null);
    const [flags, setFlags] = useState<FeatureFlags | null>(null);
    const [flagsSaving, setFlagsSaving] = useState(false);

    useEffect(() => {
        void loadUsers();
        void loadFlags();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const result = await listUsers();
            setUsers(result);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadFlags = async () => {
        try {
            const result = await getFeatureFlags();
            setFlags(result);
        } catch (error) {
            console.error('Failed to load feature flags:', error);
        }
    };

    const handleToggleFlag = async (key: keyof FeatureFlags) => {
        if (!flags) return;
        const newFlags = { ...flags, [key]: !flags[key] };
        setFlags(newFlags);
        setFlagsSaving(true);
        try {
            await updateFeatureFlags({ [key]: newFlags[key] });
        } catch (error) {
            console.error('Failed to update flag:', error);
            setFlags(flags); // revert
        } finally {
            setFlagsSaving(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: UserRole) => {
        if (uid === user?.uid && newRole !== 'system_admin') {
            if (!confirm('自分のロールを変更すると管理画面にアクセスできなくなる可能性があります。続けますか？')) return;
        }
        setUpdatingUid(uid);
        try {
            await updateUserRole(uid, newRole);
            setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Failed to update role:', error);
        } finally {
            setUpdatingUid(null);
        }
    };

    const FLAG_LABELS: Record<keyof FeatureFlags, string> = {
        groups: 'グループ機能',
        contests: 'コンテスト機能',
        corrections: '添削機能',
        comments: 'コメント機能',
        aiAdvice: 'AIアドバイス',
        aiDiscussion: 'AI採点者議論',
    };

    return (
        <Layout headerTitle="管理">
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <Shield size={24} style={{ color: 'var(--text-primary)' }} />
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        管理
                    </h1>
                </div>

                {/* 機能ON/OFF */}
                <section style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>機能ON/OFF</h2>
                    <div style={{
                        backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border)', overflow: 'hidden',
                    }}>
                        {flags && (Object.keys(FLAG_LABELS) as (keyof FeatureFlags)[]).map((key) => (
                            <div key={key} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                            }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {FLAG_LABELS[key]}
                                </span>
                                <button
                                    onClick={() => void handleToggleFlag(key)}
                                    disabled={flagsSaving}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        padding: '0.25rem 0.5rem', backgroundColor: 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        color: flags[key] ? '#16a34a' : 'var(--text-secondary)',
                                        fontSize: '0.8125rem', fontWeight: 500,
                                    }}
                                >
                                    {flags[key] ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                    {flags[key] ? 'ON' : 'OFF'}
                                </button>
                            </div>
                        ))}
                        {!flags && <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>読み込み中...</div>}
                    </div>
                </section>

                {/* ユーザー管理 */}
                <section>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem' }}>ユーザー管理</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div>
                ) : (
                    <div style={{
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ユーザー</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>メール</th>
                                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ロール</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.uid} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {u.photoURL && (
                                                    <img src={u.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                                                )}
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {u.displayName || '(未設定)'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{u.email || '—'}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <select
                                                value={u.role || 'student'}
                                                onChange={(e) => void handleRoleChange(u.uid, e.target.value as UserRole)}
                                                disabled={updatingUid === u.uid}
                                                style={{
                                                    padding: '0.375rem 0.5rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--color-surface)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '0.8125rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </section>
            </div>
        </Layout>
    );
}
