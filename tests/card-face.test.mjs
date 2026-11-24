import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const { resolveCardFaces } = loadTs('src/lib/cardFace.ts');

const ILLUSTRATION = 'https://pub-a9333a974e814ccba1994639b6e79266.r2.dev/birdcards/0001.avif';
const ALT_ILLUSTRATION = 'https://pub-a9333a974e814ccba1994639b6e79266.r2.dev/birdcards/0001_UR.avif';

function makeCapture(overrides = {}) {
  return {
    speciesId: 1,
    no: '0001',
    method: 'photo',
    capturedAt: '2026-11-24T08:00:00.000Z',
    count: 1,
    currentRarity: 'C',
    firstCaptureDate: '2026-11-24T08:00:00.000Z',
    lastCaptureDate: '2026-11-24T08:00:00.000Z',
    photo_original_url: 'data:image/jpeg;base64,MY_ORIGINAL_PHOTO',
    photo_cel_url: 'data:image/jpeg;base64,MY_CEL_PHOTO',
    ...overrides,
  };
}

test('未拍到時插圖保持鎖定，不可反轉或生成貼圖', () => {
  const faces = resolveCardFaces(undefined, ILLUSTRATION);
  assert.equal(faces.isUnlocked, false);
  assert.equal(faces.frontIllustrationUrl, null);
  assert.equal(faces.canFlip, false);
  assert.equal(faces.canGenerateSticker, false);
  assert.equal(faces.backUrl, null);
});

test('拍到照即解鎖正面插圖（含異圖），唔再被用戶相片遮蓋；反轉預設顯示自己拍的原相', () => {
  const normal = resolveCardFaces(makeCapture(), ILLUSTRATION);
  assert.equal(normal.isUnlocked, true);
  assert.equal(normal.frontIllustrationUrl, ILLUSTRATION, '正面必須顯示已解鎖 R2 插圖');
  assert.equal(normal.canFlip, true);
  assert.equal(normal.canGenerateSticker, true);
  assert.equal(normal.activeBackKind, 'photo');
  assert.equal(normal.backUrl, 'data:image/jpeg;base64,MY_ORIGINAL_PHOTO', '反轉後預設顯示自己拍的原相');

  const alt = resolveCardFaces(makeCapture({ currentRarity: 'UR' }), ALT_ILLUSTRATION);
  assert.equal(alt.frontIllustrationUrl, ALT_ILLUSTRATION, '高稀有度解鎖異圖同樣顯示喺正面');
});

test('反轉後可切換至去背貼圖或賽璐璐版，同時完整保留正面插圖與原相', () => {
  const captureWithSticker = makeCapture({
    stats: { stickerUrl: 'data:image/png;base64,CUTOUT_STICKER' },
    bestStats: { stickerUrl: 'data:image/png;base64,CUTOUT_STICKER' },
  });

  const defaultBack = resolveCardFaces(captureWithSticker, ILLUSTRATION, 'photo');
  assert.equal(defaultBack.frontIllustrationUrl, ILLUSTRATION);
  assert.equal(defaultBack.activeBackKind, 'photo');
  assert.equal(defaultBack.backUrl, 'data:image/jpeg;base64,MY_ORIGINAL_PHOTO');

  const stickerBack = resolveCardFaces(captureWithSticker, ILLUSTRATION, 'sticker');
  assert.equal(stickerBack.frontIllustrationUrl, ILLUSTRATION);
  assert.equal(stickerBack.activeBackKind, 'sticker');
  assert.equal(stickerBack.backUrl, 'data:image/png;base64,CUTOUT_STICKER');
  assert.equal(stickerBack.originalPhotoUrl, 'data:image/jpeg;base64,MY_ORIGINAL_PHOTO');

  const celBack = resolveCardFaces(captureWithSticker, ILLUSTRATION, 'cel');
  assert.equal(celBack.activeBackKind, 'cel');
  assert.equal(celBack.backUrl, 'data:image/jpeg;base64,MY_CEL_PHOTO');
});

test('無原相的舊記錄仍解鎖正面插圖，唔顯示空反轉面', () => {
  const legacy = resolveCardFaces(makeCapture({ photo_original_url: null, photo_cel_url: null }), ILLUSTRATION);
  assert.equal(legacy.isUnlocked, true);
  assert.equal(legacy.frontIllustrationUrl, ILLUSTRATION);
  assert.equal(legacy.canFlip, false);
  assert.equal(legacy.canGenerateSticker, false);
});

