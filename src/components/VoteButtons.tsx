'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useSession, signIn } from 'next-auth/react';

type Props = {
  itemId: string;
  initialUp: number;
  initialDown: number;
  initialMyVote: 'UP' | 'DOWN' | null;
  disabled?: boolean;
};

export function VoteButtons({ itemId, initialUp, initialDown, initialMyVote, disabled }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [error, setError] = useState<string | null>(null);

  async function cast(type: 'UP' | 'DOWN') {
    if (status !== 'authenticated') {
      void signIn();
      return;
    }
    setError(null);

    const response = await fetch(`/api/items/${itemId}/vote`, {
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
    setUp(data.breakdown.rawUpCount);
    setDown(data.breakdown.rawDownCount);
    startTransition(() => router.refresh());
  }

  const base = 'btn-ghost gap-1.5 disabled:opacity-40';

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          className={`${base} ${myVote === 'UP' ? 'border-accent text-accent' : ''}`}
          onClick={() => cast('UP')}
          disabled={disabled || pending}
          aria-pressed={myVote === 'UP'}
        >
          <span aria-hidden>▲</span> 추천 <span className="tabular-nums">{up}</span>
        </button>
        <button
          type="button"
          className={`${base} ${myVote === 'DOWN' ? 'border-black/40 text-ink' : ''}`}
          onClick={() => cast('DOWN')}
          disabled={disabled || pending}
          aria-pressed={myVote === 'DOWN'}
        >
          <span aria-hidden>▼</span> 비추천 <span className="tabular-nums">{down}</span>
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
