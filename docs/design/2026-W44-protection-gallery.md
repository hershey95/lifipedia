# 설계서: 문서 보호·갤러리 통합·탐색·토큰 이행 (2026-W44, 10/19~10/25)
- 작성: Claude (무인 설계 세션, 2026-10-18) / 리뷰: Gemini (대기) / 구현: Sonnet 월~목
- 상태: **초안**. 기준은 `ROADMAP.md` W44 표다. 바꾼 것은 9절에 이유와 함께 적었다.
- 근거 문서: `ref-backend.md` D·F절, `ref-frontend.md` 2·3절, `ref-design-system.md` 2절, `ref-security.md`.

## 1. 현재 상태 (코드 기준, 2026-10-18 확인)
- **편집·되돌리기**: `api/items/[id]/edit` 와 `/revert` 의 처리 순서는 401 → 정지 403 → 레이트 리밋 429 → zod 400 → 404 → 비ACTIVE 403 → 트랜잭션이다. 되돌리기는 이미 `contributionCount ≥ 5`(`CONTRIBUTION_RULES.MIN_CONTRIBUTIONS_TO_REVERT`)를 요구한다. 보호 개념은 없다.
- **되돌리기 기록**: 되돌리기 API 와 "수동 되돌리기"(최근 10개 리비전과 `contentHash` 가 같음) 둘 다 `EditHistory.revertOfRevision` 을 채운다. 인덱스 `EditHistory(itemId, createdAt)` 가 있다.
- **`currentUser()`** 는 `{ id, trustScore, contributionCount, createdAt, suspendedUntil }` 를 돌려준다.
- **신고**: `Report` 에는 `@@index([status, createdAt])` 만 있다. 신고 대상은 `ITEM | COMMENT | THEME` 이다.
- **투표 라우트**(`api/items/[id]/vote`): `findUnique → create/update/delete → recomputeItemScore → theme.update` 가 전부 트랜잭션 밖에 있다. 더블클릭하면 두 번째 요청의 `create` 가 P2002 를 내고, 지금 코드에서는 `handleError` 가 이를 409 로 바꾼다. ROADMAP 은 "더블클릭 500"이라고 적었지만 현재 코드 기준으로는 500 이 아니다. 월요일에 실제 동시 요청으로 확인한다. 남은 문제는 둘이다. 첫째, 쓰기와 점수 재계산이 원자적이지 않다. 둘째, `VoteButtons` 가 요청 중에 버튼을 막지 않아 사용자가 409 문구를 본다.
- **투표 몰림 신고**: 5분 안에 10표가 넘으면 그 **이후 매 표마다** `Report(targetType: ITEM, targetId: 그 표의 itemId, reason: AUTOMATED_VOTE_BURST, reporterId: null)` 를 만든다. 한 사람의 몰림 1건이 여러 문서에 흩어진 신고 N건이 된다.
- **갤러리 화면이 두 벌이다.**
  - `/gallery/[slug]`: `GalleryFeed`(클라이언트 344줄)를 쓴다. 사이드바, 홈(3곳), `WikiLink` 가 모두 이쪽으로 링크한다. 여기서 `FollowButton initialFollowing={false}`·`threshold={20}` 가 하드코딩돼 있다. 그래서 팔로우 중인 사람이 버튼을 누르면 **언팔로우된다**. `VoteButtons initialMyVote={null}` 도 하드코딩이고, 날짜는 클라이언트 `toLocaleString()` 이라 하이드레이션 불일치가 난다.
  - `/theme/[slug]`: 서버 컴포넌트이고, 팔로우 여부·임계값이 정확하다. 티어별 Top3(`rankTier`)를 보여 준다. 목록·토론·이력 탭은 없다.
- **분류**: `Theme.category` 는 자유 문자열이고 `@@index([category])` 가 있다. 레이아웃이 하위 갤러리(`parentId != null`)를 category 로 묶어 사이드바 허브로 보여 준다. `/themes` 에는 필터가 없다.
- **문서 페이지**: 우측에 "이 문서의 점수" 카드가 있고, 이미지와 구매 링크는 본문 열에 있다. 경로 표시는 `테마 / 갤러리 / 티어` 이고 분류는 빠져 있다. 인포박스는 W43-5 에서 이번 주로 넘어왔다.
- **색**: `globals.css` 에는 `--fg`, `--accent-fg`, `--premium-fg` 만 있다(W43-4 브리지). `ink` 는 37개 파일에 183곳 남아 있다. 하드코딩 팔레트(`slate-*`, `white/NN`, `black/NN`, `emerald/amber/purple-*`)는 29개 파일에 311곳이다. 그중 마인드맵 4개 파일(`MindMapCanvas`, `FullScreenInteractiveUniverse`, `MindMapDrawer`, `ThemeExplorer`)이 102곳, `GalleryFeed` 가 51곳이다. `body` 배경은 `bg-[#0b0f19]` 하드코딩이다.
- **CSP**(`next.config.mjs`): `script-src 'self' 'unsafe-inline'`. 인라인 테마 스크립트를 넣을 수 있다.

## 2. 목표와 범위
위키다운 최소 방어선(보호)과, 갤러리를 하나의 정확한 화면으로 합치는 것이 이번 주의 핵심이다. 원칙은 그대로 유지한다. **운영자가 거는 보호는 없고, 보호는 데이터로 계산된다.**

