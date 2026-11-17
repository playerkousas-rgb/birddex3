// ============================================================
// 三問對卡過濾器 —— 唔使 AI，純資料 filter
// ------------------------------------------------------------
// 小朋友答 3 條問題（大细／主色／嘴形），由 583 隻計分排隊，
// 取頭 3–5 隻做候選卡，最後邊隻最似由小朋友自己對相揀。
// 計分制而唔係硬 filter：答案偏門都保證有 3–5 張卡彈出。
// ============================================================
import type { BirdSpecies, QuizAnswers } from '../types';

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
 * 三問 → 3–5 張候選卡（永遠唔會彈 0 張或幾十張）。
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
