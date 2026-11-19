import { useState } from 'react';
import { EvolutionGlyph, EvolutionIcon } from './EvolutionIcon';

/** AI 貼紙圖（AVIF）；讀取失敗／瀏覽器唔支援 AVIF 時退回手繪 SVG，唔會出中空圖。 */
function artSrc(level: number): string {
  return `/evolution/level-${String(Math.min(12, Math.max(1, level))).padStart(2, '0')}.avif`;
}

/** 一般 HTML 用（個人頁進化牆／目前形態） */
export function EvolutionArt({
  level,
  size = 24,
  color = '#1B7F5A',
  className = '',
}: {
  level: number;
  size?: number;
  color?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <EvolutionIcon level={level} color={color} contrast="#FFFFFF" className={className} />;
  return (
    <img
      src={artSrc(level)}
      alt={`BIRD-DEX Lv.${level} 進化圖`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** SVG 勳章入面用：12 級全部 AI 貼紙；load 失敗改用手繪 glyph。 */
export function EvolutionBadgeArt({
  level,
  color = '#1B7F5A',
  contrast = '#FFFFFF',
}: {
  level: number;
  color?: string;
  contrast?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <EvolutionGlyph level={level} color={color} contrast={contrast} />;
  return (
    <image
      href={artSrc(level)}
      x="9"
      y="9"
      width="46"
      height="46"
      preserveAspectRatio="xMidYMid meet"
      onError={() => setFailed(true)}
    />
  );
}

export { EvolutionIcon };
