// api/analyze.js
// ============================================================
// AvianDex v1.5 統一辨識代理 (Vercel Serverless Function)
// ============================================================
// 重要更新 (v1.5)：
//   ✅ 新增「鳥類前置閘」(Bird Gate)：
//      圖片進來先用通用 ImageNet 模型判斷「是不是鳥」，
//      不是鳥就直接回 notBird:true，避免把貓、桌子、牆壁
//      硬塞進鳥種分類器後被亂貼標籤。
//
// 引擎順序：
//   1) 圖片 GATE：google/vit-base-patch16-224 (ImageNet 通用)
//      → 看 top-5 是否含「鳥」，bird score 加總 < 0.30 即拒絕
//   2) 圖片 SPECIES：dennisjooo/Birds-Classifier-EfficientNetB2
//      → 並要求 top-1 score >= MIN_SPECIES_SCORE (預設 0.35)
//   3) 聲音：ConvNeXT-Base-BirdSet-XCL → BirdNET Space（備援）
//
// 環境變數：
//   HF_TOKEN                  必填
//   NYCKEL_CLIENT_ID/SECRET   選填（圖片備援）
//   BIRDNET_SPACE_URL         選填（聲音備援）
//   BIRD_GATE_MIN_SCORE       選填，預設 0.30
//   MIN_SPECIES_SCORE         選填，預設 0.35
//   DISABLE_BIRD_GATE         選填，設 "1" 可關閉前置閘
// ============================================================

import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ------------------------------------------------------------
// ImageNet 1000 類中屬於「鳥類」的關鍵字（含常見俗名 / 科）
// 比對 label 是否包含其中任一字詞（不分大小寫、整字邊界）
// ------------------------------------------------------------
const BIRD_KEYWORDS = [
  // 通用
  'bird', 'fowl', 'songbird', 'seabird', 'waterbird', 'wading bird',
  // ImageNet 1000 鳥類 (索引 7-24, 80-100)
  'cock', 'hen', 'ostrich', 'brambling', 'goldfinch', 'finch', 'junco',
  'bunting', 'robin', 'bulbul', 'jay', 'magpie', 'chickadee',
  'water ouzel', 'dipper', 'kite', 'eagle', 'vulture', 'owl', 'hawk',
  'falcon', 'osprey', 'grouse', 'ptarmigan', 'prairie chicken',
  'peacock', 'peafowl', 'quail', 'partridge', 'pheasant',
  'parrot', 'cockatoo', 'macaw', 'lorikeet', 'parakeet', 'lory',
  'coucal', 'bee eater', 'hornbill', 'hummingbird', 'jacamar', 'toucan',
  'duck', 'drake', 'merganser', 'goose', 'swan', 'mallard', 'teal',
  'stork', 'spoonbill', 'flamingo', 'heron', 'egret', 'bittern',
  'crane', 'limpkin', 'gallinule', 'coot', 'rail', 'moorhen',
  'bustard', 'turnstone', 'sandpiper', 'redshank', 'dowitcher',
  'oystercatcher', 'plover', 'lapwing', 'snipe', 'woodcock',
  'pelican', 'penguin', 'albatross', 'petrel', 'shearwater',
  'gull', 'tern', 'cormorant', 'gannet', 'booby', 'frigate bird',
  'pigeon', 'dove', 'sparrow', 'starling', 'swallow', 'swift',
  'warbler', 'wren', 'thrush', 'flycatcher', 'wagtail', 'pipit',
  'woodpecker', 'kingfisher', 'cuckoo', 'nightjar', 'hoopoe',
  'shrike', 'oriole', 'tit ', 'tit,', 'tits', 'minivet', 'drongo',
  'crow', 'raven', 'rook', 'jackdaw',
];

const BIRD_REGEX = new RegExp(
  '\\b(?:' + BIRD_KEYWORDS
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|') + ')\\b',
  'i',
);

function isBirdLabel(label) {
  if (!label) return false;
  return BIRD_REGEX.test(String(label));
}

// ------------------------------------------------------------
// 共用工具
// ------------------------------------------------------------
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function detectMediaType(buffer, contentTypeHeader = '') {
  const ct = (contentTypeHeader || '').toLowerCase();
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('image/')) return 'image';
  if (buffer.length >= 4) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image';
    if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'image';
    if (buffer.slice(0, 3).toString() === 'GIF') return 'image';
    if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WAVE') return 'audio';
    if (buffer.slice(0, 3).toString() === 'ID3') return 'audio';
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return 'audio';
    if (buffer.slice(0, 4).toString() === 'OggS') return 'audio';
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'audio';
  }
  return 'unknown';
}

function normalizeResults(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((c) => ({
      label: String(c.label || c.name || c.species || '').trim(),
      score: Number(c.score ?? c.confidence ?? 0),
    }))
    .filter((c) => c.label)
    .sort((a, b) => b.score - a.score);
}

