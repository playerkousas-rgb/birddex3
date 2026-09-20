# 儲存瘦身、部署優化與回歸報告

日期：2026-09-20。基準：`8420c3305671fd6cb405270227f641340dd4d6a4`。

## 結論

完成安全範圍內的資源／依賴清理，新增 Vercel 來源排除、明確輸出路徑、容量守門、品質 CI 與後续改版守則。未刪除鳥種資料、辨識／去背模型、API 備援或任何可用功能，正常畫面配置不改；另外修正已重現的操作／資料顯示／模型生命週期 bug。

**自動檢查與模擬瀏覽器流程未發現回歸；不把這解讀成所有實機、所有外部服務都已獲得 100% 保證。** 本次沒有推送／正式部署，也沒有清除 Vercel 歷史部署或使用者資料。

## 1. 實際刪除與容量

以下刻意區分原始碼、靜態產物、依賴與平台快取；不同欄位不要相加當作 Vercel 帳單節省。

| 項目 | 改前 | 改後 | 節省／效果 |
|---|---:|---:|---:|
| `public/cards/kingfisher_card.png` | 299,479 B | 已移除 | **299,479 B（292.46 KiB）**，唯一刪除的受 Git 追蹤檔案 |
| `public/` 檔案合計 | 300,148 B | 669 B | 99.78% 減少；保留 favicon 與正式 manifest |
| `dist/` 檔案合計（非 gzip） | 28,783,347 B | 28,483,749 B | **299,598 B（292.58 KiB）**；27.45 → 27.16 MiB |
| `node_modules` 本機 `du -sb` | 554,095,666 B | 553,404,034 B | 約 **675.42 KiB** 淨減少；含兩項安全 patch 的增加，不是正式網站節省 |
| 原始已追蹤檔案中，新增規則排除的維護資料／文件 | 1,672,206 B | 不進部署來源 | **約 1.59 MiB**；仍保留在 Git |
| 原始已追蹤檔案總和 vs 本次忽略後的來源候選清單 | 3,045,522 B | 1,078,977 B | 約 64.6% 減少；不含依賴／快取，不等於 Git integration 實際 checkout 或平台計費大小 |

### 刪除證據

- 全文搜尋 HTML、CSS、TS/JS、JSON、manifest 與 Python／CJS 維護程式後，沒有 `kingfisher_card.png` 或本機 `/cards/` 的引用，也沒有從該目錄動態組圖路徑。
- 實際鳥圖讀取 `birds.json` 的 R2 `.avif` URL，異圖讀取相同 URL 的 `_UR.avif` 版本。沒有動這些資料或其遠端圖片。
- 原本未發現受追蹤的 `*.bak*`／`*.tmp*`／`*.old*`：沒有虛報備份刪除量；已補忽略規則與產物拒絕檢查。
- 不再生成第二份 `dist/manifest.webmanifest`（原 382 B）；改以既有 `public/manifest.json` 為唯一來源，原 `index.html` manifest link 保留。其他小幅差額來自 SW 清單與 bug 修正後的 JS/CSS。
- `clsx`、`tailwind-merge` 無程式／設定引用，已從 package 與 lock 移除，安裝套件 607 → 605；它們原本沒有被打入 JS，所以不把本機依賴大小當成 bundle 節省。
- Git 歷史中的圖片仍存在；本次不改寫歷史、不 force push。

### 僅排除部署、不刪除的維護資料

- `scripts/reference_data/ebird_en.csv`：1,476,423 B。
- `scripts/reference_data/ebird_sci2cn_sim.json`：64,491 B。
- `scripts/reference_data/wiki_ref.json`：71,984 B。
- 共 1,612,898 B，仍被 `fetch_reference_data.py`／`reverse_lookup_cn.py` 等维护流程使用。
- 另排除 Python 維護腳本、`BIRD_ID_MAPPING.csv`、一次性 R2 維護腳本與 Markdown 文件。新增測試、CI 與報告也不隨部署上傳。

## 2. 部署與防增肥

