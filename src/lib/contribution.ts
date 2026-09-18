import type { Prisma } from '@prisma/client';
import { badgeFor, trustFromContributions } from './trust';

/**
 * 기여 1건을 기록하고, 그에 맞춰 신뢰도와 뱃지를 다시 계산한다.
 * 신뢰도는 오직 이 경로로만 바뀐다 — 운영자가 직접 수정하는 API 는 없다.
 */
export async function bumpContribution(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<{ contributionCount: number; trustScore: number }> {
  const { contributionCount } = await tx.user.update({
    where: { id: userId },
    data: { contributionCount: { increment: 1 } },
    select: { contributionCount: true },
  });

  const trustScore = trustFromContributions(contributionCount);

  await tx.user.update({
    where: { id: userId },
    data: { trustScore, badgeLevel: badgeFor(contributionCount) },
  });

  return { contributionCount, trustScore };
}
