#!/bin/bash
# 평일·주말 무인 개발 세션 (launchd 11:00). 요일별 일은 docs/design/ROADMAP.md 의 '주간 운영'을 따른다:
#   월~목 구현(PROGRESS.md 의 첫 [ ] 항목, 하루 최대 2개) / 금 회고 / 토 격차 분석·BACKLOG / 일 다음 주 설계서
# 이 스크립트는 판단하지 않는다: 잠금·게이트·push 만 한다. 게이트(tsc·vitest·build) 실패 시 작업은 wip/<날짜> 브랜치에 남기고 claude 브랜치는 되돌린다.
#   DRY=1 scripts/weekly-dev.sh   # 요일·계획만 출력하고 끝
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
WORK=/Users/macmini/.gemini/antigravity/worktrees/Lifipedia/lifipedia-nas-deployment-setup
BRANCH=claude/peaceful-pasteur-abbqgx
DATE=$(date +%F); DOW=$(date +%u)
WEEK=$(( 10#$(date +%V) + 1 )) # 로드맵 표기: 2026-10-12 주 = W43 (ISO 42 + 1)
LOG=$HOME/.lifipedia-daily.log
log() { echo "$(date '+%F %T') [dev] $*" >> "$LOG"; }

cd "$WORK" || exit 1
[ "$(git branch --show-current)" = "$BRANCH" ] || { log "건너뜀: 브랜치 $(git branch --show-current)"; exit 0; }
[ -z "$(git status --porcelain)" ] || { log "건너뜀: 작업트리에 미커밋 변경(대화형 작업 중으로 간주)"; exit 0; }
for i in $(seq 1 40); do pgrep -f daily-dispatch.sh >/dev/null || break; sleep 60; done # 09시 점검이 끝날 때까지 최대 40분
mkdir -p "$HOME/.lifipedia-lock" && mkdir "$HOME/.lifipedia-lock/dev" 2>/dev/null || { log "건너뜀: 이미 실행 중"; exit 0; }
trap 'rmdir "$HOME/.lifipedia-lock/dev"' EXIT

git fetch -q origin && git merge --no-edit -q origin/content/2026-10-09-camping-2 >> "$LOG" 2>&1 || { git merge --abort 2>/dev/null; log "중단: Gemini 브랜치 병합 충돌"; exit 0; }
START=$(git rev-parse HEAD)

MODEL=sonnet
COMMON="저장소 규칙: docs/reviews/RELAY.md, docs/design/ROADMAP.md, docs/design/PROGRESS.md 를 먼저 읽는다. 사용자 승인을 기다리지 말고 판단·조치하되, 막히면 멈추고 보고서에 사유를 적는다. 금지: push, rm, DB 파일(prisma/*.db) 수정, .env·secrets 수정, scripts/·launchd 수정, 스키마의 파괴적 변경(컬럼·테이블 삭제). 범위 밖 파일을 건드리지 않는다. 오늘 결과는 docs/reviews/daily/$DATE-dev.md 에 '한 일 / 못 한 일 / 사용자 결정 필요'로 적는다. 커밋 메시지 끝에 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>' 를 붙인다."
case $DOW in
  1|2|3|4)
    TASK="구현일. PROGRESS.md 에서 첫 [ ] 항목부터 최대 2개를 구현한다. 항목마다: 테스트 먼저(또는 함께), npx tsc --noEmit, npx vitest run, npm run build 를 직접 돌려 통과를 확인한 뒤 커밋하고 PROGRESS.md 의 해당 줄을 [x] (커밋 해시)로 바꾼다. 보안·권한 로직은 docs/agents/security-reviewer.md, 화면은 docs/agents/ux-reviewer.md 관점으로 스스로 한 번 검토해 지적을 반영하고 보고서에 남긴다. 해당 주 항목이 모두 끝났으면 BACKLOG.md 의 상위 항목을 집는다." ;;
  5) TASK="회고일. 이번 주(W$WEEK) 계획 대비 실적을 git log 와 PROGRESS.md 로 대조해 docs/reviews/retro/2026-W$WEEK-retro.md 를 쓴다: 계획/실적 표, 계획과 달라진 판단과 이유, 반복된 실패, 다음 주 조정안. 코드는 수정하지 않는다." ;;
  6) TASK="격차 분석일. 현재 코드와 ROADMAP/ref-*.md 의 목표를 대조해 빠진 것·부채를 찾아 BACKLOG.md 를 갱신한다(우선순위·규모 포함, 근거 파일:줄). 코드는 수정하지 않는다." ;;
  7) TASK="설계일. 다음 주(W$((WEEK+1)))의 설계서 docs/design/2026-W$((WEEK+1))-<주제>.md 를 쓴다: 작업별 데이터 모델·API·화면·테스트·위험, 순서와 의존성. ROADMAP.md 해당 주 표가 기준이며, 바꾸면 이유를 적는다. PROGRESS.md 에 다음 주 섹션을 옮겨 적는다. 코드는 수정하지 않는다."; MODEL=opus ;;
