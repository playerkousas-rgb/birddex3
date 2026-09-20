# 共有功能優化升級（不合併進階路線）

日期：2026-09-20。範圍：參考 skw-birdex2 的共同功能設計，在目前 birddex3 工作區做相容升級。

## 邊界

**不是把 v2 覆蓋到 v3，也不是加入 v2 的所有新玩法。**

- 沒有加入每日登入、任務、成就、熱點蓋章、夥伴鳥、照片牆或音效系統。
- v3 的 `birdStats.ts`、`ThrowCaptureScreen.tsx`、`BattleScreen.tsx`、`MapScreen.tsx`、`stickerMaker.ts`、`liveDetect.ts`、`types.ts` 本輪保持 byte-for-byte 相同。
- `useCollection.ts` 裡的捕捉／XP 加成／稀有度／IV／代表個體／去背貼圖更新邏輯，與本輪開始時逐段比較一致。只改共用存檔讀寫和故障處理。
- `birds.json`、`nameAliases.json` 本輪未改，保留 species ID、圖片 URL、舊收藏與對映。
- 未增加套件，未改後端模型／Bird Gate，未調高容量門檻。
- [未變更區域 SHA-256](SHARED_UPGRADE_UNCHANGED.json) 是本輪「修改前工作區 vs 修改後工作區」的稽核快照，不是對 Git HEAD 的比較，也不是禁止未來另案修復 v3 功能。

## 已完成的共有功能升級

### 1. 相機與縮放

新增 `src/lib/camera.ts` 統一相機 ownership 與拍照裁切：

- 每次重啟先停舊串流；離開掃描器會停止鏡頭並脫離 video。
- 使用 request epoch，使用者離開頁面之後才允許相機，或較舊的開啟請求較晚完成時，立即釋放該串流，不會搶回新鏡頭。
- `video.play()` 失敗也清理串流；不支援 `getCapabilities()` 的手機仍可拍照。
- 硬體 zoom 請求序列化；硬體不接受 zoom 時可採數位 fallback，避免把既有硬體倍率再次完整相乘。
- 真正送去辨識的 JPEG，現在按照 **object-cover 的可視區域 + 中央數位 zoom** 裁切，不再只是 CSS 放大預覽、卻上傳整幅畫面。
- 在按快門時鎖定可視區尺寸，避免辨識中隱藏 Navbar 改变容器高度後拍到不同範圍。
- 三張短連拍中選相對清晰的一張（邊緣差分），仍保留可見裁切範圍的原始像素；**沒有強制縮為 480px，也沒有用畫質 heuristic 直接判定「不是鳥」**。
- 即時框僅做顯示座標映射，以配合共有相機裁切；v3 偵測模型、閾值與推論 hook 未改。

### 2. 辨識請求與候選確認

- 同源 `/api/analyze`、raw blob 格式保持不變。
- 加入 AbortSignal 與 **60 秒前端逾時**，不讓畫面無限轉圈；清理 timer／listener。
- 辨識中提供「取消辨識」，離開時取消請求；已過期的結果不能把使用者強制跳回投擲／結果頁。
- 拍照、辨識、候選確認時隱藏底部導航；取消後恢復。
- 自動接受仍使用 v3 原先的 **top-1 ≥ 0.68**。
- 信心 ≥ 0.35 的中等候選，或 top-1 不在圖鑑但 top-2/3 有匹配，會展示拍摄照片與候選，**必須使用者確認**；不符合可重拍。
- 候選去重、排除非有限值／無效分數，不把某個低信心第二候選直接當作成功。
- Bird Gate 的 `notBird` 仍直接進失敗頁，不提供候選繞過。
- 確認後仍進 **v3 原本的投擲流程**，不是直接送卡；後續 IV/CP/XP 計算未移植 v2 規則。
- 捕捉失敗按「返回繼續尋找」現在回掃描器；成功仍回收藏冊。
- JSON 格式／HTTP 錯誤有明確錯誤處理。

