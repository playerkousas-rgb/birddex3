import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const filter = loadTs('src/lib/birdFilter.ts');
const traits = loadTs('src/data/quizTraits.ts');
const birds = JSON.parse(readFileSync(new URL('../src/data/birds.json', import.meta.url), 'utf8'));
const EGRET = 242;

function bird(id, size, main_color, beak, extra = {}) {
  return { id, name: `鳥${id}`, nameEn: `Bird ${id}`, size, main_color, beak, ...extra };
}

const FLOCK = [
  bird(1, '中', '啡棕', '尖', { family: '鳩鴿科' }),
  bird(2, '細', '啡棕', '尖', { family: '麻雀科' }),
  bird(3, '大', '白', '長', { family: '鷺科' }),
  bird(4, '中', '黑白', '尖', { family: '鴉科' }),
  bird(5, '大', '啡棕', '鉤', { family: '鷹科' }),
  bird(6, '中', '灰', '闊', { family: '鷗科' }),
  bird(7, '細', '白', '尖', { family: '山雀科' }),
  bird(8, '大', '白', '闊', { family: '鴨科' }),
];

const rankIn = (answers, id) => {
  const result = filter.candidateResult(birds, answers);
  return result.birds.findIndex(b => b.id === id) + 1; // 0 = 唔喺名單
};

test('權重：大細／顏色最重，身形次之，嘴形最輕', () => {
  assert.deepEqual({ ...filter.QUIZ_WEIGHTS }, { size: 40, main_color: 40, shape: 32, beak: 15 });
  assert.deepEqual([...filter.SIZE_OPTIONS], ['細', '中', '大']);
  assert.deepEqual([...filter.BEAK_OPTIONS], ['尖', '長', '闊', '鉤']);
  assert.equal(filter.COLOR_OPTIONS.length, 7);
  assert.deepEqual([...traits.SHAPE_OPTIONS], ['長頸長腳', '游水肥矮', '長翼海鳥', '鉤嘴猛禽', '細細粒', '中等鳥身']);
});

test('Answered 2 格就出結果 —— 唔使等 5 條問題答完', () => {
  assert.equal(filter.MIN_ANSWERS, 2);
  assert.equal(filter.candidateResult(birds, { size: '大' }).birds.length, 0, '一格都未夠唔應該出結果');
  const two = filter.candidateResult(birds, { size: '大', main_color: '白' });
  assert.ok(two.birds.length >= 12, '答兩格就要有相睇');
  assert.ok(two.birds.length <= filter.MAX_CANDIDATES);
});

test('大白鷺（用戶原話：白色、大隻、水鳥）一答就喺榜首', () => {
  // 用戶最直接嘅答法：大＋白
  assert.equal(rankIn({ size: '大', main_color: '白' }, EGRET), 1, '大＋白 大白鷺要排第一');
  // 加埋「長頸長腳」（大白鷺真正嘅身形）
  assert.equal(rankIn({ size: '大', main_color: '白', shape: '長頸長腳' }, EGRET), 1);
  // 只答兩個字：白＋長頸長腳
  assert.equal(rankIn({ main_color: '白', shape: '長頸長腳' }, EGRET), 1);
  // 答埋嘴形都唔會踢走佢
  assert.equal(rankIn({ size: '大', main_color: '白', shape: '長頸長腳', beak: '長' }, EGRET), 1);
});

test('答錯一格都唔會將大白鷺踢出名單', () => {
  // 用戶好容易將「長頸長腳」撳成「游水肥矮」
  assert.ok(rankIn({ size: '大', main_color: '白', shape: '游水肥矮' }, EGRET) <= 3);
  // 嘴形最易睇錯：撳咗「尖」都仲要喺名單前列
  assert.ok(rankIn({ size: '大', main_color: '白', shape: '長頸長腳', beak: '尖' }, EGRET) <= 3);
  // 身形完全撳錯（細細粒）都要喺前列，並提示改身形
  assert.ok(rankIn({ size: '大', main_color: '白', shape: '細細粒' }, EGRET) <= 3);
});

test('常見鳥用常見答案都排第一（唔係得大白鷺）', () => {
  assert.equal(rankIn({ size: '中', main_color: '啡棕', shape: '中等鳥身' }, 1), 1, '珠頸斑鳩');
  assert.equal(rankIn({ size: '細', main_color: '啡棕', shape: '細細粒' }, 11), 1, '樹麻雀');
  assert.equal(rankIn({ size: '中', main_color: '啡棕', shape: '細細粒' }, 387), 1, '家燕');
  assert.equal(rankIn({ size: '中', main_color: '灰', shape: '中等鳥身' }, 67), 1, '灰斑鳩');
});

