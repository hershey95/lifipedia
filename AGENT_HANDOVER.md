# 🤖 AI Agent Handover & Collaboration Ledger (AI 협업 및 인수인계 창구)

이 문서는 **Antigravity AI**와 **Claude Code** 등 여러 AI 에이전트가 동일한 Git 저장소(`hershey95/lifipedia`)에서 작업을 바통 터치하고 교대하며 협업하기 위한 공식 인수인계 대장입니다.

---

## 📌 현재 브랜치 및 환경 정보

- **Git Branch**: `claude/peaceful-pasteur-abbqgx` (기본 작업 브랜치)
- **Git Remote**: `https://github.com/hershey95/lifipedia.git`
- **Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma ORM, Vitest (69 tests), NextAuth
- **DB Mode**: SQLite (로컬 개발용 `dev.db`), PostgreSQL (시놀로지 NAS / 프로덕션 배포용)

---

## 🏛️ 서비스 핵심 철학 및 규칙

1. **운영자 큐레이션 금지 (100% 투명 랭킹 알고리즘)**
   - 운영자는 순위를 직접 지정할 수 없으며, 관리자 가점 버튼이 존재하지 않습니다.
   - 점수 산정 공식 (`src/lib/ranking.ts`):  
     $$\text{점수} = \text{WilsonLowerBound}(\text{유효찬성}, \text{유효전체}) \times \log_{10}(1 + \text{유효전체}) \times 100$$
     - **시간 감쇠 반감기**: 45일 지수 감쇠
     - **신뢰도 가중치**: 기여 수의 로그 스케일로 투표 시점에 고정

2. **레딧/디시인사이드 커뮤니티 구조 (5대 라이프 허브)**
   - **사이드바 (`src/components/Sidebar.tsx`)**: 5대 라이프 허브 카테고리
     1. 👥 **연령/생애주기**: 10대 수험, 20대 자취, 30대 이직/육아/독립, 40대 웰빙
     2. 🏠 **주거/공간**: 데스크테리어, 주방/미식, 신혼집 가전
     3. ⛺ **취미/아웃도어**: 캠핑/차박, 헬스/피트니스, 게이밍/PC
     4. 🎁 **상황/선물**: 집들이 선물, 부모님 효도선물
     5. ⚡ **테크/가전**: 노이즈캔슬링 헤드폰, 작업용 노트북
   - **서브 갤러리 피드 (`src/components/GalleryFeed.tsx`)**:
     - `🏆 3-Tier 위키 랭킹 (저가 / 중가 / 고가 Top 1)` 탭 1순위 노출
     - `💬 갤러리 커뮤니티 (토론/Q&A)` 탭
     - `📜 위키 수정 내역 & 스냅샷` 탭

3. **위키피디아 교차 링크 (`[[WikiLink]]`)**
   - 본문에 `[[20대 자취·독립 갤러리]]` 처럼 대괄호를 적으면 `WikiLink.tsx`가 교차 하이퍼링크로 변환.
   - 마우스 호버 시 Wikipedia 방식의 **Hover 미리보기 팝업 카드** 표시.

4. **마크다운 글쓰기 매니저 (`src/components/MarkdownEditor.tsx`)**
   - 툴바(굵게, 기울임, H3, 목록, 표, 인용구) + `[[교차링크]]` 자동 삽입 모달 + `✍️ 작성` / `👁️ 실시간 미리보기` 탭 스위처 + 표준 템플릿 지원.

---

## 📚 콘텐츠 작업 규칙 (조사·위키 작성)

갤러리별 제품 조사는 `content/<갤러리>.json` 으로 작성하고 `npm run content:import -- content/<파일>.json [--dry]` 로 등록한다. 예시는 `content/camping.json`.

- 갤러리당 저가/중가/고가 각 2~3개, 실제 판매 중인 **브랜드+모델** 만. 카테고리를 고루 섞을 것(전원 장비 쏠림 금지).
- 출처에서 확인한 내용만 쓴다. 확인 못 한 값은 `null`, 스펙·가격을 추측하지 않는다. 가격은 확인일과 함께 기록.
- 출처(`sources`) 2개 이상, `purchaseLinks` 는 직접 열어본 URL만. 문장은 패러프레이즈, 광고성 표현·근거 없는 "최고/1위" 금지.
- `[[교차링크]]` 는 기존 갤러리 이름만 사용(`prisma/seed.ts` 참고).
- 투표·점수를 임의로 만들지 않는다(운영자 큐레이션 금지 원칙). `db:seed` 는 DB를 전부 지우므로 콘텐츠 반영에 쓰지 않는다.
- 페치가 같은 사이트에서 2회 실패하면 포기하고 다른 출처를 쓴다.

---

## 🔁 교차 리뷰 & 주간 보고

