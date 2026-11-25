'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useState, useTransition } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { applyVote, type VoteState, type VoteType } from '@/lib/vote-state';

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
  const [busy, startTransition] = useTransition();
  const [vote, setVote] = useState<VoteState>({ up: initialUp, down: initialDown, mine: initialMyVote });
  // 요청 중에만 낙관 값을 보여 주고, 실패하면 transition 이 끝나며 vote 로 되돌아간다.
  const [shown, setShown] = useOptimistic(vote);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch(`/api/items/${itemId}/vote`, {
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

        // await 뒤의 갱신은 다시 transition 으로 감싸야 낙관 값과 함께 교체된다.
        startTransition(() => {
          setVote({ up: data.breakdown.rawUpCount, down: data.breakdown.rawDownCount, mine: data.myVote });
          router.refresh();
        });
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
          disabled={disabled || busy}
          aria-pressed={shown.mine === 'UP'}
        >
          <span aria-hidden>▲</span> 추천 <span className="tabular-nums">{shown.up}</span>
        </button>
        <button
          type="button"
          className={`${base} ${shown.mine === 'DOWN' ? 'border-black/40 text-ink' : ''}`}
          onClick={() => cast('DOWN')}
          disabled={disabled || busy}
          aria-pressed={shown.mine === 'DOWN'}
        >
          <span aria-hidden>▼</span> 비추천 <span className="tabular-nums">{shown.down}</span>
        </button>
      </div>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
