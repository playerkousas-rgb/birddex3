/**
 * 分享用家自己影嘅相／賽璐璐轉化圖（真實照片，唔係 AI 生成）。
 * 首選系統分享（Web Share API，付費／書籤唔需要）；唔支援就降落去下載。
 * 只接受 data:／blob: URL：R2 遠端圖有 CORS 限制，唔好扮分享到。
 */
export async function shareCaptureImage(
  url: string,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'unavailable'> {
  if (!/^(data:image\/|blob:)/i.test(url)) return 'unavailable';
  try {
    const res = await fetch(url);
    if (!res.ok) return 'unavailable';
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
      await nav.share({ files: [file], title });
      return 'shared';
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return 'downloaded';
  } catch {
    return 'unavailable'; // 用家取消分享／瀏覽器封鎖：靜靜失敗，唔中斷遊戲
  }
}
