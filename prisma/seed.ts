/**
 * 5대 라이프 허브(연령대, 주거, 취미, 선물, 테크)와 서브 갤러리 시드 데이터.
 * 레딧/디시 스타일 커뮤니티 및 위키피디아 교차 링크를 완벽히 지원합니다.
 */
import { PrismaClient } from '@prisma/client';
import { computeScore } from '../src/lib/ranking';
import { slugify } from '../src/lib/slug';
import { trustFromContributions, badgeFor, voteWeightFor } from '../src/lib/trust';

const prisma = new PrismaClient();

type RawTheme = {
  name: string;
  description: string;
  category: string;
  active: boolean;
  followers: number;
  subThemes?: RawTheme[];
};

const THEME_TREE: RawTheme[] = [
  {
    name: '연령대별 라이프 갤러리',
    description: '10대부터 40대까지, 나이대에 가장 필요한 검증된 인생템 서브갤러리 모음.',
    category: '연령/생애주기',
    active: true,
    followers: 180,
    subThemes: [
      {
        name: '10대 수험생 갤러리',
        description: '공부 집중력을 200% 올려주는 독서대, 인강용 태블릿, 노이즈캔슬링.',
        category: '연령/생애주기',
        active: true,
        followers: 65,
      },
      {
        name: '20대 자취·독립 갤러리',
        description: '처음 혼자 살기 시작한 사람을 위한 가성비/필수 원룸 생필품.',
        category: '연령/생애주기',
        active: true,
        followers: 142,
      },
      {
        name: '30대 이직·육아·독립 갤러리',
        description: '이직 성공템, 맘마존 육아 필수템, 내집마련 가전 총집합.',
        category: '연령/생애주기',
        active: true,
        followers: 195,
      },
      {
        name: '40대+ 웰빙·건강 갤러리',
        description: '안마의자, 스트레칭 매트, 영양제 등 몸 케어 갤러리.',
        category: '연령/생애주기',
        active: true,
        followers: 78,
      },
    ],
  },
  {
    name: '주거 & 공간 갤러리',
    description: '데스크테리어, 신혼집 가전, 주방 꿀템 등 공간 삶의 질 향상 갤러리.',
    category: '주거/공간',
    active: true,
    followers: 155,
    subThemes: [
      {
        name: '데스크테리어 갤러리',
        description: '생산성을 획기적으로 올리는 모니터암, 조명, 장패드 큐레이션.',
        category: '주거/공간',
        active: true,
        followers: 120,
      },
      {
        name: '주방 & 미식 갤러리',
        description: '음식물처리기, 에어프라이어, 수비드 머신 등 주방 3대 신세계.',
        category: '주거/공간',
        active: true,
        followers: 98,
      },
      {
        name: '신혼집 가전 갤러리',
        description: '식기세척기, 로봇청소기, 건조기 등 3대 이모님 가전.',
        category: '주거/공간',
        active: true,
        followers: 110,
      },
    ],
  },
  {
    name: '취미 & 아웃도어 갤러리',
    description: '캠핑, 홈트, 게이밍 등 주말과 여가를 알차게 채우는 추천.',
    category: '취미/아웃도어',
    active: true,
    followers: 160,
    subThemes: [
      {
        name: '캠핑·차박 갤러리',
        description: '차박 텐트, 알루미늄 롤테이블, 3계절 침낭 등 후회 없는 장비.',
        category: '취미/아웃도어',
        active: true,
        followers: 135,
      },
      {
        name: '홈트 & 헬스 갤러리',
        description: '홈트레이닝 문틀 철봉, 풀업바, 폼롤러, 단백질보충제.',
        category: '취미/아웃도어',
        active: true,
        followers: 92,
      },
      {
        name: '게이밍 & PC 갤러리',
        description: '기계식 키보드, 게이밍 마우스, 고주사율 모니터.',
        category: '취미/아웃도어',
        active: true,
        followers: 105,
      },
    ],
  },
  {
    name: '상황 & 선물 갤러리',
    description: '집들이, 생일, 효도 선물 등 센스 있는 선택이 필요할 때.',
    category: '상황/선물',
    active: true,
    followers: 125,
    subThemes: [
      {
        name: '집들이 선물 갤러리',
        description: '디퓨저, 수건세트, 감성 조명 등 센스 만점 집들이 선물.',
        category: '상황/선물',
        active: true,
        followers: 88,
      },
      {
        name: '부모님 효도선물 갤러리',
        description: '마사지건, 고함량 비타민, 정관장 등 부모님 만족도 1위.',
        category: '상황/선물',
        active: true,
        followers: 76,
      },
    ],
  },
  {
    name: '테크 & 디바이스 갤러리',
    description: '스마트폰, 무선 헤드폰, 스마트홈 기기 추천.',
    category: '테크/가전',
    active: true,
    followers: 190,
    subThemes: [
      {
        name: '노이즈캔슬링 헤드폰 갤러리',
        description: '몰입감 최고의 ANC 무선 헤드폰 저/중/고가 랭킹.',
        category: '테크/가전',
        active: true,
        followers: 150,
      },
      {
        name: '작업용 노트북 갤러리',
        description: '개발자, 디자이너, 코딩용 최고의 고성능 노트북.',
        category: '테크/가전',
        active: true,
        followers: 130,
      },
    ],
  },
];

