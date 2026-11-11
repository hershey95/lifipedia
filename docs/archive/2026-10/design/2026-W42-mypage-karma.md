# 설계서: 마이페이지(/me) + Karma·뱃지 진행도 (2026-W42)
- 작성: Claude (초안) / 리뷰: Gemini (1·2차) / 설계 검토: Opus (일요일) / 구현: Sonnet 월~목
- 상태: **확정 (Opus 검토 2026-10-11)**. 구현자는 이 문서만 보고 작업한다. 11절에 검토에서 바뀐 것을 정리했다.

## 1. 현재 상태 (코드 기준, 2026-10-11 확인)
- 공개 프로필 `/u/[id]` 가 있다(`src/app/u/[id]/page.tsx`): 뱃지, 신뢰도, 기여 수, 통계 4개, 작성 문서 Top10. 세션을 읽지 않고, `generateStaticParams` 가 없는 동적 세그먼트라 요청할 때마다 렌더된다.
- 신뢰도·뱃지는 `contributionCount` 에서 파생된다(`src/lib/trust.ts`). 기여 +1 은 **문서 생성·편집에서만** 일어난다(`bumpContribution`: `src/app/api/items/route.ts`, `src/app/api/items/[id]/edit/route.ts`). 투표·댓글은 기여가 아니다.
- `badgeProgress(count)` 는 **이미 구현돼 있고 테스트도 있다**(`trust.ts`, `tests/trust.test.ts`: 0·4·5·249·250·1000·음수·NaN·소수 입력). 이번 주에는 쓰기만 한다.
- 투표 가중치는 `voteWeightFor({ trustScore, accountCreatedAt, now })` 로 계산한다. `기본값 = clamp(trustScore, 0, MAX_VOTE_WEIGHT=3)`, 그리고 가입 후 경과 일수가 `NEW_ACCOUNT_DAYS=7` 보다 **작으면**(`<`) 여기에 `NEW_ACCOUNT_MULTIPLIER=0.25` 를 곱하고, 결과는 소수 4자리로 반올림한다. 투표 라우트(`api/items/[id]/vote`)는 **DB에 저장된 `user.trustScore`** 를 쓰고, 계산 결과를 `Vote.weight` 에 고정한다. 반대 방향으로 표를 바꾸면 그 시점 값으로 다시 계산된다.
- 인증: `currentUser()` 는 `{ id, trustScore, createdAt, suspendedUntil }` 를 돌려주고 세션이 없으면 `null` 이다. 정지 여부는 `isSuspended(user)` 로 확인한다. API 응답 헬퍼는 `ok(data, init?)`, `fail(status, message, extra?)` 가 `{ error, ...extra }` 를 돌려주는 형태이고, `handleError` 는 ZodError → 400 (`issues` 포함), 그 외 → 500 이다(`src/lib/api.ts`).
- 인덱스: `EditHistory` 에는 `editorId` 인덱스가 없다. `Item` 에는 `createdById` 인덱스가 없다. `Vote` 에는 `@@index([userId, createdAt])` 가 있고, `ThemeFollow` 에는 `@@index([userId])` 가 있다.
- **결함**: `src/components/SignInButtons.tsx` 가 `signIn(provider, { callbackUrl: '/' })` 로 고정돼 있다. 그래서 `/signin?callbackUrl=/me` 로 보내도 로그인 후 홈으로 간다. 이번 작업에서 고친다(7절 화요일).
- 헤더의 `AuthButton` 은 로그인하면 `/u/{id}` 링크를 보여 주는데, `hidden sm:inline` 이라 모바일에서는 보이지 않는다.

## 2. 목표
로그인한 사용자가 "내가 얼마나 기여했고, 그게 서비스에 어떤 영향을 주며, 다음에 무엇을 하면 되는지"를 한 화면에서 본다. **운영자 조정 없이 기여에서만 파생**된다는 원칙(`trust.ts` 주석)은 그대로 유지한다. `/me` 는 읽기 전용 표시이고, 점수를 바꾸는 경로는 새로 만들지 않는다.

