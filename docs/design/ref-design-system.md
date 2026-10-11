# 설계서: Lifipedia 디자인 시스템 (레퍼런스: Wikipedia · 나무위키 · Reddit · 디시인사이드)
- 작성: Claude (초안, 2026-10-11) / 리뷰: 미정 / 구현: 미정
- 상태: **초안**. 코드는 아직 바꾸지 않았다. 모든 수치는 2026-10-11 저장소 상태를 직접 세거나 계산한 값이다.
- 범위: 색·타이포·간격 토큰, 라이트/다크 테마, 공용 컴포넌트 명세, 3주 이행 로드맵. 마인드맵(`MindMapCanvas`, `FullScreenInteractiveUniverse`)의 시각 표현은 제외한다(토큰만 따른다).

---

## 1. 현 UI 진단

### 1.1 구조 요약 (코드 기준)
| 항목 | 현재 | 위치 |
|---|---|---|
| 배경/본문 | `bg-[#0b0f19]` / `text-[#e2e8f0]`를 하드코딩. 토큰이 없다 | `globals.css` `body` |
| 헤더 배경 | `bg-[#070b14]/90` (또 다른 하드코딩 값) | `Header.tsx` |
| 색 토큰 | `ink #12131a`, `paper #fbfbfd`, `accent #3b5bdb`, `budget #2f9e44`, `mid #f08c00`, `premium #9c36b5` | `tailwind.config.ts` |
| 유틸 클래스 | `.wrap .card .btn .btn-primary .btn-ghost .chip .field .prose-wiki` + 마인드맵용 `.glass-panel .node-bubble*` | `globals.css` |
| 다크/라이트 | 다크 하나뿐이다. `dark:` 접두사와 `prefers-color-scheme`는 0건 | — |
| 폰트 | 지정하지 않았다(OS 기본 산세리프) | — |

### 1.2 색 대비 (WCAG 2.x)
**계산식**: 상대 휘도 `L = 0.2126R + 0.7152G + 0.0722B`. 각 채널은 sRGB 값 `c = v/255`를 `c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`로 선형화한 값이다. 대비비는 `(L밝은 + 0.05) / (L어두운 + 0.05)`이다. 반투명 색(`/NN`, `white/[0.03]`)은 먼저 아래 색과 알파 합성(`fg·a + bg·(1−a)`)한 다음 계산했다. 계산 스크립트는 파이썬 표준 라이브러리만 쓴다(5.3절의 테스트로 옮길 예정).
**기준**: 본문 텍스트 AA 4.5:1, 큰 글자(18.66px 굵게 또는 24px 이상) 3:1, UI 경계·아이콘·포커스 링(1.4.11) 3:1.

`card` 배경 = `#0b0f19` 위의 `white/[0.03]` → **`#121620`**.

| 조합 (전경 / 배경) | 전경 | 배경 | 대비비 | 판정 |
|---|---|---|---|---|
| 본문 `#e2e8f0` / body | #e2e8f0 | #0b0f19 | **15.53** | AA·AAA 통과 |
| `slate-300` (설명문) / body | #cbd5e1 | #0b0f19 | 12.90 | 통과 |
| `slate-400` (메타) / card | #94a3b8 | #121620 | 7.05 | 통과 |
| `slate-500` (사이드바 팔로워 수, 빈 상태) / body | #64748b | #0b0f19 | **4.02** | **본문 AA 실패** (`text-[10px]`라 더 나쁘다) |
| `field` placeholder `slate-400` / field | #94a3b8 | #171b24 | 6.72 | 통과 |
| **`accent` 링크 텍스트** / body | #3b5bdb | #0b0f19 | **3.38** | **본문 AA 실패**. 전역 `a` 색이라 모든 링크에 해당한다 |
| `accent` 링크 / card | #3b5bdb | #121620 | **3.19** | **실패** |
| 흰 글자 / `accent` 버튼(활성 탭) | #ffffff | #3b5bdb | 5.67 | 통과 |
| 흰 글자 / `btn-primary` 그라데이션 시작 `indigo-500` | #ffffff | #6366f1 | **4.47** | 경계선 실패(14px 굵게는 큰 글자가 아니다) |
| `budget` 텍스트 / body | #2f9e44 | #0b0f19 | 5.56 | 통과 |
| `mid` 텍스트 / body | #f08c00 | #0b0f19 | 7.71 | 통과 |
| **`premium` 텍스트** / body | #9c36b5 | #0b0f19 | **3.29** | **실패** |
| TierBadge 저가 `budget` / `budget/10` on card | #2f9e44 | #152424 | 4.65 | 겨우 통과(12px) |
| TierBadge 중가 `mid` / `mid/10` | #f08c00 | #28221d | 6.33 | 통과 |
| **TierBadge 고가 `premium` / `premium/10`** | #9c36b5 | #20192f | **2.91** | **실패**. 배지 글자 자체가 읽히지 않는다 |
| **`text-ink`** / body | #12131a | #0b0f19 | **1.03** | **사실상 안 보인다** |
| `text-ink/75 · /60 · /50 · /40` / body | #10121a… | #0b0f19 | 1.02 · 1.02 · 1.02 · 1.01 | **전부 안 보인다** |
| VoteButtons 비추천 활성 `border-black/40` / body | #07090f | #0b0f19 | 1.04 | **활성 상태가 보이지 않는다** |
| 오류 `text-red-600` (VoteButtons 등 4곳) / body | #dc2626 | #0b0f19 | **3.97** | **실패** |
| 정지 배너 `red-200` / `red-500/10` | #fecaca | #22141d | 12.24 | 통과 |
| 경계 `white/10` (card) / body | #232730 | #0b0f19 | 1.28 | 장식용이라 허용. 단 `field` 경계로는 부족하다 |
| 경계 `white/15` (`field`, `btn-ghost`) / body | #30333c | #0b0f19 | **1.52** | **입력 경계 1.4.11(3:1) 실패** |

**결론**: 실패 원인은 세 가지다. (1) 라이트 테마 시절 토큰(`ink`, `black/NN`)이 다크 배경에 그대로 남아 있다. (2) 강조색과 고가 티어색이 "배경용 채도"라서 어두운 배경 위 텍스트로 쓰기엔 너무 어둡다. (3) 경계선 알파가 너무 낮다.

### 1.3 `ink` 및 라이트 잔재 실측
요청서에는 "약 97곳"이라고 했지만, 실제로 세어 보니 **`ink` 77곳, 21개 파일**이다. 여기에 같은 문제를 가진 `black/NN` **27곳**이 따로 있다. 합치면 104곳이다.

| 클래스 | 횟수 | | 클래스 | 횟수 |
|---|---|---|---|---|
| `text-ink/60` | 22 | | `text-ink/45` | 5 |
| `text-ink/50` | 21 | | `text-ink/65` | 4 |
| `text-ink/40` | 8 | | `text-ink/55` | 3 |
| `text-ink/75` | 5 | | `text-ink/35·/30·/25` | 각 1 |
| `text-ink/70` | 5 | | `text-ink` | 1 (VoteButtons) |

