import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const theme = loadTs('src/lib/theme.ts');
const stats = loadTs('src/lib/birdStats.ts');
const aliases = loadTs('src/data/nameAliases.ts');
const birds = JSON.parse(readFileSync('src/data/birds.json', 'utf8'));

test('all 569 bird records and alias targets remain intact, with R2 images', () => {
  assert.equal(birds.length, 569);
  const ids = new Set(birds.map(bird => bird.id));
  assert.equal(ids.size, 569);
  for (const bird of birds) assert.match(bird.photoUrl, /^https:\/\/[^/]+\.r2\.dev\/birdcards\/\d{4}\.avif$/);
  for (const entry of aliases.getAllAliases()) assert.ok(ids.has(entry.speciesId));
});

test('existing exact and punctuation-normalized name matches remain unchanged', () => {
  // Mirror the original lookup table, including existing last-entry-wins collisions.
  const original = new Map();
  for (const entry of aliases.getAllAliases()) {
    for (const alias of entry.aliases) {
      original.set(alias.toLowerCase().trim(), entry.speciesId);
      original.set(alias.toLowerCase().replace(/[-_']/g, '').trim(), entry.speciesId);
    }
  }
  for (const [label, id] of original) assert.equal(aliases.resolveBirdId(label), id, label);
  assert.equal(aliases.resolveBirdId(''), undefined);
  assert.equal(aliases.resolveBirdId('not a species'), undefined);
});

test('scientific names with parenthesized common names resolve correctly', () => {
  const id = aliases.resolveBirdId('Passer montanus');
  assert.ok(id);
  assert.equal(aliases.resolveBirdId('Passer montanus (Tree Sparrow)'), id);
  assert.equal(aliases.resolveBirdId(' PASSER MONTANUS '), id);
});

test('rarity, XP and trainer level boundaries are unchanged', () => {
  for (const [count, rarity] of [[0,'UC'],[1,'C'],[2,'C'],[3,'R'],[4,'R'],[5,'SR'],[7,'SR'],[8,'SSR'],[11,'SSR'],[12,'UR'],[19,'UR'],[20,'LR']]) {
    assert.equal(theme.getRarityFromCount(count), rarity);
  }
  assert.deepEqual(theme.RARITY_ORDER.map(theme.xpForCapture), [5,10,20,35,55,80,120]);
  for (const level of theme.LEVEL_TITLES) assert.equal(theme.getLevelFromXp(level.xp).level, level.level);
  assert.equal(theme.getLevelFromXp(99).level, 1);
  assert.equal(theme.getLevelFromXp(10000).nextXp, null);
});

test('capture IV, CP, throw bonuses, shiny and traits keep their existing ranges', () => {
  for (const catchScore of [null, 'Nice', 'Great', 'Excellent']) {
    for (let i = 0; i < 100; i++) {
      const result = stats.generateCaptureStats({ catchScore, zoomLevel: 3 });
      const values = ['hp','atk','def','spd','sta'].map(key => result.iv[key]);
      assert.ok(values.every(value => Number.isInteger(value) && value >= 0 && value <= 31));
      assert.equal(result.iv.total, values.reduce((a,b) => a+b, 0));
      assert.equal(result.iv.percent, Math.round(result.iv.total / 155 * 100));
      assert.equal(result.catchScore, catchScore);
      assert.equal(result.catchDistance, 3);
      assert.ok(result.cp >= 10);
      assert.ok(stats.NATURES.includes(result.nature));
      assert.ok(stats.TRAITS.includes(result.trait));
      assert.equal(typeof result.isShiny, 'boolean');
      if (catchScore === 'Excellent') assert.ok(result.iv.hp >= 28 && result.iv.atk >= 28 && result.iv.spd >= 28);
    }
  }
});
