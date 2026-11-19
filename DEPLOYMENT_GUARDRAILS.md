# BIRD-DEX 防增肥與部署守則

> 優先級：功能／資料／UI 正常運作 > 容量數字。不能用刪除 AI、去背、PWA、鳥卡或存檔功能來換取小包。每次改版請先讀本檔。

## 1. 部署契約（不可隨意改動）

- 專案是 **Vite React SPA + `api/analyze.js` Vercel Function**，不是「把整個 repo 當靜態網站」。
- `vercel.json`：framework `vite`，install `npm ci --include=dev --no-audit --no-fund`，build `npm run build`，output **`dist`**。
- `vite.config.ts`：`outDir: 'dist'`、`emptyOutDir: true`、`sourcemap: false`。部署只發佈 `dist/` 靜態產物，API 由 Vercel 另行打包。
- **不可把輸出目錄改成 `.` 或 `public`**；也不可用整包 `node_modules` 當 Functions 的 `includeFiles`。
- `.vercelignore` 排除 `.git`、本機依賴、`dist`、`.vercel`、快取、測試／報告、上傳資料、備份與日誌、文件，以及維護用 Python／參考資料。`dist` 在雲端重新產生，不上傳本機副本。
- **必須保留上傳**：`src/`（含 JSON 資料庫）、`public/`、`api/`、`package*.json`、HTML／TS／Vite／Tailwind／PostCSS 設定、`scripts/check-deployment.mjs`。不能整個排除 `scripts/`，容量守門需要它。
- 這套設定適用「原始碼建置部署」。如改用 `vercel --prebuilt`，需重新驗證 `.vercel/output` 與忽略規則，不可直接套用另一種部署模式。
- `.gitignore` 與 `.vercelignore` 作用不同；Git 整合仍需取得原始碼，忽略檔不能縮小 Git 歷史，也不能清除 Vercel 舊部署。
- 環境金鑰放 Vercel Environment Variables；不要提交 `.env`、token、使用者照片／錄音或測試上傳。

## 2. 靜態資源：先查引用，再刪除

`public/` 的每個檔案會原樣進入正式產物，即使完全沒有程式引用。

新增或刪除資源前：

1. 搜尋檔名、URL、basename，以及 HTML／CSS／TS／JS／JSON／manifest／維護腳本內的引用。
2. **檢查動態路徑**：本案鳥卡從 R2 `birdcards/0001.avif` 載入，異圖由 `.replace('.avif', '_UR.avif')` 產生。Grep 找不到完整檔名 ≠ 未使用。
3. 檢查 CSS `url()`、PWA precache、外部分享連結／既有公開 URL；不確定就保留並記錄。
4. 原稿、截圖、批次匯出、模型資料、照片庫不要放 `public/`。鳥卡沿用 R2，不要將全套複製回 repo。
5. 備份用 Git；禁止提交 `*.bak*`、`*.tmp*`、`*.old*`、`*.log*`。文件需要截圖時，只保留壓縮後必要的版本，放 `docs/`，不隨網站部署。
6. `scripts/reference_data/` 雖不是執行期資料，仍供鳥名同步使用：**保留在 Git，排除部署**。`src/data/birds.json` 與 `nameAliases.json` 則是執行期必要資料，不可排除。

## 3. 依賴與模型

- 建置、型別、lint、測試工具必須放 `devDependencies`；新增套件前先確認現有程式／原生 API 是否足夠。
- 每次移除套件先搜尋 import、require、動態 import、API 與設定檔，並同步 `package-lock.json`；部署用 `npm ci`。
- React、地圖、動畫、QR、匯圖、TensorFlow、COCO-SSD、IMG.LY 都有功能用途；API 的 `node-fetch` 與 `form-data` 也有備援辨識用途，不可憑大小刪除。
- **`devDependencies` 不代表 Vercel 建置不會安裝／快取它们**。雲端 build 必須有 Vite/TS/Tailwind；正式靜態輸出才不含整包開發工具，Functions 則依實際引用追蹤依賴。
- 去背用 ONNX WASM 約 **22.81 MiB**，是目前最大產物，但不是死重。不得為了過容量檢查刪掉、改空檔、降模型精度或隨意換 CDN；CPU/WebGPU fallback 都要保留。
- CDN 外移會改變 CORS、CSP、離線、版本相容性與供應鏈風險；拆 chunk 主要改善首載，不等於節省總部署空間。這類變更要獨立驗收。
- 不用 `npm audit fix --force` 一次升級整套框架。安全 patch 小步更新並補測；主要版本另排相容性工作。

## 4. 自動容量門檻

`npm run build` 最後自動執行 `scripts/check-deployment.mjs`（純 Node，零新增依賴）；`npm run check:size` 可重新量測。

