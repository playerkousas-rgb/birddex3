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
- R2 `birdcards/` 圖以**物種**搬運（資料夾係舊編號生成，原因見 interop 文檔 §4）。

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

## 版本

v3.1.0 — 精靈球版（三問對卡 ＋ 賽璐璐卡 ＋ AvianDex 解鎖互聯）。

## 版權 / Copyright

© 2026 Scout System. All Rights Reserved.

Scout System 原創內容的版權聲明見 [COPYRIGHT.md](COPYRIGHT.md)；第三方套件、模型與素材仍遵循各自授權。
