import { getTrainerTier } from '../lib/trainerTier';

interface TrainerTierBadgeProps {
  level: number;
  size?: number;
  /** 未解鎖：灰階＋上鎖（由父層或呢度控制） */
  locked?: boolean;
  className?: string;
}

/** 8 角星頂點（8 點星 = 16 頂點交替半徑） */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * 訓練師等級徽章：按級別生成唔同嘅圖 —
 * 形狀分 4 帶（圓／盾／六角／星），顏色 12 級 12 色，中心係鳥頭側影（同 favicon 同一家族）。
 */
export function TrainerTierBadge({ level, size = 48, locked = false, className = '' }: TrainerTierBadgeProps) {
  const tier = getTrainerTier(level);
  const shapeProps = { fill: tier.color } as Record<string, string>;

  const shape = (() => {
    switch (tier.shape) {
      case 'shield':
        return <path d="M32 4 L57 13 V33 C57 47 45 56 32 60 C19 56 7 47 7 33 V13 Z" {...shapeProps} />;
      case 'hex':
        return <path d="M32 3 L56 17 V45 L32 59 L8 45 V17 Z" {...shapeProps} />;
      case 'star':
        return <polygon points={starPoints(32, 32, 30, 21)} {...shapeProps} />;
      default:
        return <circle cx={32} cy={32} r={27} {...shapeProps} />;
    }
  })();

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`${locked ? 'grayscale opacity-45' : ''} ${className}`}
      role="img"
      aria-label={`訓練師 Lv.${level} ${tier.band}徽章`}
    >
      {/* 內環光邊 */}
      <g opacity="0.35" fill="none" stroke="#FFFFFF" strokeWidth="1.5">
        {tier.shape === 'circle' && <circle cx={32} cy={32} r={22} />}
        {tier.shape === 'shield' && <path d="M32 9 L52 16 V33 C52 44 42 51 32 54 C22 51 12 44 12 33 V16 Z" />}
        {tier.shape === 'hex' && <path d="M32 8 L51 19 V41 L32 52 L13 41 V19 Z" />}
        {tier.shape === 'star' && <polygon points={starPoints(32, 32, 24, 17)} />}
      </g>
      {shape}
      {/* 中心鳥頭側影（同 favicon 家族）：頭＋右向喙＋眼 */}
      <g>
        <circle cx={30} cy={33} r={6.2} fill={tier.fg} />
        <path d="M34.6 31.4 L41 33 L34.6 34.6 Z" fill={tier.fg} />
        <circle cx={31.6} cy={31.6} r={1.3} fill={tier.fg === '#FFFFFF' ? '#14161C' : '#FFFFFF'} />
      </g>
      {locked && (
        <g aria-hidden="true">
          <circle cx={48} cy={48} r={11} fill="#14161C" opacity="0.85" />
          <path d="M44.5 47.5 v-2.5 a3.5 3.5 0 0 1 7 0 v2.5" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          <rect x="43.2" y="47.5" width="9.6" height="7" rx="1.6" fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}
