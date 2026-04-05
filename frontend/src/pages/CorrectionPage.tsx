import { useEffect, useState, useCallback, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { CorrectionEditor } from '../components/corrections/CorrectionEditor';
import { CorrectionPanel } from '../components/corrections/CorrectionPanel';
import { CorrectionDialog } from '../components/corrections/CorrectionDialog';
import { useAuth } from '../contexts/AuthContext';
import {
    getSubmission, listCorrections, createCorrection, updateCorrectionStatus,
    type GroupSubmission, type Correction,
} from '../lib/firebase/firestoreService';
import { ArrowLeft, PenLine } from 'lucide-react';

type FieldTab = 'content' | 'synopsis' | 'characterText';

const FIELD_LABELS: Record<FieldTab, string> = {
    content: '本文',
    synopsis: 'あらすじ',
    characterText: '登場人物',
};

export function CorrectionPage(): ReactElement {
    const { groupId, submissionId } = useParams<{ groupId: string; submissionId: string }>();
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<GroupSubmission | null>(null);
    const [corrections, setCorrections] = useState<Correction[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeField, setActiveField] = useState<FieldTab>('content');
    const [activeCorrectionId, setActiveCorrectionId] = useState<string | null>(null);

    // Dialog state
    const [dialogSelection, setDialogSelection] = useState<{
        startOffset: number; endOffset: number; text: string;
    } | null>(null);

    const isTeacher = userProfile?.role === 'teacher' || userProfile?.role === 'operator' || userProfile?.role === 'system_admin';
    const isStudent = submission?.submittedBy === user?.uid;

    useEffect(() => {
        if (!groupId || !submissionId) return;
        void loadData();
    }, [groupId, submissionId]);

    const loadData = async () => {
        if (!groupId || !submissionId) return;
        setLoading(true);
        try {
            const [s, c] = await Promise.all([
                getSubmission(groupId, submissionId),
                listCorrections(groupId, submissionId),
            ]);
            setSubmission(s);
            setCorrections(c);
        } catch (error) {
            console.error('Failed to load:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTextSelect = useCallback((sel: { startOffset: number; endOffset: number; text: string }) => {
        if (!isTeacher) return;
        setDialogSelection(sel);
    }, [isTeacher]);

    const handleCreateCorrection = async (data: {
        correctionType: Correction['correctionType'];
        suggestedText: string | null;
        explanation: string;
    }) => {
        if (!groupId || !submissionId || !user || !dialogSelection) return;
        try {
            await createCorrection(groupId, submissionId, {
                teacherId: user.uid,
                teacherName: user.displayName || 'Teacher',
                field: activeField,
                startOffset: dialogSelection.startOffset,
                endOffset: dialogSelection.endOffset,
                originalText: dialogSelection.text,
                correctionType: data.correctionType,
                suggestedText: data.suggestedText,
                explanation: data.explanation,
                status: 'pending',
            });
            setDialogSelection(null);
            await loadData();
        } catch (error) {
            console.error('Failed to create correction:', error);
        }
    };

    const handleUpdateStatus = async (correctionId: string, status: 'accepted' | 'rejected') => {
        if (!groupId || !submissionId) return;
        try {
            await updateCorrectionStatus(groupId, submissionId, correctionId, status);
            setCorrections((prev) => prev.map((c) => c.id === correctionId ? { ...c, status } : c));
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    if (loading) {
        return <Layout headerTitle="添削"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div></Layout>;
    }

    if (!submission) {
        return <Layout headerTitle="添削"><div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>提出物が見つかりません。</div></Layout>;
    }

    const snap = submission.scriptSnapshot;
    const fieldText: Record<FieldTab, string> = {
        content: snap.content,
        synopsis: snap.synopsis,
        characterText: snap.characterText,
    };
    const currentText = fieldText[activeField] || '';
    const fieldCorrections = corrections.filter((c) => c.field === activeField);

    const pendingCount = corrections.filter((c) => c.status === 'pending').length;
    const acceptedCount = corrections.filter((c) => c.status === 'accepted').length;

    return (
        <Layout
            headerTitle={`添削: ${snap.title}`}
            headerActions={
                <button
                    onClick={() => navigate(`/groups/${groupId}/submissions/${submissionId}`)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.75rem', backgroundColor: 'transparent',
                        color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', fontSize: '0.8125rem', cursor: 'pointer',
                    }}
                >
                    <ArrowLeft size={16} /> 戻る
                </button>
            }
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* ヘッダー */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <PenLine size={24} style={{ color: '#dc2626' }} />
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>添削</h1>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.125rem 0 0' }}>
                            {snap.title} — {snap.authorName}
                            {corrections.length > 0 && ` ・ 添削${corrections.length}件 (未確認${pendingCount} / 承認${acceptedCount})`}
                        </p>
                    </div>
                </div>

                {/* フィールドタブ */}
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                    {(Object.keys(FIELD_LABELS) as FieldTab[]).map((f) => {
                        const count = corrections.filter((c) => c.field === f).length;
                        return (
                            <button
                                key={f}
                                onClick={() => { setActiveField(f); setActiveCorrectionId(null); }}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
                                    border: '1px solid var(--border)', cursor: 'pointer',
                                    backgroundColor: activeField === f ? 'var(--text-primary)' : 'transparent',
                                    color: activeField === f ? 'var(--color-surface)' : 'var(--text-secondary)',
                                    fontWeight: activeField === f ? 600 : 400,
                                }}
                            >
                                {FIELD_LABELS[f]} {count > 0 && `(${count})`}
                            </button>
                        );
                    })}
                </div>

                {/* メインレイアウト: エディタ + パネル */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* 左: 縦書きエディタ */}
                    <div style={{ flex: '1 1 65%', minWidth: 0 }}>
                        {currentText ? (
                            <CorrectionEditor
                                text={currentText}
                                field={activeField}
                                corrections={corrections}
                                activeCorrectionId={activeCorrectionId}
                                charsPerColumn={snap.settings?.lineLength ?? 20}
                                lineCount={Math.max(10, Math.ceil(currentText.length / (snap.settings?.lineLength ?? 20)))}
                                onTextSelect={isTeacher ? handleTextSelect : undefined}
                                onCorrectionClick={(id) => setActiveCorrectionId(id === activeCorrectionId ? null : id)}
                            />
                            ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                このフィールドにはテキストがありません。
                            </div>
                        )}
                        {isTeacher && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                テキストを選択して添削を追加できます。
                            </p>
                        )}
                    </div>

                    {/* 右: 添削一覧 */}
                    <div style={{ flex: '0 0 35%', maxHeight: '70vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem' }}>
                            添削一覧 ({fieldCorrections.length})
                        </h3>
                        <CorrectionPanel
                            corrections={fieldCorrections}
                            canReview={isStudent}
                            activeCorrectionId={activeCorrectionId}
                            onSelect={setActiveCorrectionId}
                            onUpdateStatus={handleUpdateStatus}
                        />
                    </div>
                </div>
            </div>

            {/* 添削ダイアログ */}
            {dialogSelection && (
                <CorrectionDialog
                    selectedText={dialogSelection.text}
                    field={activeField}
                    onSubmit={(data) => void handleCreateCorrection(data)}
                    onClose={() => setDialogSelection(null)}
                />
            )}
        </Layout>
    );
}
