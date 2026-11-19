/**
 * 香港常見／街上容易見到嘅鳥（手動核對過 ID，對應 src/data/birds.json）。
 * 用途：五問答案相同嘅候選可能有 96 隻，用呢張表決定「先顯示邊啲」。
 * 只影響排序，唔改任何資料／storage key／分享格式。
 */
export const COMMON_BIRD_IDS = [
  1,   // 珠頸斑鳩
  11,  // 樹麻雀
  6,   // 紅耳鵯
  7,   // 白頭鵯
  436, // 暗綠繡眼鳥
  387, // 家燕
  13,  // 八哥
  344, // 喜鵲
  462, // 烏鶇
  242, // 大白鷺
  245, // 小白鷺
  249, // 夜鷺
  289, // 普通翠鳥
  15,  // 紅嘴藍鵲
  18,  // 畫眉
  342, // 灰喜鵲
  455, // 家八哥
  532, // 白鶺鴒
  66,  // 山斑鳩
  67,  // 灰斑鳩
  247, // 牛背鷺
  248, // 池鷺
  16,  // 遠東山雀
  353, // 黃腹山雀
  357, // 雲雀
] as const;

const RANK = new Map<number, number>(COMMON_BIRD_IDS.map((id, i) => [id, i]));

/** 越小越常見；唔喺表內嘅鳥排喺常見鳥之後，再按 NO. 排。 */
export function commonBirdRank(id: number): number {
  return RANK.get(id) ?? COMMON_BIRD_IDS.length;
}
