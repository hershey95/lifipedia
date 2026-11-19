import { prisma } from '@/lib/db';
import { extractWikiLinks, type WikiResolver } from '@/lib/markdown';

/** 여러 본문의 `[[제목]]` 을 한 번의 쿼리로 해석한다. 이름은 앞뒤 공백을 자른 정확 일치. */
export async function buildWikiResolver(sources: (string | null | undefined)[]): Promise<WikiResolver> {
  const titles = [...new Set(sources.flatMap((s) => (s ? extractWikiLinks(s) : [])))];
  const found = titles.length
    ? await prisma.item.findMany({
        where: { name: { in: titles }, isRemoved: false },
        select: { name: true, slug: true, theme: { select: { slug: true } } },
        take: 500,
      })
    : [];
  const byName = new Map<string, { slug: string; theme: { slug: string } }[]>();
  for (const it of found) byName.set(it.name, [...(byName.get(it.name) ?? []), it]);

  return (title) => {
    const hits = byName.get(title) ?? [];
    if (hits.length === 0) return { kind: 'none' };
    if (hits.length === 1) return { kind: 'one', href: `/theme/${hits[0].theme.slug}/item/${hits[0].slug}` };
    return { kind: 'many', href: `/search?q=${encodeURIComponent(title)}&same=1` };
  };
}

/** 이 문서를 `[[이름]]` 으로 가리키는 문서. */
// ponytail: LIKE 전수 탐색, 문서 1만 개를 넘으면 링크 테이블(W50+)
export async function findBacklinks(item: { id: string; name: string }) {
  return prisma.item.findMany({
    where: { id: { not: item.id }, isRemoved: false, description: { contains: `[[${item.name}]]` } },
    select: { name: true, slug: true, theme: { select: { slug: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
}
