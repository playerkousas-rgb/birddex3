import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('入站深層連結：AvianDex 帶 ?no/?species/?id 過嚟會解析到 speciesId', () => {
  assert.equal(av.parseIncomingSpecies('?no=0008'), 8);
  assert.equal(av.parseIncomingSpecies('?species=8'), 8);
  assert.equal(av.parseIncomingSpecies('?id=0583'), 583);
  assert.equal(av.parseIncomingSpecies('?no=8&search=鵲鴝'), 8);
  assert.equal(av.parseIncomingSpecies('?unlock=0008'), null, '?unlock 係出站方向，唔係入站');
  assert.equal(av.parseIncomingSpecies(''), null);
  assert.equal(av.parseIncomingSpecies('?no=99999'), null, '超過 4 位唔收');
  assert.equal(av.parseIncomingSpecies('?no=0000'), null, '0 唔係有效編號');
  assert.equal(av.parseIncomingSpecies('?no=abc'), null);
});

test('出站解鎖：彈窗被擋要退回同一分頁導航（iframe 頂層跳板，docs/50）', () => {
  const src = readFileSync('src/lib/aviandex.ts', 'utf8');
  assert.match(src, /window\.location\.assign\(url\)/, 'popup blocked → same-tab fallback');
});
