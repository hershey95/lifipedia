import { z } from 'zod';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api';
import { uniqueSlug } from '@/lib/slug';
import { validateTierAgainstPeers } from '@/lib/tier';
import { canContribute } from '@/lib/theme-lifecycle';
import { toSnapshot, buildDiff } from '@/lib/wiki';
import { bumpContribution } from '@/lib/contribution';

export const dynamic = 'force-dynamic';

const purchaseLink = z.object({ label: z.string().trim().min(1).max(40), url: z.string().url() });

const createBody = z.object({
  themeSlug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  tier: z.enum(['BUDGET', 'MID', 'PREMIUM']),
  priceKrw: z.number().int().min(0).max(1_000_000_000).optional(),
  description: z.string().trim().min(10).max(20_000),
  specSummary: z.string().trim().max(5_000).optional(),
  recommendReason: z.string().trim().max(5_000).optional(),
  imageUrl: z.string().url().optional(),
  purchaseLinks: z.array(purchaseLink).max(8).default([]),
  /** 가격대 검증 경고를 유저가 확인하고 그대로 진행할 때 true */
  confirmTier: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return fail(401, '로그인이 필요합니다.');
    if (isSuspended(user)) return fail(403, '제재 중인 계정입니다.');

    const body = createBody.parse(await request.json());

    const theme = await prisma.theme.findUnique({
      where: { slug: body.themeSlug },
      select: { id: true, status: true },
    });
    if (!theme) return fail(404, '테마를 찾을 수 없습니다.');
    if (!canContribute(theme.status)) {
      return fail(403, '정식 승격된 테마에서만 위키를 작성할 수 있습니다.', { status: theme.status });
    }

    const siblings = await prisma.item.findMany({
      where: { themeId: theme.id },
      select: { slug: true, priceKrw: true },
    });

    // 가격대 태깅 검증: 같은 테마의 가격 분포와 크게 어긋나면 한 번 되묻는다.
    if (body.priceKrw !== undefined && !body.confirmTier) {
      const peers = siblings.map((s) => s.priceKrw).filter((p): p is number => p !== null);
      const check = validateTierAgainstPeers(body.priceKrw, body.tier, peers);
      if (!check.ok) {
        return fail(409, check.message, { needsTierConfirmation: true, suggestion: check.suggestion });
      }
    }

    const slug = uniqueSlug(body.name, new Set(siblings.map((s) => s.slug)));

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          themeId: theme.id,
          slug,
          name: body.name,
          tier: body.tier,
          priceKrw: body.priceKrw,
          description: body.description,
          specSummary: body.specSummary,
          recommendReason: body.recommendReason,
          imageUrl: body.imageUrl,
          purchaseLinks: body.purchaseLinks,
          createdById: user.id,
        },
      });

      // 최초 리비전도 이력에 남긴다 (되돌리기 기준점).
      const snapshot = toSnapshot(created as unknown as Record<string, unknown>);
      const empty = toSnapshot({});
      await tx.editHistory.create({
        data: {
          itemId: created.id,
          editorId: user.id,
          revision: 1,
          summary: '문서 생성',
          diff: buildDiff(empty, snapshot, 0, 1),
          snapshot: snapshot as unknown as object,
        },
      });

      await tx.theme.update({ where: { id: theme.id }, data: { lastActivityAt: new Date() } });

      await bumpContribution(tx, user.id);

      return created;
    });

    return ok({ item: { id: item.id, slug: item.slug, themeSlug: body.themeSlug } }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
