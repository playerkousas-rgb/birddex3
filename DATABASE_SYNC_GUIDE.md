# BIRD-DEX 資料庫同步與維護指南（精靈球版）

BirdEx 嘅核心資料係 **JSON**，同兄弟專案 **AvianDex** 共用同一套 `NO. NNNN` 編號。
**AvianDex 嘅 583 隻名單係編號真相**；BirdEx 唔再各自維護一份。

## 1. 檔案角色

| 檔案 | 用途 |
|---|---|
| `src/data/birds.json` | 圖鑑主資料：583 隻（`id` 為數字 1–583）＋ `size`/`main_color`/`beak` 三問特徵 |
| `src/data/nameAliases.json` | 名稱／學名 → `speciesId` 對照（Merlin 後備查找用） |
| `scripts/reference_data/aviandex_birds.json` | AvianDex 名單快照（編號權威） |
| `scripts/reference_data/birdTaxonomy.json` | 583 隻目／科（推導特徵用） |
| `scripts/reference_data/explorerIndex.json` ＋ `filterTraits.json` | 體長資料（推導 `size` 用） |
| `scripts/reference_data/legacy_birds_569.json` | 改造前 569 名單快照（R2 圖「按物種搬運」嘅來源） |

> `scripts/reference_data/` 喺 Git 保留、部署排除（見 DEPLOYMENT_GUARDRAILS §2）。

## 2. 點同步

```bash
# 1) 先喺 AvianDex repo 更新 reference 快照（gh api 或手動下載五個 JSON）
# 2) 重跑同步（idempotent，可重跑）
python3 scripts/sync_from_aviandex.py
# 3) 驗證
npm run check && npm run lint && npm run build
```

腳本一次過做齊：

1. 以 AvianDex 名單重建 `birds.json`（583 隻）。
2. `photoUrl` **以物種搬運**（中文 → 英文 → 學名三段全局配對，先到先得；
   `大山雀→遠東山雀` 等異名手動對照喺 `OLD_ZH_FIXUP`）。R2 `birdcards/` 檔案係舊編號生成，
   按編號搬會搬錯圖，詳見 [docs/AVIANDEX_INTEROP.md](docs/AVIANDEX_INTEROP.md) §4。
3. 推導三問特徵（`size`：體長 ≤15 細 / 16–39 中 / ≥40 大 → 科級後備 → 中；
   `main_color`：中文名顏色字 → 科級後備 → 啡棕；`beak`：科級嘴形表 → 尖）。
4. 重建 `nameAliases.json`（英文＋學名＋繁中＋簡中，先到先得去重）。

## 3. 注意事項

1. `birds.json` 嘅 `id` 必須係**數字**（唔係 `"0001"` 字串）。
2. 三問特徵值只准用字彙表內字串（守門：`tests/core.test.mjs`）。
3. 改咗 JSON 要行 `npm run build` 確認冇 TypeScript 錯誤先好部署。
4. AvianDex 嗰邊改咗編號／名單 → 更新 reference 快照重跑本腳本；
   BirdEx 呢邊永遠唔准自行發明編號（互聯紅線見 interop 文檔 §6）。

## 4. 內部讀取邏輯（唔使改）

* `src/data/birdData.ts`：`import birdsJson from './birds.json'` → `BIRD_SPECIES`。
* `src/data/nameAliases.ts`：載入 `nameAliases.json` 建 `Map`，`resolveBirdId()` 忽略大小寫與標點。
* 三問過濾：`src/lib/birdFilter.ts`（`matchCandidates` 永遠回 3–5 隻）。
* 解鎖互聯：`src/lib/aviandex.ts`（`birdNo` / `aviandexUnlockUrl` / `openAvianDexUnlock`）。
