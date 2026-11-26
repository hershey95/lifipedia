/** 편집 폼 임시 저장(W49 W5) — 순수 함수. localStorage 접근은 폼이 한다. */
import { z } from 'zod';
import { TIERS } from '@/lib/tier';

const schema = z.object({
  baseRevision: z.number(),
  summary: z.string(),
  values: z.object({
    name: z.string(),
    tier: z.enum(TIERS),
    priceKrw: z.number().nullable(),
    description: z.string(),
    specSummary: z.string().nullable(),
    recommendReason: z.string().nullable(),
    imageUrl: z.string().nullable(),
    purchaseLinks: z.array(z.object({ label: z.string(), url: z.string() })),
  }),
});

type Draft = z.infer<typeof schema>;

export function draftKey(target: { mode: 'create'; themeSlug: string } | { mode: 'edit'; itemId: string }): string {
  return target.mode === 'create' ? `lifipedia:draft:new:${target.themeSlug}` : `lifipedia:draft:edit:${target.itemId}`;
}

/** 새 문서는 baseRevision 0. */
export function writeDraft(baseRevision: number, values: Draft['values'], summary: string): string {
  return JSON.stringify({ baseRevision, values, summary });
}

/**
 * 기준 리비전이 지금과 같을 때만 돌려준다. 옛 기준의 저장본을 새 기준으로 제출하면
 * 서버의 충돌 검사를 건너뛰고 남의 편집을 덮어쓰게 된다.
 */
// ponytail: 그 사이 문서가 바뀌면 저장본은 안내 없이 무시된다. 필요해지면 "옛 저장본 보기"를 더한다.
export function readDraft(raw: string | null, baseRevision: number): Pick<Draft, 'values' | 'summary'> | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw ?? ''));
    if (!parsed.success || parsed.data.baseRevision !== baseRevision) return null;
    return { values: parsed.data.values, summary: parsed.data.summary };
  } catch {
    return null;
  }
}
