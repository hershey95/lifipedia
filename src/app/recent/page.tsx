import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { changeKind, decodeCursor, encodeCursor, type ChangeKind } from '@/lib/recent';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '최근 변경', description: '위키 문서의 최근 편집·되돌리기 내역' };

const PAGE = 50;
const KIND_LABEL: Record<ChangeKind, string> = { create: '새 문서', edit: '편집', revert: '되돌림' };
const KIND_STYLE: Record<ChangeKind, string> = {
  create: 'bg-emerald-500/15 text-emerald-300',
  edit: 'bg-white/10 text-slate-300',
  revert: 'bg-amber-500/15 text-amber-300',
};
const fmt = (d: Date) => d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' });

export default async function RecentPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const cur = decodeCursor((await searchParams).cursor);

  const rows = await prisma.editHistory.findMany({
    where: {
      item: { isRemoved: false },
      ...(cur
        ? { OR: [{ createdAt: { lt: cur.createdAt } }, { createdAt: cur.createdAt, id: { lt: cur.id } }] }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE + 1,
    select: {
      id: true, revision: true, revertOfRevision: true, summary: true, createdAt: true,
      editor: { select: { id: true, name: true } },
      item: { select: { name: true, slug: true, theme: { select: { slug: true } } } },
    },
  });
  const page = rows.slice(0, PAGE);
  const next = rows.length > PAGE ? encodeCursor(page[PAGE - 1].createdAt, page[PAGE - 1].id) : null;

  // 기여 원장에서 '적립 여부' 를 붙인다 — 사소한 편집이 미적립으로 공개적으로 보이게.
  const events = await prisma.contributionEvent.findMany({
    where: { editId: { in: page.map((r) => r.id) } },
    select: { editId: true, credited: true, voidedAt: true },
  });
  const byEdit = new Map(events.map((e) => [e.editId, e]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-100">최근 변경</h1>
      {page.length === 0 ? (
        <p className="text-sm text-slate-400">아직 변경 내역이 없습니다.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
          {page.map((r) => {
            const kind = changeKind(r.revision, r.revertOfRevision);
            const ev = byEdit.get(r.id);
            return (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <time className="w-28 shrink-0 text-xs text-slate-400" dateTime={r.createdAt.toISOString()}>
                  {fmt(r.createdAt)}
                </time>
                <span className={`rounded px-1.5 py-0.5 text-xs ${KIND_STYLE[kind]}`}>{KIND_LABEL[kind]}</span>
                <Link href={`/theme/${r.item.theme.slug}/item/${r.item.slug}`} className="font-semibold">
                  {r.item.name}
                </Link>
                <Link
                  href={`/theme/${r.item.theme.slug}/item/${r.item.slug}/history`}
                  className="text-xs text-slate-400"
                >
                  r{r.revision}
                </Link>
                {r.editor ? (
                  <Link href={`/u/${r.editor.id}`} className="text-slate-300">
                    {r.editor.name ?? '익명'}
                  </Link>
                ) : (
                  <span className="text-slate-500">탈퇴한 사용자</span>
                )}
                {r.summary ? <span className="text-slate-400">— {r.summary}</span> : null}
                {ev && (!ev.credited || ev.voidedAt) ? (
                  <span className="text-xs text-slate-500">{ev.voidedAt ? '기여 무효' : '기여 미적립'}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {next ? (
        <Link href={`/recent?cursor=${next}`} className="btn-ghost no-underline self-start">
          더 보기
        </Link>
      ) : null}
    </div>
  );
}
