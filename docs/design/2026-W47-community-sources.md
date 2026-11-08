# 설계서: W45 잔여(댓글 투표·알림·ink 삭제) + 출처 구조 (2026-W47, 11/9~11/15)
- 작성: Claude (무인 설계 세션, 2026-11-08) / 리뷰: Gemini (16일째 응답 없음, 아래 1절) → 검토자 에이전트(`docs/agents/`)로 대신함 / 구현: Sonnet 월~목
- 상태: **초안**. `ROADMAP.md` 에 W47 표가 없었다. W46 표와 W45 잔여분을 합쳐 이 설계서로 W47 을 정했고, `ROADMAP.md` 에 "W47~W48 재배치" 절을 더했다. 바꾼 것은 9절에 이유와 함께 적었다.
- 근거 문서: `2026-W45-comment-vote-notify.md` 4~6절(B·C·D 설계 그대로), `2026-W44-protection-gallery.md` 6.2·6.4절(4b·가드), `ref-security.md` 4.4절(출처 인용), `reviews/retro/2026-W44-retro.md` 4절 #2(ROADMAP 을 W47 까지 늘림).

## 1. 현재 상태 (코드 기준, 2026-11-08 확인)
- **W46 주(11/2~11/8)는 통째로 비었다.** 마지막 구현 커밋은 10-27 의 A-3(8b21b9e)이다. 10-28~11-07 사이 `docs/reviews/daily/*-dev.md` 가 하나도 없다. 구현 세션이 돌지 않았거나 보고 없이 끝났다. 원인은 이 세션에서 확인할 수 없다(launchd·`scripts/` 는 볼 수만 있고 고칠 수 없다). W46 설계서도 쓰이지 않았다.
- **W45 의 B·C 스키마는 이미 들어가 있다**(c8c6651): `TalkComment.upCount/downCount/bestScore/conceptAt`, `CommentVote`, `NotificationKind`, `Notification`, `Report @@index([targetType, targetId, status])`. **코드는 없다.** `src/lib/comments.ts`·`src/lib/notify.ts`·`api/talk/[commentId]/vote`·`api/notifications/read`·`/notifications` 모두 없다.
- **`db:push` 는 한 번도 적용되지 않았다**(PROGRESS A-4a 메모). `prisma/dev.db` 가 비어 있어 `npm run build` 가 정적 생성 단계에서 P2021 로 실패한다. 10-26·10-27 dev 보고 모두 "컴파일·타입 통과, prerender 실패"였다. 이 상태로 3주째다(사용자 결정 1).
- **`ink`**: `src/` 에서 `(text|bg|border)-ink…` 클래스가 95곳·27파일 남아 있다(11-08 grep). `tests/design-tokens.test.ts` 에는 W44 6.4 의 가드 1·2번(ink 0건, 하드코딩 팔레트 0건)이 아직 없다. 지금은 변수 정의만 검사한다.
- **출처**: `Item` 에 `sources` 컬럼이 없다. `scripts/import-content.ts:44` 가 `content/*.json` 의 `sources` 를 `description` 끝에 `## 출처` 목록으로 이어 붙인다. 그래서 출처가 리비전 대상이긴 하지만 구조가 없다(종류·번호·각주 없음). `EDITABLE_FIELDS`(`wiki.ts:8`)는 8개다.
- **마크다운**: `WikiMarkdown` 이 `react-markdown` + `remark-gfm` 로 서버 렌더한다. raw HTML 은 렌더하지 않는다. `markdown.ts` 의 `wikiLinksToMarkdown` 은 코드 블록을 피해 전처리하는 패턴이다. 출처 각주도 같은 패턴으로 간다.
- **Gemini**: 10-23 이후 산출물이 없다(11-08 일일 점검). 설계·diff 리뷰를 받을 수 없으므로 각 작업 직후 보안·UX 검토자 에이전트가 대신한다.

