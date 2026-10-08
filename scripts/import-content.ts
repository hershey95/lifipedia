/**
 * 조사 결과 JSON(content/*.json)을 위키 아이템으로 등록한다. 시드와 달리 DB 를 지우지 않고,
 * 투표도 만들지 않는다(순위는 실제 유저 투표로만 결정). 이미 있는 아이템은 건너뛴다.
 *   npm run content:import -- content/camping.json
 *   npm run content:import -- content/camping.json --dry
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/lib/slug';
import { TIERS, type Tier } from '../src/lib/tier';
import { buildDiff, toSnapshot } from '../src/lib/wiki';

type Source = { title: string; url: string; accessedAt: string };
type RawItem = {
  name: string;
  tier: Tier;
  priceKrw: number | null;
  specSummary: string | null;
  description: string;
  recommendReason: string | null;
  sources: Source[];
  purchaseLinks: { label: string; url: string }[];
};

const prisma = new PrismaClient();
const dry = process.argv.includes('--dry');

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('사용법: npm run content:import -- content/<파일>.json [--dry]');
  const data = JSON.parse(readFileSync(file, 'utf8')) as { gallery: string; items: RawItem[] };

  const theme = await prisma.theme.findUnique({ where: { slug: slugify(data.gallery) } });
  if (!theme) throw new Error(`갤러리를 찾을 수 없음: ${data.gallery}`);

  for (const raw of data.items) {
    if (!raw.name || !TIERS.includes(raw.tier)) throw new Error(`잘못된 항목: ${JSON.stringify(raw.name)}`);
    const slug = slugify(raw.name);
    const exists = await prisma.item.findUnique({ where: { themeId_slug: { themeId: theme.id, slug } } });
    if (exists) {
      console.log(`[skip] 이미 있음: ${raw.name}`);
      continue;
    }
    const refs = raw.sources.map((s) => `- [${s.title}](${s.url}) (확인 ${s.accessedAt})`).join('\n');
    const description = `${raw.description.trim()}\n\n## 출처\n${refs}`;
    if (dry) {
      console.log(`[dry] ${raw.tier} ${raw.priceKrw ?? '-'}원 ${raw.name}`);
      continue;
    }
    const item = await prisma.item.create({
      data: {
        themeId: theme.id,
        slug,
        name: raw.name,
        tier: raw.tier,
        priceKrw: raw.priceKrw,
        description,
        specSummary: raw.specSummary,
        recommendReason: raw.recommendReason,
        purchaseLinks: raw.purchaseLinks,
      },
    });
    const snapshot = toSnapshot(item as unknown as Record<string, unknown>);
    await prisma.editHistory.create({
      data: {
        itemId: item.id,
        revision: 1,
        summary: '위키 최초 등록 (웹 조사 기반)',
        diff: buildDiff(toSnapshot({}), snapshot, 0, 1),
        snapshot: snapshot as object,
      },
    });
    console.log(`[ok] ${raw.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
