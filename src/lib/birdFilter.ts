// ============================================================
// 五問對卡過濾器 —— 唔使 AI，純資料計分
// ------------------------------------------------------------
// 影完相，小朋友答 2–5 個特徵（大細／主色／嘴形／喺邊度見到），
// 由 583 隻計分排隊，最後邊隻最似由小朋友自己對相揀。
//
// 舊版死穴（2026-11-19 修正）：
//   1. 5 題全部要答完先准睇結果；Q4「鶲類／柳鶯」係鳥類學術語，冇人識答，
//      所以用戶永遠卡死喺答案未齊，感覺「5 條問題完全冇用」。
//   2. Q4/Q5 係硬 filter：答錯一格（例如大白鷺明明企水邊，卻撳咗「水中游」／
//      「叉尾」）就直接將正確答案踢出名單，即使大細＋顏色＋嘴都全中。
//   3. 排序用 id 唔用吻合度。
//
// 新版分數：大細 40／主色 40／喺邊度 30／嘴 15，按吻合度排隊，
// 唔再硬過濾；即使答錯一格，正確嗰隻仍然排最前。
// ============================================================
import type { BirdSpecies, QuizAnswers } from '../types';
import { commonBirdRank } from '../data/commonBirds';
import { getSpot, SPOT_OPTIONS } from '../data/quizTraits';

export const SIZE_OPTIONS = ['細', '中', '大'] as const;
export const COLOR_OPTIONS = ['黑白', '白', '黑', '啡棕', '灰', '綠藍', '紅黃'] as const;
export const BEAK_OPTIONS = ['尖', '長', '闊', '鉤'] as const;

/**
 * 每格分數。大細／顏色最影響輪廓，分最重；
 * 「喺邊度見到」用戶答得最肯定；嘴形最細最易睇錯，所以最輕。
 */
export const QUIZ_WEIGHTS = { size: 40, main_color: 40, spot: 30, beak: 15 } as const;

type AnswerKey = keyof typeof QUIZ_WEIGHTS;

const keysOf = (answers: QuizAnswers): AnswerKey[] =>
  (Object.keys(QUIZ_WEIGHTS) as AnswerKey[]).filter(key => !!answers[key]);

export function answerCount(answers: QuizAnswers): number {
  return keysOf(answers).length;
}

export interface ScoredCandidate {
  bird: BirdSpecies;
  score: number;
  /** 已答嘅格入面，中咗幾多格 */
  hits: number;
  /** 每格係咪命中（只列已答嘅格） */
  matches: Partial<Record<AnswerKey, boolean>>;
}

function traitMatch(bird: BirdSpecies, answers: QuizAnswers): Partial<Record<AnswerKey, boolean>> {
  const matches: Partial<Record<AnswerKey, boolean>> = {};
  if (answers.size) matches.size = bird.size === answers.size;
  if (answers.main_color) matches.main_color = bird.main_color === answers.main_color;
  if (answers.spot) matches.spot = getSpot(bird) === answers.spot;
  if (answers.beak) matches.beak = bird.beak === answers.beak;
  return matches;
}

/** 全部 583 隻計分（高分先；同分按常見鳥 → NO.） */
export function scoreCandidates(birds: BirdSpecies[], answers: QuizAnswers): ScoredCandidate[] {
  return birds
    .map(bird => {
      const matches = traitMatch(bird, answers);
      let score = 0;
      let hits = 0;
      for (const [key, hit] of Object.entries(matches) as Array<[AnswerKey, boolean]>) {
        if (hit) {
          score += QUIZ_WEIGHTS[key];
          hits += 1;
        }
      }
      return { bird, score, hits, matches };
    })
    .sort((a, b) =>
      b.score - a.score ||
      commonBirdRank(a.bird.id) - commonBirdRank(b.bird.id) ||
      a.bird.id - b.bird.id);
}

/** 3–5 張卡嘅 legacy 介面（保留畀舊呼叫端，UI 已唔用）。 */
export function matchCandidates(
  birds: BirdSpecies[],
  answers: QuizAnswers,
  min = 3,
  max = 5,
): BirdSpecies[] {
  const ranked = scoreCandidates(birds, answers);
  return ranked.slice(0, Math.max(min, Math.min(max, ranked.length))).map(r => r.bird);
}

/** 3 問 legacy：同最高分嗰批全部列出（常見鳥先）。 */
export function candidatePool(birds: BirdSpecies[], answers: QuizAnswers): BirdSpecies[] {
  const ranked = scoreCandidates(birds, answers);
  if (ranked.length === 0) return [];
  const bestScore = ranked[0].score;
  return ranked.filter(c => c.score === bestScore).map(c => c.bird);
}

