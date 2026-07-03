import { removeBackground } from '@imgly/background-removal';

let _loadingPromise: Promise<void> | null = null;

export async function makeSticker(
  imageSrc: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('載入去背模型…');
  
  // @imgly/background-removal 會自動快取到 IndexedDB
  const blob = await removeBackground(imageSrc, {
    // smaller model, faster on phones
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (k: string, current: number, total: number) => {
      if (k === 'fetch') onProgress?.(`下載模型 ${Math.round(current/total*100)}%`);
      else if (k.startsWith('compute')) onProgress?.('去背計算中…');
    }
  });

  onProgress?.('生成貼圖…');
  // blob 已經是 PNG
  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
