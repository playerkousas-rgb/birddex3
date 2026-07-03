import { Rarity } from '../types';

export const COLORS = {
  bg: '#0B0F19',
  surface: '#111827',
  border: '#1F2937',
  neon: '#00F0FF',
  accent: '#FF3366',
  gold: '#FFD700',
  success: '#10B981',
  warning: '#F59E0B',
  text: '#F3F4F6',
  muted: '#9CA3AF',
} as const;

export const RARITY_META: Record<Rarity, {
  label: string;
  labelZh: string;
  color: string;
  gradient: string;
  glow: string;
  border: string;
  textColor: string;
  maxCount: number;
}> = {
  UC: {
    label: 'UC',
    labelZh: '平',
    color: '#9CA3AF',
    gradient: 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)',
    glow: '0 0 10px rgba(156,163,175,0.3)',
    border: '2px solid #9CA3AF',
    textColor: '#1F2937',
    maxCount: 1,
  },
  C: {
    label: 'C',
    labelZh: '常',
    color: '#E5E7EB',
    gradient: 'linear-gradient(135deg, #E5E7EB 0%, #BDC3C7 100%)',
    glow: '0 0 12px rgba(229,231,235,0.4)',
    border: '2px solid #E5E7EB',
    textColor: '#1F2937',
    maxCount: 3,
  },
  R: {
    label: 'R',
    labelZh: '珍',
    color: '#60A5FA',
    gradient: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
    glow: '0 0 15px rgba(96,165,250,0.5)',
    border: '2px solid #60A5FA',
    textColor: '#FFFFFF',
    maxCount: 5,
  },
  SR: {
    label: 'SR',
    labelZh: '稀',
    color: '#A78BFA',
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
    glow: '0 0 18px rgba(167,139,250,0.5)',
    border: '2px solid #A78BFA',
    textColor: '#FFFFFF',
    maxCount: 8,
  },
  SSR: {
    label: 'SSR',
    labelZh: '超稀',
    color: '#FBBF24',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    glow: '0 0 22px rgba(251,191,36,0.6)',
    border: '2px solid #FBBF24',
    textColor: '#1F2937',
    maxCount: 12,
  },
  UR: {
    label: 'UR',
    labelZh: '極稀',
    color: '#F472B6',
    gradient: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #DB2777 100%)',
    glow: '0 0 28px rgba(244,114,182,0.7)',
    border: '2px solid #F472B6',
    textColor: '#FFFFFF',
    maxCount: 20,
  },
  LR: {
    label: 'LR',
    labelZh: '傳說',
    color: '#1F2937',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 30%, #1F2937 60%, #111827 100%)',
    glow: '0 0 35px rgba(255,215,0,0.8)',
    border: '2px solid #FFD700',
    textColor: '#FFD700',
    maxCount: Infinity,
  },
};

export const RARITY_ORDER: Rarity[] = ['UC', 'C', 'R', 'SR', 'SSR', 'UR', 'LR'];

export function getRarityFromCount(count: number): Rarity {
  if (count >= 20) return 'LR';
  if (count >= 12) return 'UR';
  if (count >= 8) return 'SSR';
  if (count >= 5) return 'SR';
  if (count >= 3) return 'R';
  if (count >= 1) return 'C';
  return 'UC';
}

export function getNextRarityThreshold(current: Rarity): number | null {
  const idx = RARITY_ORDER.indexOf(current);
  if (idx >= RARITY_ORDER.length - 1) return null;
  const next = RARITY_ORDER[idx + 1];
  return RARITY_META[next].maxCount;
}

export const LEVEL_TITLES = [
  { level: 1, title: '見習觀鳥員', xp: 0 },
  { level: 2, title: '初級賞鳥師', xp: 100 },
  { level: 3, title: '野外探險家', xp: 300 },
  { level: 4, title: '鳥類觀察家', xp: 600 },
  { level: 5, title: '飛羽獵人', xp: 1000 },
  { level: 6, title: '生態巡守員', xp: 1500 },
  { level: 7, title: '鳥語翻譯師', xp: 2200 },
  { level: 8, title: '羽翼收藏家', xp: 3000 },
  { level: 9, title: '天空領航員', xp: 4000 },
  { level: 10, title: '傳說鳥王', xp: 5500 },
  { level: 11, title: '鳥精靈大師', xp: 7500 },
  { level: 12, title: '飛羽傳奇', xp: 10000 },
];

export function getLevelFromXp(xp: number): { level: number; title: string; nextXp: number | null } {
  for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TITLES[i].xp) {
      const next = LEVEL_TITLES[i + 1];
      return {
        level: LEVEL_TITLES[i].level,
        title: LEVEL_TITLES[i].title,
        nextXp: next ? next.xp : null,
      };
    }
  }
  return { level: 1, title: LEVEL_TITLES[0].title, nextXp: LEVEL_TITLES[1]?.xp ?? null };
}

export function xpForCapture(rarity: Rarity): number {
  switch (rarity) {
    case 'UC': return 5;
    case 'C': return 10;
    case 'R': return 20;
    case 'SR': return 35;
    case 'SSR': return 55;
    case 'UR': return 80;
    case 'LR': return 120;
  }
}

export function getCaptureMessage(rarity: Rarity, isNew: boolean): string {
  if (isNew) return '首次發現！新鳥精靈入隊！';
  switch (rarity) {
    case 'UC': return '又見到了，觀察力 +1';
    case 'C': return '老朋友再次相遇！';
    case 'R': return '熟練的飛行夥伴！';
    case 'SR': return '稀有的羽毛光澤！';
    case 'SSR': return '黃金羽翼閃耀！';
    case 'UR': return '傳說之鳥回應了你！';
    case 'LR': return '至尊鳥王降臨！';
  }
}
