import { describe, expect, it } from 'vitest';
import { notificationText, notificationsFor, NOTIFICATION_RULES } from '@/lib/notify';

describe('notificationsFor', () => {
  it('답글: 수신자는 부모 작성자 1명, 행위자 기록', () => {
    expect(notificationsFor({ kind: 'TALK_REPLY', actorId: 'a', recipientId: 'b', itemId: 'i', refId: 'c1' })).toEqual([
      { userId: 'b', kind: 'TALK_REPLY', actorId: 'a', itemId: 'i', refId: 'c1' },
    ]);
  });

  it('자기 댓글에 자기가 답글이면 0행, 탈퇴한 작성자(null)도 0행', () => {
    expect(notificationsFor({ kind: 'TALK_REPLY', actorId: 'a', recipientId: 'a', itemId: 'i', refId: 'c1' })).toEqual([]);
    expect(notificationsFor({ kind: 'TALK_REPLY', actorId: 'a', recipientId: null, itemId: 'i', refId: 'c1' })).toEqual([]);
  });

  it('되돌림: 편집자 중복·null·되돌린 본인을 뺀다', () => {
    const rows = notificationsFor({
      kind: 'EDIT_REVERTED', actorId: 'r', recipientIds: ['A', 'A', 'B', 'r', null], itemId: 'i', refId: 'h1',
    });
    expect(rows.map((x) => x.userId)).toEqual(['A', 'B']);
    expect(rows.every((x) => x.kind === 'EDIT_REVERTED' && x.refId === 'h1')).toBe(true);
  });

  it('개념글: 작성자 1행, actorId 없음', () => {
    expect(notificationsFor({ kind: 'CONCEPT_REACHED', recipientId: 'w', itemId: 'i', refId: 'c9' })).toEqual([
      { userId: 'w', kind: 'CONCEPT_REACHED', actorId: null, itemId: 'i', refId: 'c9' },
    ]);
    expect(notificationsFor({ kind: 'CONCEPT_REACHED', recipientId: null, itemId: 'i', refId: 'c9' })).toEqual([]);
  });
});

describe('notificationText', () => {
  it('되돌림 문구에는 행위자 이름이 없고 문서명이 들어간다', () => {
    expect(notificationText('EDIT_REVERTED', '에어프라이어')).toBe('에어프라이어에서 내 편집이 되돌려졌습니다');
    expect(notificationText('TALK_REPLY', 'X')).toContain('답글');
    expect(notificationText('CONCEPT_REACHED', 'X')).toContain('개념글');
  });

  it('보존·페이지 상수', () => {
    expect(NOTIFICATION_RULES).toEqual({ RETENTION_DAYS: 90, PAGE_SIZE: 50 });
  });
});
