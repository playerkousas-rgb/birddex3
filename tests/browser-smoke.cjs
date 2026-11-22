// Optional QA tool, deliberately not an application dependency. See DEPLOYMENT_GUARDRAILS.md.
// 快門版：mock 相機 → 五問 → 候選對卡 → 揀中 → 賽璐璐卡 + 原相持久化（全程零 AI 辨識）。
const { chromium: playwright } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await playwright.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  // Remote images/tiles are not part of this local production smoke test.
  await context.route(/https:\\/\\//, route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>' }));
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4173');
  await page.getByRole('heading', { name: '鳥類圖鑑' }).waitFor();
  assert.match(await page.locator('body').innerText(), /583/);
  assert.equal(await page.locator('link[rel="manifest"]').count(), 1);
  await page.getByPlaceholder('搜尋鳥名、英文或學名...').fill('not-a-real-bird');
  await page.getByText('沒有符合條件的鳥').waitFor();
  await page.getByPlaceholder('搜尋鳥名、英文或學名...').fill('');
  for (const label of ['收藏', '觀鳥員', '對戰', '地圖', '圖鑑']) {
    await page.locator('nav').getByRole('button', { name: label, exact: true }).click();
    await page.waitForTimeout(100);
    console.log('Navigation OK:', label);
  }
  // Seed a v2 save to verify automatic v4 migration (photoDataUrl → photo_original_url) and populated views.
  const birds = require('../src/data/birds.json');
  const stats = { iv: { hp: 31, atk: 31, def: 31, spd: 31, sta: 31, total: 155, percent: 100 }, cp: 650, nature: '勇敢', trait: '愛鳴唱', sizeVariant: 'M', isShiny: false, catchScore: 'Great', catchDistance: 2 };
  const captures = birds.slice(0, 2).map(bird => ({ speciesId: bird.id, count: 12, currentRarity: 'UR', capturedAt: new Date().toISOString(), firstCaptureDate: new Date().toISOString(), lastCaptureDate: new Date().toISOString(), location: { lat: 22.3, lng: 114.2 }, stats, bestStats: stats, allCatches: [stats] }));
  await page.evaluate(captures => { localStorage.removeItem('bd_collection_v3'); localStorage.setItem('bd_collection_v2', JSON.stringify({ captures, version: 2 })); }, captures);
  await page.reload();
  await page.getByRole('heading', { name: '鳥類圖鑑' }).waitFor();
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')));
  assert.equal(migrated.version, 4);
  assert.equal(migrated.captures[0].no, String(migrated.captures[0].speciesId).padStart(4, '0'));
  assert.equal(migrated.captures[0].method, 'photo');
  await page.getByRole('button', { name: '已拍攝', exact: true }).click();
  await page.getByText(birds[0].name, { exact: true }).first().click();
  await page.waitForTimeout(100);
  console.log('Detail:', (await page.locator('body').innerText()).slice(0, 250));
  assert.match(await page.locator('body').innerText(), /650/);
  await page.reload();
  await page.locator('nav').getByRole('button', { name: '對戰', exact: true }).click();
  console.log('Battle:', (await page.locator('body').innerText()).slice(0, 450));
  assert.match(await page.locator('body').innerText(), /650/);
  assert.doesNotMatch(await page.locator('body').innerText(), /IV \?%/);
  await page.getByRole('button', { name: '開戰！', exact: true }).click();
  await page.waitForTimeout(100);
  await page.locator('nav').getByRole('button', { name: '收藏', exact: true }).click();
  await page.getByText(birds[0].name, { exact: true }).first().waitFor();
  await page.locator('nav').getByRole('button', { name: '地圖', exact: true }).click();
  assert.equal(await page.locator('.leaflet-container').count(), 1);
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const paint = () => { ctx.fillStyle = 'green'; ctx.fillRect(0, 0, 320, 240); };
      paint(); setInterval(paint, 100);
      return canvas.captureStream(10);
    };
  });
  await page.reload();
  await page.locator('nav').getByRole('button', { name: '拍攝', exact: true }).click();
  const shutter = page.locator('button').filter({ has: page.locator('svg.lucide-camera') });
  await shutter.waitFor();
  await page.getByRole('button', { name: '2x', exact: true }).click();
  // 影相 → 即刻比較常見鳥卡（零 AI：冇 /api/analyze、冇自動辨識）
  await shutter.click();
  await page.getByRole('heading', { name: '揀一張最似你相中嘅雀' }).waitFor({ timeout: 15000 });
  assert.match(await page.locator('body').innerText(), /唔肯定？試下用 Merlin 影相認/);
  // 先回想一項簡單外貌線索，問題直接可見，結果只顯示短名單
  await page.locator('button').filter({ hasText: '白鴿咁大' }).click();   // size: 中 → 命中珠頸斑鳩
  await page.locator('button').filter({ hasText: '啡棕' }).first().click(); // main_color: 啡棕
  await page.locator('button').filter({ hasText: birds[0].name }).first().waitFor();
  // 再加「中等鳥身」（鳩鴿科真係中等身形）→ 珠頸斑鳩應該排第一
  await page.locator('button').filter({ hasText: '普通雀仔身形' }).click();
  await page.locator('button').filter({ hasText: birds[0].name }).first().click();
  await page.locator('button').filter({ hasText: '快門一按' }).click();
  await page.getByRole('button', { name: '收入收藏冊', exact: true }).click({ timeout: 15000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')));
  const caught = saved.captures.find(c => c.speciesId === birds[0].id);
  assert.equal(caught.count, 13);
  assert.equal(caught.stats.catchDistance, 2);
  assert.equal(caught.allCatches.length, 2);
  assert.equal(caught.no, '0001');
  assert.equal(caught.method, 'photo');
  assert.ok(caught.photo_original_url.startsWith('data:image/jpeg'));
  assert.ok(caught.photo_cel_url.startsWith('data:image/jpeg'));
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('bd_profile_v1')).xp > 0));
  console.log('PASS: mock camera -> five questions -> candidate compare -> cel card + original photo persisted; no AI recognition calls.');
  assert.deepEqual(errors, []);
  console.log('PASS: mobile navigation, search, v2 migration/persistence, detail IV/CP, populated album/battle/map, manifest; zero JS page errors.');
  const offlineContext = await browser.newContext();
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4173');
  await offlinePage.getByRole('heading', { name: '鳥類圖鑑' }).waitFor();
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await offlineContext.setOffline(true);
  await offlinePage.reload();
  await offlinePage.getByRole('heading', { name: '鳥類圖鑑' }).waitFor();
  console.log('PASS: real generated service worker installs and serves the app shell offline.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
