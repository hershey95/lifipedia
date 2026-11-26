# 리뷰: 안티 → Claude (2026-11-23)
- 대상: 최근 24시간 `origin/claude/peaceful-pasteur-abbqgx` 변경분 (`6672c45..2fc13e4`: `6c5c285`·`f69cb0e` W49 일요일 조정, `7eaf7bc` EGM Goldfish 연결, `2fc13e4` W49 EGM 통합 검토 보고서)
- 범위: `docs/design/2026-W49-wiki-features.md:221-277`, `docs/design/PROGRESS.md:61-82`, `docs/design/ROADMAP.md:81-84`, `docs/reviews/daily/2026-11-22-dev.md`, `scripts/weekly-dev.sh:34-53`, `scripts/egm-review.sh`, `docs/reviews/egm/2026-W49-wiki-features/consolidated_review_report.md` (모든 줄 번호는 직접 열어 복사 확인)
- 확인한 항목:
  - **실패 시나리오**: `scripts/weekly-dev.sh:34-37` 이 월요일마다 `ls -t docs/reviews/egm/*/consolidated_review_report.md | head -1` 결과에 `response.md` 존재 여부를 셸에서 확인하지 않고 매번 프롬프트에 첨부한다. 또한 `2026-W49-wiki-features.md:273` 의 `C` 알림 생성 시 Prisma SQLite 에서 `createMany({ skipDuplicates })` 지원 여부를 확인하지 않으면 `P2002` 로 투표 트랜잭션이 롤백될 수 있다(EGM `M4` 지적 일치).
  - **권한·안전**: `scripts/egm-review.sh:26-28` 은 `--disallowedTools "Bash" "Edit(docs/design/**)" "Edit(src/**)" "Edit(scripts/**)" "Edit(prisma/**)"` 로 EGM 검토자가 설계서·코드를 직접 고치지 못하게 격리하고, `2026-W49-wiki-features.md:232` 는 관리자 숨김 라우트를 큐에서 제외해 `0절` 운영자 권한 비채택 원칙을 지켰다.
  - **멱등성·상태 정합**: 오늘(`2026-11-23 00:05`) 오너 승인으로 `G-사람`(`dev.db` 백업·`db:push`·`next build`)이 이미 완료(`2d7daae`, `docs/reviews/inbox/claude/2026-11-23-owner-decisions-handoff.md`)되어 `PROGRESS.md:64`, `2026-W49-wiki-features.md:244`, `consolidated_review_report.md:67` 의 `db:push` 미실행 전제가 최신 상태와 어긋났다.
  - **테스트·검증**: 일요일 설계·EGM 커밋이라 코드 테스트 변경은 없으며, 금일 안티가 `npm test` (`27파일 282건`) 및 `next build` 통과(00:07 완료분)를 확인했다.

| # | 문제 | 근거(파일:줄) | 심각도 | 제안 |
|---|---|---|---|---|
| 1 | `scripts/weekly-dev.sh:34-37` 이 `response.md` 유무를 bash 에서 먼저 검사하지 않아, 이미 처리 완료된 주에도 매주 월요일 프롬프트에 `$EGMR` 처리 지시가 반복 삽입됨. 또한 최신 수정 시각(`ls -t`) 기준이라 이전 주 보고서가 뒤늦게 수정되면 잘못된 폴더를 집을 위험이 있음 | `scripts/weekly-dev.sh:34-37` | 중간 | `[ -n "$EGMR" ] && [ ! -f "$(dirname "$EGMR")/response.md" ]` 조건을 bash 에 추가해 미처리 보고서만 주입 |
| 2 | `2026-W49-wiki-features.md:273` (`C 알림 3종`) 이 `createMany` 중복 회피 방식을 확정하지 않아 SQLite 환경에서 `@@unique([userId, kind, refId])` 충돌 시(`P2002`) 댓글·되돌리기 트랜잭션 전체가 실패할 위험이 있음(EGM `M4` 와 동일 지점) | `docs/design/2026-W49-wiki-features.md:273`, `docs/reviews/egm/2026-W49-wiki-features/consolidated_review_report.md:37` | 중간 | `C` 착수 전 Prisma SQLite 의 `skipDuplicates` 지원 여부를 확인하고, 미지원이면 트랜잭션 내 사전 조회 또는 `upsert` 로 확정 |
| 3 | `2026-W49-wiki-features.md:244,247-254`·`PROGRESS.md:64`·`consolidated_review_report.md:67` 이 여전히 `G-사람`(`db:push`·`build`) 미완료를 전제하고 있으나, 금일 00:05 오너 승인 실행(`2d7daae`)으로 `db:push`·`build` 가 이미 통과했고 W45-4(`AUTO_HIDE`)·W49 라이선스(`CC BY-SA 4.0`) 결정도 `2026-11-23-owner-decisions-handoff.md` 로 전달됨 | `docs/design/PROGRESS.md:64,76`, `docs/design/2026-W49-wiki-features.md:232,244,249`, `docs/reviews/inbox/claude/2026-11-23-owner-decisions-handoff.md` | 낮음 | 월요일 구현 세션이 `2026-11-23-owner-decisions-handoff.md` 와 `2026-11-23-audit.md` (`FAIL 40` 3종) 를 함께 읽어 `G-사람` `[x]` 및 `10.3` 오른쪽 열 일정 반영 |

철학 위반 여부: 없음 (`2026-W49-wiki-features.md:232` 에서 운영자 권한 기반 숨김 라우트를 큐에서 보류해 `0절`·`ADR 0001/0002` 원칙 준수)
