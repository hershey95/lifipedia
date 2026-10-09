#!/bin/bash
# 평일 정해진 시각(launchd)에 실행. 스크립트가 하는 일은 넷뿐이고 판단은 하지 않는다:
#   ① Gemini 에게 오늘 작업 지시 → 끝날 때까지 대기  ② 사실 수집(깃 상태, content:check 출력)을 파일로 저장  ③ Claude 무인 세션 호출
# 점검·검증·보고서·재요청은 Claude 가 한다 (docs/reviews/RELAY.md "무인 실행 모드").
#   DRY=1 scripts/daily-dispatch.sh   # Gemini 를 깨우지 않고 Claude 점검만 시험
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
WORK=/Users/macmini/.gemini/antigravity/worktrees/Lifipedia/lifipedia-nas-deployment-setup
GEM=/Users/macmini/Lifipedia
DATE=$(date +%F)
LOG=$HOME/.lifipedia-daily.log
MAX_WAIT=${MAX_WAIT:-1500} # Gemini 대기 상한(초)
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

BASE=$(git -C "$GEM" rev-parse --short HEAD)
if [ "${DRY:-0}" = 1 ]; then
  STATUS="DRY(Gemini 호출 안 함)"
else
  log "dispatch start base=$BASE"
  PROMPT="Claude 자동 지시($DATE): 작업 폴더는 반드시 /Users/macmini/Lifipedia 이고 git 은 git -C /Users/macmini/Lifipedia 로 실행하세요. push 는 금지입니다. 저장소의 GEMINI.md 를 읽고 오늘 절차대로 진행하세요. 끝나면 새 커밋 해시를 알려주세요."
  if perl -e 'alarm shift; exec @ARGV' "$MAX_WAIT" "$HOME/.local/bin/ai" "$PROMPT" >> "$LOG" 2>&1; then
    STATUS="완료"
  else
    STATUS="TIMEOUT 또는 오류(종료코드 $?)"
  fi
fi
log "dispatch done status=$STATUS"

cd "$WORK" || exit 1
mkdir -p docs/reviews/daily
FACTS="docs/reviews/daily/$DATE-facts.txt"
{
  echo "## Gemini 클론 최근 커밋"; git -C "$GEM" log --oneline -6
  echo; echo "## BASE($BASE)..HEAD 변경 파일"; git -C "$GEM" diff --name-only "$BASE" HEAD
  echo; echo "## 작업트리 변경(추적 파일)"; git -C "$GEM" status --short | grep -v '^??'
  echo; echo "## heartbeat 끝 4줄"; tail -4 "$GEM/.agent-heartbeat"
  for f in "$GEM"/content/*.json; do echo; echo "## content:check $f"; npm run -s content:check -- "$f" 2>&1 | tail -15; done
  echo; echo "## 원문 대조 관찰값 (scripts/collect-facts.py)"; python3 scripts/collect-facts.py "$GEM"/content/*.json
} > "$FACTS" 2>&1

claude -p "docs/reviews/RELAY.md 의 '무인 실행 모드'를 따라 오늘($DATE) 점검·보고해라. Gemini 상태: $STATUS. 시작 전 Gemini 클론 BASE: $BASE. 스크립트가 수집한 사실 파일: $FACTS (먼저 읽을 것). 보고서 경로: docs/reviews/daily/$DATE-daily-report.md" \
  --model sonnet --permission-mode dontAsk --add-dir "$GEM" \
  --allowedTools "Read" "WebFetch" "Edit(docs/reviews/daily/**)" \
    "Bash(/Users/macmini/.local/bin/ai:*)" \
  --disallowedTools "Bash(git push:*)" "Bash(rm:*)" >> "$LOG" 2>&1
log "claude inspect exit=$?"
