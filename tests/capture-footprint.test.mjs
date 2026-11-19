import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const fp = loadTs('src/lib/captureFootprint.ts');
const mem = loadTs('src/lib/captureMemory.ts');
const species = [{ id: 7, name: '家燕' }];

function record(overrides = {}) {
  return {
    speciesId: 7, no: '0007', method: 'photo', count: 2,
    capturedAt: '2026-01-01T00:00:00.000Z',
    firstCaptureDate: '2026-01-01T00:00:00.000Z',
    lastCaptureDate: '2026-11-19T00:00:00.000Z',
    currentRarity: 'UC',
    photo_original_url: 'data:image/png;base64,AA',
    ...overrides,
  };
}

test('每次拍攝各自記低地點同雀名；新紀錄唔會被舊 capture.location 覆蓋', () => {
  const out = fp.buildFootprints([record({
    location: { lat: 22.30, lng: 114.17 },
    allCatches: [
      { capturedAt: '2026-01-01T00:00:00.000Z', location: { lat: 22.3198, lng: 114.1694 } },
      { capturedAt: '2026-11-19T00:00:00.000Z', location: { lat: 22.2850, lng: 114.1580 } },
    ],
  })], species);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(x => x.birdName), ['家燕', '家燕']);
  assert.equal(out[0].birdId, 7);
  assert.equal(mem.formatCaptureArea(out[0].where), '22.29, 114.16 一帶'); // 最新先
  assert.equal(mem.formatCaptureArea(out[1].where), '22.32, 114.17 一帶');
  assert.match(out[0].photo, /^data:image/);
});

test('舊格式退化到 capture.location，唔會因為冇 allCatches 而消失', () => {
  const out = fp.buildFootprints([record({
    location: { lat: 22.3198, lng: 114.1694 },
    stats: { cp: 10 },
  })], species);
  assert.equal(out.length, 1);
  assert.equal(out[0].when, '2026-11-19T00:00:00.000Z');
  assert.deepEqual(out[0].where, { lat: 22.3198, lng: 114.1694 });
});
