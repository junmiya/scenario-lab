import { useEffect, useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui/Layout';
import { useAuth, useUserRole } from '../contexts/AuthContext';
import {
    getGroup, listGroupMembers, listSubmissions, addGroupMember, removeGroupMember,
    type FirestoreGroup, type GroupMember, type GroupSubmission,
} from '../lib/firebase/firestoreService';
import { listUsers } from '../lib/firebase/firestoreService';
import type { UserProfile, UserRole } from '../lib/firebase/authService';
import { Users, FileText, UserPlus, Trash2, ChevronRight, Clock } from 'lucide-react';

const MEMBER_ROLE_LABELS: Record<string, string> = {
    operator: '運営者',
    teacher: '先生',
    student: '生徒',
};

const STATUS_LABELS: Record<string, string> = {
    submitted: '提出済み',
    in_review: 'レビュー中',
    reviewed: 'レビュー完了',
};

export function GroupDetailPage(): ReactElement {
    const { groupId } = useParams<{ groupId: string }>();
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();

    const [group, setGroup] = useState<FirestoreGroup | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [submissions, setSubmissions] = useState<GroupSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    // メンバー追加
    const [showAddMember, setShowAddMember] = useState(false);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [selectedUid, setSelectedUid] = useState('');
    const [memberRole, setMemberRole] = useState<GroupMember['role']>('student');
    const [adding, setAdding] = useState(false);

    const myMember = members.find((m) => m.uid === user?.uid);
    const canManage = myMember?.role === 'operator' || userProfile?.role === 'system_admin';

    useEffect(() => {
        if (!groupId) return;
        void loadData();
    }, [groupId]);

    const loadData = async () => {
        if (!groupId) return;
        setLoading(true);
        try {
            const [g, m, s] = await Promise.all([
                getGroup(groupId),
                listGroupMembers(groupId),
                listSubmissions(groupId),
            ]);
            setGroup(g);
            setMembers(m);
            setSubmissions(s);
        } catch (error) {
            console.error('Failed to load group data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShowAddMember = async () => {
        setShowAddMember(true);
        try {
            const users = await listUsers();
            const memberUids = new Set(members.map((m) => m.uid));
            setAllUsers(users.filter((u) => !memberUids.has(u.uid)));
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleAddMember = async () => {
        if (!groupId || !selectedUid) return;
        setAdding(true);
        try {
            const targetUser = allUsers.find((u) => u.uid === selectedUid);
            await addGroupMember(groupId, selectedUid, memberRole, targetUser?.displayName ?? undefined, targetUser?.email ?? undefined);
            setShowAddMember(false);
            setSelectedUid('');
            await loadData();
        } catch (error) {
            console.error('Failed to add member:', error);
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveMember = async (uid: string) => {
        if (!groupId || !confirm('このメンバーを削除しますか？')) return;
        try {
            await removeGroupMember(groupId, uid);
            await loadData();
        } catch (error) {
            console.error('Failed to remove member:', error);
        }
    };

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <Layout headerTitle="グループ">
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>読み込み中...</div>
            </Layout>
        );
    }

    if (!group) {
        return (
            <Layout headerTitle="グループ">
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>グループが見つかりません。</div>
            </Layout>
        );
    }

    return (
        <Layout headerTitle={group.name}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* グループ情報 */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {group.name}
                    </h1>
                    {group.description && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {group.description}
                        </p>
                    )}
                </div>

                {/* メンバー一覧 */}
                <section style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} />
                            メンバー ({members.length})
                        </h2>
                        {canManage && (
                            <button
                                onClick={() => void handleShowAddMember()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.5rem 0.75rem', backgroundColor: 'var(--text-primary)',
                                    color: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                                    fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                                }}
                            >
                                <UserPlus size={16} />
                                追加
                            </button>
                        )}
                    </div>

                    {/* メンバー追加ダイアログ */}
                    {showAddMember && (
                        <div style={{
                            padding: '1rem', marginBottom: '1rem',
                            backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ユーザー</label>
                                    <select
                                        value={selectedUid}
                                        onChange={(e) => setSelectedUid(e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}
                                    >
                                        <option value="">選択してください</option>
                                        {allUsers.map((u) => (
                                            <option key={u.uid} value={u.uid}>{u.displayName || u.email || u.uid}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>ロール</label>
                                    <select
                                        value={memberRole}
                                        onChange={(e) => setMemberRole(e.target.value as GroupMember['role'])}
                                        style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem' }}
                                    >
                                        <option value="student">生徒</option>
                                        <option value="teacher">先生</option>
                                        <option value="operator">運営者</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => void handleAddMember()}
                                    disabled={adding || !selectedUid}
                                    style={{
                                        padding: '0.5rem 1rem', backgroundColor: 'var(--text-primary)',
                                        color: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                                        fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', border: 'none',
                                        opacity: adding || !selectedUid ? 0.5 : 1,
                                    }}
                                >
                                    追加
                                </button>
                                <button
                                    onClick={() => setShowAddMember(false)}
                                    style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        {members.map((m) => (
                            <div key={m.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                        {m.displayName || m.email || m.uid}
                                    </span>
                                    <span style={{
                                        marginLeft: '0.5rem', padding: '0.125rem 0.5rem',
                                        backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.75rem', color: 'var(--text-secondary)',
                                    }}>
                                        {MEMBER_ROLE_LABELS[m.role] || m.role}
                                    </span>
                                </div>
                                {canManage && m.uid !== user?.uid && (
                                    <button
                                        onClick={() => void handleRemoveMember(m.uid)}
                                        style={{ padding: '0.25rem', backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                        title="削除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 提出物一覧 */}
                <section>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} />
                        提出物 ({submissions.length})
                    </h2>

                    {submissions.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '3rem 2rem',
                            border: '2px dashed var(--border)', borderRadius: 'var(--radius-xl)',
                            backgroundColor: 'var(--color-surface)',
                        }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                まだ提出された脚本はありません。
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {submissions.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => navigate(`/groups/${groupId}/submissions/${s.id}`)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 1.25rem', backgroundColor: 'var(--color-surface)',
                                        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div>
                                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                            {s.scriptTitle || '(無題)'}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{s.authorName}</span>
                                            <span style={{
                                                padding: '0.125rem 0.5rem',
                                                backgroundColor: s.status === 'reviewed' ? '#dcfce7' : s.status === 'in_review' ? '#fef3c7' : '#e0e7ff',
                                                color: s.status === 'reviewed' ? '#166534' : s.status === 'in_review' ? '#92400e' : '#3730a3',
                                                borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 500,
                                            }}>
                                                {STATUS_LABELS[s.status]}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={12} />
                                                {formatDate(s.submittedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
}
