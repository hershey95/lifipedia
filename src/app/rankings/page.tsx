import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { TIER_LABELS, type Tier } from '@/lib/tier';
import { TierBadge } from '@/components/TierBadge';

export const metadata: Metadata = {
  title: '순위 아카이브',
  description: '매달·매년 박제된 테마별 저가·중가·고가 Top 1 기록. "2024년 여행 인생템 1위는 무엇이었나."',
};

export const revalidate = 3600;

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;

  const periods = await prisma.rankingSnapshot.findMany({
    distinct: ['periodType', 'periodKey'],
    orderBy: [{ periodKey: 'desc' }],
    select: { periodType: true, periodKey: true },
  });

  const selected = period ?? periods[0]?.periodKey;

  const snapshots = selected
    ? await prisma.rankingSnapshot.findMany({
        where: { periodKey: selected, rank: 1 },
        orderBy: [{ theme: { name: 'asc' } }, { tier: 'asc' }],
        select: {
          id: true, tier: true, score: true, isProvisional: true, periodType: true,
          theme: { select: { slug: true, name: true } },
          item: { select: { slug: true, name: true, priceKrw: true } },
        },
      })
    : [];

  const byTheme = new Map<string, typeof snapshots>();
  for (const snapshot of snapshots) {
    const list = byTheme.get(snapshot.theme.slug) ?? [];
    list.push(snapshot);
    byTheme.set(snapshot.theme.slug, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-extrabold">순위 아카이브</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">
          Top 1은 고정되지 않습니다. 매달 1일에 지난달 순위가, 매년 1월 1일에 지난해 순위가 그대로 박제되어
          영구 보존됩니다. 시간이 지날수록 &lsquo;그때 무엇이 1위였나&rsquo;의 기록이 쌓입니다.
        </p>
      </header>

      {periods.length === 0 ? (
        <p className="card text-sm text-ink/60">
          아직 생성된 스냅샷이 없습니다. 첫 달이 마감되면 이곳에 기록이 쌓입니다.
        </p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2">
            {periods.map((p) => (
              <Link
                key={`${p.periodType}-${p.periodKey}`}
                href={`/rankings?period=${p.periodKey}`}
                className={`btn-ghost no-underline ${p.periodKey === selected ? 'border-accent text-accent' : ''}`}
              >
                {p.periodKey}
                <span className="ml-1 text-xs text-ink/40">{p.periodType === 'YEARLY' ? '연간' : '월간'}</span>
              </Link>
            ))}
          </nav>

          {snapshots.length === 0 ? (
            <p className="card text-sm text-ink/60">이 기간에는 집계된 순위가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-6">
              {[...byTheme.entries()].map(([themeSlug, list]) => (
                <section key={themeSlug} className="card">
                  <h2 className="font-bold">
                    <Link href={`/theme/${themeSlug}`} className="no-underline">{list[0].theme.name}</Link>
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2">
                    {list.map((snapshot) => (
                      <li key={snapshot.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <TierBadge tier={snapshot.tier as Tier} />
                        <Link href={`/theme/${themeSlug}/item/${snapshot.item.slug}`} className="font-medium">
                          {snapshot.item.name}
                        </Link>
                        <span className="text-xs text-ink/45">
                          {snapshot.score.toFixed(1)}점
                          {snapshot.isProvisional ? ' · 참여자 부족으로 잠정' : ''}
                        </span>
                      </li>
                    ))}
                    {(['BUDGET', 'MID', 'PREMIUM'] as Tier[])
                      .filter((tier) => !list.some((s) => s.tier === tier))
                      .map((tier) => (
                        <li key={tier} className="flex items-center gap-2 text-sm text-ink/40">
                          <TierBadge tier={tier} />
                          {TIER_LABELS[tier]} — 미정 (참여 부족)
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
