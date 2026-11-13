import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ok, fail, handleError } from '@/lib/api';
import { VIEW_RULES, VIEW_TARGETS, createIpLimiter, isBotUa, markHash, viewDay } from '@/lib/views';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ targetType: z.enum(VIEW_TARGETS), targetId: z.string().min(1).max(64) });
const allow = createIpLimiter(VIEW_RULES.IP_LIMIT_PER_MINUTE, 60_000);

/** 조회 1회 기록. 봇·중복·한도 초과는 조용히 무시(202)한다. 방문자 식별은 익명 쿠키 vid 해시뿐이다. */
export async function POST(request: Request) {
  try {
    const { targetType, targetId } = bodySchema.parse(await request.json());
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isBotUa(request.headers.get('user-agent'))) return ok({ counted: false }, { status: 202 });
    if (!allow(ip)) return fail(429, '요청이 너무 잦습니다.');

    const cookieVid = /(?:^|;\s*)vid=([\w-]{16,64})/.exec(request.headers.get('cookie') ?? '')?.[1];
    const vid = cookieVid ?? randomUUID();
    const exists =
      targetType === 'THEME'
        ? await prisma.theme.count({ where: { id: targetId } })
        : await prisma.item.count({ where: { id: targetId, isRemoved: false } });
    let counted = false;
    if (exists) {
      const day = viewDay();
      try {
        await prisma.$transaction([
          prisma.viewMark.create({ data: { hash: markHash(vid, day, targetType, targetId) } }),
          prisma.pageView.upsert({
            where: { day_targetType_targetId: { day, targetType, targetId } },
            create: { day, targetType, targetId, count: 1 },
            update: { count: { increment: 1 } },
          }),
        ]);
        counted = true;
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e; // 같은 날 이미 센 방문
      }
    }
    const res = ok({ counted }, { status: 202 });
    if (!cookieVid) {
      res.headers.append('Set-Cookie', `vid=${vid}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`);
    }
    return res;
  } catch (error) {
    return handleError(error);
  }
}
