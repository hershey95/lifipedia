import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const body = z.strictObject({ all: z.literal(true) });

/** 내 안 읽은 알림을 모두 읽음 처리한다. 개별 읽음은 두지 않는다(W45 5.4). */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    body.parse(await request.json().catch(() => null));
    const { count } = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return ok({ updated: count });
  } catch (error) {
    return handleError(error);
  }
}
