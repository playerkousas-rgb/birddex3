import { useId, useState } from 'react';
import { getTrainerTier } from '../lib/trainerTier';
import { EvolutionGlyph } from './EvolutionIcon';

interface TrainerTierBadgeProps {
  level: number;
  size?: number;
  locked?: boolean;
  className?: string;
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** 讀不到 AI 圖時嘅手繪 fallback。 */
function FallbackBadge({ level, tier, locked, className }: {
  level: number;
  tier: ReturnType<typeof getTrainerTier>;
  locked: boolean;
  className: string;
}) {
  const rawId = useId();
  const gradId = `bd-badge-${rawId.replace(/:/g, '')}`;
  const contrast = tier.fg === '#FFFFFF' ? '#14161C' : '#FFFFFF';
  const shape = (() => {
    switch (tier.shape) {
      case 'shield': return <path d="M32 4 L57 13 V33 C57 47 45 56 32 60 C19 56 7 47 7 33 V13 Z" fill={`url(#${gradId})`} />;
      case 'hex': return <path d="M32 3 L56 17 V45 L32 59 L8 45 V17 Z" fill={`url(#${gradId})`} />;
      case 'star': return <polygon points={starPoints(32, 32, 30, 21)} fill={`url(#${gradId})`} />;
      default: return <circle cx={32} cy={32} r={27} fill={`url(#${gradId})`} />;
    }
  })();
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={64} height={64}
      className={`${locked ? 'grayscale opacity-45' : ''} ${className}`} role="img"
      aria-label={`觀鳥員 Lv.${level} ${tier.band} · ${tier.stage.name}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="45%" stopColor={tier.color} />
          <stop offset="100%" stopColor={tier.color} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      {shape}
      <EvolutionGlyph level={level} color={tier.fg} contrast={contrast} />
    </svg>
  );
}

/**
 * 右上角等級標誌：直接用返該級嘅觀鳥員進化圖（12 級各一張 AI 貼紙）。
 * 讀取失敗先退回手繪 SVG。
 */
export function TrainerTierBadge({ level, size = 48, locked = false, className = '' }: TrainerTierBadgeProps) {
  const tier = getTrainerTier(level);
  const lv = tier.level;
  const [failed, setFailed] = useState(false);

  if (failed) return <FallbackBadge level={lv} tier={tier} locked={locked} className={className} />;

  return (
    <img
      src={`/evolution/level-${String(lv).padStart(2, '0')}.avif`}
      alt={`觀鳥員 Lv.${lv} ${tier.band} · ${tier.stage.name}`}
      width={size}
      height={size}
      className={`object-contain ${locked ? 'grayscale opacity-45' : ''} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
