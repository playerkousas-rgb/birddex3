/**
 * SG18 — 讚好／收藏一鍵回跳主站詳情卡。
 * 零 Supabase 直連、零寫死網址：連結只由真理倉閘門嘅
 * ScoutStoreGate.getAppStoreUrl(slug) 組成；未載入就保持 hidden（唔出死連）。
 */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    ScoutStoreGate?: {
      getAppStoreUrl?: (slug: string) => string;
    };
  }
}

interface StoreSupportButtonProps {
  /** `profile` 係觀鳥員頁頁尾版本；預設係全站右上角浮動掣。 */
  variant?: 'floating' | 'profile';
}

export function StoreSupportButton({ variant = 'floating' }: StoreSupportButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const gate = window.ScoutStoreGate;
    if (!anchor || typeof gate?.getAppStoreUrl !== 'function') return; // 保持 hidden
    anchor.href = gate.getAppStoreUrl('birddex3');
    anchor.hidden = false;
  }, []);

  if (variant === 'profile') {
    return (
      <a
        ref={anchorRef}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dex-neon/40 bg-dex-neon/10 px-3 py-2 text-xs font-black text-dex-neon transition hover:bg-dex-neon/15"
        target="_blank"
        rel="noopener"
        hidden
        aria-label="前往主站讚好或收藏 BIRD-DEX（開新分頁）"
      >
        <span aria-hidden="true">❤️</span>
        <span>讚好／收藏</span>
      </a>
    );
  }

  return (
    <a
      id="storeSupportTop"
      ref={anchorRef}
      className="support-btn"
      target="_blank"
      rel="noopener"
      hidden
      aria-label="前往主站讚好或收藏此程式（開新分頁）"
      title="前往主站讚好或收藏此程式（開新分頁）"
    >
      <span aria-hidden="true">❤️</span>
      <span className="support-btn-label">讚好／收藏</span>
    </a>
  );
}
