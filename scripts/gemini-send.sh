#!/bin/bash
# Gemini(Antigravity) 에게 Orca 터미널로 지시를 보내고, heartbeat 의 'end' 줄이 새로 생길 때까지 기다린다.
# 사용: scripts/gemini-send.sh "<지시문>"   (MAX_WAIT 초, 기본 1500)
# 종료코드: 0 완료(end 확인) / 2 Orca·터미널 없음 / 3 전달 실패 / 4 시간 초과(전달은 됨)
# 터미널은 재시작마다 핸들이 바뀌므로 매번 찾는다: agentIdentity=antigravity 이고 작업경로가 Lifipedia 워크트리인 것.
set -u
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
GEM=/Users/macmini/Lifipedia
HB="$GEM/.agent-heartbeat"
MAX_WAIT=${MAX_WAIT:-1500}
PROMPT="${1:?지시문 필요}"

HANDLE=$(orca terminal list --json 2>/dev/null | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
r = d.get("result", d)
ts = r.get("terminals", r) if isinstance(r, dict) else r
for t in ts:
    if t.get("agentIdentity") == "antigravity" and "/worktrees/Lifipedia/" in (t.get("worktreePath") or "") + "/":
        print(t["handle"]); break
')
[ -n "$HANDLE" ] || { echo "Gemini 터미널을 찾지 못함(Orca 미실행 또는 agy 세션 없음)"; exit 2; }

START=$(date +%Y-%m-%dT%H:%M:%S)
SEND_OUT=$(orca terminal send --terminal "$HANDLE" --text "$PROMPT" --enter --wait-submit 30 2>&1); SEND_RC=$?
# Orca 가 소유 세션을 확정하지 못해 거부(agent_session_ownership_unknown 등)하면, 안내된 요청 ID 로 같은 지시를 재발행한다(재전송이 아니라 결과 재생). 최대 3회.
for try in 1 2 3; do
  [ "$SEND_RC" -ne 0 ] || break
  RID=$(echo "$SEND_OUT" | grep -oE -- '--retry-request [0-9a-f-]{36}' | head -1 | awk '{print $2}')
  [ -n "$RID" ] || break
  echo "orca send 재시도 $try (id=$RID): $(echo "$SEND_OUT" | head -1 | cut -c1-80)"
  sleep 15
  SEND_OUT=$(orca terminal send --terminal "$HANDLE" --text "$PROMPT" --enter --retry-request "$RID" --wait-submit 30 2>&1); SEND_RC=$?
done
echo "orca send rc=$SEND_RC: $(echo "$SEND_OUT" | head -4 | tr '\n' ' ' | cut -c1-300)"
# 입력이 수락되면(input_accepted) 전달된 것으로 본다. 종료코드가 0 이 아니어도 수락 문구가 있으면 진행한다.
if [ "$SEND_RC" -ne 0 ] && ! echo "$SEND_OUT" | grep -q "input_accepted"; then echo "전달 실패($HANDLE)"; exit 3; fi
echo "전달함: $HANDLE $START"

deadline=$(( $(date +%s) + MAX_WAIT ))
while [ "$(date +%s)" -lt "$deadline" ]; do
  sleep 20
  last=$(tail -1 "$HB" 2>/dev/null)
  ts=${last:0:19}
  # 지시 이후에 기록된 end 줄이면 완료
  if [[ "$last" == *" end "* && "$ts" > "$START" ]]; then echo "완료: $last"; exit 0; fi
done
echo "시간 초과(${MAX_WAIT}s): 마지막 heartbeat=$(tail -1 "$HB" 2>/dev/null)"
exit 4
