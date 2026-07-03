# BIRD-DEX 資料庫同步與維護指南

BIRD-DEX v2 已經將所有的核心資料從 TypeScript 程式碼中抽離，轉為 **JSON 格式**。
這樣做的目的是為了方便與另一個專案 `AvianDex` 共用資料庫，並允許透過自動化腳本進行同步。

## 📁 核心資料檔案位置

在 `skw-birdex2` 專案中，主要有兩個 JSON 檔案需要維護：

1. **`src/data/birds.json`**
   - **用途**：鳥類圖鑑的主要詳細資訊（包含中文名、英文名、學名、特徵、棲地、圖片 URL 等）。
   - **對應介面**：符合 `BirdSpecies` 型別定義。

2. **`src/data/nameAliases.json`**
   - **用途**：AI 模型（如 Hugging Face, BirdNET）辨識結果的映射表。因為 AI 回傳的名稱可能是英文、學名或簡體中文，這個檔案負責將各種 `aliases` 對應回 `birds.json` 中的 `speciesId`。
   - **對應介面**：陣列包含 `{ speciesId: number, aliases: string[] }`。

---

## 🔄 如何進行資料更新與同步

如果你在 `AvianDex` 中更新了鳥類資料，或是手動修改了 JSON 檔案，請按照以下步驟確保 BIRD-DEX 的網頁版正常運作。

### 步驟 1：覆蓋 JSON 檔案
將更新後的 JSON 檔案直接覆蓋到 `skw-birdex2` 的指定路徑：
- 覆蓋 `skw-birdex2/src/data/birds.json`
- 覆蓋 `skw-birdex2/src/data/nameAliases.json`

> 💡 **自動化建議：**
> 如果你有寫 Bash 或 Node.js 腳本，可以直接執行類似以下指令：
> ```bash
> cp ../AvianDex/src/data/birds.json ./src/data/birds.json
> cp ../AvianDex/src/data/nameAliases.json ./src/data/nameAliases.json
> ```

### 步驟 2：注意事項
修改或覆蓋 JSON 檔案時，請確保：
1. `birds.json` 裡的 `id` 欄位必須是**數字 (Number)**（不要用字串 `"0001"`）。
2. `nameAliases.json` 裡的所有 `aliases` 陣列字串都建議**轉為小寫**，以確保比對時的準確度。
3. `nameAliases.json` 的 `speciesId` 必須能對應到 `birds.json` 中的 `id`。

### 步驟 3：重新啟動或建置
因為 Vite 會快取 JSON 檔案，如果你在本地開發環境 (Dev Server) 運作中修改了 JSON，通常 Vite 會熱更新。
但如果資料沒有變化，請：
1. 重啟開發伺服器 `npm run dev`
2. 或者準備上線前，執行 `npm run build` 確認沒有 TypeScript 錯誤。

---

## 🛠️ TypeScript 映射邏輯 (無需修改)

為了讓你知道資料是如何載入的，以下是內部的讀取邏輯（你不需要修改它們）：

*   **`src/data/birdData.ts`**: 會直接 `import birdsJson from './birds.json'` 並轉型為 `BirdSpecies[]` 供全域使用。
*   **`src/data/nameAliases.ts`**: 會載入 `nameAliases.json` 並在記憶體中建立一個 `Map<string, number>`。當相機辨識到結果時，會丟進 `resolveBirdId()` 函式，自動過濾大小寫與標點符號，回傳對應的圖鑑 ID。
