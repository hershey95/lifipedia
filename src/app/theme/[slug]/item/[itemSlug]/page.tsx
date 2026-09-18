import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { computeScore, type ScoredVote } from '@/lib/ranking';
import { TIER_SLUGS, TIER_LABELS } from '@/lib/tier';
import { TierBadge } from '@/components/TierBadge';
import { VoteButtons } from '@/components/VoteButtons';
import { AdSlot } from '@/components/AdSlot';
import { ReportButton } from '@/components/ReportButton';

type Params = { params: Promise<{ slug: string; itemSlug: string }> };

async function loadItem(themeSlug: string, itemSlug: string) {
  return prisma.item.findFirst({
    where: {
      slug: decodeURIComponent(itemSlug),
      theme: { slug: decodeURIComponent(themeSlug) },
      isRemoved: false,
    },
    include: {
      theme: { select: { slug: true, name: true, status: true } },
      createdBy: { select: { id: true, name: true, badgeLevel: true } },
      votes: { select: { type: true, weight: true, createdAt: true, userId: true } },
      _count: { select: { edits: true, comments: true } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, itemSlug } = await params;
  const item = await loadItem(slug, itemSlug);
  if (!item) return { title: '문서를 찾을 수 없음' };

  return {
    title: `${item.name} — ${item.theme.name}`,
    description: item.description.slice(0, 160),
    alternates: { canonical: `/theme/${item.theme.slug}/item/${item.slug}` },
    openGraph: { images: item.imageUrl ? [item.imageUrl] : [] },
  };
}

export default async function ItemPage({ params }: Params) {
  const { slug, itemSlug } = await params;
  const item = await loadItem(slug, itemSlug);
  if (!item) notFound();

  const me = await currentUser();
  const myVote = me ? item.votes.find((vote) => vote.userId === me.id) : undefined;
  const breakdown = computeScore(item.votes as ScoredVote[]);
  const links = (item.purchaseLinks as { label: string; url: string }[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-ink/50">
        <Link href="/themes">테마</Link> / <Link href={`/theme/${item.theme.slug}`}>{item.theme.name}</Link> /{' '}
        <Link href={`/theme/${item.theme.slug}/${TIER_SLUGS[item.tier]}`}>{TIER_LABELS[item.tier]}</Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold">{item.name}</h1>
            <TierBadge tier={item.tier} />
          </div>
          <p className="mt-2 text-sm text-ink/55">
            {item.priceKrw ? `${item.priceKrw.toLocaleString('ko-KR')}원 · ` : ''}
            리비전 {item.revision} · 작성 {item.createdBy?.name ?? '탈퇴한 사용자'} ·{' '}
            <Link href={`/theme/${item.theme.slug}/item/${item.slug}/history`}>
              편집 이력 {item._count.edits}
            </Link>{' '}
            ·{' '}
            <Link href={`/theme/${item.theme.slug}/item/${item.slug}/talk`}>
              토론 {item._count.comments}
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <VoteButtons
            itemId={item.id}
            initialUp={item.upCount}
            initialDown={item.downCount}
            initialMyVote={myVote?.type ?? null}
            disabled={item.theme.status !== 'ACTIVE'}
          />
          <div className="flex gap-2">
            <Link
              href={`/theme/${item.theme.slug}/item/${item.slug}/edit`}
              className="btn-ghost no-underline"
            >
              편집
            </Link>
            <ReportButton targetType="ITEM" targetId={item.id} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <article className="flex flex-col gap-6">
          {item.imageUrl ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black/5">
              <Image src={item.imageUrl} alt={item.name} fill className="object-contain" unoptimized />
            </div>
          ) : null}

          <Section title="설명">
            <p className="prose-wiki">{item.description}</p>
          </Section>

          {item.recommendReason ? (
            <Section title="추천 이유">
              <p className="prose-wiki">{item.recommendReason}</p>
            </Section>
          ) : null}

          {item.specSummary ? (
            <Section title="스펙 요약">
              <p className="prose-wiki">{item.specSummary}</p>
            </Section>
          ) : null}

          {links.length > 0 ? (
            <Section title="구매 링크">
              <ul className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="btn-ghost no-underline"
                    >
                      {link.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink/45">
                구매는 외부 사이트에서 이루어집니다. Lifipedia 는 결제를 취급하지 않습니다.
              </p>
            </Section>
          ) : null}

          <AdSlot slot="item-bottom" />
        </article>

        <aside className="flex flex-col gap-4">
          <div className="card">
            <h2 className="text-sm font-bold">이 문서의 점수</h2>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{breakdown.score.toFixed(1)}</p>
            <dl className="mt-3 flex flex-col gap-1 text-xs text-ink/60">
              <Row label="참여자" value={`${breakdown.distinctVoters}명`} />
              <Row label="유효 찬성" value={breakdown.effectiveUp.toFixed(2)} />
              <Row label="유효 비추천" value={breakdown.effectiveDown.toFixed(2)} />
              <Row label="찬성 비율" value={`${(breakdown.upRatio * 100).toFixed(0)}%`} />
              <Row label="Wilson 하한" value={breakdown.wilsonLowerBound.toFixed(3)} />
              <Row label="참여 보정" value={breakdown.participationFactor.toFixed(3)} />
            </dl>
            <p className="mt-3 text-xs text-ink/45">
              모든 항목은 공개된 동일한 식으로 계산됩니다.{' '}
              <Link href="/how-ranking-works">산정 방식</Link>
            </p>
          </div>

          <AdSlot slot="item-side" className="min-h-[250px]" />
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 border-b border-black/10 pb-1 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