## 3. 범위
### 포함
1. `/me`: 로그인이 필요하다. 비로그인이면 `redirect('/signin?callbackUrl=/me')` 로 보낸다. `robots: { index: false }`.
   - **Karma 카드**: 뱃지, 신뢰도(저장된 `trustScore`), 기여 수, 다음 뱃지까지 남은 기여 수와 진행 막대(`badgeProgress`), **내 한 표의 실제 가중치**(신규 계정 감쇠 포함, 해제일과 남은 일수).
   - **내 활동**: 작성한 문서와 편집을 합쳐 시간 역순으로 최근 30건.
   - **내 투표**: 최근 30건(문서명, 찬/반, 고정된 가중치).
   - **팔로우한 테마**: 최근 50건.
   - **프로필 수정**: 이름(1~30자), 소개(0~200자).
2. 헤더 `AuthButton`: 로그인하면 링크 대상을 `/me` 로 바꾸고, 모바일에서도 보이게 한다.
3. `/u/[id]`: 공개 내용은 그대로 둔다. 보는 사람이 본인이면 "마이페이지로" 링크만 추가한다(클라이언트 컴포넌트, 5절).
4. `/signin` 이 `callbackUrl` 을 존중하게 고친다.

### 제외 (이번 주 안 함)
- 기여 이벤트 로그 테이블, 뱃지 아이콘/이미지, 알림, 투표·댓글을 기여에 넣는 정책 변경, 타인 프로필의 상세 활동 공개, 프로필 이미지 변경, 페이지네이션("더 보기"), 프로필 수정 빈도 제한(11절 열린 질문 Q1).

## 4. 데이터·API

### 4.1 스키마 (`prisma/schema.prisma`)
테이블 추가는 없다. 인덱스 2개만 추가한다. 반영은 `npm run db:push` 로 하고 데이터는 잃지 않는다.
```prisma
model EditHistory { ... @@index([editorId, createdAt]) }   // 내 활동(편집)
model Item        { ... @@index([createdById, createdAt]) } // 내 활동(생성) + /u/[id] Top10
```

### 4.2 순수 함수 (DB 없이 테스트한다)
**`src/lib/trust.ts` 에 추가**
```ts
/** 화면 표시용. weight 는 반드시 voteWeightFor 를 호출해 얻는다(중복 계산 금지). */
export function voteWeightBreakdown(params: {
  trustScore: number; accountCreatedAt: Date; now?: Date;
}): {
  weight: number;               // = voteWeightFor(params)
  multiplier: number;           // 감쇠 중이면 NEW_ACCOUNT_MULTIPLIER, 아니면 1
  penaltyEndsAt: Date | null;   // createdAt + NEW_ACCOUNT_DAYS 일. 이미 지났으면 null
  daysLeft: number;             // 감쇠 중이면 Math.ceil((penaltyEndsAt - now) / 86_400_000), 아니면 0
}
```
- 경계는 `voteWeightFor` 와 같게 맞춘다. `now >= createdAt + 7일` 이면 감쇠가 없다(`ageDays < 7` 의 반대).
- 신뢰도는 **저장된 `user.trustScore`** 를 넣는다. 투표 라우트가 이 값을 쓰므로 화면 값과 실제 고정값이 일치한다.

