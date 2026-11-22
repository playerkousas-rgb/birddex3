// ============================================================
// 候選鳥排序器 —— 唔使 AI，純資料計分
// ------------------------------------------------------------
// 影完相先列香港常見鳥卡；小朋友可以即刻對相，唔使先答問題。
// 大小／主色／身形／嘴形全部係自願線索，用軟計分排次序，唔會硬 filter。
// UI 一次只顯示一頁；新手唔肯定就唔使估，可以自行逐頁看或加線索縮窄。
// ============================================================
import type { BirdSpecies, QuizAnswers } from '../types';
import { commonBirdRank } from '../data/commonBirds';
import { getShape, isGenericShape, SHAPE_OPTIONS } from '../data/quizTraits';
import { FOLLOWUP_QUESTIONS, getFollowupValue } from '../data/quizObservations';
import type { FollowupKey } from '../data/quizObservations';

export const SIZE_OPTIONS = ['細', '中', '大'] as const;
export const COLOR_OPTIONS = ['黑白', '白', '黑', '啡棕', '灰', '綠藍', '紅黃'] as const;
export const BEAK_OPTIONS = ['尖', '長', '闊', '鉤'] as const;

/**
 * 每格分數。大細／顏色最影響輪廓，分最重；
 * 身形係外形（一眼睇得到），分數同顏色接近；嘴形最細最易睇錯，所以最輕。
 * 揀最籠統嘅身形（中等鳥身）等於冇答，只計一半。
 */
export const QUIZ_WEIGHTS = {
  size: 40, main_color: 40, shape: 32, beak: 15,
  plumagePattern: 22, tailShape: 18, wingShape: 18,
} as const;

/** 候選超過門檻時，先完成／跳過四項基本線索，再逐題加問可見外貌。 */
export const FOLLOWUP_THRESHOLD = 16;
const BASE_KEYS = ['size', 'main_color', 'shape', 'beak'] as const;

/** 揀咗最籠統選項時嘅折扣。 */
export const GENERIC_FACTOR = 0.5;

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
  if (answers.shape) matches.shape = getShape(bird) === answers.shape;
  if (answers.beak) matches.beak = bird.beak === answers.beak;
  for (const question of FOLLOWUP_QUESTIONS) {
    const answer = answers[question.key];
    if (answer) {
      const observed = getFollowupValue(bird, question.key);
      // 描述未提及唔代表雀冇呢個特徵；未知資料要保留，避免錯誤踢走正解。
      matches[question.key] = observed === '未能確認' || observed === answer;
    }
  }
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
          // 身形揀「中等鳥身」= 冇指明外形，唔應該同「長頸長腳」同分
          const factor = key === 'shape' && isGenericShape(answers.shape) ? GENERIC_FACTOR : 1;
          score += Math.round(QUIZ_WEIGHTS[key] * factor);
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
export const MAX_CANDIDATES = 64;

/** 單次最多展示幾張候選，避免初學者一口氣面對大量相似鳥卡。 */
export const SHORTLIST_SIZE = 8;

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
  shape: '身形',
  beak: '嘴形',
  plumagePattern: '羽毛花紋',
  tailShape: '尾巴輪廓',
  wingShape: '翅膀輪廓',
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
  if (usable.length === 0) {
    return { birds: [], exact: false, poolSize: 0, warnings: [], lowestHits: 0, totalAnswered: keys.length };
  }

  const ranked = scoreCandidates(usable, answers);
  if (keys.length === 0) {
    return {
      birds: ranked.slice(0, MAX_CANDIDATES).map(candidate => candidate.bird),
      exact: false,
      poolSize: 0,
      warnings: [],
      lowestHits: 0,
      totalAnswered: 0,
    };
  }

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
    // 全中少於 12 隻時保留全中；四項都已答就唔補不符合的近似鳥，避免正確答案反而要翻多頁。
    take(exactBand, MAX_CANDIDATES);
    if (keys.length >= BASE_KEYS.length) {
      const exactPoolSize = exactBand.length;
      return {
        birds: listed.map(c => c.bird), exact: true, poolSize: exactPoolSize,
        warnings: [], lowestHits: keys.length, totalAnswered: keys.length,
      };
    }
    // 部分答案時才用「差一格」補位；短名單上限 64，鼓勵再加一項觀察而非面對大清單。
    let nearBudget = nearBand.length ? NEAR_MISS_LIMIT : 0;
    for (let hits = keys.length - 1; hits >= 0 && listed.length < MAX_CANDIDATES; hits -= 1) {
      const band = bands.get(hits) ?? [];
      const budget = hits === keys.length - 1
        ? Math.min(nearBudget, MAX_CANDIDATES - listed.length)
        : MIN_LISTED - listed.length;
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
    const key: AnswerKey = keys.includes('shape') ? 'shape' : keys.includes('beak') ? 'beak' : keys[0];
    const truncated = exactPoolSize > MAX_CANDIDATES;
    warnings = [{
      kind: 'broad-match',
      key,
      message: truncated
        ? `有 ${exactPoolSize} 隻都符合；暫時列出排序最前 ${MAX_CANDIDATES} 隻。再揀一項外貌線索縮窄，避免漏看。`
        : `有 ${exactPoolSize} 隻都符合；唔似就再揀一項外貌線索縮窄。`,
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

/** 超過 16 隻時，逐題選能把目前候選群切得最細的、尚未問過的外貌線索。 */
export function chooseNextFollowupQuestion(
  birds: BirdSpecies[],
  answers: QuizAnswers,
  skipped: readonly FollowupKey[] = [],
): FollowupKey | null {
  const result = candidateResult(birds, answers);
  const count = result.exact ? result.poolSize : result.birds.length;
  if (count <= FOLLOWUP_THRESHOLD) return null;

  const ranked = scoreCandidates(birds, answers);
  const current = result.exact
    ? ranked.filter(candidate => candidate.hits === result.totalAnswered).map(candidate => candidate.bird)
    : result.birds;
  const completed = new Set<FollowupKey>([
    ...skipped,
    ...FOLLOWUP_QUESTIONS.filter(question => !!answers[question.key]).map(question => question.key),
  ]);

  let best: { key: FollowupKey; largestGroup: number } | null = null;
  for (const question of FOLLOWUP_QUESTIONS) {
    if (completed.has(question.key)) continue;
    const buckets = new Map<string, number>();
    let unknownCount = 0;
    for (const bird of current) {
      const value = getFollowupValue(bird, question.key);
      if (value === '未能確認') {
        unknownCount += 1;
        continue;
      }
      buckets.set(value, (buckets.get(value) ?? 0) + 1);
    }
    // 未知描述會留喺任何一個答案組，因此只當已知值可以分流時先加問。
    const largestGroup = Math.max(0, ...[...buckets.values()].map(count => count + unknownCount));
    if (buckets.size < 2 || largestGroup >= current.length) continue;
    if (!best || largestGroup < best.largestGroup) best = { key: question.key, largestGroup };
  }
  return best?.key ?? null;
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
    shape: SHAPE_OPTIONS,
    beak: BEAK_OPTIONS,
    plumagePattern: FOLLOWUP_QUESTIONS[0].options,
    tailShape: FOLLOWUP_QUESTIONS[1].options,
    wingShape: FOLLOWUP_QUESTIONS[2].options,
  };
  // 顏色同大細係用戶最肯定嘅（白色大鳥就係白色大鳥），唔會叫佢改；
  // 身形同嘴形先值得建議（身形嘅「細細粒／中等鳥身」好易撳錯）。
  const revisable: AnswerKey[] = (['shape', 'beak'] as AnswerKey[]).filter(key => keys.includes(key));

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
