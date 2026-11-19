import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const t = loadTs('src/lib/trainerTier.ts');

test('1–12 級每級嘅徽章顏色全部唔同（按級別生成唔同嘅圖）', () => {
  const colors = new Set();
  for (let lv = 1; lv <= 12; lv++) colors.add(t.getTrainerTier(lv).color);
  assert.equal(colors.size, 12);
});

test('形狀按 band 分 4 帶：圓／盾／六角／星', () => {
  const shape = lv => t.getTrainerTier(lv).shape;
  for (const lv of [1, 2, 3]) assert.equal(shape(lv), 'circle');
  for (const lv of [4, 5, 6]) assert.equal(shape(lv), 'shield');
  for (const lv of [7, 8, 9]) assert.equal(shape(lv), 'hex');
  for (const lv of [10, 11, 12]) assert.equal(shape(lv), 'star');
});

test('等級越界要夾實：0→1、99→12、非數字→1', () => {
  assert.equal(t.getTrainerTier(0).level, 1);
  assert.equal(t.getTrainerTier(99).level, 12);
  assert.equal(t.getTrainerTier(NaN).level, 1);
  assert.equal(t.getTrainerTier(7.9).level, 7);
});

test('中心鳥頭對比：淺色銀章 Lv4 用深色鳥，其他用白色鳥', () => {
  assert.equal(t.getTrainerTier(4).fg, '#1B1F2A');
  assert.equal(t.getTrainerTier(3).fg, '#FFFFFF');
  assert.equal(t.getTrainerTier(12).fg, '#FFFFFF');
});

test('band 名稱齊全', () => {
  assert.equal(t.getTrainerTier(2).band, '銅章');
  assert.equal(t.getTrainerTier(5).band, '銀章');
  assert.equal(t.getTrainerTier(8).band, '金章');
  assert.equal(t.getTrainerTier(11).band, '傳說章');
});

test('進化譜系：12 級由蛋一步步變成白腹海鵰（圖鑑 NO.274）', () => {
  assert.equal(t.EVOLUTION_STAGES.length, 12);
  assert.deepEqual(t.EVOLUTION_STAGES.map(s => s.level), Array.from({ length: 12 }, (_, i) => i + 1));
  assert.match(t.EVOLUTION_STAGES[0].name, /蛋/);
  assert.equal(t.EVOLUTION_STAGES[11].speciesId, 274);
  assert.match(t.EVOLUTION_STAGES[11].name, /白腹海鵰/);
  const raptorSpecies = t.EVOLUTION_STAGES.filter(s => s.speciesId).map(s => s.speciesId);
  assert.deepEqual(raptorSpecies, [311, 272, 260, 578, 274]);
  assert.equal(t.getTrainerTier(12).stage.name, t.EVOLUTION_STAGES[11].name);
  assert.equal(t.getTrainerTier(1).stage.name, t.EVOLUTION_STAGES[0].name);
});