**`src/lib/me.ts` (새 파일. prisma/next-auth 를 import 하지 않는다)**
```ts
import { z } from 'zod';

export const profileBody = z
  .strictObject({
    name: z.string().trim().min(1).max(30)
      .refine((s) => !/\p{Cc}/u.test(s), '이름에 제어 문자를 쓸 수 없습니다.')
      .optional(),
    bio: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.name !== undefined || b.bio !== undefined, '바꿀 항목이 없습니다.');

export type ActivityEntry = {
  kind: 'create' | 'edit';
  id: string;            // Item.id 또는 EditHistory.id
  at: Date;
  itemName: string;
  href: string;          // `/theme/${themeSlug}/item/${itemSlug}`
  revision?: number;     // edit 만
  summary?: string | null;
};

/** 두 목록을 at 내림차순으로 합친다. at 이 같으면 id 내림차순. 앞에서 limit 건. */
export function mergeActivity(created: ActivityEntry[], edits: ActivityEntry[], limit = 30): ActivityEntry[];
```
- `strictObject` 는 모르는 키(`trustScore`, `contributionCount` 같은 것)가 오면 400 으로 거절한다. **대량 할당 차단**이 목적이다.
- `bio` 가 trim 후 `''` 이면 `null` 로 저장한다. 이 변환은 라우트에서 한다.
- `.max(30)` 은 UTF-16 길이 기준이다. 한글은 1자로 세고 이모지는 2자로 센다. 이 정도면 충분하다.

### 4.3 `PATCH /api/me` (`src/app/api/me/route.ts`, `export const dynamic = 'force-dynamic'`)
처리 순서는 기존 라우트(`items/[id]/edit`)와 같다.
1. `const user = await currentUser()`. 없으면 `fail(401, '로그인이 필요합니다.')`.
2. `isSuspended(user)` 이면 `fail(403, '제재 중인 계정입니다.')`.
3. `const body = profileBody.parse(await request.json().catch(() => null))`. JSON 이 깨져 있어도 ZodError → 400 으로 처리되고 500 이 나지 않는다.
4. `prisma.user.update({ where: { id: user.id }, data: { ...(body.name !== undefined && { name: body.name }), ...(body.bio !== undefined && { bio: body.bio || null }) }, select: { name: true, bio: true } })`. **요청 body 를 그대로 펼쳐 넣지 않는다.**
5. `revalidatePath(`/u/${user.id}`)` 후 `ok({ name, bio })` 를 200 으로 응답한다.
6. 전체를 `try { … } catch (e) { return handleError(e) }` 로 감싼다.

| 상황 | 상태 | 응답 |
|---|---|---|
| 비로그인·세션 만료 | 401 | `{ error: '로그인이 필요합니다.' }` |
| 정지 사용자 | 403 | `{ error: '제재 중인 계정입니다.' }` |
| 31자 이름, 빈 이름, 201자 소개, 모르는 키, 빈 body, 깨진 JSON | 400 | `{ error: '입력값이 올바르지 않습니다.', issues }` |
| 성공 | 200 | `{ name, bio }` |
| 그 밖의 예외 | 500 | `handleError` |

- 429 는 없다. `abuse.ts` 의 `checkRate` 는 "최근 N초 행 수"를 세는 방식인데, 프로필 수정은 행을 남기지 않아 셀 대상이 없다. 수정 결과는 랭킹·신뢰도에 영향이 없고 멱등이다(Q1 참고).
- `id` 는 경로나 body 로 받지 않고 오직 세션에서만 얻는다. 그래서 IDOR 이 생길 수 없다.
- GET 은 만들지 않는다. `/me` 는 서버 컴포넌트가 DB 에서 직접 읽는다. 투표 내역을 내보내는 API 는 새로 만들지 않는다.

