import { useState, type ReactElement } from 'react';
import { X } from 'lucide-react';
import type { Correction } from '../../lib/firebase/firestoreService';

interface CorrectionDialogProps {
  selectedText: string;
  field: Correction['field'];
  onSubmit: (data: {
    correctionType: Correction['correctionType'];
    suggestedText: string | null;
    explanation: string;
  }) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<Correction['correctionType'], string> = {
  replace: '置換',
  delete: '削除',
  insert: '挿入',
  comment_only: 'コメントのみ',
};

export function CorrectionDialog({
  selectedText,
  field: _field,
  onSubmit,
  onClose,
}: CorrectionDialogProps): ReactElement {
  const [correctionType, setCorrectionType] = useState<Correction['correctionType']>('replace');
  const [suggestedText, setSuggestedText] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleSubmit = () => {
    if (!explanation.trim()) return;
    onSubmit({
      correctionType,
      suggestedText:
        correctionType === 'comment_only' || correctionType === 'delete'
          ? null
          : suggestedText || null,
      explanation: explanation.trim(),
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            添削を追加
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '0.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 選択テキスト */}
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '0.25rem',
            }}
          >
            選択テキスト
          </span>
          <span
            style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}
          >
            {selectedText}
          </span>
        </div>

        {/* 種類 */}
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
            種類
          </label>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {(Object.keys(TYPE_LABELS) as Correction['correctionType'][]).map((t) => (
              <button
                key={t}
                onClick={() => setCorrectionType(t)}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  backgroundColor: correctionType === t ? 'var(--text-primary)' : 'transparent',
                  color: correctionType === t ? 'var(--color-surface)' : 'var(--text-secondary)',
                  fontWeight: correctionType === t ? 600 : 400,
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 修正案 */}
        {(correctionType === 'replace' || correctionType === 'insert') && (
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
              修正案
            </label>
            <textarea
              value={suggestedText}
              onChange={(e) => setSuggestedText(e.target.value)}
              rows={2}
              placeholder="修正後のテキスト..."
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
        )}

        {/* 説明 */}
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
            説明 *
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
            placeholder="なぜこの修正が必要か..."
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

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!explanation.trim()}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              border: 'none',
              opacity: !explanation.trim() ? 0.5 : 1,
            }}
          >
            添削を追加
          </button>
        </div>
      </div>
    </div>
  );
}
