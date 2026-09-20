import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';
const client = loadTs('src/lib/aiClient.ts');
const photo = new Blob(['photo'], { type: 'image/jpeg' });

test('recognition API sends the same-origin raw image and supports external cancellation', async t => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/analyze'); assert.equal(options.body, photo);
    assert.equal(options.headers['X-Media-Type'], 'image');
    return new Promise((resolve,reject) => options.signal.addEventListener('abort', () => reject(new DOMException('cancelled','AbortError'))));
  });
  const pending = client.analyzeImageDetailed(photo, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('recognition times out at 60 seconds and cleans up the request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    signal = options.signal;
    return new Promise((resolve,reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted','AbortError'))));
  });
  const pending = client.analyzeImageDetailed(photo);
  const rejection = assert.rejects(pending, /逾時（60 秒）/);
  t.mock.timers.tick(60_000);
  await rejection;
  assert.equal(signal.aborted, true);
});

test('recognition success, not-bird, HTTP errors and invalid response shapes are handled', async t => {
  let body = { mediaType: 'image', engine: 'mock', results: [{ label: 'Spotted Dove', score: 0.9 }] };
  let status = 200;
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status }));
  assert.equal((await client.analyzeImageDetailed(photo)).results[0].score, 0.9);
  body = { notBird: true, results: [], topGuess: 'cat' };
  assert.equal((await client.analyzeImage(photo))[0].score, 0);
  body = { error: 'service busy' }; status = 502;
  await assert.rejects(client.analyzeImageDetailed(photo), /service busy/);
  status = 200; body = null;
  await assert.rejects(client.analyzeImageDetailed(photo), /格式不正確/);
  body = { results: [{ label: 'bad', score: '0.99' }] };
  await assert.rejects(client.analyzeImageDetailed(photo), /格式不正確/);
});
