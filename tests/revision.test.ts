import { describe, expect, it } from 'vitest';
import { parseRev, parseRevRange } from '@/lib/revision';

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