| # | 작업 | 규모 | 이번 주 포함 | 제외 (다음으로) |
|---|---|---|---|---|
| 1 | 문서 보호 수준(규칙 계산) | M | 순수 함수, 편집·되돌리기 차단(403), 문서·편집 화면 표시, 산정식 페이지 설명 | 편집 요청 큐(W45 이후, 열린 결정 3), `GET /protection` API |
| 2 | 주시목록 + 분류 | M | `/recent?scope=following`, `/themes?category=`, 사이드바 허브 링크, 문서 경로에 분류 | 문서 단위 `Watch` 테이블, "새 변경 n건" 배지(W45 알림과 함께) |
| 3 | 갤러리 통합 + 인포박스 | L | `/theme/[slug]?tab=rank|list|talk`, 정렬 hot/new/top, 티어 필터, 고밀도 표, 최근 변경 5, `/gallery` 308, 문서 인포박스 | 개념글 필터 `best=1`(W45-2), 커서 페이지네이션, `useOptimistic`(W45-3) |
| 4 | 토큰 이행 1단계 + 라이트 테마 | L | 토큰 전체 정의, `ink`·하드코딩 팔레트 치환(마인드맵 4개 파일 제외), 라이트 변수와 토글, 가드 테스트 | `ink` 별칭 삭제(W45-5), 타이포 스케일, 마인드맵 내부 토큰화 |
| 5 | 버그 3건 | S | FollowButton(= `/gallery` 리다이렉트), 투표 트랜잭션, 몰림 신고 중복 | — |

## 3. 작업 1 — 문서 보호 수준

### 3.1 데이터 모델
테이블과 컬럼은 추가하지 않는다. 보호 상태를 저장하지 않으므로 운영자가 바꿀 필드도 없다. 신고자 수를 세기 위해 인덱스 1개만 추가한다(작업 5와 공유).
```prisma
model Report { ... @@index([targetType, targetId, status]) }
```

### 3.2 순수 함수 `src/lib/protection.ts` (prisma 를 import 하지 않는다)
```ts
export const PROTECTION_RULES = {
  SEMI_MIN_ACCOUNT_DAYS: 4,
  SEMI_MIN_CONTRIBUTIONS: 5,        // = CONTRIBUTOR 임계, = 되돌리기 최소 기여
  EXTENDED_MIN_ACCOUNT_DAYS: 30,
  EXTENDED_MIN_CONTRIBUTIONS: 25,   // = EDITOR 임계
  EDIT_WAR_WINDOW_HOURS: 48,
  EDIT_WAR_SEMI_REVERTS: 3,
  EDIT_WAR_EXTENDED_REVERTS: 6,
  OPEN_REPORTERS_SEMI: 3,           // 서로 다른 신고자(계정 4일 이상)의 OPEN 신고
} as const;

export type ProtectionLevel = 'NONE' | 'SEMI' | 'EXTENDED';
export type ProtectionReason = 'EDIT_WAR' | 'TOP_RANK' | 'REPORTS';
export type ProtectionSignals = { recentReverts: number; isTopRank: boolean; openReporters: number };

/** 가장 높은 단계와, 그 단계에 기여한 모든 사유(고정 순서 EDIT_WAR, TOP_RANK, REPORTS). */
export function requiredProtection(s: ProtectionSignals): { level: ProtectionLevel; reasons: ProtectionReason[] };
export function userLevel(u: { createdAt: Date; contributionCount: number }, now?: Date): ProtectionLevel;
export function canEditAt(required: ProtectionLevel, user: ProtectionLevel): boolean; // 순서 NONE < SEMI < EXTENDED
export function protectionMessage(required: ProtectionLevel): string; // 403 응답·배너에 같은 문구를 쓴다
```
- `requiredProtection` 규칙은 다음과 같다. `recentReverts ≥ 6` 이면 EXTENDED, `≥ 3` 이면 SEMI. `isTopRank` 이면 SEMI. `openReporters ≥ 3` 이면 SEMI. 이 중 가장 높은 단계를 쓴다. 사유는 NONE 이 아닌 조건을 **모두** 적는다(단계를 정하지 않은 사유도 투명성을 위해 공개한다).
- `userLevel` 의 계정 나이는 `(now - createdAt) / 86_400_000` 이다. 조건은 `≥` 로 비교한다(정확히 4일이면 통과). 입력이 NaN 이거나 음수면 NONE 이다.
- 해제는 자동이다. 48시간 창이 지나면 되돌리기 수가 줄고, 1위에서 밀리거나 신고가 처리되면 그 사유가 사라진다. 만료 배치는 필요 없다.

