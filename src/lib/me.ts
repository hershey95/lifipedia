import { z } from 'zod';

/** PATCH /api/me 본문. strictObject: 모르는 키(trustScore 등)를 몰래 넣는 대량 할당을 400 으로 막는다. */
export const profileBody = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .refine((s) => !/\p{Cc}/u.test(s), '이름에 제어 문자를 쓸 수 없습니다.')
      .optional(),
    bio: z.string().trim().max(200).optional(),
  })
  .refine((b) => b.name !== undefined || b.bio !== undefined, '바꿀 항목이 없습니다.');

export type ActivityEntry = {
  kind: 'create' | 'edit';
  id: string; // Item.id 또는 EditHistory.id
  at: Date;
  itemName: string;
  href: string; // /theme/<themeSlug>/item/<itemSlug>
  revision?: number; // edit 만
  summary?: string | null;
};

/** 두 목록을 at 내림차순으로 합친다. at 이 같으면 id 내림차순. 앞에서 limit 건. */
export function mergeActivity(created: ActivityEntry[], edits: ActivityEntry[], limit = 30): ActivityEntry[] {
  return [...created, ...edits]
    .sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .slice(0, limit);
}
