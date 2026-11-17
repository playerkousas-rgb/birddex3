/**
 * 捕捉記憶格式化 — 紀念價值要「睇得到」：
 * 原相＋賽璐璐卡永久保存之餘，結果頁／詳頁都要顯示捕捉日期同地點。
 * 地點只顯示坐標（唔接任何地圖／逆地理 API，零外部依賴）。
 */

export function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCaptureLocation(loc: { lat: number; lng: number } | null | undefined): string {
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return '地點未記錄';
  return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}
