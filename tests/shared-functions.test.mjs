import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

const { CameraSession, cameraCrop, drawCameraFrame, sharpness } = loadTs('src/lib/camera.ts');
const { getLevelProgress, LEVEL_TITLES } = loadTs('src/lib/theme.ts');
const { recognitionCandidates, AUTO_CAPTURE_CONFIDENCE } = loadTs('src/lib/recognitionCandidates.ts');
const storage = loadTs('src/lib/storage.ts');

function fakeStream() {
  let stops = 0;
  const track = { stop() { stops++; } };
  return { getTracks: () => [track], getVideoTracks: () => [track], get stops() { return stops; } };
}
function fakeVideo() { return { srcObject: null, play: async () => {} }; }

test('camera retries stop the previous stream and detach the video on cleanup', async () => {
  const streams = [fakeStream(), fakeStream()];
  let next = 0;
  const session = new CameraSession(async () => streams[next++]);
  const video = fakeVideo();
  await session.open(video);
  await session.open(video);
  assert.equal(streams[0].stops, 1);
  assert.equal(video.srcObject, streams[1]);
  session.stop();
  assert.equal(streams[1].stops, 1);
  assert.equal(video.srcObject, null);
});

test('late camera permission and superseded requests are released, never attached', async () => {
  const resolves = [];
  const session = new CameraSession(() => new Promise(resolve => resolves.push(resolve)));
  const video = fakeVideo();
  const first = session.open(video);
  const second = session.open(video);
  const stale = fakeStream(), latest = fakeStream();
  resolves[1](latest); assert.equal(await second, latest);
  resolves[0](stale); assert.equal(await first, null);
  assert.equal(stale.stops, 1);
  assert.equal(video.srcObject, latest);
  const pending = session.open(video);
  session.stop();
  const afterUnmount = fakeStream(); resolves[2](afterUnmount);
  assert.equal(await pending, null);
  assert.equal(afterUnmount.stops, 1);
});

test('camera play failure releases the stream, allowing a subsequent retry', async () => {
  const stream = fakeStream();
  const session = new CameraSession(async () => stream);
  await assert.rejects(session.open({ srcObject: null, play: async () => { throw Error('play failed'); } }), /play failed/);
  assert.equal(stream.stops, 1);
  assert.equal(session.track, null);
});

test('photo crop matches object-cover and actual digital zoom, without a second optical crop', () => {
  assert.deepEqual(cameraCrop(1920, 1080, 1920, 1080, 2), { x: 480, y: 270, width: 960, height: 540 });
  const portrait = cameraCrop(1920, 1080, 390, 780, 1);
  assert.deepEqual(portrait, { x: 690, y: 0, width: 540, height: 1080 });
  assert.deepEqual(cameraCrop(1920, 1080, 390, 780, 2), { x: 825, y: 270, width: 270, height: 540 });
  assert.throws(() => cameraCrop(0, 0, 390, 780), /尚未準備/);
  let args;
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...a) => { args = a; } }) };
  const video = { videoWidth: 1920, videoHeight: 1080, clientWidth: 390, clientHeight: 844 };
  // Viewport is frozen before the busy navbar disappears.
  drawCameraFrame(video, canvas, 2, { width: 390, height: 780 });
  assert.deepEqual(args.slice(1), [825,270,270,540,0,0,270,540]);
  assert.deepEqual([canvas.width, canvas.height], [270,540]);
});

test('burst chooses sharp frames, but does not reject low-detail scenes', () => {
  const flat = new Uint8ClampedArray(4 * 4 * 4).fill(100);
  const edges = new Uint8ClampedArray(flat);
  for (let i = 0; i < edges.length; i++) if (Math.floor(i / 4) % 2 === 0) edges[i] = 255;
  assert.equal(sharpness(flat,4,4), 0);
  assert.ok(sharpness(edges,4,4) > sharpness(flat,4,4));
});