async function hfClassify(buffer, contentType, modelId) {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN 未設定');
  const url = `https://router.huggingface.co/hf-inference/models/${modelId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 503) {
      throw new Error(`Hugging Face 模型載入中（${modelId}），請 20 秒後重試。`);
    }
    throw new Error(`HF API ${res.status}：${text.slice(0, 200)}`);
  }
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`HF 回傳非 JSON：${text.slice(0, 200)}`); }
  return normalizeResults(json);
}

// ------------------------------------------------------------
// 階段 1：鳥類前置閘 (Bird Gate)
// 用通用 ImageNet 模型判斷「畫面裡到底是不是鳥」
// ------------------------------------------------------------
async function runBirdGate(buffer, contentType) {
  // ViT 是 ImageNet 1k 經典模型，回傳是 1000 類的 softmax 機率
  const top = await hfClassify(buffer, contentType || 'image/jpeg', 'google/vit-base-patch16-224');
  const top5 = top.slice(0, 5);

  let birdScoreSum = 0;
  let nonBirdScoreSum = 0;
  for (const r of top5) {
    if (isBirdLabel(r.label)) birdScoreSum += r.score;
    else nonBirdScoreSum += r.score;
  }

  return {
    top5,
    birdScoreSum,
    nonBirdScoreSum,
    topLabel: top5[0]?.label || '',
    topScore: top5[0]?.score || 0,
    topIsBird: top5[0] ? isBirdLabel(top5[0].label) : false,
  };
}

async function identifyImageWithHF(buffer, contentType) {
  return hfClassify(
    buffer,
    contentType || 'image/jpeg',
    'dennisjooo/Birds-Classifier-EfficientNetB2',
  );
}

async function identifyAudioWithHF(buffer, contentType) {
  return hfClassify(
    buffer,
    contentType || 'audio/wav',
    'DBD-research-group/ConvNeXT-Base-BirdSet-XCL',
  );
}

async function identifyImageWithNyckel(buffer, contentType) {
  const clientId = process.env.NYCKEL_CLIENT_ID;
  const clientSecret = process.env.NYCKEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Nyckel 金鑰未設定');
  }
  const tokenRes = await fetch('https://www.nyckel.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw new Error(`Nyckel token 失敗 (${tokenRes.status})：${t.slice(0, 200)}`);
  }
  const { access_token } = await tokenRes.json();
  const form = new FormData();
  form.append('data', buffer, { filename: 'bird.jpg', contentType: contentType || 'image/jpeg' });
  const invokeRes = await fetch(
    'https://www.nyckel.com/v1/functions/bird-identifier/invoke',
    { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, ...form.getHeaders() }, body: form },
  );
  const text = await invokeRes.text();
  if (!invokeRes.ok) throw new Error(`Nyckel 辨識失敗 (${invokeRes.status})：${text.slice(0, 200)}`);
  let json; try { json = JSON.parse(text); } catch { json = null; }
  if (!json) throw new Error('Nyckel 回傳非 JSON');
  if (json.labelName) {
    return normalizeResults([{ label: json.labelName, score: json.confidence ?? 0.9 }]);
  }
  if (Array.isArray(json.labels)) {
    return normalizeResults(json.labels.map((l) => ({ label: l.name || l.labelName, score: l.confidence })));
  }
  return [];
}

async function identifyAudioWithBirdNetSpace(buffer, contentType) {
  const spaceBase = process.env.BIRDNET_SPACE_URL;
  if (!spaceBase) throw new Error('BIRDNET_SPACE_URL 未設定');
  const form = new FormData();
  const ext = contentType?.includes('mp3') ? 'mp3'
            : contentType?.includes('webm') ? 'webm'
            : contentType?.includes('ogg') ? 'ogg'
            : 'wav';
  form.append('audio', buffer, { filename: `clip.${ext}`, contentType: contentType || 'audio/wav' });
  const res = await fetch(`${spaceBase}/api/predict`, { method: 'POST', body: form, headers: form.getHeaders() });
  const text = await res.text();
  if (!res.ok) throw new Error(`BirdNET Space ${res.status}：${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  const raw = json?.data?.[0];
  let arr = [];
  if (typeof raw === 'string') {
    arr = raw.split(/[,\n]/).map((s) => {
      const [label, score] = s.split(/[;:\t]/);
      return { label: (label || '').trim(), score: parseFloat(score) || 0 };
    });
  } else if (raw?.confidences) {
    arr = raw.confidences.map((c) => ({ label: c.label, score: c.confidence }));
  }
  return normalizeResults(arr);
}

// ------------------------------------------------------------
// HTTP handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Media-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      version: 'v1.5.0',
      service: 'AvianDex AI Recognition',
      engines: {
        huggingface: !!process.env.HF_TOKEN,
        nyckel: !!(process.env.NYCKEL_CLIENT_ID && process.env.NYCKEL_CLIENT_SECRET),
        birdnetSpace: !!process.env.BIRDNET_SPACE_URL,
      },
      gate: {
        enabled: process.env.DISABLE_BIRD_GATE !== '1',
        minBirdScore: Number(process.env.BIRD_GATE_MIN_SCORE ?? 0.30),
        minSpeciesScore: Number(process.env.MIN_SPECIES_SCORE ?? 0.35),
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '請使用 POST 請求' });
  }

  try {
    const buffer = await getRawBody(req);
    if (buffer.length === 0) return res.status(400).json({ error: '接收到的檔案為空' });

    const contentType = req.headers['content-type'] || '';
    const explicit = (req.headers['x-media-type'] || '').toLowerCase();
    const mediaType = explicit || detectMediaType(buffer, contentType);

    console.log(`[analyze] ${(buffer.length / 1024).toFixed(1)}KB · type=${mediaType} · ct=${contentType}`);

    const errors = [];

    // ────────────────────────────────────────────────
    // 圖片：先過 Bird Gate，再做 Species 分類
    // ────────────────────────────────────────────────
    if (mediaType === 'image') {
      const gateEnabled = process.env.DISABLE_BIRD_GATE !== '1';
      const minBirdScore = Number(process.env.BIRD_GATE_MIN_SCORE ?? 0.30);
      const minSpeciesScore = Number(process.env.MIN_SPECIES_SCORE ?? 0.35);

      // === 階段 1: Bird Gate ===
      let gate = null;
      if (gateEnabled) {
        try {
          gate = await runBirdGate(buffer, contentType);
          console.log(`[gate] topLabel="${gate.topLabel}" topScore=${gate.topScore.toFixed(3)} birdSum=${gate.birdScoreSum.toFixed(3)} topIsBird=${gate.topIsBird}`);

          // 拒絕條件：top-1 不是鳥「而且」整體鳥分數加總過低
          // 兩個條件都要符合才拒絕，避免過度嚴格（畫質差時鳥也可能被低估）
          if (!gate.topIsBird && gate.birdScoreSum < minBirdScore) {
            return res.status(200).json({
              mediaType: 'image',
              engine: 'gate',
              notBird: true,
              reason: '畫面中沒有偵測到鳥類',
              topGuess: gate.topLabel,
              topGuessScore: gate.topScore,
              birdScoreSum: gate.birdScoreSum,
              results: [],
            });
          }
        } catch (e) {
          // Gate 失敗不阻擋流程，記錄警告繼續往下走
          console.warn(`[gate] 失敗：${e.message}`);
          errors.push(`Gate: ${e.message}`);
        }
      }

      // === 階段 2: Species 分類 ===
      let results = [];
      let usedEngine = '';
      try {
        results = await identifyImageWithHF(buffer, contentType);
        if (results.length > 0) usedEngine = 'huggingface';
      } catch (e) {
        errors.push(`HF: ${e.message}`);
      }
      if (results.length === 0) {
        try {
          results = await identifyImageWithNyckel(buffer, contentType);
          if (results.length > 0) usedEngine = 'nyckel';
        } catch (e) {
          errors.push(`Nyckel: ${e.message}`);
        }
      }

      if (results.length === 0) {
        return res.status(502).json({
          error: '所有辨識引擎都失敗',
          details: errors.join(' | ') || '無詳細錯誤',
        });
      }

      // 再加一層：top-1 分數太低 → 視為「沒抓到鳥」
      const top = results[0];
      if (!top || top.score < minSpeciesScore) {
        return res.status(200).json({
          mediaType: 'image',
          engine: usedEngine || 'huggingface',
          notBird: true,
          reason: `鳥種辨識信心度過低 (top=${top?.score?.toFixed(2) || '0'} < ${minSpeciesScore})`,
          topGuess: top?.label,
          topGuessScore: top?.score,
          gate: gate ? { topGuess: gate.topLabel, topScore: gate.topScore, birdScoreSum: gate.birdScoreSum } : undefined,
          results: [],
        });
      }

      return res.status(200).json({
        mediaType: 'image',
        engine: usedEngine,
        results: results.slice(0, 5),
        gate: gate ? { topGuess: gate.topLabel, topScore: gate.topScore, birdScoreSum: gate.birdScoreSum, topIsBird: gate.topIsBird } : undefined,
        warnings: errors.length > 0 ? errors : undefined,
      });
    }

    // ────────────────────────────────────────────────
    // 聲音：保留原邏輯
    // ────────────────────────────────────────────────
    if (mediaType === 'audio') {
      let results = [];
      let usedEngine = '';
      try {
        results = await identifyAudioWithHF(buffer, contentType);
        if (results.length > 0) usedEngine = 'huggingface';
      } catch (e) {
        errors.push(`HF: ${e.message}`);
      }
      if (results.length === 0 && process.env.BIRDNET_SPACE_URL) {
        try {
          results = await identifyAudioWithBirdNetSpace(buffer, contentType);
          if (results.length > 0) usedEngine = 'birdnetSpace';
        } catch (e) {
          errors.push(`BirdNET Space: ${e.message}`);
        }
      }
      if (results.length === 0) {
        return res.status(502).json({ error: '所有聲音引擎都失敗', details: errors.join(' | ') });
      }
      return res.status(200).json({
        mediaType: 'audio',
        engine: usedEngine,
        results: results.slice(0, 5),
        warnings: errors.length > 0 ? errors : undefined,
      });
    }

    return res.status(415).json({ error: '無法判斷檔案類型' });
  } catch (error) {
    console.error('[analyze] 錯誤:', error);
    return res.status(500).json({ error: '辨識失敗', details: error.message });
  }
}
