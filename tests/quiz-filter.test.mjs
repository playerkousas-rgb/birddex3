import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const filter = loadTs('src/lib/birdFilter.ts');

function bird(id, size, main_color, beak, extra = {}) {
  return { id, name: `鳥${id}`, nameEn: `Bird ${id}`, size, main_color, beak, ...extra };
}

const FLOCK = [
  bird(1, '中', '啡棕', '尖'),
  bird(2, '細', '啡棕', '尖'),
  bird(3, '大', '白', '長'),
  bird(4, '中', '黑白', '尖'),
  bird(5, '大', '啡棕', '鉤'),
  bird(6, '中', '灰', '闊'),
  bird(7, '細', '白', '尖'),
  bird(8, '大', '白', '闊'),
];

test('三問計分：全中排第一，權重 4/3/3', () => {
  const answers = { size: '大', main_color: '白', beak: '長' };
  const ranked = filter.scoreCandidates(FLOCK, answers);
  assert.equal(ranked[0].bird.id, 3);
  assert.equal(ranked[0].score, 10);
  assert.deepEqual(ranked[0].matches, { size: true, main_color: true, beak: true });
  const partial = ranked.find(r => r.bird.id === 8);
  assert.equal(partial.score, 7); // 大 + 白，嘴唔中
});

test('matchCandidates 永遠回 3–5 隻，唔會 0 隻或爆表', () => {
  const answers = { size: '中', main_color: '啡棕', beak: '尖' };
  const picks = filter.matchCandidates(FLOCK, answers);
  assert.ok(picks.length >= 3 && picks.length <= 5, `got ${picks.length}`);
  assert.equal(picks[0].id, 1); // 唯一全中

  // 超偏門答案（冇鳥全中）都要有嘢彈出
  const odd = filter.matchCandidates(FLOCK, { size: '細', main_color: '綠藍', beak: '鉤' });
  assert.ok(odd.length >= 3 && odd.length <= 5, `got ${odd.length}`);

  // 超過 5 隻全中 → 截做 5
  const many = Array.from({ length: 9 }, (_, i) => bird(100 + i, '中', '灰', '闊'));
  const capped = filter.matchCandidates(many, { size: '中', main_color: '灰', beak: '闊' });
  assert.equal(capped.length, 5);
});

test('選項字串同 types 嘅 unions 完全一致', () => {
  assert.deepEqual([...filter.SIZE_OPTIONS], ['細', '中', '大']);
  assert.deepEqual([...filter.BEAK_OPTIONS], ['尖', '長', '闊', '鉤']);
  assert.equal(filter.COLOR_OPTIONS.length, 7);
});