test('XP progress is finite and bounded inside every level without changing thresholds', () => {
  assert.equal(getLevelProgress(50), 50);
  assert.equal(getLevelProgress(101), 0.5);
  assert.equal(getLevelProgress(200), 50);
  assert.equal(getLevelProgress(-10), 0);
  assert.equal(getLevelProgress(Infinity), 0);
  for (const entry of LEVEL_TITLES.slice(0,-1)) assert.equal(getLevelProgress(entry.xp), 0);
  for (let xp = 0; xp <= 11000; xp++) {
    const percent = getLevelProgress(xp);
    assert.ok(Number.isFinite(percent) && percent >= 0 && percent <= 100, `XP ${xp}`);
  }
  assert.equal(getLevelProgress(10000), 100);
});

test('candidate matching keeps automatic confidence and only offers unique recognized top-three birds', () => {
  assert.equal(AUTO_CAPTURE_CONFIDENCE, 0.68);
  const top = { label: 'Spotted Dove', score: 0.99 };
  assert.equal(recognitionCandidates([top])[0].result, top);
  const choices = recognitionCandidates([
    { label: 'not a real bird name', score: 0.9 },
    { label: 'Spotted Dove', score: 0.55 },
    { label: 'spotted dove', score: 0.45 },
    { label: 'Passer montanus', score: 0.9 },
  ]);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].bird.nameEn, 'Spotted Dove');
  for (const score of [0.34, NaN, Infinity, 1.5]) assert.equal(recognitionCandidates([{ label: 'Spotted Dove', score }]).length, 0);
});

test('storage quota errors keep previous saves and all new photo/IV/sticker data intact', t => {
  const old = globalThis.localStorage;
  t.after(() => { if (old) globalThis.localStorage = old; else delete globalThis.localStorage; });
  const disk = new Map([['bd_collection_v3', '{"previous":true}']]);
  globalThis.localStorage = { getItem: key => disk.get(key) ?? null, setItem() { throw new DOMException('full','QuotaExceededError'); } };
  const data = { captures: [{ photoDataUrl: 'full original photo', stats: { cp: 123, stickerUrl: 'full original sticker' }, allCatches: [{ cp: 123 }] }], version: 3 };
  const before = JSON.stringify(data);
  assert.equal(storage.saveJSON('bd_collection_v3', data), false);
  assert.equal(disk.get('bd_collection_v3'), '{"previous":true}');
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(storage.readJSON('missing', { captures: [] }), { captures: [] });
  globalThis.localStorage.setItem = (key,value) => disk.set(key,value);
  assert.equal(storage.saveJSON('bd_collection_v3',data), true);
  assert.deepEqual(JSON.parse(disk.get('bd_collection_v3')),data);
  disk.set('broken','{');
  assert.throws(() => storage.readJSON('broken',{}), /原有資料未被覆寫/);
  assert.equal(disk.get('broken'),'{');
});

test('image fallbacks only mark a successfully loaded alternative, then fall back to emoji after base error', () => {
  let failed;
  const events = [];
  const { useBirdImage } = loadTs('src/hooks/useBirdImage.ts', {
    react: { useState(init) { failed ??= init(); return [failed, update => { failed = update(failed); }]; } },
    '../context/CollectionContext': { useCollectionContext: () => ({ markAltArtExists: id => events.push(['exists',id]), markAltArtMissing: id => events.push(['missing',id]) }) },
  });
  let image = useBirdImage(1,'https://r2/0001.avif',true);
  assert.equal(image.imageUrl,'https://r2/0001_UR.avif');
  image.onError();
  image = useBirdImage(1,'https://r2/0001.avif',true);
  assert.equal(image.imageUrl,'https://r2/0001.avif'); image.onLoad();
  assert.deepEqual(events,[['missing',1]]);
  image.onError(); image = useBirdImage(1,'https://r2/0001.avif',true);
  assert.equal(image.imageUrl,null);
  image = useBirdImage(1,'https://r2/0001.avif',true,'data:image/png;valid');
  assert.equal(image.isSticker,true); image.onLoad();
  assert.deepEqual(events,[['missing',1]]);
});
