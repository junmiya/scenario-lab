import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useUserRole } from '../contexts/AuthContext';
import { listContests, type Contest } from '../lib/firebase/firestoreService';
import { Trophy, Plus, ChevronRight } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: '下書き', bg: '#f3f4f6', color: '#374151' },
  open: { label: '募集中', bg: '#dbeafe', color: '#1e40af' },
  closed: { label: '締切', bg: '#fef3c7', color: '#92400e' },
  judging: { label: '審査中', bg: '#fce7f3', color: '#9d174d' },
  published: { label: '結果発表', bg: '#dcfce7', color: '#166534' },
};

export function ContestListPage(): ReactElement {
  const role = useUserRole();
  const navigate = useNavigate();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const canCreate = role === 'operator' || role === 'system_admin';

  useEffect(() => {
    void loadContests();
  }, []);

  const loadContests = async () => {
    setLoading(true);
    try {
      const result = await listContests();
      setContests(result);
    } catch (error) {
      console.error('Failed to load contests:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout headerTitle="コンテスト">
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
              コンテスト
            </h1>
            <p
              style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}
            >
              脚本コンテストの一覧です。
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => navigate('/contests/new')}
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
              <Plus size={18} /> 新規作成
            </button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            読み込み中...
          </div>
        )}

        {!loading && contests.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <Trophy size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              コンテストはまだありません
            </h3>
          </div>
        )}

        {!loading && contests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {contests.map((c) => {
              const si = STATUS_LABELS[c.status] ?? STATUS_LABELS['draft']!;
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/contests/${c.id}`)}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}
                      >
                        {c.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: si.bg,
                          color: si.color,
                          fontWeight: 500,
                        }}
                      >
                        {si.label}
                      </span>
                    </div>
                    {c.description && (
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--text-secondary)',
                          margin: '0.25rem 0 0',
                        }}
                      >
                        {c.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    size={20}
                    style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