### 4.4 `/me` 데이터 조회 (`src/app/me/page.tsx`, 서버 컴포넌트)
```ts
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '마이페이지', robots: { index: false } };

const acting = await currentUser();
if (!acting) redirect('/signin?callbackUrl=/me');
const id = acting.id;
const itemLink = { select: { name: true, slug: true, theme: { select: { slug: true } } } } as const;

const [me, created, edits, votes, follows] = await Promise.all([
  prisma.user.findUnique({ where: { id }, select: {
    name: true, bio: true, createdAt: true, trustScore: true, contributionCount: true,
    badgeLevel: true, suspendedUntil: true, suspensionReason: true } }),        // email 은 select 하지 않는다
  prisma.item.findMany({ where: { createdById: id, isRemoved: false },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30,
    select: { id: true, name: true, slug: true, createdAt: true, theme: { select: { slug: true } } } }),
  prisma.editHistory.findMany({ where: { editorId: id, revision: { gt: 1 }, item: { isRemoved: false } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30,
    select: { id: true, revision: true, summary: true, createdAt: true, item: itemLink } }),
  prisma.vote.findMany({ where: { userId: id, item: { isRemoved: false } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 30,
    select: { id: true, type: true, weight: true, updatedAt: true, item: itemLink } }),
  prisma.themeFollow.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50,
    select: { theme: { select: { slug: true, name: true, status: true } } } }),
]);
if (!me) redirect('/signin?callbackUrl=/me');
```
- 쿼리 수는 세션 1~2개 + `currentUser` 1개 + 위 5개(병렬)다. 각 쿼리는 `take` 로 상한이 있고 인덱스(4.1, `Vote(userId, createdAt)`, `ThemeFollow(userId)`)를 탄다. N+1 은 없다.
- `revision > 1` 은 문서를 생성할 때 같이 만들어지는 revision 1 이력과 생성 항목이 중복되는 것을 막는다. revision 1 이력은 생성 라우트만 만든다.
- 두 목록을 각각 30건씩 가져와 `mergeActivity` 로 합친 뒤 30건으로 자르면, 합친 결과의 상위 30건이 정확하다(각 목록의 상위 30건 안에 반드시 들어 있다).
- 투표의 날짜 표시는 `updatedAt` 을 쓴다. 가중치가 고정된 시점이 이 값이기 때문이다. 정렬은 인덱스를 타도록 `createdAt` 으로 한다.
- 날짜는 `toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })` 로 표시한다.
- 가중치 숫자는 `toFixed(2)` 로 표시한다. 계산은 4자리 값으로 하고 표시만 반올림한다.

## 5. 화면 요구 (빈 상태·예외 포함)
**Karma 카드**
- "뱃지 {current} · 기여 {n}건 · 신뢰도 {trustScore.toFixed(2)}".
- `next` 가 있으면 "다음 뱃지({next}, {임계값}건)까지 {remaining}건"을 보여 주고 진행 막대를 단다. `next === null` 이면 "최고 등급"을 보여 주고 막대는 빼거나 100% 로 둔다.
- 진행 막대: `<div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="다음 뱃지까지 {percent}%">`.
- 한 표 가중치: 감쇠 중이면 "내 한 표 = 신뢰도 {t} × {multiplier} (신규 계정) = **{weight}** · {해제일}에 해제({daysLeft}일 남음)"으로 쓰고, 아니면 "내 한 표 = **{weight}** (상한 3.00)"으로 쓴다. 산정 방식 링크는 `/how-ranking-works` 로 건다.
- 문구에 "기여는 문서 작성·편집으로만 쌓입니다. 투표·댓글은 기여가 아닙니다."를 넣는다(D1 을 사용자에게 알리는 문장).

**정지 사용자** (`isSuspended(acting)`)
- 맨 위에 `<section role="status">` 배너를 둔다: "계정이 {해제일}까지 제재 중입니다. 사유: {suspensionReason ?? '기재되지 않음'}".
- 프로필 폼은 `disabled` 로 두고 버튼 옆에 이유를 적는다. 나머지 영역은 정상으로 보여 준다.

**빈 상태**
- 활동 0건: "아직 기여가 없습니다. 문서를 쓰거나 고치면 기여 1건이 됩니다." 와 `/themes` 링크.
- 투표 0건: "아직 투표하지 않았습니다."
- 팔로우 0건: "팔로우한 테마가 없습니다." 와 `/themes` 링크.
- 이름이 `null` 이면 제목에 "이름 없는 사용자"를 쓰고 폼 입력은 비워 둔다.