파일별로는 `theme/[slug]/page.tsx`, `theme/[slug]/[tier]/page.tsx`, `how-ranking-works/page.tsx`가 각 9곳, `themes/page.tsx` 7곳, `search`·`rankings` 각 6곳, `item/[itemSlug]/page.tsx` 5곳이고 나머지 14개 파일에 1~4곳씩 있다. `paper` 토큰은 **사용 0건**이다.
`black/NN` 27곳: `bg-black/40`(5), `border-black/10`(4), `bg-black/60·/10`(각 3) 등. 문서 섹션 구분선 `border-black/10`(item 페이지 `Section`)도 다크에서는 보이지 않는다.

### 1.4 타이포·간격·컴포넌트
| 영역 | 관찰 (실측) | 문제 |
|---|---|---|
| 글자 크기 | `text-xs` 125, `text-sm` 111, `text-lg` 25, `text-2xl` 21, **`text-[10px]` 20, `text-[11px]` 10, `text-[9px]` 2**, `text-[15px]` 1 | 임의값 33곳. 10px 이하 한글은 획이 뭉개진다(최소 12px 권장). 스케일이 없어 h1이 페이지마다 `2xl`·`4xl`·`3xl`로 다르다 |
| 굵기 | `font-black`, `font-extrabold`가 제목·탭·칩에 남용된다 | 위계 신호가 포화돼 강조가 강조로 보이지 않는다 |
| 행간 | `prose-wiki`만 `leading-7`(28/15 = 1.87). 나머지는 기본값 1.5 또는 `leading-relaxed` | 본문 문서 행간은 괜찮다. UI 텍스트는 들쭉날쭉하다 |
| 줄 길이 | `prose-wiki`에 `max-width`가 없다. lg에서 본문 열이 약 800px(한글 약 52자/줄 @15px) | 허용 범위의 상한이다. 사이드바를 접으면 더 길어진다 |
| 한글 | `body`에 `word-break: keep-all` 적용 ✓. `overflow-wrap`은 없다 | URL·긴 영문 모델명이 넘친다 → `overflow-wrap: anywhere` 필요 |
| 반경 | `rounded-xl` 23, `-lg` 17, `-2xl` 13, `rounded` 9, `-full` 6, `-3xl` 4 | 6단계가 섞여 있다. 3단계로 충분하다 |
| 간격 | `p-4`/`p-5`/`p-6`/`p-8`, `gap-2`~`gap-8` 혼재 | 카드 내부 여백이 화면마다 다르다 |
| 컴포넌트 중복 | GalleryFeed 탭 3개가 같은 className 문자열을 복붙했다. 티어 히어로 카드 3개는 `emerald/amber`로 하드코딩돼 `budget/mid` 토큰과 색이 다르다. `TierBadge`가 있는데도 GalleryFeed는 자체 chip을 쓴다 | 티어색이 두 체계(토큰 vs Tailwind 팔레트)로 나뉘어 있다 |
| 장식 | `backdrop-blur` + 그라데이션 + 그림자가 `card`, `btn-primary`, 사이드바에 모두 들어간다 | 저사양 모바일에서 스크롤이 버벅인다. 고밀도 목록에는 맞지 않는다 |
| 상태 표현 | `disabled:opacity-40`만 있다. 포커스 링은 `field`에만 있다 | `btn`·탭·사이드바 링크에 `focus-visible`이 없다(2.4.7 위반) |
| 모션 | `card`에 `transition-all duration-300`, `btn`에 `active:scale-95`, 마인드맵 `pulse-glow` 무한 반복 | `prefers-reduced-motion` 대응이 없다 |

### 1.5 다크 전용 설계의 한계
- 위키 장문은 밝은 배경에서 읽기가 더 편하다는 사용자가 많다(Wikipedia·나무위키 모두 라이트가 기본이고 다크는 옵션). 다크만 있으면 낮 시간 장문 독자를 잃는다.
- 색을 리터럴로 박아 두어(`#0b0f19`, `white/NN`, `slate-NNN`) 테마를 추가하려면 모든 파일을 다시 써야 한다. 이번에 **시맨틱 토큰으로 한 번만 치환하면** 이후 테마 추가 비용이 CSS 변수 한 블록으로 줄어든다.
- `white/[0.03]` 같은 알파 표면은 배경이 바뀌면 의미가 뒤집힌다(라이트에서는 보이지 않는다). 표면은 불투명 토큰이어야 한다.

---

## 2. 디자인 토큰

### 2.1 원칙
1. **시맨틱 이름만 컴포넌트에 노출한다**(`text-fg-muted`). 원시 팔레트(`slate-400`)는 토큰 정의 안에서만 쓴다.
2. 값은 CSS 변수(RGB 채널)에 두고 Tailwind는 변수를 참조한다 → `/NN` 알파 문법이 그대로 동작하고, 테마 전환은 변수만 바꾸면 된다.
3. 텍스트용 색과 배경용 색을 분리한다. 티어·상태는 반드시 `fg/bg` **쌍**으로 정의하고 쌍 단위로 대비를 보장한다.

