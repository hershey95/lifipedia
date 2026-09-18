import { describe, expect, it } from 'vitest';
import { buildDiff, changedFields, resolveEdit, toSnapshot, type ItemSnapshot } from '@/lib/wiki';

const base: ItemSnapshot = toSnapshot({
  name: '텐트 A',
  tier: 'MID',
  priceKrw: 150_000,
  description: '가성비 좋은 4인용 텐트.',
  specSummary: '4인용',
  recommendReason: null,
  imageUrl: null,
  purchaseLinks: [],
});

describe('changedFields', () => {
  it('바뀐 필드만 집어낸다', () => {
    const after = { ...base, description: '새 설명입니다.' };
    expect(changedFields(base, after)).toEqual(['description']);
  });

  it('변경이 없으면 빈 배열', () => {
    expect(changedFields(base, { ...base })).toEqual([]);
  });

  it('배열/객체 필드는 값으로 비교한다', () => {
    const after = { ...base, purchaseLinks: [{ label: '쿠팡', url: 'https://example.com' }] };
    expect(changedFields(base, after)).toEqual(['purchaseLinks']);
    expect(changedFields(after, { ...after, purchaseLinks: [{ label: '쿠팡', url: 'https://example.com' }] })).toEqual([]);
  });
});

describe('buildDiff', () => {
  it('바뀐 내용이 diff 에 나타난다', () => {
    const after = { ...base, description: '완전히 새로운 설명.' };
    const diff = buildDiff(base, after, 1, 2);
    expect(diff).toContain('revision 1');
    expect(diff).toContain('revision 2');
    expect(diff).toContain('완전히 새로운 설명.');
  });
});

describe('resolveEdit — 동시 편집', () => {
  it('아무도 손대지 않았으면 그대로 저장한다', () => {
    const incoming = { ...base, description: '내가 고친 설명.' };
    const result = resolveEdit({ base, incoming, current: base });
    expect(result.status).toBe('clean');
    if (result.status === 'clean') expect(result.merged.description).toBe('내가 고친 설명.');
  });

  it('서로 다른 필드를 고쳤으면 자동 병합한다', () => {
    const incoming = { ...base, description: '내 설명' };
    const current = { ...base, specSummary: '남이 고친 스펙' };

    const result = resolveEdit({ base, incoming, current });
    expect(result.status).toBe('stale-but-mergeable');
    if (result.status === 'stale-but-mergeable') {
      expect(result.merged.description).toBe('내 설명');
      expect(result.merged.specSummary).toBe('남이 고친 스펙');
      expect(result.alsoChangedByOthers).toEqual(['specSummary']);
    }
  });

  it('같은 필드를 다르게 고쳤으면 충돌로 돌려보낸다', () => {
    const incoming = { ...base, description: '내 버전' };
    const current = { ...base, description: '남의 버전' };

    const result = resolveEdit({ base, incoming, current });
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') expect(result.conflictingFields).toEqual(['description']);
  });

  it('같은 필드를 같은 값으로 고쳤으면 충돌이 아니다', () => {
    const same = { ...base, description: '우연히 같은 수정' };
    const result = resolveEdit({ base, incoming: same, current: same });
    expect(result.status).not.toBe('conflict');
  });

  it('충돌 필드가 여러 개면 전부 보고한다', () => {
    const incoming = { ...base, description: '내 설명', name: '내 이름' };
    const current = { ...base, description: '남 설명', name: '남 이름' };

    const result = resolveEdit({ base, incoming, current });
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') {
      expect(result.conflictingFields.sort()).toEqual(['description', 'name']);
    }
  });

  it('남의 수정을 덮어쓰지 않는다', () => {
    const incoming = { ...base, name: '내가 바꾼 이름' };
    const current = { ...base, priceKrw: 200_000 };

    const result = resolveEdit({ base, incoming, current });
    if (result.status === 'stale-but-mergeable') {
      expect(result.merged.priceKrw).toBe(200_000);
      expect(result.merged.name).toBe('내가 바꾼 이름');
    } else {
      throw new Error('자동 병합되어야 합니다');
    }
  });
});
