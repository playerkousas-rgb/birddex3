/**
 * 對卡用嘅「身形」分組 —— 第 3 題問嘅係外形特徵。
 * 只從 birds.json 已有嘅 family 推導，唔改資料檔、唔加 IP、唔郁 storage key。
 *
 * 演變（重要）：
 *   舊版 Q3「佢似邊一類？」= 12 個鳥類學術語（鶲類／柳鶯／蘆鶯／鶇鶥…），
 *     一般用戶等於冇得答；Q4「尾形」又係由科推導嘅噪音（鷺科＝扇尾），
 *     兩題一答錯就會硬 filter 走正確答案。
 *   3.3.0 曾改為「你喺邊度見到佢？」—— 但用家正確指出：嗰個係地點，唔係外形。
 *   3.4.0 改為問**身形**（長頸長腳／游水肥矮／長翼海鳥／鉤嘴猛禽／細細粒／中等鳥身），
 *     全部係張相一眼睇得到嘅外形，89 個科 100% 有歸屬。
 */
import type { BirdSpecies, ShapeKind } from '../types';

/** 由最容易分辨到最籠統排：揀「細細粒」等於冇答，所以擺最後。 */
export const SHAPE_OPTIONS = [
  '長頸長腳', '游水肥矮', '長翼海鳥', '鉤嘴猛禽', '細細粒', '中等鳥身',
] as const;

const LONG_LEG = [
  '鷺科', '鶴科', '鸛科', '䴉科', '鷸科', '鴴科', '反嘴鷸科', '蠣鴴科',
  '彩鷸科', '水雉科', '石鴴科', '燕鴴科', '三趾鶉科', '秧雞科',
];
const SWIMMER = ['鴨科', '鷉科', '潛鳥科', '鸕鶿科', '鵜鶘科', '海雀科'];
const SEABIRD = ['鷗科', '鸌科', '賊鷗科', '軍艦鳥科', '鰹鳥科', '熱帶鳥科', '海燕科'];
const RAPTOR = ['鷹科', '隼科', '鴟鴞科', '草鴞科', '鶚科'];
const TINY = [
  '麻雀科', '山雀科', '繡眼鳥科', '太陽鳥科', '啄花鳥科', '梅花雀科', '鵐科',
  '燕雀科', '織雀科', '鐵爪鵐科', '長尾山雀科', '鳾科', '鶯雀科', '柳鶯科', '樹鶯科',
  '葦鶯科', '蝗鶯科', '扇尾鶯科', '鶯科', '戴菊科', '攀雀科', '鶲科', '王鶲科', '仙鶲科',
  '百靈科', '太平鳥科', '燕科', '雨燕科',
];
const MEDIUM = [
  '鴉科', '椋鳥科', '鵯科', '鶇科', '噪鶥科', '畫眉科', '雀鶥科', '鴉雀科',
  '鱗胸鷦鶥科', '山椒鳥科', '伯勞科', '卷尾科', '鳩鴿科', '杜鵑科', '翠鳥科', '啄木鳥科',
  '鬚鴷科', '八色鳥科', '黃鸝科', '葉鵯科', '夜鷹科', '燕鵙科', '雉科', '鸚鵡科',
  '鳳頭鸚鵡科', '戴勝科', '佛法僧科', '蜂虎科', '鶺鴒科',
];

const SHAPE_BY_FAMILY = new Map<string, ShapeKind>();
for (const [shape, families] of [
  ['長頸長腳', LONG_LEG],
  ['游水肥矮', SWIMMER],
  ['長翼海鳥', SEABIRD],
  ['鉤嘴猛禽', RAPTOR],
  ['細細粒', TINY],
  ['中等鳥身', MEDIUM],
] as const) {
  for (const family of families) SHAPE_BY_FAMILY.set(family, shape);
}

/** 「身形」→ 6 個外形；未知科當「中等鳥身」（雀形目佔最多）。 */
export function getShape(bird: BirdSpecies): ShapeKind {
  return SHAPE_BY_FAMILY.get(bird.family) ?? '中等鳥身';
}

/** 最籠統嘅身形：揀咗等於冇答，計分權重最低。 */
export function isGenericShape(shape: ShapeKind | undefined): boolean {
  return shape === '中等鳥身' || shape === undefined;
}

/** 測試用：確認 birds.json 每個科都有歸屬（唔准默默跌落 fallback）。 */
export function knownFamilies(): string[] {
  return [...SHAPE_BY_FAMILY.keys()];
}
