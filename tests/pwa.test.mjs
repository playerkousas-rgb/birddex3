import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 真理倉 docs/46（I1–I8／UP1–UP5）靜態流程守門 — 做法照 minigame tools/verify.mjs
// （純 grep 正則、零依賴）。誠實限制：呢度驗「流程有寫」，唔等於真機行為已驗收；
// I7 真機安裝／UP 更新流程係人手驗收項，見 README「已知限制」。

const vite = readFileSync('vite.config.ts', 'utf8');
const pwa = readFileSync('src/lib/pwa.ts', 'utf8');
const chrome = readFileSync('src/components/PwaChrome.tsx', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('UP1: registerType is prompt — 新 SW 停喺 waiting，唔准背景偷換版', () => {
  assert.match(vite, /registerType:\s*'prompt'/);
  assert.doesNotMatch(vite, /registerType:\s*'autoUpdate'/);
  assert.match(vite, /injectRegister:\s*false/, '自己控制註冊（要 onNeedRefresh 掛勾）');
});

test('I2/I4: beforeinstallprompt 被攔住、appinstalled 收掣、standalone/iOS 偵測', () => {
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /event\.preventDefault\(\)/, 'must preventDefault so browser does not auto-prompt');
  assert.match(pwa, /appinstalled/);
  assert.match(pwa, /display-mode: standalone/, 'I4 standalone 偵測');
  assert.match(pwa, /MacIntel/, 'I4 iPadOS 13+ 偽裝 Macintosh 要用 platform+touch');
});

test('UP2/UP3/UP4: 稍後記住 worker、立即更新有 timeout fallback、三個檢查時機', () => {
  assert.match(pwa, /onNeedRefresh/);
  assert.match(pwa, /DISMISS_KEY/, 'UP2 稍後要記住同一個 worker');
  assert.match(pwa, /navigator\.serviceWorker\.controller/, '首次安裝（冇 controller）唔彈更新');
  assert.match(pwa, /updateSW\?\.\(true\)/, 'UP3 SKIP_WAITING 由 updateSW(true) 送出');
  assert.match(pwa, /2500/, 'UP3 timeout fallback 2–3 秒');
  assert.match(pwa, /visibilitychange/, 'UP4 回前景檢查');
  assert.match(pwa, /'online'/, 'UP4 恢復連線檢查');
  assert.match(pwa, /30 \* 60 \* 1000/, 'UP4 每 30 分鐘，唔准更頻密輪詢');
});

test('I1/I3/I6: 安裝入口 + iOS 三步教學卡 + 更新 banner 語意', () => {
  assert.match(main, /initPwa\(\)/, '入口喺 app 啟動時註冊');
  assert.match(app, /<PwaChrome \/>/, 'banner／教學卡有掛上');
  assert.match(chrome, /role="region"/);
  assert.match(chrome, /aria-label="版本更新"/);
  assert.match(chrome, /立即更新/);
  assert.match(chrome, /aria-label="稍後再更新"/);
  assert.match(chrome, /role="dialog"/);
  assert.match(chrome, /aria-modal="true"/);
  assert.match(chrome, /aria-labelledby="installHelpTitle"/);
  assert.match(chrome, /用 Safari 開啟呢一頁/, 'I3 唔准叫人裝 Chrome');
  assert.match(chrome, /全螢幕/, 'I6 一句講清加主畫面效果');
  assert.match(chrome, /InstallButton/, 'I1 有可見安裝入口');
});

test('I8: 新 PWA 代碼唔准用 alert()/confirm()/第三方 install widget', () => {
  assert.doesNotMatch(chrome, /\balert\(/);
  assert.doesNotMatch(pwa, /\balert\(/);
  assert.doesNotMatch(chrome, /third-party|one-tap|gms\.|play\.google/i);
});
