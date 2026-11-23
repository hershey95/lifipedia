import { prisma } from '@/lib/db';
import { extractWikiLinks, type WikiResolver } from '@/lib/markdown';

/** 여러 본문의 `[[제목]]` 을 한 번의 쿼리로 해석한다. 이름은 앞뒤 공백을 자른 정확 일치. */
export async function buildWikiResolver(sources: (string | null | undefined)[]): Promise<WikiResolver> {
  const titles = [...new Set(sources.flatMap((s) => (s ? extractWikiLinks(s) : [])))];
  const found = titles.length
    ? await prisma.item.findMany({
        where: { name: { in: titles }, isRemoved: false, theme: { status: 'ACTIVE' } },
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

/** 이름이 정확히 같은 (삭제되지 않은, ACTIVE 분류의) 문서가 있는가. `missing=1` 판정용. */
export async function itemNameExists(name: string): Promise<boolean> {
  const hit = await prisma.item.findFirst({
    where: { name, isRemoved: false, theme: { status: 'ACTIVE' } },
    select: { id: true },
  });
  return hit !== null;
}

/** 이 문서를 `[[이름]]` 으로 가리키는 문서. */
// ponytail: LIKE 전수 탐색, 문서 3천 개 또는 응답 1초를 넘으면 링크 테이블(W50+). `[[ 이름 ]]` 처럼 공백이 낀 링크는 못 찾는다.
export async function findBacklinks(item: { id: string; name: string }) {
  const needle = `[[${item.name}]]`;
  return prisma.item.findMany({
    where: {
      id: { not: item.id },
      isRemoved: false,
      theme: { status: 'ACTIVE' },
      OR: [
        { description: { contains: needle } },
        { specSummary: { contains: needle } },
        { recommendReason: { contains: needle } },
      ],
    },
    select: { name: true, slug: true, theme: { select: { slug: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
}
