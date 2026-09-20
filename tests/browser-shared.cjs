// Optional Playwright regression suite. Uses mocked hardware/services, real production React.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>';
const stats = { iv: { hp: 31, atk: 31, def: 31, spd: 31, sta: 31, total: 155, percent: 100 }, cp: 650, nature: '勇敢', trait: '愛鳴唱', sizeVariant: 'M', isShiny: false, catchScore: 'Great', catchDistance: 2, stickerUrl: 'data:image/png;kept-for-backup' };
const capture = { speciesId: 1, count: 12, currentRarity: 'UR', capturedAt: new Date().toISOString(), firstCaptureDate: new Date().toISOString(), lastCaptureDate: new Date().toISOString(), photoDataUrl: 'data:image/jpeg;full-photo-preserved', stats, bestStats: stats, allCatches: [stats] };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'], headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.route(/https:\/\//, route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg }));
    await context.addInitScript(() => {
      window.__streams = 0; window.__stops = 0;
      navigator.mediaDevices.getUserMedia = async () => {
        if (window.__denyCamera) throw new DOMException('denied','NotAllowedError');
        if (window.__delayCamera) await new Promise(resolve => { window.__releaseCamera = resolve; });
        const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
        const ctx = canvas.getContext('2d');
        const paint = () => {
          ctx.fillStyle = 'red'; ctx.fillRect(0,0,320,240);
          ctx.fillStyle = '#00ff00'; ctx.fillRect(80,0,160,240);
          ctx.fillStyle = 'blue'; ctx.fillRect(240,0,80,240);
        };
        paint(); const interval = setInterval(paint,100);
        const stream = canvas.captureStream(10); window.__streams++;
        for (const track of stream.getTracks()) {
          track.getCapabilities = undefined; // older mobile browsers
          const stop = track.stop.bind(track);
          track.stop = () => { window.__stops++; clearInterval(interval); stop(); };
        }
        return stream;
      };
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    let mode = 'candidate', responseArrived, releaseResponse, decodedImage;
    await context.route('**/api/analyze', async route => {
      const data = [...route.request().postDataBuffer()];
      decodedImage = await page.evaluate(async bytes => {
        const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }));
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image,0,0);
        return { width: image.width, height: image.height, pixel: [...ctx.getImageData(0,Math.floor(image.height/2),1,1).data] };
      }, data);
      if (mode === 'delay') { responseArrived(); await new Promise(resolve => { releaseResponse = resolve; }); }
      const json = mode === 'notBird' ? { mediaType: 'image', engine: 'mock', notBird: true, results: [] }
        : { mediaType: 'image', engine: 'mock', results: [{ label: 'Spotted Dove', score: mode === 'candidate' ? 0.55 : 0.99 }] };
      try { await route.fulfill({ json }); } catch { /* an intentionally aborted request may no longer exist */ }
    });
    await page.goto(base);
    await page.getByRole('heading',{name:'鳥精靈圖鑑'}).waitFor();
    // Previously uncaught cards were not clickable.
    await page.getByText('珠頸斑鳩',{exact:true}).first().click();
    await page.getByRole('heading',{name:'珠頸斑鳩'}).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')).captures.length),0);
    await page.reload();
    await page.evaluate(() => {
      const profile = JSON.parse(localStorage.getItem('bd_profile_v1'));
      localStorage.setItem('bd_profile_v1',JSON.stringify({...profile,xp:200,level:2}));
    });
    await page.reload();
    const nav = name => page.locator('nav').getByRole('button',{name,exact:true});
    assert.equal(await page.getByPlaceholder('搜尋鳥名、英文或學名...').evaluate(input => getComputedStyle(input).fontSize),'16px');
    await nav('訓練師').click();
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'),'50');
    assert.equal(await page.evaluate(() => Math.round(document.querySelector('.app-shell').getBoundingClientRect().height)),844);

    await page.evaluate(() => { window.__denyCamera = true; });
    await nav('捕捉').click();
    await page.getByText('相機權限被拒絕，請在瀏覽器設定中允許相機。').waitFor();
    await page.evaluate(() => { window.__denyCamera = false; });
    await page.getByRole('button',{name:'重新啟動相機'}).click();
    const shutter = page.getByRole('button',{name:'拍照辨識',exact:true});
    await shutter.waitFor();
    await page.getByRole('button',{name:'2x',exact:true}).click();
    const dimensions = await page.locator('video').evaluate(video => ({vw:video.videoWidth,vh:video.videoHeight,w:video.clientWidth,h:video.clientHeight}));
    await shutter.click();
    await page.getByRole('heading',{name:'請確認候選鳥種'}).waitFor();
    assert.equal(await page.locator('nav').count(),0);
    const scale = Math.max(dimensions.w/dimensions.vw,dimensions.h/dimensions.vh)*2;
    assert.equal(decodedImage.width,Math.round(dimensions.w/scale));
    assert.equal(decodedImage.height,Math.round(dimensions.h/scale));
    assert.ok(decodedImage.pixel[1]>200 && decodedImage.pixel[0]<30 && decodedImage.pixel[2]<30,'actual photo must be the green center crop, not red uncropped edges');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')).captures.length),0);
    await page.getByRole('button',{name:/珠頸斑鳩/}).click();
    await page.getByRole('button',{name:'跳過 »',exact:true}).click();
    await page.getByRole('button',{name:'收入收藏冊',exact:true}).click({timeout:15000});
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')));
    assert.equal(saved.captures.length,1); assert.equal(saved.captures[0].stats.catchDistance,2);
    assert.ok(saved.captures[0].stats.iv); assert.ok(saved.captures[0].photoDataUrl);
    assert.equal(await page.evaluate(() => window.__streams === window.__stops),true);
    console.log('PASS: XP, uncaught detail, permission retry, legacy capability support, true JPEG crop, explicit candidate -> original v3 throw/IV.');

    mode = 'delay';
    const arrival = new Promise(resolve => { responseArrived = resolve; });
    await nav('捕捉').click(); await shutter.click(); await arrival;
    assert.equal(await page.locator('nav').count(),0);
    await page.getByRole('button',{name:'取消辨識',exact:true}).click();
    await nav('訓練師').click();
    releaseResponse(); await page.waitForTimeout(200);
    assert.equal(await page.getByRole('progressbar').count(),1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')).captures[0].count),1);
    // Permission dialog completes only after the user leaves the scanner.
    await page.evaluate(() => { window.__delayCamera = true; });
    await nav('捕捉').click();
    await page.waitForFunction(() => typeof window.__releaseCamera === 'function');
    await nav('圖鑑').click();
    await page.evaluate(() => window.__releaseCamera());
    await page.waitForFunction(() => window.__streams === window.__stops);
    await page.evaluate(() => { window.__delayCamera = false; });
    mode = 'notBird'; await nav('捕捉').click(); await shutter.click();
    await page.getByRole('button',{name:'返回繼續尋找',exact:true}).click({timeout:15000});
    await shutter.waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')).captures[0].count),1);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log('PASS: abort/stale response, camera acquired after unmount, failed capture returns to scanner without rewards.');

    const quota = await browser.newContext({ serviceWorkers: 'block' });
    await quota.route(/https:\/\//,route=>route.fulfill({status:200,contentType:'image/svg+xml',body:svg}));
    await quota.addInitScript(capture => {
      localStorage.setItem('bd_collection_v2',JSON.stringify({captures:[capture],version:2}));
      window.__fullDisk = true;
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key,value) {
        if (window.__fullDisk && key === 'bd_collection_v3') throw new DOMException('full','QuotaExceededError');
        return set.call(this,key,value);
      };
    },capture);
    const qp = await quota.newPage(); await qp.goto(base);
    await qp.getByRole('button',{name:'下載完整備份'}).waitFor();
    assert.equal(await qp.evaluate(() => localStorage.getItem('bd_collection_v3')),null);
    const downloading = qp.waitForEvent('download');
    await qp.getByRole('button',{name:'下載完整備份'}).click();
    const download = await downloading;
    const backup = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.deepEqual(backup.current.bd_collection_v3.captures,[capture]);
    assert.deepEqual(JSON.parse(backup.saved.bd_collection_v2).captures,[capture]);
    await qp.evaluate(() => { window.__fullDisk = false; });
    await qp.getByRole('button',{name:'重試儲存'}).click();
    await qp.getByRole('button',{name:'重試儲存'}).waitFor({state:'detached'});
    assert.deepEqual(await qp.evaluate(() => JSON.parse(localStorage.getItem('bd_collection_v3')).captures),[capture]);
    await quota.close();
    console.log('PASS: v2 migration on a full disk preserves full-resolution photos/IV/stickers; full backup download and retry succeed.');

    const broken = await browser.newContext({ serviceWorkers: 'block' });
    await broken.addInitScript(() => localStorage.setItem('bd_collection_v3','{broken-save'));
    const bp = await broken.newPage(); await bp.goto(base);
    await bp.getByRole('heading',{name:'暫時無法顯示這個畫面'}).waitFor();
    assert.equal(await bp.evaluate(() => localStorage.getItem('bd_collection_v3')),'{broken-save');
    const rawDownload = bp.waitForEvent('download');
    await bp.getByRole('button',{name:'備份已儲存資料'}).click();
    assert.equal(JSON.parse(fs.readFileSync(await (await rawDownload).path(),'utf8')).saved.bd_collection_v3,'{broken-save');
    await broken.close();
    console.log('PASS: damaged JSON is not overwritten by an empty save; ErrorBoundary allows raw backup.');

    const pictures = await browser.newContext({ serviceWorkers: 'block' });
    await pictures.addInitScript(capture => {
      localStorage.setItem('bd_collection_v3',JSON.stringify({captures:[capture],version:3}));
      localStorage.setItem('bd_altart_v1',JSON.stringify({unlocked:[1],existsOnR2:[],missingOnR2:[]}));
    },capture);
    await pictures.route(/https:\/\//,route => route.request().url().includes('_UR.avif')
      ? route.fulfill({status:404,body:'missing'}) : route.fulfill({status:200,contentType:'image/svg+xml',body:svg}));
    const ip = await pictures.newPage(); await ip.goto(base);
    await ip.waitForFunction(() => JSON.parse(localStorage.getItem('bd_altart_v1')).missingOnR2.includes(1));
    assert.equal(await ip.evaluate(() => JSON.parse(localStorage.getItem('bd_altart_v1')).existsOnR2.includes(1)),false);
    await pictures.close();
    // A fresh context avoids reusing the successfully decoded base image from the first case.
    const missing = await browser.newContext({ serviceWorkers: 'block' });
    await missing.addInitScript(capture => localStorage.setItem('bd_collection_v3',JSON.stringify({captures:[capture],version:3})),capture);
    await missing.route(/https:\/\//,route => route.fulfill({status:404,body:'missing'}));
    const mp = await missing.newPage(); await mp.goto(base);
    await mp.getByText('珠頸斑鳩',{exact:true}).first().click();
    await mp.getByRole('heading',{name:'珠頸斑鳩'}).waitFor();
    await mp.waitForFunction(() => document.querySelectorAll('img[alt="珠頸斑鳩"]').length === 0);
    await missing.close();
    console.log('PASS: alternative 404 falls back to original without marking it as alternative; base 404 uses placeholder.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
