# Lifipedia

카테고리(테마)별로 유저가 직접 제품 위키를 작성하고, 추천/투표로 경쟁시켜
매달·매년 자연 발생적으로 Top 1(저가/중가/고가)이 가려지는 커뮤니티 위키 서비스.

**운영자는 순위를 정하지 않습니다.** 관리자에게는 어떤 항목에도 가점을 주는
기능이 없습니다. 테마 승격, 랭킹, Top 1 산정은 전부 유저 활동(팔로우/추천/투표)을
공개된 알고리즘에 넣어 나온 결과입니다. 산정식 전문은 앱의 `/how-ranking-works`
페이지와 `src/lib/ranking.ts`에 있으며, 문서는 코드의 상수를 직접 읽어와 표시하므로
설명과 구현이 어긋날 수 없습니다.

## 핵심 철학

- **운영자 큐레이션 금지** — Top 1 지정 API/버튼이 존재하지 않는다.
- **테마도 유기적으로 생성** — 팔로워가 임계치를 넘으면 자동으로 정식 승격.
- **주기적 순위 갱신** — 매달 1일 / 매년 1월 1일에 지난 기간 Top이 아카이브로 박제.
- **최소 개입 모더레이션** — 운영자는 '규칙 위반'만 판단하고 콘텐츠 우열엔 개입하지 않음.

## 기술 스택

- **프론트/백엔드**: Next.js 15 (App Router) + TypeScript, Tailwind CSS
- **DB**: PostgreSQL + Prisma ORM (편집 이력/투표 등 관계형 데이터에 적합)
- **인증**: NextAuth (GitHub/Google OAuth, DB 세션)
- **테스트**: Vitest (순수 로직 유닛 테스트 69개)
- **배포**: Vercel 기준 `vercel.json`에 Cron 3개 정의 (월간/연간 스냅샷, 생애주기 정리)

## 폴더 구조

```
src/
  app/                     # 페이지 + API 라우트 (App Router)
    theme/[slug]/          # 테마 상세, [tier] 가격대별 순위, item/* 위키 문서
    api/                   # REST 엔드포인트 (themes, items, vote, edit, talk, reports, cron)
    how-ranking-works/     # 랭킹 산정식 투명 공개 페이지
    rankings/              # 월간/연간 Top1 아카이브
  components/              # 클라이언트 컴포넌트 (투표, 팔로우, 편집 폼, 토론 스레드 등)
  lib/
    ranking.ts             # 점수 산정 순수 함수 (Wilson 하한 × 시간감쇠 × 참여보정)
    trust.ts                # 신뢰도/뱃지/투표 가중치
    abuse.ts                 # 레이트리밋, 투표 몰림 탐지
    theme-lifecycle.ts      # PROPOSED → ACTIVE → DORMANT 규칙
    wiki.ts                 # 편집 diff, 동시편집 충돌/자동병합
    tier.ts / slug.ts        # 가격대 검증, SEO 슬러그
    scoring-service.ts      # DB 조회 + 랭킹 계산 조합
    snapshot.ts             # 월간/연간 스냅샷 생성
prisma/schema.prisma        # 데이터 모델
prisma/seed.ts               # 로컬 개발용 시드 (점수는 공개 알고리즘으로 계산, 직접 대입 안함)
scripts/snapshot.ts          # 수동 스냅샷 생성 CLI
tests/                       # 순수 로직 유닛 테스트 (ranking/trust/wiki/lifecycle 등)
```

## 랭킹 알고리즘 요약

```
점수 = Wilson하한(유효찬성, 유효전체) × log10(1 + 유효전체) × 100
유효찬성/비추천 = Σ (표 가중치 × 시간감쇠)
시간감쇠 = 0.5 ^ (표 나이(일) / 45)
```

- **시간 감쇠**: 오래된 표는 45일마다 절반으로 약해져 최신 트렌드를 반영.
- **Wilson 하한**: 표본이 작을수록 보수적으로 깎여, 소수 만장일치가 대규모 지지를 이기지 못함.
- **참여 보정**: 유효 표수에 로그를 취해 곱함 — 참여가 많을수록 유리하되 무한 증식은 방지.
- **최소 참여 인원**(기본 5명) 미달 가격대의 Top1은 확정하지 않고 "미정"으로 표시.
- **신뢰도**는 기여 수의 로그 스케일로만 오르며(운영자 개입 불가), 투표 가중치는 **투표 시점에 고정**되어 과거 순위 재현성을 보장.
- **어뷰징 방지**: 시간당 투표/편집 한도, 신규 계정(가입 7일 미만) 가중치 축소, 짧은 시간 몰아치기 투표 탐지(차단 대신 검토 큐 적재).

전체 설명과 실제 상수값은 `/how-ranking-works` 페이지에서 확인할 수 있습니다.

## 로컬 개발

```bash
cp .env.example .env   # DATABASE_URL, NEXTAUTH_SECRET, OAuth 키 등 채우기
npm install
npm run db:push         # Prisma 스키마를 DB에 반영
npm run db:seed         # 샘플 테마/제품/투표 생성
npm run dev
```

- `npm run typecheck` — TypeScript 타입 검사
- `npm test` — Vitest 유닛 테스트 (랭킹/신뢰도/위키 충돌/생애주기/어뷰징 등 69개)
- `npm run rank:snapshot -- --type MONTHLY --key 2026-08` — 특정 기간 스냅샷 수동 생성
- `npm run build` — 프로덕션 빌드 (DB 연결 필요 — 정적 페이지 생성 시 조회)

## 배포 시 참고

- `vercel.json`에 Cron 3개가 정의되어 있습니다 (`/api/cron/snapshot?periodType=MONTHLY`,
  `?periodType=YEARLY`, `/api/cron/lifecycle`). 각 엔드포인트는 `CRON_SECRET` 환경변수로
  보호되며 `Authorization: Bearer <CRON_SECRET>` 헤더 또는 Vercel Cron의 기본 호출(GET)로
  인증됩니다.
- `THEME_PROMOTION_THRESHOLD` 환경변수로 테마 정식 승격에 필요한 팔로워 수를 조정할 수 있습니다
  (기본 20명).
- 광고 슬롯은 `src/components/AdSlot.tsx`에 자리만 마련되어 있으며, `NEXT_PUBLIC_ADS_ENABLED=true`
  설정 시 실제 광고 스크립트를 주입할 지점입니다.

## 1차 MVP 범위 밖 (Out of Scope)

- 실시간 가격 비교/크롤링 연동
- 자체 결제/커머스 (구매는 외부 링크로만 연결)
- 다국어 번역 자동화
- ML 기반 추천 (1차는 투명하게 공개된 규칙 기반 스코어링)
