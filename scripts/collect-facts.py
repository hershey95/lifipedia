#!/usr/bin/env python3
"""콘텐츠 JSON 의 출처 URL·가격·인용문을 원문(curl)으로 대조한 '관찰값'만 출력한다.
승인/거절 같은 판정은 하지 않는다 (판정은 Claude 가 한다). 사용: collect-facts.py content/a.json [...]
- 마커: 가격비교 중지·품절 등 가격 근거가 될 수 없는 문구가 페이지에 있는지
- 주장가격표시: priceKrw 가 쉼표 형식으로 페이지 텍스트에 있는지 (True/False/None=가격 없음)
- 인용: evidence.quote 가 해당 출처 원문에 있는지 (구두점·공백·대소문자 무시) + 숫자일치(인용문 속 숫자가 페이지에 있는 비율). 자바스크립트 렌더링 페이지는 FETCH_FAIL/NOT_FOUND 가 날 수 있다.
"""
import sys, re, json, html, subprocess

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
MARK = ["가격비교 중지", "일시 품절", "판매 종료", "판매종료", "단종 상품", "재고 없음"]  # 일반 "품절" 은 쇼핑몰 UI 문구라 오탐이 많아 제외
cache = {}
# 공백·구두점·×/x 표기 차이는 무시하고 글자·숫자만 비교한다 (표 셀 구분자 ":", "/" 등으로 생기는 가짜 불일치 방지)
norm = lambda s: re.sub(r"[^0-9a-z가-힣]", "", s.lower().replace("×", "x"))


def fetch(url):
    if url in cache:
        return cache[url]
    r = subprocess.run(["curl", "-sL", "-m", "25", "-A", UA, "-w", "\n%{http_code}", url], capture_output=True)
    raw = r.stdout.decode("utf-8", "ignore")
    body, _, code = raw.rpartition("\n")
    code = code if r.returncode == 0 else "FAIL"
    title = re.search(r"<title>(.*?)</title>", body, re.S | re.I)
    text = re.sub(r"<script.*?</script>|<style.*?</style>", "", body, flags=re.S | re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    cache[url] = (code, title.group(1).strip() if title else "", text)
    return cache[url]


for path in sys.argv[1:]:
    data = json.load(open(path, encoding="utf-8"))
    print(f"# {path}")
    for it in data["items"]:
        price = it.get("priceKrw")
        print(f"\n## {it['name']} | {it['tier']} | priceKrw={price}")
        urls = [s["url"] for s in it.get("sources", [])] + [p["url"] for p in it.get("purchaseLinks", [])]
        for u in dict.fromkeys(urls):
            code, title, text = fetch(u)
            marks = [m for m in MARK if m in text]
            shown = (f"{price:,}" in text) if price else None
            print(f"- URL {u[:110]} | http={code} | title={title[:60]!r} | 마커={marks} | 주장가격표시={shown}")
        for e in it.get("evidence", []):
            n = e.get("source")
            if not (isinstance(n, int) and 1 <= n <= len(it.get("sources", []))):
                print(f"- 인용 출처번호 오류: {e}")
                continue
            code, _, text = fetch(it["sources"][n - 1]["url"])
            res = "FETCH_FAIL" if code in ("FAIL", "000") or not text.strip() else ("FOUND" if norm(e["quote"]) in norm(text) else "NOT_FOUND")
            # 문장이 달라도 숫자가 페이지에 있으면 표기만 다른 것일 수 있다 (숫자까지 없으면 사실 근거가 없는 인용)
            nums = [x.replace(",", "") for x in re.findall(r"\d[\d,]*\.?\d*", e["quote"])]
            page = text.replace(",", "")
            hit = sum(1 for x in nums if x in page)
            print(f"- 인용[{n}] {res} | 숫자일치={hit}/{len(nums)} | claim={e['claim'][:40]!r} | quote={e['quote'][:60]!r}")
