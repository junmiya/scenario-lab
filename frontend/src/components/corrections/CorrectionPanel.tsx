import { type ReactElement } from 'react';
import type { Correction } from '../../lib/firebase/firestoreService';
import { Check, XIcon, MessageSquare } from 'lucide-react';

interface CorrectionPanelProps {
    corrections: Correction[];
    canReview: boolean; // true for student (can accept/reject)
    activeCorrectionId: string | null;
    onSelect: (id: string | null) => void;
    onUpdateStatus: (id: string, status: 'accepted' | 'rejected') => void;
}

const TYPE_LABELS: Record<string, string> = {
    replace: '置換',
    delete: '削除',
    insert: '挿入',
    comment_only: 'コメント',
};

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e', label: '未確認' },
    accepted: { bg: '#dcfce7', color: '#166534', label: '承認' },
    rejected: { bg: '#fce7e7', color: '#991b1b', label: '却下' },
};

const DEFAULT_STATUS = { bg: '#fef3c7', color: '#92400e', label: '未確認' };

export function CorrectionPanel({ corrections, canReview, activeCorrectionId, onSelect, onUpdateStatus }: CorrectionPanelProps): ReactElement {
    if (corrections.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                添削はまだありません。
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {corrections.map((c) => {
                const isActive = activeCorrectionId === c.id;
                const statusInfo = STATUS_COLORS[c.status] ?? DEFAULT_STATUS;
                return (
                    <div
                        key={c.id}
                        onClick={() => onSelect(isActive ? null : c.id)}
                        style={{
                            padding: '0.75rem', borderRadius: 'var(--radius-md)',
                            border: `2px solid ${isActive ? '#dc2626' : 'var(--border)'}`,
                            backgroundColor: isActive ? '#fef2f2' : 'var(--color-surface)',
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 500 }}>
                                {TYPE_LABELS[c.correctionType] || c.correctionType}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)', backgroundColor: statusInfo.bg, color: statusInfo.color, fontWeight: 500 }}>
                                {statusInfo.label}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                                {c.teacherName}
                            </span>
                        </div>

                        {/* 元テキスト */}
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textDecoration: 'line-through', marginBottom: '0.25rem' }}>
                            {c.originalText}
                        </div>

                        {/* 修正案 */}
                        {c.suggestedText && (
                            <div style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 500, marginBottom: '0.25rem' }}>
                                → {c.suggestedText}
                            </div>
                        )}

                        {/* 説明 */}
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                            <MessageSquare size={14} style={{ flexShrink: 0, marginTop: '0.125rem', color: 'var(--text-secondary)' }} />
                            <span style={{ whiteSpace: 'pre-wrap' }}>{c.explanation}</span>
                        </div>

                        {/* 承認/却下ボタン（生徒用、pending の場合のみ） */}
                        {canReview && c.status === 'pending' && isActive && (
                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => onUpdateStatus(c.id, 'accepted')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.375rem 0.75rem', backgroundColor: '#16a34a', color: '#fff',
                                        borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.75rem',
                                        cursor: 'pointer', border: 'none',
                                    }}
                                >
                                    <Check size={14} /> 承認
                                </button>
                                <button
                                    onClick={() => onUpdateStatus(c.id, 'rejected')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.375rem 0.75rem', backgroundColor: '#dc2626', color: '#fff',
                                        borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.75rem',
                                        cursor: 'pointer', border: 'none',
                                    }}
                                >
                                    <XIcon size={14} /> 却下
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
