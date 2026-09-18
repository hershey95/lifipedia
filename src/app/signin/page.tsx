import type { Metadata } from 'next';
import { SignInButtons } from '@/components/SignInButtons';

export const metadata: Metadata = { title: '로그인', robots: { index: false } };

export default function SignInPage() {
  const providers = [
    process.env.GITHUB_ID ? ('github' as const) : null,
    process.env.GOOGLE_CLIENT_ID ? ('google' as const) : null,
  ].filter((p): p is 'github' | 'google' => p !== null);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-extrabold">로그인</h1>
      <p className="mt-2 text-sm text-ink/65">
        위키 작성, 투표, 테마 제안에는 로그인이 필요합니다. 읽기는 로그인 없이도 가능합니다.
      </p>
      <div className="mt-6">
        {providers.length === 0 ? (
          <p className="card text-sm text-ink/60">
            소셜 로그인 공급자가 설정되지 않았습니다. <code>.env</code> 에 GITHUB_ID 또는
            GOOGLE_CLIENT_ID 를 설정해 주세요.
          </p>
        ) : (
          <SignInButtons providers={providers} />
        )}
      </div>
    </div>
  );
}
