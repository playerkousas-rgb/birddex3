import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const m = loadTs('src/lib/shareCapture.ts');

test('只分享本機原相／轉化圖，唔會當 R2 遠端 URL 係可分享檔案', async () => {
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await m.shareCaptureImage('https://cdn.example/bird.png', 'x.png', 'x'), 'unavailable');
});

test('系統分享支援時直接用 navigator.share(files)；唔支援就降落去下載', async () => {
  let shared = false;
  globalThis.fetch = async () => ({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) });
  Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => true, share: async () => { shared = true; } }, configurable: true });
  assert.equal(await m.shareCaptureImage('data:image/png;base64,AA', 'bird.png', '鳥'), 'shared');
  assert.equal(shared, true);

  let clicked = false;
  Object.defineProperty(globalThis, 'navigator', { value: { canShare: () => false }, configurable: true });
  globalThis.document = { createElement: () => ({ set href(v) {}, set download(v) {}, click() { clicked = true; } }) };
  assert.equal(await m.shareCaptureImage('blob:abc', 'bird.png', '鳥'), 'downloaded');
  assert.equal(clicked, true);
});
