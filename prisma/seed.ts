/**
 * 로컬 개발용 시드 데이터.
 * 실제 서비스의 순위는 유저 활동으로만 만들어진다 — 이 스크립트는 그 활동을 흉내 낼 뿐,
 * 어떤 항목에도 점수를 직접 써넣지 않는다.
 */
import { PrismaClient } from '@prisma/client';
import { computeScore } from '../src/lib/ranking';
import { slugify } from '../src/lib/slug';
import { trustFromContributions, badgeFor, voteWeightFor } from '../src/lib/trust';

const prisma = new PrismaClient();

const THEMES = [
  { name: '자취 인생템', description: '처음 혼자 살기 시작한 사람에게 진짜 필요한 것들.', active: true },
  { name: '캠핑 인생템', description: '차박부터 백패킹까지, 밖에서 자는 사람들의 장비.', active: true },
  { name: '고3 인생템', description: '수험 생활 1년을 버티게 해준 물건들.', active: false },
];

const ITEMS: Record<string, { name: string; tier: 'BUDGET' | 'MID' | 'PREMIUM'; price: number; description: string }[]> = {
  '자취 인생템': [
    { name: '1구 인덕션', tier: 'BUDGET', price: 39_000, description: '가스레인지 설치가 불가능한 원룸에서 쓸 수 있는 최소한의 조리 도구. 화력은 아쉽지만 라면과 계란후라이까지는 충분하다.' },
    { name: '6kg 드럼세탁기', tier: 'MID', price: 380_000, description: '원룸 세탁기의 표준. 통돌이보다 물을 덜 쓰고 소음이 적어 밤에도 돌릴 수 있다.' },
    { name: '무선 스틱청소기', tier: 'PREMIUM', price: 690_000, description: '좁은 집일수록 선 없는 청소기의 체감이 크다. 매일 5분 청소가 실제로 가능해진다.' },
    { name: '접이식 빨래건조대', tier: 'BUDGET', price: 21_000, description: '베란다 없는 집에서 건조기를 사기 전까지 버티게 해주는 물건.' },
  ],
  '캠핑 인생템': [
    { name: '알루미늄 롤 테이블', tier: 'BUDGET', price: 45_000, description: '가볍고 물에 강하다. 첫 캠핑 장비로 가장 후회가 적은 선택.' },
    { name: '3계절 침낭', tier: 'MID', price: 180_000, description: '봄가을 산에서 떨지 않으려면 결국 여기로 오게 된다. 컴포트 온도를 꼭 확인할 것.' },
    { name: '돔형 4인 텐트', tier: 'PREMIUM', price: 890_000, description: '설치가 빠르고 바람에 강하다. 가족 캠핑의 기준선.' },
  ],
};

async function main() {
  console.log('[seed] 유저 생성');
  const users = await Promise.all(
    Array.from({ length: 24 }, (_, i) => {
      const contributions = i < 4 ? 120 - i * 20 : Math.max(0, 12 - i);
      // 앞쪽 몇 명은 오래된 계정, 나머지는 최근 가입
      const createdAt = new Date(Date.now() - (i < 18 ? 400 : 2) * 86_400_000);
      return prisma.user.create({
        data: {
          name: `유저${i + 1}`,
          email: `user${i + 1}@example.com`,
          createdAt,
          contributionCount: contributions,
          trustScore: trustFromContributions(contributions),
          badgeLevel: badgeFor(contributions),
        },
      });
    }),
  );

  for (const themeSpec of THEMES) {
    console.log(`[seed] 테마: ${themeSpec.name}`);

    // 팔로워를 붙여서 자연스럽게 승격시킨다 (상태를 직접 써넣지 않는다).
    const followerCount = themeSpec.active ? users.length : 6;

    const theme = await prisma.theme.create({
      data: {
        slug: slugify(themeSpec.name),
        name: themeSpec.name,
        description: themeSpec.description,
        proposerId: users[0].id,
        followerCount,
        status: themeSpec.active ? 'ACTIVE' : 'PROPOSED',
        promotedAt: themeSpec.active ? new Date() : null,
        followers: { create: users.slice(0, followerCount).map((u) => ({ userId: u.id })) },
      },
    });

    for (const spec of ITEMS[themeSpec.name] ?? []) {
      const item = await prisma.item.create({
        data: {
          themeId: theme.id,
          slug: slugify(spec.name),
          name: spec.name,
          tier: spec.tier,
          priceKrw: spec.price,
          description: spec.description,
          recommendReason: `${spec.name} 을(를) 먼저 산 사람들의 공통된 의견입니다.`,
          createdById: users[Math.floor(Math.random() * 4)].id,
          purchaseLinks: [{ label: '검색', url: `https://www.google.com/search?q=${encodeURIComponent(spec.name)}` }],
        },
      });

      await prisma.editHistory.create({
        data: {
          itemId: item.id,
          editorId: item.createdById,
          revision: 1,
          summary: '문서 생성',
          diff: `+++ ${spec.name}\n+${spec.description}`,
          snapshot: { name: spec.name, tier: spec.tier, description: spec.description },
        },
      });

      // 투표를 실제로 넣고, 점수는 공개된 식으로 계산한다.
      const voterCount = 4 + Math.floor(Math.random() * (users.length - 6));
      const voters = [...users].sort(() => Math.random() - 0.5).slice(0, voterCount);

      for (const voter of voters) {
        const isUp = Math.random() > 0.2;
        const daysAgo = Math.floor(Math.random() * 90);
        await prisma.vote.create({
          data: {
            itemId: item.id,
            userId: voter.id,
            type: isUp ? 'UP' : 'DOWN',
            weight: voteWeightFor({ trustScore: voter.trustScore, accountCreatedAt: voter.createdAt }),
            createdAt: new Date(Date.now() - daysAgo * 86_400_000),
          },
        });
      }

      const votes = await prisma.vote.findMany({
        where: { itemId: item.id },
        select: { type: true, weight: true, createdAt: true, userId: true },
      });
      const breakdown = computeScore(votes);

      await prisma.item.update({
        where: { id: item.id },
        data: { score: breakdown.score, upCount: breakdown.rawUpCount, downCount: breakdown.rawDownCount },
      });

      console.log(`  - ${spec.name}: ${breakdown.score.toFixed(1)}점 (참여 ${breakdown.distinctVoters}명)`);
    }
  }

  console.log('[seed] 완료. npm run rank:snapshot 으로 아카이브를 만들어 볼 수 있습니다.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
