# BIRD-DEX → AvianDex 連結修復 🔗

## 🐛 問題
BIRD-DEX 詳細頁的「AvianDex 圖鑑」按鈕指向 `https://skw-aviandex.vercel.app` —— **這個網址不存在 (404)**。

你的 AvianDex 實際部署在 **`https://avian-dex.vercel.app`**。

## ✅ 修復內容

只改一個檔案：`src/components/BirdDetailScreen.tsx`（一處）

**修復前**：
```ts
window.open(`https://skw-aviandex.vercel.app?search=${encodeURIComponent(bird.name)}`, '_blank');
//          ❌ 404                      ❌ 沒有用 ID（最可靠的參數）
```

**修復後**：
```ts
const url = `https://avian-dex.vercel.app/?id=${bird.id}&search=${encodeURIComponent(bird.name)}`;
window.open(url, '_blank');
//   ✅ 正確網址        ✅ id=12 直接跳到該鳥        ✅ search 作為後備
```

### 為什麼帶兩個參數？
我看了 AvianDex 的 `App.tsx` (`src/App.tsx` line 132-186)，
它支援：
- `?id=12`（最可靠 — 兩邊用同一套編號）← **主要**
- `?search=珠頸斑鳩`（中文名 / 英文名 / 學名後備）← **備用**

雙保險：就算 AvianDex 將來換 birds.json 編號，還是能用名字找到鳥。

## 📦 內容
```
src/components/BirdDetailScreen.tsx
```

## 🌐 GitHub 部署
1. 進 https://github.com/playerkousas-rgb/skw-birdex2
2. 找到 `src/components/BirdDetailScreen.tsx` → 鉛筆 🖉 → 全選清空 → 貼上 → Commit
3. Vercel 自動部署 (1 分鐘)

## ✅ 驗證
1. 部署完打開任何一隻鳥的詳細頁
2. 點「AvianDex 圖鑑」按鈕
3. 應該打開 `https://avian-dex.vercel.app/?id=XX&search=XX` 並直接定位到該鳥
