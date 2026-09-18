import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { badgeFor, trustFromContributions } from '@/lib/trust';
import { TierBadge } from '@/components/TierBadge';
import type { Tier } from '@/lib/tier';

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
          <span className="chip bg-accent/10 text-accent">{user.badgeLevel}</span>
        </div>
        {user.bio ? <p className="mt-2 text-sm text-ink/70">{user.bio}</p> : null}
        <p className="mt-2 text-xs text-ink/50">
          가입 {user.createdAt.toISOString().slice(0, 10)} · 신뢰도 {user.trustScore.toFixed(2)} · 기여{' '}
          {user.contributionCount.toLocaleString('ko-KR')}
        </p>
        <p className="mt-2 text-xs text-ink/45">
          신뢰도는 기여 수로만 계산됩니다 (= min(1 + log10(1 + {user.contributionCount}),
          상한) = {trustFromContributions(user.contributionCount).toFixed(2)}, 뱃지{' '}
          {badgeFor(user.contributionCount)}). <Link href="/how-ranking-works">산정 방식</Link>
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card text-center">
            <dt className="text-xs text-ink/50">{stat.label}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{stat.value.toLocaleString('ko-KR')}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 text-lg font-bold">작성한 문서</h2>
        {user.createdItems.length === 0 ? (
          <p className="card text-sm text-ink/60">아직 작성한 문서가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.createdItems.map((item) => (
              <li key={`${item.theme.slug}/${item.slug}`} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/theme/${item.theme.slug}/item/${item.slug}`} className="font-semibold no-underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink/50">
                    <TierBadge tier={item.tier as Tier} /> {item.theme.name}
                  </p>
                </div>
                <span className="text-sm font-bold tabular-nums text-ink/60">{item.score.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
