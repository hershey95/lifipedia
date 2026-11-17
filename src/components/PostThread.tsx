'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { BoardVoteButtons } from '@/components/BoardVoteButtons';
import { ReportButton } from '@/components/ReportButton';
import { BOARD_RULES } from '@/lib/board';

export type PostCommentNode = {
  id: string;
  isRemoved: boolean;
  body: string;
  /** 서버에서 KST 로 만든 문자열 */
  createdLabel: string;
  authorId: string | null;
  authorName: string;
  upCount: number;
  downCount: number;
  myVote: 'UP' | 'DOWN' | null;
  own: boolean;
  depth: number;
  children: PostCommentNode[];
};

/** 서버가 buildCommentTree 로 만든 트리를 그린다. 답글 폼만 클라이언트 상태다. */
export function PostThread({ postId, tree }: { postId: string; tree: PostCommentNode[] }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);

  function renderLevel(nodes: PostCommentNode[], nested: boolean): React.ReactNode {
    if (nodes.length === 0) return null;
    return (
      <ul className={nested ? 'mt-3 flex flex-col gap-3 border-l border-border pl-4' : 'flex flex-col gap-3'}>
        {nodes.map((c) => (
          <li key={c.id} className={nested ? '' : 'card'}>
            {c.isRemoved ? (
              <p className="text-sm text-fg-subtle">삭제된 댓글입니다.</p>
            ) : (
              <>
                <p className="text-xs text-fg-muted">
                  {c.authorId ? <Link href={`/u/${c.authorId}`}>{c.authorName}</Link> : c.authorName} · {c.createdLabel}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">{c.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <BoardVoteButtons
                    endpoint={`/api/post-comments/${c.id}/vote`}
                    initialUp={c.upCount}
                    initialDown={c.downCount}
                    initialMyVote={c.myVote}
                    own={c.own}
                  />
                  {c.depth < 3 ? (
                    <button
                      type="button"
                      className="text-xs text-accent-fg"
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    >
                      {replyTo === c.id ? '취소' : '답글'}
                    </button>
                  ) : null}
                  <ReportButton targetType="POST_COMMENT" targetId={c.id} />
                </div>
                {replyTo === c.id ? (
                  <div className="mt-2">
                    <CommentForm postId={postId} parentId={c.id} onDone={() => setReplyTo(null)} />
                  </div>
                ) : null}
              </>
            )}
            {renderLevel(c.children, true)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CommentForm postId={postId} parentId={null} />
      {tree.length === 0 ? (
        <p className="card text-sm text-fg-muted">아직 댓글이 없습니다. 첫 댓글을 남겨 주세요.</p>
      ) : (
        renderLevel(tree, false)
      )}
    </div>
  );
}

function CommentForm({ postId, parentId, onDone }: { postId: string; parentId: string | null; onDone?: () => void }) {
  const { status } = useSession();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (status !== 'authenticated') {
          void signIn();
          return;
        }
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ bodyText: body, parentId: parentId ?? undefined }),
          });
          if (!response.ok) {
            setError((await response.json()).error ?? '등록에 실패했습니다.');
            return;
          }
          setBody('');
          onDone?.();
          router.refresh();
        } catch {
          setError('네트워크 오류로 등록에 실패했습니다.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <textarea
        className="field min-h-20"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? '답글을 입력하세요' : '댓글을 입력하세요'}
        aria-label={parentId ? '답글' : '댓글'}
        required
        maxLength={BOARD_RULES.COMMENT_MAX}
      />
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '등록 중…' : '등록'}
      </button>
    </form>
  );
}
