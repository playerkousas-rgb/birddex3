#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重新下載權威參考資料(eBird 康奈爾 + 維基)。
平時不需要跑，只有當你想「更新到最新 eBird 分類」時才執行。
產出檔案存到 scripts/reference_data/，供 reverse_lookup_cn.py 使用。

用法:
    cd skw-birdex2/scripts
    python3 fetch_reference_data.py
"""
import json, csv, re, os, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "reference_data")
os.makedirs(REF, exist_ok=True)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "birddex-maintenance/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


# ── 1. eBird 全球分類表（英文名 + 現行學名）──────────────────
# 這是「英文名 / 學名」的最權威來源。
print("[1/3] 下載 eBird 英文分類表 ...")
data = get("https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=csv&cat=species")
open(os.path.join(REF, "ebird_en.csv"), "wb").write(data)
print("    OK ebird_en.csv")

# ── 2. eBird 簡體中文名（locale=zh_SIM，僅中國已知種約 1600+）──
# 這是「英文/學名 → 中文名」反查的主要來源（簡體，之後用 OpenCC 轉繁體）。
print("[2/3] 下載 eBird 簡體中文名 ...")
data = get("https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=csv&locale=zh_SIM&cat=species")
sci2cn = {}
rdr = csv.DictReader(l.decode("utf-8") for l in data.splitlines())
for row in rdr:
    sci = row["SCIENTIFIC_NAME"].strip().lower()
    name = row["COMMON_NAME"].strip()
    if re.search(r"[\u4e00-\u9fff]", name):  # 只收真的有中文的
        sci2cn[sci] = name
json.dump(sci2cn, open(os.path.join(REF, "ebird_sci2cn_sim.json"), "w"),
          ensure_ascii=False, indent=2)
print(f"    OK ebird_sci2cn_sim.json ({len(sci2cn)} 種有中文)")

# ── 3. 中文維基「香港鳥類列表」（學名 → 繁體中文，作補充）─────
print("[3/3] 下載中文維基香港鳥類列表 ...")
url = ("https://zh.wikipedia.org/w/api.php?action=parse"
       "&page=%E9%A6%99%E6%B8%AF%E9%B3%A5%E9%A1%9E%E5%88%97%E8%A1%A8"
       "&prop=wikitext&format=json&formatversion=2")
wt = json.loads(get(url))["parse"]["wikitext"]
sci2zh = {}
for line in wt.split("\n"):
    # 格式: #[[中文名]] - ''學名''  或 #[[顯示|中文名]] - ''學名''
    m = re.match(r"#\s*\[\[([^\]]+?)\]\]\s*-\s*''([A-Z][a-z]+(?:\s+[a-z\-]+)+)''", line)
    if m:
        zhname = m.group(1).split("|")[-1].strip()
        sci = m.group(2).strip().lower()
        sci2zh.setdefault(sci, zhname)
json.dump({"sci2zh": sci2zh}, open(os.path.join(REF, "wiki_ref.json"), "w"),
          ensure_ascii=False, indent=2)
print(f"    OK wiki_ref.json ({len(sci2zh)} 種)")

print("\n完成。參考資料已更新到 scripts/reference_data/")