**목록 항목**
- 활동: 생성은 "문서 작성 · {문서명}"으로, 편집은 "편집 r{revision} · {문서명} · {summary}"로 쓰고 문서 링크를 단다.
- 투표: "{문서명} · 추천/비추천 · 가중치 {weight}".
- 팔로우: 테마명 링크와 상태 칩(PROPOSED/ACTIVE/DORMANT).
- 삭제(`isRemoved`)된 문서는 쿼리 단계에서 빠지므로 자리표시를 두지 않는다.

**프로필 폼** (`src/components/ProfileForm.tsx`, `'use client'`)
- Props: `{ initialName: string; initialBio: string; disabled: boolean }`.
- `<label htmlFor>` 를 단다. 이름 `maxLength={30} required`, 소개 `<textarea maxLength={200}>` 와 글자 수 표시.
- 제출하면 `fetch('/api/me', { method: 'PATCH', body: JSON.stringify({ name, bio }) })` 를 보낸다. 요청 중에는 버튼을 `disabled` 로 둔다. PATCH 는 멱등이라 중복 클릭해도 결과가 같다.
- 응답 처리:
  - 200: "저장했습니다", `router.refresh()`, 그리고 `useSession().update()` 로 헤더 이름을 갱신한다.
  - 401: "로그인이 만료되었습니다"와 `signIn()` 버튼.
  - 403·400: `error` 문구를 보여 준다.
  - 그 밖: "잠시 후 다시 시도해 주세요".
- 메시지는 `aria-live="polite"` 영역에 둔다.

**개인정보**
- **이메일은 `/me` 에도 표시하지 않는다.** `select` 에서도 빼고, API 응답에도 넣지 않는다. 로그인 계정 식별이 필요하면 나중에 마스킹해서 검토한다.
- 투표 내역은 `/me` 서버 렌더에만 나온다(D4). `/u/[id]` 의 `_count.votes`(숫자만)는 지금처럼 둔다.

**본인 링크** (`/u/[id]`)
- `src/components/AuthButton.tsx` 에 `export function OwnProfileLink({ profileId }: { profileId: string })` 를 추가한다. `useSession()` 의 id 가 `profileId` 와 같을 때만 `<Link href="/me">마이페이지로</Link>` 를 렌더하고, 아니면 `null` 이다. 공개 페이지는 세션을 읽지 않는 상태를 유지한다.

## 6. 결정 사항
| # | 결정 | 이유 | 대안 |
|---|---|---|---|
| D1 | 투표·댓글은 기여에 넣지 않는다 | 투표가 가중치를 올리면 자기강화 루프가 생기고, 조작 비용이 가장 낮다 | 댓글만 0.2 가중 |
| D2 | 기여 로그 테이블을 만들지 않는다 | 현재 데이터로 활동 목록을 재구성할 수 있고, 마이그레이션 위험을 피한다 | `ContributionEvent` (BACKLOG) |
| D3 | `/me` 와 `/u/[id]` 를 분리한다 | 본인 전용 정보(투표 내역)를 공개 페이지에 섞지 않는다 | `/u/[id]` 에서 본인이면 확장 |
| D4 | 내 투표 내역은 본인만 본다 | 투표 프라이버시 | 공개 |
| D5 | 표시용 가중치는 서버에서 `voteWeightFor` 로 계산하고 저장된 `trustScore` 를 쓴다 | 투표 라우트와 같은 입력·같은 함수를 써야 화면 값과 실제 값이 어긋나지 않는다 | 클라이언트 계산, `trustFromContributions(count)` |

## 7. 구현 순서 (Sonnet)
매일 끝에 `npm run typecheck && npm test` 를 통과시키고 커밋한다(push 는 지시가 있을 때만).

