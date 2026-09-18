'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

type Props = {
  themeSlug: string;
  initialFollowing: boolean;
  initialCount: number;
  threshold: number;
  status: 'PROPOSED' | 'ACTIVE' | 'DORMANT';
};

export function FollowButton({ themeSlug, initialFollowing, initialCount, threshold, status }: Props) {
  const session = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [promoted, setPromoted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (session.status !== 'authenticated') {
      void signIn();
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/themes/${encodeURIComponent(themeSlug)}/follow`, { method: 'POST' });
    setBusy(false);
    if (!response.ok) return;

    const data = await response.json();
    setFollowing(data.following);
    setCount(data.theme.followerCount);
    if (data.justPromoted) setPromoted(true);
    router.refresh();
  }

  const remaining = Math.max(0, threshold - count);

  return (
    <div className="flex flex-col gap-1">
      <button type="button" className={following ? 'btn-ghost' : 'btn-primary'} onClick={toggle} disabled={busy}>
        {following ? '팔로우 중' : '팔로우'} · {count.toLocaleString('ko-KR')}
      </button>
      {status === 'PROPOSED' ? (
        <p className="text-xs text-ink/60">
          {promoted ? '정식 테마로 승격되었습니다!' : `정식 승격까지 ${remaining}명 남았습니다.`}
        </p>
      ) : null}
    </div>
  );
}
