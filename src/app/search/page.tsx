import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { TierBadge } from '@/components/TierBadge';
import type { Tier } from '@/lib/tier';

export const metadata: Metadata = { title: '검색', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (!query) {
    return <p className="card text-sm text-ink/60">검색어를 입력해 주세요.</p>;
  }

  const contains = { contains: query, mode: 'insensitive' as const };
  const [themes, items] = await Promise.all([
    prisma.theme.findMany({
      where: { OR: [{ name: contains }, { description: contains }] },
      orderBy: { followerCount: 'desc' },
      take: 20,
      select: { slug: true, name: true, status: true, followerCount: true },
    }),
    prisma.item.findMany({
      where: {
        isRemoved: false,
        theme: { status: 'ACTIVE' },
        OR: [{ name: contains }, { description: contains }],
      },
      orderBy: { score: 'desc' },
      take: 30,
      select: {
        slug: true, name: true, tier: true, score: true,
        theme: { select: { slug: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold">
        &lsquo;{query}&rsquo; 검색 결과
      </h1>

      <section>
        <h2 className="mb-2 text-lg font-bold">테마 {themes.length}</h2>
        {themes.length === 0 ? (
          <p className="card text-sm text-ink/60">
            일치하는 테마가 없습니다. <Link href="/themes/new">이 주제로 테마를 제안해 보세요.</Link>
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <li key={theme.slug}>
                <Link href={`/theme/${theme.slug}`} className="btn-ghost no-underline">
                  {theme.name}
                  <span className="ml-2 text-xs text-ink/45">{theme.followerCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">제품 {items.length}</h2>
        {items.length === 0 ? (
          <p className="card text-sm text-ink/60">일치하는 제품 문서가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={`${item.theme.slug}/${item.slug}`} className="card flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/theme/${item.theme.slug}/item/${item.slug}`} className="font-semibold no-underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink/50">
                    <TierBadge tier={item.tier as Tier} />
                    <Link href={`/theme/${item.theme.slug}`} className="text-inherit no-underline">
                      {item.theme.name}
                    </Link>
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
