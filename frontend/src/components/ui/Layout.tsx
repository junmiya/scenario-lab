import { type ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
    children: ReactNode;
    headerTitle?: string | undefined;
    headerActions?: ReactNode | undefined;
}

export function Layout({ children, headerTitle, headerActions }: LayoutProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

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
                    {headerTitle && (
                        <span style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            borderLeft: '1px solid var(--border)',
                            paddingLeft: '1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {headerTitle}
                        </span>
                    )}
                    {headerActions && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                            {headerActions}
                        </div>
                    )}
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
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                {user.displayName || 'ユーザー'}
                            </span>
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
                {children}
            </main>
        </div>
    );
}