| 요일 | 작업 | 만들/고칠 파일 | 완료 정의 |
|---|---|---|---|
| 월 | 인덱스 2개 추가 후 `npm run db:push`. `voteWeightBreakdown`. `src/lib/me.ts`(`profileBody`, `mergeActivity`). `PATCH /api/me` | `prisma/schema.prisma`, `src/lib/trust.ts`, `src/lib/me.ts`(신규), `src/app/api/me/route.ts`(신규), `tests/trust.test.ts`, `tests/me.test.ts`(신규) | 아래 테스트 목록 통과. `npm run dev` 상태에서 쿠키 없이 `curl -X PATCH localhost:3000/api/me -d '{}'` 가 401 |
| 화 | `/signin` callbackUrl 수정. `/me` 페이지: 조회(4.4의 `me` 쿼리), Karma 카드, 정지 배너, `ProfileForm` | `src/app/signin/page.tsx`, `src/components/SignInButtons.tsx`, `src/app/me/page.tsx`(신규), `src/components/ProfileForm.tsx`(신규) | 비로그인 `/me` → `/signin?callbackUrl=/me` → 로그인 후 `/me` 로 복귀. 이름 저장 후 새로고침 없이 헤더 이름이 바뀜. `curl -sI` 결과 `/me` 응답에 `Cache-Control: private, no-cache, no-store` 계열이 있음 |
| 수 | 내 활동·내 투표·팔로우 목록(4.4 나머지 쿼리 + `mergeActivity`), 빈 상태. 헤더 `/me` 링크 | `src/app/me/page.tsx`, `src/components/AuthButton.tsx` | 신규 계정은 빈 상태 문구 3개가 보임. 문서 1건 생성 후 활동에 1줄만 보임. 그 문서를 편집하면 2줄(r2)이 됨. 모바일 폭(375px)에서도 헤더 링크가 보임 |
| 목 | `/u/[id]` 에 `OwnProfileLink`. 8절 점검표 전체 확인. 이 문서 1절의 "결함" 항목을 해결됨으로 갱신 | `src/components/AuthButton.tsx`, `src/app/u/[id]/page.tsx`, 이 문서 | 8절 체크 모두 통과. `npm run build` 성공 |

**`/signin` 수정**: `SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> })` 에서 `callbackUrl` 이 `'/'` 로 시작하고 `'//'` 로 시작하지 않을 때만 쓰고, 아니면 `'/'` 를 쓴다. 이 값을 `SignInButtons` 의 `callbackUrl` prop 으로 넘겨 `signIn(provider, { callbackUrl })` 에 쓴다.

**테스트 목록 (월요일)**
- `tests/trust.test.ts` 의 `voteWeightBreakdown`(`NOW` 고정, `trustScore: 2`):
  - 가입 0일 → `daysLeft` 7, `multiplier` 0.25, `weight` 0.5.
  - 3일 → `daysLeft` 4, `weight === voteWeightFor(같은 입력)`.
  - 6.5일 → `daysLeft` 1.
  - 정확히 7일 → `penaltyEndsAt` null, `daysLeft` 0, `weight` 2.
  - 30일 → 감쇠 없음.
  - `trustScore` 999 → `weight` 3.
- `tests/me.test.ts`:
  - `profileBody`: 30자 통과, 31자 실패, `'  '` 이름 실패, 이름 앞뒤 공백 trim, `'a\nb'` 이름 실패, 200자 소개 통과, 201자 실패, `{}` 실패, `{ trustScore: 3 }` 실패, `{ bio: '' }` 통과.
  - `mergeActivity`: 시간 역순 병합, `limit` 자르기, 같은 `at` 이면 id 내림차순, 한쪽이 빈 배열.

**DB 반영**: 이 프로젝트는 `prisma db push`(`package.json` 의 `db:push`, `docker-compose.yml` 기동 명령)를 쓴다. 인덱스 추가는 데이터를 잃지 않는다. NAS 는 기존 배포 절차를 따른다.

