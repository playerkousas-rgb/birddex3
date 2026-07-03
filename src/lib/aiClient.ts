import { RecognizeResult } from '../types';

// ============================================================
// AI 辨識客戶端
// 直接呼叫 Vercel Serverless Function `/api/analyze`
// 後端會：
//   1) 用 ImageNet 通用模型判斷「是不是鳥」（鳥類前置閘）
//   2) 是鳥才再用 Birds-Classifier 跑鳥種辨識
//   3) 若不是鳥／信心度太低，回傳 notBird=true
// ============================================================

export interface AnalyzeResponse {
  mediaType: 'image' | 'audio';
  engine: string;
  results: RecognizeResult[];
  notBird?: boolean;       // 後端判定畫面不是鳥
  reason?: string;         // 失敗原因（debug）
  topGuess?: string;       // 通用模型的最強猜測（debug 用，可顯示「看起來像 XX」）
  warnings?: string[];
}

async function postBlob(file: Blob | File, mediaType: 'image' | 'audio'): Promise<AnalyzeResponse> {
  const contentType = file.type || (mediaType === 'image' ? 'image/jpeg' : 'audio/wav');
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'X-Media-Type': mediaType,
    },
    body: file,
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch {
    throw new Error(`伺服器回傳非 JSON：${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    throw new Error(json?.error || json?.details || `辨識失敗 (HTTP ${res.status})`);
  }
  return json as AnalyzeResponse;
}

export async function analyzeImage(file: Blob | File): Promise<RecognizeResult[]> {
  const data = await postBlob(file, 'image');

  // 後端判定不是鳥 → 回傳一個明確的 "Not a bird" 標記
  // ScannerScreen 會以 score < 0.7 / label 為 Unknown 視為失敗
  if (data.notBird || !data.results || data.results.length === 0) {
    return [{
      label: 'Unknown Object',
      score: 0,
      // 把後端的提示帶上來（可選 debug 用）
      scientific: data.topGuess ? `not-bird:${data.topGuess}` : undefined,
    }];
  }

  return data.results;
}

/**
 * 完整版：除了結果之外把整個後端回應一起回傳，
 * 之後 ScannerScreen 想顯示「看起來像 ___，不是鳥」就靠它。
 */
export async function analyzeImageDetailed(file: Blob | File): Promise<AnalyzeResponse> {
  return postBlob(file, 'image');
}

export async function analyzeAudio(_file: Blob | File): Promise<RecognizeResult[]> {
  throw new Error('聲音辨識功能目前已停用。');
}
