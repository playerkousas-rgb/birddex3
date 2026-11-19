# BirdEx ↔ AvianDex 互聯合約（兄弟 App 一直互通指引）

> **一句話**：兩個 App 唯一駁位係 **`NO. NNNN`**；AvianDex 嘅 `birds.json`（583 隻）係編號真相，
> BirdEx 由 `scripts/sync_from_aviandex.py` 同步佢。改編號只准改 AvianDex，唔准兩邊各改各。

## 1. 分工（唔好撈亂）

| | AvianDex（圖鑑） | BirdEx / BIRD-DEX（快門） |
|---|---|---|
| 職責 | 睇得到、學得到：權威資料、卡面文字唔由 AI 生成 | 野外「捉」：影相 → 答 5 條問題 → 對卡 → 解鎖 |
| 資料 | 583 隻名單、NO. 編號、分類權威 | 同一套 NO.；拍攝記錄存 localStorage |
| 卡面 | 插畫／資訊卡（程式排版） | 小朋友自己嘅相：原相（證據）＋ 賽璐璐版（精靈卡） |

## 2. 編號同步（真相流程）

1. **權威**：`AvianDex/src/data/birds.json`（`id: "0001"…"0583"`）。
2. **同步**：`python3 scripts/sync_from_aviandex.py`
   - 輸入（收喺 `scripts/reference_data/`，Git 保留、部署排除）：
     `aviandex_birds.json` · `birdTaxonomy.json` · `explorerIndex.json` · `filterTraits.json` · `legacy_birds_569.json`
   - 輸出：`src/data/birds.json`（583 隻 ＋ `size`/`main_color`/`beak` 三欄）、`src/data/nameAliases.json`（重建）。
   - **photoUrl 以「物種」搬運，唔係以編號搬**（原因見 §4）；腳本可重跑（idempotent）。
3. **守門**：`tests/core.test.mjs` 斷言 583 隻、編號唯一、traits 全填、alias 目標存在。
   任何一邊改名單都要重跑腳本 ＋ 更新快照，先過 `npm run check`。

## 3. 解鎖深層連結（AvianDex 已實作）

```
https://avian-dex.vercel.app/?unlock=0008[&search=中文名]
```

- AvianDex 收到後：寫入自己 localStorage `aviandex.capture-unlocks.v1`
  `{ no, unlocked_at, source: 'birddex3' }`，並直接打開該鳥（`?id=`/`?search=` 亦支援）。
- BirdEx 嘅觸發點：
  1. 拍攝結果頁「跳去 AvianDex 解鎖 NO.NNNN」；
  2. 鳥種詳頁（已拍攝）「解鎖 NO.NNNN」；
  3. 收藏冊 header「圖鑑」掣（開 AvianDex 首頁，唔帶參數）。
- 導航行為：優先 `window.open(..., '_blank')` ＋ postMessage 遞拍攝記錄（0／800／2500ms 三次）；
  **彈窗被擋（例如 iframe 內）就退回同一分頁 `location.assign`** —— `?unlock=` 參數本身已經齊，
  頂層導航照樣生效（docs/50 頂層跳板精神）。
- 實作：`src/lib/aviandex.ts`（`birdNo` / `aviandexUnlockUrl` / `openAvianDexUnlock` / `toInteropRecord` / `parseIncomingSpecies`）。

### 3b. 入站深層連結（AvianDex → BirdEx，合約已就緒）

```
https://birddex3.vercel.app/?no=0008     （亦支援 ?species=8 / ?id=0008）
```

- BirdEx 收到後直接打開該鳥詳頁，處理完 `history.replaceState` 清走參數（重新整理唔會重開）。
- **AvianDex 現況**：佢嘅「快門」掣（`src/App.tsx`／`PokedexDevice.tsx`）而家只開
  `BIRD_CAPTURE_APP_URL` base URL，冇帶參數 —— AvianDex 嗰邊日後只要喺 URL 後面加
  `?no=NNNN`（例如由邊隻鳥嘅詳頁開過嚟就帶邊隻），BirdEx 呢邊已經接得住。
- `?unlock=` 屬出站方向，入站解析會忽略佢，唔會誤讀。
- 守門：`tests/interop.test.mjs`（入站解析＋出站 fallback）。

## 4. R2 `birdcards/` 編號真相（2026-11-17 更新：bucket 已按 AvianDex 編號對齊）

- **結論：`birdcards/NNNN.avif` = AvianDex NO. NNNN，583/583 編號直對。**
  BirdEx `photoUrl = birdcards/<id>.avif`（`scripts/sync_from_aviandex.py` 一步生成，無配對）。
- 演變：資料夾最初按舊 BirdEx 569 編號生成，兩邊曾有 162 處錯位；
  AvianDex `docs/ILLUSTRATION_REPAIRS.md` 已補 **29 個改配物種槽位 ＋ 14 個新編號（0570–0583）**，
  用戶回報全部上載 R2——即 bucket 品種內容已跟 AvianDex 編號。
- 舊嘅「按物種搬運」規則（白腰文鳥 0014 指去 0010.avif 之类）**已廢除**：
  它會令改配槽位雙雙錯圖（該拿的拿不到、不該拿的拿錯）。
- 唯一未核實：沙箱連唔到 r2.dev，無法即時 probe 每個物件係咪 200。
  AvianDex 側可用 `npm run cards:probe` 出缺圖清單；任一邊重新上傳後通知另一邊重跑同步腳本。
- 載入失誤（404）自動跌返 emoji 後備（`useBirdImage` onError），唔會出破圖。

## 5. PostMessage 載荷（遞相片，AvianDex 未聽都無害）

BirdEx 開 unlock 彈窗後會重試三次：

```json
{
  "source": "birddex3",
  "type": "capture-unlock",
  "record": {
    "no": "0008",
    "captured_at": "2026-11-17T10:00:00.000Z",
    "location": { "lat": 22.3, "lng": 114.1 },
    "method": "photo",
    "photo_original_url": "data:image/jpeg;base64,…",
    "photo_cel_url": "data:image/jpeg;base64,…"
  }
}
```

- `targetOrigin` 固定 `https://avian-dex.vercel.app`。
- AvianDex 想喺剪影格直接顯示小朋友張卡：掛 `message` listener 檢查
  `event.data?.source === 'birddex3' && event.data?.type === 'capture-unlock'`，
  按 `record.no` 對返圖鑑格即可（`?unlock=` 已夠觸發進度，postMessage 只係加料）。
- 語言／版本演進只准 **加欄位**，唔准改 `no` 格式（永遠 4 位數字字串）。

## 6. 互通紅線

- 唔准 BirdEx 自行發明編號、自行開 eBird API、或將拍攝進度寫去 AvianDex 嘅 storage（origin 不同，做不到）。
- 唔准為「方便」複製另一邊整份資料落自己 repo 後各改各；同步只准經 §2 腳本。
- 進度一律 localStorage ＋ 備份檔（`bd_*` keys），冇 login、冇 Backend。
