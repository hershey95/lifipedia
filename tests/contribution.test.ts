import { describe, expect, it } from 'vitest';
import { judgeEdit } from '@/lib/contribution-rules';
import { diffDelta, snapshotHash, toSnapshot } from '@/lib/wiki';

const base = { revertOfRevision: null, changedFields: ['description'], deltaChars: 50, creditedTodayOnItem: 0, creditedToday: 0 };

describe('judgeEdit', () => {
  it('충분한 변경은 적립', () => expect(judgeEdit(base)).toEqual({ credited: true, reason: null }));
  it('되돌리기는 미적립', () => expect(judgeEdit({ ...base, revertOfRevision: 3 })).toEqual({ credited: false, reason: 'REVERT' }));
  it('20자 미만의 서술 변경은 미적립', () => expect(judgeEdit({ ...base, deltaChars: 19 }).reason).toBe('TOO_SMALL'));
  it('20자 경계는 적립', () => expect(judgeEdit({ ...base, deltaChars: 20 }).credited).toBe(true));
  it('가격·티어 변경은 크기와 무관하게 적립', () => expect(judgeEdit({ ...base, changedFields: ['priceKrw'], deltaChars: 3 }).credited).toBe(true));
  it('같은 문서 하루 3번째는 미적립', () => {
    expect(judgeEdit({ ...base, creditedTodayOnItem: 1 }).credited).toBe(true);
    expect(judgeEdit({ ...base, creditedTodayOnItem: 2 }).reason).toBe('DAILY_ITEM_CAP');
  });
});

describe('전체 일일 상한', () => {
  it('하루 8건째까지 적립, 이후 미적립', () => {
    expect(judgeEdit({ ...base, creditedToday: 7 }).credited).toBe(true);
    expect(judgeEdit({ ...base, creditedToday: 8 }).reason).toBe('DAILY_CAP');
  });
});

describe('snapshotHash', () => {
  it('같은 내용은 키 순서와 무관하게 같은 해시', () => {
    const a = toSnapshot({ name: 'x', purchaseLinks: [{ label: 'a', url: 'u' }] });
    const b = toSnapshot({ purchaseLinks: [{ url: 'u', label: 'a' }], name: 'x' });
    expect(snapshotHash(a)).toBe(snapshotHash(b));
  });
  it('내용이 다르면 다른 해시', () => expect(snapshotHash(toSnapshot({ name: 'x' }))).not.toBe(snapshotHash(toSnapshot({ name: 'y' }))));
});

describe('diffDelta', () => {
  it('헤더 줄은 세지 않고 삽입·삭제 글자만 센다', () => {
    expect(diffDelta('--- a\n+++ b\n@@ -1 +1 @@\n-abc\n+abcdef\n context')).toBe(3 + 6);
  });
});

describe('httpUrl (되돌리기 스냅샷 재검증에 쓰는 규칙)', () => {
  it('위험 스킴을 거절한다', async () => {
    const { httpUrl } = await import('@/lib/api');
    expect(httpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpUrl.safeParse('data:text/html,x').success).toBe(false);
    expect(httpUrl.safeParse('https://example.com/a').success).toBe(true);
  });
});
