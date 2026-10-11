import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { profileBody } from '@/lib/me';

export const dynamic = 'force-dynamic';

/** 내 프로필(이름·소개) 수정. 대상 id 는 세션에서만 얻고, 요청 본문을 그대로 DB 에 넘기지 않는다. */
export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const body = profileBody.parse(await request.json().catch(() => null));

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.bio !== undefined && { bio: body.bio || null }),
      },
      select: { name: true, bio: true },
    });

    revalidatePath(`/u/${user.id}`);
    return ok(updated);
  } catch (error) {
    return handleError(error);
  }
}
