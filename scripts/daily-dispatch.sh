#!/bin/bash
# 매일 정해진 시각(launchd)에 실행. 스크립트가 하는 일은 판단 없이 다섯 가지뿐이다:
#   ① Gemini 에게 오늘 작업·피드백 수용·Claude 리뷰 지시 → 끝날 때까지 대기
#   ② 사실 수집(깃 상태, content:check, 원문 대조 관찰값)을 파일로 저장
#   ③ Claude 무인 세션(Sonnet) 호출 — 사실 대조 + 정성 평가 + 피드백/수용 작성은 Claude 가 한다 (docs/reviews/RELAY.md)
#   ④ 보고서·피드백 문서만 claude 브랜치로 발행(커밋·push). 에이전트가 아니라 이 스크립트가 한다
#   DRY=1 scripts/daily-dispatch.sh   # Gemini 를 깨우지 않고 Claude 점검만 시험
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
WORK=/Users/macmini/.gemini/antigravity/worktrees/Lifipedia/lifipedia-nas-deployment-setup
GEM=/Users/macmini/Lifipedia
BRANCH=claude/peaceful-pasteur-abbqgx
DATE=$(date +%F)
LOG=$HOME/.lifipedia-daily.log
MAX_WAIT=${MAX_WAIT:-1500} # Gemini 대기 상한(초)
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

BASE=$(git -C "$GEM" rev-parse --short HEAD)
if [ "${DRY:-0}" = 1 ]; then
  STATUS="DRY(Gemini 호출 안 함)"
else
  log "dispatch start base=$BASE"
  PROMPT="Claude 자동 지시($DATE): 작업 폴더는 반드시 /Users/macmini/Lifipedia 이고 git 은 git -C /Users/macmini/Lifipedia 로 실행하세요. push 는 금지입니다. 먼저 origin 의 $BRANCH 를 fetch 후 병합하고, 저장소의 GEMINI.md 를 읽고 절차대로 다음 세 가지를 진행하세요. (1) 오늘 계획/요일 작업, (2) docs/reviews/inbox/gemini/ 의 상태 열림 피드백 파일 항목마다 수용·부분 수용·거절+이유를 inbox/claude/ 의 feedback-reply 로 답하고 수용분 반영, (3) Claude 의 최근 24시간 변경(설계서·코드 diff)을 리뷰해 inbox/claude/ 에 gemini-on-claude 로 작성. 사용자 승인은 기다리지 말고 판단해서 조치한 뒤 중요한 것만 답신 맨 위에 적으세요. 끝나면 새 커밋 해시를 알려주세요."
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

claude -p "docs/reviews/RELAY.md 의 '무인 실행 모드', '정성 평가', '상호 피드백 시퀀스'를 따라 오늘($DATE) 점검·보고해라. Gemini 상태: $STATUS. 시작 전 Gemini 클론 BASE: $BASE. 스크립트가 수집한 사실 파일: $FACTS (먼저 읽을 것). Gemini 의 리뷰·답신은 $GEM/docs/reviews/inbox/claude/ 에서 읽는다. 보고서: docs/reviews/daily/$DATE-daily-report.md (맨 위 '중요 보고'에 사용자 결정이 필요한 것만). 피드백: docs/reviews/inbox/gemini/$DATE-feedback.md, 수용 답신: docs/reviews/inbox/gemini/$DATE-feedback-response.md. 사용자 승인을 기다리지 말고 판단해서 조치해라." \
  --model sonnet --permission-mode dontAsk --add-dir "$GEM" \
  --allowedTools "Read" "WebFetch" "Edit(docs/reviews/daily/**)" "Edit(docs/reviews/inbox/gemini/**)" \
    "Bash(/Users/macmini/.local/bin/ai:*)" \
  --disallowedTools "Bash(git push:*)" "Bash(rm:*)" >> "$LOG" 2>&1
log "claude inspect exit=$?"

# 발행: 보고서·피드백 문서만 커밋해 push (기계적 단계). 코드나 규칙 문서는 건드리지 않는다.
if [ "$(git branch --show-current)" = "$BRANCH" ]; then
  git add -- docs/reviews/daily docs/reviews/inbox >> "$LOG" 2>&1
  if ! git diff --cached --quiet -- docs/reviews; then
    git commit -q -m "docs: $DATE 일일 점검 보고와 피드백 (자동)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -- docs/reviews >> "$LOG" 2>&1
    git push -q origin "$BRANCH" >> "$LOG" 2>&1 && log "발행 완료" || log "발행 push 실패"
  fi
else
  log "발행 건너뜀: 현재 브랜치가 $BRANCH 가 아님"
fi
