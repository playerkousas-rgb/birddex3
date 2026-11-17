#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BirdEx 精靈球版：由 AvianDex 的 583 隻權威名單重建 birds.json 與 nameAliases.json。

真相來源（全部收喺 scripts/reference_data/，部署排除、Git 保留）：
  1) aviandex_birds.json   AvianDex 583 隻名單（id/name/en）—— NO. 編號權威
  2) birdTaxonomy.json     583 隻目／科（拉丁＋中文）—— size/main_color/beak 推導用
  3) explorerIndex.json    體長 len（由 cardCopy 比對而來）＋科名
  4) filterTraits.json     lengthCm（cardCopy 體長中位）＋ IUCN

保留自舊 birds.json（skw-birdex2 時代）：
  - photoUrl：以「物種」搬運（zh → en → 學名三段配對），因為 R2 birdcards/
    檔案係按舊編號生成（fix_r2_urls2.cjs + BIRD_ID_MAPPING.csv），編號搬會搬錯圖。
  - 其餘欄位係全表均一的佔位值，直接沿用同一套。

三欄新特徵（唔使人手打，由資料推導）：
  - size       細 / 中 / 大   ← 體長（≤15 細、16–39 中、≥40 大）→ 科級後備 → 中
  - main_color 黑白/黑/白/綠藍/紅黃/灰/啡棕 ← 中文名顏色字 → 科級後備 → 啡棕
  - beak       尖/長/闊/鉤   ← 科級嘴形表 → 預設 尖

nameAliases.json：按 rebuild_aliases.py 同一套規則由新名單重建
（英文名＋學名＋中文繁＋中文簡；全域先到先得去重；佔位字串不收）。

用法：python3 scripts/sync_from_aviandex.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
REF = os.path.join(HERE, "reference_data")
BIRDS = os.path.join(ROOT, "src", "data", "birds.json")
ALIASES = os.path.join(ROOT, "src", "data", "nameAliases.json")

R2 = "https://pub-a9333a974e814ccba1994639b6e79266.r2.dev"
DEFAULT_BASE_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16",
]

def load(name):
    with open(os.path.join(REF, name), encoding="utf-8") as f:
        return json.load(f)

def norm(s):
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", str(s or "").lower())

# ---------------------------------------------------------------- 配對舊→新
# 明確的人手對照（只收真正同種異名的對，其餘靠三段自動配對）：
#   舊名 → 新（AvianDex）名
OLD_ZH_FIXUP = {
    "大山雀": "遠東山雀",   # 同種 Parus minor，兩邊命名慣例不同
    "黑臉噪眉": "黑臉噪鶥",  # 眉/鶥 異體；舊表兩隻都有，先到先得
}

def build_old_index(old_birds):
    """舊 birds.json 建三個索引；中文名精確配對永遠優先於英文名。"""
    by_zh, by_en, by_sci = {}, {}, {}
    for b in old_birds:
        zh = b.get("name")
        if zh and zh not in by_zh:
            by_zh[zh] = b
        en = str(b.get("nameEn") or "").strip().lower()
        if en and en not in ("unknown species", "") and en not in by_en:
            by_en[en] = b
        sci = norm(b.get("scientificName"))
        if sci and sci not in ("scientific name", "", "unknown") and sci not in by_sci:
            by_sci[sci] = b
    return by_zh, by_en, by_sci

def match_all(av_list, taxonomy, old_birds):
    """全局三段配對（第一段中文名 → 第二段英文名 → 第三段學名）。
    每段內先到先得：同一隻舊鳥只准認領一次，避免 en 誤配搶走 zh 的正確配對。"""
    by_zh, by_en, by_sci = build_old_index(old_birds)
    used = set()
    result = {}

    def claim(av_id, old):
        if old is None or id(old) in used:
            return False
        used.add(id(old))
        result[av_id] = old
        return True

    # P0：人手 fixup（最高優先）
    zh_to_av = {b.get("name"): int(b["id"]) for b in av_list}
    for old_zh, new_zh in OLD_ZH_FIXUP.items():
        av_id = zh_to_av.get(new_zh)
        if av_id is not None:
            claim(av_id, by_zh.get(old_zh))

    passes = [
        # (av_key_fn, old_table)
        (lambda a: a.get("name"), by_zh),
        (lambda a: norm(a.get("name")), {norm(k): v for k, v in by_zh.items()}),
        (lambda a: str(a.get("en") or "").strip().lower(), by_en),
        (lambda a: norm(a.get("en")), {norm(k): v for k, v in by_en.items()}),
        (lambda a: norm(taxonomy.get(str(a["id"]), {}).get("sciName")), by_sci),
    ]
    for key_fn, table in passes:
        for av in av_list:
            av_id = int(av["id"])
            if av_id in result:
                continue
            key = key_fn(av)
            if key:
                claim(av_id, table.get(key))
    return result

