export {};
/**
 * 다나와에서 후보 pcode 검색과 최저가 조회 (콘텐츠 가격·구매링크의 유일한 출처).
 *   npm run price:danawa -- "헬리녹스 체어원"     # 후보 pcode 목록
 *   npm run price:danawa -- 11800708 [...]        # pcode 별 최저가·판매점 수·상태 (JSON)
 * status: OK | STOPPED(가격비교 중지/최저가 0원) | SOLDOUT(일시 품절 등)
 * 가격은 조회 시점 값이다. 콘텐츠에는 queriedAt 날짜를 accessedAt 으로 남긴다.
 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const get = async (url: string) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
};

export async function priceOf(pcode: string) {
  const url = `https://prod.danawa.com/info/?pcode=${pcode}`;
  const html = await get(url);
  const num = (k: string) => Number(html.match(new RegExp(`"${k}": *"?(\\d+)`))?.[1] ?? 0);
  const lowPriceKrw = num('lowPrice');
  const offerCount = num('offerCount');
  const marker = html.match(/가격비교 중지|일시 ?품절|판매 ?종료|단종 상품|재고 없음/)?.[0] ?? null;
  const status = !lowPriceKrw || marker === '가격비교 중지' ? 'STOPPED' : marker ? 'SOLDOUT' : 'OK';
  return {
    pcode,
    title: html.match(/og:title" content="\[다나와\] ([^"]*?)\s*"/)?.[1]?.trim() ?? null,
    lowPriceKrw: lowPriceKrw || null,
    displayed: html.match(/og:description" content="(최저가 [\d,]+원)/)?.[1] ?? null,
    offerCount,
    status,
    marker,
    url,
    queriedAt: new Date().toISOString(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('사용법: npm run price:danawa -- "제품명"  또는  -- pcode [pcode...]');
    process.exit(2);
  }
  if (args.every((a) => /^\d+$/.test(a))) {
    console.log(JSON.stringify(await Promise.all(args.map(priceOf)), null, 2));
    return;
  }
  const html = await get(`https://search.danawa.com/dsearch.php?query=${encodeURIComponent(args.join(' '))}`);
  const seen = new Set<string>();
  for (const m of html.matchAll(/<p class="prod_name">\s*<a[^>]*href="[^"]*pcode=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (seen.has(m[1]) || seen.size >= 8) continue;
    seen.add(m[1]);
    console.log(`${m[1]}  ${m[2].replace(/<[^>]+>|\s+/g, ' ').trim()}`);
  }
}
if (process.argv[1]?.endsWith('danawa-price.ts')) main();
