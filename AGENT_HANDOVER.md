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