> 前端 abort 不代表第三方模型一定停止服務端運算；也沒有把辨識流程改善宣稱為模型準確率提升。需真實照片驗收。

### 3. 收藏存檔安全（不照抄 v2 丟照片降級）

新增 `src/lib/storage.ts`：

- Collection、profile、settings、alt-art 的儲存失敗不再直接讓 React 白屏。
- 容量不足／瀏覽器拒絕儲存會顯示持續警告，提供 **下載完整備份／重試儲存**。
- 新資料留在目前頁面記憶體，既有成功存檔保持不變；**不刪照片、不清貼圖、不裁掉個體歷史**。
- 若有未存妥資料，註冊離頁提示；但手機瀏覽器／系統強制關閉不保證一定顯示，使用者仍應立即下載備份。
- v2 → v3 初始化改為只讀；不再因初始化時寫 v3 失敗，而把明明讀到的 v2 收藏丟掉變空收藏。
- 無效 JSON／明顯錯誤 shape 不會被空白預設值覆寫；交由錯誤邊界提供原始存檔備份。
- 新增 ErrorBoundary，錯誤頁可備份磁碟中的 `bd_*` 原文資料；**不保證未存檔的 React 狀態在其他意外崩潰後仍可復原，也不自動清除資料**。

備份 JSON：

- 正常存檔警告中的備份含 `current`（完整記憶體資料）與 `saved`（原有 storage 原文字串）。
- 錯誤邊界的備份含 `saved`，適合保留損壞原文以便人工修復。
- 本輪是故障備份出口，**尚未增加自動匯入／修復工具**。不要把它誤認為已實作跨網域同步。
- 儲存仍使用 localStorage，沒有提升配額，也不是多 key 原子 transaction；個別 key 失敗會明確報告。長期照片／去背容量可另案設計 IndexedDB 與備份匯入，避免本輪順便改掉 schema。

### 4. 訓練師 XP 進度

- 改以等級的起點／終點 XP 計算進度，限制 0–100%；最高等級為 100%。
- 消除原公式在等級區間內的零分母／負無限大問題。
- 沒有改 XP 門檻、稱號、捕捉加成或升級規則。
- 加入 `progressbar` 語意與測試，不只檢查字串。

### 5. 圖鑑、收藏圖片與手機 UI

- 未捕捉鳥卡可以開詳細頁查看既有資訊；仍保持未捕捉狀態，不給收藏／XP，也不解鎖 v3 個體管理。
- 共用 `useBirdImage`：貼圖／異圖／原圖逐 URL fallback；原圖也失敗時顯示既有 placeholder，而不是一直留破圖。
- 只有成功載入的**異圖 URL**才標記 exists，不會把普通卡載入成功誤記為異圖存在。
- 深色卡牌風格與六個導航入口保留；shell 改 `100dvh`（含 `100vh` fallback）、safe-area、可縮放頁面、手機輸入 16px，改善 Safari 工具列／瀏海／自動 zoom。
- Scout System 版權維持。

### 6. PWA

- 沿用 v2 的既有品牌 PNG icon（192/512），以 **lossless PNG 重壓縮**減少 23,344 B；解壓縮像素資料完全相同。
- v3 manifest 名稱、描述、start URL 和 SW 模式不改，只補齊 PNG 安裝圖示與 apple-touch-icon。
- 瀏覽器頁籤 favicon 保留。手機新增到主畫面的圖示會採用補齊的 PNG。

## 刻意不移植的項目

1. 每日任務／成就等 v2 專屬路線。
2. v2 的色違 `1/64` 與其他不同遊戲數值；v3 原本規則保持。
3. 480px 強制縮圖／容量不足自動捨棄照片，避免損害 v3 去背用途。
4. 未校準的第二模型分數直接比較；本輪不改後端模型／金鑰要求。
5. 124 筆中文名／45 筆英文名／43 筆學名差異，不在此輪整包套用：牽涉 species ID、圖片與既有收藏，需先核對。這是**尚未移植的資料改善**，不是已完成所有共有資料更新的宣稱。
6. 音訊辨識原本停用，保持停用，沒有擅自重開。

