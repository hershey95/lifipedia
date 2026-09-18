'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <span className="text-sm text-ink/40">…</span>;

  if (!session?.user) {
    return (
      <button type="button" className="btn-ghost" onClick={() => signIn()}>
        로그인
      </button>
    );
  }

  const id = (session.user as { id?: string }).id;

  return (
    <div className="flex items-center gap-2">
      <Link href={id ? `/u/${id}` : '#'} className="hidden text-sm no-underline sm:inline">
        {session.user.name ?? '내 프로필'}
      </Link>
      <button type="button" className="btn-ghost" onClick={() => signOut()}>
        로그아웃
      </button>
    </div>
  );
}
