import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const body = z.object({
  targetType: z.enum(['ITEM', 'COMMENT', 'THEME']),
  targetId: z.string().min(1),
  reason: z.enum(['SPAM', 'ADVERTISING', 'VOTE_MANIPULATION', 'ABUSIVE', 'COPYRIGHT', 'OTHER']),
  detail: z.string().trim().max(2_000).optional(),
});

/** 신고 접수. 운영자는 '규칙 위반'만 처리하고 콘텐츠의 옳고 그름은 판단하지 않는다. */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');

    const payload = body.parse(await request.json());

    const duplicate = await prisma.report.findFirst({
      where: { targetId: payload.targetId, reporterId: user.id, status: 'OPEN' },
      select: { id: true },
    });
    if (duplicate) return ok({ report: { id: duplicate.id }, alreadyReported: true });

    const report = await prisma.report.create({
      data: { ...payload, reporterId: user.id },
      select: { id: true, status: true },
    });

    return ok({ report }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