/**
 * 名單硬上限。第一版只顯示 12 張，之後用戶自己撳「顯示更多」。
 * 上限存在係為咗唔會一次過 render 幾百張卡，但唔可以細到「有雀中特徵都見唔到」——
 * 中／啡棕／尖／樹上 一組就有 89 隻，舊版截 36 隻等於永遠有 53 隻搵唔到。
 */
export const MAX_CANDIDATES = 120;

/** 第一版顯示幾多張；之後每次「顯示更多」加幾多。 */
export const PAGE_SIZE = 12;
export const INITIAL_PAGE = 12;

/** 最少答幾多格先准出候選：大細／顏色／喺邊度，任兩格。 */
export const MIN_ANSWERS = 2;

/** 想最少有幾多張相可以對。 */
export const MIN_LISTED = 12;

/** 答錯一格時，「差一格」嘅近似雀最多補幾多隻（其餘靠提示叫用戶改答案）。 */
export const NEAR_MISS_LIMIT = 48;

/** 全中組大到呢個數，就提示「可能有一格撳錯，可以轉」。 */
export const BROAD_MATCH = 30;

export interface CandidateResult {
  /** ≤ MAX_CANDIDATES，常見鳥排前 */
  birds: BirdSpecies[];
  /** 所有已答嘅格都命中（完美配對） */
  exact: boolean;
  /** 完美配對嗰批嘅實際總數（可以多過 birds.length，因 UI 分頁顯示） */
  poolSize: number;
  /** 提示：用戶揀嘅某一格同數據夾唔到，建議改邊一格 */
  warnings: QuizWarning[];
  /** 名單裡最低嘅吻合格數（＝已答格數代表全中） */
  lowestHits: number;
  /** 今次答咗幾多格 */
  totalAnswered: number;
}

export interface QuizWarning {
  kind: 'trait-mismatch' | 'broad-match';
  /** 建議改邊一格 */
  key: AnswerKey;
  message: string;
}

const TRAIT_LABEL: Record<AnswerKey, string> = {
  size: '大細',
  main_color: '顏色',
  spot: '「喺邊度見到」',
  beak: '嘴形',
};

/**
 * 排序＋分層：
 *   1. 完美配對（已答嘅格全部中），常見鳥排前
 *   2. 唔夠 12 張先用「差一格」嘅近似答案補（答錯一格都唔會將正解踢走）
 *   3. 仍然唔夠就逐級再放寬
 * 總數永遠 ≤ MAX_CANDIDATES。
 */
