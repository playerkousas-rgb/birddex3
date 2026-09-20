import { Component, type ReactNode, type ErrorInfo } from 'react';
import { downloadBackup, savedDataForBackup } from '../lib/storage';

/** Protect the common application shell without clearing any user data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[BIRD-DEX]', error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app-shell bg-dex-bg text-white flex flex-col items-center justify-center p-6 text-center gap-4" role="alert">
        <h1 className="text-xl font-bold">暫時無法顯示這個畫面</h1>
        <p className="text-sm text-dex-muted max-w-sm">我們沒有清除你的存檔。請先備份已儲存資料，再嘗試重新載入；尚未儲存的操作可能無法復原。</p>
        <button className="px-5 py-3 rounded-xl bg-dex-neon text-dex-bg font-bold" onClick={() => downloadBackup({ saved: savedDataForBackup() })}>備份已儲存資料</button>
        <button className="px-5 py-3 rounded-xl border border-dex-border" onClick={() => window.location.reload()}>重新載入</button>
      </div>
    );
  }
}