### 2.2 색 토큰 (다크 = 기본, 라이트 = 4절)
대비비는 1.2절과 같은 식으로 계산했다. 기준 배경은 `bg`(#0d1117) 또는 쌍의 `bg`이다.

| 토큰 | 다크 | 라이트 | 용도 | 대비 (다크 / 라이트) |
|---|---|---|---|---|
| `bg` | `#0d1117` | `#ffffff` | 페이지 캔버스 | — |
| `bg-subtle` | `#0a0d13` | `#f6f7f9` | 헤더, 사이드바, 푸터 | — |
| `bg-inset` | `#07090e` | `#eef0f3` | 코드·인용·입력 내부 | — |
| `surface` | `#161b26` | `#ffffff` | 카드, 인포박스, 표 머리 | — |
| `surface-raised` | `#1e2533` | `#f1f3f5` | 호버, 메뉴, 스켈레톤 하이라이트 | — |
| `border` | `#262d3b` | `#dfe3e8` | 장식 구분선 | 1.4.11 비대상 |
| `border-strong` | `#3d4657` | `#8a93a3` | 입력·버튼 외곽 | 1.99* / 3.10 |
| `fg` | `#e6e9ef` | `#1a1d24` | 본문, 제목 | 15.56 / 16.87 |
| `fg-muted` | `#aab3c2` | `#4a5160` | 메타, 설명 | 8.95 / 7.96 |
| `fg-subtle` | `#8b95a5` | `#6b7280` | 캡션, 보조 숫자, placeholder | 6.25 (surface 5.69, raised 5.07) / 4.83 (bg-subtle 4.51) |
| `fg-disabled` | `#5c6573` | `#a0a7b4` | 비활성 텍스트(대비 면제) | 2.92 / — |
| `accent` | `#3b5bdb` | `#3b5bdb` | 버튼 채움, 진행 막대, 선택 표시 | 흰 글자 5.67 |
| `accent-hover` | `#364fc7` | `#364fc7` | 버튼 호버 | 흰 글자 6.77 |
| `accent-fg` | `#8ea2ff` | `#3b5bdb` | **링크·강조 텍스트**, 포커스 링 | 7.90 (surface 7.19) / 5.67 |
| `accent-soft` | `#1a2142` | `#edf2ff` | 선택된 칩·행 배경 | accent-fg 6.54 / 5.06 |
| `link-visited` | `#b197fc` | `#6741d9` | 위키 문서 내 방문 링크 | — / 6.30 |
| `success` fg / bg | `#51cf66` / `#10241a` | `#1e7030` / `#ebfbee` | 저장 완료, 승인 | 9.43 / 6.15 |
| `warn` fg / bg | `#fcc419` / `#2b2410` | `#8a5a00` / `#fff9db` | 휴면 테마, 가격 이상 | 11.76 / 5.60 |
| `danger` fg / bg | `#ff8787` / `#2c1517` | `#c92a2a` / `#fff5f5` | 오류, 정지, 신고 | 8.17 (쌍 `#ffc9c9` 11.78) / 5.46 |

\* 다크 `border-strong` 1.99는 3:1에 못 미친다. 다크에서는 입력 경계를 **배경 차이(`bg-inset` vs `bg`) + 경계선 + 포커스 링**의 조합으로 식별하게 한다. 3:1을 엄격히 지키려면 `#5c6573`(2.92) 대신 `#6b7585`(약 3.6)을 쓴다 → 열린 질문 Q3.

**티어 쌍** (`Tier` enum 3종. 텍스트/배지에는 `-fg`, 히어로 카드 테두리·막대에는 `-solid`, 배지 바탕에는 `-bg`):

| 토큰 | 다크 fg / bg | 대비 | 라이트 fg / bg | 대비 | solid (공통) |
|---|---|---|---|---|---|
| `tier-budget` 저가 | `#69db7c` / `#12261a` | 9.12 | `#1e7030` / `#ebfbee` | 5.73 | `#2f9e44` (현 `budget` 유지) |
| `tier-mid` 중가 | `#ffc078` / `#2b1e0c` | 10.10 | `#9a4a00` / `#fff4e6` | 5.77 | `#f08c00` (현 `mid` 유지) |
| `tier-premium` 고가 | `#e599f7` / `#25142b` | 8.43 | `#862e9c` / `#f8f0fc` | 6.54 | `#9c36b5` (현 `premium` 유지) |

- 색만으로 티어를 구분하지 않는다(1.4.1). 배지에는 항상 라벨 `저가/중가/고가`를 쓰고, 고밀도 목록에서는 `₩ / ₩₩ / ₩₩₩` 기호를 함께 쓴다.
- GalleryFeed의 `emerald-*`·`amber-*` 하드코딩(약 40곳)은 이 쌍으로 대체한다. 점수 `text-amber-400`은 중가색과 겹쳐 오해를 부르므로 `fg`로 바꾼다.

### 2.3 타이포그래피
**글꼴 스택**: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`. Pretendard 도입 여부는 Q2에서 정한다. 도입하지 않으면 시스템 스택만 쓴다. 숫자(점수·가격·투표 수)는 `font-variant-numeric: tabular-nums`로 고정한다.

| 토큰 | 크기 (rem / px) | 행간 | 굵기 | 용도 |
|---|---|---|---|---|
| `text-caption` | 0.75 / 12 | 1.5 (18px) | 500 | 배지, 메타, 각주 번호. **최소 크기** (`[9–11px]` 32곳은 여기로 올린다) |
| `text-label` | 0.8125 / 13 | 1.45 | 600 | 버튼(sm), 탭, 표 머리 |
| `text-body-sm` | 0.875 / 14 | 1.6 | 400 | UI 본문, 카드 설명, 목록 |
| `text-body` | 1 / 16 | 1.75 (28px) | 400 | **문서 본문(prose)**. 현 15px에서 올린다 |
| `text-h4` | 1 / 16 | 1.5 | 700 | 인포박스 제목, 카드 제목 |
| `text-h3` | 1.125 / 18 | 1.45 | 700 | 문서 소절 |
| `text-h2` | 1.375 / 22 | 1.35 | 700 | 문서 섹션(하단 구분선) |
| `text-h1` | 1.75 / 28 (모바일 1.5 / 24) | 1.25 | 800 | 페이지 제목, 1회만 |
| `text-display` | 2.25 / 36 | 1.15 | 800 | 홈·갤러리 대문만 |

- 굵기는 400 / 500 / 600 / 700 / 800 다섯 단계만 쓴다. `font-black`(900)은 로고에만 쓴다.
- 자간: 한글 본문은 0, 제목(h1·display)은 `-0.01em`. `tracking-wider` 등 자간 확장은 영문 대문자 라벨(예: `BUDGET`)에만 쓴다.

**`.prose-wiki` 개정안**

| 속성 | 값 | 근거 |
|---|---|---|
| `font-size` / `line-height` | 16px / 1.75 | 한글은 획 밀도가 높아 라틴 문자보다 넓은 행간이 필요하다(나무위키 약 1.7, Wikipedia Vector 2022 약 1.6) |
| `max-width` | `68ch` (16px에서 약 700px, 한글 약 40~45자/줄) | 한 줄 45자 안팎이 장문 가독 범위다 |
| `word-break` / `overflow-wrap` | `keep-all` / `anywhere` | 어절 단위 줄바꿈은 유지하고, URL·모델명 넘침은 막는다 |
| 문단 간격 | `margin-block: 0 1em` | 현재 `whitespace-pre-wrap`의 빈 줄 의존을 없앤다(마크다운 렌더 전환 시) |
| `h2` | `text-h2`, `padding-bottom 4px`, `border-bottom 1px var(--border)`, `margin-top 2em` | Wikipedia식 섹션 구분 |
| 링크 | `accent-fg`, 밑줄 `text-decoration-thickness 1px`, `text-underline-offset 3px`. 방문 링크는 `link-visited`. 위키 내부 링크 `[[…]]`와 외부 링크(↗) 구분 | 본문 안 링크는 색만으로 구분하지 않는다(1.4.1) |
| 목록 | `padding-left 1.25em`, `li + li` 간격 `0.25em` | — |
| `blockquote` | `border-left 3px var(--border-strong)`, `bg-inset`, `fg-muted` | — |
| `code` | `0.875em`, `bg-inset`, `rounded-sm` | — |

### 2.4 간격·반경·그림자·모션
| 종류 | 토큰 | 값 |
|---|---|---|
| 간격 | Tailwind 기본 4px 스케일을 유지하되 **허용 값만 쓴다** | `1`(4) `1.5`(6) `2`(8) `3`(12) `4`(16) `6`(24) `8`(32) `12`(48) |
| 카드 패딩 | `card` 16px, `card-lg` 24px, compact 12px | `p-5`·`p-8`은 폐기 |
| 섹션 간격 | 페이지 섹션 사이 24px, 문서 섹션 사이 32px | — |
| 반경 | `rounded-sm` 4px (코드, 각주), `rounded-md` 8px (버튼, 입력, 칩), `rounded-lg` 12px (카드, 모달), `rounded-full` (아바타, 진행 막대, 보트 pill) | `xl/2xl/3xl` 폐기 |
| 그림자 | `shadow-1`: `0 1px 2px rgb(0 0 0 / .3)` (다크) / `0 1px 2px rgb(16 24 40 / .06)` (라이트), `shadow-2`: `0 4px 12px rgb(0 0 0 / .4)` / `0 4px 12px rgb(16 24 40 / .10)` (메뉴·팝오버만) | 다크에서는 그림자 대신 `surface` 밝기 차이로 층위를 낸다. `backdrop-blur`는 sticky 헤더에만 쓴다 |
| 모션 | `--dur-fast 120ms`(호버·색), `--dur-base 200ms`(펼침·탭), `--ease-out cubic-bezier(.2,.8,.2,1)` | `transition-all` 금지. `transition-colors`·`transform`만 쓴다 |
| 감속 | `@media (prefers-reduced-motion: reduce)`에서 transition과 animation을 0.01ms로 줄이고 `pulse-glow`는 정지 | 2.3.3 |
| 누름 | `active:scale-95` → `active:translate-y-px` | 텍스트 흔들림이 적다 |

### 2.5 구현: CSS 변수 + Tailwind
```css
/* globals.css — 채널만 저장해서 rgb(var(--x) / <alpha-value>) 로 알파를 지원한다 */
:root {               /* 다크 = 기본 */
  color-scheme: dark;
  --bg: 13 17 23; --bg-subtle: 10 13 19; --surface: 22 27 38; --surface-raised: 30 37 51;
  --border: 38 45 59; --border-strong: 61 70 87;
  --fg: 230 233 239; --fg-muted: 170 179 194; --fg-subtle: 139 149 165;
  --accent: 59 91 219; --accent-fg: 142 162 255; --accent-soft: 26 33 66;
  /* …status, tier 쌍 동일 패턴 */
}
:root[data-theme="light"] { color-scheme: light; --bg: 255 255 255; /* … */ }
@media (prefers-color-scheme: light) { :root:not([data-theme]) { color-scheme: light; /* 라이트 값 */ } }
```
```ts
// tailwind.config.ts (발췌)
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
colors: {
  bg: { DEFAULT: v('bg'), subtle: v('bg-subtle'), inset: v('bg-inset') },
  surface: { DEFAULT: v('surface'), raised: v('surface-raised') },
  border: { DEFAULT: v('border'), strong: v('border-strong') },
  fg: { DEFAULT: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle'), disabled: v('fg-disabled') },
  accent: { DEFAULT: v('accent'), hover: v('accent-hover'), fg: v('accent-fg'), soft: v('accent-soft') },
  // success/warn/danger, tier-budget/mid/premium: { fg, bg, solid }
  budget: '#2f9e44', mid: '#f08c00', premium: '#9c36b5', // 이행 기간 별칭(3주차에 삭제)
  ink: v('fg'),                                           // ← 이행 브리지 (아래)
}
```
라이트 값은 `:root[data-theme="light"]` 블록과 `@media` 블록에 두 번 쓰게 된다. 중복을 줄이려면 라이트 값만 담은 `.theme-light` 믹스인을 `@apply`로 공유하는 정도면 충분하다. 별도 빌드 도구는 필요 없다.

### 2.6 `ink` 이행 전략 (77 + `black/NN` 27곳)
**핵심 아이디어**: 먼저 `ink`를 **`fg` 변수로 재정의하는 브리지**를 둔다. 이렇게 하면 코드를 한 줄도 고치지 않고 77곳이 즉시 보이게 된다(`text-ink/60` = `fg` 60% 알파 → 다크에서 약 `#8f949c`, 대비 약 6.5). 그다음 파일 단위로 시맨틱 토큰으로 치환하고, 마지막에 브리지를 삭제한다.

| 기존 | 치환 대상 | 근거 |
|---|---|---|
| `text-ink`, `text-ink/75·/70` | `text-fg` | 본문 강도 |
| `text-ink/65·/60·/55` | `text-fg-muted` | 메타·설명 (최다 29곳) |
| `text-ink/50·/45·/40` | `text-fg-subtle` | 캡션 (34곳) |
| `text-ink/35·/30·/25` | `text-fg-subtle` 또는 `fg-disabled`(비활성일 때만) | 3곳. 맥락을 보고 수동으로 판단 |
| `border-black/5·/10·/15` | `border-border` | 구분선 |
| `border-black/40` (비추천 활성) | 컴포넌트 명세 4.6으로 교체 | 상태 표현 재설계 |
| `bg-black/5·/10` | `bg-surface-raised` | 이미지 자리, 호버 |
| `bg-black/40~/70` | `bg-black/60` 유지(오버레이·모달 스크림 한정) 또는 `bg-bg-inset` | 스크림은 테마와 무관하게 검정이 맞다 |

**안전한 순서**
1. 브리지 커밋: `ink: v('fg')`를 추가하고 `paper`(사용 0건)를 삭제한다. 스크린샷 비교로 "보이지 않던 글자가 보이게 된 것"만 바뀌었는지 확인한다.
2. 기계 치환: 위 표의 1:1 매핑(`/60`→`muted` 등)을 `sed`로 파일 단위로 적용한다. 한 PR에 페이지 그룹 하나씩(테마/티어 → 랭킹/검색 → 문서/편집 → 폼·컴포넌트).
3. 수동 치환: `/35·/30·/25`, `black/NN`, `VoteButtons`.
4. 가드: `grep -rE '\b(text|bg|border)-(ink|black/[0-9]|paper)' src`가 0이 되는지 CI(또는 vitest 테스트 하나)로 확인한다. 0이 되면 `ink` 별칭을 삭제한다.

---

## 3. 라이트/다크 테마 전략

### 3.1 판단
**다크 우선을 유지하고, 라이트를 2주차에 지원한다.**

| 관점 | 근거 |
|---|---|
| 정체성 | Reddit·디시 감성의 커뮤니티 피드는 다크가 이미 브랜드 인상이다. 기본값을 바꾸면 기존 사용자가 이질감을 느낀다 |
| 위키 가독성 | 장문 문서(설명·추천 이유·스펙)는 라이트에서 읽는 사람이 많다. 특히 낮 시간, 난시, 밝은 환경이 그렇다. 레퍼런스인 위키 2곳 모두 라이트가 기본이다 |
| 비용 | 2.5절처럼 토큰화하면 라이트는 변수 블록 하나와 토글로 끝난다. 토큰화는 `ink` 문제를 고치느라 어차피 해야 한다 |
| 접근성 | OS 설정(`prefers-color-scheme`)을 따르는 것 자체가 사용자 선호를 존중하는 기본기다 |

### 3.2 구현
| 항목 | 방식 |
|---|---|
| 기본값 | `<html>`에 `data-theme`가 없으면 OS 설정을 따른다. **OS 설정이 없거나 판단할 수 없으면 다크** (`:root` 기본값이 다크) |
| 수동 토글 | 헤더 우측에 3상태 버튼(시스템 / 라이트 / 다크). 선택값은 `localStorage['lp-theme']`에 저장하고, `<html data-theme>`만 바꾼다 |
| FOUC 방지 | `layout.tsx`의 `<head>`에 동기 인라인 스크립트 5줄(저장값을 읽어 `data-theme` 설정, try/catch). `<html suppressHydrationWarning>` 추가 |
| 서버 렌더 | 쿠키는 쓰지 않는다. 정적·ISR 캐시가 테마별로 갈라지지 않게 하려는 것이다 |
| 이미지 | 제품 이미지 컨테이너는 양 테마 모두 `#ffffff` 배경을 쓴다(제품 사진 대부분이 흰 배경 컷). 다크에서는 `rounded-lg`와 `border`로 감싼다 |
| `Tailwind darkMode` | 쓰지 않는다. 색은 전부 변수가 처리하므로 `dark:` 접두사가 필요 없다. 테마별 예외는 `[data-theme=light] &` 선택자 몇 개로 처리한다 |
| 라이브러리 | `next-themes` 등 추가 의존성은 쓰지 않는다. 인라인 스크립트 + 토글 컴포넌트 1개면 된다 |

---

## 4. 컴포넌트 명세
공통 규칙:
- 모든 상호작용 요소에 `focus-visible:outline 2px solid accent-fg, outline-offset 2px`를 적용한다(다크 7.90 / 라이트 5.67, 3:1 통과).
- 터치 타깃은 최소 **40×40px**이고, 모바일 주요 액션은 44px이다.
- 비활성은 `aria-disabled` 또는 `disabled` + `fg-disabled` + `cursor-not-allowed`로 표현한다. `opacity-40`은 금지한다(배경까지 흐려져 상태 구분이 모호해진다).

### 4.1 버튼 (`.btn` + 변형)
| 변형 | 기본 | 호버 | 누름 | 포커스 | 비활성 | 로딩 |
|---|---|---|---|---|---|---|
| `primary` | bg `accent`, 글자 `#fff` (5.67) | bg `accent-hover` (6.77) | `translate-y-px` | 링 | bg `surface-raised`, 글자 `fg-disabled` | 스피너 + 라벨 유지, `aria-busy="true"`, 폭 고정 |
| `secondary` | bg `surface`, 경계 `border-strong`, 글자 `fg` | bg `surface-raised` | 동일 | 링 | 경계 `border`, 글자 `fg-disabled` | 동일 |
| `ghost` | 투명, 글자 `fg-muted` | bg `surface-raised`, 글자 `fg` | 동일 | 링 | 글자 `fg-disabled` | 동일 |
| `danger` | bg `danger-bg`, 글자 `danger-fg`, 경계 `danger-fg/40` | 경계 `danger-fg` | 동일 | 링 | 동일 규칙 | 동일 |

크기: `sm` 높이 32px·`text-label`·패딩 x 12px / `md` 40px·`text-body-sm`·x 16px / `lg` 48px·x 20px. 반경 8px. 그라데이션 `btn-primary`는 **폐기**한다(시작색 대비 4.47 실패, 상태 표현이 어렵다). 아이콘만 있는 버튼은 `aria-label`이 필수다.

### 4.2 입력 (`.field`, textarea, select, MarkdownEditor)
| 상태 | 배경 | 경계 | 텍스트 | 보조 |
|---|---|---|---|---|
| 기본 | `bg-inset` | `border-strong` | `fg`, placeholder `fg-subtle` | — |
| 호버 | 동일 | `fg-subtle` | — | — |
| 포커스 | 동일 | `accent-fg` | — | `ring 3px accent/30` |
| 오류 | 동일 | `danger-fg` | — | 아래에 `danger-fg` 메시지 + 아이콘. `aria-invalid="true"`, `aria-describedby`로 연결 |
| 비활성/읽기전용 | `surface` | `border` | `fg-disabled` / `fg-muted` | — |

높이 40px(모바일 44px). **iOS 줌 방지를 위해 모바일 글자 크기는 16px**로 한다(현 `text-sm`/`text-xs`는 포커스할 때 확대된다). 라벨은 입력 위에 `text-label fg-muted`로 두고, placeholder를 라벨 대신 쓰지 않는다. 글자 수 제한 필드(이름 30자, 소개 200자)는 우측 하단에 `12/30` 카운터를 `fg-subtle`, `aria-live="polite"`로 단다.

### 4.3 카드 (`.card`)
| 변형 | 스타일 | 용도 |
|---|---|---|
| `card` | bg `surface`, 경계 `border`, 반경 12px, 패딩 16px, 그림자 없음 | 기본 |
| `card-interactive` | + 호버 시 경계 `border-strong`, bg `surface-raised`. **카드 전체가 링크일 때만** 쓰고 제목 `<a>`의 `::after`로 클릭 영역을 넓힌다 | 피드 아이템 |
| `card-tier-{budget/mid/premium}` | `card` + 좌측 4px `tier-*-solid` 막대 + 헤더에 TierBadge | 3-Tier 히어로 |
| `card-compact` | 패딩 12px, 경계 없이 행 구분선(`divide-border`) | 고밀도 목록(5.2) |

현재 `card`의 hover 효과는 정적 정보 카드(Karma, 점수 박스)에도 붙어 있어 "클릭할 수 있다"는 오해를 준다. 기본 `card`에서는 hover를 **제거**한다(/me 정지 배너가 hover를 덮어쓰는 우회도 함께 사라진다).

### 4.4 칩·배지
**칩 공통**: 높이 22px, 패딩 x 8px, `text-caption` 600, 반경 `full`(태그) 또는 4px(상태 배지).

**티어 배지 (`TierBadge`)**
| 티어 | 다크 | 라이트 | 부가 표시 |
|---|---|---|---|
| 저가 | `#69db7c` on `#12261a` (9.12) | `#1e7030` on `#ebfbee` (5.73) | 라벨 `저가` + (compact) `₩` |
| 중가 | `#ffc078` on `#2b1e0c` (10.10) | `#9a4a00` on `#fff4e6` (5.77) | `중가` + `₩₩` |
| 고가 | `#e599f7` on `#25142b` (8.43) | `#862e9c` on `#f8f0fc` (6.54) | `고가` + `₩₩₩` |

**뱃지 5등급 (`BadgeLevel`, `src/lib/trust.ts`)**: 티어 색상과 겹치지 않게 **강조색의 채움 강도 + 점(pip) 개수**로 등급을 표현한다. 색맹 사용자도 점 개수로 구분할 수 있다(1.4.1).

| 등급 | 기준 (기여) | 시각 | 다크 fg / bg (대비) | 라이트 fg / bg (대비) |
|---|---|---|---|---|
| NEWCOMER | 0+ | 외곽선만, ●○○○○ | `#aab3c2` / `#1e2533` (7.27) | `#4a5160` / `#f1f3f5` (7.16) |
| CONTRIBUTOR | 5+ | 연한 채움, ●●○○○ | `#74c0fc` / `#0f2236` (8.21) | `#1864ab` / `#e7f5ff` (5.48) |
| EDITOR | 25+ | `accent-soft` 채움, ●●●○○ | `#8ea2ff` / `#1a2142` (6.54) | `#3b5bdb` / `#edf2ff` (5.06) |
| CURATOR | 80+ | `accent` 진한 채움, ●●●●○ | `#ffffff` / `#3b5bdb` (5.67) | 동일 (5.67) |
| STEWARD | 250+ | 금색 채움 + ★, ●●●●● | `#ffd43b` / `#2b2410` (10.81) | `#7a5600` / `#fff9db` (6.28) |

배지에는 `title`과 `aria-label="뱃지: EDITOR (기여 n건 이상)"`을 단다. 한글 표기(새내기/기여자/편집자/큐레이터/관리인)를 쓸지는 Q5에서 정한다.

### 4.5 탭 (GalleryFeed 등)
| 상태 | 스타일 |
|---|---|
| 기본 | 글자 `fg-muted`, 하단 2px 투명 |
| 호버 | 글자 `fg`, bg `surface-raised` |
| 선택 | 글자 `fg` 700, **하단 2px `accent`** (pill 채움 대신 밑줄. 정보 밀도가 높아지고 Wikipedia·나무위키 탭과 일치한다) |
| 포커스 | 링 |

접근성: `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`를 달고, 좌우 화살표로 이동하며 roving `tabindex`를 쓴다. 현재는 일반 `<button>` 3개라서 스크린리더가 탭으로 인식하지 못한다. 모바일에서는 가로 스크롤을 허용하고(`overflow-x-auto`, 스크롤바 숨김), 탭 라벨의 개수는 `(12)` 대신 카운트 칩으로 표시한다.

### 4.6 투표 버튼 (`VoteButtons`)
Reddit식 **세로/가로 pill 하나**(▲ 점수 ▼)를 피드용으로, 현 2버튼(추천 n / 비추천 n)을 문서 상세용으로 유지한다.

| 상태 | 추천 ▲ | 비추천 ▼ | 비고 |
|---|---|---|---|
| 기본 | 글자 `fg-muted`, 경계 `border-strong` | 동일 | — |
| 호버 | bg `surface-raised`, 글자 `accent-fg` | bg `surface-raised`, 글자 `fg` | — |
| **활성 (내 표)** | bg `accent-soft`, 경계·글자 `accent-fg` (6.54), 아이콘 채움 ▲ | bg `surface-raised`, 경계 `fg-subtle`, 글자 `fg`, 아이콘 채움 ▼ | `aria-pressed="true"`. 비추천에 빨강을 쓰지 않는다(오류로 오인된다). 현재 `border-black/40 text-ink`(1.03)를 대체한다 |
| 낙관적 (전송 중) | 즉시 활성 스타일 + 숫자 ±1, 아이콘 옆 6px 점이 `opacity` 펄스(감속 모드면 정지) | 동일 | 실패하면 이전 상태로 롤백하고 오류 표시. `aria-busy` |
| 비활성 (테마 비활성·정지) | `fg-disabled`, `cursor-not-allowed`, `title="정식 테마에서만 투표할 수 있습니다"` | 동일 | 이유를 툴팁 + `aria-describedby`로 알린다 |
| 비로그인 | 기본 모양. 누르면 로그인으로 이동 | 동일 | `aria-label="추천 (로그인 필요)"` |
| 오류 | 버튼 아래 `danger-fg` `text-caption`, `role="alert"` | — | 현 `text-red-600`(3.97)을 대체한다 |

숫자는 `tabular-nums`로 폭을 고정해 값이 바뀌어도 레이아웃이 흔들리지 않게 한다. **현재 구현은 낙관적 갱신이 아니다**(서버 응답 후 반영). 낙관적 갱신으로 바꿀지는 Q4에서 정한다.

### 4.7 표 (랭킹, 점수 내역, 편집 이력)
| 요소 | 스타일 |
|---|---|
| 머리 | bg `surface`, `text-label fg-muted`, `position: sticky; top: 64px`(헤더 높이) |
| 행 | 높이 44px(기본) / 32px(compact), 구분선 `border`, 호버 bg `surface-raised` |
| 숫자 열 | 오른쪽 정렬, `tabular-nums` |
| 순위 열 | 폭 48px, 1~3위는 `fg` 700, 나머지는 `fg-subtle` |
| 모바일 | 640px 미만에서 2열(이름+메타 / 점수) 카드로 접는다. 가로 스크롤 표는 쓰지 않는다 |
| 접근성 | `<table>`, `<caption>`(시각적으로 숨김 가능), `scope="col"`, 정렬 가능 열에는 `aria-sort` |

### 4.8 인포박스 (제품 스펙)
Wikipedia/나무위키 인포박스 형식을 따른다.

| 요소 | 값 |
|---|---|
| 위치 | lg 이상에서는 본문 우측 고정 열 300px(현 점수 박스 자리에 함께 둔다), 그 미만에서는 **제목 바로 아래**, 본문보다 먼저 |
| 구조 | 제목 바(티어 `-bg` + TierBadge + 제품명) → 이미지(흰 배경, 4:3) → `<dl>` 2열(키 `fg-muted` 40% / 값 `fg`) → 가격(`text-h3 tabular-nums`) → 구매 링크 버튼 |
| 행 | 패딩 6px 12px, 구분선 `border`, `text-body-sm` |
| 접근성 | `<aside aria-label="제품 정보">`, `<dl>`/`<dt>`/`<dd>` |
| 데이터 | `specSummary`를 자유 텍스트에서 키-값으로 구조화하는 일은 별도 과제다(Q6). 그 전까지는 가격·티어·리비전·점수만 구조화해서 보여 준다 |

### 4.9 각주·인용
| 요소 | 값 |
|---|---|
| 본문 표기 | `<sup><a href="#fn-3" id="fnref-3">[3]</a></sup>`, `text-caption`, `accent-fg` |
| 각주 목록 | 문서 끝 `## 각주` 섹션. `<ol>`, `text-body-sm fg-muted`, 각 항목에 `↩` 역링크(`aria-label="본문으로 돌아가기"`) |
| 호버 미리보기 | 데스크톱에서는 각주 내용 팝오버(`shadow-2`). 모바일에서는 탭하면 하단 시트. 나무위키 방식 |
| 출처 신뢰 표시 | 외부 출처 링크에 도메인을 `fg-subtle`로 표기 |
| 대상 | `[[교차링크]]`(`WikiLink.tsx`)와 같은 렌더러에 `[^n]` 문법을 추가할지는 콘텐츠 지침(`docs/CONTENT_RESEARCH_GUIDELINE.md`)과 함께 정한다 |

### 4.10 알림 배너
| 종류 | 배경 / 글자 | 좌측 표시 | role | 닫기 |
|---|---|---|---|---|
| 정지 (계정 제재) | `danger-bg` / `danger-fg`(제목) + `fg`(본문) | 4px `danger-fg` 막대 + 아이콘 | `status` (페이지를 열 때부터 있으므로 `alert` 아님) | 불가 |
| 오류 (제출 실패) | 동일 | 동일 | `alert` | 가능 |
| 경고 (휴면 테마, 가격 이상) | `warn-bg` / `warn-fg` | `warn-fg` 막대 | `status` | 가능 |
| 성공 (저장됨) | `success-bg` / `success-fg` | `success-fg` 막대 | `status` | 5초 후 자동으로 닫힘(감속 모드 무관), 수동으로도 가능 |
| 정보 | `accent-soft` / `fg` | `accent-fg` 막대 | `status` | 가능 |

패딩 12px 16px, 반경 8px, `text-body-sm`. 색만으로 구분하지 않고 아이콘과 제목 단어("오류", "제재 중")를 함께 쓴다.

### 4.11 빈 상태
| 요소 | 값 |
|---|---|
| 구성 | 아이콘(32px, `fg-subtle`) → 한 줄 설명(`text-body-sm fg-muted`) → 다음 행동 버튼 1개(`secondary`) |
| 레이아웃 | 가운데 정렬, 패딩 32px 위아래, `card` 안 |
| 문구 원칙 | "없습니다"로 끝내지 않고 다음 행동을 제시한다(현 /me 문구가 좋은 예) |
| 티어 슬롯 빈 상태 | "저가 1위가 아직 없습니다 · [첫 문서 쓰기]" — 위키 기여를 유도한다 |

### 4.12 스켈레톤
| 요소 | 값 |
|---|---|
| 색 | bg `surface-raised` 위 shimmer `surface` → `#2a3242`(다크) / `#e9ecef` → `#f8f9fa`(라이트) |
| 형태 | 실제 레이아웃과 같은 크기(텍스트 줄 높이 12/14px, 카드 높이 고정)로 CLS 0 |
| 모션 | 1.4s linear 반복. 감속 모드면 정지 상태 |
| 접근성 | 컨테이너에 `aria-busy="true"`, 스켈레톤 요소는 `aria-hidden`, 스크린리더용 "불러오는 중" 1회 |
| 위치 | Next.js `loading.tsx`(갤러리 피드, 문서, 랭킹) |

---

## 5. 레퍼런스 매핑과 레이아웃 원칙

### 5.1 레퍼런스에서 가져올 것 / 가져오지 않을 것
| 레퍼런스 | 가져올 것 | 가져오지 않을 것 |
|---|---|---|
| Wikipedia (Vector 2022) | 본문 최대 폭, 섹션 `h2` 하단선, 인포박스 우측, sticky 목차, 방문 링크 색 | 세리프 제목(한글에서 효과가 작다) |
| 나무위키 | 문서 상단 목차 + 각주 팝오버, 문서 메타 바(리비전·편집·토론), 높은 정보 밀도 | 과한 색 상자·틀 남발 |
| Reddit | 카드 피드, 보트 pill, 다크 모드 완성도, 갤러리 대문 헤더 | 무한 스크롤(위키 랭킹에는 순위 고정 목록이 맞다) |
| 디시인사이드 | 고밀도 표형 목록(번호·제목·[댓글수]·추천), 개념글 탭 | 광고 밀도, 작은 글씨(11px 이하) |

### 5.2 문서 읽기 레이아웃 (`/theme/[slug]/item/[itemSlug]`)
| 브레이크포인트 | 구성 |
|---|---|
| ≥1280px (`xl`) | 좌 목차 200px (sticky, top 80px) │ 본문 `68ch`(약 700px) │ 우 인포박스·점수 300px. **전역 사이드바는 문서 페이지에서 접는다** |
| 1024~1279px (`lg`) | 본문 │ 우 인포박스 300px. 목차는 본문 상단 접이식 박스(나무위키식) |
| <1024px | 한 열: 제목 → 메타 바 → **인포박스** → 목차(접힘) → 본문 → 투표(하단 고정 바) |

- 최대 줄 길이: 본문 `max-width: 68ch`. 표·이미지는 본문 폭을 넘어 인포박스 열까지 쓰지 않는다.
- 목차 노출 조건: 섹션이 3개 이상일 때. 현재 섹션(설명/추천 이유/스펙 요약/구매 링크)이 최대 4개이므로, 목차는 문서가 길어질 때를 대비한 규칙으로만 정한다. 구현은 섹션이 4개를 넘을 때로 미룬다.
- 메타 바: `리비전 n · 작성자 · 편집 이력 n · 토론 n`(현 구현과 같은 정보)을 `text-caption fg-subtle`로, 제목 바로 아래 한 줄에 둔다.

### 5.3 고밀도 목록 (컴팩트 모드)
| 항목 | 기본(카드) | 컴팩트(디시식) |
|---|---|---|
| 행 높이 | 카드 약 140px | **36px** 한 줄 |
| 열 | 카드 내부 자유 배치 | `순위 40 │ 티어 기호 32 │ 제품명(+[토론 n]) flex │ 가격 96 │ 점수 56 │ ▲ 수 48` |
| 글자 | `text-body-sm` | `text-body-sm`(14px 유지. 12px 미만으로 줄이지 않는다) |
| 강조 | — | 점수 상위 10% 또는 "개념 문서"는 제목 `fg` 700 + 좌측 2px `accent` 막대 (디시 개념글 대응) |
| 모바일 | 동일 | 가격·▲ 열 숨김 → 2줄(제목 / 티어·가격·점수) 52px |
| 전환 | 목록 상단에 `[카드 | 목록]` 세그먼트 토글. `localStorage['lp-density']`에 저장. 기본값은 모바일 카드, 데스크톱 카드 |

### 5.4 모바일 우선 규칙
1. 기준 폭 360px, 좌우 여백 16px. 가로 스크롤 금지(표 포함, 4.7).
2. 전역 사이드바(5대 허브)는 `lg` 미만에서 **상단 가로 칩 스크롤 + "전체 갤러리" 시트**로 바꾼다. 현재는 본문 위에 아코디언이 통째로 쌓여 첫 화면을 차지한다.
3. 헤더 검색은 `sm` 미만에서 숨겨져 있어 검색 진입로가 없다 → 아이콘 버튼으로 전체 화면 검색을 연다.
4. 문서 상세의 투표·편집 버튼은 하단 고정 바(높이 56px, `safe-area-inset-bottom`)에 둔다.
5. 탭 타깃 44px, 입력 글자 16px, `text-[9–11px]` 금지.
6. `backdrop-blur`는 sticky 헤더에만 쓴다(모바일 GPU 비용).

---

## 6. 적용 로드맵 (3주)

| 주 | 단계 | 작업 | 검증 | 회귀 위험 |
|---|---|---|---|---|
| **1주차** | 토큰 도입 + 긴급 수정 | ① `globals.css`에 CSS 변수(다크) 추가, `tailwind.config.ts`에 시맨틱 색 + **`ink` → `fg` 브리지**. `paper` 삭제 ② `body`·`card`·`field`·`btn-*`·`chip`·`prose-wiki`를 토큰 기반으로 다시 쓰기(`btn-primary` 그라데이션 제거) ③ 전역 `a` → `accent-fg` ④ `TierBadge`·`VoteButtons`·오류 텍스트를 쌍 토큰으로 ⑤ `focus-visible` 공통 적용, `prefers-reduced-motion` ⑥ **대비 테스트** 추가 | `tests/contrast.test.ts`(vitest, 의존성 추가 없음): 토큰 쌍 표를 상수로 두고 1.2절 공식으로 ≥4.5 / ≥3 assert. `grep` 가드 테스트(2.6 ④)는 경고 모드 | 유틸 클래스 정의가 바뀌므로 **모든 화면**에 영향이 있다. 브리지 덕분에 깨지는 쪽이 아니라 보이게 되는 쪽이다. 주요 6개 화면 전후 스크린샷 비교 |
| **2주차** | 기존 화면 이행 + 라이트 | ① `ink` 77곳 기계 치환(페이지 그룹별 4 PR) ② `black/NN` 27곳, `slate-*`·`emerald/amber` 하드코딩 수동 치환(GalleryFeed 우선) ③ 타이포 스케일 적용, `text-[9–11px]` 32곳 → `caption` ④ 라이트 변수 블록 + 인라인 테마 스크립트 + 헤더 토글 ⑤ grep 가드를 실패 모드로 전환 → `ink` 별칭 삭제 | 스크린샷 비교: Playwright를 들일지는 Q1(추천: 수동 체크리스트 + Chrome DevTools 렌더링 탭 `prefers-color-scheme` 에뮬레이션). 화면 6종 × 테마 2종 × 폭 2종(360/1280) = 24장 | 라이트에서 **알파 기반 표면(`white/[0.03]`)이 사라지는** 곳. 남은 `white/NN` grep으로 추적한다. 테마 FOUC. 하이드레이션 경고 |
| **3주차** | 신규 컴포넌트 | ① 탭 ARIA 패턴 ② 인포박스 + 문서 3열 레이아웃 ③ 알림 배너·빈 상태·스켈레톤(`loading.tsx`) ④ 컴팩트 목록 토글 ⑤ 모바일 사이드바 → 칩 스크롤 ⑥ 투표 pill(피드용) ⑦ 티어 별칭(`budget/mid/premium`) 삭제 | axe DevTools(브라우저 확장)로 수동 점검. 키보드만으로 투표·탭·편집 동선 통과. Lighthouse 접근성 ≥ 95 | 레이아웃 변경으로 **AdSlot 위치가 바뀌어 광고 노출이 달라질** 수 있다. 문서 페이지 사이드바를 접어서 생기는 네비게이션 동선 변화 |

**대비 검사 스크립트 도입 여부**: 도입한다. 다만 별도 도구 없이 **vitest 테스트 1개**로 한다(토큰 쌍 약 40개, 표준 계산식 15줄). 렌더링된 DOM 전체를 검사하는 axe 자동화는 Playwright를 도입할 때(Q1) 함께 검토한다.

---

## 7. 열린 질문 (추천안 포함)

| # | 질문 | 추천 | 이유 |
|---|---|---|---|
| Q1 | 스크린샷 회귀에 Playwright(+`@axe-core/playwright`)를 도입하나? | **3주차 이후로 보류.** 1~2주차는 수동 24장 체크리스트 | 의존성과 CI 시간이 늘어난다. 토큰 대비는 vitest로 이미 보장된다. 화면이 안정된 뒤 도입하는 편이 기준 이미지 재작성 비용이 적다 |
| Q2 | Pretendard 웹폰트를 도입하나? | **도입**(`next/font/local`, 서브셋 Variable woff2 약 300KB 1개) | 시스템 폰트는 Windows(맑은 고딕)와 macOS(애플 SD 산돌고딕)의 행간·굵기 차이가 커서 타이포 스케일이 플랫폼마다 달라진다. 거절하면 시스템 스택만으로도 문서의 다른 결정은 유지된다 |
| Q3 | 다크 입력 경계를 1.4.11 3:1로 엄격히 맞추나? | **맞춘다**: 입력·버튼 외곽만 `#6b7585`(약 3.6:1), 장식 구분선은 `border` 유지 | 입력이 경계로 식별되지 않으면 저시력 사용자가 폼을 찾지 못한다. 카드 구분선까지 밝히면 화면이 시끄러워진다 |
| Q4 | 투표를 낙관적 갱신으로 바꾸나? | **바꾼다**(useOptimistic, 실패 시 롤백) | Reddit식 즉시 반응이 커뮤니티 참여감의 핵심이다. 서버가 가중치를 다시 계산해 돌려주므로, 응답이 오면 숫자를 서버 값으로 덮어쓴다 |
| Q5 | 뱃지 등급을 한글로 표기하나? | **영문 코드 + 한글 툴팁**(`EDITOR · 편집자`) | 코드·문서(`trust.ts`, W42 설계서)가 영문 enum으로 일관돼 있다. 화면에서는 한글 병기로 의미를 전달한다 |
| Q6 | 인포박스용으로 `specSummary`를 키-값 구조로 바꾸나? | **이번 3주 범위 밖.** 별도 스키마 설계서로 진행 | DB 스키마·편집 폼·리비전 diff에 모두 영향을 준다. 디자인 시스템 작업과 섞으면 회귀를 추적하기 어렵다 |