test('UI 合約：鳥卡、詳情頁與結果頁均支援正面插圖、3D 反轉照片與生成貼圖', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const card = readFileSync('src/components/BirdCard.tsx', 'utf8');
  const detail = readFileSync('src/components/BirdDetailScreen.tsx', 'utf8');
  const result = readFileSync('src/components/CaptureResultScreen.tsx', 'utf8');

  assert.match(css, /\.card-flip-scene/);
  assert.match(css, /\.card-flip-inner\[data-flipped='true'\]/);
  assert.match(css, /\.card-flip-back/);

  assert.match(card, /resolveCardFaces/);
  assert.match(card, /faces\.frontIllustrationUrl/);
  assert.match(card, /card-flip-back/);
  assert.match(card, /反轉照片/);
  assert.match(card, /生成貼圖/);
  assert.doesNotMatch(card, /舊插畫（異圖\/ R2，只有無相舊記錄先見到）/);

  assert.match(detail, /resolveCardFaces/);
  assert.match(detail, /faces\.frontIllustrationUrl/);
  assert.match(detail, /card-flip-back/);
  assert.match(detail, /反轉照片/);
  assert.match(detail, /生成貼圖/);

  assert.match(result, /我的照片/);
  assert.match(result, /生成貼圖/);
});

test('React 組件實際渲染：未拍到隱藏原圖、拍到後正面顯示插圖、反轉顯示自己拍的照片及貼圖入口', async () => {
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const birds = JSON.parse(readFileSync('src/data/birds.json', 'utf8'));
  const bird = birds[0];
  const stats = {
    iv: { hp: 30, atk: 30, def: 30, spd: 30, sta: 30, total: 150, percent: 97 },
    cp: 620,
    nature: '勇敢',
    trait: '愛鳴唱',
    sizeVariant: 'M',
    isShiny: false,
    catchScore: 'Great',
    catchDistance: 2,
  };
  const capture = makeCapture({ stats, bestStats: stats, allCatches: [stats] });

  const mockContext = {
    captures: [capture],
    canShowAltArt: () => false,
    markAltArtExists: () => {},
    markAltArtMissing: () => {},
    altArt: { unlocked: [], existsOnR2: [], missingOnR2: [] },
    setCaptureSticker: () => {},
    setBestIndividual: () => {},
    deleteCatchRecord: () => {},
    deleteCapture: () => {},
  };

  const { BirdCard } = loadTs('src/components/BirdCard.tsx', {
    '../context/CollectionContext': { useCollectionContext: () => mockContext },
    '../lib/stickerMaker': { makeSticker: async () => 'data:image/png;base64,STICKER' },
  });

  // 1. 未拍到：圖鑑小卡與大卡都唔會洩漏 R2 插圖
  const uncaughtCompactHtml = renderToStaticMarkup(React.createElement(BirdCard, { bird, compact: true }));
  assert.doesNotMatch(uncaughtCompactHtml, /birdcards\/0001\.avif/);
  assert.match(uncaughtCompactHtml, /\?\?\?/);

  const uncaughtFullHtml = renderToStaticMarkup(React.createElement(BirdCard, { bird }));
  assert.doesNotMatch(uncaughtFullHtml, /birdcards\/0001\.avif/);
  assert.match(uncaughtFullHtml, /尚未拍攝/);

  // 2. 已拍到（圖鑑 compact）：直接顯示已解鎖 R2 插圖
  const caughtCompactHtml = renderToStaticMarkup(React.createElement(BirdCard, { bird, capture, compact: true }));
  assert.match(caughtCompactHtml, /birdcards\/0001\.avif/);
  assert.doesNotMatch(caughtCompactHtml, /MY_ORIGINAL_PHOTO/);

  // 3. 已拍到（收藏冊／結果頁大卡）：預設正面顯示插圖（data-flipped="false"），同時備妥反轉照片與生成貼圖
  const caughtFrontHtml = renderToStaticMarkup(React.createElement(BirdCard, { bird, capture }));
  assert.match(caughtFrontHtml, /data-flipped="false"/);
  assert.match(caughtFrontHtml, /birdcards\/0001\.avif/);
  assert.match(caughtFrontHtml, /反轉照片/);
  assert.match(caughtFrontHtml, /MY_ORIGINAL_PHOTO/);
  assert.match(caughtFrontHtml, /生成貼圖/);

  // 4. 反轉後（flipped=true）：切換至反面顯示自己拍的照片
  const caughtFlippedHtml = renderToStaticMarkup(React.createElement(BirdCard, { bird, capture, flipped: true }));
  assert.match(caughtFlippedHtml, /data-flipped="true"/);

  // 5. 詳情頁已拍到：正面顯示已解鎖插圖，並提供反轉照片與生成貼圖控制
  const { BirdDetailScreen } = loadTs('src/components/BirdDetailScreen.tsx', {
    '../context/CollectionContext': { useCollectionContext: () => mockContext },
    '../lib/stickerMaker': { makeSticker: async () => 'data:image/png;base64,STICKER' },
  });
  const detailHtml = renderToStaticMarkup(React.createElement(BirdDetailScreen, { speciesId: bird.id, onBack: () => {} }));
  assert.match(detailHtml, /birdcards\/0001\.avif/);
  assert.match(detailHtml, /已解鎖插圖/);
  assert.match(detailHtml, /反轉照片/);
  assert.match(detailHtml, /我的照片/);
  assert.match(detailHtml, /生成貼圖/);
});