const ITEMS: Record<string, { name: string; tier: 'BUDGET' | 'MID' | 'PREMIUM'; price: number; description: string }[]> = {
  '20대 자취·독립 갤러리': [
    { name: '1구 인덕션', tier: 'BUDGET', price: 39_000, description: '[[20대 자취·독립 갤러리]]에서 가장 지지받는 1위 조리 도구. [[캠핑·차박 갤러리]]에서도 호환성이 높다.' },
    { name: '6kg 드럼세탁기', tier: 'MID', price: 380_000, description: '원룸 독립 세탁기의 표준. 소음이 적어 저녁 시간에도 부담 없다.' },
    { name: '무선 스틱청소기', tier: 'PREMIUM', price: 690_000, description: '선 없는 청소기로 매일 5분 청소가 일상화된다.' },
  ],
  '30대 이직·육아·독립 갤러리': [
    { name: '버티컬 인체공학 마우스', tier: 'BUDGET', price: 49_000, description: '[[30대 이직·육아·독립 갤러리]] 추천 1위! [[데스크테리어 갤러리]]에서도 필수템.' },
    { name: '27인치 4K UHD 모니터', tier: 'MID', price: 420_000, description: '이력서 및 포트폴리오 작업 시 눈의 피로를 혁신적으로 줄여준다.' },
    { name: '자동 출산 분유제조기', tier: 'PREMIUM', price: 320_000, description: '새벽 수유 7초 만에 해결되는 신세계 육아템.' },
  ],
  '캠핑·차박 갤러리': [
    { name: '알루미늄 롤 테이블', tier: 'BUDGET', price: 45_000, description: '가볍고 물에 강하다. [[캠핑·차박 갤러리]] 첫 장비로 가장 검증된 선택.' },
    { name: '3계절 침낭', tier: 'MID', price: 180_000, description: '봄가을 산에서 추위에 떨지 않게 컴포트 온도를 지켜주는 필수품.' },
    { name: '돔형 4인 텐트', tier: 'PREMIUM', price: 890_000, description: '설치가 빠르고 바람에 강한 가족 차박 텐트.' },
  ],
  '노이즈캔슬링 헤드폰 갤러리': [
    { name: '가성비 ANC 헤드폰', tier: 'BUDGET', price: 89_000, description: '10만원 이하 노이즈캔슬링 입문용 최적의 선택.' },
    { name: '프리미엄 ANC 무선 헤드폰', tier: 'PREMIUM', price: 449_000, description: '[[10대 수험생 갤러리]] 독서실 몰입과 음악 감상용 극강 1위템.' },
  ],
};

async function main() {
  console.log('[seed] 기존 데이터 클리어');
  await prisma.vote.deleteMany();
  await prisma.editHistory.deleteMany();
  await prisma.talkComment.deleteMany();
  await prisma.item.deleteMany();
  await prisma.themeFollow.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.user.deleteMany();

  console.log('[seed] 유저 생성 (Karma/Trust 부여)');
  const users = await Promise.all(
    Array.from({ length: 35 }, (_, i) => {
      const contributions = i < 5 ? 150 - i * 20 : Math.max(0, 20 - i);
      const createdAt = new Date(Date.now() - (i < 25 ? 400 : 2) * 86_400_000);
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

  async function createThemeNode(spec: RawTheme, parentId: string | null = null) {
    console.log(`[seed] 갤러리 생성: ${spec.name} (분류: ${spec.category})`);
    const theme = await prisma.theme.create({
      data: {
        slug: slugify(spec.name),
        name: spec.name,
        description: spec.description,
        category: spec.category,
        proposerId: users[0].id,
        followerCount: spec.followers,
        status: spec.active ? 'ACTIVE' : 'PROPOSED',
        promotedAt: spec.active ? new Date() : null,
        parentId: parentId,
        followers: {
          create: users.slice(0, Math.min(spec.followers, users.length)).map((u) => ({ userId: u.id })),
        },
      },
    });

    // 제품 위키 등록
    const itemsForTheme = ITEMS[spec.name] ?? [];
    for (const itemSpec of itemsForTheme) {
      const item = await prisma.item.create({
        data: {
          themeId: theme.id,
          slug: slugify(itemSpec.name),
          name: itemSpec.name,
          tier: itemSpec.tier,
          priceKrw: itemSpec.price,
          description: itemSpec.description,
          recommendReason: `${itemSpec.name} 을(를) 실사용해본 갤러리 유저들의 1위 추천!`,
          createdById: users[Math.floor(Math.random() * 5)].id,
          purchaseLinks: [{ label: '최저가 검색', url: `https://www.google.com/search?q=${encodeURIComponent(itemSpec.name)}` }],
        },
      });

      await prisma.editHistory.create({
        data: {
          itemId: item.id,
          editorId: item.createdById,
          revision: 1,
          summary: '위키 최초 릴리즈',
          diff: `+++ ${itemSpec.name}\n+${itemSpec.description}`,
          snapshot: { name: itemSpec.name, tier: itemSpec.tier, description: itemSpec.description },
        },
      });

      // 투표 시뮬레이션
      const voterCount = 6 + Math.floor(Math.random() * 18);
      const voters = [...users].sort(() => Math.random() - 0.5).slice(0, voterCount);

      for (const voter of voters) {
        const isUp = Math.random() > 0.12;
        const daysAgo = Math.floor(Math.random() * 45);
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
    }

    if (spec.subThemes && spec.subThemes.length > 0) {
      for (const childSpec of spec.subThemes) {
        await createThemeNode(childSpec, theme.id);
      }
    }
  }

  for (const rootSpec of THEME_TREE) {
    await createThemeNode(rootSpec);
  }

  console.log('[seed] 5대 라이프 허브 및 레딧/디시 갤러리 시드 생성이 완료되었습니다.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
