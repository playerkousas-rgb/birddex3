# BIRD-DEX 3 · BirdEx（精靈球版）🐦🔴

BirdEx 係「精靈球」：負責喺野外**捉**——影相 → 答 3 條問題 → 自己對卡 → 解鎖。
權威資料同「學」永遠喺兄弟 App **AvianDex**（圖鑑）嗰邊，兩邊共用同一套 `NO. NNNN` 編號，
詳見 [docs/AVIANDEX_INTEROP.md](docs/AVIANDEX_INTEROP.md)。

> **成個流程一句講晒：**
> 行山見到雀 → BirdEx 影低佢 → 答 3 條問題 → 彈出 3–5 張卡自己對 → 揀中
> → 即刻生成賽璐璐精靈卡 → 同時 Keep 埋原相做證據 → 跳去 AvianDex 解鎖 NO.編號

## 🎮 核心玩法（精靈球版）

1. **📷 影相做證，唔係俾 AI 睇**
   後置相機三連拍取最 Sharp 一張；張相只係「證據」。**唔用 AI 自動認雀**——
   市面冇免費認雀 API（Merlin 冇公開 API、BirdNET 要自架 Backend、Google Lens 認唔到品種、
   eBird key 申請唔到），所以主流流程完全唔靠佢哋，唔使 Backend。

2. **❓ 答 3 條問題，由 583 隻 filter 到 3–5 張候選卡**
   - 佢有幾大？\[細 / 中 / 大\]
   - 佢咩色為主？\[黑白 / 白 / 黑 / 啡棕 / 灰 / 綠藍 / 紅黃\]
   - 佢個嘴係點？\[尖 / 長 / 闊 / 鉤\]
   計分制（體型 4 · 主色 3 · 嘴形 3）保證永遠彈 3–5 張，唔會 0 張或幾十張。
   三欄特徵 `size` / `main_color` / `beak` 由資料推導（體長＋目科＋中文名），全表必填，
   由 `scripts/sync_from_aviandex.py` 產生，唔使人手逐隻打。

3. **🤔 自己對卡，最後決定權喺小朋友**
   候選卡連同自己張原相並排，對吓 shape、嘴、尾——**揀中先算「捉到」**，
   唔係 AI 話事。

4. **🎨 每隻捉到嘅精靈 Keep 兩張圖**
   - **原相 = 證據**：小朋友自己影嘅真相，矇都係真相，shape／嘴／尾一概唔改。
   - **賽璐璐版 = 精靈卡**：前端 Canvas 即時轉——Posterize（量化到 4–5 級平色塊）
     ＋ Sobel Edge Detection（加粗黑邊）。撳一下即變，零 upload、零 Backend、零錢。
   卡面預設顯示賽璐璐版；撳卡上「賽璐璐 ⇄ 原相」隨時轉。

5. **🔗 解鎖 AvianDex（兄弟互通）**
   捕捉記錄：`{ no: "0008", captured_at, location, method: "photo", photo_original_url, photo_cel_url }`
   捕捉結果頁／詳頁一鍵跳 `https://avian-dex.vercel.app/?unlock=0008`，
   AvianDex 嗰格由剪影變做小朋友張卡。進度存 localStorage，唔使 login、唔使 Backend。
   反向都通：AvianDex 開 `birddex3.vercel.app/?no=0008` 會直接打開嗰隻鳥詳頁
   （合約見 [docs/AVIANDEX_INTEROP.md](docs/AVIANDEX_INTEROP.md) §3b）；彈窗被擋會自動退回
   同分頁導航，`?unlock=` 照樣生效。

6. **🆘 Merlin 只做後備**
   三條問題下面有個細掣「唔肯定？試下用 Merlin 影相認」——真係唔肯定先跳出場外，
   認完返嚟輸入 NO. 編號／鳥名直接揀。主流永遠係：影相 → 三問 → 對卡 → 解鎖。

## 🚫 明確唔做嘅嘢

- ❌ 唔再申請 eBird API（AvianDex 583 隻靜態名單直接用）
- ❌ 唔再以聽聲做主流（香港公園雜音太多；錄音頁維持停用）
- ❌ 唔再用 AI 自動認係咩雀（`/api/analyze` 保留但捕捉流程不再呼叫）
- ❌ 唔再用 AI 插畫做**捕捉卡面**（卡面只有小朋友自己嘅相）
- ❌ 唔為辨識起 Backend

## 🧩 保留嘅 v3 玩法

IV／CP／性格個體值、稀有度升階（UC→LR）、全息閃卡、去背貼圖、對戰、地圖熱點、
圖鑑收集進度、訓練師 XP／稱號、PWA 安裝，全部保留。即時鳥類偵測框（COCO-SSD）
只作**取景輔助**，唔認品種、唔參與捕捉判定。

## 🗄️ 資料與同步

- `src/data/birds.json`：583 隻（AvianDex 編號權威）＋推導特徵三欄。
- `scripts/sync_from_aviandex.py`：可重跑同步（輸入快照喺 `scripts/reference_data/`）。
- `src/data/nameAliases.json`：由新名單重建，供 Merlin 後備嘅名稱／學名查找。
- R2 `birdcards/NNNN.avif` = **AvianDex NO. 編號直對**（AvianDex 側 `ILLUSTRATION_REPAIRS` 已補
  29 個改配物種槽位 ＋ 14 個新編號並上載，583/583 有圖；真相見 interop 文檔 §4）。

