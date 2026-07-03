import { BirdIV, CaptureStats, Nature, PersonalityTrait } from '../types';

export const NATURES: Nature[] = [
  '勇敢','膽小','活潑','冷靜','溫和','急躁',
  '害羞','頑皮','穩重','機靈'
];

export const TRAITS: PersonalityTrait[] = [
  '愛鳴唱','愛覓食','愛飛翔','愛群聚','獨行俠',
  '晨型鳥','夜貓子','好奇寶寶','警戒心高','親人'
];

const SIZE_VARIANTS: CaptureStats['sizeVariant'][] = ['XS','S','M','L','XL'];
const SIZE_WEIGHTS = [0.05, 0.2, 0.5, 0.2, 0.05];

function pickWeighted<T>(arr: T[], weights: number[]): T {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc += weights[i];
    if (r < acc) return arr[i];
  }
  return arr[arr.length-1];
}

export function rollIV(): BirdIV {
  const hp = Math.floor(Math.random() * 32);
  const atk = Math.floor(Math.random() * 32);
  const def = Math.floor(Math.random() * 32);
  const spd = Math.floor(Math.random() * 32);
  const sta = Math.floor(Math.random() * 32);
  const total = hp + atk + def + spd + sta;
  const percent = Math.round(total / 155 * 100);
  return { hp, atk, def, spd, sta, total, percent };
}

export function cpFromIV(iv: BirdIV, rarityBonus = 0): number {
  // 簡單 CP 公式
  const base = 80 + iv.total * 3.2;
  return Math.max(10, Math.round(base + rarityBonus + Math.random()*20));
}

export function generateCaptureStats(opts?: {
  catchScore?: CaptureStats['catchScore'],
  zoomLevel?: number,
}): CaptureStats {
  let iv = rollIV();
  
  // 投擲得分加成
  if (opts?.catchScore === 'Great') {
    iv.atk = Math.min(31, iv.atk + 3);
    iv.spd = Math.min(31, iv.spd + 3);
  } else if (opts?.catchScore === 'Excellent') {
    // Excellent 至少 3 項滿值
    iv.hp = Math.max(iv.hp, 28 + Math.floor(Math.random()*4));
    iv.atk = Math.max(iv.atk, 28 + Math.floor(Math.random()*4));
    iv.spd = Math.max(iv.spd, 28 + Math.floor(Math.random()*4));
  }
  iv.total = iv.hp + iv.atk + iv.def + iv.spd + iv.sta;
  iv.percent = Math.round(iv.total / 155 * 100);

  const nature = NATURES[Math.floor(Math.random() * NATURES.length)];
  const trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
  const sizeVariant = pickWeighted(SIZE_VARIANTS, SIZE_WEIGHTS);
  
  // 色違機率 1/512 ≈ 0.195%
  const isShiny = Math.random() < 1/512;

  // Zoom 越高（距離越遠）抓到越有成就感，略升 CP
  const zoomBonus = opts?.zoomLevel ? Math.min(60, opts.zoomLevel * 12) : 0;
  const scoreBonus = opts?.catchScore === 'Excellent' ? 80 : opts?.catchScore === 'Great' ? 35 : opts?.catchScore === 'Nice' ? 10 : 0;
  
  const cp = cpFromIV(iv, zoomBonus + scoreBonus + (isShiny ? 150 : 0));

  return {
    iv,
    nature,
    trait,
    cp,
    sizeVariant,
    isShiny,
    catchScore: opts?.catchScore ?? null,
    catchDistance: opts?.zoomLevel ?? 1,
  };
}

export function ivRankLabel(percent: number): { label: string; color: string } {
  if (percent >= 95) return { label: '傳說', color: '#FFD700' };
  if (percent >= 85) return { label: '極品', color: '#ff5ca8' };
  if (percent >= 70) return { label: '優秀', color: '#9b5cff' };
  if (percent >= 50) return { label: '良好', color: '#00F0FF' };
  return { label: '普通', color: '#9CA3AF' };
}

export function natureEffect(nature: Nature): string {
  const map: Record<Nature, string> = {
    '勇敢': 'ATK↑ SPD↓',
    '膽小': 'SPD↑ ATK↓',
    '活潑': 'SPD↑ DEF↓',
    '冷靜': 'DEF↑ SPD↓',
    '溫和': 'HP↑ ATK↓',
    '急躁': 'ATK↑ DEF↓',
    '害羞': 'STA↑ ATK↓',
    '頑皮': 'ATK↑ HP↓',
    '穩重': 'DEF↑ STA↓',
    '機靈': 'SPD↑ HP↓',
  };
  return map[nature];
}
