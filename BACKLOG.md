# BACKLOG (Claude 관리, 토요일 격차 분석으로 갱신)
> 4주 통합 로드맵: `docs/design/ROADMAP.md` (W43~W46). 아래는 로드맵 밖 항목.
## 기능
- [W42 진행] 마이페이지 `/me` + Karma 진행도 — `docs/design/2026-W42-mypage-karma.md`
- 기여 이벤트 로그(`ContributionEvent`): 문서 삭제·롤백 후에도 기여 이력 보존 (Gemini D2 제안)
- Q&A 글쓰기 폼 (AGENT_HANDOVER 제안 항목)
## 콘텐츠·운영
- 본문을 `facts:[{sentence, source, quote}]` 로 조립하는 구조 전환 (근거 없는 서술을 구조적으로 차단). 현재 자유 서술에서 반복된 지표 우회의 근본 대책
- `content:check` 가격 검사: 다나와 URL 이 있으면 `price:danawa` 조회값과 1% 이내·`status OK` 확인
- 가격 재확인 주기(예: 주 1회)와 다나와 약관 확인
- 자동 실행 전용 Antigravity 대화 분리 (사용자 채팅과 `ai` 응답 섞임 방지)
- `tools/ai-cli` 브랜치 보존, `content:verify` 통합(선택)
