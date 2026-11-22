import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

function withMockRemoveBackground(implementation) {
  return loadTs('src/lib/stickerMaker.ts', {
    '@imgly/background-removal': { removeBackground: implementation },
  });
}

class MockFileReader {
  result = null;
  onload = null;
  onerror = null;
  readAsDataURL() {
    this.result = 'data:image/png;base64,transparent';
    this.onload?.();
  }
}

function installImageMock(width = 640, height = 480) {
  const oldImage = globalThis.Image;
  const oldDocument = globalThis.document;
  globalThis.Image = class MockImage {
    naturalWidth = width;
    naturalHeight = height;
    decoding = '';
    set src(_value) { queueMicrotask(() => this.onload?.()); }
  };
  globalThis.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob: callback => callback(new Blob(['resized'], { type: 'image/jpeg' })),
    }),
  };
  return () => {
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  };
}

test('去背明確使用兼容 CPU 路徑，輸出透明 PNG，並回報模型下載進度', async () => {
  const originalReader = globalThis.FileReader;
  const restoreImage = installImageMock();
  globalThis.FileReader = MockFileReader;
  let receivedConfig;
  const progress = [];
  const { makeSticker } = withMockRemoveBackground(async (_image, config) => {
    receivedConfig = config;
    config.progress('fetch', 50, 100);
    config.progress('compute:run', 1, 1);
    return new Blob(['png'], { type: 'image/png' });
  });
  try {
    const result = await makeSticker('data:image/jpeg;base64,photo', message => progress.push(message));
    assert.equal(result, 'data:image/png;base64,transparent');
    assert.equal(receivedConfig.model, 'isnet_quint8');
    assert.equal(receivedConfig.device, 'cpu');
    assert.equal(receivedConfig.proxyToWorker, false);
    assert.equal(receivedConfig.output.format, 'image/png');
    assert.ok(progress.includes('首次下載去背模型 50%（之後會快取）'));
    assert.ok(progress.includes('正在去背，請稍候…'));
  } finally {
    globalThis.FileReader = originalReader;
    restoreImage();
  }
});

test('模型網絡故障顯示可理解的重試提示，唔覆蓋原相', async () => {
  const restoreImage = installImageMock();
  const { makeSticker } = withMockRemoveBackground(async () => { throw new Error('Failed to fetch model'); });
  try {
    await assert.rejects(makeSticker('photo'), /去背模型下載失敗.*原相沒有被更改/);
  } finally { restoreImage(); }
});

test('大型 iPhone 相片會先縮至 1280px 長邊再交畀模型', async () => {
  const oldImage = globalThis.Image;
  const oldDocument = globalThis.document;
  let canvasSize;
  globalThis.Image = class MockLargeImage {
    naturalWidth = 4032;
    naturalHeight = 3024;
    decoding = '';
    set src(_value) { queueMicrotask(() => this.onload?.()); }
  };
  globalThis.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => ({ drawImage() {} }),
      toBlob(callback) { canvasSize = [this.width, this.height]; callback(new Blob(['small'], { type: 'image/jpeg' })); },
    }),
  };
  const { makeSticker } = withMockRemoveBackground(async source => {
    assert.ok(source instanceof Blob, '縮圖應以 Blob 傳畀模型，唔再送原始超大 data URL');
    return new Blob(['png'], { type: 'image/png' });
  });
  const oldReader = globalThis.FileReader;
  globalThis.FileReader = MockFileReader;
  try {
    await makeSticker('data:image/jpeg;base64,large');
    assert.deepEqual(canvasSize, [1280, 960]);
  } finally {
    globalThis.FileReader = oldReader;
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});

test('空照片及空模型輸出會清楚回報，而非假裝已成功', async () => {
  const { makeSticker: emptyInput } = withMockRemoveBackground(async () => new Blob(['x']));
  await assert.rejects(emptyInput(''), /搵唔到原相/);
  const restoreImage = installImageMock();
  const { makeSticker: emptyOutput } = withMockRemoveBackground(async () => new Blob([]));
  try {
    await assert.rejects(emptyOutput('photo'), /沒有輸出有效圖片/);
  } finally { restoreImage(); }
});
