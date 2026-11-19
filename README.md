# BIRD-DEX 3 · BirdEx（快門版）🐦🔴

BirdEx 係「快門」：負責喺野外**捉**——影相 → 答幾條特徵 → 自己對卡 → 解鎖。
權威資料同「學」永遠喺兄弟 App **AvianDex**（圖鑑）嗰邊，兩邊共用同一套 `NO. NNNN` 編號，
詳見 [docs/AVIANDEX_INTEROP.md](docs/AVIANDEX_INTEROP.md)。

> **成個流程一句講晒：**
> 行山見到雀 → BirdEx 影低佢 → 答 2–3 條特徵 → 即刻彈候選卡自己對 → 揀中
> → 即刻生成賽璐璐鳥卡 → 同時 Keep 埋原相做證據 → 跳去 AvianDex 解鎖 NO.編號

## 🎮 核心玩法（快門版）

1. **📷 影相做證，唔係俾 AI 睇**
   後置相機三連拍取最 Sharp 一張；張相只係「證據」。**唔用 AI 自動認雀**——
   市面冇免費認雀 API（Merlin 冇公開 API、BirdNET 要自架 Backend、Google Lens 認唔到品種、
   eBird key 申請唔到），所以主流流程完全唔靠佢哋，唔使 Backend。

2. **❓ 答幾條特徵，即刻出候選卡**
   - 佢有幾大？\[細 / 中 / 大\]
   - 佢咩色為主？\[黑白 / 白 / 黑 / 啡棕 / 灰 / 綠藍 / 紅黃\]
   - 成隻雀個身形係點？\[長頸長腳 / 游水肥矮 / 長翼海鳥 / 鉤嘴猛禽 / 細細粒 / 中等鳥身\]
   - 佢個嘴係點？\[尖 / 長 / 闊 / 鉤\]（選填，唔知可以唔答）

   **答夠 2 條就出候選卡**，唔使等全部答完；轉任何一格即刻重新排。
   例子：想影大白鷺 → 撳「大」＋「白」就已經排第一，加「長頸長腳」就收窄到 13 隻。
   唔再硬過濾：就算答錯一格（例如將長頸長腳嘅鷺撳咗「游水肥矮」，或者嘴形撳錯），
   正確嗰隻仍然會喺名單前列，畫面會提示「邊一格似乎唔啱」而唔會靜靜雞踢走佢。
   舊版 Q3/Q4（「鶲類／柳鶯／蘆鶯」同「尾形」）係鳥類學術語、由科硬推，
   一般用戶等於冇得答，所以已經退役。身形由科推導（`src/data/quizTraits.ts`），
   89 個科 100% 有歸屬；「中等鳥身」係最籠統嘅選項，計分只計一半。

3. **🤔 自己對卡，最後決定權喺小朋友**
   候選卡連同自己張原相並排，對吓 shape、嘴、尾——**揀中先算「拍到」**，
   唔係 AI 話事。

4. **🎨 每隻拍到嘅精靈 Keep 兩張圖**
   - **原相 = 證據**：小朋友自己影嘅真相，矇都係真相，shape／嘴／尾一概唔改。
   - **賽璐璐版 = 精靈卡**：前端 Canvas 即時轉——Posterize（量化到 4–5 級平色塊）
     ＋ Sobel Edge Detection（加粗黑邊）。撳一下即變，零 upload、零 Backend、零錢。
   卡面預設顯示賽璐璐版；撳卡上「賽璐璐 ⇄ 原相」隨時轉。
   每筆拍攝記錄**永久保存原相＋賽璐璐卡＋拍攝日期＋地點**（結果頁紀念條＋詳頁拍攝紀錄都顯示），
   紀念價值睇得到、帶得走。

5. **🔗 解鎖 AvianDex（兄弟互通）**
   拍攝記錄：`{ no: "0008", captured_at, location, method: "photo", photo_original_url, photo_cel_url }`
   拍攝結果頁／詳頁一鍵跳 `https://avian-dex.vercel.app/?unlock=0008`，
   AvianDex 嗰格由剪影變做小朋友張卡。進度存 localStorage，唔使 login、唔使 Backend。
   反向都通：AvianDex 開 `birddex3.vercel.app/?no=0008` 會直接打開嗰隻鳥詳頁
   （合約見 [docs/AVIANDEX_INTEROP.md](docs/AVIANDEX_INTEROP.md) §3b）；彈窗被擋會自動退回
   同分頁導航，`?unlock=` 照樣生效。

6. **🆘 Merlin 只做後備**
   特徵下面有個細掣「唔肯定？試下用 Merlin 影相認」——真係唔肯定先跳出場外，
   認完返嚟輸入 NO. 編號／鳥名直接揀。主流永遠係：影相 → 答特徵 → 對卡 → 解鎖。

## 🚫 明確唔做嘅嘢

- ❌ 唔再申請 eBird API（AvianDex 583 隻靜態名單直接用）
- ❌ 唔再以聽聲做主流（香港公園雜音太多；錄音頁維持停用）
- ❌ 唔再用 AI 自動認係咩雀（`/api/analyze` 保留但拍攝流程不再呼叫）
- ❌ 唔再用 AI 插畫做**拍攝卡面**（卡面只有小朋友自己嘅相）
- ❌ 唔為辨識起 Backend

