'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

type Props = {
  /** 예: /api/posts/ID/vote, /api/post-comments/ID/vote */
  endpoint: string;
  initialUp: number;
  initialDown: number;
  initialMyVote: 'UP' | 'DOWN' | null;
  /** 본인 글·댓글이면 버튼 대신 숫자만 보인다 */
  own?: boolean;
};

/** 게시판 글·댓글 공용 투표 버튼. VoteButtons 와 같은 패턴(busy, aria-pressed, 비로그인 signIn). */
export function BoardVoteButtons({ endpoint, initialUp, initialDown, initialMyVote, own }: Props) {
  const { status } = useSession();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (own) {
    return (
      <p className="text-xs text-fg-muted tabular-nums">
        ▲ {up} · ▼ {down}
      </p>
    );
  }

  async function cast(type: 'UP' | 'DOWN') {
    if (status !== 'authenticated') {
      void signIn();
      return;
    }
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? '투표에 실패했습니다.');
        return;
      }
      setMyVote(data.myVote);
      setUp(data.upCount);
      setDown(data.downCount);
    } catch {
      setError('네트워크 오류로 투표에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const base = 'btn-ghost gap-1.5 disabled:opacity-40';
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${myVote === 'UP' ? 'border-accent text-accent-fg' : ''}`}
          onClick={() => cast('UP')}
          disabled={busy}
          aria-pressed={myVote === 'UP'}
          aria-label={`추천 ${up}`}
        >
          <span aria-hidden>▲</span> <span className="tabular-nums">{up}</span>
        </button>
        <button
          type="button"
          className={`${base} ${myVote === 'DOWN' ? 'border-accent text-accent-fg' : ''}`}
          onClick={() => cast('DOWN')}
          disabled={busy}
          aria-pressed={myVote === 'DOWN'}
          aria-label={`비추천 ${down}`}
        >
          <span aria-hidden>▼</span> <span className="tabular-nums">{down}</span>
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
