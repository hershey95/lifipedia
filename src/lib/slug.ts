/**
 * SEO 친화 URL 슬러그. 한글을 로마자로 바꾸지 않고 그대로 보존한다
 * (예: /theme/여행-인생템/premium). 한글 URL 은 브라우저가 percent-encoding 하지만
 * 검색엔진은 디코딩해 인식하므로 가독성과 SEO 를 모두 얻는다.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    // 한글 / 영숫자 / 하이픈만 남긴다
    .replace(/[^0-9a-z가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

/** 슬러그가 이미 쓰이고 있으면 -2, -3 … 을 붙여 유일하게 만든다. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || 'item';
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
