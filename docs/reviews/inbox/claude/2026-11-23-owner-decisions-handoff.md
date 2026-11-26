# 오너 승인·결정 전달 (안티 → Claude) 2026-11-23
출처: 오너 승인 지시(자비스 경유 `msg_e7134660f7d4`, 2026-11-23 00:03 KST).
적용 스킬: `research`(1차 출처 검증), `hallmark`(실렌더 감사), `orchestration`.
> 안티는 `docs/design/`·`src/`·`prisma/schema.prisma`·`GLOSSARY.md` 를 직접 수정하지 않으므로, 확정된 결정과 근거를 본 문서로 전달한다. Claude 가 `docs/design/PROGRESS.md`·`2026-W49-wiki-features.md`·`2026-W45-comment-vote-notify.md` 반영 및 구현을 진행한다.

---

## (a) G-사람: `db:push` + `next build` + `localhost:3115` 기동 완료 및 실렌더 감사
- **백업**: `prisma/dev.db` → `prisma/dev.backup-2026-11-23.db` (`405,504` bytes, `.gitignore` 의 `*.db` 로 추적 제외).
- **`npm run db:push`**: `--accept-data-loss` 없이 111ms 만에 정상 동기화 완료 (`Your database is now in sync with your Prisma schema.`).
- **`npm run build`**: **최종 성공(exit 0)** — 컴파일(17.0s), 타입·린트 검사, 정적 페이지 8/8 생성 통과. 25일간 막혀 있던 `P2021` 해소 확인.
- **서버 기동 및 Hallmark 실렌더 감사**: `http://localhost:3115` 에 새 빌드를 기동해 W1·W2·P3·B 화면 실렌더 감사를 완료했다(상세 결과: `docs/reviews/design/2026-11-23-audit.md`).
  - `PROGRESS.md:64` 의 `G-사람` 완료 표기(`[x]`)와 `W1`·`W2`·`P3`·`B` 의 `"build 미확인"` 해제는 Claude 세션에서 반영해 달라.
  - 단, `dev.db` 에는 아직 `CATEGORY` 행이 0개(`SITUATION` 19개, `Post` 0개, `TalkComment` 0개)이므로 `G-대화형`(`taxonomy.json` 키 변환·import 래퍼) 완료 후 분류 갤러리/게시판 데이터 포함 2차 육안·감사 권장.

---

## (b) W45-4 신고 처리·숨김 결정: 규칙 계산형 자동 임시 숨김 + 법적 임시조치 분리
**확정안**: `docs/design/2026-W49-wiki-features.md:232` 의 선택지 중 **`(b) 규칙 계산형 자동 숨김`** 을 채택한다. 관리자 전용 숨김 라우트(`isAdmin`/`ADMIN_USER_IDS` 임의 토글)는 비채택한다.

### 레퍼런스 1차 출처 근거
1. **Stack Exchange 커뮤니티 플래그 자동 숨김·삭제** (`meta.stackexchange.com`): 다수 사용자의 독립 스팸/욕설 신고(통상 6건, 고스팸 사이트 3건)가 누적되면 운영자 수동 개입 없이 시스템이 자동 숨김 처리.
2. **Discourse 신뢰도 기반 플래그 자동 숨김** (`meta.discourse.org`, `hide_post_sensitivity`): 사용자 신뢰 등급(Trust Level)이 일정 이상인 사용자의 신고가 임계치를 넘으면 글을 자동 임시 숨김 처리하고 작성자에게 편집·소명 기회를 제공.
3. **Wikipedia RevisionDelete 및 공개 로그** (`en.wikipedia.org/wiki/Wikipedia:Revision_deletion`): 일반 편집 분쟁과 법적 침해(저작권·명예훼손·개인정보 노출)를 엄격히 분리하고, 숨김 조치 시 원문은 가리되 숨김 사실·사유·시각을 공개 로그에 남겨 검열 남용을 방지.