| 項目 | 原始檔案容量上限（非 gzip） |
|---|---:|
| `dist/` 合計 | 30 MiB |
| `public/` 合計 | 512 KiB |
| 一般單一產物 | 4 MiB |
| 唯一已核准例外：`ort-wasm-simd-threaded.jsep-*.wasm` | 24 MiB |

同時拒絕 source maps、備份、log、測試上傳／依賴／參考資料漏入產物、符號連結，以及遺失必要 PWA 檔案。HTML 必須只有一個 `/manifest.json` link。

- PWA manifest 唯一來源是 **`public/manifest.json`**；VitePWA 使用 `manifest: false`，仍保留 service worker 註冊、更新與既有預快取策略。
- 上限不是可任意填滿的配額。每次增加大檔要在 PR 說明用途、前後容量、不可替代原因與回歸證據；不要只調高上限讓 CI 過關。
- GitHub Actions 執行 `check` → `lint` → `build`；Vercel 的 build 自身也執行容量守門。CI／測試程式不進正式部署來源。
- 本檢查**不是** Vercel 帳戶計費報表：不含平台的 Functions 包、Git checkout、build cache 或多個舊部署。仍需在 Dashboard 監控各項用量、檢查部署保留政策；不可以擅自刪掉正式部署、回滾版本或使用者資料。

## 5. 每次改版的必要檢查

建議 Node 22 LTS（本次驗證版本）；順序：

```sh
npm ci --include=dev --no-audit --no-fund
npm run check
npm run lint
npm run build
npm audit --omit=dev
```

`check` 包含前端／Vite 設定型別檢查，以及 Node 內建測試。ESLint 啟用 TS recommended／React Hooks 規則；既有動態相機 API／AI response 的 `any` 另行逐步收斂，不能假稱已有全程強型別。

### 選用瀏覽器回歸（不把 Playwright 裝進本專案 dependencies）

先在一個終端開 `npm run preview -- --host 0.0.0.0`；另一個終端：

```sh
npm install --prefix /tmp/birddex-qa --no-audit --no-fund playwright
/tmp/birddex-qa/node_modules/.bin/playwright install --with-deps chromium
PLAYWRIGHT_MODULE=/tmp/birddex-qa/node_modules/playwright node tests/browser-smoke.cjs
```

可用 `PREVIEW_URL` 指定測試網站、`CHROMIUM_EXECUTABLE_PATH` 指定現有 Chromium。預覽來源允許 `.e2b.app`，但不全開任意 Host；瀏覽器 API 呼叫維持 `/api/analyze` 同源。

瀏覽器測試涵蓋手機尺寸導覽、搜尋、舊存檔遷移、圖鑑詳細／收藏／地圖／對戰、假相機+假 AI 的拍照投擲與失敗分支，以及**真實產生的 service worker 離線 app shell**。圖片、圖磚、相機與 AI 有 mock，不代表實機／第三方服務已驗證。

### 實機／Preview Deployment 上線驗收清單

- [ ] 569 種圖鑑、搜尋篩選、R2 普通卡／異圖與缺圖 fallback。
- [ ] 相機授權／拒絕、光學／數位縮放、GPS、即時框、AI 成功／非鳥／低信心／備援。
- [ ] 投擲按鈕正常點擊、跳過、IV/CP/稀有度/XP、收藏落盤與重新整理；不清除既有存檔。
- [ ] 貼圖實際下載模型、CPU/WebGPU 推論、去背／PNG 下載／分享。
- [ ] 收藏排序、個體代表／刪除、地圖圖磚與足跡、觀鳥達人設定／改名。
- [ ] 對戰、本機／匯入對手 IV、隊伍匯出入、QR 與結果匯圖／原生分享。
- [ ] PWA 安裝、舊版本升級、離線再次開啟；注意離線 app shell 不代表線上辨識也能離線。
- [ ] `/api/analyze` 在 Vercel 實際回 JSON，不被 SPA rewrite 吞掉；正式金鑰只放後端。

前端聲音辨識在原始碼中本來就停用，這次保持原狀；API 的聲音備援路徑仍保留。不得把未上線功能說成已通過實機測試。

完整本次容量與驗證紀錄見 [瘦身報告](docs/SLIMMING_REPORT.md)。

## 6. 真理倉新規則對照（2026-11-17 同步）

真理倉入口：https://github.com/playerkousas-rgb/readme （S/F/A/W/V 五鐵律以外嘅新增規定）。
本表係「新規定 → 本 repo 點跟」嘅單一對照；違反＝唔准 deploy。