## 📱 戶外手機適配（捕捉＝純外出用）

- **390px 手機優先**：底部導覽＋`safe-area-inset` 全面覆蓋（瀏海／底部橫條唔遮內容）；
  `100dvh` 動態視窗高度，iOS 工具欄收起唔甩底。
- **拍攝唔熄屏**：相機對準期間用 Wake Lock 保持屏幕長亮（唔支援／被拒會靜靜繼續，唔影響拍攝）。
- **掣即撳即應**：`touch-action: manipulation` 消除雙擊縮放延遲；撳掣有 `:focus-visible` 環。
- **PWA 鎖直向**（`orientation: portrait`）、`display: standalone`、離線 app shell；
  允許捏合縮放地圖，唔封死縮放（可達性）。

## 📲 PWA 安裝與更新（真理倉 docs/46 I／UP）

- **安裝要有掣**：圖鑑頁 header 同訓練師頁有「加主畫面」入口；已加入（standalone）自動隱藏。
  Android／Chrome 攔住 `beforeinstallprompt`，撳掣先彈系統對話框；iOS 出 Safari 三步教學卡
  （分享 ⬆ → 加入主畫面 → 加入；唔會叫你裝 Chrome），Esc／點背景／「知道了」都關得。
- **更新要問過人**：新 Service Worker 停喺 `waiting`，唔會背景偷換版。頂部 banner「已下載新版本
  → 立即更新／稍後」；「稍後」記住同一個 worker 唔再嘈；「立即更新」走 SKIP_WAITING，
  並有 2.5 秒 timeout fallback 保證 reload 入新版。
- 檢查時機：回前景（`visibilitychange`）／恢復連線（`online`）／每 30 分鐘，唔准更頻密輪詢。
- 守門：`tests/pwa.test.mjs`（靜態流程檢查，做法照真理倉 minigame `verify.mjs`，零依賴）。

## ⚠️ 已知限制（docs/47 原則三：未做要老實列）

- **未做人手真機驗收（I7／UP）**：「安裝 → 主畫面開 → 斷網開」同更新 banner 流程未喺
  Android Chrome／iOS Safari 各行一次；真機驗收永遠係人做，唔係 README 做。
- **R2 圖 583 覆蓋未由本沙箱核實**：`r2.dev` 唔在網路白名單，逐個 probe 做唔到；
  404 會自動跌返 emoji 後備。可用 AvianDex 側 `npm run cards:probe` 出缺圖清單。
- **雙語 L1 豁免**：`EXCEPTION: L1 — 現有 repo 唔追溯（真理倉 docs/44 定案）— 維持粵語單語`。
- **圖標未齊 docs/33 九檔**：已有統一「精靈球×鳥頭」標誌 —— `favicon.svg` ＋
  `favicon.ico`(16+32) ＋ `icon-16/32/180/192/512.png`（`scripts/gen-icons.py` 純 stdlib 產生，
  零新依賴）；maskable 用 512 兼任（球直徑 59% < 66% 安全區）。缺 **og-image（1200×630）**
  同獨立 maskable 檔 —— 未做原因：沙箱冇字體渲染工具，唔為咗佢新增圖像依賴。
- **舊 `alert()`／`confirm()` 仍在**（對戰複製、刪除確認等 11 處）：docs/46 I8 嘅禁令
  新 PWA 代碼已守（`tests/pwa.test.mjs` 有守門）；全站換 toast 屬後續工作。
- **W2 生成圖 DCT 隱形水印未做**：賽璐璐卡未落隱形水印（貼圖／名片匯出已有可見 ©）。
- **`tests/browser-smoke.cjs` 未於本輪執行**：需 repo 外 playwright＋Chromium（CDN 唔在白名單）。

## 🛠️ 快速開始

```sh
npm ci --include=dev
npm run dev        # 開發
npm run check      # tsc + 全部測試
npm run lint
npm run build      # 生產建置（含容量守門）
```

## 部署與防增肥（後續改版必讀）

請先閱讀 [DEPLOYMENT_GUARDRAILS.md](DEPLOYMENT_GUARDRAILS.md)。
部署採 Vite 原始碼建置、`dist/` 輸出與獨立 Vercel API；鳥卡由 R2 載入。
交付前必跑 `npm run check`、`npm run lint`、`npm run build` 並如實報告驗證範圍。

## ✅ 最近驗證（2026-11-17）

- `npm run check`：**49/49 pass**（tsc ＋ 全部單元測試，含 `tests/pwa.test.mjs`／`tests/version.test.mjs`
  ＋ UP1 建置硬閘：dist/sw.js 無條件 `skipWaiting()` 即 build 失敗）
- `npm run lint`：**0 警告**
- `npm run build`：容量預算 OK — dist 28,894,405 B / 31,457,280 B；index JS 2,858.87 kB（gzip 546.18）
  - 相對 main 基線（2,825.41 kB）**+33.5 kB**：精靈球版三問／賽璐璐流程 ＋ PWA 安裝更新流程；無預算放寬
- 未驗項（真機 I7、R2 逐個 probe、browser-smoke）見上方「已知限制」

## 版本

v3.1.0 — 精靈球版（三問對卡 ＋ 賽璐璐卡 ＋ AvianDex 解鎖互聯）。

## 版權 / Copyright

© 2026 Scout System. All Rights Reserved.

Scout System 原創內容的版權聲明見 [COPYRIGHT.md](COPYRIGHT.md)；第三方套件、模型與素材仍遵循各自授權。