## 8. 수용 기준 (목요일 점검표)
- [ ] `/me` 는 `force-dynamic` 이고 응답이 비캐시다. 비로그인이면 `/signin?callbackUrl=/me` 로 가고, 로그인하면 `/me` 로 돌아온다.
- [ ] 로그인 시 5개 영역이 보인다: Karma, 활동, 투표, 팔로우, 프로필 폼.
- [ ] 기여 4건이면 "다음 뱃지(CONTRIBUTOR, 5건)까지 1건", 250건 이상이면 "최고 등급".
- [ ] 가입 3일 된 계정의 화면 가중치가 같은 계정이 지금 투표했을 때 `Vote.weight` 와 같다(소수 2자리 표시 기준). 해제까지 "4일 남음".
- [ ] 문서 생성 1건은 활동에 1줄로 나온다. 삭제(`isRemoved`)된 문서는 활동·투표 목록에 없다.
- [ ] 정지 사용자: 배너(사유·해제일)가 보이고, 폼이 `disabled` 이고, `PATCH` 는 403.
- [ ] `PATCH /api/me`: 비로그인 401, 31자 이름 400, `{ trustScore: 3 }` 400(DB 값 변하지 않음), 성공 200 `{ name, bio }`. 성공 후 `/u/{id}` 에 새 이름이 보인다.
- [ ] 이메일이 `/me` HTML 과 `PATCH` 응답 어디에도 없다(`curl` 결과에서 `@` 검색).
- [ ] 다른 사용자의 투표 내역은 어떤 경로로도 나오지 않는다. 새 라우트는 `PATCH /api/me` 하나이고 id 파라미터가 없다.
- [ ] 진행 막대에 `role="progressbar"` 와 aria 속성이 있고, 폼 입력에 라벨이 있다.
- [ ] `npm run typecheck`, `npm test`, `npm run build` 통과.

## 9. Gemini 리뷰 반영 (2026-10-10, Claude 판정)
| # | 지적 | 판정 | 반영 |
|---|---|---|---|
| 1 | 생성+최초 이력 중복 노출 | **수용** (코드 확인: items/route.ts 가 revision 1 을 같이 생성) | 4.4 `revision > 1`, 수용 기준 |
| 2 | 세션 페이지 캐시 위험 | **부분 수용** | `force-dynamic` 명시는 수용. `Cache-Control` 헤더 직접 지정은 거절했다. 쿠키를 읽는 동적 페이지는 Next 가 이미 비캐시로 응답하기 때문이다. 화요일 완료 정의에서 헤더를 확인한다 |
| 3 | 정지 사용자 UX | **수용** | 배너 + 폼 disabled |
| 4 | 삭제 문서 노출 | **부분 수용** | `isRemoved` 제외는 수용. "(삭제된 문서입니다)" 자리표시는 거절했다. 목록에서 빼는 편이 단순하고 `/u/[id]` 와도 일관된다 |
| 5 | 캐시 무효화·trim | **수용** (Opus 보정: 11절) | zod trim 채택. `revalidatePath` 는 `/u/{id}` 하나만 남긴다 |
| D2 | 이벤트 로그 백로그 | **수용** | BACKLOG 후보: 문서 삭제·롤백 시에도 기여 이력이 남도록 `ContributionEvent` |

## 10. 2차 리뷰 반영 (2026-10-11, 무인 세션 판정 + Claude 확인)
`gemini-on-claude` 리뷰 지적 5건 중 3건 수용, 2건 부분 수용.
- 코드로 이미 반영: `badgeProgress`/`badgeFor` NaN·소수 방어(+테스트), `danawa-price` 순차 처리·`FETCH_ERROR`·엔티티 디코드.
- 설계에 반영: 7절 DB 반영 절차, a11y 속성.

## 11. Opus 검토 결과 (2026-10-11)