test('全中組大過一頁都唔會截走（用戶可以「顯示更多」搵到）', () => {
  const result = filter.candidateResult(birds, { size: '中', main_color: '啡棕', shape: '中等鳥身' });
  assert.equal(result.exact, true);
  assert.ok(result.poolSize >= 40, `全中組應該好大，實際 ${result.poolSize}`);
  // 太大就要老實講「有幾多隻符合」，並提示可以轉邊一格
  assert.equal(result.warnings[0]?.kind, 'broad-match');
  assert.ok(result.warnings[0].message.includes(`${result.poolSize} 隻`), '要講實際數目，唔好講死一個數');
  assert.equal(result.birds.length, Math.min(result.poolSize, filter.MAX_CANDIDATES));
  assert.ok(result.birds.length > filter.INITIAL_PAGE, '過一頁都要列出嚟，唔可以只出 12 隻');
});

test('畫面文案嘅依據：poolSize／lowestHits 要老實反映「全中」同「近似」', () => {
  // 全中 11 隻、之後補近似雀：poolSize 只算全中，lowestHits 話畀 UI 知有近似雀
  const manyExact = filter.candidateResult(birds, { size: '大', main_color: '白', shape: '長頸長腳', beak: '長' });
  assert.equal(manyExact.exact, true);
  assert.ok(manyExact.poolSize < manyExact.birds.length, '近似雀唔應該計入全中數');
  assert.ok(manyExact.lowestHits < manyExact.totalAnswered, 'UI 要知有近似雀');

  // 全部名單都係全中：poolSize === birds.length，lowestHits === 已答格數
  const allExact = filter.candidateResult(birds, { size: '大', main_color: '白', shape: '長頸長腳' });
  assert.equal(allExact.lowestHits, allExact.totalAnswered);
  assert.equal(allExact.poolSize, allExact.birds.length);
});

test('近似層有上限，唔會因為答錯一格就彈 400 隻', () => {
  const result = filter.candidateResult(birds, { size: '大', main_color: '白', shape: '游水肥矮', beak: '尖' });
  assert.equal(result.exact, false);
  assert.ok(result.birds.length <= filter.MAX_CANDIDATES);
  // 近似補位唔會超過上限
  const noExact = filter.candidateResult(birds, { size: '大', main_color: '白', shape: '細細粒', beak: '尖' });
  assert.ok(noExact.birds.length <= filter.MAX_CANDIDATES);
});

test('冇雀全中會建議改邊一格，而且唔會叫用戶改顏色／大細', () => {
  const result = filter.candidateResult(birds, { size: '大', main_color: '白', shape: '細細粒' });
  assert.equal(result.exact, false);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].key, 'shape');
  assert.match(result.warnings[0].message, /長頸長腳/);

  // 顏色／大細係用戶最肯定嘅答案，唔會建議改
  for (const answers of [
    { size: '大', main_color: '白', shape: '游水肥矮' },
    { size: '中', main_color: '白', shape: '長頸長腳' },
    { size: '大', main_color: '黑白', shape: '長頸長腳' },
  ]) {
    for (const warning of filter.candidateResult(birds, answers).warnings) {
      assert.notEqual(warning.key, 'main_color');
      assert.notEqual(warning.key, 'size');
    }
  }
});

test('最少 12 張、最多 MAX_CANDIDATES：唔會得幾張相，亦唔會一次過 render 幾百張', () => {
  for (const size of filter.SIZE_OPTIONS) {
    for (const main_color of filter.COLOR_OPTIONS) {
      for (const shape of traits.SHAPE_OPTIONS) {
        const result = filter.candidateResult(birds, { size, main_color, shape });
        assert.ok(result.birds.length <= filter.MAX_CANDIDATES,
          `${size}/${main_color}/${shape} 爆表：${result.birds.length}`);
        assert.ok(result.birds.length >= filter.MIN_LISTED,
          `${size}/${main_color}/${shape} 少過 12 張：${result.birds.length}`);
        assert.equal(new Set(result.birds.map(b => b.id)).size, result.birds.length, '候選唔可以有重複');
      }
    }
  }
});

test('每隻雀答自己嘅特徵，一定入到候選名單', () => {
  const missing = [];
  for (const target of birds) {
    const answers = {
      size: target.size,
      main_color: target.main_color,
      shape: traits.getShape(target),
      beak: target.beak,
    };
    if (rankIn(answers, target.id) === 0) missing.push(`${target.name}(NO.${target.id})`);
  }
  assert.deepEqual(missing, [], `答中自己特徵都唔喺名單：${missing.join('、')}`);
});

