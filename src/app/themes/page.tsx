import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { promotionProgress } from '@/lib/theme-lifecycle';

export const metadata: Metadata = {
  title: '테마 전체',
  description: '생애주기·상황·취향 등 어떤 기준으로도 만들어지는 Lifipedia 테마 목록.',
};

export const revalidate = 300;

const SECTIONS = [
  { status: 'ACTIVE' as const, title: '정식 테마', hint: '위키 작성·투표·순위 산정이 모두 열려 있습니다.' },
  { status: 'PROPOSED' as const, title: '제안된 테마', hint: '팔로워가 임계치를 넘으면 자동으로 정식 승격됩니다.' },
  { status: 'DORMANT' as const, title: '휴면 테마', hint: '오랫동안 활동이 없어 읽기 전용입니다.' },
];

export default async function ThemesPage() {
  const themes = await prisma.theme.findMany({
    orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
    select: {
      slug: true, name: true, description: true, status: true,
      followerCount: true, _count: { select: { items: true } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">테마</h1>
          <p className="mt-1 text-sm text-ink/60">테마는 수요가 모이면 유기적으로 생겨나고 승격됩니다.</p>
        </div>
        <Link href="/themes/new" className="btn-primary no-underline">테마 제안</Link>
      </header>

      {SECTIONS.map((section) => {
        const list = themes.filter((theme) => theme.status === section.status);
        return (
          <section key={section.status}>
            <h2 className="text-lg font-bold">
              {section.title} <span className="text-sm font-normal text-ink/40">{list.length}</span>
            </h2>
            <p className="mb-3 text-sm text-ink/55">{section.hint}</p>
            {list.length === 0 ? (
              <p className="card text-sm text-ink/60">아직 없습니다.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {list.map((theme) => {
                  const progress = promotionProgress(theme.followerCount);
                  return (
                    <li key={theme.slug} className="card">
                      <Link href={`/theme/${theme.slug}`} className="font-semibold no-underline">{theme.name}</Link>
                      {theme.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-ink/60">{theme.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-ink/50">
                        팔로워 {theme.followerCount.toLocaleString('ko-KR')} · 항목 {theme._count.items.toLocaleString('ko-KR')}
                      </p>
                      {theme.status === 'PROPOSED' ? (
                        <div className="mt-2">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                            <div className="h-full bg-accent" style={{ width: `${progress.ratio * 100}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-ink/50">승격까지 {progress.remaining}명</p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
