// ============================================================
// 五問對卡過濾器 —— 唔使 AI，純資料 filter
// ------------------------------------------------------------
// 小朋友答 5 條問題（大细／主色／嘴形），由 583 隻計分排隊，
// 取頭 3–5 隻做候選卡，最後邊隻最似由小朋友自己對相揀。
// 計分制而唔係硬 filter：答案偏門都保證有 3–5 張卡彈出。
// ============================================================
import type { BirdSpecies, QuizAnswers } from '../types';
import { commonBirdRank } from '../data/commonBirds';
import { getBirdType, getTailStyle } from '../data/quizTraits';

export const SIZE_OPTIONS = ['細', '中', '大'] as const;
export const COLOR_OPTIONS = ['黑白', '白', '黑', '啡棕', '灰', '綠藍', '紅黃'] as const;
export const BEAK_OPTIONS = ['尖', '長', '闊', '鉤'] as const;

/** 權重：體型最容易睇錯，俾最高分；三項全中 = 10 分 */
export const QUIZ_WEIGHTS = { size: 4, main_color: 3, beak: 3 } as const;

export interface ScoredCandidate {
  bird: BirdSpecies;
  score: number;
  matches: { size: boolean; main_color: boolean; beak: boolean };
}

/** 全部候選計分（由高到低，同分按編號細先） */
export function scoreCandidates(birds: BirdSpecies[], answers: QuizAnswers): ScoredCandidate[] {
  return birds
    .map(bird => {
      const matches = {
        size: bird.size === answers.size,
        main_color: bird.main_color === answers.main_color,
        beak: bird.beak === answers.beak,
      };
      const score =
        (matches.size ? QUIZ_WEIGHTS.size : 0) +
        (matches.main_color ? QUIZ_WEIGHTS.main_color : 0) +
        (matches.beak ? QUIZ_WEIGHTS.beak : 0);
      return { bird, score, matches };
    })
    .sort((a, b) => b.score - a.score || a.bird.id - b.bird.id);
}

/**
 * 五問 → 3–5 張候選卡（永遠唔會彈 0 張或幾十張）。
 * 預設 min 3、max 5，剛好貼住 brief 規格。
 */
export function matchCandidates(
  birds: BirdSpecies[],
  answers: QuizAnswers,
  min = 3,
  max = 5,
): BirdSpecies[] {
  const ranked = scoreCandidates(birds, answers);
  if (ranked.length <= min) return ranked.map(r => r.bird);
  return ranked.slice(0, Math.max(min, Math.min(max, ranked.length))).map(r => r.bird);
}

/**
 * 五問候選「完整池」：列出所有同最高分嘅鳥，唔再硬截 5 隻。
 * 原因：583 隻只有 60 種答案組合，最大一組 96 隻；舊寫法用 id 排序截 5，
 * 63% 嘅鳥即使答中自己特徵都永遠唔會出現。呢度改做常見鳥優先＋全部列出，
 * 介面再分批顯示，目標係「用家認為見到嗰隻一定喺度」。
 */
export function candidatePool(birds: BirdSpecies[], answers: QuizAnswers): BirdSpecies[] {
  const ranked = scoreCandidates(birds, answers);
  if (ranked.length === 0) return [];
  const bestScore = ranked[0].score;
  return ranked
    .filter(c => c.score === bestScore)
    .sort((a, b) => commonBirdRank(a.bird.id) - commonBirdRank(b.bird.id) || a.bird.id - b.bird.id)
    .map(c => c.bird);
}

/** 3 頁 × 12 隻＝36：小朋友唔使碌幾十頁。 */
export const MAX_CANDIDATES = 36;

export interface CandidateResult {
  birds: BirdSpecies[];
  /** 五個答案全部吻合（唔使降落去「最接近」） */
  exact: boolean;
  /** 冇完全吻合，只顯示最接近嘅頭 36 隻 */
  truncated: boolean;
}

function matchesAll5(bird: BirdSpecies, answers: QuizAnswers): boolean {
  if (bird.size !== answers.size) return false;
  if (bird.main_color !== answers.main_color) return false;
  if (bird.beak !== answers.beak) return false;
  if (answers.birdType && getBirdType(bird) !== answers.birdType) return false;
  if (answers.tail && getTailStyle(bird) !== answers.tail) return false;
  return true;
}

/** 常見鳥先行，其次 NO. */
function commonFirst(birds: BirdSpecies[]): BirdSpecies[] {
  return [...birds].sort((a, b) =>
    commonBirdRank(a.id) - commonBirdRank(b.id) || a.id - b.id);
}

/**
 * 5 問候選：先硬過濾「全部答中」。583 隻真實資料最多只有 26 隻全中，
 * 所以未需要截；萬一答案互相矛盾（冇鳥全中），先給最接近嘅 36 隻並標記 truncated。
 * 舊 candidatePool() 保留畀 3 問 legacy 用，唔影响相容。
 */
export function candidateResult(birds: BirdSpecies[], answers: QuizAnswers): CandidateResult {
  const exact = birds.filter(b => matchesAll5(b, answers));
  if (exact.length > 0) {
    return { birds: commonFirst(exact), exact: true, truncated: exact.length > MAX_CANDIDATES };
  }
  const ranked = scoreCandidates(birds, answers);
  if (ranked.length === 0) return { birds: [], exact: false, truncated: false };
  const best = ranked[0].score;
  const closest = commonFirst(
    ranked.filter(c => c.score === best).map(c => c.bird)
  );
  return {
    birds: closest.slice(0, MAX_CANDIDATES),
    exact: false,
    truncated: closest.length > MAX_CANDIDATES,
  };
}
