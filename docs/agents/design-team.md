# 디자인팀 (Hallmark 스킬 기반)
디자인 작업(새 화면·개편·검토)은 **Hallmark 스킬**(`Nutlope/hallmark`, MIT)의 규칙과 도구를 쓴다. 설치돼 있지 않으면 사람이 먼저 설치한다(아래 "설치").

## 우리 디자인 시스템이 이긴다
Hallmark 는 랜딩·마케팅 페이지를 "테마를 뽑아" 새로 만드는 쪽에 강하다. Lifipedia 는 위키·커뮤니티 앱이고 토큰이 이미 정해져 있다(`docs/design/ref-design-system.md`: `fg`/`bg`/`surface`/`accent-fg`, 다크 기본·라이트 `data-theme="light"`). 그래서:
- **쓰는 것**: `audit`(읽기 전용 감사), 바닥 게이트(Floor: 대비·포커스·reduced-motion·지어낸 사실·모바일 깨짐), `sloplint` 의 정적·렌더 검사.
- **쓰지 않는 것**: 테마 deal/draw 로 앱 화면을 새로 뽑기, `redesign` 으로 기존 페이지를 통째로 다시 만들기. 앱의 색·글꼴·간격은 우리 토큰만 쓴다.
- **새 마케팅·소개 페이지**(예: 서비스 소개, 랭킹 공식 설명)에 한해 Hallmark 테마 빌드를 허용하되, 토큰과 충돌하면 토큰이 우선이고 이유를 `docs/reviews/daily/<날짜>-dev.md` 에 남긴다.

## 워크플로
1. 화면을 만들거나 고치면 **구현 직후** 같은 세션이 `/hallmark audit <경로>` 로 감사한다(읽기 전용). Floor 위반은 같은 날 고치고, Reflex 는 이유가 있으면 기록하고 남긴다.
2. 렌더 검사는 Chrome 이 필요하다(`sloplint --render`). 무인 세션에서 Chrome 이 없으면 정적 검사만 하고 "렌더 미확인"으로 적는다.
3. UX 검토자(`docs/agents/ux-reviewer.md`)는 Hallmark 감사 결과를 입력으로 받아 중복 없이 사람 관점(흐름·빈 상태·문구)을 본다.
4. 사실 규칙: 이미지·수치·후기를 지어내지 않는다. 사진은 Hallmark 가 고르는 Wikimedia 출처만, 출처 표기 필수. 이미지 생성(`imagegen.mjs`, Together API 키 필요)은 쓰지 않는다.

## 설치 (사람이 한 번)
프로젝트에만 설치한다(`-g` 쓰지 않음):
```
cd /Users/macmini/.gemini/antigravity/worktrees/Lifipedia/lifipedia-nas-deployment-setup
npx skills add nutlope/hallmark
```
- 검토한 버전: `407fa68` (2026-11-05, MIT, Together AI 제작). 스크립트는 네트워크를 Wikimedia 사진·Together 이미지 API(키 필요)에만 쓰고, 브라우저 검사는 `puppeteer-core`+Chrome 을 쓴다.
- **`install-hook.mjs`(편집 때마다 도는 훅)는 설치하지 않는다.** 필요하면 사람이 결정한다.
- 렌더 검사를 쓰려면 `npm i -g puppeteer-core`.

## 우선 적용 대상 (PROGRESS 순서)
- T2·T3 분류/상황 페이지, V1·P1~P3 게시판 화면, K(`ink` 치환)·라이트 토글: 각 구현 직후 audit.
- 이미 있는 화면(문서·갤러리·최근 변경)은 한 번 `audit` 로 기준선을 잡는다(결과: `docs/reviews/design/2026-11-baseline.md`).
