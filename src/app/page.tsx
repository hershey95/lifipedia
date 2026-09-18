import Link from 'next/link';
import { prisma } from '@/lib/db';
import { promotionProgress } from '@/lib/theme-lifecycle';
import { computeMomentum } from '@/lib/ranking';
import { TierBadge } from '@/components/TierBadge';
import { AdSlot } from '@/components/AdSlot';
import { TIER_SLUGS } from '@/lib/tier';

// DB 조회 페이지라 빌드 타임에 DB 없이도 빌드가 되도록 요청마다 렌더링한다.
// (ISR revalidate 를 쓰면 next build 시점에 DB 연결을 시도해 CI/Docker 빌드가 깨진다.)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [activeThemes, risingThemes, recentItems] = await Promise.all([
    prisma.theme.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ followerCount: 'desc' }],
      take: 8,
      select: { slug: true, name: true, description: true, followerCount: true, _count: { select: { items: true } } },
    }),
    prisma.theme.findMany({
      where: { status: 'PROPOSED' },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      select: { slug: true, name: true, followerCount: true },
    }),
    prisma.item.findMany({
      where: { isRemoved: false, theme: { status: 'ACTIVE' } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        slug: true, name: true, tier: true, imageUrl: true, createdAt: true,
        theme: { select: { slug: true, name: true } },
        votes: { select: { type: true, weight: true, createdAt: true, userId: true } },
      },
    }),
  ]);

  // "이번 달 급상승": 직전 30일 대비 최근 30일의 지지 증가폭 상위
  const rising = recentItems
    .map((item) => ({ item, momentum: computeMomentum(item.votes) }))
    .filter((entry) => entry.momentum > 0)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-2xl bg-gradient-to-br from-accent/10 to-transparent p-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          인생템은 운영자가 아니라 우리가 정한다
        </h1>
        <p className="mt-3 max-w-2xl text-ink/70">
          테마를 제안하고, 제품 위키를 쓰고, 추천으로 겨루세요. 매달·매년 저가·중가·고가별 Top 1이
          유저 활동만으로 자동 산정됩니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/themes/new" className="btn-primary no-underline">테마 제안하기</Link>
          <Link href="/themes" className="btn-ghost no-underline">테마 둘러보기</Link>
          <Link href="/how-ranking-works" className="btn-ghost no-underline">순위는 어떻게 정해지나요?</Link>
        </div>
      </section>

      <AdSlot slot="theme-top" />

      <section>
        <h2 className="mb-3 text-xl font-bold">정식 테마</h2>
        {activeThemes.length === 0 ? (
          <EmptyHint>아직 정식 승격된 테마가 없습니다. 제안된 테마를 팔로우해 승격시켜 주세요.</EmptyHint>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {activeThemes.map((theme) => (
              <li key={theme.slug} className="card">
                <Link href={`/theme/${theme.slug}`} className="text-base font-semibold no-underline">
                  {theme.name}
                </Link>
                {theme.description ? <p className="mt-1 line-clamp-2 text-sm text-ink/60">{theme.description}</p> : null}
                <p className="mt-2 text-xs text-ink/50">
                  팔로워 {theme.followerCount.toLocaleString('ko-KR')} · 항목 {theme._count.items.toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">이번 달 급상승 아이템</h2>
        {rising.length === 0 ? (
          <EmptyHint>아직 집계할 추천이 충분하지 않습니다.</EmptyHint>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rising.map(({ item, momentum }) => (
              <li key={`${item.theme.slug}/${item.slug}`} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/theme/${item.theme.slug}/item/${item.slug}`}
                    className="block truncate font-semibold no-underline"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink/50">
                    <TierBadge tier={item.tier} />
                    <Link href={`/theme/${item.theme.slug}`} className="no-underline text-inherit">
                      {item.theme.name}
                    </Link>
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-accent">+{momentum.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">떠오르는 신규 테마</h2>
        {risingThemes.length === 0 ? (
          <EmptyHint>
            제안된 테마가 없습니다. <Link href="/themes/new">첫 테마를 제안해 보세요.</Link>
          </EmptyHint>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {risingThemes.map((theme) => {
              const progress = promotionProgress(theme.followerCount);
              return (
                <li key={theme.slug}>
                  <Link href={`/theme/${theme.slug}`} className="btn-ghost no-underline">
                    {theme.name}
                    <span className="ml-2 text-xs text-ink/50">
                      {progress.followerCount}/{progress.threshold}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-sm text-ink/50">
        가격대별 순위 바로가기:{' '}
        {activeThemes[0]
          ? (Object.entries(TIER_SLUGS) as [keyof typeof TIER_SLUGS, string][]).map(([tier, slug]) => (
              <Link key={tier} href={`/theme/${activeThemes[0].slug}/${slug}`} className="mr-3">
                {activeThemes[0].name} {slug}
              </Link>
            ))
          : '정식 테마가 생기면 표시됩니다.'}
      </p>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="card text-sm text-ink/60">{children}</p>;
}