## 🧩 保留嘅 v3 玩法

IV／CP／性格個體值、稀有度升階（UC→LR）、全息閃卡、去背貼圖、對戰、地圖熱點、
圖鑑收集進度、觀鳥達人 XP／稱號、PWA 安裝，全部保留。即時鳥類偵測框（COCO-SSD）
只作**取景輔助**，唔認品種、唔參與拍攝判定。

## 🗄️ 資料與同步

- `src/data/birds.json`：583 隻（AvianDex 編號權威）＋推導特徵三欄。
- `scripts/sync_from_aviandex.py`：可重跑同步（輸入快照喺 `scripts/reference_data/`）。
- `src/data/nameAliases.json`：由新名單重建，供 Merlin 後備嘅名稱／學名查找。
- R2 `birdcards/NNNN.avif` = **AvianDex NO. 編號直對**（AvianDex 側 `ILLUSTRATION_REPAIRS` 已補
  29 個改配物種槽位 ＋ 14 個新編號並上載，583/583 有圖；真相見 interop 文檔 §4）。

## 🎨 設計基調（2026-11-17 改版）

- **淺色陽光系**：雲白底 `#F3F6FC` ＋ 白卡 ＋ 草綠主色 `#0FA958` ＋ 快門紅 `#FF3366`
  — 擺脫之前「太陰沉」嘅近黑藍底；相機取景器／拍攝結果時刻幕維持深色玻璃（影像上先看得清）。
- **觀鳥達人勳章**：Lv1–12 每級唔同圖（銅圓→銀盾→金六角→傳說星，12 色 12 樣），
  頭像角標＋12 級解鎖牆＋分享名片一齊出，俾用家睇到進度、容易投入。

## 📱 戶外手機適配（拍攝＝純外出用）

- **390px 手機優先**：底部導覽＋`safe-area-inset` 全面覆蓋（瀏海／底部橫條唔遮內容）；
  `100dvh` 動態視窗高度，iOS 工具欄收起唔甩底。
- **拍攝唔熄屏**：相機對準期間用 Wake Lock 保持屏幕長亮（唔支援／被拒會靜靜繼續，唔影響拍攝）。
- **掣即撳即應**：`touch-action: manipulation` 消除雙擊縮放延遲；撳掣有 `:focus-visible` 環。
- **PWA 鎖直向**（`orientation: portrait`）、`display: standalone`、離線 app shell；
  允許捏合縮放地圖，唔封死縮放（可達性）。

## 📲 PWA 安裝與更新（真理倉 docs/46 I／UP）

- **安裝要有掣**：圖鑑頁 header 同觀鳥達人頁有「加主畫面」入口；已加入（standalone）自動隱藏。
  Android／Chrome 攔住 `beforeinstallprompt`，撳掣先彈系統對話框；iOS 出 Safari 三步教學卡
  （分享 ⬆ → 加入主畫面 → 加入；唔會叫你裝 Chrome），Esc／點背景／「知道了」都關得。
- **更新要問過人**：新 Service Worker 停喺 `waiting`，唔會背景偷換版。頂部 banner「已下載新版本
  → 立即更新／稍後」；「稍後」記住同一個 worker 唔再嘈；「立即更新」走 SKIP_WAITING，
  並有 2.5 秒 timeout fallback 保證 reload 入新版。
- 檢查時機：回前景（`visibilitychange`）／恢復連線（`online`）／每 30 分鐘，唔准更頻密輪詢。
- 守門：`tests/pwa.test.mjs`（靜態流程檢查，做法照真理倉 minigame `verify.mjs`，零依賴）。

## ⚠️ 已知限制（docs/47 原則三：未做要老實列）

- **未做人手真機驗收（I7／UP／白名單）**：「安裝 → 主畫面開 → 斷網開」同更新 banner 流程未喺
  Android Chrome／iOS Safari 各行一次；APP STORE／圖書館／主畫面／SG18 掣亦只經本機模擬，
  真機驗收永遠係人做，唔係 README 做。
- **拍攝紀錄備份風險**：`bd_collection_v3` 存有原相／IV／地點等重要紀錄，但目前只有
  儲存失敗橫幅同 ErrorBoundary 提供「下載完整備份」，沒有常時匯出／還原入口；換機或清快取會冇紀錄。
  落 `entry-gate` 唔會改 storage key／格式，但唔解決呢個風險（用家已知悉並接受）。
- **R2 圖 583 覆蓋未由本沙箱核實**：`r2.dev` 唔在網路白名單，逐個 probe 做唔到；
  404 會自動跌返 emoji 後備。可用 AvianDex 側 `npm run cards:probe` 出缺圖清單。
- **雙語 L1 豁免**：`EXCEPTION: L1 — 現有 repo 唔追溯（真理倉 docs/44 定案）— 維持粵語單語`。
- **地圖／對戰已退役**（2026-11-17）：快門版玩法係「影相→答特徵→對卡」，冇地區生成、
  用戶亦指示「不要對戰了」→ Navbar 同 App 路由已移除（`MapScreen`／`BattleScreen` 檔案保留歸檔）。
