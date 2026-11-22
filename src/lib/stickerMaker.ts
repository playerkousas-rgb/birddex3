import { removeBackground } from '@imgly/background-removal';

/**
 * Browser-side background removal. Force the documented CPU path rather than
 * relying on WebGPU/worker availability, which varies across mobile browsers.
 * IMG.LY model assets are still fetched on first use and cached by the library.
 */
export async function makeSticker(
  imageSrc: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  if (!imageSrc) throw new Error('搵唔到原相，請返回相片再試。');

  // iPhone 相片可達數千萬像素；先限制輸入尺寸，減少 Safari/WASM 峰值記憶體。
  onProgress?.('準備相片（手機會先縮至貼圖尺寸）…');
  const modelInput = await resizeForSticker(imageSrc, 1280);

  onProgress?.('載入去背模型…');
  let blob: Blob;
  try {
    blob = await removeBackground(modelInput, {
      model: 'isnet_quint8',
      device: 'cpu',
      proxyToWorker: false,
      output: { format: 'image/png' },
      progress: (key: string, current: number, total: number) => {
        if (key === 'fetch') {
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;
          onProgress?.(`首次下載去背模型 ${percent}%（之後會快取）`);
        } else if (key.startsWith('compute')) {
          onProgress?.('正在去背，請稍候…');
        }
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const lower = detail.toLowerCase();
    if (/fetch|network|http|download|cors|failed to load|resource.*not found/.test(lower)) {
      throw new Error('去背模型下載失敗。請確認網絡可連線後重試；原相沒有被更改。');
    }
    if (/memory|allocation|out of memory|array buffer|wasm trap|webassembly|unsupported|canvas/.test(lower)) {
      throw new Error('iPhone 記憶體不足或瀏覽器未能執行去背。相片已先縮細；請關閉其他分頁再重試，原相沒有被更改。');
    }
    throw new Error(`去背處理失敗：${detail}`);
  }

  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('去背模型沒有輸出有效圖片，請再試一次。');
  }
  onProgress?.('生成透明 PNG…');
  return blobToDataUrl(blob);
}

function resizeForSticker(src: string, maxEdge: number): Promise<string | Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) {
        reject(new Error('無法讀取相片尺寸，原相沒有被更改。'));
        return;
      }
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      if (scale === 1) {
        resolve(src);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('此瀏覽器無法準備貼圖相片，原相沒有被更改。'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob && blob.size > 0) resolve(blob);
        else reject(new Error('手機縮細相片失敗，請重試；原相沒有被更改。'));
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => reject(new Error('原相無法讀取，請返回相片再試。'));
    image.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/png')) {
        reject(new Error('透明 PNG 轉換失敗，請再試一次。'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('無法讀取去背結果，請檢查裝置儲存空間。'));
    reader.readAsDataURL(blob);
  });
}
