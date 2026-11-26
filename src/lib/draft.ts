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
 * 저장본의 `baseRevision` 은 불러온 뒤 제출에도 그대로 써야 한다. 새 기준으로 바꿔 제출하면
 * 서버의 3방향 병합·충돌 검사를 건너뛰고 남의 편집을 덮어쓰게 된다.
 */
export function readDraft(raw: string | null): Draft | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw ?? ''));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
