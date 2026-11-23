import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { buildDiff, toSnapshot, type ItemSnapshot } from '@/lib/wiki';
import { parseRevRange } from '@/lib/revision';
import { CONTRIBUTION_RULES, REVERT_LOOKBACK_REVISIONS } from '@/lib/contribution-rules';
import { RevertButton } from '@/components/RevertButton';
import { canEditAt, protectionMessage, userLevel } from '@/lib/protection';
import { loadProtection } from '@/lib/protection-service';

type Params = {
  params: Promise<{ slug: string; itemSlug: string }>;
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
};

export const metadata: Metadata = { title: '편집 이력', robots: { index: false } };

export default async function HistoryPage({ params, searchParams }: Params) {
  const { slug, itemSlug } = await params;
  const sp = await searchParams;

  const item = await prisma.item.findFirst({
    where: { slug: decodeURIComponent(itemSlug), isRemoved: false, theme: { slug: decodeURIComponent(slug) } },
    select: {
      id: true, name: true, slug: true, revision: true, themeId: true, tier: true,
      theme: { select: { slug: true, name: true } },
      edits: {
        orderBy: { revision: 'desc' },
        select: {
          id: true, revision: true, summary: true, diff: true, createdAt: true,
          editor: { select: { id: true, name: true, badgeLevel: true } },
        },
      },
    },
  });
  if (!item) notFound();

  const me = await currentUser();
  const base = `/theme/${item.theme.slug}/item/${item.slug}`;

  // 비교: 두 리비전 스냅샷의 diff. 잘못된 값이면 비교 없이 목록만 보여 준다.
  const range = parseRevRange(sp.from, sp.to, item.revision);
  let compare: { from: number; to: number; diff: string } | null = null;
  if (range) {
    const snaps = await prisma.editHistory.findMany({
      where: { itemId: item.id, revision: { in: [range.from, range.to] } },
      select: { revision: true, snapshot: true },
    });
    const a = snaps.find((s) => s.revision === range.from);
    const b = snaps.find((s) => s.revision === range.to);
    if (a && b) {
      compare = {
        ...range,
        diff: buildDiff(
          toSnapshot(a.snapshot as unknown as ItemSnapshot),
          toSnapshot(b.snapshot as unknown as ItemSnapshot),
          range.from,
          range.to,
        ),
      };
    }
  }

  // 되돌리기 버튼 노출 판단(안내용). 실제 자격·보호 수준 검사는 서버 라우트가 한다.
  let revertNote: string | null = null;
  if (!me) revertNote = '되돌리기는 로그인 후 할 수 있습니다.';
  else if (isSuspended(me)) revertNote = '제재 중인 계정은 되돌릴 수 없습니다.';
  else if (me.contributionCount < CONTRIBUTION_RULES.MIN_CONTRIBUTIONS_TO_REVERT) {
    revertNote = `되돌리기는 기여 ${CONTRIBUTION_RULES.MIN_CONTRIBUTIONS_TO_REVERT}건 이상부터 할 수 있습니다.`;
  } else {
    // 보호 수준은 화면 표시용 사전 판단일 뿐이다. 최종 판정은 revert 라우트(서버)가 한다.
    const p = await loadProtection(item);
    if (!canEditAt(p.level, userLevel(me))) revertNote = protectionMessage(p.level);
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-ink/50">
        <Link href={`/theme/${item.theme.slug}`}>{item.theme.name}</Link> /{' '}
        <Link href={base}>{item.name}</Link> / 편집 이력
      </nav>

      <header>
        <h1 className="text-2xl font-extrabold">{item.name} — 편집 이력</h1>
        <p className="mt-1 text-sm text-ink/60">
          누가 무엇을 바꿨는지 전부 공개됩니다. 현재 리비전 {item.revision}.
        </p>
        {revertNote ? <p className="mt-1 text-xs text-ink/50">{revertNote}</p> : null}
      </header>

      {compare ? (
        <section aria-label="리비전 비교" className="card">
          <h2 className="font-semibold">r{compare.from} ↔ r{compare.to} 비교</h2>
          <pre className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-black/[0.04] p-3 text-xs leading-5">
            {compare.diff}
          </pre>
          <p className="mt-2 text-xs">
            <Link href={`${base}/history`}>비교 닫기</Link>
          </p>
        </section>
      ) : sp.from || sp.to ? (
        <p role="status" className="text-sm text-warn-fg">
          비교할 두 리비전을 서로 다르게, 1~{item.revision} 사이에서 골라 주세요.
        </p>
      ) : null}

      <form method="get" className="flex min-w-0 flex-col gap-4">
        <div>
          <button type="submit" className="btn-primary">선택한 두 리비전 비교</button>
          <span className="ml-2 text-xs text-ink/50">왼쪽(from)과 오른쪽(to)에서 하나씩 고릅니다.</span>
        </div>
        <ol className="flex flex-col gap-4">
          {item.edits.map((edit) => {
            const canRevert =
              !revertNote &&
              edit.revision < item.revision &&
              item.revision - edit.revision <= REVERT_LOOKBACK_REVISIONS;
            return (
              <li key={edit.id} className="card min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">
                    r{edit.revision}
                    {edit.summary ? <span className="ml-2 font-normal text-ink/70">{edit.summary}</span> : null}
                  </h2>
                  <p className="text-xs text-ink/50">
                    {edit.editor ? (
                      <Link href={`/u/${edit.editor.id}`}>{edit.editor.name ?? '이름 없음'}</Link>
                    ) : (
                      '탈퇴한 사용자'
                    )}{' '}
                    · {edit.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="from" value={edit.revision} defaultChecked={compare?.from === edit.revision} />
                    from
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="radio" name="to" value={edit.revision} defaultChecked={compare?.to === edit.revision} />
                    to
                  </label>
                  <Link href={edit.revision === item.revision ? base : `${base}?rev=${edit.revision}`}>
                    이 리비전 보기
                  </Link>
                  {canRevert ? (
                    <RevertButton itemId={item.id} toRevision={edit.revision} baseRevision={item.revision} />
                  ) : null}
                </div>
                <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-black/[0.04] p-3 text-xs leading-5">
                  {edit.diff}
                </pre>
              </li>
            );
          })}
        </ol>
      </form>
    </div>
  );
}