### 바꾼 것
1. **`badgeProgress` 작업 삭제**: 이미 `trust.ts` 에 구현돼 있고 경계값 테스트도 있다(10절에서 반영됨). 그래서 월요일 작업에서 뺐다.
2. **`voteWeightBreakdown` 추가(D5)**: 초안은 "가중치와 해제까지 남은 일수"를 어디서 어떻게 계산할지 정하지 않았다. 이제 서버에서 `voteWeightFor` 를 그대로 호출하고, 투표 라우트와 같은 입력(저장된 `trustScore`)을 쓴다. 남은 일수는 `ceil`, 경계는 `>= 7일` 이면 해제로 `voteWeightFor` 의 `<` 와 일치시켰다.
3. **`/signin` callbackUrl 결함 수정을 범위에 넣음**: `SignInButtons` 가 `'/'` 로 고정돼 있어 "비로그인 → 로그인 → /me 복귀" 수용 기준을 지금 코드로는 만족할 수 없다.
4. **`Item @@index([createdById, createdAt])` 추가**: 내 활동(생성) 쿼리와 기존 `/u/[id]` 가 인덱스 없이 스캔하고 있었다. `db push` 한 번에 같이 반영한다.
5. **`PATCH /api/me` 를 구체화**:
   - `strictObject` 로 대량 할당(`trustScore` 같은 키)을 막는다. 신뢰도를 기여로만 바꾼다는 원칙을 지키는 장치다.
   - 깨진 JSON 은 500 이 아니라 400 으로 응답한다. 이름에 제어 문자를 금지한다. 빈 소개는 `null` 로 저장한다.
   - 에러 코드 표를 넣었다. 429 는 뺐다(Q1).
6. **`revalidatePath('/me')` 삭제**: `force-dynamic` 이라 캐시할 대상이 없다. 9절 #5 의 "`/u/[id]` 는 정적 캐시될 수 있다"는 실제로는 맞지 않는다(동적 세그먼트이고 `generateStaticParams` 가 없다). 다만 나중에 정적화될 경우에 대비해 `/u/{id}` 무효화는 남겼다. 비용은 없다. 클라이언트 쪽에서 `router.refresh()` 와 `useSession().update()` 를 하도록 명시했다.
7. **쿼리 개요·정렬·동률 기준 확정**: Promise.all 5개를 쓰고 동률은 `id desc` 로 정한다. 병합한 상위 30건이 정확하다는 근거와 투표 날짜에 `updatedAt` 을 쓰는 이유를 적었다.
8. **테스트 분리**: 순수 함수를 `src/lib/me.ts` 로 분리해 DB·next-auth 없이 테스트한다.
9. **화면 요구 추가**: 빈 상태 3종, 세션 만료(401) 처리, 이메일 비표시, 모바일 헤더 링크, `OwnProfileLink` 를 클라이언트 컴포넌트로 만드는 것(공개 페이지는 세션을 읽지 않게 유지). 모두 5절에 넣었다.
10. **작업 표 개선**: 요일별로 만들/고칠 파일과 검증 가능한 완료 정의를 붙였다. 수용 기준을 목요일 점검표로 바꿨다.

### 바꾸지 않은 쟁점
- **D1~D4**: 9·10절 판정과 모순이 없다. 9절 #4(삭제 문서를 빼는 처리)는 D3·`/u/[id]` 와 일관된다. D2 의 BACKLOG 항목도 그대로 둔다.
- **9절 #2 (`Cache-Control` 직접 지정 거절)**: 그대로 둔다. 화요일 완료 정의에서 실제 헤더로 확인한다.
- **이름 중복 허용**: 링크가 id 기반이라 혼동 위험이 작다. 이름을 고유하게 만들면 OAuth 가입 흐름을 고쳐야 한다.
- **페이지네이션 없음**: 30·30·50건 상한으로 충분하다. 필요해지면 "더 보기"를 커서 기반으로 붙인다.

### 열린 질문
- **Q1. 프로필 수정 빈도 제한이 필요한가?** 추천: **이번 주는 하지 않는다.** 셀 기록이 없고(D2), 랭킹 영향도 없다. 이름 도배나 사칭이 관찰되면 그때 `User.profileUpdatedAt` 필드를 하나 추가해 "60초 1회" 정도로 막는다. 테이블은 추가하지 않는다.
- **Q2. `/me` 에서 본인 이메일을 마스킹해서라도 보여 줄까?** 추천: **보여 주지 않는다.** 지금 쓰임새가 없고, 로그인 공급자 화면에서 확인할 수 있다.
