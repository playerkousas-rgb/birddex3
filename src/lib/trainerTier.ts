/**
 * 觀鳥員勳章 — 按級別生成唔同嘅圖（1–12 級各有獨特徽章）。
 * 純資料＋形狀決策；繪圖喺 components/TrainerTierBadge.tsx。
 * 分 band：Lv1–3 銅章圓形 · Lv4–6 銀章盾形 · Lv7–9 金章六角 · Lv10–12 傳說星章。
 * 中心圖案由「蛋 → 裂殼 → 雛鳥 → 幼鳥 → 鳴禽 → 猛禽 → 白腹海鵰」進化，
 * 令小朋友一路升級一路見到自己「長大」。
 */

export type TierShape = 'circle' | 'shield' | 'hex' | 'star';

/** 12 級進化譜系：蛋 → 雛 → 飛 → 獵 → 白腹海鵰（圖鑑 NO.274） */
export interface EvolutionStage {
  level: number;
  name: string;
  /** 進化到圖鑑入面某一隻鳥時，對應嘅 NO.（可選） */
  speciesId?: number;
}

export const EVOLUTION_STAGES: EvolutionStage[] = [
  { level: 1,  name: '一枚蛋' },
  { level: 2,  name: '開始破殼' },
  { level: 3,  name: '毛茸茸雛鳥' },
  { level: 4,  name: '離巢小鳥' },
  { level: 5,  name: '學飛幼鳥' },
  { level: 6,  name: '初試翼羽' },
  { level: 7,  name: '鳴禽' },
  { level: 8,  name: '獵隼學徒', speciesId: 311 },   // 遊隼
  { level: 9,  name: '蒼鷹', speciesId: 272 },   // 蒼鷹
  { level: 10, name: '蛇鵰', speciesId: 260 },
  { level: 11, name: '草原鵰', speciesId: 578 },
  { level: 12, name: '白腹海鵰·翼展之王', speciesId: 274 },
];

export interface TrainerTier {
  level: number;
  shape: TierShape;
  color: string; // 徽章主色（12 級 12 色，全部唔同）
  fg: string;    // 中心進化圖案顏色
  band: string;  // 章帶名
  stage: EvolutionStage; // 呢一級嘅形態
}

export const MAX_TRAINER_LEVEL = 12;

/** 12 級 12 色：銅 → 銀 → 金 → 傳說，每級可分辨 */
const LEVEL_COLORS: Record<number, string> = {
  1: '#C98A4B', 2: '#B45309', 3: '#92400E',
  4: '#CBD5E1', 5: '#94A3B8', 6: '#64748B',
  7: '#FCD34D', 8: '#F59E0B', 9: '#D97706',
  10: '#A78BFA', 11: '#F472B6', 12: '#EF4444',
};

const BANDS: { min: number; max: number; shape: TierShape; band: string }[] = [
  { min: 1, max: 3, shape: 'circle', band: '銅章' },
  { min: 4, max: 6, shape: 'shield', band: '銀章' },
  { min: 7, max: 9, shape: 'hex', band: '金章' },
  { min: 10, max: 12, shape: 'star', band: '傳說章' },
];

export function getTrainerTier(level: number): TrainerTier {
  const lv = Number.isFinite(level) ? Math.min(MAX_TRAINER_LEVEL, Math.max(1, Math.trunc(level))) : 1;
  const band = BANDS.find(b => lv >= b.min && lv <= b.max) ?? BANDS[0];
  const color = LEVEL_COLORS[lv];
  // 淺色主色（銀章 Lv4）上嘅鳥頭要深色先睇得清
  const fg = lv === 4 ? '#1B1F2A' : '#FFFFFF';
  return {
    level: lv,
    shape: band.shape,
    color,
    fg,
    band: band.band,
    stage: EVOLUTION_STAGES[lv - 1],
  };
}
