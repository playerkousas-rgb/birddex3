/**
 * SG18 — 常駐「讚好／收藏」一鍵回跳主站詳情卡。
 * 零 Supabase 直連、零寫死網址：連結只由真理倉閘門嘅
 * ScoutStoreGate.getAppStoreUrl(slug) 組成；未載入就保持 hidden（唔出死連）。
 * 白名單攔截時 #root 會被閘門一併隱藏，所以呢粒掣唔會喺提示卡上出現。
 */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    ScoutStoreGate?: {
      getAppStoreUrl?: (slug: string) => string;
    };
  }
}

export function StoreSupportButton() {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const gate = window.ScoutStoreGate;
    if (!anchor || typeof gate?.getAppStoreUrl !== 'function') return; // 保持 hidden
    anchor.href = gate.getAppStoreUrl('birddex3');
    anchor.hidden = false;
  }, []);

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
