/**
 * 5 問對卡用嘅「體態／尾形」衍生特徵。
 * 只從 birds.json 已有嘅 family 推導，唔改資料檔、唔加 IP、唔郁 storage key。
 * 目的：將 3 問 84 種答案（最大 96 隻候選）收窄到「全部答中最多 26 隻」，
 * 剛好 3 頁 × 12 隻之內（見 tests/quiz-filter.test.mjs）。
 */
import type { BirdSpecies, BirdType, TailStyle } from '../types';

export const TYPE_OPTIONS = [
  '水鳥', '海鳥', '涉禽', '猛禽', '陸鳥', '飛行鳥',
  '鶲類', '柳鶯', '蘆鶯', '雀鳥', '鶇鶥', '其他鳥',
] as const;

export const TAIL_OPTIONS = ['叉尾', '尖長尾', '短圓尾', '扇尾', '中尾'] as const;

const WATER = ['鴨科', '鷉科', '鸕鶿科', '鵜鶘科', '潛鳥科'];
const SEA = ['鷗科', '賊鷗科', '鸌科', '鰹鳥科', '熱帶鳥科', '海雀科', '軍艦鳥科', '海燕科'];
const WADER = ['鷸科', '鷺科', '秧雞科', '鴴科', '反嘴鷸科', '鶴科', '鸛科', '䴉科', '三趾鶉科', '燕鴴科', '石鴴科', '蠣鴴科', '彩鷸科', '水雉科'];
const RAPTOR = ['鷹科', '隼科', '鴟鴞科', '鶚科', '草鴞科'];
const LAND = ['鳩鴿科', '雉科', '鸚鵡科', '鳳頭鸚鵡科', '杜鵑科', '夜鷹科', '啄木鳥科', '鬚鴷科', '戴勝科', '佛法僧科', '蜂虎科', '八色鳥科', '黃鸝科', '葉鵯科'];
const AERIAL = ['燕科', '雨燕科', '燕鵙科', '卷尾科', '伯勞科', '山椒鳥科'];
const FLYCATCHER = ['鶲科', '王鶲科', '仙鶲科'];
const WILLOW = ['柳鶯科', '樹鶯科'];
const REED = ['葦鶯科', '蝗鶯科', '扇尾鶯科', '鶯科', '戴菊科', '攀雀科'];
const FINCH = ['鵐科', '麻雀科', '梅花雀科', '燕雀科', '織雀科', '鐵爪鵐科', '百靈科', '太陽鳥科', '繡眼鳥科', '啄花鳥科'];
const THRUSH = ['鶇科', '噪鶥科', '畫眉科', '雀鶥科', '鴉雀科', '鱗胸鷦鶥科'];

const FORK = [...AERIAL, '杜鵑科'];
const LONG_TAIL = [...FLYCATCHER, ...WILLOW, ...REED, '長尾山雀科', '織雀科', '太平鳥科'];
const SHORT_TAIL = ['山雀科', '鳾科', '繡眼鳥科', '啄花鳥科', '麻雀科', '梅花雀科', '太陽鳥科', '鶺鴒科', '八色鳥科'];
const FAN_TAIL = [...RAPTOR, '鷺科', '鶴科', '鸛科', '䴉科', '鴨科', '雉科'];

export function getBirdType(bird: BirdSpecies): BirdType {
  const f = bird.family;
  if (WATER.includes(f)) return '水鳥';
  if (SEA.includes(f)) return '海鳥';
  if (WADER.includes(f)) return '涉禽';
  if (RAPTOR.includes(f)) return '猛禽';
  if (LAND.includes(f)) return '陸鳥';
  if (AERIAL.includes(f)) return '飛行鳥';
  if (FLYCATCHER.includes(f)) return '鶲類';
  if (WILLOW.includes(f)) return '柳鶯';
  if (REED.includes(f)) return '蘆鶯';
  if (FINCH.includes(f)) return '雀鳥';
  if (THRUSH.includes(f)) return '鶇鶥';
  return '其他鳥';
}

export function getTailStyle(bird: BirdSpecies): TailStyle {
  const f = bird.family;
  if (FORK.includes(f)) return '叉尾';
  if (LONG_TAIL.includes(f)) return '尖長尾';
  if (SHORT_TAIL.includes(f)) return '短圓尾';
  if (FAN_TAIL.includes(f)) return '扇尾';
  return '中尾';
}
