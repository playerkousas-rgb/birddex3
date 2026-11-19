# BIRD-DEX 設計守則

Adapted from `playerkousas-rgb/readme` → `templates/repo-starter/docs/design-review.md` §2（2026-11-19 讀檔）。只借判斷方法同反 slop 清單，無引入新工具鏈。

## App 屏幕（做嘢用）

- 安靜邊框、細 label、單一層次；**唔用**漸層、glow、陰影當裝飾、幼細分隔線、彩虹圖。
- **Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.** 唔加唔必要嘅次級標籤同說明——用留白、字級層次、分組自己講嘢。
- 唔用 eyebrow label、monospace 小 caption、index 編號；按鈕／欄位本身講得清楚就唔再加注解。
- accent 色只落喺**一個**主要動作同**一個**細節，唔好周身都係。
- 真資料先擺出嚟；無資料就唔好扮有。

## 資料來源

- 設計判斷：[readme design-review.md](https://github.com/playerkousas-rgb/readme/blob/main/templates/repo-starter/docs/design-review.md)
- 顏色／字級：`tailwind.config.js` 係唯一 token 來源；唔好散寫新 hex。
