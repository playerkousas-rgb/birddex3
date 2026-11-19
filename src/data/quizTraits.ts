/**
 * 五問對卡用嘅「喺邊度見到」分組。
 * 只從 birds.json 已有嘅 family 推導，唔改資料檔、唔加 IP、唔郁 storage key。
 *
 * 舊版 Q4「佢似邊一類？」有 12 個鳥類學術語（鶲類／柳鶯／蘆鶯／鶇鶥…），
 * 對一般用戶等於冇得答；Q5「尾形」又係由科推導嘅噪音（鷺科＝扇尾），
 * 兩題一答錯就會硬 filter 走正確答案。呢度改成「你喺邊度見到佢」，
 * 6 個全部係影相時真係睇得到嘅情境，89 個科 100% 有歸屬。
 */
import type { BirdSpecies, SpotKind } from '../types';

export const SPOT_OPTIONS = ['水中游', '水邊行', '海面飛', '天空飛', '樹上', '地面'] as const;

const WATER_SWIM = ['鴨科', '鷉科', '潛鳥科', '鸕鶿科', '鵜鶘科'];
const WATER_EDGE = [
  '鷺科', '鷸科', '鴴科', '秧雞科', '反嘴鷸科', '鶴科', '鸛科', '䴉科',
  '三趾鶉科', '燕鴴科', '石鴴科', '蠣鴴科', '彩鷸科', '水雉科', '翠鳥科',
];
const SEA_FLY = ['鷗科', '賊鷗科', '鸌科', '鰹鳥科', '熱帶鳥科', '海雀科', '軍艦鳥科', '海燕科'];
const SKY_FLY = ['燕科', '雨燕科', '燕鵙科', '鷹科', '隼科', '鶚科', '蜂虎科', '佛法僧科'];
const TREE = [
  '鶲科', '王鶲科', '仙鶲科', '柳鶯科', '樹鶯科', '葦鶯科', '蝗鶯科', '扇尾鶯科',
  '鶯科', '戴菊科', '攀雀科', '鵐科', '梅花雀科', '燕雀科', '織雀科', '鐵爪鵐科',
  '太陽鳥科', '繡眼鳥科', '啄花鳥科', '鶇科', '噪鶥科', '畫眉科', '雀鶥科', '鴉雀科',
  '鱗胸鷦鶥科', '山雀科', '長尾山雀科', '鳾科', '鶯雀科', '太平鳥科', '杜鵑科',
  '啄木鳥科', '鬚鴷科', '八色鳥科', '黃鸝科', '葉鵯科', '鵯科', '山椒鳥科',
  '伯勞科', '卷尾科', '鴟鴞科', '草鴞科',
];
const GROUND = [
  '鳩鴿科', '雉科', '鸚鵡科', '鳳頭鸚鵡科', '夜鷹科', '戴勝科', '椋鳥科', '鴉科',
  '麻雀科', '鶺鴒科', '百靈科',
];

const SPOT_BY_FAMILY = new Map<string, SpotKind>();
for (const [spot, families] of [
  ['水中游', WATER_SWIM],
  ['水邊行', WATER_EDGE],
  ['海面飛', SEA_FLY],
  ['天空飛', SKY_FLY],
  ['樹上', TREE],
  ['地面', GROUND],
] as const) {
  for (const family of families) SPOT_BY_FAMILY.set(family, spot);
}

const WATER_SPOTS: SpotKind[] = ['水中游', '水邊行', '海面飛'];

/** 「喺邊度見到」→ 6 個情境；未知科當「樹上」（雀形目佔最多）。 */
export function getSpot(bird: BirdSpecies): SpotKind {
  return SPOT_BY_FAMILY.get(bird.family) ?? '樹上';
}

/** 水鳥（游水／水邊／海面）— 用嚟顯示「你揀咗水鳥」提示，唔直接做過濾。 */
export function isWaterBird(bird: BirdSpecies): boolean {
  return WATER_SPOTS.includes(getSpot(bird));
}

/** 測試用：確認 birds.json 每個科都有歸屬（唔准默默跌落 fallback）。 */
export function knownFamilies(): string[] {
  return [...SPOT_BY_FAMILY.keys()];
}
