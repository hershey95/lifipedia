/**
 * 알림 3종(W45 5절). 수신자가 정해진 이벤트만 저장하고, 수신자 = 행위자 / 탈퇴(null) / 중복은 뺀다.
 * 문구에는 행위자 이름을 넣지 않는다(편집 분쟁 방지). 저장은 각 라우트의 트랜잭션 안에서 createMany 한 번.
 */
export const NOTIFICATION_RULES = { RETENTION_DAYS: 90, PAGE_SIZE: 50 } as const;

export type NotificationKind = 'TALK_REPLY' | 'EDIT_REVERTED' | 'CONCEPT_REACHED';

export type NotifyEvent =
  | { kind: 'TALK_REPLY'; actorId: string; recipientId: string | null; itemId: string; refId: string }
  | { kind: 'EDIT_REVERTED'; actorId: string; recipientIds: (string | null)[]; itemId: string; refId: string }
  | { kind: 'CONCEPT_REACHED'; recipientId: string | null; itemId: string; refId: string };

export type NotificationRow = {
  userId: string;
  kind: NotificationKind;
  actorId: string | null;
  itemId: string;
  refId: string;
};

export function notificationsFor(e: NotifyEvent): NotificationRow[] {
  const actorId = e.kind === 'CONCEPT_REACHED' ? null : e.actorId;
  const candidates = e.kind === 'EDIT_REVERTED' ? e.recipientIds : [e.recipientId];
  const recipients = [...new Set(candidates.filter((u): u is string => !!u && u !== actorId))];
  return recipients.map((userId) => ({ userId, kind: e.kind, actorId, itemId: e.itemId, refId: e.refId }));
}

export function notificationText(kind: NotificationKind, itemName: string): string {
  switch (kind) {
    case 'TALK_REPLY':
      return `${itemName} 토론에서 내 댓글에 답글이 달렸습니다`;
    case 'EDIT_REVERTED':
      return `${itemName}에서 내 편집이 되돌려졌습니다`;
    case 'CONCEPT_REACHED':
      return `${itemName} 토론의 내 댓글이 개념글이 되었습니다`;
  }
}
