import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const m = loadTs('src/lib/captureMemory.ts');

test('捕捉日期格式化：ISO → zh-HK 可讀（紀念條要用家一眼睇到）', () => {
  const out = m.formatCapturedAt('2026-11-17T10:30:00.000Z');
  assert.match(out, /2026/);
  assert.match(out, /\d{2}:\d{2}/);
  assert.equal(m.formatCapturedAt('not-a-date'), 'not-a-date', '壞日期原樣返回，唔好靜靜');
});

test('地點格式化：坐標 4 位小數；冇記錄要明示「地點未記錄」', () => {
  assert.equal(m.formatCaptureLocation({ lat: 22.3198, lng: 114.1694 }), '22.3198, 114.1694');
  assert.equal(m.formatCaptureLocation(null), '地點未記錄');
  assert.equal(m.formatCaptureLocation(undefined), '地點未記錄');
  assert.equal(m.formatCaptureLocation({ lat: NaN, lng: 1 }), '地點未記錄');
});
