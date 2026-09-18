import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SearchBox } from '@/components/SearchBox';
import { AuthButton } from '@/components/AuthButton';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Lifipedia — 인생템 위키',
    template: '%s | Lifipedia',
  },
  description:
    '유저가 직접 쓰고, 추천하고, 경쟁시켜 매달·매년 Top 1이 가려지는 커뮤니티 제품 위키. 운영자가 정답을 정하지 않습니다.',
  openGraph: { type: 'website', siteName: 'Lifipedia', locale: 'ko_KR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <header className="sticky top-0 z-30 border-b border-black/10 bg-white/85 backdrop-blur">
            <div className="wrap flex h-14 items-center gap-3">
              <Link href="/" className="shrink-0 text-lg font-extrabold tracking-tight text-ink no-underline">
                Lifipedia
              </Link>
              <nav className="hidden gap-3 text-sm text-ink/70 sm:flex">
                <Link href="/themes" className="text-inherit no-underline hover:text-accent">테마</Link>
                <Link href="/rankings" className="text-inherit no-underline hover:text-accent">아카이브</Link>
                <Link href="/how-ranking-works" className="text-inherit no-underline hover:text-accent">순위 산정</Link>
              </nav>
              <div className="ml-auto flex items-center gap-2">
                <SearchBox />
                <AuthButton />
              </div>
            </div>
          </header>

          <main className="wrap py-6">{children}</main>

          <footer className="mt-16 border-t border-black/10 py-8 text-sm text-ink/60">
            <div className="wrap flex flex-col gap-2 sm:flex-row sm:justify-between">
              <p>Lifipedia — 순위는 운영자가 아니라 유저가 만듭니다.</p>
              <nav className="flex gap-4">
                <Link href="/how-ranking-works">순위 산정 방식</Link>
                <Link href="/themes/new">테마 제안</Link>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
