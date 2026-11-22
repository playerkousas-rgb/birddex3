import traitsData from './quizObservationTraits.json';
import type { BirdSpecies, QuizAnswers } from '../types';

export type FollowupKey = 'plumagePattern' | 'tailShape' | 'wingShape';
type FollowupValue = string;

export interface FollowupQuestion {
  key: FollowupKey;
  title: string;
  hint: string;
  options: readonly string[];
}

/**
 * Extra appearance cues are only used as soft ranking hints. The source descriptions
 * are incomplete, so "未能確認" must never be interpreted as "feature absent".
 */
export const FOLLOWUP_QUESTIONS: readonly FollowupQuestion[] = [
  {
    key: 'plumagePattern',
    title: '再留意一項：羽毛有咩明顯花紋？',
    hint: '可留意條紋、斑點或色塊；描述未提及不代表沒有，看不清就跳過。',
    options: ['有條紋', '有斑點', '有色塊', '多種明顯花紋'],
  },
  {
    key: 'tailShape',
    title: '再留意一項：尾巴大概係咩輪廓？',
    hint: '例如叉開、較長、短圓或扇形；睇唔清就跳過。',
    options: ['叉尾', '長尾', '短圓尾', '扇形尾', '多種輪廓線索'],
  },
  {
    key: 'wingShape',
    title: '再留意一項：翅膀輪廓比較似邊種？',
    hint: '例如長尖、寬圓或短圓；睇唔清就跳過。',
    options: ['長尖翼', '寬圓翼', '短圓翼']
  },
];

const traits = (traitsData as { birds: Record<string, Record<FollowupKey, FollowupValue>> }).birds;

export function getFollowupValue(bird: Pick<BirdSpecies, 'id'>, key: FollowupKey): FollowupValue {
  return traits[String(bird.id)]?.[key] ?? '未能確認';
}

export function getFollowupQuestion(key: FollowupKey): FollowupQuestion {
  return FOLLOWUP_QUESTIONS.find(question => question.key === key)!;
}

export function followupValueMatches(
  bird: Pick<BirdSpecies, 'id'>,
  answers: QuizAnswers,
  key: FollowupKey,
): boolean {
  const answer = answers[key];
  return !answer || getFollowupValue(bird, key) === answer;
}
