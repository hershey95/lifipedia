import { z } from 'zod';

// 제어 문자·줄/문단 구분자·보이지 않는 문자·양방향 제어 문자(표시 방향 스푸핑). ZWJ(U+200D) 이모지 조합은 허용.
const HIDDEN = /[\p{Cc}\p{Zl}\p{Zp}\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/u;
// 소개는 줄바꿈·탭을 허용하되 NUL 등 나머지 제어/숨김 문자는 거부한다.
const BIO_HIDDEN = /[\p{Zl}\p{Zp}\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]|(?![\n\r\t])\p{Cc}/u;

/** PATCH /api/me 본문. strictObject: 모르는 키(trustScore 등)를 몰래 넣는 대량 할당을 400 으로 막는다. */
export const profileBody = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .refine((s) => !HIDDEN.test(s), '이름에 제어·숨김 문자를 쓸 수 없습니다.')
      .refine((s) => /[\p{L}\p{N}\p{S}\p{P}]/u.test(s), '이름에 보이는 글자가 있어야 합니다.')
      .optional(),
    bio: z
      .string()
      .trim()
      .max(200)
      .refine((s) => !BIO_HIDDEN.test(s), '소개에 제어·숨김 문자를 쓸 수 없습니다.')
      .optional(),
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

/** 로그인 후 복귀 경로. 같은 사이트 내부 경로만 허용한다(오픈 리다이렉트 방지). */
export function safeCallbackUrl(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  return raw;
}
