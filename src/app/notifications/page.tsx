import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { NOTIFICATION_RULES, notificationText } from '@/lib/notify';
import { MarkAllReadButton } from '@/components/MarkAllReadButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '알림', robots: { index: false } };

const fmt = (d: Date) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });

export default async function NotificationsPage() {
  const me = await currentUser();
  if (!me) redirect(`/signin?callbackUrl=${encodeURIComponent('/notifications')}`);

  const rows = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: NOTIFICATION_RULES.PAGE_SIZE,
  });
  const itemIds = [...new Set(rows.map((r) => r.itemId).filter((x): x is string => !!x))];
  const items = itemIds.length
    ? await prisma.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true, slug: true, theme: { select: { slug: true } } },
      })
    : [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-100">알림</h1>
        {unread > 0 ? <MarkAllReadButton /> : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted">알림이 없습니다.</p>
      ) : (
        <ul aria-label="알림 목록" className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
          {rows.map((r) => {
            const item = r.itemId ? byId.get(r.itemId) : undefined;
            const base = item ? `/theme/${item.theme.slug}/item/${item.slug}` : null;
            const href = base ? (r.kind === 'EDIT_REVERTED' ? `${base}/history` : `${base}/talk#c-${r.refId}`) : null;
            const text = notificationText(r.kind, item?.name ?? '삭제된 문서');
            return (
              <li key={r.id} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 break-words px-4 py-3 text-sm">
                {r.readAt ? null : (
                  <span aria-label="안 읽음" role="img" className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
                {href ? <Link href={href} className={r.readAt ? '' : 'font-semibold'}>{text}</Link> : <span>{text}</span>}
                <time className="text-xs text-fg-muted" dateTime={r.createdAt.toISOString()}>{fmt(r.createdAt)}</time>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-fg-muted">읽은 알림은 90일 뒤 지워집니다. 최근 {NOTIFICATION_RULES.PAGE_SIZE}개만 보여 줍니다.</p>
    </div>
  );
}
