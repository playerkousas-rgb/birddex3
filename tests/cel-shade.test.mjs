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

test('賽璐璐預設參數符合 brief（4–5 色、960px、JPEG）', () => {
  assert.ok(cel.CEL_LEVELS >= 4 && cel.CEL_LEVELS <= 5);
  assert.ok(cel.CEL_MAX_EDGE <= 1024);
  assert.ok(cel.CEL_JPEG_QUALITY > 0.5 && cel.CEL_JPEG_QUALITY <= 0.9);
});
