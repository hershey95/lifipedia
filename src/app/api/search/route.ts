import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const query = z.object({
  q: z.string().trim().min(1).max(60),
  take: z.coerce.number().int().min(1).max(30).default(10),
});

/** 테마명 + 제품명 통합 검색. */
export async function GET(request: Request) {
  try {
    const { q, take } = query.parse(Object.fromEntries(new URL(request.url).searchParams));
    const contains = { contains: q, mode: 'insensitive' as const };

    const [themes, items] = await Promise.all([
      prisma.theme.findMany({
        where: { OR: [{ name: contains }, { description: contains }] },
        orderBy: { followerCount: 'desc' },
        take,
        select: { slug: true, name: true, status: true, followerCount: true },
      }),
      prisma.item.findMany({
        where: { isRemoved: false, theme: { status: 'ACTIVE' }, OR: [{ name: contains }, { description: contains }] },
        orderBy: { score: 'desc' },
        take,
        select: {
          slug: true, name: true, tier: true, score: true, imageUrl: true,
          theme: { select: { slug: true, name: true } },
        },
      }),
    ]);

    return ok({ query: q, themes, items });
  } catch (error) {
    return handleError(error);
  }
}
