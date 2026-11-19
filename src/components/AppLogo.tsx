import { useState } from 'react';
import { Telescope } from 'lucide-react';

/** App 左上角標誌：AI 生成嘅雙筒望遠鏡＋小鳥貼紙（同 favicon／PWA icon 同一張圖）。 */
export function AppLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={`flex items-center justify-center rounded-xl bg-dex-neon/15 text-dex-neon ${className}`}
        style={{ width: size, height: size }} aria-label="BIRD-DEX">
        <Telescope size={Math.round(size * 0.6)} />
      </span>
    );
  }
  return (
    <img
      src="/app-logo.avif"
      alt="BIRD-DEX 標誌"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
