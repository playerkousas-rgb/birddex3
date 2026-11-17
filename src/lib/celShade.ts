// ============================================================
// 賽璐璐轉換（Cel-Shading）—— 前端 Canvas 濾鏡，唔使 Backend
// ------------------------------------------------------------
// 原相 = 證據（小朋友自己影嘅真相，shape／嘴／尾都唔改）；
// 賽璐璐版 = 精靈卡：Posterize（每 channel 量化到 4–5 級 → 扁平色塊）
// ＋ Edge Detection（Sobel 黑邊，加粗）→ 好似寶可夢動畫咁。
// 撳一下即刻變到：純本機 Canvas，零 upload、零等待、零錢。
// ============================================================

/** 每個顏色通道量化到幾多級（brief 指定 4–5 隻色） */
export const CEL_LEVELS = 5;
/** 輸出最大邊（控制 localStorage 體積） */
export const CEL_MAX_EDGE = 960;
export const CEL_JPEG_QUALITY = 0.82;

/**
 * 量化單一顏色通道（0–255 → levels 個平階）。
 * 純函數，方便單元測試：posterize(v, 5) 只會回傳 5 種值。
 */
export function posterizeChannel(value: number, levels = CEL_LEVELS): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.max(0, Math.min(255, value));
  const steps = Math.max(2, Math.floor(levels));
  const quantized = Math.round((v / 255) * (steps - 1));
  return Math.round((quantized / (steps - 1)) * 255);
}

/** 載入 dataURL/URL 圖片（唔使 CORS：卡面來源全部係 dataURL） */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = src;
  });
}

export interface CelShadeOptions {
  maxEdge?: number;
  quality?: number;
  levels?: number;
  /** 黑邊粗細（3x3 dilate 次數）：0 = 唔加粗 */
  edgeDilate?: number;
}

/**
 * 將相片轉成賽璐璐（cel-shading）風格，回傳 JPEG dataURL。
 * 步驟：縮細 → 飽和度輕推 → Posterize 扁平色塊 → Luma 模糊＋Sobel 黑邊（自適應門檻＋加粗）。
 */
export async function celShadeImage(src: string, options: CelShadeOptions = {}): Promise<string> {
  const maxEdge = options.maxEdge ?? CEL_MAX_EDGE;
  const levels = options.levels ?? CEL_LEVELS;
  const quality = options.quality ?? CEL_JPEG_QUALITY;
  const dilate = options.edgeDilate ?? 2;

  const img = await loadImage(src);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const count = w * h;

  // ---- 1) Posterize：扁平色塊（飽和度輕推，動畫感更強）----
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const avg = (r + g + b) / 3;
    const boost = 1.18;
    px[i] = posterizeChannel(avg + (r - avg) * boost, levels);
    px[i + 1] = posterizeChannel(avg + (g - avg) * boost, levels);
    px[i + 2] = posterizeChannel(avg + (b - avg) * boost, levels);
  }

  // ---- 2) 亮度圖：3x3 box blur 壓噪，再 Sobel 求邊 ----
  const luma = new Float32Array(count);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    luma[p] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  }
  const blurred = new Float32Array(count);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += luma[yy * w + xx];
          n++;
        }
      }
      blurred[y * w + x] = sum / n;
    }
  }

  const at = (x: number, y: number) => blurred[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
  let edges = new Uint8Array(count);
  let sumMag = 0, sumSq = 0;
  const mags = new Float32Array(count);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
        + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
        + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const mag = Math.hypot(gx, gy);
      const p = y * w + x;
      mags[p] = mag;
      sumMag += mag;
      sumSq += mag * mag;
    }
  }
  // 自適應門檻：mean + 1.6σ（夾喺合理範圍）——光線／背景唔同都唔會成張黑晒或冇邊
  const mean = sumMag / Math.max(1, count);
  const variance = Math.max(0, sumSq / Math.max(1, count) - mean * mean);
  const threshold = Math.min(Math.max(mean + 1.6 * Math.sqrt(variance), mean * 1.25 + 6), 260);
  for (let p = 0; p < count; p++) {
    if (mags[p] > threshold && p % w !== 0 && p % w !== w - 1 && p >= w && p < count - w) edges[p] = 1;
  }

  // ---- 3) 加粗黑邊（3x3 dilate N 次）----
  for (let pass = 0; pass < Math.max(0, dilate); pass++) {
    const next = new Uint8Array(count);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let on = 0;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < w && yy >= 0 && yy < h && edges[yy * w + xx]) { on = 1; break; }
          }
        }
        next[y * w + x] = on ? 1 : 0;
      }
    }
    edges = next;
  }

  // ---- 4) 蓋上墨線（近黑，保留極少原亮度，唔死黑）----
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    if (edges[p]) {
      px[i] = 16;
      px[i + 1] = 16;
      px[i + 2] = 18;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}