- **圖標未齊 docs/33 九檔**：已有統一「快門×鳥頭」標誌 —— `favicon.svg` ＋
  `favicon.ico`(16+32) ＋ `icon-16/32/180/192/512.png`（`scripts/gen-icons.py` 純 stdlib 產生，
  零新依賴）；maskable 用 512 兼任（球直徑 59% < 66% 安全區）。缺 **og-image（1200×630）**
  同獨立 maskable 檔 —— 未做原因：沙箱冇字體渲染工具，唔為咗佢新增圖像依賴。
- **舊 `alert()`／`confirm()` 仍在**（對戰複製、刪除確認等 11 處）：docs/46 I8 嘅禁令
  新 PWA 代碼已守（`tests/pwa.test.mjs` 有守門）；全站換 toast 屬後續工作。
- **W2 生成圖 DCT 隱形水印未做**：賽璐璐卡未落隱形水印（貼圖／名片匯出已有可見 ©）。
- **主色仍係由名／科推導**：`src/data/birds.json` 嘅 `main_color` 來自
  `scripts/sync_from_aviandex.py`（中文名主體色 → 科級先驗 → 啡棕），唔係逐張相量出嚟。
  2026-11-19 修咗「全 18 種鷺科一齊標白」呢個 bug（黑鳽／綠鷺／紫背葦鳽 之前全部
  標白，令「白色」嗰組失真）；其餘 583 隻入面仍有零星錯色（例如「白頭鵯」標白、
  「綠頭鴨」標綠藍），`tests/quiz-filter.test.mjs` 有守住已知嘅幾個唔准回歸。
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
交付前必跑 `npm run check`、`npm run lint`、`npm run build`、`npm run preflight` 並如實報告驗證範圍。

## 🔐 準入白名單（SG18／SG19）

- Vercel 實際發佈根目錄＝`dist/`（`vercel.json` 的 `outputDirectory`）；閘門檔放 `public/`，
  Vite build 會原封不動抄去 `dist/store_gate_v1.0.js`。
- 設定：`mode: 'entry-gate'`、`portalIds: ['appstore']`、`silentPortalIds: ['library']`、
  `allowStandalone: true`、`autoRedirectSeconds: 0`。直打網址只見 **1 粒** APP STORE 掣；
  由圖書館入會靜默放行並回報 `matchedPortalId: library`；已加主畫面照撳即得。
- 頂欄 ❤️「讚好／收藏」用 `ScoutStoreGate.getAppStoreUrl('birddex3')` 開新分頁返主站詳情卡，
  零 Supabase 直連／零寫死網址／零 bump RPC；`ScoutStoreGate` 未載入時保持 `hidden`（唔出死連），
  `[hidden]{display:none}` 同 `@media print` 均已設。
- 本機模擬：`npm run preflight` 17/17 ＋ `tests/store-gate.test.mjs` 7/7；**真機未做**。

## ✅ 最近驗證（2026-11-19）

- `npm run check`：**65/65 pass**（tsc ＋ 全部單元測試，含 `tests/pwa.test.mjs`／
  `tests/version.test.mjs`／`tests/store-gate.test.mjs` 7 項白名單本機模擬）
- `npm run lint`：**0 警告**
- `npm run preflight`：**17/17 PASS**（版號／Vercel `dist` 根目錄／script 引用／storage key／
  零 Supabase 直連／真理倉閘門 sha256／SG19 設定／SG18 掣）
- `npm run build`：容量預算 OK — dist 28,417,336 B / 31,457,280 B；index JS 2,687.54 kB（gzip 495.50）
  - 閘門檔 43,249 B 由 `public/` 原封不動抄入 `dist/` 根；sha256 `45de189d…e3d5b`
  - 真理倉通用 S7（dist < 5MB）不適用於本 repo 的去背 WASM，見 `DEPLOYMENT_GUARDRAILS.md` EXCEPTION
- **真機未做**：APP STORE／圖書館／主畫面／SG18 掣全部只經本機模擬驗證，未上真機；
  Vercel Dashboard 亦未實查（以 `vercel.json` 為準）。未驗項另見上方「已知限制」

## 版本

v3.4.0 — 快門版（第 3 題改問**身形**／外形；答 2 條即出候選＋軟計分對卡 ＋ 賽璐璐卡 ＋ AvianDex 解鎖互聯 ＋ PWA 安裝／更新流程）

v3.3.0 — 第 3 題一度改問「喺邊度見到」（用家指出嗰個係地點、唔係外形，已由 v3.4.0 取代）。

v3.2.0 — 五問對卡初版（Q4/Q5 鳥類學術語＋硬 filter，已由 v3.3.0 取代）。

## 版權 / Copyright

© 2026 Scout System. All Rights Reserved.

Scout System 原創內容的版權聲明見 [COPYRIGHT.md](COPYRIGHT.md)；第三方套件、模型與素材仍遵循各自授權。
