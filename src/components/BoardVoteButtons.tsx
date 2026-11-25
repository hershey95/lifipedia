'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { applyVote, type VoteState, type VoteType } from '@/lib/vote-state';

type Props = {
  /** 예: /api/posts/ID/vote, /api/post-comments/ID/vote */
  endpoint: string;
  initialUp: number;
  initialDown: number;
  initialMyVote: 'UP' | 'DOWN' | null;
  /** 본인 글·댓글이면 버튼 대신 숫자만 보인다 */
  own?: boolean;
};

/** 게시판 글·댓글 공용 투표 버튼. VoteButtons 와 같은 패턴(낙관 반영, aria-pressed, 비로그인 signIn). */
export function BoardVoteButtons({ endpoint, initialUp, initialDown, initialMyVote, own }: Props) {
  const { status } = useSession();
  const [busy, startTransition] = useTransition();
  const [vote, setVote] = useState<VoteState>({ up: initialUp, down: initialDown, mine: initialMyVote });
  const [shown, setShown] = useOptimistic(vote);
  const [error, setError] = useState<string | null>(null);

  if (own) {
    return (
      <p className="text-xs text-fg-muted tabular-nums">
        ▲ {vote.up} · ▼ {vote.down}
      </p>
    );
  }

  function cast(type: VoteType) {
    if (status !== 'authenticated') {
      void signIn();
      return;
    }
    if (busy) return;
    setError(null);
    startTransition(async () => {
      setShown(applyVote(vote, type));
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? '투표에 실패했습니다.');
          if (response.status === 401) void signIn();
          return;
        }
        startTransition(() => setVote({ up: data.upCount, down: data.downCount, mine: data.myVote }));
      } catch {
        setError('네트워크 오류로 투표에 실패했습니다.');
      }
    });
  }

  const base = 'btn-ghost gap-1.5 disabled:opacity-40';
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${shown.mine === 'UP' ? 'border-accent text-accent-fg' : ''}`}
          onClick={() => cast('UP')}
          disabled={busy}
          aria-pressed={shown.mine === 'UP'}
          aria-label={`추천 ${shown.up}`}
        >
          <span aria-hidden>▲</span> <span className="tabular-nums">{shown.up}</span>
        </button>
        <button
          type="button"
          className={`${base} ${shown.mine === 'DOWN' ? 'border-accent text-accent-fg' : ''}`}
          onClick={() => cast('DOWN')}
          disabled={busy}
          aria-pressed={shown.mine === 'DOWN'}
          aria-label={`비추천 ${shown.down}`}
        >
          <span aria-hidden>▼</span> <span className="tabular-nums">{shown.down}</span>
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