test('每個科都有「身形」歸屬，冇雀默默跌落 fallback', () => {
  const known = new Set(traits.knownFamilies());
  const families = new Set(birds.map(b => b.family));
  const unmapped = [...families].filter(family => !known.has(family));
  assert.deepEqual(unmapped, [], `未歸類嘅科：${unmapped.join('、')}`);
  assert.equal(known.size, families.size, '89 個科要一一對應');

  // 常見鳥嘅情境要啱：白鷺企水邊、麻雀地面、家燕天空
  const byId = new Map(birds.map(b => [b.id, b]));
  assert.equal(traits.getShape(byId.get(242)), '長頸長腳'); // 大白鷺
  assert.equal(traits.getShape(byId.get(245)), '長頸長腳'); // 小白鷺
  assert.equal(traits.getShape(byId.get(11)), '細細粒');    // 樹麻雀
  assert.equal(traits.getShape(byId.get(387)), '細細粒');   // 家燕
  assert.equal(traits.getShape(byId.get(1)), '中等鳥身');   // 珠頸斑鳩
  assert.equal(traits.getShape(byId.get(344)), '中等鳥身'); // 喜鵲
  assert.equal(traits.getShape(byId.get(24)), '游水肥矮');  // 白額雁
  assert.equal(traits.getShape(byId.get(220)), '長翼海鳥'); // 白額鸌
  assert.equal(traits.getShape(byId.get(2)), '鉤嘴猛禽');   // 黑鳶
});

test('「中等鳥身」係最籠統嘅選項，計分要打折', () => {
  assert.equal(filter.GENERIC_FACTOR, 0.5);
  assert.equal(traits.isGenericShape('中等鳥身'), true);
  assert.equal(traits.isGenericShape('長頸長腳'), false);
  assert.equal(traits.isGenericShape(undefined), true);

  // 同樣答中身形：具體身形高分過「中等鳥身」
  const specific = filter.scoreCandidates(birds, { shape: '長頸長腳' })[0].score;
  const generic = filter.scoreCandidates(birds, { shape: '中等鳥身' })[0].score;
  assert.ok(specific > generic, `具體身形 ${specific} 應該高過籠統 ${generic}`);
});

test('舊 3 格計分介面仍然向後兼容（legacy matchCandidates / candidatePool）', () => {
  const ranked = filter.scoreCandidates(FLOCK, { size: '大', main_color: '白', beak: '長' });
  assert.equal(ranked[0].bird.id, 3);
  assert.equal(ranked[0].score, 95); // 40 + 40 + 15
  assert.equal(ranked.find(r => r.bird.id === 8).score, 80); // 大 + 白

  const picks = filter.matchCandidates(FLOCK, { size: '中', main_color: '啡棕', beak: '尖' });
  assert.ok(picks.length >= 3 && picks.length <= 5);
  assert.equal(picks[0].id, 1);

  const pool = filter.candidatePool(birds, { size: '大', main_color: '白', beak: '長' });
  assert.ok(pool.some(b => b.id === EGRET));
});

test('資料體檢：大白鷺屬鷺科而且係白色大鳥（防 pipeline 再改壞）', () => {
  const egret = birds.find(b => b.id === EGRET);
  assert.equal(egret.name, '大白鷺');
  assert.equal(egret.family, '鷺科');
  assert.equal(egret.main_color, '白');
  assert.equal(egret.size, '大');

  // 全科鷺科唔可以一齊標白（黑鳽、綠鷺、紫背葦鳽都唔係白）
  const egrets = birds.filter(b => b.family === '鷺科');
  const white = egrets.filter(b => b.main_color === '白').map(b => b.name);
  assert.ok(white.includes('大白鷺'));
  assert.ok(!white.includes('黑鳽'), '黑鳽唔應該標白');
  assert.ok(!white.includes('紫背葦鳽'), '紫背葦鳽唔應該標白');
  assert.ok(!white.includes('綠鷺'), '綠鷺唔應該標白');

  // 白色組唔可以爆到蓋過其他色（黑鳽／綠鷺／紫背葦鳽 唔應該入白色組）
  const whiteNames = new Set(birds.filter(b => b.main_color === '白').map(b => b.name));
  const whiteCount = whiteNames.size;
  assert.ok(whiteCount >= 55 && whiteCount <= 75, `白色組數量異常：${whiteCount}`);
  for (const name of ['黑鳽', '綠鷺', '紫背葦鳽', '大麻鳽', '栗葦鳽']) {
    assert.ok(!whiteNames.has(name), `${name} 唔應該標白`);
  }
});
