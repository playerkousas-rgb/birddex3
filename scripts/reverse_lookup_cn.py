#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================
英文/學名 → 中文 反查與校正腳本  (ID 22 以後)
========================================================================
用途:
  以 eBird(康奈爾)為唯一權威，重新核對 ID 22+ 每隻鳥的
  「英文名 / 學名 / 中文名」，確保三者指向同一物種。
  - 英文名、學名：一律採用 eBird 現行版本
  - 中文名：用 eBird 簡體中文 → OpenCC 自動轉繁體；查不到才用中文維基；
            再查不到 → 保留原本英文名（不硬猜）
  - ID 1–21：完全不動（已人手校對並配好圖卡）
  - 已有中文名者：預設不覆蓋（見 OVERWRITE_EXISTING_CN 開關）

⚠️ 為什麼是「英文→中文」而非「中文→英文」?
  因為當初的錯誤是「英文名配錯了中文」(例: 白腰文鳥被配成 Slaty-breasted
  Rail)。eBird 的「學名↔英文」是世界權威且互相匹配，所以用學名/英文去
  反查中文，才能把錯配的中文/英文一次校正回來。

前置需求:
  pip install opencc-python-reimplemented
  scripts/reference_data/ 內需有:
    ebird_en.csv, ebird_sci2cn_sim.json, wiki_ref.json
  (若沒有或想更新，先跑 fetch_reference_data.py)

用法:
  cd skw-birdex2/scripts
  python3 reverse_lookup_cn.py          # 實際寫入 birds.json
  python3 reverse_lookup_cn.py --dry    # 只預覽，不寫入

寫入後記得再跑:
  python3 sync_all.py          # 同步 CSV + AvianDex 中文名
  python3 rebuild_aliases.py   # 重建兩個 nameAliases
========================================================================
"""
import json, csv, re, os, sys

DRY = "--dry" in sys.argv
# 若想連「已有中文名」的也用 eBird 重新覆蓋，改成 True（慎用，會蓋過你的人手校對）
OVERWRITE_EXISTING_CN = False
# 永不更動的編號範圍（已配好圖卡）
LOCKED_MAX_ID = 21

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # skw-birdex2/
REF = os.path.join(HERE, "reference_data")
BIRDS = os.path.join(ROOT, "src", "data", "birds.json")

try:
    from opencc import OpenCC
    cc = OpenCC("s2twp")   # 簡體 → 繁體(台灣用字)
except Exception:
    print("⚠️ 找不到 opencc，請先: pip install opencc-python-reimplemented")
    sys.exit(1)


def has_cn(s): return bool(re.search(r"[\u4e00-\u9fff]", str(s)))
def nen(s): return re.sub(r"[^a-z]", "", str(s).lower())
def nsci(s): return re.sub(r"\s+", " ", str(s).strip().lower())
def title_sci(es):
    p = es.split()
    return (p[0].capitalize() + " " + " ".join(x.lower() for x in p[1:])) if len(p) >= 2 else es.capitalize()
def clean_cn(s):
    # 去掉「正名 (異名)」括號、維基殘渣
    return re.sub(r"\s*[\(（].*?[\)）]\s*$", "", str(s)).strip()

PLACE_EN = {"unknown species", "unknown", "???", ""}
PLACE_SCI = {"scientific name", "", "???", "unknown"}

# ── 載入參考資料 ──────────────────────────────────────────────
ebird_en = {}
with open(os.path.join(REF, "ebird_en.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        ebird_en[r["SCIENTIFIC_NAME"].strip().lower()] = r["COMMON_NAME"].strip()
en2sci = {}
for s, e in ebird_en.items():
    en2sci.setdefault(nen(e), s)

# eBird 種小名索引（救「屬名改了但種小名沒變」的情況）
from collections import defaultdict
sp_index = defaultdict(list)
for s in ebird_en:
    parts = s.split()
    if len(parts) >= 2:
        sp_index[parts[-1]].append(s)

ebird_cn = json.load(open(os.path.join(REF, "ebird_sci2cn_sim.json")))
wiki = json.load(open(os.path.join(REF, "wiki_ref.json")))
sci2zh_wiki = {nsci(k): v for k, v in wiki["sci2zh"].items()}


def find_ebird_sci(b):
    """用現有資料找出 eBird 現行學名。多重 fallback。"""
    cur_sci = nsci(b.get("scientificName", ""))
    cur_en = str(b.get("nameEn", "")).strip()
    # 1. 現有學名已是 eBird 現行
    if cur_sci in ebird_en:
        return cur_sci
    # 2. 英文名反查（注意：有些資料把學名誤填在英文欄，下面 3 會處理）
    if cur_en.lower() not in PLACE_EN:
        s = en2sci.get(nen(cur_en))
        if s:
            return s
    # 3. 用「現有學名 或 英文欄(可能是學名)」的種小名去配
    for cand in (cur_sci, nsci(cur_en)):
        parts = cand.split()
        if len(parts) >= 2:
            genus, sp = parts[0], parts[-1]
            same = sp_index.get(sp, [])
            for x in same:                       # 先找同屬同種
                if x.split()[0] == genus:
                    return x
            if len(same) == 1:                   # 只剩一個候選 → 安全採用
                return same[0]
    return None


def get_cn(sci):
    """學名 → 繁體中文：eBird 簡中轉繁 優先，其次中文維基。"""
    if sci in ebird_cn:
        return clean_cn(cc.convert(ebird_cn[sci]))
    if sci in sci2zh_wiki:
        return clean_cn(sci2zh_wiki[sci])
    return None


# ── 主流程 ────────────────────────────────────────────────────
bd = json.load(open(BIRDS, encoding="utf-8"))
log, unresolved = [], []
for b in bd:
    i = b["id"]
    if i <= LOCKED_MAX_ID:
        continue
    cn = str(b.get("name", "")).strip()
    oe = str(b.get("nameEn", "")).strip()
    osci = str(b.get("scientificName", "")).strip()

    sci = find_ebird_sci(b)
    if not sci:
        unresolved.append((i, cn, oe, osci))
        continue

    ne = ebird_en.get(sci)
    ns = title_sci(sci)
    nc = get_cn(sci)
    changed = []
    if ne and nen(ne) != nen(oe):
        b["nameEn"] = ne; changed.append(("英文", oe, ne))
    if ns and nsci(ns) != nsci(osci):
        b["scientificName"] = ns; changed.append(("學名", osci, ns))
    want_cn = (not has_cn(cn)) or OVERWRITE_EXISTING_CN
    if want_cn and nc and nc != cn:
        b["name"] = nc; changed.append(("中文", cn, nc))
    if changed:
        log.append((i, b["name"], changed))

# ── 輸出 ──────────────────────────────────────────────────────
if not DRY:
    json.dump(bd, open(BIRDS, "w"), ensure_ascii=False, indent=2)

print(("【DRY 預覽】" if DRY else "【已寫入】") + f" ID22+ 改動 {len(log)} 筆")
for i, nm, ch in log:
    print(f"  ID{i} {nm}: " + " | ".join(f"{t}:{o}→{n}" for t, o, n in ch))

no_cn = [b["id"] for b in bd if not has_cn(b["name"])]
print(f"\n仍缺中文名(eBird/維基都查不到,保留英文): {len(no_cn)} → {no_cn}")
if unresolved:
    print(f"完全對不到 eBird 物種(需人手): {len(unresolved)}")
    for i, cn, oe, osci in unresolved:
        print(f"   ID{i} {cn} | {oe} | {osci}")

if not DRY:
    print("\n下一步請執行: python3 sync_all.py  然後  python3 rebuild_aliases.py")
