import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const av = loadTs('src/lib/aviandex.ts');

test('birdNo 一律 pad 到 4 位，同 AvianDex 嘅 NO. 對齊', () => {
  assert.equal(av.birdNo(8), '0008');
  assert.equal(av.birdNo(583), '0583');
  assert.equal(av.birdNo(1), '0001');
  assert.equal(av.birdNo(0), '0000');
});

test('unlock URL 參數合乎 AvianDex 實作（unlock 主用，search 後備）', () => {
  const url = new URL(av.aviandexUnlockUrl('0008', '鵲鴝'));
  assert.equal(url.origin, 'https://avian-dex.vercel.app');
  assert.equal(url.searchParams.get('unlock'), '0008');
  assert.equal(url.searchParams.get('search'), '鵲鴝');
  const bare = new URL(av.aviandexUnlockUrl('0011'));
  assert.equal(bare.searchParams.get('unlock'), '0011');
  assert.equal(bare.searchParams.get('search'), null);
});

test('toInteropRecord 產出 brief 指定嘅六個欄位', () => {
  const record = {
    speciesId: 8,
    no: '0008',
    method: 'photo',
    capturedAt: '2026-11-17T10:00:00.000Z',
    count: 1,
    currentRarity: 'C',
    firstCaptureDate: '2026-11-17T10:00:00.000Z',
    lastCaptureDate: '2026-11-17T10:00:00.000Z',
    location: { lat: 22.3, lng: 114.1 },
    photo_original_url: 'data:image/jpeg;base64,AAA',
    photo_cel_url: 'data:image/jpeg;base64,BBB',
  };
  const interop = av.toInteropRecord(record);
  assert.deepEqual(Object.keys(interop).sort(), [
    'captured_at', 'location', 'method', 'no', 'photo_cel_url', 'photo_original_url',
  ]);
  assert.deepEqual(interop, {
    no: '0008',
    captured_at: '2026-11-17T10:00:00.000Z',
    location: { lat: 22.3, lng: 114.1 },
    method: 'photo',
    photo_original_url: 'data:image/jpeg;base64,AAA',
    photo_cel_url: 'data:image/jpeg;base64,BBB',
  });
});

test('冇相嘅舊記錄都生到 interop 形狀（欄位用 null，唔係 undefined）', () => {
  const interop = av.toInteropRecord({
    speciesId: 12, no: '0012', method: 'photo',
    capturedAt: 'x', count: 3, currentRarity: 'R',
    firstCaptureDate: 'x', lastCaptureDate: 'x', location: null,
  });
  assert.equal(interop.photo_original_url, null);
  assert.equal(interop.photo_cel_url, null);
  assert.equal(interop.location, null);
});
