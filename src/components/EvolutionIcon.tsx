import type { CSSProperties } from 'react';

/**
 * BIRD-DEX 3 專屬進化圖示 — 由蛋一路長大成白腹海鵰（圖鑑 NO.274）。
 * 全手繪 SVG path，唔用 emoji／外部 icon pack／ai 圖；同 favicon 同一設計語言。
 * 徽章入面同個人頁都共用呢一個 glyph，唔會出現「市場上隨便可見」嘅圖案。
 */
export interface EvolutionIconProps {
  level: number;
  size?: number;
  color?: string;
  contrast?: string;
  className?: string;
  style?: CSSProperties;
}

export function EvolutionGlyph({
  level,
  color = '#1B7F5A',
  contrast = '#FFFFFF',
}: {
  level: number;
  color?: string;
  contrast?: string;
}) {
  const lv = Math.min(12, Math.max(1, Math.trunc(level) || 1));
  const eye = <circle cx={33} cy={31} r={1.1} fill={contrast} />;
  const beak = <path d="M37 30.5 L45 32.6 L37 34.5 Z" fill={color} />;
  const hook = <path d="M37 30 L45 32 L43 37 L37 34 Z" fill={color} />;

  if (lv === 1) {
    return (
      <g fill={color}>
        <ellipse cx={32} cy={34} rx={12} ry={15} />
        <ellipse cx={28} cy={28} rx={3} ry={5} fill={contrast} opacity={0.5} />
        <circle cx={36} cy={39} r={1.3} fill={contrast} opacity={0.45} />
        <circle cx={35} cy={33} r={0.9} fill={contrast} opacity={0.45} />
      </g>
    );
  }
  if (lv === 2) {
    return (
      <g fill={color}>
        <ellipse cx={32} cy={35} rx={12} ry={14} />
        <path d="M25 29 L31 33 L26 37 L34 40 L30 45" fill="none" stroke={contrast} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={32} cy={25} r={4} />
        <path d="M35 24 L40 26 L35 28 Z" />
        <circle cx={33.4} cy={24} r={0.9} fill={contrast} />
      </g>
    );
  }
  if (lv === 3) {
    return (
      <g fill={color}>
        <ellipse cx={22} cy={38} rx={4} ry={3} opacity={0.85} />
        <ellipse cx={40} cy={38} rx={4} ry={3} opacity={0.85} />
        <circle cx={31} cy={33} r={9} />
        {beak}
        <circle cx={32.5} cy={31} r={1.3} fill={contrast} />
        <path d="M27 36 Q31 40 35 36" fill="none" stroke={contrast} strokeWidth={1.2} opacity={0.7} />
      </g>
    );
  }
  if (lv === 4 || lv === 5) {
    const flying = lv === 5;
    return (
      <g fill={color}>
        <ellipse cx={31} cy={34} rx={8} ry={11} />
        <circle cx={30} cy={24} r={6} />
        {beak}
        <path d={flying ? 'M24 34 Q17 26 14 35 Q21 32 25 39 Z' : 'M25 32 Q18 33 20 41 Q25 38 28 40 Z'} opacity={0.85} />
        <path d="M34 43 L40 50 L30 47 Z" />
        {!flying && <path d="M28 45 v4 M34 45 v4" stroke={color} strokeWidth={1.6} strokeLinecap="round" />}
        <circle cx={32} cy={23} r={1.1} fill={contrast} />
      </g>
    );
  }
  if (lv === 6) {
    return (
      <g fill={color}>
        <path d="M14 36 Q22 22 32 33 Q42 22 50 36 Q41 32 32 40 Q23 32 14 36 Z" />
        <circle cx={32} cy={31} r={4.5} />
        <path d="M35 30 L42 32 L35 34 Z" />
        {eye}
        <path d="M18 34 Q24 27 29 33" fill="none" stroke={contrast} strokeWidth={1.2} opacity={0.65} />
      </g>
    );
  }
  if (lv === 7) {
    return (
      <g fill={color}>
        <ellipse cx={30} cy={35} rx={8} ry={10} />
        <circle cx={29} cy={25} r={5.5} />
        <path d="M33 24 L40 26 L33 28 Z" />
        <path d="M36 42 L45 49 L33 46 Z" />
        <circle cx={30.5} cy={24} r={1.1} fill={contrast} />
        <text x={44} y={24} fontSize={11} fontWeight={900} fill={color}>♪</text>
      </g>
    );
  }
  // 8–12：猛禽，翼展逐級加大；10+ 白腹，12 加冠羽同星芒。
  const span = [15, 17, 19, 21, 23][lv - 8];
  const tail = [4, 5, 6, 7, 8][lv - 8];
  const belly = lv >= 10;
  return (
    <g fill={color}>
      <path
        d={`M${32 - span} 35 Q${32 - span * 0.45} ${lv >= 10 ? 18 : 22} 32 31 Q${32 + span * 0.45} ${lv >= 10 ? 18 : 22} ${32 + span} 35 Q${32 + span * 0.4} 31 32 40 Q${32 - span * 0.4} 31 ${32 - span} 35 Z`}
      />
      <path d={`M29 39 L32 ${39 + tail} L35 39 Z`} />
      <circle cx={32} cy={31} r={4.6} />
      {hook}
      {belly && <ellipse cx={32} cy={38} rx={3} ry={4.2} fill="#FFFFFF" opacity={0.92} />}
      {lv === 12 && (
        <>
          <path d="M29 27 L32 24 L35 27" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M50 16 v5 M47.5 18.5 h5" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
        </>
      )}
      <circle cx={33.2} cy={30.4} r={1.1} fill={contrast} />
    </g>
  );
}

export function EvolutionIcon({
  level,
  size = 24,
  color = '#1B7F5A',
  contrast = '#FFFFFF',
  className = '',
  style,
}: EvolutionIconProps) {
  const light = ['#FCD34D', '#F59E0B', '#CBD5E1', '#F6E5BF'].includes(color.toLowerCase());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={`BIRD-DEX 進化圖示 Lv.${level}`}
    >
      <EvolutionGlyph
        level={level}
        color={color}
        contrast={contrast === '#FFFFFF' && light ? '#14161C' : contrast}
      />
    </svg>
  );
}
