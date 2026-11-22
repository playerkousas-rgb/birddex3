// ============================================================
// 賽璐璐轉換（Cel-Shading）—— 前端 Canvas 濾鏡，唔使 Backend
// ------------------------------------------------------------
// 原相 = 證據（小朋友自己影嘅真相，shape／嘴／尾都唔改）；
// 賽璐璐版 = 精靈卡：Posterize（每 channel 量化到 4–5 級 → 扁平色塊）
// ＋ Edge Detection（Sobel 黑邊，加粗）→ 好似寶可夢動畫咁。
// 撳一下即刻變到：純本機 Canvas，零 upload、零等待、零錢。
// ============================================================

/** 亮度分層數；較多層可保住羽毛漸層，避免一大片色塊。 */
export const CEL_LEVELS = 8;
/** 修改濾鏡時遞增，令舊版色塊效果會喺下次啟動重新生成。 */
export const CEL_SHADE_VERSION = 3;
/** 細幅預平滑抑制相片紋理噪點；唔做低解像度縮放，避免馬賽克感。 */
export const CEL_SMOOTHING = 1.1;
/** 扁平色階只佔約七成，保留原照漸層，避免硬切成一格格色面。 */
export const CEL_STYLIZATION = 0.7;
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

/** 量化亮度而非獨立量化 RGB 三通道，保留原色相，避免相片突然變成奇怪色塊。 */
export function posterizeRgb(r: number, g: number, b: number, levels = CEL_LEVELS): [number, number, number] {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const target = posterizeChannel(luminance, levels);
  if (luminance < 1) return [target, target, target];
  const scale = target / luminance;
  return [
    Math.max(0, Math.min(255, Math.round(r * scale))),
    Math.max(0, Math.min(255, Math.round(g * scale))),
    Math.max(0, Math.min(255, Math.round(b * scale))),
  ];
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
  /** 量化之前的柔化半徑，避免將相片紋理切成零碎色塊 */
  smoothing?: number;
}

/**
 * 將相片轉成柔和賽璐璐風格，回傳 JPEG dataURL。
 * 先輕柔平滑高頻相片紋理，再做較細緻的亮度分層及稀疏輪廓；不做像素化縮放。
 */
export async function celShadeImage(src: string, options: CelShadeOptions = {}): Promise<string> {
  const maxEdge = options.maxEdge ?? CEL_MAX_EDGE;
  const levels = options.levels ?? CEL_LEVELS;
  const quality = options.quality ?? CEL_JPEG_QUALITY;
  const smoothing = Math.max(0, Math.min(3, options.smoothing ?? CEL_SMOOTHING));
  const stylization = CEL_STYLIZATION;
  // 預設一像素原生線條；舊版兩輪 3×3 膨脹會把輪廓擴成約 5px，
  // 喺 960px 照片上尤其似粗黑漫畫塊，亦會吞掉鳥身細節。
  const dilate = options.edgeDilate ?? 0;

  const img = await loadImage(src);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');
  // 只用不足兩像素的柔化壓低相片細碎紋理；輸出仍保持全解像度，不會像馬賽克般切格。
  if (smoothing > 0) ctx.filter = `blur(${smoothing}px)`;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;
  const count = w * h;

  // ---- 1) 柔和分層：亮度量化保留色相，再混回部分原色，避免一格格硬色塊 ----
  for (let i = 0; i < px.length; i += 4) {
    const sourceR = px[i], sourceG = px[i + 1], sourceB = px[i + 2];
    const [r, g, b] = posterizeRgb(sourceR, sourceG, sourceB, levels);
    px[i] = Math.round(sourceR * (1 - stylization) + r * stylization);
    px[i + 1] = Math.round(sourceG * (1 - stylization) + g * stylization);
    px[i + 2] = Math.round(sourceB * (1 - stylization) + b * stylization);
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
  // 自適應門檻：提高噪點抑制，並以有效內部像素數計算；不再靠膨脹把弱噪聲變粗黑線。
  const interiorCount = Math.max(1, (w - 2) * (h - 2));
  const mean = sumMag / interiorCount;
  const variance = Math.max(0, sumSq / interiorCount - mean * mean);
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

  // ---- 4) 輕壓暗輪廓，保留原有色相；避免硬蓋黑線變成拼貼格 ----
  for (let p = 0, i = 0; p < count; p++, i += 4) {
    if (edges[p]) {
      px[i] = Math.round(px[i] * 0.52);
      px[i + 1] = Math.round(px[i + 1] * 0.52);
      px[i + 2] = Math.round(px[i + 2] * 0.52);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}
