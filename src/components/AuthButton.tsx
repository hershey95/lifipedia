'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <span className="text-sm text-slate-400">…</span>;

  if (!session?.user) {
    return (
      <button type="button" className="btn-ghost" onClick={() => signIn()}>
        로그인
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/me" className="text-sm no-underline" aria-label="마이페이지">
        <span className="hidden max-w-[10rem] truncate sm:inline-block sm:align-bottom">{session.user.name ?? '내 프로필'}</span>
        <span className="sm:hidden">마이</span>
      </Link>
      <button type="button" className="btn-ghost" onClick={() => signOut()}>
        로그아웃
      </button>
    </div>
  );
}

/** 공개 프로필(/u/[id])에서 본인일 때만 마이페이지 링크를 보여 준다. 공개 페이지 자체는 세션을 읽지 않는다. */
export function OwnProfileLink({ profileId }: { profileId: string }) {
  const { data: session } = useSession();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id || id !== profileId) return null;
  return (
    <Link href="/me" className="text-sm">
      마이페이지로
    </Link>
  );
}
