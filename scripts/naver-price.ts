export {};
/**
 * 네이버 쇼핑 검색 API 로 제품 후보와 최저가를 조회한다 (가격·구매링크의 유일한 출처).
 *   npm run price:naver -- "헬리녹스 체어원" [개수=5] [--json]
 * 필요: .env 의 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET (developers.naver.com → 검색 API)
 * 가격은 조회 시점 값이다. 콘텐츠에 쓸 때 조회 시각을 accessedAt 으로 남긴다.
 */
const [query, ...rest] = process.argv.slice(2).filter((a) => a !== '--json');
const json = process.argv.includes('--json');
const display = Number(rest[0]) || 5;
const { NAVER_CLIENT_ID: id, NAVER_CLIENT_SECRET: secret } = process.env;
if (!query || !id || !secret) {
  console.error('사용법: npm run price:naver -- "제품명" [개수] [--json]  (.env 에 NAVER_CLIENT_ID/SECRET 필요)');
  process.exit(2);
}

async function main() {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=${display}&sort=sim`,
    { headers: { 'X-Naver-Client-Id': id!, 'X-Naver-Client-Secret': secret! } },
  );
  if (!res.ok) {
    console.error(`네이버 API ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const data = (await res.json()) as { items: Record<string, string>[] };
  const items = data.items.map((i) => ({
    title: i.title.replace(/<\/?b>/g, ''),
    priceKrw: Number(i.lprice) || null,
    mall: i.mallName,
    brand: i.brand,
    maker: i.maker,
    category: [i.category1, i.category2, i.category3, i.category4].filter(Boolean).join(' > '),
    productId: i.productId,
    link: i.link,
    queriedAt: new Date().toISOString(),
  }));
  if (json) console.log(JSON.stringify(items, null, 2));
  else for (const i of items) console.log(`${String(i.priceKrw ?? '-').padStart(9)}원  ${i.mall}  ${i.title}\n           ${i.category}\n           ${i.link}`);
}
main();
