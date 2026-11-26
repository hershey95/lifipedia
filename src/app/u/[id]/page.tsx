import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { badgeFor, trustFromContributions } from '@/lib/trust';
import { TierBadge } from '@/components/TierBadge';
import { OwnProfileLink } from '@/components/AuthButton';
import type { Tier } from '@/lib/tier';
import { revertedRevisions } from '@/lib/revision';

export const metadata: Metadata = { title: '프로필', robots: { index: false } };

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, image: true, bio: true, createdAt: true,
      trustScore: true, contributionCount: true, badgeLevel: true,
      _count: { select: { createdItems: true, edits: true, votes: true, proposedThemes: true } },
      createdItems: {
        where: { isRemoved: false },
        orderBy: { score: 'desc' },
        take: 10,
        select: { slug: true, name: true, tier: true, score: true, theme: { select: { slug: true, name: true } } },
      },
    },
  });
  if (!user) notFound();

  const edits = await prisma.editHistory.findMany({
    where: { editorId: user.id, item: { isRemoved: false } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 20,
    select: {
      id: true, itemId: true, revision: true, revertOfRevision: true, summary: true, createdAt: true,
      item: { select: { name: true, slug: true, theme: { select: { slug: true } } } },
    },
  });
  // "되돌려짐"은 저장하지 않고 해당 문서들의 되돌리기 이력에서 계산한다.
  // ponytail: 최대 20개 문서의 되돌리기 이력 전부를 읽는다. 문서당 수백 건이 되면 가장 오래된 표시 리비전 이후만 읽는다.
  const reverts = edits.length
    ? await prisma.editHistory.findMany({
        where: { itemId: { in: [...new Set(edits.map((e) => e.itemId))] }, revertOfRevision: { not: null } },
        select: { itemId: true, revision: true, revertOfRevision: true },
      })
    : [];
  const reverted = new Map(
    edits.map((e) => [e.itemId, revertedRevisions(reverts.filter((r) => r.itemId === e.itemId))]),
  );

  const stats = [
    { label: '작성한 문서', value: user._count.createdItems },
    { label: '편집', value: user._count.edits },
    { label: '투표', value: user._count.votes },
    { label: '제안한 테마', value: user._count.proposedThemes },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold">{user.name ?? '이름 없는 사용자'}</h1>
          <span className="chip bg-accent/10 text-accent-fg">{user.badgeLevel}</span>
          <OwnProfileLink profileId={user.id} />
        </div>
        {user.bio ? <p className="mt-2 text-sm text-slate-300">{user.bio}</p> : null}
        <p className="mt-2 text-xs text-slate-400">
          가입 {user.createdAt.toISOString().slice(0, 10)} · 신뢰도 {user.trustScore.toFixed(2)} · 기여{' '}
          {user.contributionCount.toLocaleString('ko-KR')}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          신뢰도는 기여 수로만 계산됩니다 (= min(1 + log10(1 + {user.contributionCount}),
          상한) = {trustFromContributions(user.contributionCount).toFixed(2)}, 뱃지{' '}
          {badgeFor(user.contributionCount)}). <Link href="/how-ranking-works">산정 방식</Link>
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card text-center">
            <dt className="text-xs text-slate-400">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{stat.value.toLocaleString('ko-KR')}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-lg font-bold">최근 기여</h2>
        {edits.length === 0 ? (
          <p className="card text-sm text-fg-muted">아직 기여가 없습니다.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
            {edits.map((e) => {
              const href = `/theme/${e.item.theme.slug}/item/${e.item.slug}`;
              return (
                <li key={e.id} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 break-words px-4 py-3 text-sm">
                  <time className="text-xs text-fg-muted" dateTime={e.createdAt.toISOString()}>
                    {e.createdAt.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </time>
                  <Link href={href} className="font-semibold">{e.item.name}</Link>
                  <Link href={`${href}/history`} className="text-xs" aria-label={`${e.item.name} 리비전 ${e.revision} 이력`}>
                    r{e.revision}
                  </Link>
                  {e.revision === 1 ? <span className="text-xs text-fg-muted">새 문서</span> : null}
                  {e.revertOfRevision !== null ? <span className="text-xs text-fg-muted">되돌리기</span> : null}
                  {reverted.get(e.itemId)?.has(e.revision) ? <span className="text-xs text-warn-fg">되돌려짐</span> : null}
                  {e.summary ? <span className="text-fg-muted [overflow-wrap:anywhere]">— {e.summary}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">작성한 문서</h2>
        {user.createdItems.length === 0 ? (
          <p className="card text-sm text-slate-400">아직 작성한 문서가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.createdItems.map((item) => (
              <li key={`${item.theme.slug}/${item.slug}`} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/theme/${item.theme.slug}/item/${item.slug}`} className="font-semibold no-underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <TierBadge tier={item.tier as Tier} /> {item.theme.name}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums text-slate-400">{item.score.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
