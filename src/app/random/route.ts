import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9가-힣-]{1,80}$/i;

/** 무작위 문서로 307. `?category=` 는 분류 갤러리 slug. */
export async function GET(request: Request) {
  const category = new URL(request.url).searchParams.get('category');
  const where = {
    isRemoved: false,
    theme: { status: 'ACTIVE' as const, ...(category && SLUG.test(category) ? { slug: category } : {}) },
  };

  const total = await prisma.item.count({ where });
  const [item] = total
    ? await prisma.item.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: Math.floor(Math.random() * total),
        take: 1,
        select: { slug: true, theme: { select: { slug: true } } },
      })
    : [];

  // 문서가 없으면(또는 그 사이 사라졌으면) 기여할 거리로.
  redirect(item ? `/theme/${encodeURIComponent(item.theme.slug)}/item/${encodeURIComponent(item.slug)}` : '/contribute');
}