# ---------------------------------------------------------------- 三欄特徵
SIZE_LARGE_FAMILIES = {
    "Ardeidae", "Accipitridae", "Ciconiidae", "Gruidae", "Pelecanidae",
    "Phalacrocoracidae", "Threskiornithidae", "Laridae", "Anatidae",
}
SIZE_SMALL_FAMILIES = {
    "Aegithalidae", "Remizidae", "Zosteropidae", "Nectariniidae",
    "Troglodytidae", "Cisticolidae", "Phylloscopidae", "Locustellidae",
    "Acrocephalidae", "Scotocercidae", "Sylviidae", "Hyliotidae", "Dicaedae",
}

def derive_size(zh, family, lengths):
    cm = lengths.get(zh) or lengths.get(family)
    if cm:
        if cm <= 15:
            return "細"
        if cm < 40:
            return "中"
        return "大"
    if family in SIZE_LARGE_FAMILIES:
        return "大"
    if family in SIZE_SMALL_FAMILIES:
        return "細"
    return "中"

COLOR_RULES = [
    ("黑白", ("黑", "烏", "乌"), ("白",)),
    ("黑", ("黑", "烏", "乌"), ()),
    ("白", ("白",), ()),
    ("綠藍", ("綠", "绿", "藍", "蓝", "紫", "青"), ()),
    ("紅黃", ("紅", "红", "赤", "朱", "黃", "黄", "金"), ()),
    ("灰", ("灰", "銀", "银", "蒼", "苍"), ()),
    ("啡棕", ("啡", "褐", "棕", "栗", "麻", "茶", "烏", "乌"), ()),
]
COLOR_BY_FAMILY = {
    "Monarchidae": "黑白", "Corvidae": "黑白", "Picidae": "黑白",
    "Ardeidae": "白", "Alcedinidae": "綠藍", "Laridae": "灰",
    "Accipitridae": "啡棕", "Falconidae": "啡棕", "Strigidae": "啡棕",
    "Tytonidae": "啡棕", "Rallidae": "啡棕", "Scolopacidae": "灰",
    "Charadriidae": "灰", "Motacillidae": "灰", "Pycnonotidae": "啡棕",
}

def derive_color(zh, family):
    for label, need, need_more in COLOR_RULES:
        if any(c in zh for c in need) and all(c in zh for c in need_more):
            if label == "黑白" and not any(c in zh for c in ("白",)):
                continue
            if label == "啡棕" and any(c in zh for c in ("黑", "烏", "乌")) and "褐" not in zh and "棕" not in zh:
                continue
            return label
    return COLOR_BY_FAMILY.get(family, "啡棕")

BEAK_BY_FAMILY = {
    "鉤": ["Accipitridae", "Falconidae", "Pandionidae", "Strigidae", "Tytonidae"],
    "闊": ["Anatidae", "Pelecanidae", "Laridae"],
    "長": ["Ardeidae", "Threskiornithidae", "Alcedinidae", "Meropidae",
           "Cerylidae", "Upupidae", "Scolopacidae", "Recurvirostridae",
           "Haematopodidae", "Phoenicopteridae", "Bucerotidae",
           "Caprimulgidae", "Procellariidae", "Sulidae"],
}

def derive_beak(family):
    for shape, families in BEAK_BY_FAMILY.items():
        if family in families:
            return shape
    return "尖"

# ---------------------------------------------------------------- aliases
_T2S = {
    "鳥": "鸟", "鳩": "鸠", "鷺": "鹭", "鷹": "鹰", "鷗": "鸥", "鷸": "鹬",
    "鴨": "鸭", "鵲": "鹊", "鵯": "鹎", "鵐": "鹀", "鷚": "鹨", "鶇": "鸫",
    "鶯": "莺", "鸝": "鹂", "鵂": "鸺", "鴞": "鸮", "鵰": "雕", "鸌": "鹱",
    "鷲": "鹫", "鶴": "鹤", "鷥": "鸶", "鶺": "鹡", "鴒": "鸰", "鵪": "鹌",
    "鳳": "凤", "畫": "画", "紅": "红", "綠": "绿", "藍": "蓝", "黃": "黄",
    "國": "国", "東": "东", "鵡": "鹉", "鸚": "鹦", "鴿": "鸽", "鳶": "鸢",
    "鵑": "鹃", "鴫": "鸨", "鸕": "鸬", "鶩": "鹜", "鸕": "鸬",
}

def to_simp(s):
    return "".join(_T2S.get(c, c) for c in s)

PE = {"unknown species", "unknown", "???", ""}
PS = {"scientific name", "", "???", "unknown"}

