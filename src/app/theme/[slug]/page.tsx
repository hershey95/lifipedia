import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { rankTier } from '@/lib/scoring-service';
import { TIERS, TIER_LABELS, TIER_SLUGS } from '@/lib/tier';
import { promotionProgress, promotionThreshold } from '@/lib/theme-lifecycle';
import { FollowButton } from '@/components/FollowButton';
import { AdSlot } from '@/components/AdSlot';
import { TierBadge } from '@/components/TierBadge';
import { RANKING_CONSTANTS } from '@/lib/ranking';

type Params = { params: Promise<{ slug: string }> };

async function loadTheme(slug: string) {
  return prisma.theme.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: {
      id: true, slug: true, name: true, description: true, status: true,
      followerCount: true, createdAt: true,
      proposer: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const theme = await loadTheme(slug);
  if (!theme) return { title: '테마를 찾을 수 없음' };

  return {
    title: theme.name,
    description: theme.description ?? `${theme.name} — 저가·중가·고가별 Top 1을 유저 추천으로 가립니다.`,
    alternates: { canonical: `/theme/${theme.slug}` },
  };
}

export default async function ThemePage({ params }: Params) {
  const { slug } = await params;
  const theme = await loadTheme(slug);
  if (!theme) notFound();

  const me = await currentUser();
  const [following, tierTops] = await Promise.all([
    me
      ? prisma.themeFollow.findUnique({
          where: { themeId_userId: { themeId: theme.id, userId: me.id } },
          select: { themeId: true },
        })
      : Promise.resolve(null),
    Promise.all(TIERS.map((tier) => rankTier({ themeId: theme.id, tier, limit: 3 }))),
  ]);

  const progress = promotionProgress(theme.followerCount, promotionThreshold());
  const isActive = theme.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">{theme.name}</h1>
            <StatusChip status={theme.status} />
          </div>
          {theme.description ? <p className="mt-2 max-w-2xl text-ink/70">{theme.description}</p> : null}
          <p className="mt-2 text-xs text-ink/50">
            제안: {theme.proposer?.name ?? '탈퇴한 사용자'} · 항목 {theme._count.items.toLocaleString('ko-KR')}개
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <FollowButton
            themeSlug={theme.slug}
            initialFollowing={Boolean(following)}
            initialCount={theme.followerCount}
            threshold={progress.threshold}
            status={theme.status}
          />
          {isActive ? (
            <Link href={`/theme/${theme.slug}/item/new`} className="btn-ghost no-underline">
              제품 위키 작성
            </Link>
          ) : null}
        </div>
      </header>

      {theme.status === 'PROPOSED' ? (
        <div className="card bg-accent/5">
          <p className="text-sm">
            이 테마는 아직 <strong>제안 단계</strong>입니다. 팔로워 {progress.threshold}명을 모으면 자동으로
            정식 승격되어 위키 작성과 순위 산정이 열립니다. 현재 {progress.followerCount}명 —{' '}
            <strong>{progress.remaining}명</strong> 남았습니다.
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
      ) : null}

      {theme.status === 'DORMANT' ? (
        <p className="card bg-black/[0.03] text-sm text-ink/70">
          활동이 없어 휴면 처리된 테마입니다. 다시 팔로우가 모이면 활성화됩니다.
        </p>
      ) : null}

      <AdSlot slot="theme-top" />

      {isActive ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">가격대별 순위</h2>
            <Link href="/how-ranking-works" className="text-sm">순위는 어떻게 정해지나요?</Link>
          </div>

          {TIERS.map((tier, index) => {
            const ranked = tierTops[index];
            return (
              <div key={tier}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold">
                    <TierBadge tier={tier} /> {TIER_LABELS[tier]} Top 3
                  </h3>
                  <Link href={`/theme/${theme.slug}/${TIER_SLUGS[tier]}`} className="text-sm">전체 보기</Link>
                </div>

                {ranked.length === 0 ? (
                  <p className="card text-sm text-ink/60">
                    아직 등록된 항목이 없습니다.{' '}
                    <Link href={`/theme/${theme.slug}/item/new`}>첫 항목을 작성해 보세요.</Link>
                  </p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {ranked.map((entry) => (
                      <li key={entry.item.id} className="card flex items-center gap-3">
                        <span className="w-6 shrink-0 text-center text-lg font-extrabold text-ink/30">{entry.rank}</span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/theme/${theme.slug}/item/${entry.item.slug}`}
                            className="block truncate font-semibold no-underline"
                          >
                            {entry.item.name}
                          </Link>
                          <p className="text-xs text-ink/50">
                            {entry.item.priceKrw ? `${entry.item.priceKrw.toLocaleString('ko-KR')}원 · ` : ''}
                            참여 {entry.breakdown.distinctVoters}명 · 점수 {entry.breakdown.score.toFixed(1)}
                          </p>
                        </div>
                        {entry.rank === 1 && entry.breakdown.isProvisional ? (
                          <span className="chip bg-black/5 text-ink/50">미정</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}

                {ranked[0]?.breakdown.isProvisional ? (
                  <p className="mt-1 text-xs text-ink/50">
                    참여자가 {RANKING_CONSTANTS.MIN_DISTINCT_VOTERS}명 미만이라 Top 1은 아직 &lsquo;미정&rsquo;입니다.
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <AdSlot slot="theme-inline" />
    </div>
  );
}

function StatusChip({ status }: { status: 'PROPOSED' | 'ACTIVE' | 'DORMANT' }) {
  const map = {
    PROPOSED: ['제안됨', 'bg-mid/10 text-mid'],
    ACTIVE: ['정식', 'bg-budget/10 text-budget'],
    DORMANT: ['휴면', 'bg-black/10 text-ink/50'],
  } as const;
  const [label, className] = map[status];
  return <span className={`chip ${className}`}>{label}</span>;
}