| 真理倉規則 | 本 repo 狀態 |
|---|---|
| **docs/46 PWA I1–I8／UP1–UP5**（安裝要有掣、更新要問過人） | ✅ 已做：`registerType: 'prompt'`（唔准 autoUpdate 背景偷換版）；安裝入口（圖鑑 header＋觀鳥達人頁，standalone 自動隱藏）；iOS 三步教學卡；更新 banner 立即更新／稍後（稍後記住 worker）；SKIP_WAITING＋2.5s timeout fallback；visibility／online／30 分鐘三掛勾。守門 `tests/pwa.test.mjs`。**I7 真機未驗**（README 已知限制） |
| **docs/13 雙版號 V1–V6** | ✅ `package.json` ↔ `index.html` `<meta name="app-version">` ↔ `src/version.ts` ↔ 觀鳥達人頁尾可見 `v3.3.0` 四處同步；守門 `tests/version.test.mjs`。SPA 冇檔名版號，以 meta＋title＋頁尾代替 |
| **docs/12 版權 W1／W2** | ✅ W1：`<meta name="copyright">` ＋ 觀鳥達人頁尾可見 ©（`tests/copyright.test.mjs`）。⚠️ W2 生成圖 DCT 隱形水印**未做**（README 已列限制） |
| **docs/47 README 寫作紀律** | ✅ README 每句「已修」有檢查兜底、「未做」入「已知限制」、冇「理論上應該 work」字樣 |
| **docs/44 雙語 L1–L6** | `EXCEPTION: L1 — 現有 repo 唔追溯（真理倉 2026-11-08 定案）— 維持粵語單語` |
| **docs/50／51 App Store 白名單** | 2026-11-19 接入 `entry-gate`：`public/store_gate_v1.0.js`（真理倉 sha256 `45de189d…e3d5b`，原封不動）＋根目錄 `index.html` 掛載；`portalIds: ['appstore']`、`silentPortalIds: ['library']`、`allowStandalone: true`、`autoRedirectSeconds: 0`、`supportNudge` 關。SG18 頂欄 `#storeSupportTop` 用 `ScoutStoreGate.getAppStoreUrl('birddex3')`（slug 對 `website/migrations/20261116-app-slug-seed.sql` L21），零 Supabase 直連。本 app 有相機／PWA／本機紀錄，頂層 `entry-gate` 先係安全做法，唔用 `iframe-only`。本機模擬 7 項 PASS，真機未做 |
| **docs/33 圖標九檔** | 大部分合規（2026-11-17 重做）：統一「快門×鳥頭」標誌 —— favicon.svg／favicon.ico(16+32)／icon-16·32·180·192·512 PNG，全部由 `scripts/gen-icons.py`（純 stdlib）產生；manifest maskable 掛 512（球 59% < 66% 安全區）。缺 og-image ＋獨立 maskable 檔（README 已列限制） |
| **docs/04 設定層／隱藏超管** | 不適用：本 repo 係輕量遊戲 App（無帳號後台、無系統級開關面），唔屬「系統級 app」定義 |

**EXCEPTION: S7 — 真理倉 `guard.mjs` 嘅 5MB dist／2MB bundle 通用上限不適用於本 repo**：貼圖去背用嘅
`ort-wasm-simd-threaded.jsep-*.wasm` 單檔約 23.9MB，屬既有功能必需（S/F/A/W/V：唔准為縮體積刪去背）。
本 repo 沿用 §4 自己嘅 30MB 輸出預算＋24MB WASM 特例，由 `scripts/check-deployment.mjs` 守門；唔改真理倉門檻。
其餘 guard 項目已修：`.env.example` 補回；CI actions 已釘 commit SHA（A16）。
本機另加零依賴 `npm run preflight`（`scripts/preflight.mjs`）做白名單／版號／storage key 靜態檢查。

守門腳本跟實作調整（唔係放寬）：`registerSW.js` 唔再係 dist 必要檔 —— 註冊改由
`src/lib/pwa.ts` 的 `virtual:pwa-register` 控制（UP1 prompt 模式必需），`sw.js` 仍然必要。

## 7. 跨版本移植邊界（共有功能升級後新增）

- `skw-birdex2` 與 `birddex3` 是不同進階路線；移植共有相機／圖鑑／存檔／觀鳥達人／PWA 的改善，不代表可整包覆蓋 `types.ts`、`useCollection.ts` 或改 v3 的 IV／CP／色違／投擲規則。
- **禁止以存檔降級名義自動刪照片、貼圖或個體歷史**。quota 失敗需明示未落盤並提供完整備份；備份內有使用者照片／位置，別放 Git、public 或部署包。
- PWA PNG 已補齊，`public` 約 339 KiB；未提高 512 KiB 上限，往後不要重複加入原稿。
- 跨版本或相機／存檔變更後，除 Node 測試外，請重跑 `tests/browser-smoke.cjs` 與 `tests/browser-shared.cjs`（使用 repo 外 QA 依賴），特別檢查取消、quota、圖片 fallback 和 v3 接續投擲。
- 本輪完成範圍與尚未移植項目見 [SHARED_FEATURE_UPGRADE.md](docs/SHARED_FEATURE_UPGRADE.md)。