## 驗證

### Node 與建置

- `npm run check`：**31 項測試通過**，另含前端／Vite 型別檢查。
- `npm run lint`：通過，0 warning／error。
- `npm run build`：通過；原有 >500kB chunk 提示仍保留，沒有用提高門檻來隱藏。
- `git diff --check`：通過。
- 測試所用 Node MockTimers 有實驗性 API 提示，不是應用程式建置錯誤。

新測試覆蓋相機重試／延遲授權／舊請求／play 失敗、實際裁切參數與光學不重複裁切、相對清晰度、XP 0–11000 每一整數的有效範圍、候選去重與閾值、取消與 60 秒逾時、回應 shape、存檔滿額不丟資料、圖片 fallback，以及 PNG 尺寸與 metadata。

### 真正 production bundle 的 Chromium 測試

已執行原有 `tests/browser-smoke.cjs` 和新增的 `tests/browser-shared.cjs`：

- 原有手機導覽、搜尋、存檔遷移、詳細 IV/CP、收藏、對戰、地圖、拍照→投擲→收藏與 SW 離線 app shell。
- 新增未捕捉卡開詳細、不增加收藏；XP 真實 DOM 進度 50%。
- 模擬拒絕相機後重試、不提供 getCapabilities 的鏡頭仍能拍照。
- 解碼實際上傳的 JPEG，檢查 2x 的尺寸與畫面邊缘像素，確認真裁切而非只有 CSS zoom。
- 中等候選不會直接入冊，確認後仍有原 v3 投擲、IV 與照片。
- 辨識取消後遲到回應不跳頁／不加捕捉；離開後才取得的鏡頭確實 stop。
- 非鳥失敗回掃描器，不加獎勵。
- localStorage 滿額時，v2 收藏／原照片／CP／全部個體／貼圖保留；下載 JSON 檔逐欄驗證，釋放模擬限制後重試成功。
- 損壞 JSON 保持原樣；ErrorBoundary 可下載原文備份。
- 異圖 404→原圖不誤標 exists；普通卡 404→placeholder。

瀏覽器測試使用 mock 相機、權限情境與 AI／圖片服務；**未宣稱真實硬體／外部模型／R2／原生分享／各款 iOS 安裝已驗證**。實機驗收仍依 [部署守則](../DEPLOYMENT_GUARDRAILS.md) 執行。

## 容量變化

比較基準是本輪開始前（已完成上輪版權補齊）：

| 項目 | 改前 | 改後 |
|---|---:|---:|
| `dist` 原始檔案總和 | 28,484,031 B | **28,839,948 B** |
| `public` | 669 B | **346,700 B** |
| 正式產物檔案數 | 13 | 15 |
| 新增 npm 依賴 | — | **0** |

本輪增加 **355,917 B（約 347.58 KiB）**，主要是兩個必要的 PWA PNG（合計 345,792 B），其餘為共有功能與錯誤處理。仍小於 `dist 30 MiB`、`public 512 KiB` 既有門檻；去背 WASM／TF 模型相關資源未刪除。

## 重跑瀏覽器測試

先啟動 production preview，外部 QA 環境安裝 Playwright（不要加到本專案 dependencies），沿用既有環境變數：

```sh
PLAYWRIGHT_MODULE=/tmp/birddex-qa/node_modules/playwright node tests/browser-smoke.cjs
PLAYWRIGHT_MODULE=/tmp/birddex-qa/node_modules/playwright node tests/browser-shared.cjs
```

如使用既有 Chromium，可設定 `CHROMIUM_EXECUTABLE_PATH`；亦可指定 `PREVIEW_URL`。QA 依賴、快照、下載測試檔不納入 Git／部署。本次未推送／部署，所有工作留在本 session 分支。