### 3.3 신호 수집 `src/lib/protection-service.ts` (`scoring-service.ts` 와 같은 계층 분리)
```ts
export async function loadProtection(item: { id: string; themeId: string; tier: Tier }, now = new Date()):
  Promise<{ level: ProtectionLevel; reasons: ProtectionReason[]; signals: ProtectionSignals }>;
```
`Promise.all` 로 아래 3개 쿼리를 병렬로 실행한다.
1. `recentReverts`: `editHistory.count({ where: { itemId, revertOfRevision: { not: null }, createdAt: { gte: now - 48h } } })`. 인덱스 `(itemId, createdAt)` 를 탄다.
2. `isTopRank`: `rankTier({ themeId, tier, limit: 1 })` 의 첫 항목이 이 문서이고 `!breakdown.isProvisional` 이면 참이다. **갤러리 화면이 1위를 정하는 것과 같은 함수**를 쓴다. 그래서 "1위라서 보호"라는 표시와 화면의 1위가 어긋나지 않는다(ref-backend 의 `Item.score` 근사는 쓰지 않는다. 9절 #4).
3. `openReporters`: `report.findMany({ where: { targetType: 'ITEM', targetId: itemId, status: 'OPEN', reporterId: { not: null }, reporter: { createdAt: { lte: now - 4일 } } }, distinct: ['reporterId'], select: { reporterId: true } }).length`. 자동 신고(`reporterId: null`)와 4일 미만 계정의 신고는 세지 않는다. 신고 3건으로 문서를 잠그는 악용을 줄이기 위해서다.
- ponytail: `rankTier` 는 그 가격대 문서 전체의 표를 읽는다. 편집할 때와 문서를 볼 때만 호출되고 갤러리당 문서는 수십 개라 지금은 충분하다. 가격대당 문서가 수백 개가 되면 `Item.score` 근사로 바꾼다.

### 3.4 API 변경
`POST /api/items/[id]/edit` 와 `POST /api/items/[id]/revert` 에서, 비ACTIVE 403 검사 **다음, 트랜잭션 전**에 아래를 넣는다.
```ts
const p = await loadProtection(item);
const mine = userLevel(user);
if (!canEditAt(p.level, mine)) {
  return fail(403, protectionMessage(p.level), { protection: { required: p.level, reasons: p.reasons, userLevel: mine } });
}
```
| 상황 | 상태 | 응답 |
|---|---|---|
| 보호 단계 미달 | 403 | `{ error, protection: { required, reasons, userLevel } }` |
| 그 밖 | 기존과 같다 | — |
- 보호는 **편집과 되돌리기에만** 적용한다. 투표, 토론, 신고, 새 문서 생성은 막지 않는다.
- 되돌리기의 "기여 5건" 조건은 그대로 둔다. 보호 판정은 그다음에 한다.
- 202 + 편집 요청 자동 전환은 하지 않는다(ROADMAP 충돌 조정 결정).

### 3.5 화면
- **문서 페이지**: `loadProtection` 을 호출한다. level 이 NONE 이 아니면 제목 옆에 칩을 단다. 문구는 "반보호" 또는 "확장 보호"이고, 바로 아래 한 줄로 사유를 쓴다. 사유 문구는 "최근 48시간 되돌리기 {n}회", "가격대 1위 문서", "서로 다른 {n}명이 신고"이다. 끝에 `/how-ranking-works#protection` 링크를 둔다.
- **편집 페이지**: 비로그인이면 지금처럼 동작한다. 로그인했고 `!canEditAt` 이면 폼 대신 `role="status"` 배너를 보여 준다. 문구는 "{사유} 때문에 이 문서는 {반보호/확장 보호} 상태입니다. 계정 {n}일 이상·기여 {m}건 이상부터 편집할 수 있습니다. 고칠 내용은 토론에 남겨 주세요."이고, 토론 링크를 단다.
- **ItemForm**: 저장 중에 보호가 걸려 403 이 오면 기존 오류 영역에 `error` 를 표시한다(이미 그렇게 동작하는지 확인만 한다).
- **`/how-ranking-works`**: `id="protection"` 절을 추가한다. `PROTECTION_RULES` 값을 그대로 렌더해 문서와 코드가 어긋나지 않게 한다.

### 3.6 테스트 `tests/protection.test.ts`
- `requiredProtection`: 되돌리기 2 → NONE, 3 → SEMI, 5 → SEMI, 6 → EXTENDED. 1위만 → SEMI 와 `['TOP_RANK']`. 신고자 2 → NONE, 3 → SEMI. 되돌리기 6 + 1위 → EXTENDED 와 `['EDIT_WAR','TOP_RANK']`. 모두 0 → NONE 과 `[]`.
- `userLevel`(`now` 고정): 3.99일·기여 100 → NONE. 4일·기여 5 → SEMI. 4일·기여 4 → NONE. 30일·25 → EXTENDED. 29.9일·999 → SEMI. NaN 기여 → NONE.
- `canEditAt`: 3×3 표 전체.
- 라우트(`me-route.test.ts` 처럼 mock 사용): 보호 미달이면 edit·revert 가 403 이고 `protection.required` 가 있으며 `$transaction` 을 호출하지 않는다. 자격이 있으면 기존 흐름을 탄다.

### 3.7 위험
- **보호를 일부러 걸어 잠그기**: 경쟁 문서를 되돌려 잠그면 잠근 쪽도 같은 제한을 받는다. 확장 보호에 필요한 6회는 시간당 편집 한도 안에서도 가능하다. 그래서 다계정 담합이면 30일·25기여 계정만 편집할 수 있는 상태를 48시간 유지할 수 있다. 편집 요청 큐가 없는 동안에는 토론으로 우회하게 한다. 관찰되면 W45 에서 편집 요청을 앞당긴다.
- **1위 문서는 항상 SEMI 다**: 신규 계정(4일 미만 또는 기여 5건 미만)은 각 가격대 1위 문서를 고칠 수 없다. 의도한 동작이다(반달 표적 1순위). 첫 주의 거부 건수는 서버 로그의 403 `protection` 응답 수로 본다.
- **편집 1건당 쿼리 +3**: 모두 인덱스를 탄다. `rankTier` 비용은 3.3의 ponytail 주석을 참고한다.

## 4. 작업 2 — 주시목록 + 분류

### 4.1 주시목록 = 팔로우한 갤러리의 최근 변경
새 테이블은 없다. `ThemeFollow` 를 재사용한다(ROADMAP).
- `/recent?scope=following`: 로그인이 필요하다. 비로그인이면 `redirect('/signin?callbackUrl=/recent?scope=following')` 로 보낸다(경로는 `encodeURIComponent` 로 감싼다).
- 쿼리는 기존 `/recent` 와 같고 `where` 에 두 조건을 더한다.
  ```ts
  item: { isRemoved: false, theme: { followers: { some: { userId: me.id } } } },
  OR: [{ editorId: null }, { editorId: { not: me.id } }],   // 내 편집은 뺀다. NULL(탈퇴 사용자)은 남긴다
  ```
  커서 조건도 `OR` 를 쓴다. 그래서 두 조건을 `AND: [ {OR: 커서}, {OR: 편집자} ]` 로 묶는다. **같은 키 `OR` 를 두 번 펼치지 않는다**(나중 것이 앞의 것을 덮어쓴다).
- 화면: 제목 아래에 `전체 | 팔로우한 갤러리` 링크 2개를 두고 현재 항목에 `aria-current="page"` 를 단다. "더 보기" 링크는 `scope` 를 유지한다.
- 빈 상태는 두 가지다. 팔로우가 0이면 "팔로우한 갤러리가 없습니다." 와 `/themes` 링크를 보여 준다. 팔로우는 있는데 변경이 0이면 "팔로우한 갤러리에 다른 사람의 변경이 아직 없습니다."를 보여 준다.
- `/me` 의 팔로우 목록 위에 "팔로우한 갤러리의 최근 변경 →" 링크를 단다.

### 4.2 분류
- `/themes?category=<문자열>`: `where: category ? { category } : {}`. 맨 위에 분류 칩을 보여 준다. 칩 목록은 `theme.findMany({ where: { category: { not: null } }, distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } })` 로 얻고, 맨 앞에 "전체"를 둔다. 선택된 칩에 `aria-current="page"` 를 단다. 존재하지 않는 분류면 빈 상태 "이 분류에 테마가 없습니다."를 보여 준다. 입력은 Prisma 파라미터라 따로 검증하지 않는다.
- 사이드바 허브 제목을 `/themes?category=…` 링크로 바꾼다(`encodeURIComponent`).
- 문서 경로(브레드크럼)는 `{분류} › {갤러리} › {티어}` 로 바꾼다. 분류가 null 이면 "테마"(`/themes`)를 보여 준다. 쿼리에 `theme.category` 를 추가한다.

### 4.3 테스트
- 라우트 테스트는 없다(페이지 쿼리). 대신 수용 기준 8절에서 수동으로 확인한다.
- `scope` 파싱은 5.2 의 `parseFeedParams` 와 섞지 않는다. `/recent` 안에서 `scope === 'following'` 비교 한 줄로 끝낸다.

## 5. 작업 3 — 갤러리 통합 `/theme/[slug]` + 인포박스

### 5.1 라우트
- `/gallery/[slug]/page.tsx` 는 `permanentRedirect('/theme/' + encodeURIComponent(decodeURIComponent(slug)))` 만 남긴다(308). **월요일 작업 5에서 먼저 한다**(9절 #1).
- 링크를 바꿀 곳은 `Sidebar.tsx`(2), `app/page.tsx`(3), `WikiLink.tsx`(1)다. `grep -rn "/gallery/" src` 결과가 리다이렉트 파일 하나만 남아야 한다.
- `GalleryFeed.tsx` 는 쓰는 곳이 없어진다. 삭제 여부는 사용자 결정이다(무인 세션은 rm 금지, 데일리 보고 참고). 그때까지 import 하지 않는 상태로 둔다.

### 5.2 탭과 파라미터 — 순수 함수 `src/lib/feed.ts`
```ts
export type FeedParams = { tab: 'rank' | 'list' | 'talk'; sort: 'hot' | 'new' | 'top'; tier: Tier | null };
export function parseFeedParams(sp: Record<string, string | string[] | undefined>): FeedParams;
export function feedHref(slug: string, p: Partial<FeedParams>): string; // 기본값인 키는 URL 에서 뺀다
export const FEED_ORDER_BY: Record<FeedParams['sort'], object>;
// hot: [{ score: 'desc' }, { id: 'desc' }]  new: [{ createdAt: 'desc' }, { id: 'desc' }]  top: [{ upCount: 'desc' }, { id: 'desc' }]
```
- 잘못된 값이나 배열 값이 오면 기본값(`rank`, `hot`, `null`)으로 돌아간다. `tier` 는 `budget|mid|premium` 슬러그를 받는다(`tierFromSlug` 재사용).
- `hot` 은 저장된 `Item.score` 다. 점수는 투표가 있을 때만 다시 계산되므로 시간 감쇠가 늦게 반영될 수 있다. 그래서 `rank` 탭(실시간 `rankTier`)과 순서가 다를 수 있다. 목록 머리에 "hot = 마지막 투표 시점 점수"라고 적는다.

### 5.3 화면 (`/theme/[slug]/page.tsx`, 서버 컴포넌트, 세션 때문에 동적)
- **머리**: 지금 머리를 유지한다(이름, 상태 칩, 설명, `FollowButton`, 작성 버튼). 분류가 있으면 `#{category}` 링크(`/themes?category=`)를 더한다.
- **탭**: `<nav aria-label="갤러리 보기">` 안에 `<Link>` 3개(순위, 목록, 토론)를 두고 현재 탭에 `aria-current="page"` 를 단다. JS 탭 상태는 쓰지 않는다. URL 로 공유하고 뒤로 가기로 복원된다.
- **rank**(기본): 지금의 티어별 Top3 를 그대로 둔다.
- **list**: 위쪽에 정렬 링크(hot/new/top)와 티어 링크(전체/저가/중가/고가)를 둔다. 아래는 `<table>` 이고 `<caption class="sr-only">` 와 `th scope="col"` 을 단다. 열은 번호, 티어(`TierBadge`), 제품명 링크와 `[토론 수]`, 가격, 추천(`upCount`), 수정일이다. 행 전체를 클릭하는 JS 는 쓰지 않는다. 투표 버튼은 두지 않는다(ref-frontend).
  ```ts
  prisma.item.findMany({ where: { themeId, isRemoved: false, ...(tier && { tier }) }, orderBy: FEED_ORDER_BY[sort], take: 100,
    select: { id, slug, name, tier, priceKrw, upCount, updatedAt, _count: { select: { comments: { where: { isRemoved: false } } } } } })
  ```
  ponytail: 커서 없이 100건에서 자른다. 지금 갤러리는 문서 수십 개다. 100건을 넘는 갤러리가 생기면 `(정렬키, id)` 커서를 붙인다. 100건에 닿으면 표 아래에 "상위 100개만 표시합니다"를 보여 준다.
- **talk**: 갤러리 안의 최근 댓글 20개를 보여 준다(`isRemoved: false`). 각 줄은 "문서명 · 작성자 · 날짜 · 본문 앞 120자"이고 문서의 `/talk` 로 링크한다.
- **측면(모든 탭)**: 최근 변경 5건(`editHistory`, `item.themeId`, `item.isRemoved: false`, `createdAt desc`)과 `/recent` 링크를 둔다.
- **날짜**: 서버에서 `toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })` 로만 만든다.
- **빈 상태**: list 탭에 문서가 0이면 "아직 문서가 없습니다." 와 작성 링크(ACTIVE 일 때만)를 보여 준다. talk 탭이 0이면 "아직 토론이 없습니다."
- `loading.tsx`(`/theme/[slug]/loading.tsx`): 카드 3개 크기의 스켈레톤을 둔다. `aria-busy="true"`.

### 5.4 문서 인포박스 (W43-5 이월분)
`/theme/[slug]/item/[itemSlug]/page.tsx` 의 `<aside>` 를 바꾼다.
- 구조는 제목 바(TierBadge + 제품명) → 이미지(본문 열에서 옮긴다. 4:3 `object-contain`) → `<dl>`(티어, 가격, 참여자, 점수) → `<details><summary>점수 상세</summary>`(지금의 Row 6개) → 구매 링크(본문 "구매 링크" 섹션에서 옮긴다. 외부 링크 안내 문구 유지) → 산정 방식 링크 순서다.
- 1024px 미만에서는 인포박스를 본문 앞에 둔다. `<aside className="order-first lg:order-none">` 를 쓴다(ref-design-system 레이아웃 표).
- `specSummary` 는 자유 텍스트라 인포박스의 키-값으로 옮기지 않는다. 지금처럼 본문 섹션에 둔다(ref-design-system Q6).
- "가격 확인일" 칸은 만들지 않는다. 데이터가 없다. W46 근거 구조에서 다룬다.

### 5.5 테스트 `tests/feed.test.ts`
- `parseFeedParams`: `{}` → 기본값. `tab=list&sort=new&tier=mid` 를 파싱한다. `sort=rising`·`tier=gold`·`tab=x` → 기본값. `sort=['top','new']` → 기본값.
- `feedHref`: 기본값만 주면 `/theme/s`. `{ tab: 'list', sort: 'hot' }` → `/theme/s?tab=list`. 한글 슬러그는 인코딩된다.

## 6. 작업 4 — 토큰 이행 1단계 + 라이트 테마

### 6.1 토큰 정의 (월요일, 4a)
- `globals.css`: `ref-design-system.md` 2.2 표의 모든 토큰(`bg`, `bg-subtle`, `bg-inset`, `surface`, `surface-raised`, `border`, `border-strong`, `fg`, `fg-muted`, `fg-subtle`, `fg-disabled`, `accent`, `accent-hover`, `accent-fg`, `accent-soft`, `success/warn/danger` 의 fg·bg, `tier-budget/mid/premium` 의 fg·bg)을 RGB 채널로 정의한다.
  ```css
  :root, [data-theme="dark"] { color-scheme: dark; /* 다크 값 */ }
  [data-theme="light"] { color-scheme: light; /* 라이트 값 */ }
  @media (prefers-color-scheme: light) { :root:not([data-theme]) { color-scheme: light; /* 라이트 값 */ } }
  ```
  다크 블록을 `[data-theme="dark"]` 에도 걸어 두면, 페이지가 라이트일 때 **마인드맵 영역만 다크로 고정**할 수 있다(6.3).
- 기존 `--premium-fg` 는 `--tier-premium-fg` 와 같은 값이다. 별칭으로 남긴다.
- `tailwind.config.ts`: `const v = (n) => \`rgb(var(--${n}) / <alpha-value>)\`` 로 2.5절 매핑을 넣는다. `ink`, `budget`, `mid`, `premium` 별칭은 이번 주에 그대로 둔다.
- `body` 는 `bg-[#0b0f19] text-[#e2e8f0]` 대신 `bg-bg text-fg` 를 쓴다.
- 이 단계에서는 다크 화면이 거의 바뀌지 않는다(배경 `#0b0f19` → `#0d1117`). 수요일 작업 3의 새 화면은 처음부터 이 토큰으로 만든다.

### 6.2 치환 (목요일, 4b)
**`ref-design-system.md` 2.6 표**를 따른다(`ink/NN` → `fg`/`fg-muted`/`fg-subtle`, `black/NN` → `border`/`surface-raised`, 스크림은 `black/60` 유지). 하드코딩 팔레트는 아래 표를 더해 기계 치환한다.

| 기존 | 치환 |
|---|---|
| `text-white`(채운 버튼·accent 위 제외), `text-slate-50/100/200` | `text-fg` |
| `text-slate-300/400` | `text-fg-muted` |
| `text-slate-500/600`, `placeholder:text-slate-400` | `text-fg-subtle`, `placeholder:text-fg-subtle` |
| `bg-white/[0.02~0.06]`, `bg-white/5` | `bg-surface` |
| `bg-white/10`, `hover:bg-white/10` | `bg-surface-raised` |
| `border-white/5·10·15`, `divide-white/10` | `border-border`, `divide-border` |
| `border-white/20·25·30` | `border-border-strong` |
| `text-emerald-*` / `bg-emerald-500/15` | `text-success-fg` / `bg-success-bg` (티어 의미면 `tier-budget-*`) |
| `text-amber-*` / `bg-amber-500/15` | `text-warn-fg` / `bg-warn-bg` (티어 의미면 `tier-mid-*`) |
| `text-red-*` | `text-danger-fg` |

- **대상**: `src/` 전체에서 `MindMapCanvas`, `FullScreenInteractiveUniverse`, `MindMapDrawer`, `ThemeExplorer`, `GalleryFeed`(사용 안 함)를 뺀 나머지. 한 커밋에 페이지 그룹 하나씩 커밋한다. 순서는 ① 공용(`globals.css`, `layout`, `Header`, `Sidebar`, 버튼·카드·필드) ② 테마·티어·문서 ③ 최근 변경·검색·랭킹·산정식 ④ 마이·프로필·폼·편집기.
- `.card` 의 `backdrop-blur-md`, `shadow-lg` 와 `transition-all` 은 이번에 빼지 않는다. 시각 변화를 줄이려는 것이다(타이포·모션은 W45 이후).

### 6.3 라이트 테마와 토글 (목요일, 4c)
- **깜빡임 방지 스크립트**: `layout.tsx` 의 `<head>` 에 인라인으로 넣는다. `<html lang="ko" suppressHydrationWarning>`.
  ```js
  try{var t=localStorage.getItem('lp-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}
  ```
  CSP `'unsafe-inline'` 에 기대고 있다. 나중에 nonce 를 도입하면(ref-security P2-6) 이 스크립트에도 nonce 를 붙여야 한다. 그 작업의 체크리스트에 올린다.
- **토글** `src/components/ThemeSelect.tsx`(`'use client'`): 네이티브 `<select>` 에 시스템/라이트/다크 3개 옵션을 두고 `<label className="sr-only">화면 테마</label>` 를 단다. 바꾸면 `localStorage` 와 `dataset.theme` 를 갱신한다. 시스템을 고르면 키와 속성을 지운다. 헤더 우측에 둔다. 버튼 그룹 대신 `select` 를 쓰는 이유는 키보드·스크린리더 동작을 브라우저가 맡기 때문이다.
- **마인드맵 섬**: 마인드맵 4개 컴포넌트를 렌더하는 지점(홈 등)을 `<div data-theme="dark" className="bg-bg text-fg rounded-lg">` 로 감싼다. 이번 주에 그 내부는 토큰화하지 않는다.
- **출시 조건**: 6.4 가드 테스트가 통과하고, 8절의 라이트 화면 점검이 끝나야 헤더에 토글을 노출한다. 목요일 안에 못 끝나면 토큰·치환만 커밋하고 토글은 W45-5 로 넘긴다. PROGRESS 에는 `[~]` 로 적는다.

### 6.4 가드 테스트 `tests/design-tokens.test.ts`
- `src/**/*.{ts,tsx,css}` 를 읽어(`fs`, `node:path`) 검사한다.
  1. `\b(text|bg|border|divide|ring|from|to|via)-ink\b` 가 0건이어야 한다. `tailwind.config.ts` 는 대상이 아니다.
  2. 마인드맵 4개 파일과 `GalleryFeed.tsx` 를 뺀 파일에서 `\b(text|bg|border|divide)-(slate|gray|zinc|emerald|amber|red)-\d` 와 `\b(bg|border|divide)-(white|black)/` 가 0건이어야 한다. 예외는 `bg-black/60`(스크림) 하나다.
- 실패 메시지에는 파일:줄 목록을 넣는다. 다음 사람이 바로 고칠 수 있게 하려는 것이다.

### 6.5 위험
- **치환 규모**(ink 183 + 팔레트 약 160): 기계 치환이라도 의미가 다른 곳(예: 점수 `text-amber-400` 은 중가색이 아니라 `fg`)이 섞여 있다. 페이지 그룹별로 커밋하고, 커밋마다 다크 화면 스크린샷 3장(홈, 갤러리, 문서)을 육안으로 비교한다.
- **라이트에서 알파 표면이 사라짐**: 가드 2번이 막는다. 가드 예외가 늘어나면 토글 출시를 미룬다.
- **FOUC·하이드레이션 경고**: 스크립트를 `<head>` 맨 앞에 두고 `suppressHydrationWarning` 은 `<html>` 에만 단다.

## 7. 작업 5 — 버그 3건

### 7.1 FollowButton 하드코딩 → `/gallery` 리다이렉트
`GalleryFeed` 를 고치지 않고 5.1의 308 리다이렉트와 링크 교체를 **월요일에 먼저** 한다. `/theme/[slug]` 는 이미 서버에서 `following` 과 `promotionThreshold()` 를 넘긴다. 수요일까지 갤러리의 토론·이력 탭이 잠시 없어진다. 이력은 `/recent` 에, 토론은 문서별 `/talk` 에 있으므로 받아들인다.

### 7.2 투표 라우트 원자화
- `recomputeItemScore(itemId, asOf, db = prisma)` 처럼 클라이언트 인자를 받게 한다. 기존 호출부는 바뀌지 않는다.
- 라우트의 `existing 조회 → create/update/delete → recomputeItemScore(…, tx) → theme.update` 를 `prisma.$transaction(async (tx) => …)` 하나로 묶는다. 몰림 검사는 트랜잭션 밖, 뒤에 둔다(실패해도 표는 유효하다).
- 동시에 두 요청이 오면 한쪽의 P2002 는 기존 `handleError` 가 409 로 바꾼다. 점수는 항상 커밋된 표 전체로 계산된다.
- `VoteButtons`: 요청 중에 `busy` 상태로 두 버튼을 `disabled` 로 만든다. 이것이 더블클릭의 1차 방어이고, 사용자가 409 문구를 보지 않게 한다.
- 테스트 `tests/vote-route.test.ts`(mock): 같은 방향 재투표는 `removed`, 반대 방향은 `changed`(가중치 재계산), 쓰기는 `$transaction` 콜백 안에서만 일어난다, P2002 는 409 다.

### 7.3 몰림 신고 중복 적재
- 스키마는 `enum ReportTargetType { ITEM COMMENT THEME USER }` 로 값만 추가한다. SQLite 에서는 문자열이라 데이터 변경이 없다. 사용자 신고 API(`api/reports` 의 zod enum)는 그대로 둔다. 사람은 USER 를 신고할 수 없다.
- 몰림이 감지되면 `report.findFirst({ where: { targetType: 'USER', targetId: user.id, reason: 'AUTOMATED_VOTE_BURST', status: 'OPEN' } })` 를 조회한다. **없을 때만** 만든다. `detail` 에는 창 안의 표 수와 마지막 itemId 를 적는다. 3.1의 인덱스를 탄다.
- 그래서 한 사람의 몰림은 처리 전까지 OPEN 1건으로 남는다. 기존 ITEM 대상 자동 신고 행은 건드리지 않는다(DB 수정 금지, 이행 불필요).
- 테스트(7.2와 같은 파일): 임계를 넘은 뒤 표 3번 → `report.create` 1회.

## 8. 순서·의존성과 수용 기준

### 8.1 요일별 계획
매일 끝에 `npm run typecheck && npm test` 를 통과시키고 커밋한다. push 는 하지 않는다.

| 요일 | 작업 | 의존 | 완료 정의 |
|---|---|---|---|
| 월 | 5(7.1 리다이렉트·링크, 7.2, 7.3), 4a 토큰 정의, 스키마(Report 인덱스, enum USER) `db:push` | — | `/gallery/x` → 308 `/theme/x`. 팔로우 중인 계정이 갤러리 버튼에서 "팔로우 중"을 봄. 투표 테스트 통과 |
| 화 | 1 전체(3.2~3.6), 2의 분류(4.2) | 월 스키마(인덱스) | 보호 테스트 통과. 되돌리기 3회 만든 문서를 신규 계정으로 편집하면 403 + 배너 |
| 수 | 3 전체(5.2~5.5), 2의 주시목록(4.1) | 월 4a(새 화면은 토큰 사용), 화 4.2(분류 링크) | 탭 3개가 URL 로 공유됨. 인포박스가 모바일에서 본문 앞에 옴 |
| 목 | 4b 치환, 4c 라이트·토글, 6.4 가드, 8.2 점검표 | 수 3(GalleryFeed 제외 확정) | 가드 통과, `npm run build` 성공 |
| 검토 | 화요일 뒤 보안 검토자(1·5), 목요일 뒤 UX 검토자(3·4) | | `docs/agents/` 역할 정의 |

### 8.2 수용 기준 (목요일 점검표)
- [ ] `/gallery/<slug>` 가 308 로 `/theme/<slug>` 로 간다. `src/` 에 `/gallery/` 링크가 리다이렉트 파일 말고는 없다.
- [ ] 팔로우 중인 계정이 갤러리에서 "팔로우 중"을 보고, 누르면 언팔로우된다(반대 방향 정상).
- [ ] 투표 버튼을 빠르게 두 번 누르면 요청이 1회만 나간다. 강제로 동시 요청을 보내도 500 이 없다.
- [ ] 한 계정이 5분에 12표를 던지면 `Report(targetType USER)` 가 1건만 생긴다.
- [ ] 48시간 안에 되돌리기 3회 → 반보호 칩과 사유가 보인다. 가입 2일 계정의 편집·되돌리기는 403 이고 `protection.required = 'SEMI'` 다. 가입 5일·기여 5건 계정은 편집할 수 있다.
- [ ] 가격대 1위(비 provisional) 문서에 "가격대 1위 문서" 사유가 보인다. 2위 문서에는 보호가 없다.
- [ ] `/how-ranking-works#protection` 의 숫자가 `PROTECTION_RULES` 와 같다.
- [ ] `/themes?category=취미/아웃도어` 가 해당 테마만 보여 준다. 사이드바 허브 제목이 그 링크다. 문서 브레드크럼 첫 칸이 분류다.
- [ ] `/recent?scope=following`: 비로그인이면 로그인 후 복귀한다. 내 편집은 빠지고, 팔로우하지 않은 갤러리의 변경도 없다.
- [ ] `/theme/<slug>?tab=list&sort=new&tier=budget` 가 저가 문서만 최신순으로 표에 보여 준다. 새로고침과 뒤로 가기에서 유지된다. 표에 caption 과 `th scope` 가 있다.
- [ ] 문서 페이지 인포박스에 이미지, 티어, 가격, 점수, 접힌 점수 상세, 구매 링크가 있다. 375px 폭에서 본문보다 위에 있다.
- [ ] 라이트(토글을 노출한 경우): 홈, 갤러리, 문서, 편집, 최근 변경, 마이 6화면 × 360/1280px 에서 안 보이는 글자·경계가 없다. 마인드맵은 다크 패널로 보인다. 새로고침 시 깜빡임이 없다.
- [ ] `tests/design-tokens.test.ts` 가 통과한다. `npm run typecheck`, `npm test`, `npm run build` 가 통과한다.

## 9. ROADMAP 대비 바꾼 것 (이유)
| # | 변경 | 이유 |
|---|---|---|
| 1 | W44-5 FollowButton 은 `GalleryFeed` 수정 대신 **`/gallery` 308 리다이렉트를 월요일로 앞당겨** 해결한다 | 수요일에 사라질 컴포넌트를 고치는 것은 낭비다. `/theme/[slug]` 는 이미 정확하다. 언팔로우 버그를 이틀 일찍 막는다 |
| 2 | W44-3 의 개념글 필터(`best=1`)를 뺐다 → W45-2 | ROADMAP 충돌 조정에서 개념글은 서버 가중 규칙(W45)으로 정했다. `upCount ≥ 5` 임시 규칙을 화면에 내보내면 한 주 뒤 기준이 바뀐다 |
| 3 | W44-3 목록은 커서 없이 `take: 100` | 갤러리당 문서가 수십 개다. 넘으면 표시하고 그때 커서를 붙인다(ponytail 주석) |
| 4 | W44-1 의 1위 판정은 `Item.score` 근사 대신 `rankTier(limit 1)` | 보호 사유 "1위 문서"가 화면의 1위와 달라 보이면 투명성 원칙과 어긋난다. 비용은 현재 규모에서 작다 |
| 5 | W44-1 `GET /api/items/[id]/protection` 은 만들지 않는다 | 소비자가 서버 컴포넌트뿐이다. 403 응답에 같은 정보가 들어간다 |
| 6 | W44-2 주시목록에 "새 변경 n건" 배지(`User.watchlistSeenAt`)를 넣지 않는다 | W45 알림과 같은 UI 자리를 쓴다. 컬럼 추가를 한 번에 하려는 것이다 |
| 7 | W44-4 라이트 토글은 **가드 통과를 조건으로** 노출한다. 마인드맵은 다크로 고정한다 | 마인드맵 102곳은 디자인 시스템 범위 밖이다(ref-design-system 범위 절). 반쯤 깨진 라이트를 내보내지 않는다 |
| 8 | W44-5 몰림 신고 대상을 `USER` 로 바꿨다(enum 값 추가) | 몰림은 문서가 아니라 사람의 행동이다. W45-4 제재(`Sanction`)가 사용자 단위로 이 신고를 바로 쓸 수 있다 |
| 9 | 인포박스(W43-5 이월)를 W44-3 에 넣었다 | PROGRESS.md 의 결정을 따랐다 |

## 10. 범위 밖이지만 기록할 위험
- **편집으로 `tier` 를 바꿀 때 가격대 검증이 없다**(`ref-security.md` 중간 등급). 보호는 1위 문서만 덮는다. 2위 이하 경쟁 문서를 다른 가격대로 옮기는 공격은 여전히 가능하다. W45 백로그 후보로 올린다. 생성 라우트의 `validateTierAgainstPeers` 와 `confirmTier` 를 편집에도 적용하는 S 규모 작업이다.
- **편집 요청 큐 부재**: 보호된 문서를 고치는 경로가 토론뿐이다. 보호 403 건수를 보고 W45 회고에서 앞당길지 정한다.

## 11. 열린 질문 (기본값으로 진행)
- **Q1. `GalleryFeed.tsx` 삭제**: 무인 세션은 rm 이 금지라 파일을 남겨 둔다. 추천: 대화형 세션이 `git rm` 한다.
- **Q2. 라이트 테마 기본값**: 추천은 **시스템 설정을 따르는 것**(`prefers-color-scheme`)이다. ROADMAP 열린 결정 2 는 "다크 기본 유지"인데, 시스템이 라이트인 사용자에게는 라이트가 보이게 된다. 다크를 강제 기본으로 하려면 6.1의 `@media` 블록만 빼면 된다.
- **Q3. 1위 문서 자동 반보호**: 신규 계정이 가장 많이 보는 문서를 못 고치게 된다. 추천은 유지다(반달 표적 1순위). 첫 주 403 건수로 다시 본다.
