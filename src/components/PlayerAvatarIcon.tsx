/**
 * BIRD-DEX 3 專屬頭像圖示（取代 emoji）：靴／背包／望遠鏡／相機／帳篷／海鵰／王冠。
 * 全部手繪 SVG，同進化徽章同一設計語言。
 */
export type AvatarKind = 'boots' | 'backpack' | 'telescope' | 'camera' | 'tent' | 'eagle' | 'crown';

export function PlayerAvatarIcon({
  kind,
  size = 40,
  color = '#1B7F5A',
  className = '',
}: {
  kind: AvatarKind;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`BIRD-DEX 頭圖示 ${kind}`}
      fill={color}
    >
      {kind === 'boots' && (
        <g>
          <path d="M14 12 h14 v24 c0 6 4 8 12 10 4 1 6 4 6 8 v4 H14 c-3 0-5-2-5-5 V17 c0-3 2-5 5-5 Z" />
          <path d="M34 16 h11 v20 h-11 z" opacity="0.55" />
          <path d="M12 50 h33 v6 H12 z" opacity="0.8" />
          <path d="M20 18 h4 M20 26 h4" stroke="#FFFFFF" strokeWidth="1.6" opacity="0.6" />
        </g>
      )}
      {kind === 'backpack' && (
        <g>
          <rect x="15" y="18" width="34" height="36" rx="9" />
          <path d="M23 18 v-4 a9 9 0 0 1 18 0 v4" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <rect x="22" y="32" width="20" height="13" rx="4" fill="#FFFFFF" opacity="0.85" />
          <path d="M27 38 h10" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <rect x="18" y="48" width="28" height="5" rx="2.5" opacity="0.65" />
        </g>
      )}
      {kind === 'telescope' && (
        <g>
          <path d="M10 22 L42 14 L45 27 L13 35 Z" />
          <path d="M45 18 L56 15 L58 25 L47 28 Z" opacity="0.7" />
          <path d="M27 33 L33 54 h5 L31 32 Z" />
          <path d="M18 54 h27 v4 H18 z" />
          <circle cx={13} cy={28.5} r={2} fill="#FFFFFF" opacity="0.7" />
        </g>
      )}
      {kind === 'camera' && (
        <g>
          <rect x="9" y="20" width="46" height="31" rx="7" />
          <path d="M22 20 l4-6 h12 l4 6 z" opacity="0.7" />
          <circle cx={32} cy={35} r={10} fill="#FFFFFF" opacity="0.9" />
          <circle cx={32} cy={35} r={5.5} fill={color} />
          <circle cx={47} cy={27} r={2.4} fill="#FFFFFF" opacity="0.9" />
        </g>
      )}
      {kind === 'tent' && (
        <g>
          <path d="M32 12 L58 54 H6 Z" />
          <path d="M32 12 L44 54 H20 Z" fill="#FFFFFF" opacity="0.85" />
          <path d="M32 32 L38 54 H26 Z" fill={color} />
          <path d="M4 54 h56 v4 H4 z" opacity="0.6" />
        </g>
      )}
      {kind === 'eagle' && (
        <g>
          <path d="M6 30 Q18 17 31 29 Q44 17 58 30 Q45 27 32 38 Q19 27 6 30 Z" />
          <path d="M30 27 L34 54 L38 27 Z" opacity="0.7" />
          <circle cx={32} cy={27} r={5} />
          <path d="M36 26 L45 29 L36 32 Z" fill="#FFFFFF" opacity="0.9" />
          <circle cx={33.3} cy={26} r={1.1} fill="#14161C" />
        </g>
      )}
      {kind === 'crown' && (
        <g>
          <path d="M9 20 L19 30 L32 14 L45 30 L55 20 L50 48 H14 Z" />
          <path d="M14 52 h36 v5 H14 z" opacity="0.7" />
          <circle cx={32} cy={35} r={3.2} fill="#FFFFFF" opacity="0.9" />
          <circle cx={21} cy={37} r={2} fill="#FFFFFF" opacity="0.7" />
          <circle cx={43} cy={37} r={2} fill="#FFFFFF" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
