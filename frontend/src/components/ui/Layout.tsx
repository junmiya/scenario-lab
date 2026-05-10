import { type ReactNode } from 'react';
import { useAuth, useUserRole } from '../../contexts/AuthContext';
import { useFeatureFlags } from '../../contexts/FeatureFlagsContext';
import { LogOut, FileText, Users, Shield, Trophy, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
    system_admin: '管理者',
    operator: '運営者',
    teacher: '先生',
    student: '生徒',
    evaluator: '評価者',
};

interface LayoutProps {
    children: ReactNode;
    headerTitle?: string | undefined;
    headerActions?: ReactNode | undefined;
}

export function Layout({ children, headerTitle, headerActions }: LayoutProps) {
    const { user, logout } = useAuth();
    const role = useUserRole();
    const flags = useFeatureFlags();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems: { path: string; label: string; icon: ReactNode; show: boolean }[] = [
        { path: '/catalog', label: 'マイ脚本', icon: <FileText size={16} />, show: true },
        { path: '/groups', label: 'グループ', icon: <Users size={16} />, show: flags.groups },
        { path: '/contests', label: 'コンテスト', icon: <Trophy size={16} />, show: flags.contests },
        { path: '/admin/users', label: '管理', icon: <Shield size={16} />, show: role === 'system_admin' },
        { path: '/release-notes', label: 'リリースノート', icon: <Sparkles size={16} />, show: true },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-secondary)' }}>
            <header style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexGrow: 1 }}>
                    <div
                        onClick={() => navigate('/catalog')}
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Scenario Lab
                    </div>

                    {/* ナビゲーション */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.5rem' }}>
                        {navItems.filter((n) => n.show).map((item) => {
                            const active = location.pathname.startsWith(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                                        padding: '0.375rem 0.75rem',
                                        backgroundColor: active ? 'var(--color-bg-secondary)' : 'transparent',
                                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none', fontSize: '0.8125rem', fontWeight: active ? 600 : 400,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    {/* spacer to push user info to the right */}
                    <div style={{ flex: 1 }} />
                </div>

                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {user.photoURL && (
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {user.displayName || 'ユーザー'}
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    {ROLE_LABELS[role] || role}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => void handleLogout()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <LogOut size={16} />
                            ログアウト
                        </button>
                    </div>
                )}
            </header>

            <main style={{ flexGrow: 1, padding: '2rem 1rem' }}>
                {(headerTitle || headerActions) && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        maxWidth: '900px', margin: '0 auto 1.5rem',
                        padding: '0 0.5rem',
                    }}>
                        {headerTitle && (
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {headerTitle}
                            </h1>
                        )}
                        {headerActions && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {headerActions}
                            </div>
                        )}
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
