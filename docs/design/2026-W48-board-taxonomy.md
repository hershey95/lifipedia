# 설계서: 분류 마감 + 게시판 (2026-W48, 11/16~11/22)
- 작성: Claude (무인 설계 세션, 2026-11-15) / 리뷰: 안티(다음 실행의 `gemini-on-claude`) / 구현: Sonnet 월~목
- 상태: **초안**. 기준은 `ROADMAP.md` "W47~W48 재배치" 표의 W48 행이다. 다만 그 행들은 대부분 사람 결정에 막혀 있다. 그래서 실제 큐는 `reviews/retro/2026-W47-retro.md` 4절(#3 큐 순서, #1 게이트, #7 기본값, #8 리뷰 반영)을 따른다. 바꾼 것은 10절에 이유와 함께 적었다.
- 이 설계서가 W47 의 두 설계서(`2026-W47-community-sources.md` 8.1, `2026-W47-taxonomy-situation.md` 5절)의 요일표를 대신한다(회고 4절 #4). 두 문서의 **설계 내용**(S·K·B·C 절, 분류·게시판 모델)은 그대로 유효하고 여기서 절 번호로 인용한다.
- 용어는 `GLOSSARY.md` 를 따른다. 옛 설계서의 "리프"는 여기서 **소분류**, "아이템/항목"은 **문서**, "연결"은 **배치**로 쓴다.

## 1. 현재 상태 (코드 기준, 2026-11-15 확인)
- **스키마는 있는데 DB 에 없다.** `ThemeKind`·`SituationCategory`(T1), `PageView`·`ViewMark`(V1), `CommentVote`·`Notification`(A-4a)이 `prisma/schema.prisma` 에 있다. `db:push` 는 10-26 이후 한 번도 적용되지 않았다(20일째). 그래서 `npm run build` 가 prerender 에서 `P2021` 로 실패한다.
- **분류(T) 라인은 코드만 있다.** `taxonomy.ts`·`popularity.ts`·`situation.ts` 는 순수 함수와 테스트까지 끝났다. 그러나 `CATEGORY` 행과 배치 행이 DB 에 없다. 시드 `content/taxonomy.json` 도 이 저장소에 없다(안티 클론에만 있다). 그래서 분류 페이지와 인기 카드는 한 번도 실제 데이터로 그려진 적이 없다.
- **`content:check` 가 시드 파일을 오류로 본다.** `scripts/check-content.ts` 는 JSON 을 그대로 `checkContent(data, galleries)` 에 넘긴다. 그리고 `content-check.ts:55` 가 `items` 배열이 없으면 오류를 낸다. 스크립트는 `.items` 를 직접 만지지 않는다. 그러므로 `src/lib` 만 고치면 해결된다(5.1).
- **T2 잔여**: 상황 페이지(`theme/[slug]/page.tsx:114-153`)가 요청마다 `CATEGORY` 전량과 30일 투표·편집·댓글을 읽는다(`unstable_cache` 없음, `src/app` 에서 grep 0건). 중분류 상위 요약, 문서 3개 미만 소분류 합치기, "인기 산정 방식" 공개 설명이 없다.
- **V1 잔여**: `POST /api/views` 를 부르는 컴포넌트가 없다(`src/components` grep 0건). 그래서 `PageView` 가 쌓이지 않는다. `buildSituationCards` 입력에 조회 항이 없다. `vid` 쿠키에 `Secure` 가 없다(`views/route.ts:45`). IP 한도기 `Map` 에서 키가 지워지지 않는다(`views.ts:29`). 라우트 테스트가 없다.
- **게시판(P)**: `Post`·`PostVote`·`PostComment` 스키마도 코드도 없다. `comments.ts`(W45 4.2 의 트리·Wilson·개념글 순수 함수)도 없다.
- **화면 문구의 금지어**: `theme/[slug]/page.tsx:245` "아직 연결된 분류가 없습니다", `:324`·`:411` "항목". GLOSSARY 기준 "배치", "문서" 여야 한다.

## 2. 목표와 범위
목표는 두 가지다. **분류 라인을 데이터에 닿게 마감하는 것**, 그리고 **상황 갤러리를 커뮤니티로 만드는 게시판의 뼈대를 세우는 것**(사용자 지시, taxonomy 설계서 7절).
W47 실적은 구현일 이틀에 커밋 4개(약 700줄)였다(회고 1절). 그래서 요일표에는 구현 작업 **4개만** 둔다. 나머지는 "남는 날" 슬롯에 순서만 정해 둔다.

| 순서 | 작업 | 원 번호 | 규모 | 요일 |
|---|---|---|---|---|
| G | **사람 게이트**: DB 백업 → `db:push` → `build` | 회고 #1 | S | 월 오전 (사람) |
| M1 | 분류 마감: 시드 검증 연결, 캐시, 상위 요약·합치기, 인기 산정 공개, 문구 | T2·T3 잔여 | M | 월 |
| M2 | 조회 지표 연결: 비콘, 인기의 조회 항, `Secure`, 한도기 정리, 라우트 테스트 | V1 잔여 + 안티 리뷰 4건 | M | 월 (넘치면 화 오전) |
| P1 | 게시판: `Post`·`PostVote`·`PostComment`·글 작성/목록/상세 + `comments.ts` | P1 (+B 흡수) | L | 화~수 |
| P2 | 답변의 문서 첨부·집계·도움됨 | P2 | M | 목 |
| — | 회고 `reviews/retro/2026-W48-retro.md` | | | 금 |
| 남는 날 | ① P3 베스트 문서·답변 없는 질문 ② B 토론 댓글 투표 ③ C 알림 3종 ④ `useOptimistic` ⑤ S 출처 구조 ⑥ K `ink` 치환·삭제 | | | 순서대로 |

**막혀서 이번 주에 짓지 않는 것** (요일표에 넣지 않는다. 풀리면 남는 날 슬롯 뒤에 붙는다):

| 작업 | 원 번호 | 막힌 이유 | 풀리는 조건 |
|---|---|---|---|
| 하드코딩 팔레트 치환·가드 2번·라이트 토글 | W44-4b 나머지·4c | 의미 판단(점수 `amber` 등)에 육안 확인이 필요하다(W47 9절 #5) | 사람이 다크·라이트 화면을 한 번 본다. 그리고 K 가 먼저 끝나야 한다 |
| 콘텐츠 `facts` + `content:import` | W46-2 | `scripts/import-content.ts` 2줄 수정이 무인 금지다. S(`Item.sources`)가 선행이다 | `scripts/` 허용 또는 사람 적용, S 완료 |
| 처리방침·약관·계정 삭제 | W46-3 | 책임자 연락처·서버 위치·OAuth·백업 주기는 운영자만 아는 사실이다 | 사용자가 네 값을 준다 |
| Playwright 시각 회귀 | W46-4 | 의존성 설치 허용, 시드 DB(게이트 G) | 둘 다 |
| 신고 처리·제재 | W45-4 | 검토자 결정(ref-security Q7). 안티 리뷰 11-15 #3 도 보안 검토 뒤로 미뤘다 | 사용자 결정 |

## 3. 게이트 G — 사람이 하는 일 (월 오전, 무인 세션은 하지 않는다)
순서대로 한다. 무인 세션은 결과를 `dev.md` 에서 확인만 한다.
1. **백업**: `cp prisma/dev.db prisma/dev.db.bak`(운영 DB 는 별도 백업). 11-14 수용 답신 #1 이다. SQLite 에서 여러 변경을 한 번에 넣으면 Prisma 가 테이블을 다시 만들 수 있다.
2. **`npm run db:push`**: A-4a·T1·V1 이 한꺼번에 들어간다. P1 스키마는 화요일 커밋 뒤에 **한 번 더** 필요하다(P1 끝에 사람이 실행).
3. **`npm run build`** 통과 확인. 통과하면 A-4a~V1 의 `[x]` 에 "게이트 확인"을 붙인다. 실패하거나 못 하면 W48 의 모든 `[x]` 에 "build 미확인"을 적는다(회고 #1).
4. **`scripts/` 세 가지**(무인 금지라 사람이 한다. 11-15 답신 #2, 회고 #2):
   - `collect-facts.py`: `items` 없는 JSON 은 건너뛴다(`KeyError: 'items'`, 3일째).
   - 시드 import 래퍼: `parseTaxonomySeed` → `Theme(kind: CATEGORY)` upsert + `SituationCategory` upsert.
   - 재배치 래퍼: `planReassignment` 결과를 확인한 뒤 `Item.themeId` 갱신.
5. **`content/taxonomy.json`** 을 안티 클론에서 이 저장소로 가져온다. M1 이후 `npm run content:check -- content/taxonomy.json` 이 통과해야 한다.
6. **무인 Bash 허용 상태 한 줄**을 `docs/` 에 남긴다(회고 #5). 다시 막히면 그날은 설계·문서 작업으로 돌린다.

## 4. 순서와 의존성
```
G(db:push·build) ─┬─> M1 ──> (시드·래퍼 적용, 사람) ──> 분류 화면 육안 확인
                  ├─> M2 ──> (조회 데이터 30일 쌓임) ──> 인기의 조회 항이 실제로 0이 아니게 됨 (12월 중순)
                  └─> P1 ──> (db:push 2차, 사람) ──> P2 ──> P3
                                └─> B(같은 comments.ts) ──> C(개념글 생성 지점) 
                                └─> useOptimistic(세 종류 투표 버튼이 모두 생긴 뒤)
```
- **강한 의존**: P1 → P2 → P3, P1 → B → C. 코드상 G 에 의존하는 것은 없다. 단위 테스트는 mock 으로 돈다. 다만 G 가 없으면 화면 확인과 `build` 가 불가능하다.
- **M1·M2 는 서로, 그리고 P 와 독립이다.** 월요일에 둘 다 못 끝내면 M2 를 화요일 오전으로 민다. P1 은 수요일까지 끝내면 된다.
- **넘칠 때**: P1 이 목요일까지 가면 P2 를 W49 로 보낸다. 남는 날 슬롯은 위에서부터 집는다.

## 5. 작업 M1 — 분류 마감

- **데이터 모델**: 변경 없음. **API**: 변경 없음. 바뀌는 것은 순수 함수·서버 컴포넌트·공개 설명 페이지다.

### 5.1 `content:check` 가 시드 파일을 알아보게 한다 (`src/lib/content-check.ts`)
두 방향이 수용돼 있다. 11-15 답신 #2 는 "`items` 없는 파일은 건너뛴다", PROGRESS T3 잔여는 "`content:check` 에 시드 검증을 연결한다"이다. **둘을 한 분기로 합친다.** `checkContent` 첫머리에서 `categories`·`situations` 배열이 있으면 갤러리 파일(`gallery`·`items` 필드) 규칙 대신 `parseTaxonomySeed` 를 돌리고, 그 `errors` 를 `Issue` 로 바꿔 돌려준다. 건너뛰기만 하면 시드의 깨진 부모 slug 를 아무도 잡지 못한다. 반대로 검증기를 따로 만들면 스크립트(`scripts/check-content.ts`)를 고쳐야 한다. 이 분기 하나는 둘 다 피한다.
```ts
export function checkContent(data: unknown, galleries: string[]): Issue[] {
  const d = data as Json;
  if (d && Array.isArray(d.categories) && Array.isArray(d.situations)) {
    return parseTaxonomySeed(d).errors.map((msg) => ({ level: 'error' as const, msg }));
  }
  // 기존 갤러리 파일(gallery·items 필드) 검사 그대로
}
```
- `situation.ts` → `content-check.ts` import 는 순환이 없다(`situation.ts` 는 `popularity`·`taxonomy` 만 본다).
- `collect-facts.py` 의 같은 문제는 `scripts/` 라 사람이 고친다(3절 4).
- **테스트**(`tests/content-check.test.ts` 에 더함): 올바른 시드 → `[]`. 없는 부모 → 오류 1건, 문장에 slug 포함. `categories` 만 있고 `situations` 가 없으면 → 기존 "gallery 와 items 배열이 필요합니다" 오류(분기를 타지 않는다).

### 5.2 상황 페이지 집계 캐시 (`unstable_cache` 60초)
- `theme/[slug]/page.tsx:114-153` 의 카드 계산을 같은 파일의 `loadSituationCards(themeId)` 로 옮긴다. 그리고 `unstable_cache(fn, ['situation-cards'], { revalidate: 60 })` 로 감싼다. 키에는 `themeId` 인자가 자동으로 들어간다. 안티 리뷰 11-13 의 "`CATEGORY` 전량 조회(`page.tsx:121`)"가 이 캐시로 해결된다.
- 반환값 `SituationCard[]` 에는 `Date` 가 없다. 캐시 직렬화로 깨질 값이 없다. **`asOf = new Date()` 는 함수 안에서 만든다.** 밖에서 넘기면 매 요청 키가 달라져 캐시가 무력해진다.
- `revalidateTag` 는 넣지 않는다. 60초 지연은 인기 정렬에 문제가 없다(taxonomy 설계 2절).
- **테스트**: 캐시 자체는 Next 런타임이라 단위 테스트하지 않는다. 11-14 답신 #4 의 "60초 캐시 검증을 `situation.test.ts` 에" 는 부분 변경한다. 래퍼 호출을 mock 으로 확인하면 구현 세부에 결합한다(`CLAUDE.md` 구현 규율). 대신 순수 함수 `buildSituationCards` 의 기존 테스트가 계산을 고정한다. 캐시는 G 이후 화면에서 "60초 안 재요청 시 쿼리 로그 없음"으로 dev 보고에 적는다.

### 5.3 중분류 상위 요약 + 문서 3개 미만 소분류 합치기 (`src/lib/situation.ts`)
taxonomy 설계 3절("중분류는 하위 소분류의 1위를 모아 보여준다")과 6절("문서 3개 미만 소분류는 상위 목록에 합친다, 순위는 3개부터")이다.
```ts
export const CATEGORY_SUMMARY_RULES = { MIN_ITEMS_TO_RANK: 3 } as const;
export type ChildSummary = { slug: string; name: string; itemCount: number; top: { name: string; slug: string } | null };
/** 중·대분류 페이지용. 직속 하위 분류마다 하위 전체 문서를 모아, 3개 이상이면 1위(score)를 보이고 아니면 merged 로 보낸다. */
export function summarizeChildren(input: {
  parentId: string;
  cats: { id: string; slug: string; name: string; parentId: string | null }[];
  items: { id: string; themeId: string; name: string; slug: string; score: number }[];
}): { ranked: ChildSummary[]; merged: { name: string; slug: string; themeSlug: string }[] };
```
- 하위 전체(손자 포함)는 `buildSituationCards` 의 `subtree` 를 모듈 내부 함수로 끌어올려 같이 쓴다. 새 파일을 만들지 않는다.
- `ranked` 순서: 1위 문서 `score desc → slug asc`. 1위의 티어는 따지지 않는다. 화면에 티어 배지로 보인다. 같은 소분류 안 티어별 순위는 소분류 페이지의 일이다.
- 화면(`theme/[slug]/page.tsx`, `kind === 'CATEGORY'` 이고 하위 분류가 있을 때): 기존 하위 분류 칩 아래에 "하위 분류 1위" 카드 목록, 그 아래 "문서 3개 미만 분류의 문서" 단순 목록. 소분류(하위 없음) 페이지는 지금 그대로다.
- **테스트**(`tests/situation.test.ts`): 손자 소분류의 문서가 중분류 자식 카드에 모인다. 문서 2개인 자식 → `merged`, `ranked` 에 없음. 3개 → `ranked`, `top` 은 최고 `score`. 동점은 `id` 순. 자식 없음 → 둘 다 빈 배열.

### 5.4 "인기 산정 방식" 공개 (`how-ranking-works/page.tsx`)
- 기존 페이지에 `<h2 id="popularity">인기 (상황 갤러리 안의 분류 정렬)</h2>` 절을 더한다. 새 라우트는 만들지 않는다.
- 숫자는 **`POPULARITY_RULES` 를 import 해서 렌더**한다(창 30일, 편집 2, 댓글 1, 조회 0.1, 조회 30일 조건). 문구와 코드가 어긋날 수 없게 한다.
- 꼭 적을 문장 세 가지:
  - "인기는 점수와 별개입니다. 문서 순위에는 들어가지 않습니다(ADR 0001)."
  - "추천과 비추천 모두 활동으로 셉니다." 현재 해석이다. 바뀌면 이 줄도 바뀐다(11절 결정 1).
  - "조회는 지표가 30일 이상 쌓인 뒤부터 반영합니다."
- 상황 페이지의 카드 목록 제목 옆에 `산정 방식` 링크(`/how-ranking-works#popularity`)를 둔다.

### 5.5 화면 문구 (GLOSSARY)
- `page.tsx:245` → "아직 배치된 분류 갤러리가 없습니다." 그리고 `/themes?category=` 로 가는 "분류 둘러보기" 링크를 단다(taxonomy 3절 "제안 링크". 배치 제안 흐름은 W49 이후라 지금은 둘러보기로 둔다).
- `page.tsx:324`·`:411` 의 "항목" → "문서". 이 파일의 다른 금지어("테마" 등)는 K 의 치환 커밋 때 같이 본다. 이번에는 바꾸지 않는다(범위 고정).

### 5.6 위험 (M1)
- **60초 지연**: 투표·편집 직후 상황 갤러리의 카드 순서가 최대 60초 늦게 바뀐다. 인기는 30일 창 지표라 문제없다. 문서 순위(점수)는 캐시 밖이다.
- **캐시 키 실수**: `asOf` 를 밖에서 넘기면 요청마다 키가 달라져 캐시가 무력해진다(5.2). 코드 리뷰 항목으로 둔다.
- **시드 분기의 오판**: `categories`·`situations` 배열을 **둘 다** 가진 JSON 만 시드로 본다. 갤러리 파일(`gallery`·`items` 필드)에는 두 키가 없다. 두 키를 다 가진 갤러리 파일이 생기면 갤러리 파일 규칙 검사를 건너뛰게 된다. 그래서 테스트 3번째 사례("`categories` 만 있으면 기존 검사")로 경계를 고정한다.
- **데이터 없이 만든 화면**: G 와 시드 적용 전에는 `summarizeChildren` 결과가 늘 빈 배열이다. 육안 확인은 G 뒤로 미룬다(회고 3절 "데이터 없이 만든 화면").

### 5.7 수용 기준 (M1)
- [ ] `content:check` 가 올바른 시드에 오류 0, 깨진 부모에 오류 1을 낸다(테스트). 갤러리 파일(`gallery`·`items`)의 결과는 변하지 않는다.
- [ ] 상황 페이지의 카드 계산이 `unstable_cache` 60초 안에 있다. `asOf` 는 함수 안에서 만든다.
- [ ] `summarizeChildren` 테스트 5건이 통과한다. 중분류 페이지에 상위 요약과 합친 목록이 보인다(G 이후 육안. 못 보면 "육안 미확인").
- [ ] `how-ranking-works#popularity` 의 숫자가 `POPULARITY_RULES` 에서 온다.
- [ ] `npx tsc --noEmit`, `npx vitest run` 통과. `npm run build` 결과(G 여부에 따라)를 기록한다.

## 6. 작업 M2 — 조회 지표 연결
- **데이터 모델**: 변경 없음(`PageView`·`ViewMark` 는 V1 에 있음. `ViewTarget.POST` 는 P1). **API**: `POST /api/views` 의 요청·응답 형식은 그대로다. `Set-Cookie` 의 `Secure` 속성만 바뀐다.

### 6.1 비콘 컴포넌트 `src/components/ViewBeacon.tsx`
```tsx
'use client';
export function ViewBeacon({ targetType, targetId }: { targetType: 'THEME' | 'ITEM' | 'POST'; targetId: string }) {
  useEffect(() => {
    fetch('/api/views', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetType, targetId }) }).catch(() => {});
  }, [targetType, targetId]);
  return null;
}
```
- 둘 곳: `theme/[slug]/page.tsx`(THEME), `theme/[slug]/item/[itemSlug]/page.tsx`(ITEM). P1 뒤에 글 상세(POST)에도 둔다.
- 실패는 조용히 무시한다. 조회는 보조 신호다. 비로그인도 센다. 쿠키 `vid` 만 쓰고 계정과 연결하지 않는다(taxonomy 7.3).
- 테스트는 두지 않는다. 한 줄 `fetch` 이고, 라우트 쪽 테스트(6.4)가 계약을 고정한다.

### 6.2 인기의 조회 항 연결 (`situation.ts`·상황 페이지)
- `buildSituationCards` 입력에 `views: { themeId: string; count: number }[]` 와 `viewsTrackedDays: number` 를 더한다. 카드마다 하위 전체의 합을 `popularity({ …, views, viewsTrackedDays })` 로 넘긴다. `popularity.ts` 는 이미 이 두 값을 받는다. 바꾸지 않는다.
- 하위 전체의 조회는 그 분류들의 THEME 조회와 소속 문서의 ITEM 조회를 더한 값이다. 로더(5.2 의 `loadSituationCards`)가 30일 `pageView.findMany({ where: { day: { gte } } })` 1회로 읽는다. 그리고 ITEM 행은 문서 → `themeId` 로 바꿔 넘긴다.
- `viewsTrackedDays` = 가장 이른 `PageView.day` 부터 오늘까지의 일수다(`findFirst({ orderBy: { day: 'asc' } })` 1회). 행이 없으면 0 이다. 그러면 12월 중순까지 조회 항은 자동으로 0 이다.
- **ADR 0001 해석은 닫는다.** ADR 본문이 "조회는 분류·문서의 정렬 신호(인기)로만 쓰고, 점수는 시점 고정 가중 투표로만 계산한다"고 적고 있다. GLOSSARY "인기"도 "점수와 별개"다. 그러니 분류 인기에 조회 항을 넣는 것은 ADR 안이다. 11-14 dev 의 사용자 결정 3번은 이 근거로 종결한다(11절).
- **테스트**(`tests/situation.test.ts`): `viewsTrackedDays: 29` → 조회가 커도 점수 변화 없음. `30` → 하위 분류의 조회 1000 이 카드 점수를 +100 올린다. 배치되지 않은 분류의 조회는 섞이지 않는다.

### 6.3 `vid` 쿠키 `Secure` (`views/route.ts:45`) — 안티 리뷰 11-15 #1
- 11-15 답신은 `NODE_ENV === 'production'` 조건을 적었다. **조건을 요청 프로토콜로 바꾼다.** NAS 배포가 평문 http 로 열리는 경우가 있으면 production 에서 `Secure` 쿠키는 저장되지 않는다. 그러면 매 요청 새 `vid` 가 생겨 중복 제거가 통째로 깨진다(모든 조회가 센 값이 된다).
  ```ts
  const https = (request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')) === 'https';
  … `vid=${vid}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`
  ```
- HMAC 서명은 비밀키 환경변수가 필요하다(`.env` 수정은 무인 금지). 이번에도 기본값(서명 없음)으로 둔다. 위조해도 자기 방문의 중복 제거만 우회하고, IP 분당 60 한도에 걸린다(회고 2절 #4).

### 6.4 라우트 테스트 `tests/views-route.test.ts` — 안티 리뷰 11-15 #4
`vote-route.test.ts` 와 같은 mock 방식으로 쓴다. 한도기는 모듈 수준 상태라 **사례마다 다른 `x-forwarded-for` 를 쓴다.** 그래야 429 사례가 테스트 순서에 의존하지 않는다. 안티 리뷰는 "400/404"라고 했지만 **이 라우트에는 404 가 없다.** 없는 대상은 `202 { counted: false }` 다. 존재 여부를 숨기려는 동작이라 그대로 고정한다.
- 잘못된 본문(`targetType: 'USER'`, `targetId` 누락) → 400.
- 봇 UA → 202 `counted: false`, DB 호출 없음.
- 없는 대상 → 202 `counted: false`, `viewMark.create` 호출 없음.
- 첫 방문(쿠키 없음) → `Set-Cookie` 에 `vid=`·`HttpOnly`. `x-forwarded-proto: https` 면 `Secure` 가 있고, 없으면 없다.
- 같은 날 재방문(`P2002`) → 202 `counted: false`, 500 아님.
- 61번째 요청(같은 IP) → 429.

### 6.5 IP 한도기 정리 (`views.ts:28`) — 안티 리뷰 11-13
- 창 밖 기록만 남은 IP 는 키를 지운다. 그리고 `hits.size > 10_000` 이면 한 번 훑어 빈 키를 지운다(ponytail: 프로세스 메모리 한계는 기존 주석대로).
- 반환 함수에 `size()` 를 붙여 테스트가 공개 표면으로 확인하게 한다.
- **테스트**(`tests/views.test.ts`): IP 3개가 1번씩 요청 → 창(60초) 뒤 아무 IP 로 요청 → `size()` 가 1.

### 6.6 위험 (M2)
- **쿠키를 지우며 조회 부풀리기**: 중복 제거는 `vid` 쿠키 기준이다. 한 IP 가 요청마다 쿠키를 버리면 분당 60회까지 매번 센다. 하루에 한 대상에 약 86,000회다. 가중 0.1 을 곱해도 인기 약 8,600 이라, 어떤 투표 항보다 크다.
  - 조회 항은 지표가 30일 쌓이는 12월 중순까지 자동으로 0 이다. 그래서 **W48 을 막지는 않는다.**
  - 그러나 조회 항이 켜지기 전에 상한을 정해야 한다. 상한은 인기 산식의 변경이라 거버넌스다(11-14 답신 #3). 11절 결정 6 으로 올린다.
  - 후보: 대상별 하루 조회 상한(예: 하루 IP 수 기준), 조회 항을 `log1p(조회)` 로 압축하는 방법.
- **개발 모드 이중 호출**: React StrictMode 는 개발 중 `useEffect` 를 두 번 부른다. 같은 날 `ViewMark` 중복 제거가 흡수하므로 두 번 세지 않는다. 운영 빌드에는 해당하지 않는다.
- **http 배포에서 `Secure`**: 6.3 대로 요청 프로토콜로 판정한다. 프록시가 `x-forwarded-proto` 를 넘기지 않는 https 배포라면 `Secure` 가 빠진다. 그래도 동작은 하고 보안만 약간 약하다. G 의 NAS 확인 항목에 넣는다.
- **봇 필터 우회**: UA 필터는 정직한 봇만 거른다. 나머지는 IP 한도와 위의 상한 결정이 받는다.

### 6.7 수용 기준 (M2)
- [ ] 분류·문서 페이지를 열면 `/api/views` 가 1회 호출된다(G 이후 `PageView` 행으로 확인, 못 하면 "육안 미확인").
- [ ] `views-route.test.ts` 6건, `views.test.ts` 정리 1건, `situation.test.ts` 조회 항 3건이 통과한다.
- [ ] `Secure` 는 https 요청에만 붙는다.
- [ ] `tsc`·`vitest` 통과.

## 7. 작업 P1 — 게시판 (화~수)
설계 근거: taxonomy 설계서 7.1·7.2, W45 설계서 4.2~4.4(댓글 투표 규칙). 기존 `TalkComment`·`CommentVote` 는 **바꾸지 않는다.** `CommentVote` 는 `TalkComment` 에 FK 가 있고 `TalkComment.itemId` 는 필수다. 이 둘을 일반화하려면 SQLite 테이블 재생성(파괴적 위험)이 필요하다. 그래서 게시판은 **같은 모양의 새 테이블**로 가고, 규칙은 **같은 순수 함수**(`comments.ts`)로 공유한다. "B 를 P1 에 흡수"의 뜻이 이것이다. 규칙 모듈이 하나다.

### 7.1 데이터 모델 (추가만)
```prisma
enum PostKind {
  QUESTION // 추천 요청
  REVIEW   // 후기
  TALK     // 잡담
}

model Post {
  id        String    @id @default(cuid())
  themeId   String
  theme     Theme     @relation(fields: [themeId], references: [id], onDelete: Cascade)
  authorId  String?
  author    User?     @relation("PostAuthor", fields: [authorId], references: [id], onDelete: SetNull)
  kind      PostKind
  title     String
  body      String    // 마크다운. WikiMarkdown 으로 렌더, raw HTML 금지
  isRemoved Boolean   @default(false)
  upCount   Int       @default(0)
  downCount Int       @default(0)
  score     Float     @default(0) // commentTally 의 bestScore(가중 Wilson 하한). hot 정렬 키
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  votes     PostVote[]
  comments  PostComment[]

  @@index([themeId, createdAt])
  @@index([themeId, score])
  @@index([authorId, createdAt])
}

model PostVote {
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      VoteType
  weight    Float    // 투표 시점 고정 (Vote·CommentVote 와 같은 원칙)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@id([postId, userId])
  @@index([userId, createdAt])
}

model PostComment {
  id        String        @id @default(cuid())
  postId    String
  post      Post          @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId  String?
  author    User?         @relation("PostCommentAuthor", fields: [authorId], references: [id], onDelete: SetNull)
  parentId  String?
  parent    PostComment?  @relation("PostCommentThread", fields: [parentId], references: [id], onDelete: Cascade)
  replies   PostComment[] @relation("PostCommentThread")
  body      String
  isRemoved Boolean       @default(false)
  upCount   Int           @default(0)
  downCount Int           @default(0)
  bestScore Float         @default(0)
  helpfulAt DateTime?     // P2: 추천 요청 작성자의 도움됨 표시
  createdAt DateTime      @default(now())
  votes     PostCommentVote[]
  items     AnswerItem[]  // P2

  @@index([postId, createdAt])
}

model PostCommentVote {
  commentId String
  comment   PostComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      VoteType
  weight    Float
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  @@id([commentId, userId])
  @@index([userId, createdAt])
}
```
- 추가 enum 값: `ViewTarget.POST`(`views.ts:10` 주석이 이미 예고한다), `ReportTargetType.POST`·`POST_COMMENT`. enum 값 추가는 SQLite 에서 데이터 변경이 없다.
- 관계 필드만 더한다: `User`(글·글 투표·게시판 댓글·댓글 투표 4개), `Theme.posts`, `Item.answerItems AnswerItem[]`. `Item` 쪽이 빠지면 `prisma validate` 가 실패한다. `AnswerItem` 과 `helpfulAt` 은 P2 의 것이다. 하지만 `db:push` 를 두 번으로 줄이려고 **P1 커밋에 같이 넣는다**(사람 실행 횟수가 병목이다. 회고 3절).
- 글의 `conceptAt`(게시판 개념글)은 넣지 않는다. 열린 질문 Q1 이다.
- **조회 라우트 존재 확인을 함께 고친다.** `views/route.ts:22-25` 는 `THEME` 이면 `theme.count`, 아니면 `item.count` 를 보는 2분기 삼항이다. `POST` 값을 더하기만 하면 글 id 가 `item.count` 로 가서 늘 0이 된다. 그러면 조회가 영원히 `counted:false` 다. P1 에서 `POST` 분기 `post.count({ where: { id, isRemoved: false } })` 를 더하고, 6.4 테스트에 "있는 글 → `counted:true`" 1건을 더한다.

### 7.2 순수 함수 `src/lib/comments.ts` (W45 4.2 를 모양 일반화)
W45 4.2 의 시그니처를 그대로 쓴다. 대상 행을 구체 모델이 아니라 **최소 모양**으로 받는다. 그러면 토론 댓글(B)·게시판 댓글·글 자체가 같은 함수를 쓴다.
- `commentTally(votes)` → `{ upCount, downCount, bestScore }`. 글은 `bestScore` 를 `Post.score` 에 저장한다.
- `isConcept`, `CONCEPT_RULES` 는 W45 4.2 그대로 둔다. P1 에서는 토론 댓글만 쓴다(B). 테스트는 P1 에서 같이 쓴다. 규칙이 한 파일에 고정되기 때문이다.
- `buildCommentTree<T extends FlatComment>`, `parseCommentSort`, `COMMENT_RULES` 는 W45 4.2 그대로다.
- `prisma` 를 import 하지 않는다. `wilsonLowerBound`·`RANKING_CONSTANTS.MAX_VOTE_WEIGHT` 는 `ranking.ts` 에서 재사용한다.

### 7.3 순수 함수 `src/lib/board.ts`
```ts
export const POST_KINDS = ['QUESTION', 'REVIEW', 'TALK'] as const;
export const POST_KIND_LABEL = { QUESTION: '추천 요청', REVIEW: '후기', TALK: '잡담' } as const;
export const BOARD_RULES = { TITLE_MAX: 100, BODY_MAX: 10_000, PAGE_SIZE: 20 } as const;
export type BoardParams = { kind: PostKind | null; sort: 'hot' | 'new' | 'top' };
export function parseBoardParams(sp: Sp): BoardParams;          // 잘못된 값 → { kind: null, sort: 'hot' }
export function boardHref(base: string, p: Partial<BoardParams>): string; // 기본값 키는 URL 에서 뺀다 (feedHref 와 같은 규칙)
export const postBody = z.object({ kind: z.enum(POST_KINDS), title: z.string().trim().min(1).max(100), body: z.string().trim().min(1).max(10_000) });
```
- 정렬 키는 `feed.ts` 의 `FEED_ORDER_BY` 를 **그대로 재사용**한다. `hot: score`, `new: createdAt`, `top: upCount` 다. `Post` 의 필드 이름을 그것에 맞췄다(7.1). 새 정렬 표를 만들지 않는다.
- 시간 감쇠는 없다(W45 4.2 의 토론 원칙과 같다). "최근 인기"는 `new` 와 상황 페이지의 베스트(P3)가 맡는다.

### 7.4 API
처리 순서는 기존 쓰기 라우트와 같다: 401 → 정지 403 → 레이트 리밋 429 → zod 400 → 404 → 403 → 트랜잭션.

| 메서드·경로 | 요청 | 응답 | 비고 |
|---|---|---|---|
| `POST /api/themes/[slug]/posts` | `postBody` | 201 `{ post: { id } }` | 대상 상황 갤러리·분류 갤러리가 `canContribute(status)` 가 아니면 403(문서 작성과 같다). 두 종류 모두 허용 |
| `POST /api/posts/[id]/vote` | `{ type }` | 200 `{ action, myVote, upCount, downCount }` | 본인 글 403, 삭제 글 404. 같은 방향 재투표는 취소, 반대는 전환(`items/[id]/vote` 규칙) |
| `POST /api/posts/[id]/comments` | `{ bodyText, parentId? }` (+P2 `itemIds`) | 201 `{ comment }` | 부모가 다른 글이면 400(`talk` 라우트와 같다) |
| `POST /api/post-comments/[id]/vote` | `{ type }` | 200 (위와 같은 모양) | 본인 댓글 403 |
- **레이트 리밋**(`abuse.ts` 의 `ABUSE_LIMITS` 에 더함, 세기는 `countSince`):
  - `POSTS_PER_DAY: 10`, `NEW_ACCOUNT_POSTS_PER_DAY: 3`(가입 7일 미만, taxonomy 7.2). 판정은 `user.createdAt` 으로 한다.
  - 게시판 댓글은 기존 `COMMENTS_PER_HOUR: 20` 을 `postComment` 테이블로 따로 센다.
  - 글·댓글 투표는 `COMMENT_VOTES_PER_HOUR: 120`(W45 4.4 의 값, 이번에 처음 정의) 하나를 함께 쓴다. 세는 법은 `countSince(prisma.postVote, { userId }, 3_600) + countSince(prisma.postCommentVote, { userId }, 3_600)` 의 합이다. B 가 들어오면 `commentVote` 도 더한다.
- 투표 가중치는 `voteWeightFor(user)` 를 쓴다. **랭킹·신뢰도에 영향이 없다.** `recomputeItemScore`·`contributionCount` 를 건드리지 않는다는 것을 라우트 테스트로 고정한다.
- 수정·삭제 API 는 이번에 없다. 작성자 삭제(`isRemoved`)는 신고 처리(W45-4)와 같은 권한 설계 안에서 한다(안티 리뷰 11-15 #3 과 같은 이유).
- 신고는 기존 `POST /api/reports` 의 `targetType` 목록(`reports/route.ts:10`)에 `POST`·`POST_COMMENT` 를 더한다.

### 7.5 화면
- **상황 갤러리 페이지**(`kind === 'SITUATION'`): 위에서 아래로 ① 인기 분류 카드(있음) ② 베스트 문서(P3, 이번엔 자리 없음) ③ **게시판** ④ 배치된 분류 전체 목록(카드와 같으므로 이번엔 생략, P3 때 정함). taxonomy 7.1 순서다.
- **분류 갤러리 페이지**: 기존 탭 `rank | list | talk` 에 `board` 를 더한다(`feed.ts` `TABS`). 범위는 그 분류다. `feed.test.ts` 의 기존 4건이 깨지지 않게 기본 탭은 그대로 `rank` 다.
- **게시판 영역**(서버 컴포넌트, 두 페이지 공용 `src/components/Board.tsx`):
  - 종류 필터 `전체 | 추천 요청 | 후기 | 잡담`, 정렬 `hot | new | top` 링크(`aria-current`).
  - 줄마다 종류 칩 · 제목 · 작성자 · 날짜(서버 KST) · ▲n · 댓글 n.
  - 20개 + "더 보기"(`?page=`). 커서는 글이 수천 개가 되면 쓴다.
  - 빈 상태: "아직 게시판 글이 없습니다. 첫 글을 써 보세요." + 글쓰기 링크(로그인 필요).
- **글쓰기** `/theme/[slug]/post/new`: 종류 `select`(라벨 `POST_KIND_LABEL`) · 제목 · 본문(`MarkdownEditor` 재사용). 비로그인이면 `/signin?callbackUrl=` 로 보낸다.
- **글 상세** `/theme/[slug]/post/[postId]`:
  - 제목 · 종류 칩 · 본문(`WikiMarkdown`) · `PostVoteButtons`.
  - 댓글 트리는 `buildCommentTree` 를 서버에서 돌리고, 정렬은 `?sort=best|new|old` 다.
  - `ViewBeacon(POST)`, `ReportButton` 을 둔다.
  - 글의 `themeId` 가 URL `slug` 와 다르면 `notFound()` 다.
- **투표 버튼**: `PostVoteButtons`·`CommentVoteButtons`(새 파일)는 `VoteButtons` 와 같은 패턴이다(`busy`, `aria-pressed`, 비로그인 `signIn()`, 본인 것은 숫자만). 세 버튼을 `useOptimistic` 으로 한 번에 바꾸는 일은 남는 날 ④다.
- 처음부터 토큰 클래스(`text-fg-muted`, `border-border`, `bg-surface-raised`)를 쓴다. K 의 치환 대상을 늘리지 않는다.

### 7.6 테스트
- `tests/comments.test.ts`(순수): W45 4.7 의 `commentTally`·`isConcept`·`buildCommentTree`·`parseCommentSort` 목록 그대로.
- `tests/board.test.ts`(순수):
  - `parseBoardParams`: `kind=QUESTION&sort=new` 는 그대로, `kind=FOO`·배열은 기본값.
  - `boardHref` 는 기본값을 뺀다.
  - `postBody`: 제목 101자 → 실패, 본문 공백만 → 실패.
- `tests/post-route.test.ts`(mock):
  - 작성: 비로그인 401. 신규 계정 4번째 글 429. 비ACTIVE 상황 갤러리·분류 갤러리 403. 성공 201.
  - 글 투표: 신규 `created`, 같은 방향 `removed`, 반대 `changed`. 본인 글 403. 쓰기는 `$transaction` 안에서만 일어난다. `recomputeItemScore` 를 부르지 않는다.
  - 댓글: 다른 글의 `parentId` → 400.
- `tests/feed.test.ts`: `tab=board` 파싱 1건을 더한다.

### 7.7 위험
- **스팸 글**: 일 한도(신규 3), 로그인 필수, 신고. 신고를 처리하는 경로가 아직 없다(W45-4 결정 대기). 그래서 **스팸을 지울 수단이 사람의 DB 수정뿐이다.** 게시판을 연 뒤 신고가 쌓이면 W45-4 의 우선순위가 올라간다. 사용자 결정 2 로 다시 올린다.
- **본문 XSS**: `WikiMarkdown` 은 raw HTML 을 렌더하지 않는다. 링크 스킴은 기존 처리를 따른다. 새 렌더 경로가 없다.
- **`db:push` 2차**: P1 스키마는 사람이 한 번 더 넣어야 화면이 동작한다. 무인 세션은 `prisma validate`·`generate` 까지만 한다.
- **같은 규칙의 두 테이블**: 토론 댓글과 게시판 댓글이 다른 테이블이다. 규칙(`comments.ts`)은 하나라 어긋나지 않는다. 쿼리·라우트는 두 벌이다(ponytail: 세 번째 댓글 종류가 생기면 다형 테이블을 ADR 로 검토).

### 7.8 수용 기준 (P1)
- [ ] 스키마 변경이 모델·enum 값 추가뿐이다(삭제·필수화 없음). `prisma validate` 통과.
- [ ] 상황 갤러리와 분류 갤러리에서 글을 쓰고, 목록의 종류 필터·정렬이 동작한다(G·2차 `db:push` 이후 육안).
- [ ] 글·댓글 투표가 랭킹·신뢰도를 바꾸지 않는다(라우트 테스트).
- [ ] 신규 계정 하루 4번째 글이 429 다.
- [ ] `tsc`·`vitest` 통과, `build` 결과 기록.
- [ ] 직후 보안 검토자(`docs/agents/security-reviewer.md`: 권한·레이트 리밋·XSS), 화면 직후 UX 검토자를 한 번씩 거친다.

## 8. 작업 P2 — 답변의 문서 첨부·집계·도움됨 (목)

### 8.1 데이터 모델 (P1 커밋에 포함)
```prisma
model AnswerItem {
  commentId String
  comment   PostComment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  itemId    String
  item      Item        @relation(fields: [itemId], references: [id], onDelete: Cascade)
  @@id([commentId, itemId])
  @@index([itemId])
}
```
- **Json 이 아니라 연결 테이블로 둔다.** 문서가 삭제되면 첨부가 따라 지워져야 한다(FK). "이 문서가 추천된 추천 요청" 역참조는 `itemId` 인덱스 하나로 된다. 댓글은 리비전 대상이 아니다. 그래서 `purchaseLinks` 를 Json 으로 둔 이유(스냅샷 되돌리기)가 여기에는 없다.

### 8.2 규칙 (`src/lib/board.ts` 에 더함)
```ts
export const ANSWER_RULES = { MAX_ITEMS: 3, MAX_HELPFUL_PER_POST: 3 } as const;
/** 답변이 될 수 있는가: 추천 요청 글의 최상위 댓글만 */
export function isAnswer(post: { kind: PostKind }, comment: { parentId: string | null }): boolean;
/** 추천 요청 한 건 안에서 문서별 집계. 답변의 가중 추천 합을 그 답변이 첨부한 문서마다 더한다. 삭제 답변 제외. */
export function itemTallyForPost(answers: {
  isRemoved: boolean; itemIds: string[]; votes: { type: 'UP' | 'DOWN'; weight: number }[]; helpfulAt: Date | null;
}[]): { itemId: string; weightedUp: number; answerCount: number; helpful: boolean }[];
```
- 집계는 **가중 추천(UP) 합**이다. 가중치는 `MAX_VOTE_WEIGHT` 로 자른다. 시간 감쇠는 없다. 정렬은 `weightedUp desc → answerCount desc → itemId asc` 다. 이 숫자는 그 글 안에서만 보이고 **문서 점수에 들어가지 않는다**(점수는 문서 투표로만, GLOSSARY).
- 첨부할 수 있는 문서는 **삭제되지 않은 모든 문서**다. 배치된 분류로 제한하지 않는다. 추천 요청이 "이 상황에 이것도 필요하다"를 발견하는 통로이기도 해서다. 열린 질문 Q2.

### 8.3 API
- `POST /api/posts/[id]/comments` 에 `itemIds: z.array(z.string().cuid()).max(3).default([])` 를 더한다. `isAnswer` 가 거짓인데 `itemIds` 가 비어 있지 않으면 400 이다. 없는 문서·삭제 문서가 섞이면 400 이다. 쓰기는 같은 `$transaction` 안의 `answerItem.createMany` 로 한다.
- `POST /api/post-comments/[id]/helpful`(토글): 글 작성자만 쓸 수 있다(그 밖은 403). 답변이 아니면 400, 본인 답변이면 403, 글당 3개를 넘으면 409 다.
- **기여 원장에 적립하지 않는다.** taxonomy 7.2 는 `ANSWER_ACCEPTED` 적립을 적었다. 그러나 기여는 신뢰도와 투표 가중치를 정한다. 그래서 적립 여부는 신뢰도 산식의 변경이다. 11-14 답신 #3 은 이를 "기본값으로 고정하지 않는 거버넌스"로 분류했다. 또 질문자가 부계정의 답변에 도움됨을 주면 부계정의 신뢰도를 키울 수 있다. 기본값은 **`helpfulAt` 기록만**이다. 적립하기로 정해지면 `helpfulAt` 이 이미 기록이라 소급 계산이 가능하다(11절 결정 3).

### 8.4 화면
- 답변 쓰기(추천 요청 글의 최상위 댓글 폼에만 있음): "문서 첨부" 검색 상자. 기존 `/api/search` 를 써서 최대 3개를 칩으로 고른다. 답변 줄에는 첨부한 문서의 카드(이름 · 티어 배지 · 분류 경로 · 링크)가 보인다.
- 글 상세 상단(추천 요청일 때): "이 추천 요청에서 추천된 문서" 표(`itemTallyForPost`). 문서 · 가중 추천 · 답변 수 · 도움됨 표시가 들어간다. 첨부가 0이면 표를 숨긴다.
- 도움됨 버튼은 글 작성자에게만 보인다(`aria-pressed`). 도움됨 답변에는 `도움됨` 칩을 단다.

### 8.5 테스트
- `tests/board.test.ts`:
  - `isAnswer`: 후기 글·답글은 거짓.
  - `itemTallyForPost`: 답변 2개가 같은 문서를 첨부하면 합산하고 `answerCount` 는 2다. 삭제 답변은 빠진다. DOWN 은 합에 들어가지 않는다. 가중 5.0 은 3.0 으로 잘린다. 동점 정렬을 확인한다.
- `tests/post-route.test.ts`:
  - 첨부 4개 → 400. 후기 글에 첨부 → 400. 삭제 문서 첨부 → 400.
  - 도움됨: 남이 누름 403, 4번째 409.
  - `contributionEvent` 를 호출하지 않는다.

### 8.6 위험 (P2)
- **자기 제품 끼워 넣기**: 판매자가 모든 추천 요청에 자기 문서를 첨부할 수 있다.
  - 막는 장치: 첨부는 답변당 3개, 댓글 시간당 20개 한도, 신고(`POST_COMMENT`).
  - 집계는 그 답변이 받은 **추천**으로만 오른다. 첨부만으로는 표 위로 올라가지 않는다.
  - 신고 처리 경로가 없다는 한계는 7.7 과 같다.
- **부계정 추천으로 집계 부풀리기**: 7일 이상 된 계정의 가중 추천이 쌓이면 표 순위가 오른다. 이 표는 그 글 안에서만 보이고 **문서 점수에 들어가지 않는다.** 그래서 순위 조작의 이득이 작다. 따로 탐지하지 않고, 개념글과 같은 관찰 대상으로 둔다.
- **도움됨 남용**: 질문자가 부계정 답변에 도움됨을 주는 경로가 있다. 기여 적립을 하지 않으므로(8.3) 신뢰도에는 영향이 없다. 화면의 `도움됨` 칩만 영향을 받는다.
- **검색 상자 부하**: 첨부 검색은 기존 `/api/search` 를 그대로 쓴다. 입력 디바운스(300ms)를 둔다.

### 8.7 수용 기준 (P2)
- [ ] 추천 요청에 답변 + 문서 2개를 첨부하면 답변에 카드가 보이고 상단 표에 집계된다(육안, G 이후).
- [ ] 도움됨은 글 작성자만, 글당 3개까지 줄 수 있다. 기여 원장이 변하지 않는다(테스트).
- [ ] `tsc`·`vitest` 통과, `build` 결과 기록. 직후 보안 검토자(첨부 검증·권한)를 거친다.

## 9. 남는 날 슬롯 (순서대로, 설계는 기존 문서)
1. **P3 베스트 문서·답변 없는 질문** (taxonomy 7.1).
   - 베스트 문서: 배치된 분류의 하위 문서를 30일 가중 투표 + 조회 항(6.2 와 같은 `popularity` 식)으로 정렬해 상위 5개를 보인다. 같은 `loadSituationCards` 로더에서 계산하고 캐시 60초도 같이 쓴다.
   - 답변 없는 질문: `kind: QUESTION, isRemoved: false, comments: { none: { parentId: null, isRemoved: false } }`, 최신 5개. 작성자 본인 댓글도 답변으로 친다(ponytail: Prisma 관계 필터가 부모 필드를 참조하지 못한다. 문제가 되면 집계 컬럼으로).
2. **B 토론 댓글 투표·트리 정렬·개념글**: W45 4.3~4.6 그대로다. P1 의 `comments.ts` 가 있으므로 라우트 1개 + 토론 페이지 교체만 남는다.
3. **C 알림 3종**: W45 5절 + W47 4절 그대로다. 게시판 답글 알림은 이번에 넣지 않는다. 종류 추가(enum 값)라 다음에 하루면 된다.
4. **`useOptimistic`**: `VoteButtons`·`PostVoteButtons`·`CommentVoteButtons` 세 개를 한 번에 바꾼다(W47 9절 #4 의 조건 충족). 순수 함수 `applyVote` + 테스트.
5. **S 출처 구조**: W47 5절 그대로다.
6. **K `ink` 치환 + 가드 1번 → D 삭제**: W47 6절 그대로다. 97곳·21파일(11-14 BACKLOG). 파일 그룹별로 작게 커밋한다.

## 10. ROADMAP 대비 바꾼 것 (이유)
| # | 변경 | 이유 |
|---|---|---|
| 1 | ROADMAP W48 행(팔레트·토글, `useOptimistic`, facts, 법적 문서, Playwright)을 요일표에서 빼고 2절 "막힌 것" 표로 옮겼다. `useOptimistic` 만 남는 날 ④로 남는다 | 다섯 중 넷이 사람 결정·금지 범위에 막혀 있다. 요일표에 두면 W47 처럼 "계획 12개, 완료 3개"가 반복된다(회고 4절 #3) |
| 2 | W48 요일표를 분류 마감(M1·M2) → P1 → P2 로 정했다 | 회고 4절 #3. 사용자 지시(11-08 분류 트리, 상황 갤러리 커뮤니티)가 원 로드맵보다 우선이다. ROADMAP W47~W48 표는 이 지시 전에 쓰였다 |
| 3 | 구현 작업을 4개로 제한했다 | W47 실측 처리량(구현일 이틀, 커밋 4개). 하루 1~2개 |
| 4 | 안티 리뷰 수용분 5건을 M1·M2 에 넣었다(캐시, `Secure`, 라우트 테스트, 한도기, 문구) | 회고 4절 #8. 수용됐지만 구현 주체·요일이 없던 항목이다 |
| 5 | B 를 별도 테이블 일반화 없이 "같은 규칙 모듈"로 흡수했다 | `CommentVote`→`TalkComment` FK 와 필수 `itemId` 를 바꾸면 SQLite 테이블 재생성이 필요하다. 추가만 하는 스키마 원칙을 지킨다 |
| 6 | P2 의 `ANSWER_ACCEPTED` 적립을 보류했다(taxonomy 7.2 와 다름) | 신뢰도 산식 변경 = 거버넌스(11-14 답신 #3). 부계정 파밍 위험 |
| 7 | `vid` `Secure` 조건을 `NODE_ENV` 에서 요청 프로토콜로 바꿨다(11-15 답신 #1 과 다름) | http 로 열린 production 에서 중복 제거가 깨지는 위험 |
| 8 | 11-14 답신 #4 의 "60초 캐시를 단위 테스트"를 육안 확인으로 바꿨다 | 캐시 래퍼 mock 은 구현 세부 결합이다(`CLAUDE.md`) |

## 11. 사용자 결정 (기본값으로 진행, 회고 #7: 같은 질문을 3일 이상 반복하지 않는다)
| # | 결정 | 기본값 (이번 주 적용) | 근거 |
|---|---|---|---|
| 1 | 인기의 "가중투표"를 참여량(UP·DOWN 모두)으로 둘지 순추천(UP−DOWN)으로 둘지 | **참여량 유지**. 공개 설명(5.4)에 그대로 적는다 | GLOSSARY "인기 = 최근 활동 지표". 거버넌스라 결정은 사용자 몫. 바꾸면 `popularity.ts` 한 줄 + 테스트 |
| 2 | 신고 처리(W45-4) 검토자 | **보류**. 게시판 스팸은 사람이 DB 로 처리 | ref-security Q7. 게시판을 열면 필요가 커진다(7.7) |
| 3 | 도움됨을 기여로 적립할지 | **적립 안 함**, `helpfulAt` 만 기록 | 8.3 |
| 4 | `vid` HMAC 서명(환경변수 신설) | **서명 없음** + `Secure`(https 때) + IP 한도 | 6.3 |
| 6 | 조회 항의 상한(쿠키를 지우며 부풀리기 대비). **조회 항이 켜지는 12월 중순 전**까지 정해야 한다 | 이번 주는 결정 없이 진행한다(조회 항이 자동으로 0). 12-08 설계일까지 답이 없으면 `log1p(조회)` 압축을 제안안으로 올린다 | 6.6. 인기 산식 변경이라 거버넌스 |
| — | ~~분류 인기에 조회수를 넣을지~~ | **종결**: ADR 0001 본문이 허용한다 | 6.2 |
| 운영 | 게이트 G 1~6 (백업·`db:push`·build·`scripts/` 3건·시드 파일·Bash 허용 기록) | 결정이 아니라 사람이 해야 할 실행 | 3절 |

## 12. 열린 질문 (기본값으로 진행)
- **Q1. 게시판 글의 개념글**: GLOSSARY 는 개념글을 "글"로 정의한다. 기본값은 이번 주 토론 댓글만이다(B). 게시판 글에 쓰려면 `Post.conceptAt` 1열과 같은 `isConcept` 를 쓴다. 게시판 데이터가 2주쯤 쌓인 뒤 기준값(가중 8·추천자 5)이 게시판에 맞는지 보고 정한다.
- **Q2. 첨부 문서 범위**: 기본값은 모든 문서다. 상황 갤러리에 배치된 분류의 문서만 허용하자는 의견이 오면 라우트 검증 한 줄이다. 다만 그러면 "배치되지 않은 필요한 분류"를 발견하는 통로가 닫힌다.
- **Q3. 상황 갤러리 페이지의 "배치된 분류 전체 목록"(taxonomy 7.1 ④)**: 지금은 인기 카드가 곧 전체 목록이다. 카드가 20개를 넘는 상황 갤러리가 생기면 카드 상위 8 + 전체 목록으로 나눈다.
