# 後續改版必讀

修改本專案前先閱讀 [DEPLOYMENT_GUARDRAILS.md](DEPLOYMENT_GUARDRAILS.md)。

- 功能、資料、UI 與使用者體驗優先；不可為了縮小體積刪除 AI／去背／PWA／API 或使用者存檔能力。
- 部署輸出固定 `dist/`，保留 API；維護資料、測試、備份、依賴與快取不得當靜態網頁發佈。
- 新增資源先查引用與動態 URL；新增依賴先證明必要性，建置工具只放 devDependencies。
- 保留 `npm run build` 的容量守門；禁止無理由放寬門檻。
- 交付前執行 `npm run check`、`npm run lint`、`npm run build`，說明容量變化與實際驗證範圍。
