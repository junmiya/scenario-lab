import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth } from '../contexts/AuthContext';
import { createContest, type ScoringCriterion } from '../lib/firebase/firestoreService';
import { Plus, Trash2 } from 'lucide-react';

const DEFAULT_CRITERIA: ScoringCriterion[] = [
  { id: '1', name: 'ストーリー', maxScore: 10, weight: 1 },
  { id: '2', name: 'キャラクター', maxScore: 10, weight: 1 },
  { id: '3', name: '構成', maxScore: 10, weight: 1 },
];

export function ContestCreatePage(): ReactElement {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<ScoringCriterion[]>(DEFAULT_CRITERIA);
  const [creating, setCreating] = useState(false);

  const addCriterion = () => {
    setCriteria((prev) => [...prev, { id: String(Date.now()), name: '', maxScore: 10, weight: 1 }]);
  };

  const updateCriterion = (id: string, field: string, value: string | number) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    try {
      const id = await createContest({
        name: name.trim(),
        description: description.trim(),
        createdBy: user.uid,
        status: 'draft',
        submissionDeadline: null,
        judgingDeadline: null,
        scoringCriteria: criteria.filter((c) => c.name.trim()),
      });
      navigate(`/contests/${id}`);
    } catch (error) {
      console.error('Failed to create contest:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout headerTitle="コンテスト作成">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 1.5rem',
          }}
        >
          新しいコンテスト
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label>
            <span
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
              }}
            >
              コンテスト名 *
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 第1回脚本コンテスト"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </label>

          <label>
            <span
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem',
              }}
            >
              説明
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="コンテストの概要..."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </label>

          {/* 採点基準 */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}
              >
                採点基準
              </span>
              <button
                onClick={addCriterion}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <Plus size={14} /> 追加
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {criteria.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    value={c.name}
                    onChange={(e) => updateCriterion(c.id, 'name', e.target.value)}
                    placeholder="基準名"
                    style={{
                      flex: 1,
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={c.maxScore}
                    onChange={(e) => updateCriterion(c.id, 'maxScore', Number(e.target.value))}
                    style={{
                      width: '4rem',
                      padding: '0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>点</span>
                  <button
                    onClick={() => removeCriterion(c.id)}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => void handleCreate()}
              disabled={creating || !name.trim()}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                border: 'none',
                opacity: creating || !name.trim() ? 0.5 : 1,
              }}
            >
              作成
            </button>
            <button
              onClick={() => navigate('/contests')}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