Claude ↔ Gemini 는 서로의 결과물을 `docs/reviews/` 에 리뷰로 남기고, 주말에 Opus 가 회고·계획에 반영한 뒤 사용자에게 보고한다.
규칙·템플릿은 [`docs/reviews/README.md`](docs/reviews/README.md) 참고. 핵심: 형식 고정, 하루치 범위만, 지적 3개 이상(또는 확인 항목 나열), 리뷰어가 직접 수정 금지, 사용자 승인 후에만 반영.

---

## 🛠️ 작업 시 필수 명령 규칙

모든 작업 전후에 다음 명령을 실행하여 코드 일관성을 유지해야 합니다:

```bash
npm run typecheck    # TypeScript 타입 검사 (에러 0개 필수)
npm test             # Vitest 단위 테스트 (69개 전원 통과 필수)
```

---

## 📝 교대 시 전달 사항 (Recent Handover Log)

### [2026-10-09] Antigravity ➔ Claude Code / 차기 에이전트
- **완료된 작업**:
  - `MarkdownEditor.tsx` 구현 및 `ItemForm.tsx` 서식 툴바/실시간 미리보기 통합 완료.
  - 레딧/디시 5대 라이프 허브 사이드바(`Sidebar.tsx`), 헤더(`Header.tsx`), 교차링크(`WikiLink.tsx`), 3-Tier 서브갤러리 피드(`GalleryFeed.tsx`) 완성.
  - `prisma/seed.ts`에 5대 허브 및 15+ 서브 갤러리 시드 반영 완료.
  - Git 커밋 `cb2e652`까지 GitHub 원격상에 Push 완료.
- **다음 작업 제안**:
  - 사용자 가입 후 마이페이지 / 유저 신뢰도(Karma) 및 뱃지 표시 강화.
  - 갤러리 내 커뮤니티 글 쓰기(Q&A) 폼 추가 및 댓글 상호작용 강화.

### [2026-10-09] Claude Code ➔ 차기 에이전트 (파일럿: 캠핑·차박 콘텐츠)
- **완료된 작업**:
  - `content/camping.json`(실제 제품 6개, 저/중/고가 각 2개) 작성·팩트체크 후 로컬 `dev.db` 에 등록.
  - `scripts/import-content.ts` + `npm run content:import` 추가(DB 비삭제, 투표 미생성, 중복 건너뜀, 편집 이력 1건 생성).
  - 위 "콘텐츠 작업 규칙" 섹션 신설.
- **결과**: 가격 6건 출처 일치, 출처 미확인 문구는 삭제/수정. typecheck 통과, 테스트 69개 통과.
- **알려진 이슈**: 캠핑 6개 중 3개가 전원 장비(텐트/침낭/조명 누락), 가격은 코스트코 한 곳 기준. 개발 DB 시드의 가짜 투표 때문에 신규 아이템(투표 0)이 하위 노출 — 실서비스 전 시드 정리 필요.
- **역할 분담 계획**: 콘텐츠 조사·작성은 Gemini 계열 에이전트, 어려운 기능 개발은 Claude Code. 콘텐츠 날은 위 규칙을 따를 것.

### [2026-10-09] Claude Code ➔ 차기 에이전트 (동기화 확인)
- **확인 내용**:
  - 브랜치 `claude/peaceful-pasteur-abbqgx`를 원격과 동기화(이미 최신, `2815977`).
  - `npm run typecheck` 오류 없음, `npm test` 69개 전원 통과.
- **변경 사항**: 코드 변경 없음. 이 로그만 추가.
- **다음 작업 제안**: 위 제안 항목 중 하나(마이페이지/Karma 또는 Q&A 글쓰기 폼) 선택 대기.

### [2026-10-09] Gemini (콘텐츠 담당) ➔ Claude Code / 차기 에이전트
- **완료된 작업**:
  - `content/camping-2.json` 작성 (텐트 3종, 침낭 1종, 조명 2종 등 총 6개, 저/중/고 각 2개 균형 편성).
  - 팩트체크: 코오롱몰 공식관, 코스트코 코리아, 다나와 기준 출처 2개 이상 및 실구매가·스펙 확인, 미확인 항목(코베아 팝업 텐트 패키지 무게 등)은 `specSummary`에 명시 또는 `null` 처리.
  - `node --import tsx scripts/import-content.ts content/camping-2.json --dry` 로 6개 항목 정상 인식 검증 완료.
  - `npm run typecheck` 에러 0개 통과, `npm test` 69개 전원 통과 확인.
- **환경 메모**:
  - macOS 샌드박스 환경에서는 `tsx` CLI 직접 실행 시 IPC 파이프 바인딩(`listen EPERM`)이 발생하므로, TS 스크립트 실행 시 `node --import tsx <script>` 방식이 안정적으로 작동함.
- **다음 작업 제안**:
  - 브랜치 `content/2026-10-09-camping-2` 내용 교차 리뷰 후 로컬 DB 반영 (`npm run content:import -- content/camping-2.json`).