export function candidateResult(birds: BirdSpecies[], answers: QuizAnswers): CandidateResult {
  const usable = birds.filter(b => b.size && b.main_color && b.beak);
  const keys = keysOf(answers);
  if (usable.length === 0 || keys.length < MIN_ANSWERS) {
    return { birds: [], exact: false, poolSize: 0, warnings: [], lowestHits: 0, totalAnswered: keys.length };
  }

  const ranked = scoreCandidates(usable, answers);
  const bands = new Map<number, ScoredCandidate[]>();
  for (const candidate of ranked) {
    const list = bands.get(candidate.hits) ?? [];
    list.push(candidate);
    bands.set(candidate.hits, list);
  }

  // 「落棒式」挑選：
  //   1. 先輪流由「全中」同「只差一格」拎雀（每次各一隻），
  //      咁就算用戶撳錯一格，嗰隻排第一嘅正解都唔會被幾十隻全中嘅雀遮住；
  //   2. 兩層都拎完先至考慮「差兩格」。
  const listed: ScoredCandidate[] = [];
  const used = new Set<number>();
  const take = (band: ScoredCandidate[] | undefined, wanted: number): number => {
    if (!band) return 0;
    let taken = 0;
    for (const candidate of band) {
      if (taken >= wanted || listed.length >= MAX_CANDIDATES) break;
      if (used.has(candidate.bird.id)) continue;
      used.add(candidate.bird.id);
      listed.push(candidate);
      taken += 1;
    }
    return taken;
  };

  const exactBand = bands.get(keys.length) ?? [];
  const nearBand = bands.get(keys.length - 1) ?? [];

  if (!exactBand.length) {
    // 冇雀全中：由最高分開始逐級列出，唔會被單一分數全部佔滿
    take(nearBand, MAX_CANDIDATES);
    for (let hits = keys.length - 2; hits >= 0 && listed.length < MIN_LISTED; hits -= 1) {
      take(bands.get(hits), MIN_LISTED - listed.length);
    }
  } else if (exactBand.length >= MIN_LISTED) {
    // 全中夠相睇：先列全中；唔夠 12 張先補「差一格」
    take(exactBand, MAX_CANDIDATES);
    if (listed.length < MIN_LISTED) take(nearBand, MIN_LISTED - listed.length);
  } else {
    // 全中太少（答錯一格就係咁）：全中同「差一格」梅花間竹，
    // 保證嗰隻正解唔會被幾十隻中兩格嘅雀遮住。
    take(exactBand, MAX_CANDIDATES);
    // 近似層（差一格）只補到上限為止 —— 否則「大＋白」一類答案會拉出幾百隻
    // 全表最相似嘅雀，反而更難搵。
    let nearBudget = nearBand.length ? NEAR_MISS_LIMIT : 0;
    for (let hits = keys.length - 1; hits >= 0 && listed.length < MAX_CANDIDATES; hits -= 1) {
      const band = bands.get(hits) ?? [];
      const budget = hits === keys.length - 1 ? Math.min(nearBudget, MAX_CANDIDATES - listed.length) : MAX_CANDIDATES - listed.length;
      nearBudget -= take(band, budget);
    }
    if (listed.length > MIN_LISTED) {
      // 梅花間竹：重排成 全中,差一格,全中,差一格…
      const exactPart = listed.filter(c => c.hits === keys.length);
      const nearPart = listed.filter(c => c.hits === keys.length - 1);
      const rest = listed.filter(c => c.hits < keys.length - 1);
      const woven: ScoredCandidate[] = [];
      for (let i = 0; i < Math.max(exactPart.length, nearPart.length); i += 1) {
        if (exactPart[i]) woven.push(exactPart[i]);
        if (nearPart[i]) woven.push(nearPart[i]);
      }
      listed.length = 0;
      listed.push(...woven, ...rest);
      listed.length = Math.min(listed.length, MAX_CANDIDATES);
    }
  }

  const exactPoolSize = exactBand.length;
  let warnings: QuizWarning[] = [];
  if (exactPoolSize === 0) {
    warnings = suggestFix(usable, answers, 0);
  } else if (exactPoolSize > BROAD_MATCH) {
    // 全中組太大：唔代表答錯，但用戶好可能係其中一格撳錯咗，
    // 提示「唔啱就轉呢格」，好過要佢自己估。
    const key: AnswerKey = keys.includes('spot') ? 'spot' : keys.includes('beak') ? 'beak' : keys[0];
    warnings = [{
      kind: 'broad-match',
      key,
      message: `有 ${exactPoolSize} 隻都符合。如果冇你嗰隻，試下轉${TRAIT_LABEL[key]}。`,
    }];
  }
  return {
    birds: listed.map(c => c.bird),
    exact: exactPoolSize > 0,
    poolSize: exactPoolSize,
    lowestHits: listed.length ? listed[listed.length - 1].hits : 0,
    totalAnswered: keys.length,
    warnings,
  };
}

/**
 * 冇雀全中時，估邊一格最可能答錯：逐格試換其他選項，
 * 睇邊個一換就最多雀「全中」—— 直接建議用戶改嗰格。
 * 只有真係有明顯改善（≥ 4 隻）先出聲，唔亂叫。
 */
function suggestFix(
  birds: BirdSpecies[],
  answers: QuizAnswers,
  currentPool: number,
): QuizWarning[] {
  const keys = keysOf(answers);
  const options: Record<AnswerKey, readonly string[]> = {
    size: SIZE_OPTIONS,
    main_color: COLOR_OPTIONS,
    spot: SPOT_OPTIONS,
    beak: BEAK_OPTIONS,
  };
  // 顏色同大細係用戶最肯定嘅（白色大鳥就係白色大鳥），唔會叫佢改；
  // 只有「喺邊度見到」同嘴形係影相時最易睇錯，先值得建議。
  const revisable: AnswerKey[] = (['spot', 'beak'] as AnswerKey[]).filter(key => keys.includes(key));

  let best: { key: AnswerKey; value: string; pool: number } | null = null;
  for (const key of revisable) {
    for (const value of options[key]) {
      if (value === answers[key]) continue;
      const trial = { ...answers, [key]: value } as QuizAnswers;
      const pool = scoreCandidates(birds, trial).filter(c => c.hits === keys.length).length;
      if (!best || pool > best.pool) best = { key, value, pool };
    }
  }
  // 淨係喺換咗真係多好多雀先出聲（≥ 4 隻，而且明顯多過而家）。
  if (!best || best.pool < Math.max(4, currentPool + 3)) return [];
  return [{
    kind: 'trait-mismatch',
    key: best.key,
    message: `${TRAIT_LABEL[best.key]}改做「${best.value}」就有 ${best.pool} 隻全中，試下？`,
  }];
}
