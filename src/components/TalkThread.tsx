'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

export type TalkComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
};

export function TalkThread({ itemId, comments }: { itemId: string; comments: TalkComment[] }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const byParent = new Map<string | null, TalkComment[]>();
  for (const comment of comments) {
    const list = byParent.get(comment.parentId) ?? [];
    list.push(comment);
    byParent.set(comment.parentId, list);
  }

  function renderLevel(parentId: string | null, depth: number): React.ReactNode {
    const list = byParent.get(parentId) ?? [];
    if (list.length === 0) return null;

    return (
      <ul className={depth === 0 ? 'flex flex-col gap-3' : 'mt-3 flex flex-col gap-3 border-l border-black/10 pl-4'}>
        {list.map((comment) => (
          <li key={comment.id} className={depth === 0 ? 'card' : ''}>
            <p className="text-xs text-ink/50">
              {comment.authorId ? (
                <Link href={`/u/${comment.authorId}`}>{comment.authorName}</Link>
              ) : (
                comment.authorName
              )}{' '}
              · {comment.createdAt.slice(0, 16).replace('T', ' ')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>

            {depth < 3 ? (
              <button
                type="button"
                className="mt-1 text-xs text-accent"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              >
                {replyTo === comment.id ? '취소' : '답글'}
              </button>
            ) : null}

            {replyTo === comment.id ? (
              <div className="mt-2">
                <CommentForm itemId={itemId} parentId={comment.id} onDone={() => setReplyTo(null)} />
              </div>
            ) : null}

            {renderLevel(comment.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CommentForm itemId={itemId} parentId={null} />
      {comments.length === 0 ? (
        <p className="card text-sm text-ink/60">아직 토론이 없습니다. 첫 의견을 남겨 주세요.</p>
      ) : (
        renderLevel(null, 0)
      )}
    </div>
  );
}

function CommentForm({ itemId, parentId, onDone }: { itemId: string; parentId: string | null; onDone?: () => void }) {
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
        setBusy(true);
        setError(null);

        const response = await fetch(`/api/items/${itemId}/talk`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ bodyText: body, parentId: parentId ?? undefined }),
        });
        setBusy(false);

        if (!response.ok) {
          setError((await response.json()).error ?? '등록에 실패했습니다.');
          return;
        }
        setBody('');
        onDone?.();
        router.refresh();
      }}
    >
      <textarea
        className="field min-h-20"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId ? '답글을 입력하세요' : '의견을 남겨 주세요'}
        required
        maxLength={5000}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '등록 중…' : '등록'}
      </button>
    </form>
  );
}