- 新增 `.vercelignore`／`.gitignore`，阻止本機依賴、快取、產物副本、上傳資料、備份與 log 混入。
- 新增 `vercel.json`：Vite、`npm ci --include=dev`、`npm run build`、`outputDirectory: dist`。保留根目錄 `/api/analyze.js`，不做會吞掉 API 的全域 SPA rewrite。
- Vite 明確設置清空輸出、停用 sourcemap，PWA 唯一 manifest；既有 SW 註冊、更新、預快取模式保留。
- **最大必要檔案**：去背 WASM 23,914,392 B（22.81 MiB）。它與 ONNX CPU/WebGPU loader 未移除、未更換 CDN 或模型。這是不能在「功能不變」下直接砍掉的主要容量。
- 新增純 Node 容量檢查，正式 build 必跑：`dist ≤ 30 MiB`、`public ≤ 512 KiB`、普通單檔 ≤ 4 MiB，特定去背 WASM ≤ 24 MiB。超標、備份／map 漏入、PWA 檔案缺失會 exit 1。
- 新增 `npm run check`、可運作的 ESLint 設定，以及 GitHub Actions。沒有為測試／lint 另外加入龐大正式依賴。
- 根目錄 [DEPLOYMENT_GUARDRAILS.md](../DEPLOYMENT_GUARDRAILS.md) 詳述規則、限制與操作；[AGENTS.md](../AGENTS.md) 和 README 都有入口。

## 3. 已修正的 bug／安全問題

1. **投擲按鈕點不到**：瀏覽器實測發現裝飾背景攔截底部點擊；兩層背景改 `pointer-events-none`，外觀／投擲得分公式不變。修後以正常點擊（沒有 force）完成捕捉。
2. **即時偵測模型生命週期**：離開掃描頁釋放模型，取消後才完成的載入也釋放；失敗下載不再留下 unhandled rejection。慢裝置只允許一個推論在途，關閉後不發布舊偵測框。模型／閾值／預期頻率不變。
3. **模型離線提示**：模型載入失敗顯示可繼續拍攝辨識，不再永久顯示載入中；相機 → API 辨識仍可用。
4. **鳥名解析**：`Passer montanus (Tree Sparrow)` 原先只取三詞而匹配失敗，新增兩詞學名 fallback；索引與查詢的句點正規化一致。既有直接／無標點 alias 對映有回歸測試。
5. **本機對手 IV 顯示 `?%`**：本機資料讀 `iv.percent`，匯入對手仍讀 `ivPercent`。CP／勝負算法不變。
6. **錄音 callback 舊閉包**：補上 `processAudio` 依賴與定義順序，不改動原本「前端聲音辨識停用」狀態。
7. **重複 manifest**：原正式 HTML 同時連結兩個 manifest，現在只保留原先第一個 `/manifest.json`，防止設定分歧。
8. **安全 patch**：`form-data 4.0.5 → 4.0.6`、`protobufjs 7.6.4 → 7.6.6`；前者 package 最低版本同步更新。實際 multipart serialization／API 備援控制流程均補測；未作框架 major upgrade。

## 4. 驗證紀錄

### 自動化

- `npm run check`：**16 項測試通過**，含前端及 Vite 設定型別檢查。
- `npm run lint`：**通過，0 warning / 0 error**。
- `npm run build`：**通過**；13 個檔案，28,483,749 B，容量守門通過。
- 額外把 `.vercelignore` 允許的來源複製至隔離目錄，**不含維護參考資料、測試、文件**，重新 `npm ci --include=dev` + `npm run build`：通過，產物大小一致。這不是 Vercel 雲端部署的替代品，但可確認沒有誤排建置必要檔案。
- `npm audit --omit=dev`：**0 vulnerabilities**（本次執行時）。
- `git diff --check`：通過。