esac
log "start W$WEEK dow=$DOW model=$MODEL base=${START:0:7}"
[ "${DRY:-0}" = 1 ] && { echo "W$WEEK dow=$DOW model=$MODEL: $TASK"; exit 0; }

export DATABASE_URL="file:/tmp/lifipedia-dev-$DATE.db" # 스키마 시험은 임시 DB 에서만
perl -e 'alarm shift; exec @ARGV' 10800 claude -p "$COMMON $TASK" \
  --model "$MODEL" --permission-mode dontAsk --max-budget-usd 20 \
  --allowedTools "Read" "Grep" "Glob" "Edit" "Write" \
    "Bash(npm run:*)" "Bash(npm test:*)" "Bash(npx tsc:*)" "Bash(npx vitest:*)" "Bash(npx prisma generate:*)" "Bash(npx prisma validate:*)" "Bash(npx prisma db push:*)" \
    "Bash(git add:*)" "Bash(git commit:*)" "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(ls:*)" "Bash(cat:*)" "Bash(grep:*)" "Bash(head:*)" "Bash(tail:*)" "Bash(wc:*)" "Bash(curl:*)" "Bash(python3 scripts/collect-facts.py:*)" \
  --disallowedTools "Bash(git push:*)" "Bash(git reset:*)" "Bash(git checkout:*)" "Bash(rm:*)" "Edit(scripts/**)" "Write(scripts/**)" "Edit(prisma/*.db)" "Edit(.env*)" >> "$LOG" 2>&1
log "claude exit=$?"
rm -f "/tmp/lifipedia-dev-$DATE.db"; unset DATABASE_URL

git add -A docs >> "$LOG" 2>&1; git diff --cached --quiet || git commit -q -m "docs: $DATE 무인 개발 보고 (자동)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" >> "$LOG" 2>&1
if [ -n "$(git status --porcelain)" ]; then # 커밋되지 않은 코드 변경 = 미완. 보존하고 되돌린다
  git switch -q -c "wip/$DATE-uncommitted" && git add -A && git commit -q -m "wip: 미완 변경 보존 ($DATE)" && git switch -q "$BRANCH"; log "미완 변경을 wip/$DATE-uncommitted 에 보존"
fi
if [ "$(git rev-parse HEAD)" = "$START" ]; then log "변경 없음"; exit 0; fi

if npx tsc --noEmit >> "$LOG" 2>&1 && npx vitest run >> "$LOG" 2>&1 && npm run -s build >> "$LOG" 2>&1; then
  rm -rf .next
  git push -q origin "$BRANCH" >> "$LOG" 2>&1 && log "게이트 통과, push 완료 $(git rev-parse --short HEAD)" || log "push 실패"
else
  rm -rf .next
  git branch -f "wip/$DATE" HEAD && git reset -q --hard "$START"; log "게이트 실패: 작업은 wip/$DATE 에 보존, $BRANCH 는 ${START:0:7} 로 복구"
fi
