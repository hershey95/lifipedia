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
import { FEED_ORDER_BY, feedHref, parseFeedParams } from '@/lib/feed';

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LIST_MAX = 100;
const fmt = (d: Date) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });

async function loadTheme(slug: string) {
  return prisma.theme.findUnique({
    where: { slug: decodeURIComponent(slug) },
    select: {
      id: true, slug: true, name: true, description: true, status: true, category: true,
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

export default async function ThemePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const theme = await loadTheme(slug);
  if (!theme) notFound();
  const { tab, sort, tier: tierFilter } = parseFeedParams(await searchParams);

  const me = await currentUser();
  const itemWhere = { themeId: theme.id, isRemoved: false };
  const [following, tierTops, listItems, talkRows, recent] = await Promise.all([
    me
      ? prisma.themeFollow.findUnique({
          where: { themeId_userId: { themeId: theme.id, userId: me.id } },
          select: { themeId: true },
        })
      : Promise.resolve(null),
    tab === 'rank'
      ? Promise.all(TIERS.map((tier) => rankTier({ themeId: theme.id, tier, limit: 3 })))
      : Promise.resolve([]),
    tab === 'list'
      ? prisma.item.findMany({
          where: { ...itemWhere, ...(tierFilter && { tier: tierFilter }) },
          orderBy: [...FEED_ORDER_BY[sort]],
          take: LIST_MAX,
          select: {
            id: true, slug: true, name: true, tier: true, priceKrw: true, upCount: true, updatedAt: true,
            _count: { select: { comments: { where: { isRemoved: false } } } },
          },
        })
      : Promise.resolve([]),
    tab === 'talk'
      ? prisma.talkComment.findMany({
          where: { isRemoved: false, item: itemWhere },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 20,
          select: {
            id: true, body: true, createdAt: true,
            author: { select: { name: true } },
            item: { select: { name: true, slug: true } },
          },
        })
      : Promise.resolve([]),
    prisma.editHistory.findMany({
      where: { item: itemWhere },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: { id: true, revision: true, createdAt: true, item: { select: { name: true, slug: true } } },
    }),
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
            {theme.category ? (
              <>
                <Link href={`/themes?category=${encodeURIComponent(theme.category)}`}>#{theme.category}</Link> ·{' '}
              </>
            ) : null}
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
        <nav aria-label="갤러리 보기" className="flex gap-4 border-b border-white/10 pb-2 text-sm">
          {(
            [
              ['rank', '순위'],
              ['list', '목록'],
              ['talk', '토론'],
            ] as const
          ).map(([t, label]) => (
            <Link
              key={t}
              href={feedHref(theme.slug, { tab: t })}
              aria-current={tab === t ? 'page' : undefined}
              className={tab === t ? 'font-bold' : ''}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      {isActive && tab === 'list' ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink/60">정렬</span>
              {(['hot', 'new', 'top'] as const).map((s) => (
                <Link
                  key={s}
                  href={feedHref(theme.slug, { tab: 'list', sort: s, tier: tierFilter })}
                  aria-current={sort === s ? 'page' : undefined}
                  className={sort === s ? 'font-bold' : ''}
                >
                  {{ hot: '인기', new: '최신', top: '추천순' }[s]}
                </Link>
              ))}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-ink/60">가격대</span>
              {[null, ...TIERS].map((t) => (
                <Link
                  key={t ?? 'all'}
                  href={feedHref(theme.slug, { tab: 'list', sort, tier: t })}
                  aria-current={tierFilter === t ? 'page' : undefined}
                  className={tierFilter === t ? 'font-bold' : ''}
                >
                  {t ? TIER_LABELS[t] : '전체'}
                </Link>
              ))}
            </p>
          </div>
          <p className="text-xs text-ink/50">인기 = 마지막 투표 시점의 점수입니다. 순위 탭과 순서가 다를 수 있습니다.</p>
          {listItems.length === 0 ? (
            <p className="card text-sm text-ink/60">
              아직 문서가 없습니다. <Link href={`/theme/${theme.slug}/item/new`}>첫 항목을 작성해 보세요.</Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{theme.name} 문서 목록</caption>
                <thead className="text-left text-xs text-ink/60">
                  <tr>
                    <th scope="col" className="py-1 pr-2">번호</th>
                    <th scope="col" className="py-1 pr-2">가격대</th>
                    <th scope="col" className="py-1 pr-2">제품</th>
                    <th scope="col" className="py-1 pr-2 text-right">가격</th>
                    <th scope="col" className="py-1 pr-2 text-right">추천</th>
                    <th scope="col" className="py-1">수정일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {listItems.map((it, i) => (
                    <tr key={it.id}>
                      <td className="py-2 pr-2 tabular-nums text-ink/50">{i + 1}</td>
                      <td className="py-2 pr-2"><TierBadge tier={it.tier} /></td>
                      <td className="py-2 pr-2">
                        <Link href={`/theme/${theme.slug}/item/${it.slug}`} className="font-semibold">{it.name}</Link>{' '}
                        <Link href={`/theme/${theme.slug}/item/${it.slug}/talk`} className="text-xs text-ink/50">
                          [{it._count.comments}]
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {it.priceKrw ? `${it.priceKrw.toLocaleString('ko-KR')}원` : '-'}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{it.upCount.toLocaleString('ko-KR')}</td>
                      <td className="py-2 text-xs text-ink/60">{fmt(it.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {listItems.length >= LIST_MAX ? (
            <p className="text-xs text-ink/50">상위 {LIST_MAX}개만 표시합니다.</p>
          ) : null}
        </section>
      ) : null}

      {isActive && tab === 'talk' ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">최근 토론</h2>
          {talkRows.length === 0 ? (
            <p className="card text-sm text-ink/60">아직 토론이 없습니다.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
              {talkRows.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <Link href={`/theme/${theme.slug}/item/${c.item.slug}/talk`} className="font-semibold">{c.item.name}</Link>
                  <span className="text-xs text-ink/50">
                    {' '}· {c.author?.name ?? '탈퇴한 사용자'} · {fmt(c.createdAt)}
                  </span>
                  <p className="mt-1 text-ink/70 [overflow-wrap:anywhere]">
                    {c.body.length > 120 ? `${c.body.slice(0, 120)}…` : c.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {isActive && tab === 'rank' ? (
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

      <section aria-labelledby="recent-h">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="recent-h" className="text-sm font-bold">최근 변경</h2>
          <Link href="/recent" className="text-xs">전체 보기</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-ink/50">아직 변경이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs text-ink/70">
            {recent.map((r) => (
              <li key={r.id}>
                <time dateTime={r.createdAt.toISOString()}>{fmt(r.createdAt)}</time> ·{' '}
                <Link href={`/theme/${theme.slug}/item/${r.item.slug}`}>{r.item.name}</Link> r{r.revision}
              </li>
            ))}
          </ul>
        )}
      </section>

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
