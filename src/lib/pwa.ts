/**
 * PWA 安裝入口 ＋ 版本更新流程 — 真理倉 docs/46（I1–I8／UP1–UP5）。
 * 一句原則：「安裝要有掣、更新要問過人」。
 */
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaSnapshot {
  /** 有新版本停喺 waiting（UP2 banner） */
  needRefresh: boolean;
  /** 首次安裝完成，可離線使用 */
  offlineReady: boolean;
  /** Android/Chrome 已攔到 beforeinstallprompt（I2） */
  canPromptInstall: boolean;
  /** iOS 教學卡路徑（I3）：冇 beforeinstallprompt，要出三步教學 */
  showIosHelp: boolean;
  standalone: boolean;
}

const DISMISS_KEY = 'pwa-dismissed-worker';

const listeners = new Set<() => void>();
let installEvent: BeforeInstallPromptEvent | null = null;
let needRefresh = false;
let offlineReady = false;
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let updateReloading = false;

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function isIos(): boolean {
  const ua = navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ 會扮 Macintosh — 要用 platform + touch 判斷（I4）
    ((navigator as Navigator & { platform?: string }).platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1)
  );
}

function computeSnapshot(): PwaSnapshot {
  const standalone = isStandalone();
  return {
    needRefresh,
    offlineReady,
    canPromptInstall: !!installEvent && !standalone,
    showIosHelp: !installEvent && isIos() && !standalone,
    standalone,
  };
}

let snapshot = computeSnapshot();

export function getPwaSnapshot(): PwaSnapshot {
  return snapshot;
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  snapshot = computeSnapshot();
  listeners.forEach(listener => listener());
}

function dismissedWorkerUrl(): string | null {
  try {
    return sessionStorage.getItem(DISMISS_KEY);
  } catch {
    return null;
  }
}

/** 顯示更新 banner（UP2）：同一個 worker「稍後」後唔再嘈；首次安裝（冇 controller）唔彈。 */
function maybeNeedRefresh() {
  if (!navigator.serviceWorker.controller) return; // 首次安裝，唔係更新
  void navigator.serviceWorker.getRegistration().then(reg => {
    const waiting = reg?.waiting;
    if (!waiting) return;
    if (dismissedWorkerUrl() === waiting.scriptURL) return; // 同一 worker 記住咗
    needRefresh = true;
    emit();
  });
}

export function initPwa() {
  if (!('serviceWorker' in navigator)) return;

  updateSW = registerSW({
    onNeedRefresh() {
      maybeNeedRefresh();
    },
    onOfflineReady() {
      offlineReady = true;
      emit();
      window.setTimeout(() => {
        offlineReady = false;
        emit();
      }, 4000);
    },
  });

  // I2：攔住瀏覽器自彈，存起 event，用戶按掣先 prompt()。
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    emit();
  });

  // UP4：回前景／恢復連線／每 30 分鐘先 check，唔准背景無限輪詢。
  const checkForUpdate = () => {
    void navigator.serviceWorker
      .getRegistration()
      .then(reg => reg?.update())
      .catch(() => {});
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
  window.addEventListener('online', checkForUpdate);
  window.setInterval(checkForUpdate, 30 * 60 * 1000);

  // 頁面已 reload 完但 waiting 仲喺度（例如上次「稍後」後重新載入）— 補檢一次。
  window.setTimeout(maybeNeedRefresh, 1500);
}

/** I2：用戶按「加入主畫面」掣 — 先系統對話框；iOS 冇 event 就由 UI 出教學卡。 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'ios' | 'none'> {
  if (!installEvent) return isIos() && !isStandalone() ? 'ios' : 'none';
  try {
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') installEvent = null;
    emit();
    return choice.outcome;
  } catch {
    return 'none';
  }
}

/** UP3：立即更新 — SKIP_WAITING → controllerchange → reload，另加 2.5 秒 timeout fallback。 */
export function applyUpdate() {
  if (updateReloading) return;
  updateReloading = true;
  try {
    void updateSW?.(true);
  } catch {
    // 舊瀏覽器：直接靠 timeout reload
  }
  window.setTimeout(() => {
    window.location.reload();
  }, 2500);
}

/** UP2：稍後 — 記住呢個 worker，同一個版本唔再彈。 */
export function dismissUpdate() {
  needRefresh = false;
  void navigator.serviceWorker.getRegistration().then(reg => {
    try {
      if (reg?.waiting) sessionStorage.setItem(DISMISS_KEY, reg.waiting.scriptURL);
    } catch {
      // sessionStorage 唔可用都照收起 banner
    }
  });
  emit();
}
