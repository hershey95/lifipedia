'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { BoardVoteButtons } from '@/components/BoardVoteButtons';
import { ReportButton } from '@/components/ReportButton';
import { ANSWER_RULES, BOARD_RULES } from '@/lib/board';

export type AttachedItem = { id: string; name: string; slug: string; themeSlug: string; themeName: string };

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
  /** P2: 답변이 첨부한 문서 */
  items: AttachedItem[];
  helpful: boolean;
  /** 글 작성자가 이 답변에 도움됨을 누를 수 있는가 */
  canMarkHelpful: boolean;
  children: PostCommentNode[];
};

/** 서버가 buildCommentTree 로 만든 트리를 그린다. 답글 폼만 클라이언트 상태다. */
export function PostThread({ postId, tree, isQuestion }: { postId: string; tree: PostCommentNode[]; isQuestion: boolean }) {
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
                  {c.helpful ? <span className="chip ml-2">도움됨</span> : null}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">{c.body}</p>
                {c.items.length > 0 ? (
                  <ul aria-label="첨부한 문서" className="mt-2 flex flex-wrap gap-2">
                    {c.items.map((it) => (
                      <li key={it.id} className="card px-3 py-2 text-xs">
                        <Link href={`/theme/${encodeURIComponent(it.themeSlug)}/item/${it.slug}`} className="font-semibold">{it.name}</Link>
                        <span className="text-fg-subtle"> · {it.themeName}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <BoardVoteButtons
                    endpoint={`/api/post-comments/${c.id}/vote`}
                    initialUp={c.upCount}
                    initialDown={c.downCount}
                    initialMyVote={c.myVote}
                    own={c.own}
                  />
                  {c.canMarkHelpful ? <HelpfulButton commentId={c.id} initial={c.helpful} /> : null}
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
                    <CommentForm postId={postId} parentId={c.id} canAttach={false} onDone={() => setReplyTo(null)} />
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
      <CommentForm postId={postId} parentId={null} canAttach={isQuestion} />
      {tree.length === 0 ? (
        <p className="card text-sm text-fg-muted">아직 댓글이 없습니다. 첫 댓글을 남겨 주세요.</p>
      ) : (
        renderLevel(tree, false)
      )}
    </div>
  );
}

function HelpfulButton({ commentId, initial }: { commentId: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={`btn-ghost ${on ? 'border-accent text-accent-fg' : ''}`}
        aria-pressed={on}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const response = await fetch(`/api/post-comments/${commentId}/helpful`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) {
              setError(data.error ?? '표시에 실패했습니다.');
              return;
            }
            setOn(data.helpful);
            router.refresh();
          } catch {
            setError('네트워크 오류로 표시에 실패했습니다.');
          } finally {
            setBusy(false);
          }
        }}
      >
        도움됨
      </button>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type Hit = { id: string; name: string; theme: { name: string } };

/** 문서 첨부 검색 상자. 기존 /api/search 를 300ms 디바운스로 쓴다. 최대 ANSWER_RULES.MAX_ITEMS 개. */
function ItemPicker({ picked, onChange }: { picked: Hit[]; onChange: (next: Hit[]) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&take=8`, { signal: ctrl.signal });
        if (response.ok) setHits((await response.json()).items ?? []);
      } catch {
        /* 중단·네트워크 오류는 조용히 무시: 첨부는 선택 사항 */
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const full = picked.length >= ANSWER_RULES.MAX_ITEMS;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-semibold">
        문서 첨부 (선택, 최대 {ANSWER_RULES.MAX_ITEMS}개)
        <input
          className="field font-normal"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={full ? '더 이상 첨부할 수 없습니다' : '추천할 문서 이름 검색'}
          disabled={full}
          maxLength={60}
        />
      </label>
      {hits.length > 0 && !full ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border text-sm">
          {hits
            .filter((h) => !picked.some((p) => p.id === h.id))
            .map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-surface-raised"
                  onClick={() => {
                    onChange([...picked, h]);
                    setQ('');
                    setHits([]);
                  }}
                >
                  {h.name} <span className="text-xs text-fg-subtle">· {h.theme.name}</span>
                </button>
              </li>
            ))}
        </ul>
      ) : null}
      {picked.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="첨부할 문서">
          {picked.map((p) => (
            <li key={p.id} className="chip">
              {p.name}
              <button
                type="button"
                className="ml-1"
                aria-label={`${p.name} 첨부 취소`}
                onClick={() => onChange(picked.filter((x) => x.id !== p.id))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CommentForm({ postId, parentId, canAttach, onDone }: { postId: string; parentId: string | null; canAttach: boolean; onDone?: () => void }) {
  const { status } = useSession();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [picked, setPicked] = useState<Hit[]>([]);
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
            body: JSON.stringify({
              bodyText: body,
              parentId: parentId ?? undefined,
              itemIds: canAttach ? picked.map((p) => p.id) : undefined,
            }),
          });
          if (!response.ok) {
            setError((await response.json()).error ?? '등록에 실패했습니다.');
            return;
          }
          setBody('');
          setPicked([]);
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
        placeholder={parentId ? '답글을 입력하세요' : canAttach ? '답변을 입력하세요' : '댓글을 입력하세요'}
        aria-label={parentId ? '답글' : canAttach ? '답변' : '댓글'}
        required
        maxLength={BOARD_RULES.COMMENT_MAX}
      />
      {canAttach ? <ItemPicker picked={picked} onChange={setPicked} /> : null}
      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? '등록 중…' : '등록'}
      </button>
    </form>
  );
}