### Lifipedia 적용 규칙 (철학·`User` 스키마 무충돌)
- **`User` 스키마 권한 컬럼 신설 없음** (`prisma/schema.prisma:23-40` 유지, `2026-W49-wiki-features.md:7` 거름망 1 준수).
- **일반 신고(스팸·욕설·규칙 위반) → 규칙 계산형 `AUTO_HIDE`** (`2026-W45-comment-vote-notify.md:246` 확장):
  - **자격**: 가입 7일 이상·미제재 계정의 **서로 다른 신고자**만 집계(동일 사용자 중복 무효, 일일 신고 한도 10건 `ref-security.md:346`).
  - **자동 숨김 임계치(상수 공개)**: 일반 게시판 글·댓글·토론 댓글 **3명 이상**, 정식 문서(`Item`)는 오남용 방지를 위해 **5명 이상**(또는 신뢰도 가중 합 임계) 도달 시 서버 트랜잭션에서 `isRemoved = true` + `AuditLog` (`actorKind=SYSTEM`, `action=AUTO_HIDE`, 사유·신고자 수) 기록.
  - **점수·순위 분리**: 신고·자동 숨김은 다른 문서의 `Item.score` 나 기여도에 임의 조작을 가하지 않음(ADR 0001).
  - **제재 사다리**: `2026-W45-comment-vote-notify.md:245` 의 `SANCTION_LADDER = [경고, 24h, 7일, 30일]` 만 적용하며, `User.suspendedUntil` 은 `Sanction` 테이블에서만 파생.
- **법적 권리침해(정보통신망법 임시조치: 저작권·명예훼손·개인정보)** (`ref-security.md:282-292`):
  - 일반 커뮤니티 신고와 분리된 `/report/legal` 로 접수하고, 숨김 범위는 문서 전체가 아니라 대상 **필드 또는 리비전**으로 최소화하며, 모든 조치 결과를 `/transparency` 공개 로그에 게시(Wikipedia 공개 DMCA/RevDel 로그 방식).

---

## (c) W49 콘텐츠 라이선스 정책 결정: 본문 CC BY-SA 4.0 + 데이터 CC BY 4.0
**확정안**: `docs/design/ref-security.md:274-275, 383` 의 권장안과 위키백과 표준 관행을 그대로 확정한다.

### 레퍼런스 1차 출처 근거
1. **Wikipedia:Copyrights & Wikimedia Terms of Use** (`en.wikipedia.org/wiki/Wikipedia:Copyrights`): 사용자 텍스트 기여는 **CC BY-SA 4.0 International** 로 공개. 저작자 표기(BY)는 원문 문서 URL 링크 및 편집 이력으로 갈음하며, 2차 저작물은 동일 라이선스(SA)로 공유. 이미지·외부 미디어는 텍스트 라이선스를 자동 상속하지 않고 개별 저작권 표시를 따름.
2. **Creative Commons CC BY-SA 4.0 / CC BY 4.0** (`creativecommons.org/licenses/by-sa/4.0/`, `creativecommons.org/licenses/by/4.0/`): 4.0 버전은 *Sui Generis* 데이터베이스 권리까지 명시적으로 포괄.

### Lifipedia 적용 규칙 (W49/W46-3 반영)
1. **적용 범위**:
   - **위키 문서 본문·토론·게시판 텍스트**: **CC BY-SA 4.0 International** (`https://creativecommons.org/licenses/by-sa/4.0/deed.ko`).
   - **순위·점수 스냅샷 등 집계 데이터**: **CC BY 4.0 International** (`https://creativecommons.org/licenses/by/4.0/deed.ko`) — 출처 URL 명시만으로 인용·재사용 허용.
   - **예외(이미지·외부 인용)**: 외부 제조사·판매처 상품 이미지 및 인용 원문은 각 권리자에게 귀속되며 CC BY-SA 4.0 대상에서 제외(설명문 통째 복사 금지, 요약 + 1차 출처 URL·확인일 명시 원칙 유지).
2. **화면 고지 문구**:
   - **전역 푸터 및 문서 하단**: `"이 문서의 텍스트는 CC BY-SA 4.0 라이선스로 이용할 수 있습니다(이미지·외부 인용 제외)."` + 라이선스 링크.
   - **문서 생성·편집 저장 버튼 옆**: `"저장하면 작성한 텍스트가 CC BY-SA 4.0 으로 공개되는 데 동의합니다."`
   - **회원 탈퇴 시**: 라이선스 연속성 보장을 위해 기여 본문·리비전은 유지하되 저작자 표시는 `"탈퇴한 사용자"` 로 익명화(`ref-security.md:254`).
3. **시드 콘텐츠(`content/*.json`) 정합 확인**: 현행 `content/camping.json`·`content/camping-2.json` 의 본문은 직접 요약 서술이며 외부 설명문 통째 복사가 없고, `evidence[].quote` 는 사실 검증용 짧은 발췌 인용(1차 출처 URL·확인일 첨부)으로 구성되어 CC BY-SA 4.0 텍스트 공개와 충돌하지 않는다.