## 2. 목표와 범위
W47 의 목표는 **W45 를 끝내고 W46 의 본 작업(출처 구조) 하나를 붙이는 것**이다. 사람 결정이나 금지 범위(`scripts/`, 새 의존성, 법적 문구)에 막힌 W46 작업은 짓지 않고 W48 로 넘긴다. 하루 한 작업을 기준으로 4일에 4개만 둔다. W45 때 이틀 동안 4개를 끝냈지만, 그 뒤 열흘을 통째로 잃었다. 여유를 두는 편이 낫다.

| 순서 | 작업 | 원 번호 | 규모 | 이번 주 포함 | 제외 (다음으로) |
|---|---|---|---|---|---|
| B | 댓글 투표 + 트리 정렬 + 개념글 | W45-2 | L | W45 설계서 4절 전부 | — |
| C | 알림 3종 | W45-1 | M | W45 설계서 5절 전부 | 편집 요청·이동 병합 알림(기능 없음) |
| S | 출처 구조 `Item.sources` + 각주 렌더 + 편집 폼 | W46-1 | L | 5절 | `Item.tags`(9절 #3), 기존 `## 출처` 본문 이전(W46-2) |
| K | `ink` 치환 + 가드 1번 + `ink` 삭제 | W44-4b 일부 + W45-5(D) | M | 6절 | 하드코딩 팔레트 치환·가드 2번·라이트 토글(4b 나머지·4c) |
| — | `useOptimistic` | W45-3 | M | **W48** | 9절 #4 |
| — | 신고 처리·제재 | W45-4 | L | **W48 이후, 사용자 결정 2** | W45 설계서 7.2 |
| — | 콘텐츠 `facts` 구조 + `content:import` | W46-2 | M | **W48, 사용자 결정 4** | 7.2 |
| — | 개인정보 처리방침·약관·계정 삭제 | W46-3 | M | **W48, 사용자 결정 3** | 7.3 |
| — | Playwright 시각 회귀 6장면 | W46-4 | M | **W48, 사용자 결정 5** | 7.4 |

## 3. 작업 B — 댓글 투표 + 트리 정렬 + 개념글
설계는 `2026-W45-comment-vote-notify.md` **4절을 그대로** 쓴다. 바뀐 것은 아래뿐이다.
- **스키마 단계 없음.** 4.1 은 c8c6651 로 끝났다. `prisma/schema.prisma` 를 건드리지 않는다.
- **4.5 의 갤러리 토론 탭**은 A-3(8b21b9e)의 `src/lib/feed.ts` 위에 얹는다. `FeedParams.best` 를 더하는 것은 `tests/feed.test.ts` 4건을 깨지 않는 방향(기본 false 는 URL 에서 뺌)이어야 한다.
- **`TalkThread` 를 고칠 때 처음부터 토큰 클래스**(`text-fg-muted`, `border-border` 등)를 쓴다. K 의 치환 대상에서 이 파일이 빠진다.
- **C 와의 접점**: 4.4 의 `notify(...)` 줄은 B 에서 넣지 않는다. C 에서 넣는다. B 는 `becameConcept` 를 응답에 담는 데까지만 한다.
- 테스트·위험·수용 기준은 W45 4.7·4.8·8.2 의 B 항목 그대로다.

## 4. 작업 C — 알림 3종
설계는 W45 설계서 **5절을 그대로** 쓴다. 바뀐 것은 아래뿐이다.
- **스키마 단계 없음**(c8c6651).
- **생성 지점 3곳 모두 C 에서 넣는다**: 답글(`api/items/[id]/talk`, B 의 4.6 에서 `$transaction` 으로 감싸 둔 곳), 되돌리기(`api/items/[id]/revert`), 개념글(B 의 댓글 투표 라우트 `becameConcept` 분기).
- **`api/cron/lifecycle/route.ts` 의 90일 정리**는 라우트 코드 한 줄이다. cron 스케줄·`scripts/`·launchd 는 건드리지 않는다.
- 테스트·위험·수용 기준은 W45 5.7·5.8·8.2 의 C 항목 그대로다.

## 5. 작업 S — 출처 구조 (`Item.sources`) + 각주 렌더

### 5.1 데이터 모델 (추가만)
```prisma
model Item {
  // 기존 필드 유지
  sources Json @default("[]") // [{ title, url, kind, accessedAt }] — lib/sources.ts
}
```
- 컬럼 1개 추가다. 기존 행은 `[]` 가 된다. `db:push` 는 사람이 한다(사용자 결정 1). 무인 세션은 `prisma validate` 와 `prisma generate` 까지만 한다.
- `Json` 으로 두고 별도 `ItemSource` 테이블을 만들지 않는다. 출처는 리비전 스냅샷에 통째로 들어가야 되돌리기가 된다. `purchaseLinks` 와 같은 이유다.

### 5.2 순수 함수 `src/lib/sources.ts` (prisma 를 import 하지 않는다)
```ts
export const SOURCE_KINDS = ['OFFICIAL', 'RETAILER', 'PRICE_COMPARE', 'REVIEW', 'OTHER'] as const;
export const SOURCE_KIND_LABEL: Record<SourceKind, string> =
  { OFFICIAL: '공식', RETAILER: '판매처', PRICE_COMPARE: '가격비교', REVIEW: '리뷰', OTHER: '기타' };
export const SOURCE_RULES = { MAX_SOURCES: 12, MAX_TITLE: 120 } as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];
export type ItemSource = { title: string; url: string; kind: SourceKind; accessedAt: string | null }; // accessedAt: 'YYYY-MM-DD'

export const sourceSchema = z.object({
  title: z.string().trim().min(1).max(SOURCE_RULES.MAX_TITLE),
  url: httpUrl,                                         // lib/api.ts 재사용 — javascript:·data: 차단
  kind: z.enum(SOURCE_KINDS),
  accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});
export const sourcesSchema = z.array(sourceSchema).max(SOURCE_RULES.MAX_SOURCES);

/** DB Json 을 읽을 때. 형식이 틀린 항목은 버린다(예외를 던지지 않는다). */
export function parseSources(json: unknown): ItemSource[];
/** 본문의 `[^n]` 을 `[n](#src-n)` 링크로. 1 ≤ n ≤ count 만 바꾸고, 코드 블록은 건드리지 않는다. */
export function sourceRefsToMarkdown(md: string, count: number): string;
```
- `httpUrl` 은 `src/lib/api.ts:40` 에 있다. `sources.ts` 가 `api.ts` 를 import 해도 prisma 는 따라오지 않는지 구현 때 확인한다. 따라오면 `httpUrl` 만 `sources.ts` 로 옮기고 `api.ts` 가 재수출한다.
- `sourceRefsToMarkdown` 은 `wikiLinksToMarkdown` 과 같은 `split(/(```[\s\S]*?```|`[^`\n]*`)/)` 방식을 쓴다. `[^n]` 은 GFM 각주 문법이지만 정의(`[^n]: …`)가 본문에 없으므로 `remark-gfm` 은 원문 그대로 둔다. 전처리가 먼저 링크로 바꾼다. 범위 밖 번호(`[^0]`, `[^13]`)는 그대로 둔다. 화면에 원문으로 남아 편집자가 알아챈다.

### 5.3 리비전 대상화 (`src/lib/wiki.ts`)
- `EDITABLE_FIELDS` **맨 끝**에 `'sources'` 를 더한다. `toSnapshot`·`changedFields`·`resolveEdit`·`buildDiff` 는 필드 목록을 돌기만 하므로 손댈 곳이 없다. 되돌리기도 스냅샷을 통째로 복원하므로 따라온다.
- **해시 호환**: `canonicalJson` 에 필드가 늘면 기존 리비전의 `contentHash` 와 새 계산값이 모두 달라진다. 그러면 "이전 리비전으로 손으로 되돌린 편집"을 감지하지 못한다(`REVERT_LOOKBACK_REVISIONS` 10개 안의 비교). 그래서 **`sources` 가 `null` 또는 `[]` 이면 `canonicalJson` 에서 그 쌍을 뺀다.** 출처가 없는 스냅샷의 해시는 변경 전과 같다.
  ```ts
  export function canonicalJson(snapshot: ItemSnapshot): string {
    return JSON.stringify(EDITABLE_FIELDS
      .filter((f) => !(f === 'sources' && isEmptyList(snapshot[f])))   // ponytail: 필드 추가 때마다 같은 예외. 세 번째가 오면 "빈 값 생략" 규칙으로 일반화
      .map((f) => [f, sortKeys(snapshot[f] ?? null)]));
  }
  ```
- `changedFields` 는 `null` 과 `[]` 를 다르게 본다. 옛 스냅샷(`sources` 없음 → `null`)과 현재(`[]`)를 비교하면 "출처 변경"으로 잡힌다. 이를 막으려고 `toSnapshot` 에서 `sources` 만 `item.sources ?? []` 로 채운다. 다른 필드의 `?? null` 동작은 바꾸지 않는다.
- `contribution-rules.ts` 의 `SUBSTANTIVE` 에는 **넣지 않는다.** 출처 한 줄은 제목+URL 이라 20자 규칙을 자연히 넘는다. 넣으면 종류(kind)만 바꾸는 한 단어 편집도 적립된다.
- **되돌리기 URL 재검사**: `api/items/[id]/revert/route.ts:68-70` 이 `imageUrl`·`purchaseLinks` URL 만 `httpUrl` 로 다시 본다. 이 목록 추출을 `wiki.ts` 의 순수 함수 `snapshotUrls(snapshot): string[]`(imageUrl + purchaseLinks + sources)로 옮기고 라우트가 그것을 쓴다. 옛 리비전에 나쁜 URL 이 있으면 지금처럼 400 이다.

### 5.4 API
| 라우트 | 변경 |
|---|---|
| `POST /api/items` (`items/route.ts:16`) | `sources: sourcesSchema.default([])` |
| `POST /api/items/[id]/edit` (`edit/route.ts:15`) | `sources: sourcesSchema` (**필수**). 폼(5.5)과 같은 커밋에 넣는다. 선택으로 두면 옛 클라이언트가 빠뜨렸을 때 `[]` 로 지워진다 |
| `POST /api/items/[id]/revert` | 5.3 의 `snapshotUrls` 사용. 요청 형식은 그대로 |
- 에러는 기존 zod 400 문구를 따른다. 새 상태 코드는 없다.
- 레이트 리밋은 편집 라우트에 이미 있다. 출처 링크 스팸도 같은 상한에 걸린다.

### 5.5 화면
- **문서 페이지**(`theme/[slug]/item/[itemSlug]/page.tsx`):
  - 본문은 `wikiLinksToMarkdown(sourceRefsToMarkdown(description, sources.length))` 를 렌더한다.
  - `WikiMarkdown` 의 `a` 컴포넌트에서 `href` 가 `#src-` 로 시작하면 `<sup>` 로 감싸고 `aria-label="출처 n"` 을 단다. 다른 링크 처리는 그대로다.
  - 본문 아래에 `<section aria-labelledby="sources-h"><h2 id="sources-h">출처</h2><ol>` 를 둔다. 각 줄은 `<li id="src-{n}">` 안에 `종류 칩`(`bg-surface-raised text-fg-muted`, 처음부터 토큰) · 제목 링크(`target="_blank" rel="nofollow noopener noreferrer"`) · `확인 {accessedAt}` 순이다. `nofollow` 는 링크 스팸의 SEO 이득을 없앤다.
  - 출처가 0개면 섹션 대신 한 줄 "출처가 없습니다. 편집에서 추가할 수 있습니다."(편집 링크)를 둔다. 운영자 표시가 아니라 규칙(0개)으로만 뜨는 안내다.
  - 목차(`extractToc`)는 본문만 본다. 출처 섹션은 목차에 넣지 않는다.
- **편집 폼**(`ItemForm.tsx`): `purchaseLinks` 반복 입력(185~221행)과 같은 모양으로 출처 행을 둔다. 제목 `input` · URL `input type="url"` · 종류 `select`(5종, 라벨 `SOURCE_KIND_LABEL`) · 확인일 `input type="date"` · 삭제 버튼. 12개에 닿으면 추가 버튼을 숨긴다. 각 입력에 `<label>`(시각적으로 숨김 가능)을 단다. 본문 입력 아래에 도움말 한 줄 "본문에 `[^1]` 처럼 쓰면 출처 1번으로 연결됩니다."를 둔다.
- **편집 페이지**(`edit/page.tsx:77`): 초기값에 `sources: parseSources(item.sources)` 를 넣는다.
- **이력 diff**: `buildDiff` 의 `render` 가 필드를 돌므로 출처 변경이 자동으로 보인다. 따로 손대지 않는다.

### 5.6 테스트
- `tests/sources.test.ts`(순수):
  - `parseSources`: 정상 2개 → 2개. `javascript:` URL·종류 오타·제목 빈 문자열 항목은 빠진다. 배열이 아닌 값(`null`, `{}`, `"x"`) → `[]`. 13개 → 앞 12개.
  - `sourceRefsToMarkdown`: `a[^1] b[^2]`(count 2) → 둘 다 링크. `[^3]`(count 2) → 그대로. `[^0]` → 그대로. 펜스 코드와 인라인 코드 안의 `[^1]` → 그대로. 같은 번호 두 번 → 둘 다 링크.
- `tests/wiki.test.ts` 에 더함:
  - **해시 호환**: `sources` 가 없는 스냅샷과 `sources: []` 인 스냅샷의 `snapshotHash` 가 같다. 그리고 그 값이 "변경 전 8개 필드로 계산한 해시"(테스트 안에서 옛 식으로 직접 계산)와 같다.
  - `sources` 가 1개 있으면 해시가 달라진다.
  - `changedFields(toSnapshot(옛 행), toSnapshot({...옛 행, sources: []}))` 가 `[]` 다.
  - `snapshotUrls`: imageUrl + purchaseLinks 2 + sources 1 → 4개. `null`·빈 값은 빠진다.
- `tests/contribution.test.ts` 에 더함: `changedFields: ['sources']`, `deltaChars: 5` → `TOO_SMALL`(SUBSTANTIVE 아님 고정).

### 5.7 위험
- **해시 예외가 늘어남**: 5.3 의 ponytail 주석대로 한 번만 둔다. 다음 필드 추가(`tags` 등) 때 "빈 값 생략" 규칙으로 바꾸면서 같은 테스트로 고정한다.
- **출처 링크 스팸**: `nofollow`, 편집 레이트 리밋, 12개 상한. 출처 도메인 차단 목록은 만들지 않는다. 신고 흐름(W48 이후)이 받는다.
- **기존 문서 본문의 `## 출처` 목록과 중복**: 이번 주에는 기존 본문을 고치지 않는다. 새 출처 섹션은 비어 있으면 안내 한 줄만 나오므로 화면 중복은 없다. 본문의 목록을 `sources` 로 옮기는 일은 W46-2(콘텐츠 `facts` 전환)에서 한다.
- **스키마 미적용 상태에서 런타임**: `db:push` 전에는 `item.sources` select 가 실패한다. 빌드 prerender 는 이미 실패 중이라 새로 나빠지는 것은 없다. 다만 **배포는 `db:push` 뒤에만** 해야 한다(사용자 결정 1).

## 6. 작업 K — `ink` 치환 + 가드 1번 + `ink` 삭제
- **범위**: W44 6.2 표의 첫 줄(`ink/NN` → `fg`/`fg-muted`/`fg-subtle`, `ref-design-system.md` 2.6 표)**만** 한다. 하드코딩 팔레트(`slate`·`white/NN`·`emerald` 등)는 W48 로 넘긴다. 둘을 나누는 이유는 9절 #5.
- **가드 1번**을 `tests/design-tokens.test.ts` 에 더한다(W44 6.4-1 그대로). `src/**/*.{ts,tsx,css}` 에서 `\b(text|bg|border|divide|ring|from|to|via)-ink\b` 가 0건이어야 한다. `tailwind.config.ts` 는 대상이 아니다. 실패 메시지에 `파일:줄` 목록을 넣는다.
- **순서**: W44 6.2 의 페이지 그룹 ①~④ 순으로 커밋한다. 마인드맵 4개 컴포넌트와 `GalleryFeed.tsx`(사용 안 함)도 `ink` 는 치환한다. 가드 1번은 예외가 없어야 D 를 할 수 있다.
- **D (`ink` 삭제)**: 가드 1번이 통과한 커밋 다음에 `tailwind.config.ts` 의 `ink` 정의를 지운다(W45 6절). 같은 날 한다.
- 4c(라이트 토글)는 이번 주에 노출하지 않는다. 가드 2번이 없기 때문이다(W44 6.3 출시 조건).
- **수용**: 가드 1번 통과, `tailwind.config.ts` 에 `ink` 없음, `npm run typecheck && npm test` 통과. 다크 화면 육안 비교(홈·갤러리·문서)는 무인 세션이 못 하므로 dev 보고에 "육안 미확인"으로 적는다.

## 7. 이번 주에 하지 않는 것과 막힌 이유

### 7.1 W45-3 `useOptimistic` → W48
W45 설계서 7.1 그대로다. B 의 `CommentVoteButtons` 가 생긴 뒤 세 버튼을 한 번에 바꾸는 것이 싸다. 그래서 B 다음 주에 둔다.

### 7.2 W46-2 콘텐츠 `facts` 구조 + `content:import` → W48 (사용자 결정 4)
- 할 일: `content/*.json` 의 `sources` 를 5.1 의 `Item.sources` 로 넣고, 본문 끝 `## 출처` 이어 붙이기(`import-content.ts:44-45`)를 없앤다. `evidence[].{claim,quote,source}` 는 `facts` 로 이름만 맞춘다(`content-check.ts` 는 지금 `evidence` 를 검사한다).
- **막힌 점**: `scripts/import-content.ts` 수정은 무인 세션 금지 사항이다. 매핑은 순수 함수(`src/lib/sources.ts` 의 `fromContentSource(raw): ItemSource`)로 두고, 스크립트는 그 함수를 부르는 두 줄만 바꾸게 설계한다. 그 두 줄은 사람이 넣거나 무인 세션에 허용해야 한다. 또 `content/` JSON 형식은 Gemini 의 작업 영역인데 Gemini 가 16일째 멈춰 있다.
- 기존 DB 문서의 본문 `## 출처` 를 `sources` 로 옮기는 일회성 이전도 이 작업이다. DB 쓰기라 사람이 실행한다.

### 7.3 W46-3 개인정보 처리방침·약관·계정 삭제 → W48 (사용자 결정 3)
- 설계 방향은 `ref-security.md` 4.2·4.3·4.4 를 그대로 따른다: `/privacy`, `/terms`, 푸터 링크, 계정 삭제(익명화, `User.deletedAt` 추가, Account·Session 삭제, Vote 의 `userId` tombstone, 신고자 null).
- **막힌 점**: 처리방침에는 **개인정보 보호책임자 연락처, 서버 위치(NAS 소재), 사용 OAuth 제공자, 백업 보관 주기**가 들어가야 한다. 모두 운영자만 아는 사실이다. 추측으로 채운 법적 문서는 없는 것보다 나쁘다. 계정 삭제는 처리방침과 같이 나가야 한다(파기·보관 기간 고지).

### 7.4 W46-4 Playwright 시각 회귀 → W48 (사용자 결정 5)
- **막힌 점**: `@playwright/test` 개발 의존성 추가와 브라우저 바이너리 설치가 필요하다. 무인 세션의 `npm install` 허용 여부가 정해지지 않았다. 게다가 빈 `dev.db` 로는 6장면(홈·갤러리·문서·토론·최근 변경·마이)이 모두 빈 상태 화면이라, 기준 스냅샷이 의미가 없다. 시드가 들어간 DB(사용자 결정 1)가 먼저다.

### 7.5 W45-4 신고 처리·제재 → 사용자 결정 2 이후
W45 설계서 7.2 그대로다. 검토자(누가 `ACTION/DISMISS` 를 누르는가, ref-security Q7)가 정해지기 전에는 짓지 않는다.

## 8. 순서·의존성과 수용 기준

### 8.1 작업 큐 (무인 세션은 PROGRESS 의 첫 `[ ]` 를 집는다)
매 작업 끝에 `npm run typecheck && npm test` 를 통과시키고 커밋한다. 세션이 그 명령을 못 돌리면 커밋하지 않고 `dev.md` 에 "구현함·검증 못 함"으로 적는다(W44 회고 2절 #1). **실패해도 `dev.md` 는 반드시 남긴다**(W44 회고 4절 #4. 10-28~11-07 에 보고가 하나도 없어 무슨 일이 있었는지 알 수 없다). push·`db:push` 는 하지 않는다.

| 목표 요일 | 작업 | 의존 | 완료 정의 |
|---|---|---|---|
| 월 11-09 | B 댓글 투표·정렬·개념글(갤러리 토론 탭 `best=1` 포함) | 스키마(완료), A-3(완료) | W45 8.2 의 B 항목 |
| 화 11-10 | C 알림 3종·헤더 배지·`/notifications` | B(개념글 생성 지점) | W45 8.2 의 C 항목 |
| 수 11-11 | S 출처 구조 + 각주 + 폼 | — (B·C 와 독립. 막히면 목요일과 바꿔도 된다) | 8.2 |
| 목 11-12 | K `ink` 치환 + 가드 1번 → D `ink` 삭제 | — | 6절 수용 |
| 검토 | B·C·S 뒤 보안 검토자, B·S 화면 뒤 UX 검토자 | | `docs/agents/` |
| 금 11-13 | 회고 (`reviews/retro/2026-W47-retro.md`) | | |

- **의존성 그림**: `B → C` 만 강한 의존이다. `S` 와 `K` 는 서로, 그리고 B·C 와 독립이다. 다만 S 의 출처 칩, B 의 `TalkThread` 는 처음부터 토큰을 쓰므로 K 의 치환량이 늘지 않는다.
- **넘칠 때**: B 가 화요일까지 가면 C 를 수요일로 밀고 S 를 W48 로 보낸다. K 는 기계 작업이라 남는 시간에 언제든 집을 수 있다.

### 8.2 수용 기준 (S)
- [ ] `prisma/schema.prisma` 변경이 `Item.sources` 1줄 추가뿐이다. `prisma validate` 통과.
- [ ] 편집 폼에서 출처 2개(공식·가격비교)를 넣고 저장하면 문서 아래 "출처" 목록에 번호·종류 칩·확인일이 보인다. 본문의 `[^2]` 가 위첨자 링크가 되고 누르면 2번 출처로 이동한다.
- [ ] 출처를 지우는 편집 후 이력에서 그 리비전으로 되돌리면 출처가 다시 나온다.
- [ ] `javascript:alert(1)` 을 출처 URL 로 넣으면 400 이다.
- [ ] 출처가 없는 기존 문서를 다른 필드만 고쳐 저장해도 `changedFields` 에 `sources` 가 없다. 그 문서를 손으로 이전 리비전과 같게 되돌리면 `revertOfRevision` 이 지금처럼 잡힌다(해시 호환).
- [ ] 출처 링크에 `rel="nofollow noopener noreferrer"` 가 있다.
- [ ] `npm run typecheck`, `npm test` 통과. `npm run build` 는 `db:push` 전까지 prerender 에서 실패할 수 있다(1절). 컴파일·타입 단계 통과를 기록한다.

B·C 의 수용 기준은 W45 설계서 8.2 의 해당 항목, K 는 6절이다.

## 9. ROADMAP 대비 바꾼 것 (이유)
| # | 변경 | 이유 |
|---|---|---|
| 1 | ROADMAP 에 W47·W48 절을 더했다(원래 W46 까지) | W44 회고 4절 #2 에서 이미 정했다. W46 주가 통째로 비어 W46 표 전체와 W45 잔여분이 남았다 |
| 2 | W47 = W45 잔여 B·C·D + W46-1 하나 | W46 표 4개 중 3개(facts·법적·Playwright)가 사람 결정이나 금지 범위에 막혀 있다(7.2~7.4). 막히지 않은 것만 넣는다 |
| 3 | `Item.tags` 는 넣지 않는다(ROADMAP W46-1 은 `sources`/`tags`) | 태그를 읽는 화면·필터·검색이 없다. 소비자가 생기면 같은 방식(Json 컬럼 + `EDITABLE_FIELDS` + 해시 예외 일반화)으로 하루에 넣는다 |
| 4 | `useOptimistic` 을 다시 W48 로 | B 가 `CommentVoteButtons` 를 만든 뒤 세 버튼을 한 번에 바꾸는 편이 싸다. `busy` 로 눈에 보이는 문제는 이미 없다(W45 9절 #3) |
| 5 | 4b 를 `ink`(W47)와 하드코딩 팔레트(W48)로 나눈다 | `ink` 95곳은 대응표가 한 줄이라 기계 치환이 된다. 끝나면 D(`ink` 삭제)가 바로 풀린다. 팔레트 약 160곳은 의미 판단(점수 `amber` 가 중가색인지 등, W44 6.5)이 섞여 있어 육안 확인이 필요하다. 무인 세션이 그 확인을 못 한다 |
| 6 | 출처 종류 라벨을 5종(공식·판매처·가격비교·리뷰·기타)으로 정했다 | `content/*.json` 의 실제 출처(제조사, 다나와·코스트코, 판매몰, 리뷰)를 덮는 최소 집합이다. 커뮤니티 글은 "기타"로 둔다. 늘릴 때는 enum 값 추가라 데이터 변경이 없다 |
| 7 | 각주 문법을 `[^n]` 전처리로 한다(본문 안 각주 정의가 아니다) | 출처는 구조 필드에 있고 본문에는 번호만 둔다. 본문과 출처를 따로 고쳐도 서로 깨지지 않는다. `remark-gfm` 각주는 정의가 본문에 있어야 해서 맞지 않는다 |

## 10. 열린 질문 (기본값으로 진행)
- **Q1. 출처 0개 안내 문구의 강도**: 기본값은 회색 한 줄 안내다. "출처 필요" 경고 배지(위키백과식)는 랭킹·신뢰도와 무관하지만, 콘텐츠 이전(W46-2) 전에는 거의 모든 문서에 붙는다. 그래서 이전 뒤에 다시 본다.
- **Q2. 확인일(`accessedAt`) 필수 여부**: 기본값은 선택이다. 가격비교 출처는 시점이 핵심이다(11-08 점검의 "조회일 + 변동 큼" 권고). 그러니 `kind === 'PRICE_COMPARE'` 일 때만 필수로 하자는 의견이 오면 zod `refine` 한 줄로 바꾼다.
- **Q3. 출처 수 상한 12**: `purchaseLinks` 8 보다 넉넉하게 잡았다. `content:check` 는 문서당 출처 2개 이상을 요구한다(`content-check.ts:86`). 실제 최대치는 W46-2 이전 때 세어 보고 조정한다.