def alias_keys(zh, en, sci):
    ks = []
    if en and en.strip().lower() not in PE:
        ks.append(en.strip().lower())
    if sci and sci.strip().lower() not in PS:
        ks.append(sci.strip().lower())
    if zh and re.search(r"[\u4e00-\u9fff]", zh):
        ks.append(zh)
        simp = to_simp(zh)
        if simp != zh:
            ks.append(simp)
    seen, uniq = set(), []
    for k in ks:
        if k not in seen:
            seen.add(k)
            uniq.append(k)
    return uniq

# ---------------------------------------------------------------- main
def main():
    # 舊 569 名單快照（來自改造前的 birds.json）——photoUrl 物種搬運的來源。
    # 用快照而唔係現行 birds.json，令本腳本可重跑（idempotent）。
    old_birds = json.load(open(os.path.join(REF, "legacy_birds_569.json"), encoding="utf-8"))
    av_list = load("aviandex_birds.json")
    taxonomy = load("birdTaxonomy.json")
    explorer = load("explorerIndex.json")
    filter_traits = load("filterTraits.json")

    matched_old = match_all(av_list, taxonomy, old_birds)

    # 體長：filterTraits ∪ explorer（按科分組都留一份，方便無體長的同科鳥）
    lengths_by_zh, lengths_by_family = {}, {}
    for k, t in filter_traits.get("birds", {}).items():
        cm = t.get("lengthCm")
        z = explorer.get("birds", {}).get(k, {}).get("z")
        fam = taxonomy.get(k, {}).get("family")
        if cm and z:
            lengths_by_zh[z] = float(cm)
        if cm and fam:
            lengths_by_family.setdefault(fam, float(cm))
    for k, e in explorer.get("birds", {}).items():
        cm = e.get("len")
        z = e.get("z")
        fam = taxonomy.get(k, {}).get("family")
        if cm and float(cm) > 0 and z and z not in lengths_by_zh:
            lengths_by_zh[z] = float(cm)
        if cm and float(cm) > 0 and fam:
            lengths_by_family.setdefault(fam, float(cm))

    new_birds, carried, missing_photo, trait_stats = [], 0, 0, {"size": {}, "color": {}, "beak": {}}
    for av in av_list:
        i = int(av["id"])
        tax = taxonomy.get(av["id"], {})
        family_zh = tax.get("familyZh") or "鳥綱"
        family_lat = tax.get("family") or ""
        zh = av.get("name") or ""
        en = av.get("en") or tax.get("comName") or ""
        sci = tax.get("sciName") or ""

        old = matched_old.get(i)
        photo = (old or {}).get("photoUrl")

        size = derive_size(zh, family_lat, {**lengths_by_family, **lengths_by_zh})
        color = derive_color(zh, family_lat)
        beak = derive_beak(family_lat)

        if photo:
            carried += 1
        else:
            missing_photo += 1
        for bucket, value in (("size", size), ("color", color), ("beak", beak)):
            trait_stats[bucket][value] = trait_stats[bucket].get(value, 0) + 1

        new_birds.append({
            "id": i,
            "name": zh,
            "nameEn": en,
            "scientificName": sci,
            "family": family_zh,
            "size": size,
            "main_color": color,
            "beak": beak,
            "habitat": ["大自然"],
            "diet": "未知",
            "features": "尚未解鎖生態檔案...",
            "funFact": "在 AvianDex 尋找更多關於這隻鳥的知識！",
            "description": "開啟 AvianDex 圖鑑，探索這隻鳥精靈的完整生態資料與觀鳥熱點。",
            "region": "香港",
            "season": "四季",
            "hotspots": [],
            "globalRange": ["地球"],
            "baseColor": DEFAULT_BASE_COLORS[(i - 1) % len(DEFAULT_BASE_COLORS)],
            "emoji": "🐦",
            "call": "未知",
            "tags": [],
            "aiRecognizable": True,
            "photoUrl": photo,
            "pack": 1,
        })

    assert len(new_birds) == 583, f"expected 583, got {len(new_birds)}"

    # aliases 全量重建（先到先得去重）
    seen, aliases_out = set(), []
    for b in new_birds:
        keys = alias_keys(b["name"], b["nameEn"], b["scientificName"])
        fresh = [k for k in keys if k not in seen]
        if fresh:
            seen.update(fresh)
            aliases_out.append({"speciesId": b["id"], "aliases": fresh})

    with open(BIRDS, "w", encoding="utf-8") as f:
        json.dump(new_birds, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(ALIASES, "w", encoding="utf-8") as f:
        json.dump(aliases_out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"birds.json: {len(new_birds)} 隻（photoUrl 搬運 {carried}，無圖 {missing_photo}）")
    print("traits:", json.dumps(trait_stats, ensure_ascii=False))
    print(f"nameAliases.json: {len(aliases_out)} 條 / {sum(len(a['aliases']) for a in aliases_out)} 別名")

if __name__ == "__main__":
    main()
