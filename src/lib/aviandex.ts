// ============================================================
// AvianDex 兄弟 App 互聯（唯一出口）
// ------------------------------------------------------------
// 合約（AvianDex src/App.tsx 已實作）：
//   GET https://avian-dex.vercel.app/?unlock=0008[&search=中文名]
//   → AvianDex 記入 localStorage 'aviandex.capture-unlocks.v1'
//     { no, unlocked_at, source: 'birddex3' }，並直接打開該鳥。
// 另外用 postMessage 順手遞完整捕捉記錄（含原相／賽璐璐 dataURL），
// AvianDex 一邊遲早收得到；未實作 listening 都唔會出事（送錯冇人聽）。
// NO. 編號 = 雙方唯一駁位，詳見 docs/AVIANDEX_INTEROP.md。
// ============================================================
import type { CaptureRecord } from '../types';

export const AVIANDEX_BASE_URL = 'https://avian-dex.vercel.app';

/** speciesId → NO. NNNN（'8' → '0008'） */
export function birdNo(speciesId: number): string {
  return String(Math.max(0, Math.floor(speciesId))).padStart(4, '0');
}

/** brief 指定嘅跨 App 捕捉記錄形狀 */
export interface InteropCaptureRecord {
  no: string;
  captured_at: string;
  location: { lat: number; lng: number } | null;
  method: 'photo';
  photo_original_url: string | null;
  photo_cel_url: string | null;
}

export function toInteropRecord(record: CaptureRecord): InteropCaptureRecord {
  return {
    no: record.no || birdNo(record.speciesId),
    captured_at: record.capturedAt,
    location: record.location ?? null,
    method: 'photo',
    photo_original_url: record.photo_original_url ?? null,
    photo_cel_url: record.photo_cel_url ?? null,
  };
}

/** AvianDex 深層連結：unlock 主用，search 作後備（同 AvianDex 實作對齊） */
export function aviandexUnlockUrl(no: string, name?: string): string {
  const url = new URL(AVIANDEX_BASE_URL + '/');
  url.searchParams.set('unlock', no);
  if (name) url.searchParams.set('search', name);
  return url.toString();
}

/**
 * 打開 AvianDex 解鎖連結，並把捕捉記錄 postMessage 過去。
 * 重試幾次係因為對方 App 要時間先掛到 message listener。
 */
export function openAvianDexUnlock(record: CaptureRecord, name?: string): void {
  if (typeof window === 'undefined') return;
  const interop = toInteropRecord(record);
  const url = aviandexUnlockUrl(interop.no, name);
  const targetOrigin = new URL(AVIANDEX_BASE_URL).origin;
  const payload = { source: 'birddex3', type: 'capture-unlock', record: interop };

  const opened = window.open(url, '_blank');
  if (!opened) return; // 彈窗被擋：連結照開唔到都要靜靜，唔好阻住捕捉流程
  const deliver = () => {
    try { opened.postMessage(payload, targetOrigin); } catch { /* 對方未 ready：照舊靠 ?unlock= */ }
  };
  deliver();
  window.setTimeout(deliver, 800);
  window.setTimeout(deliver, 2500);
}
