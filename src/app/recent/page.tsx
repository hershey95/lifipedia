import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import {
  changeKind, decodeCursor, encodeCursor, parseRecentParams, recentHref, recentWhere, type ChangeKind,
} from '@/lib/recent';
import { changeTags } from '@/lib/edit-filter';
import type { ItemSnapshot } from '@/lib/wiki';

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

export default async function RecentPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; scope?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const cur = decodeCursor(sp.cursor);
  const filter = parseRecentParams(sp);
  const { following, createdOnly } = filter;
  const me = following ? await currentUser() : null;
  if (following && !me) redirect(`/signin?callbackUrl=${encodeURIComponent(recentHref(filter))}`);
  const followCount = me ? await prisma.themeFollow.count({ where: { userId: me.id } }) : 0;

  const rows = await prisma.editHistory.findMany({
    where: recentWhere(cur, me?.id ?? null, createdOnly),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PAGE + 1,
    select: {
      id: true, itemId: true, revision: true, revertOfRevision: true, summary: true, createdAt: true, snapshot: true,
      editor: { select: { id: true, name: true } },
      item: { select: { name: true, slug: true, theme: { select: { slug: true } } } },
    },
  });
  const page = rows.slice(0, PAGE);
  const next = rows.length > PAGE ? encodeCursor(page[PAGE - 1].createdAt, page[PAGE - 1].id) : null;

  // 변경 태그는 저장하지 않고 직전 리비전과 비교해 계산한다.
  const wanted = page.filter((r) => r.revision > 1).map((r) => ({ itemId: r.itemId, revision: r.revision - 1 }));
  const prevRows = wanted.length
    ? await prisma.editHistory.findMany({ where: { OR: wanted }, select: { itemId: true, revision: true, snapshot: true } })
    : [];
  const prevSnapshot = new Map(prevRows.map((p) => [`${p.itemId}:${p.revision}`, p.snapshot]));

  // 기여 원장에서 '적립 여부' 를 붙인다 — 사소한 편집이 미적립으로 공개적으로 보이게.
  const events = await prisma.contributionEvent.findMany({
    where: { editId: { in: page.map((r) => r.id) } },
    select: { editId: true, credited: true, voidedAt: true },
  });
  const byEdit = new Map(events.map((e) => [e.editId, e]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-100">최근 변경</h1>
      <nav aria-label="범위" className="flex flex-wrap gap-3 text-sm">
        <Link
          href={recentHref({ following: false, createdOnly })}
          aria-current={following ? undefined : 'page'}
          className={following ? '' : 'font-bold'}
        >
          전체
        </Link>
        <Link
          href={recentHref({ following: true, createdOnly })}
          aria-current={following ? 'page' : undefined}
          className={following ? 'font-bold' : ''}
        >
          팔로우한 갤러리
        </Link>
        {/* 범위와 별개로 켜고 끄는 거름 */}
        <Link href={recentHref({ following, createdOnly: !createdOnly })} className={`ml-auto ${createdOnly ? 'font-bold' : ''}`}>
          {createdOnly ? '새 문서만 보는 중 · 해제' : '새 문서만'}
        </Link>
      </nav>
      {page.length === 0 ? (
        <p className="text-sm text-slate-400">
          {createdOnly && !(following && followCount === 0) ? (
            '조건에 맞는 새 문서가 없습니다.'
          ) : !following ? (
            <>
              아직 변경 내역이 없습니다. <Link href="/">테마 둘러보기</Link>
            </>
          ) : followCount === 0 ? (
            <>
              팔로우한 갤러리가 없습니다. <Link href="/themes">갤러리 둘러보기</Link>
            </>
          ) : (
            '팔로우한 갤러리에 다른 사람의 변경이 아직 없습니다.'
          )}
        </p>
      ) : (
        <ul aria-label="최근 변경 목록" className="flex flex-col divide-y divide-white/10 rounded-xl border border-white/10">
          {page.map((r) => {
            const kind = changeKind(r.revision, r.revertOfRevision);
            const ev = byEdit.get(r.id);
            const prev = prevSnapshot.get(`${r.itemId}:${r.revision - 1}`);
            // '새 문서'·'되돌림'은 위의 종류 라벨이 이미 보여 준다.
            const tags = prev
              ? changeTags(prev as unknown as ItemSnapshot, r.snapshot as unknown as ItemSnapshot, null)
              : [];
            return (
              <li key={r.id} className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 break-words px-4 py-3 text-sm">
                <time className="w-28 shrink-0 text-xs text-slate-400" dateTime={r.createdAt.toISOString()}>
                  {fmt(r.createdAt)}
                </time>
                <span className={`rounded px-1.5 py-0.5 text-xs ${KIND_STYLE[kind]}`}>{KIND_LABEL[kind]}</span>
                {tags.map((tag) => (
                  <span key={tag} className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">{tag}</span>
                ))}
                <Link href={`/theme/${r.item.theme.slug}/item/${r.item.slug}`} className="font-semibold">
                  {r.item.name}
                </Link>
                <Link
                  href={`/theme/${r.item.theme.slug}/item/${r.item.slug}/history`}
                  className="text-xs text-slate-400"
                  aria-label={`리비전 ${r.revision} 이력`}
                >
                  r{r.revision}
                </Link>
                {r.editor ? (
                  <Link href={`/u/${r.editor.id}`} className="text-slate-300">
                    {r.editor.name ?? '익명'}
                  </Link>
                ) : (
                  <span className="text-slate-400">탈퇴한 사용자</span>
                )}
                {r.summary ? <span className="text-slate-400 [overflow-wrap:anywhere]">— {r.summary}</span> : null}
                {ev && (!ev.credited || ev.voidedAt) ? (
                  <span className="text-xs text-slate-400">{ev.voidedAt ? '기여 무효' : '기여 미적립'}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {next ? (
        <Link href={recentHref(filter, next)}className="btn-ghost no-underline self-start">
          더 보기
        </Link>
      ) : null}
    </div>
  );
}
