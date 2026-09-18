'use client';

import { signIn } from 'next-auth/react';

const LABELS = { github: 'GitHub 로 계속하기', google: 'Google 로 계속하기' } as const;

export function SignInButtons({ providers }: { providers: ('github' | 'google')[] }) {
  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          className="btn-ghost justify-center py-3"
          onClick={() => signIn(provider, { callbackUrl: '/' })}
        >
          {LABELS[provider]}
        </button>
      ))}
    </div>
  );
}
