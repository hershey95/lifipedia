import { describe, expect, it } from 'vitest';
import { parseRev, parseRevRange, revertedRevisions } from '@/lib/revision';

describe('revertedRevisions', () => {
  const revert = (revision: number, to: number) => ({ revision, revertOfRevision: to });
  it('되돌리기 대상과 되돌리기 사이의 리비전이 되돌려진 것이다', () => {
    expect([...revertedRevisions([revert(5, 2)])].sort()).toEqual([3, 4]);
  });
  it('되돌리기를 되돌리면 원래 편집은 복원된다 (순서와 무관하게 입력)', () => {
    // r3 이 r2 를 취소(r1 로), r4 가 r3 을 취소(r2 로)
    expect([...revertedRevisions([revert(4, 2), revert(3, 1)])]).toEqual([3]);
  });
  it('되돌리기가 아닌 행은 무시한다', () => {
    expect(revertedRevisions([{ revision: 2, revertOfRevision: null }]).size).toBe(0);
  });
});

describe('parseRevRange', () => {
  it('정상 범위', () => expect(parseRevRange('3', '7', 10)).toEqual({ from: 3, to: 7 }));
  it('순서가 거꾸면 뒤집는다', () => expect(parseRevRange('7', '3', 10)).toEqual({ from: 3, to: 7 }));
  it('정수가 아니면 null', () => {
    expect(parseRevRange('a', '2', 10)).toBeNull();
    expect(parseRevRange('1.5', '2', 10)).toBeNull();
    expect(parseRevRange('1e1', '2', 10)).toBeNull();
    expect(parseRevRange(undefined, '2', 10)).toBeNull();
  });
  it('범위 밖이면 null', () => {
    expect(parseRevRange('0', '2', 10)).toBeNull();
    expect(parseRevRange('2', '11', 10)).toBeNull();
  });
  it('같은 리비전이면 null', () => expect(parseRevRange('4', '4', 10)).toBeNull());
});

describe('parseRev', () => {
  it('정수만 허용', () => {
    expect(parseRev('5', 10)).toBe(5);
    expect(parseRev('11', 10)).toBeNull();
    expect(parseRev('-1', 10)).toBeNull();
    expect(parseRev(['1', '2'], 10)).toBeNull();
    expect(parseRev(undefined, 10)).toBeNull();
  });
});
