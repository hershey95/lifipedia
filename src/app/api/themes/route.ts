import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError, countSince } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { ABUSE_LIMITS, checkRate } from '@/lib/abuse';
import { promotionProgress } from '@/lib/theme-lifecycle';

export const dynamic = 'force-dynamic';

const listQuery = z.object({
  status: z.enum(['PROPOSED', 'ACTIVE', 'DORMANT']).optional(),
  q: z.string().trim().max(60).optional(),
  take: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { status, q, take } = listQuery.parse(Object.fromEntries(url.searchParams));

    const themes = await prisma.theme.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        id: true, slug: true, name: true, description: true,
        status: true, followerCount: true, createdAt: true,
        _count: { select: { items: true } },
      },
    });

    return ok({
      themes: themes.map((t) => ({ ...t, itemCount: t._count.items, promotion: promotionProgress(t.followerCount) })),
    });
  } catch (error) {
    return handleError(error);
  }
}

const createBody = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(500).optional(),
});

/** 누구나 테마를 제안할 수 있다. 승격은 팔로워 수가 결정한다. */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const recent = await countSince(prisma.theme, { proposerId: user.id }, 86_400);
    const rate = checkRate(recent, ABUSE_LIMITS.THEME_PROPOSALS_PER_DAY, 86_400);
    if (!rate.allowed) return fail(429, rate.reason!);

    const body = createBody.parse(await request.json());
    const slug = slugify(body.name);
    if (!slug) return fail(400, '테마 이름에 사용할 수 있는 문자가 없습니다.');

    const existing = await prisma.theme.findUnique({ where: { slug }, select: { slug: true } });
    if (existing) return fail(409, '같은 이름의 테마가 이미 있습니다.', { slug: existing.slug });

    // 제안자는 자동으로 첫 팔로워가 된다.
    const theme = await prisma.theme.create({
      data: {
        slug,
        name: body.name,
        description: body.description,
        proposerId: user.id,
        followerCount: 1,
        followers: { create: { userId: user.id } },
      },
      select: { id: true, slug: true, name: true, status: true, followerCount: true },
    });

    return ok({ theme, promotion: promotionProgress(theme.followerCount) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
