import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const cel = loadTs('src/lib/celShade.ts');

test('posterizeChannel 只輸出 levels 種平階（4–5 色規格）', () => {
  const values = new Set();
  for (let v = 0; v <= 255; v++) values.add(cel.posterizeChannel(v, 5));
  assert.ok(values.size <= 5, `levels=5 應該最多 5 種值，實際 ${values.size}`);
  assert.equal(cel.posterizeChannel(0, 5), 0);
  assert.equal(cel.posterizeChannel(255, 5), 255);

  const values4 = new Set();
  for (let v = 0; v <= 255; v++) values4.add(cel.posterizeChannel(v, 4));
  assert.ok(values4.size <= 4, `levels=4 應該最多 4 種值，實際 ${values4.size}`);
});

test('posterizeChannel 夾緊越界輸入，唔會 NaN 出街', () => {
  assert.equal(cel.posterizeChannel(-10), 0);
  assert.equal(cel.posterizeChannel(999), 255);
  assert.equal(cel.posterizeChannel(NaN), 0);
  assert.equal(cel.posterizeChannel(Infinity), 0);
});

test('posterizeRgb 分層亮度同時保留色相，唔會獨立量化 RGB 造成偏色', () => {
  const [r, g, b] = cel.posterizeRgb(200, 40, 20, 5);
  assert.ok(r > g && g >= b, '紅色輸入仍然應維持紅色主調');
  assert.ok(Math.abs((r / 200) - (g / 40)) < 0.04, 'RGB 比例應大致保留');
  assert.deepEqual(cel.posterizeRgb(0, 0, 0), [0, 0, 0]);
});

test('柔和賽璐璐預設保留更多漸層、避免馬賽克感，並令舊快取重新生成', () => {
  assert.ok(cel.CEL_LEVELS >= 7 && cel.CEL_LEVELS <= 9);
  assert.ok(cel.CEL_SMOOTHING > 0 && cel.CEL_SMOOTHING <= 2);
  assert.ok(cel.CEL_STYLIZATION > 0.5 && cel.CEL_STYLIZATION < 1, '須混回原色漸層，避免硬量化成色塊');
  assert.ok(cel.CEL_MAX_EDGE <= 1024);
  assert.ok(cel.CEL_JPEG_QUALITY > 0.5 && cel.CEL_JPEG_QUALITY <= 0.9);
  assert.equal(cel.CEL_SHADE_VERSION, 3);
  assert.equal(cel.celShadeImage.toString().includes('options.edgeDilate ?? 0'), true);
  assert.equal(cel.celShadeImage.toString().includes('ctx.filter = `blur(${smoothing}px)`'), true);
});

test('Canvas 整合：簡單色塊產生柔和分層、細線而非厚重黑框', async () => {
  let outputPixels;
  const width = 20;
  const height = 20;
  const originalImage = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const red = x < 10 ? 255 : 20;
      originalImage[i] = red;
      originalImage[i + 1] = 0;
      originalImage[i + 2] = 0;
      originalImage[i + 3] = 255;
    }
  }
  globalThis.Image = class MockImage {
    naturalWidth = width;
    naturalHeight = height;
    set src(_value) { queueMicrotask(() => this.onload?.()); }
  };
  globalThis.document = {
    createElement: () => ({
      width, height,
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray(originalImage) }),
        putImageData: data => { outputPixels = data.data; },
      }),
      toDataURL: () => 'data:image/jpeg;base64,test',
    }),
  };
  const result = await cel.celShadeImage('data:image/jpeg;base64,input', { maxEdge: 20 });
  assert.match(result, /^data:image\/jpeg/);
  let shadedRedPixels = 0;
  for (let i = 0; i < outputPixels.length; i += 4) {
    if (outputPixels[i] >= 30 && outputPixels[i] < 200 && outputPixels[i + 1] === 0 && outputPixels[i + 2] === 0) shadedRedPixels++;
    assert.equal(outputPixels[i + 3], 255, '轉換唔可以改變相片透明度');
  }
  assert.ok(shadedRedPixels > 0 && shadedRedPixels <= 40, `輪廓應輕柔而纖細，實際陰影像素 ${shadedRedPixels}`);
  assert.ok(outputPixels.some((value, i) => i % 4 === 0 && value > 100), '主體顏色必須保留');
});
