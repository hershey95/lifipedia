import Link from 'next/link';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { loadUpkeep } from '@/lib/upkeep-service';
import { STUB_MIN_BODY } from '@/lib/upkeep';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '기여할 거리',
  description: '토막 문서, 만들어 주세요, 리비전이 1개뿐인 문서 — 규칙으로 계산한 기여 안내',
};

const SLUG = /^[a-z0-9가-힣-]{1,80}$/i;

const cached = (category: string | null) =>
  unstable_cache(() => loadUpkeep(category), ['upkeep', category ?? 'all'], { revalidate: 300 })();

export default async function ContributePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: raw } = await searchParams;
  const category = raw && SLUG.test(raw) ? raw : null;
  const { stubs, wanted, singleRevision } = await cached(category);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">기여할 거리</h1>
        <p className="mt-1 text-sm text-fg-muted">
          운영자가 고른 목록이 아니라 규칙으로 계산한 목록입니다(5분마다 갱신). 이 목록과 토막 여부는 점수·인기에
          반영되지 않습니다. 기여 인정 규칙은 <Link href="/how-ranking-works">산정 방식</Link>을 보세요.
        </p>
        {category ? (
          <p className="mt-1 text-sm">
            분류 갤러리 <b>{category}</b> 만 보는 중 · <Link href="/contribute">전체 보기</Link>
          </p>
        ) : null}
      </header>

      <List title="토막 문서" hint={`본문 ${STUB_MIN_BODY}자 미만 · 출처 절 없음 · 가격 없음 · 이미지 없음 중 하나라도 해당`} empty="토막 문서가 없습니다.">
        {stubs.map((d) => (
          <li key={d.href} className="flex min-w-0 flex-wrap items-baseline gap-x-3 break-words">
            <Link href={d.href} className="font-semibold">{d.name}</Link>
            <span className="text-xs text-fg-muted">{d.gallery}</span>
            <span className="text-xs text-warn-fg">{d.reasons.join(' · ')}</span>
            <Link href={`${d.href}/edit`} className="text-xs">편집하기</Link>
          </li>
        ))}
      </List>

      <List
        title="만들어 주세요"
        hint="다른 문서가 [[제목]] 으로 걸었지만 아직 없는 문서(건 문서 수 순)"
        empty="없는 문서를 가리키는 링크가 없습니다."
      >
        {wanted.map((w) => (
          <li key={w.title} className="flex min-w-0 flex-wrap items-baseline gap-x-3 break-words">
            <Link href={`/search?q=${encodeURIComponent(w.title)}&missing=1`} className="font-semibold">{w.title}</Link>
            <span className="text-xs text-fg-muted">{w.count}개 문서가 링크</span>
          </li>
        ))}
      </List>

      <List title="리비전 1개뿐인 문서" hint="만든 뒤 아무도 고치지 않은 문서 — 검토가 필요합니다" empty="해당 문서가 없습니다.">
        {singleRevision.map((d) => (
          <li key={d.href} className="flex min-w-0 flex-wrap items-baseline gap-x-3 break-words">
            <Link href={d.href} className="font-semibold">{d.name}</Link>
            <span className="text-xs text-fg-muted">{d.gallery}</span>
          </li>
        ))}
      </List>

      <p className="text-xs text-fg-muted">
        90일 넘게 편집이 없는 문서·답변 없는 추천 요청·나가는 링크 없는 문서 목록은 다음 주에 추가합니다.
      </p>
    </div>
  );
}

function List({ title, hint, empty, children }: { title: string; hint: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <section aria-label={title}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mb-2 text-xs text-fg-muted">{hint}</p>
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 text-sm">{items}</ul>
      )}
    </section>
  );
}
