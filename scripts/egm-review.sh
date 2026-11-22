#!/bin/bash
# EGM(Elephant-Goldfish) 무인 검토: 설계서 한 편을 기억 없는 검토자(Goldfish)들이 5단계로 읽고 통합 보고서를 남긴다.
# 사용: scripts/egm-review.sh docs/design/2026-W50-<주제>.md   (weekly-dev.sh 일요일 설계 세션 뒤에 부른다)
# 결과: docs/reviews/egm/<설계서 이름>/consolidated_review_report.md (+ 단계별 보고서). 설계서는 고치지 않는다.
# 전제: 사용자 범위 플러그인 egm@egm 설치, claude 2.1.271 이상. 스킬이 disable-model-invocation 이라 슬래시 명령으로만 부른다.
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
WORK=/Users/macmini/.gemini/antigravity/worktrees/Lifipedia/lifipedia-nas-deployment-setup
DOC="${1:?설계서 경로 필요}"
cd "$WORK" || exit 1
[ -f "$DOC" ] || { echo "[egm] 설계서 없음: $DOC"; exit 2; }
EGM_ROOT="$HOME/.claude/plugins/cache/egm/egm"
[ -d "$EGM_ROOT" ] || { echo "[egm] 플러그인 없음: claude plugin install egm@egm"; exit 2; }

OUT="docs/reviews/egm/$(basename "$DOC" .md)"
mkdir -p "$OUT"
PROMPT="/egm:egm-review $DOC
Step: uninterrupted
GoldfishContext: GLOSSARY.md, docs/adr/0001-views-do-not-affect-score.md, docs/adr/0002-situation-galleries-own-no-documents.md, docs/design/ROADMAP.md
EGM artifact directory: $OUT
무인 실행이다. 질문하지 말고 기본값으로 진행한다. 범위 밖 링크와 URL 은 모두 뺀다. 설계서는 수정하지 않고 $OUT 에 보고서만 쓴다. 마지막에 $OUT/consolidated_review_report.md 의 경로를 한 줄로 알린다."

# 플러그인 폴더는 읽기만, 쓰기는 보고서 폴더만. 버전 폴더는 * 로 두어 업데이트 뒤에도 맞게 한다.
perl -e 'alarm shift; exec @ARGV' 3600 claude -p "$PROMPT" \
  --model sonnet --permission-mode dontAsk --max-budget-usd 8 \
  --allowedTools "Read" "Grep" "Glob" "Agent" "Edit($OUT/**)" \
    "Read(/${EGM_ROOT}/*/agents/**)" "Read(/${EGM_ROOT}/*/docs/**)" "Read(/${EGM_ROOT}/*/resources/**)" "Read(/${EGM_ROOT}/*/skills/**)" \
  --disallowedTools "Bash" "Edit(docs/design/**)" "Edit(src/**)" "Edit(scripts/**)" "Edit(prisma/**)"
rc=$?
echo "[egm] claude exit=$rc 보고서: $(ls "$OUT" 2>/dev/null | tr '\n' ' ')"
[ -s "$OUT/consolidated_review_report.md" ]
