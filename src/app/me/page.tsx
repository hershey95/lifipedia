import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser, isSuspended } from '@/lib/auth';
import { BADGE_THRESHOLDS, badgeProgress, voteWeightBreakdown } from '@/lib/trust';
import { RANKING_CONSTANTS } from '@/lib/ranking';
import { mergeActivity, type ActivityEntry } from '@/lib/me';
import { ProfileForm } from '@/components/ProfileForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '마이페이지', robots: { index: false } };

const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
const STATUS_LABEL = { PROPOSED: '제안됨', ACTIVE: '정식', DORMANT: '휴면' } as const;
const itemLink = { select: { name: true, slug: true, theme: { select: { slug: true } } } } as const;

export default async function MePage() {
  const acting = await currentUser();
  if (!acting) redirect('/signin?callbackUrl=/me');
  const id = acting.id;

  const [me, created, edits, votes, follows] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        name: true, bio: true, createdAt: true, trustScore: true, contributionCount: true,
        badgeLevel: true, suspendedUntil: true, suspensionReason: true,
      }, // email 은 select 하지 않는다
    }),
    prisma.item.findMany({
      where: { createdById: id, isRemoved: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
      select: { id: true, name: true, slug: true, createdAt: true, theme: { select: { slug: true } } },
    }),
    prisma.editHistory.findMany({
      where: { editorId: id, revision: { gt: 1 }, item: { isRemoved: false } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
      select: { id: true, revision: true, summary: true, createdAt: true, item: itemLink },
    }),
    prisma.vote.findMany({
      where: { userId: id, item: { isRemoved: false } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
      select: { id: true, type: true, weight: true, createdAt: true, item: itemLink },
    }),
    prisma.themeFollow.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { theme: { select: { slug: true, name: true, status: true } } },
    }),
  ]);
  if (!me) redirect('/signin?callbackUrl=/me');

  const now = new Date();
  const suspended = isSuspended(acting, now);
  const progress = badgeProgress(me.contributionCount);
  const nextMin = BADGE_THRESHOLDS.find((b) => b.level === progress.next)?.minContributions;
  const weight = voteWeightBreakdown({ trustScore: me.trustScore, accountCreatedAt: me.createdAt, now });

  const activity = mergeActivity(
    created.map((c): ActivityEntry => ({
      kind: 'create', id: c.id, at: c.createdAt, itemName: c.name, href: `/theme/${c.theme.slug}/item/${c.slug}`,
    })),
    edits.map((h): ActivityEntry => ({
      kind: 'edit', id: h.id, at: h.createdAt, itemName: h.item.name, revision: h.revision, summary: h.summary,
      href: `/theme/${h.item.theme.slug}/item/${h.item.slug}`,
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      {suspended && me.suspendedUntil ? (
        <section
          role="status"
          className="card border-red-500/60 bg-red-500/10 text-sm text-red-200 hover:border-red-500/60 hover:bg-red-500/10"
        >
          <strong>제재 중</strong> · 계정이 {fmt(me.suspendedUntil)}까지 제재 중입니다. 사유: {me.suspensionReason ?? '기재되지 않음'}
        </section>
      ) : null}

      <header className="card">
        <h1 className="text-2xl font-extrabold">{me.name ?? '이름 없는 사용자'}</h1>
        <p className="mt-1 text-sm text-slate-400">
          가입 {fmt(me.createdAt)} · <Link href={`/u/${id}`}>공개 프로필 보기</Link>
        </p>
      </header>

      <section className="card" aria-labelledby="karma-h">
        <h2 id="karma-h" className="text-lg font-bold">
          Karma
        </h2>
        <p className="mt-2 text-sm">
          뱃지 <span className="chip bg-accent/10 text-accent-fg">{progress.current}</span> · 기여{' '}
          {me.contributionCount.toLocaleString('ko-KR')}건 · 신뢰도 {me.trustScore.toFixed(2)}
        </p>
        {progress.next ? (
          <div className="mt-3">
            <p className="text-sm">
              다음 뱃지({progress.next}, {nextMin}건)까지 <strong>{progress.remaining}건</strong>
            </p>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-label={`다음 뱃지까지 ${progress.percent}%`}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
            >
              <div className="h-full bg-accent" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm">최고 등급입니다.</p>
        )}
        <p className="mt-3 text-sm">
          {weight.penaltyEndsAt ? (
            <>
              내 한 표 = 신뢰도 {me.trustScore.toFixed(2)} × {weight.multiplier} (신규 계정) ={' '}
              <strong>{weight.weight.toFixed(2)}</strong> · {fmt(weight.penaltyEndsAt)}에 해제 ({weight.daysLeft}일 남음)
            </>
          ) : (
            <>
              내 한 표 = <strong>{weight.weight.toFixed(2)}</strong> (상한 {RANKING_CONSTANTS.MAX_VOTE_WEIGHT.toFixed(2)})
            </>
          )}{' '}
          <Link href="/how-ranking-works">산정 방식</Link>
        </p>
        <p className="mt-2 text-xs text-slate-400">기여는 문서 작성·편집으로만 쌓입니다. 투표·댓글은 기여가 아닙니다.</p>
      </section>

      <section aria-labelledby="profile-h">
        <h2 id="profile-h" className="mb-2 text-lg font-bold">
          프로필 수정
        </h2>
        <ProfileForm initialName={me.name ?? ''} initialBio={me.bio ?? ''} disabled={suspended} />
      </section>

      <section aria-labelledby="activity-h">
        <h2 id="activity-h" className="mb-2 text-lg font-bold">
          내 활동
        </h2>
        {activity.length === 0 ? (
          <p className="card text-sm text-slate-400">
            아직 기여가 없습니다. 문서를 쓰거나 고치면 기여 1건이 됩니다. <Link href="/themes">갤러리 둘러보기</Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((a) => (
              <li key={`${a.kind}-${a.id}`} className="card text-sm">
                <Link href={a.href} className="font-semibold no-underline">
                  {a.kind === 'create' ? '문서 작성' : `편집 r${a.revision}`} · {a.itemName}
                </Link>
                <span className="ml-2 text-xs text-slate-400">{fmt(a.at)}</span>
                {a.summary ? <p className="mt-1 text-xs text-slate-400">{a.summary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="votes-h">
        <h2 id="votes-h" className="mb-2 text-lg font-bold">
          내 투표 <span className="text-xs font-normal text-slate-400">(본인만 볼 수 있습니다)</span>
        </h2>
        {votes.length === 0 ? (
          <p className="card text-sm text-slate-400">아직 투표하지 않았습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {votes.map((v) => (
              <li key={v.id} className="card text-sm">
                <Link href={`/theme/${v.item.theme.slug}/item/${v.item.slug}`} className="font-semibold no-underline">
                  {v.item.name}
                </Link>{' '}
                · {v.type === 'UP' ? '추천' : '비추천'} · 가중치 {v.weight.toFixed(2)}
                <span className="ml-2 text-xs text-slate-400">{fmt(v.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="follow-h">
        <h2 id="follow-h" className="mb-2 text-lg font-bold">
          팔로우한 테마
        </h2>
        {follows.length === 0 ? (
          <p className="card text-sm text-slate-400">
            팔로우한 테마가 없습니다. <Link href="/themes">갤러리 둘러보기</Link>
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {follows.map(({ theme }) => (
              <li key={theme.slug} className="card text-sm">
                <Link href={`/theme/${theme.slug}`} className="font-semibold no-underline">
                  {theme.name}
                </Link>{' '}
                <span className="chip bg-white/10 text-slate-300">{STATUS_LABEL[theme.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