Node 測試涵蓋：569 種資料完整性與 R2 URL、所有 alias 指向、原有 alias 匹配、學名 fallback、稀有度／XP 邊界、IV／CP／投擲加成範圍、API health／方法／空檔／非媒體、Bird Gate／低信心／HF／Nyckel／BirdNET mock 備援、multipart 格式、模型載入失敗與釋放／並行限制、容量總額／單檔／public 門檻與備份漏入拒絕、PWA manifest／SW 必要檔、部署與依賴分類契約。

### Chromium 正式產物測試

`tests/browser-smoke.cjs` 已在 **390 × 844** 手機尺寸、真正的 production bundle 上執行：

| 核心流程 | 結果與範圍 |
|---|---|
| 圖鑑、搜尋、導覽、空收藏／空對戰、訓練師 | 通過 |
| v2 → v3 存檔迁移、重整後收藏保留 | 通過，使用隔離測試存檔 |
| 已捕捉篩選、詳細頁 IV/CP、個體資訊 | 通過 |
| 有資料的收藏、地圖容器、對戰與本機 IV | 通過；圖磚／卡圖以 mock 回應 |
| 相機 → 2x 縮放 → 快門 → 辨識 → 正常點擊投擲 → 收藏 | 通過；相機畫面與 AI 回應為 mock |
| 捕捉次數、照片 dataURL、個體紀錄、XP 落盤 | 通過 |
| 非鳥回應進失敗頁、不增加捕捉次數 | 通過 |
| 即時模型不可用時仍能拍攝 API 辨識 | 通過，沒有未處理 JS page error |
| PWA 單一 manifest、真正 SW 安裝、斷網重整 app shell | 通過（此 SW 測試沒有 mock SW） |

瀏覽器工具和測試產生物只在 repo 外的臨時 QA 環境安裝，不進 `package.json`、Git 或部署。

### 尚需實機／真實服務驗收（不能冒稱全部通過）

- 真實相機權限與鏡頭縮放、GPS 精度、TensorFlow 模型成功下載與實際影像預測。
- Vercel Preview/Production 的 Function 打包、金鑰、HF／Nyckel／BirdNET 線上成功回應及延遲。
- R2 真實圖片／異圖、地圖外部圖磚與跨域服務可用性。
- IMG.LY 實際去背與 WASM CPU/WebGPU fallback；下載／原生分享／QR 匯圖、對戰隊伍匯出入；PWA 安裝到實機與既有安裝版本更新。
- 上述程式／資料／必要資源保留；此環境未完整測試硬體和第三方服務，不能宣稱絕對零回歸。

## 5. 保留的警告與後續工作

- Vite 仍有既有 **>500 kB chunk** 提示（含 TF/ONNX 的主 bundle 約 2.81 MB）。這是非致命效能警告，不是 build error；未調高警告門檻來掩蓋。若要改善首載，另做 lazy loading 並驗證 PWA／模型初始化，不能把它當部署總容量必然會下降。
- 全依賴 `npm audit` 仍有 **11 項 dev/build tool chain 警告**（1 low、3 moderate、7 high）；`--omit=dev` 為 0。Vite／PWA 完整修復建議牽涉 major upgrade，這次沒有以 `--force` 冒險升級。應另排安全升級工作，開發伺服器不要曝露到不可信環境。
- `.vercelignore` 不會刪除舊部署、遠端 build cache，也不代表 npm devDependencies 完全不佔 build cache。實際 quota 仍須登入 Dashboard 核對；不要未經授權清除可回滾部署。
- 這次產物縮減約 1.04%，而部署來源清單縮減約 64.6%。數字差異是因為參考資料本來就不會被 Vite 打入 `dist`，以及主要 WASM 本來就是必要功能；沒有誇大省下幾百 MB 的正式部署空間。

## 後續紀錄：跨版本比較與版權補齊

同日後續加入 Scout System 共用版權字串、metadata 與分享名片標示後，
`dist` 為 **28,484,031 B**（比本報告原測量增加 282 B），自動測試增至 **18 項**。
本報告原有容量／測試數字保留為前一輪快照。另一版本的比較、後續新發現的待辦與驗證範圍，見 [VERSION_COMPARISON.md](VERSION_COMPARISON.md)。
