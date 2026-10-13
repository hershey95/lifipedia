import { describe, expect, it } from 'vitest';
import { mergeActivity, profileBody, safeCallbackUrl, type ActivityEntry } from '@/lib/me';

describe('profileBody', () => {
  it('이름 30자는 통과, 31자는 실패', () => {
    expect(profileBody.safeParse({ name: '가'.repeat(30) }).success).toBe(true);
    expect(profileBody.safeParse({ name: '가'.repeat(31) }).success).toBe(false);
  });
  it('공백뿐인 이름은 실패, 앞뒤 공백은 trim', () => {
    expect(profileBody.safeParse({ name: '  ' }).success).toBe(false);
    expect(profileBody.parse({ name: '  철수 ' }).name).toBe('철수');
  });
  it('제어 문자가 든 이름은 실패', () => {
    expect(profileBody.safeParse({ name: 'a\nb' }).success).toBe(false);
  });
  it('보이지 않는 문자·방향 제어 문자만/섞인 이름은 실패', () => {
    expect(profileBody.safeParse({ name: '\u200B\u200B' }).success).toBe(false);
    expect(profileBody.safeParse({ name: '관리자\u202E' }).success).toBe(false);
    expect(profileBody.safeParse({ name: '\u2028' }).success).toBe(false);
  });
  it('ZWJ 이모지 조합 이름은 허용', () => {
    expect(profileBody.safeParse({ name: '👨‍👩‍👧 가족' }).success).toBe(true);
  });
  it('소개: 줄바꿈·탭 허용, NUL·방향 제어 문자 거부', () => {
    expect(profileBody.safeParse({ bio: '첫 줄\n둘째\t줄' }).success).toBe(true);
    expect(profileBody.safeParse({ bio: 'a\u0000b' }).success).toBe(false);
    expect(profileBody.safeParse({ bio: 'x\u202Ey' }).success).toBe(false);
  });
  it('소개 200자 통과, 201자 실패, 빈 소개는 통과', () => {
    expect(profileBody.safeParse({ bio: 'a'.repeat(200) }).success).toBe(true);
    expect(profileBody.safeParse({ bio: 'a'.repeat(201) }).success).toBe(false);
    expect(profileBody.safeParse({ bio: '' }).success).toBe(true);
  });
  it('빈 객체와 모르는 키(대량 할당)는 실패', () => {
    expect(profileBody.safeParse({}).success).toBe(false);
    expect(profileBody.safeParse({ name: 'a', trustScore: 3 }).success).toBe(false);
    expect(profileBody.safeParse({ contributionCount: 999, bio: 'x' }).success).toBe(false);
  });
  it('JSON 이 아니면(null) 실패', () => {
    expect(profileBody.safeParse(null).success).toBe(false);
  });
});

const e = (id: string, iso: string, kind: 'create' | 'edit' = 'create'): ActivityEntry => ({
  kind,
  id,
  at: new Date(iso),
  itemName: id,
  href: `/theme/t/item/${id}`,
});

describe('mergeActivity', () => {
  it('시간 역순으로 병합한다', () => {
    const out = mergeActivity([e('a', '2026-10-01T00:00:00Z')], [e('b', '2026-10-02T00:00:00Z', 'edit')]);
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('limit 만큼 자른다', () => {
    const many = Array.from({ length: 5 }, (_, i) => e(`i${i}`, `2026-10-0${i + 1}T00:00:00Z`));
    expect(mergeActivity(many, [], 3)).toHaveLength(3);
  });
  it('시각이 같으면 id 내림차순', () => {
    const out = mergeActivity([e('a', '2026-10-01T00:00:00Z')], [e('b', '2026-10-01T00:00:00Z', 'edit')]);
    expect(out.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('한쪽이 비어 있어도 동작한다', () => {
    expect(mergeActivity([], [])).toEqual([]);
    expect(mergeActivity([e('a', '2026-10-01T00:00:00Z')], [])).toHaveLength(1);
  });
});

describe('profileBody 오류 메시지', () => {
  it('한글 메시지를 낸다', () => {
    const r = profileBody.safeParse({ name: '   ' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('이름은 1자 이상');
    expect(JSON.stringify(profileBody.safeParse({ name: '가'.repeat(31) }).error?.issues)).toContain('30자까지');
  });
});

describe('safeCallbackUrl', () => {
  it('내부 경로만 허용한다', () => {
    expect(safeCallbackUrl('/me')).toBe('/me');
    expect(safeCallbackUrl('/theme/a?x=1')).toBe('/theme/a?x=1');
  });
  it('외부 주소·프로토콜 상대·역슬래시·빈 값은 / 로', () => {
    for (const bad of [undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'me']) {
      expect(safeCallbackUrl(bad)).toBe('/');
    }
  });
});
