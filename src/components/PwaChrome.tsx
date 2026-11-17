import { useEffect, useSyncExternalStore, useRef } from 'react';
import { Download, Share, X, RefreshCw, CheckCircle2, Smartphone } from 'lucide-react';
import {
  applyUpdate, dismissUpdate, getPwaSnapshot, promptInstall, subscribePwa,
} from '../lib/pwa';

function usePwa() {
  return useSyncExternalStore(subscribePwa, getPwaSnapshot, getPwaSnapshot);
}

// —— iOS 教學卡開關（模塊級，避免多餘 context）——
let iosHelpOpen = false;
const iosListeners = new Set<() => void>();
function emitIos() {
  iosListeners.forEach(l => l());
}
function dismissIosHelp() {
  iosHelpOpen = false;
  emitIos();
}
function openIosHelp() {
  iosHelpOpen = true;
  emitIos();
}
function useIosHelp(): boolean {
  return useSyncExternalStore(
    l => {
      iosListeners.add(l);
      return () => {
        iosListeners.delete(l);
      };
    },
    () => iosHelpOpen,
    () => false,
  );
}

/**
 * 全局 PWA chrome：
 *  - 更新 banner（UP2/UP3：立即更新／稍後）
 *  - 首次安裝完成 toast（「已可離線使用」）
 *  - iOS 三步教學卡（I3：Safari 分享 ⬆ → 加入主畫面 → 加入）
 */
export function PwaChrome() {
  const pwa = usePwa();
  const iosHelpOpen = useIosHelp();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // I3：開卡 focus 入去；Esc 關得
  useEffect(() => {
    if (!iosHelpOpen) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissIosHelp();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [iosHelpOpen]);

  return (
    <>
      {/* UP2 更新 banner */}
      {pwa.needRefresh && (
        <div
          role="region"
          aria-label="版本更新"
          className="fixed top-0 inset-x-0 z-[70] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-dex-surface border-b border-dex-neon/40 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="text-dex-neon shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-dex-text leading-snug">已下載新版本</p>
              <p className="text-[11px] text-dex-muted leading-snug">
                按一下即自動重新載入，毋須刪除或重裝；本機收藏與相片會保留。
              </p>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="shrink-0 px-3 py-2 rounded-xl bg-dex-neon text-dex-ink text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              立即更新
            </button>
            <button
              type="button"
              onClick={dismissUpdate}
              aria-label="稍後再更新"
              className="shrink-0 w-9 h-9 rounded-xl bg-dex-bg text-dex-text flex items-center justify-center"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 首次安裝完成 toast */}
      {pwa.offlineReady && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg"
        >
          <CheckCircle2 size={14} aria-hidden="true" /> 已可離線使用
        </div>
      )}

      {/* I3 iOS 三步教學卡 */}
      {iosHelpOpen && (
        <div
          className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={dismissIosHelp}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="installHelpTitle"
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-dex-surface border border-dex-border rounded-3xl p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 id="installHelpTitle" className="text-base font-black text-dex-text flex items-center gap-2">
                <Smartphone size={16} className="text-dex-neon" aria-hidden="true" />
                加入主畫面
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={dismissIosHelp}
                className="w-9 h-9 rounded-xl bg-dex-bg text-dex-text flex items-center justify-center"
                aria-label="關閉教學"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-3 space-y-2.5">
              {[
                '用 Safari 開啟呢一頁',
                '按底部「分享」⬆',
                '揀「加入主畫面」，再按「加入」',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3 text-sm text-dex-text/90">
                  <span className="w-6 h-6 rounded-full bg-dex-neon text-dex-ink text-xs font-black flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11px] text-dex-muted leading-relaxed">
              之後從主畫面開啟就會全螢幕，冇網絡都開得返。
            </p>
            <button
              type="button"
              onClick={dismissIosHelp}
              className="mt-4 w-full py-3 rounded-xl bg-dex-neon text-dex-ink font-black text-sm"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** 「加入主畫面」入口（I1）：standalone 自動隱藏；Android 走系統對話框，iOS 出三步教學。 */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const pwa = usePwa();
  if (pwa.standalone) return null;
  const available = pwa.canPromptInstall || pwa.showIosHelp;
  if (!available) return null;

  const onClick = async () => {
    const result = await promptInstall();
    if (result === 'ios') openIosHelp();
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="加入主畫面"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-dex-neon/15 border border-dex-neon/40 text-dex-neon text-[11px] font-black"
      >
        <Download size={13} aria-hidden="true" /> 加主畫面
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dex-neon/15 border border-dex-neon/40 text-dex-neon font-black text-sm"
    >
      <Download size={16} aria-hidden="true" />
      加入主畫面 · 全螢幕離線都開得返
      <Share size={14} className="opacity-60" aria-hidden="true" />
    </button>
  );
}
