import { useEffect, useState, type ReactElement } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  listComments,
  createComment,
  deleteComment,
  type FirestoreComment,
} from '../../lib/firebase/firestoreService';
import { MessageSquare, Trash2, Send } from 'lucide-react';

interface CommentThreadProps {
  scriptId: string;
  submissionId: string;
  groupId: string;
}

export function CommentThread({
  scriptId,
  submissionId,
  groupId,
}: CommentThreadProps): ReactElement {
  const { user } = useAuth();
  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    void loadComments();
  }, [submissionId, groupId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const result = await listComments(submissionId, groupId);
      setComments(result);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!user || !body.trim()) return;
    setPosting(true);
    try {
      await createComment({
        scriptId,
        submissionId,
        groupId,
        authorId: user.uid,
        authorName: user.displayName || 'ユーザー',
        authorPhotoURL: user.photoURL,
        body: body.trim(),
      });
      setBody('');
      await loadComments();
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: '0 0 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <MessageSquare size={18} />
        コメント ({comments.length})
      </h3>

      {/* コメント一覧 */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}
      >
        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>読み込み中...</p>
        )}
        {!loading && comments.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            まだコメントはありません。
          </p>
        )}
        {comments.map((c) => (
          <div
            key={c.id}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.375rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.authorPhotoURL && (
                  <img
                    src={c.authorPhotoURL}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%' }}
                  />
                )}
                <span
                  style={{ fontWeight: 500, fontSize: '0.8125rem', color: 'var(--text-primary)' }}
                >
                  {c.authorName}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {formatDate(c.createdAt)}
                </span>
              </div>
              {c.authorId === user?.uid && (
                <button
                  onClick={() => void handleDelete(c.id)}
                  style={{
                    padding: '0.125rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {c.body}
            </p>
          </div>
        ))}
      </div>

      {/* コメント入力 */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを入力..."
          rows={2}
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handlePost();
            }
          }}
        />
        <button
          onClick={() => void handlePost()}
          disabled={posting || !body.trim()}
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: 'var(--text-primary)',
            color: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            alignSelf: 'flex-end',
            opacity: posting || !body.trim() ? 0.5 : 1,
          }}
          title="送信 (Cmd+Enter)"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
