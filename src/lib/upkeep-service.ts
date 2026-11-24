import { prisma } from '@/lib/db';
import { countWanted, stubReasons, type StubReason } from '@/lib/upkeep';

const BATCH = 300;
// ponytail: 전 문서 스캔(300개씩, 최대 3000개). 3천 개를 넘으면 링크 테이블(W50+).
const MAX_SCAN = 3000;
const LIST = 20;

export type UpkeepDoc = { name: string; href: string; gallery: string };
export type Upkeep = {
  stubs: (UpkeepDoc & { reasons: StubReason[] })[];
  wanted: { title: string; count: number }[];
  singleRevision: UpkeepDoc[];
  scanned: number;
};

/** `category` 는 분류 갤러리(Theme) slug. 만들어 주세요의 "이미 있는 제목"은 분류와 무관하게 전체 기준이다. */
export async function loadUpkeep(category: string | null): Promise<Upkeep> {
  const existing = new Set<string>();
  const texts: string[] = [];
  const stubs: Upkeep['stubs'] = [];
  const singleRevision: UpkeepDoc[] = [];
  let scanned = 0;
  let cursor: string | undefined;

  while (scanned < MAX_SCAN) {
    const rows = await prisma.item.findMany({
      where: { isRemoved: false, theme: { status: 'ACTIVE' } },
      select: {
        id: true, name: true, slug: true, description: true, specSummary: true, recommendReason: true,
        priceKrw: true, imageUrl: true, revision: true,
        theme: { select: { slug: true, name: true } },
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      existing.add(r.name);
      if (category && r.theme.slug !== category) continue;
      const doc = { name: r.name, href: `/theme/${r.theme.slug}/item/${r.slug}`, gallery: r.theme.name };
      texts.push([r.description, r.specSummary, r.recommendReason].filter(Boolean).join('\n'));
      const reasons = stubReasons(r);
      if (reasons.length && stubs.length < LIST) stubs.push({ ...doc, reasons });
      if (r.revision === 1 && singleRevision.length < LIST) singleRevision.push(doc);
    }
    scanned += rows.length;
    cursor = rows[rows.length - 1].id;
    if (rows.length < BATCH) break;
  }

  return { stubs, wanted: countWanted(texts, existing, LIST), singleRevision, scanned };
}
