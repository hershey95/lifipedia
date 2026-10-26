import { prisma } from '@/lib/db';
import { rankTier } from '@/lib/scoring-service';
import {
  PROTECTION_RULES,
  requiredProtection,
  type ProtectionLevel,
  type ProtectionReason,
  type ProtectionSignals,
} from '@/lib/protection';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 보호 신호를 모아 단계를 계산한다. 계산 규칙은 protection.ts, 여기는 쿼리만. */
export async function loadProtection(
  item: { id: string; themeId: string; tier: 'BUDGET' | 'MID' | 'PREMIUM' },
  now: Date = new Date(),
): Promise<{ level: ProtectionLevel; reasons: ProtectionReason[]; signals: ProtectionSignals }> {
  const R = PROTECTION_RULES;
  const [recentReverts, top, reporters] = await Promise.all([
    prisma.editHistory.count({
      where: {
        itemId: item.id,
        revertOfRevision: { not: null },
        createdAt: { gte: new Date(now.getTime() - R.EDIT_WAR_WINDOW_HOURS * HOUR_MS) },
      },
    }),
    // 갤러리 화면이 1위를 정하는 함수와 같은 것을 쓴다.
    // ponytail: 가격대 전체의 표를 읽는다. 가격대당 문서가 수백 개가 되면 Item.score 근사로 바꾼다.
    rankTier({ themeId: item.themeId, tier: item.tier, asOf: now, limit: 1 }),
    // 자동 신고(reporterId null)와 신규 계정 신고는 세지 않는다.
    prisma.report.findMany({
      where: {
        targetType: 'ITEM',
        targetId: item.id,
        status: 'OPEN',
        reporterId: { not: null },
        reporter: { createdAt: { lte: new Date(now.getTime() - R.SEMI_MIN_ACCOUNT_DAYS * DAY_MS) } },
      },
      distinct: ['reporterId'],
      select: { reporterId: true },
    }),
  ]);
  const signals: ProtectionSignals = {
    recentReverts,
    isTopRank: top[0]?.item.id === item.id && !top[0].breakdown.isProvisional,
    openReporters: reporters.length,
  };
  return { ...requiredProtection(signals), signals };
}
