import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { rankTier } from '@/lib/scoring-service';
import { TIER_LABELS, TIER_SLUGS, tierFromSlug } from '@/lib/tier';
import { RANKING_CONSTANTS } from '@/lib/ranking';
import { AdSlot } from '@/components/AdSlot';
import { TierBadge } from '@/components/TierBadge';
import { monthKey, previousMonthKey } from '@/lib/snapshot';

type Params = { params: Promise<{ slug: string; tier: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, tier } = await params;
  const tierEnum = tierFromSlug(tier);
  const theme = await prisma.theme.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: { name: true, slug: true },
  });
  if (!theme || !tierEnum) return { title: '찾을 수 없음' };

  return {
    title: `${theme.name} ${TIER_LABELS[tierEnum]} 순위`,
    description: `${theme.name} 중 ${TIER_LABELS[tierEnum]} 제품의 유저 추천 순위. 매달·매년 재산정됩니다.`,
    alternates: { canonical: `/theme/${theme.slug}/${TIER_SLUGS[tierEnum]}` },
  };
}

export default async function TierRankingPage({ params }: Params) {
  const { slug, tier } = await params;
  const tierEnum = tierFromSlug(tier);
  if (!tierEnum) notFound();

  const theme = await prisma.theme.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: { id: true, slug: true, name: true, status: true },
  });
  if (!theme || theme.status !== 'ACTIVE') notFound();

  const lastMonth = previousMonthKey();
  const [ranked, lastMonthTop] = await Promise.all([
    rankTier({ themeId: theme.id, tier: tierEnum, limit: 50 }),
    prisma.rankingSnapshot.findFirst({
      where: { themeId: theme.id, tier: tierEnum, periodType: 'MONTHLY', periodKey: lastMonth, rank: 1 },
      select: { item: { select: { slug: true, name: true } }, isProvisional: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-ink/50">
        <Link href="/themes">테마</Link> / <Link href={`/theme/${theme.slug}`}>{theme.name}</Link> /{' '}
        {TIER_LABELS[tierEnum]}
      </nav>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <TierBadge tier={tierEnum} /> {theme.name} · {TIER_LABELS[tierEnum]} 순위
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          현재 시점 기준 실시간 순위입니다. 오래된 추천은 점차 가벼워지고(반감기{' '}
          {RANKING_CONSTANTS.VOTE_HALF_LIFE_DAYS}일), 매달 1일에 지난달 Top이 아카이브에 박제됩니다.{' '}
          <Link href="/how-ranking-works">산정식 보기</Link>
        </p>
      </header>

      {lastMonthTop ? (
        <p className="card bg-accent/5 text-sm">
          <strong>{lastMonth} Top 1</strong> —{' '}
          <Link href={`/theme/${theme.slug}/item/${lastMonthTop.item.slug}`}>{lastMonthTop.item.name}</Link>
          {lastMonthTop.isProvisional ? ' (참여자 부족으로 잠정)' : ''}
        </p>
      ) : null}

      <AdSlot slot="theme-top" />

      {ranked.length === 0 ? (
        <p className="card text-sm text-ink/60">
          아직 이 가격대에 등록된 항목이 없습니다.{' '}
          <Link href={`/theme/${theme.slug}/item/new`}>첫 항목을 작성해 보세요.</Link>
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {ranked.map((entry) => (
            <li key={entry.item.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="w-8 shrink-0 text-2xl font-extrabold text-ink/25">{entry.rank}</span>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/theme/${theme.slug}/item/${entry.item.slug}`}
                  className="text-base font-semibold no-underline"
                >
                  {entry.item.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-ink/60">{entry.item.description}</p>
                <p className="mt-1 text-xs text-ink/50">
                  {entry.item.priceKrw ? `${entry.item.priceKrw.toLocaleString('ko-KR')}원 · ` : ''}
                  참여 {entry.breakdown.distinctVoters}명 · 유효 찬성비 {(entry.breakdown.upRatio * 100).toFixed(0)}%
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums">{entry.breakdown.score.toFixed(1)}</p>
                <p className="text-xs text-ink/45">점수</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {ranked[0]?.breakdown.isProvisional ? (
        <p className="text-sm text-ink/55">
          참여자가 {RANKING_CONSTANTS.MIN_DISTINCT_VOTERS}명 미만인 가격대의 Top 1은 &lsquo;미정&rsquo;으로 둡니다.
          소수의 표로 1위가 정해지는 것을 막기 위한 장치입니다.
        </p>
      ) : null}

      <p className="text-xs text-ink/40">집계 시각 {monthKey(new Date())} 기준 실시간</p>

      <AdSlot slot="item-bottom" />
    </div>
  );
}
