#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 birds.json(真相來源)同步到其他檔案:
  1) skw-birdex2/BIRD_ID_MAPPING.csv  (中文名、英文名)
  2) AvianDex/src/data/birds.json     (中文名)

用法:
  cd skw-birdex2/scripts
  python3 sync_all.py

注意: 需要 AvianDex 與 skw-birdex2 放在同一層父資料夾。
"""
import json, csv, os

HERE = os.path.dirname(os.path.abspath(__file__))
BIRDEX2 = os.path.dirname(HERE)                 # skw-birdex2/
PARENT = os.path.dirname(BIRDEX2)               # 兩個專案的父層
BIRDS = os.path.join(BIRDEX2, "src", "data", "birds.json")
CSVP = os.path.join(BIRDEX2, "BIRD_ID_MAPPING.csv")
AVIAN = os.path.join(PARENT, "AvianDex", "src", "data", "birds.json")

bd = json.load(open(BIRDS, encoding="utf-8"))
by_id = {b["id"]: b for b in bd}

# 1) 重寫 CSV
rows = []
with open(CSVP, encoding="utf-8") as f:
    rd = csv.reader(f)
    header = next(rd)
    rows = list(rd)
out = [header]
for r in rows:
    try:
        i = int(r[0])
    except Exception:
        out.append(r); continue
    b = by_id.get(i)
    if b:
        r = list(r)
        r[1] = b["name"]
        if len(r) > 2:
            r[2] = b.get("nameEn", r[2])
    out.append(r)
with open(CSVP, "w", encoding="utf-8", newline="") as f:
    csv.writer(f).writerows(out)
print(f"OK CSV 已同步 ({len(rows)} 列)")

# 2) 同步 AvianDex 中文名
if os.path.exists(AVIAN):
    av = json.load(open(AVIAN, encoding="utf-8"))
    n = 0
    for a in av:
        b = by_id.get(int(a["id"]))
        if b and a.get("name") != b["name"]:
            a["name"] = b["name"]; n += 1
    json.dump(av, open(AVIAN, "w"), ensure_ascii=False, indent=2)
    print(f"OK AvianDex birds.json 中文名同步 ({n} 筆更新)")
else:
    print(f"⚠️ 找不到 {AVIAN}，略過 AvianDex 同步")
