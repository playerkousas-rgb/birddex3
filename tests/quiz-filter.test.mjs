import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('五問 legacy 計分：全中排第一，權重 4/3/3', () => {
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

test('candidatePool：答到自己特徵嘅鳥一定喺候選池（唔再被 id 排序截走）', () => {
  const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
  for (const id of [387, 526, 462, 245]) {
    const target = birds.find(b => b.id === id);
    const pool = filter.candidatePool(birds, {
      size: target.size, main_color: target.main_color, beak: target.beak,
    });
    assert.ok(pool.some(b => b.id === id), `NO.${id} 答中自己特徵竟然唔喺候選池`);
    const best = filter.scoreCandidates(birds, {
      size: target.size, main_color: target.main_color, beak: target.beak,
    })[0].score;
    assert.equal(pool.length, birds.filter(b => {
      const s = filter.scoreCandidates([b], {
        size: target.size, main_color: target.main_color, beak: target.beak,
      })[0].score;
      return s === best;
    }).length);
  }
  // 常見鳥排前面：家燕即使 id=387，都應該喺頭 12 張
  const swallow = birds.find(b => b.id === 387);
  const pool = filter.candidatePool(birds, {
    size: swallow.size, main_color: swallow.main_color, beak: swallow.beak,
  });
  assert.ok(pool.findIndex(b => b.id === 387) < 12, '常見鳥要高過陳舊嘅 id 排序');
});

test('最大候選池係 96 隻（中／啡棕／尖），唔會出現幾百張卡', () => {
  const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
  let max = { count: 0 };
  let combos = 0;
  for (const size of filter.SIZE_OPTIONS) {
    for (const main_color of filter.COLOR_OPTIONS) {
      for (const beak of filter.BEAK_OPTIONS) {
        combos++;
        const answers = { size, main_color, beak };
        const pool = filter.candidatePool(birds, answers);
        if (pool.length > max.count) max = { count: pool.length, size, main_color, beak };
      }
    }
  }
  assert.equal(combos, 84);
  assert.equal(max.count, 96);
  assert.deepEqual([max.size, max.main_color, max.beak], ['中', '啡棕', '尖']);
  assert.ok(max.count <= 100, `候選池爆表：${max.count}`);
});

const traits = loadTs('src/data/quizTraits.ts');

test('5 問全部答中最多 26 隻，永遠唔超過 3 頁 × 12 隻', () => {
  const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
  let max = 0;
  let at = null;
  for (const size of filter.SIZE_OPTIONS) {
    for (const main_color of filter.COLOR_OPTIONS) {
      for (const beak of filter.BEAK_OPTIONS) {
        for (const birdType of traits.TYPE_OPTIONS) {
          for (const tail of traits.TAIL_OPTIONS) {
            const r = filter.candidateResult(birds, { size, main_color, beak, birdType, tail });
            if (r.exact && r.birds.length > max) {
              max = r.birds.length;
              at = [size, main_color, beak, birdType, tail];
            }
            assert.ok(r.birds.length <= filter.MAX_CANDIDATES, `超 36 隻：${size}/${main_color}/${beak}/${birdType}/${tail}`);
          }
        }
      }
    }
  }
  assert.equal(filter.MAX_CANDIDATES, 36);
  assert.equal(max, 26);
  assert.deepEqual(at, ['細', '啡棕', '尖', '柳鶯', '尖長尾']);
});

test('任何一隻雀答自己嘅 5 個特徵，一定全中而且榜上有名', () => {
  const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
  for (const bird of birds) {
    const r = filter.candidateResult(birds, {
      size: bird.size,
      main_color: bird.main_color,
      beak: bird.beak,
      birdType: traits.getBirdType(bird),
      tail: traits.getTailStyle(bird),
    });
    assert.equal(r.exact, true, `NO.${bird.id} 答自己特徵竟然唔全中`);
    assert.ok(r.birds.some(b => b.id === bird.id), `NO.${bird.id} 唔喺候選池`);
  }
});

test('答案互相矛盾（冇雀 5 項全中）時，只出最接近嘅 36 隻並標記 truncated', () => {
  const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
  const r = filter.candidateResult(birds, {
    size: '細', main_color: '啡棕', beak: '尖', birdType: '水鳥', tail: '叉尾',
  });
  assert.equal(r.exact, false);
  assert.equal(r.birds.length, 36);
  assert.equal(r.truncated, true);
});
