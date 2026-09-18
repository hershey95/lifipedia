import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const body = z.object({
  bodyText: z.string().trim().min(1).max(5_000),
  parentId: z.string().cuid().optional(),
});

/** 토론(talk) 문서 — 편집 근거와 반박이 오가는 곳. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: itemId } = await ctx.params;
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const payload = body.parse(await request.json());

    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, isRemoved: true } });
    if (!item || item.isRemoved) return fail(404, '항목을 찾을 수 없습니다.');

    if (payload.parentId) {
      const parent = await prisma.talkComment.findUnique({
        where: { id: payload.parentId },
        select: { itemId: true },
      });
      if (!parent || parent.itemId !== itemId) return fail(400, '답글 대상을 찾을 수 없습니다.');
    }

    const comment = await prisma.talkComment.create({
      data: { itemId, authorId: user.id, parentId: payload.parentId, body: payload.bodyText },
      select: { id: true, body: true, createdAt: true, parentId: true },
    });

    return ok({ comment }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
