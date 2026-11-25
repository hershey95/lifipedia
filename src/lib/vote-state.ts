/** 투표 버튼의 낙관적 상태. 서버 규칙과 같다: 같은 방향 재투표는 취소, 반대는 전환. */
export type VoteType = 'UP' | 'DOWN';
export type VoteState = { up: number; down: number; mine: VoteType | null };

export function applyVote(state: VoteState, type: VoteType): VoteState {
  const mine = state.mine === type ? null : type;
  return {
    up: state.up - Number(state.mine === 'UP') + Number(mine === 'UP'),
    down: state.down - Number(state.mine === 'DOWN') + Number(mine === 'DOWN'),
    mine,
  };
}
