import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../api/analyze.js';

async function request(method, body = '', headers = {}) {
  const req = Readable.from([Buffer.from(body)]);
  Object.assign(req, { method, headers });
  const res = {
    headers: {}, statusCode: 200, body: undefined,
    setHeader(key, value) { this.headers[key] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
  await handler(req, res);
  return res;
}

test('API health route preserves configuration without exposing tokens', async () => {
  const res = await request('GET');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, 'AvianDex AI Recognition');
  assert.equal(typeof res.body.engines.huggingface, 'boolean');
  assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
});

test('API preflight, method validation, empty uploads and unknown media', async () => {
  assert.equal((await request('OPTIONS')).statusCode, 200);
  assert.equal((await request('DELETE')).statusCode, 405);
  assert.equal((await request('POST')).statusCode, 400);
  assert.equal((await request('POST', 'plain text', { 'content-type': 'text/plain' })).statusCode, 415);
});

// Exercise real handler control flow and real multipart serialization, with AI network responses mocked.
test('bird gate, confidence threshold, HF success and image/audio fallback contracts', async t => {
  const { loadTs } = await import('./load-ts.mjs');
  const envKeys = ['HF_TOKEN','NYCKEL_CLIENT_ID','NYCKEL_CLIENT_SECRET','BIRDNET_SPACE_URL','DISABLE_BIRD_GATE','BIRD_GATE_MIN_SCORE','MIN_SPECIES_SCORE'];
  const original = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const key of envKeys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  Object.assign(process.env, { HF_TOKEN: 'test-only', NYCKEL_CLIENT_ID: 'test', NYCKEL_CLIENT_SECRET: 'test', BIRDNET_SPACE_URL: 'https://birdnet.invalid', DISABLE_BIRD_GATE: '0', BIRD_GATE_MIN_SCORE: '0.3', MIN_SPECIES_SCORE: '0.35' });

  async function scenario(mediaType, responses) {
    const calls = [];
    const fetch = async (url, options) => {
      calls.push({ url, options });
      assert.ok(responses.length, `unexpected request: ${url}`);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return { ok: true, json: async () => next, text: async () => JSON.stringify(next) };
    };
    const mockedHandler = loadTs('api/analyze.js', { 'node-fetch': fetch }).default;
    const req = Readable.from([Buffer.from('test media')]);
    Object.assign(req, { method: 'POST', headers: { 'x-media-type': mediaType, 'content-type': `${mediaType}/${mediaType === 'image' ? 'jpeg' : 'wav'}` } });
    const res = { setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await mockedHandler(req, res);
    assert.equal(responses.length, 0);
    return { res, calls };
  }
  const birdGate = [{ label: 'sparrow', score: 0.95 }];
  let result = await scenario('image', [[{ label: 'tabby cat', score: 0.99 }]]);
  assert.equal(result.res.body.notBird, true);
  assert.equal(result.calls.length, 1);
  result = await scenario('image', [birdGate, [{ label: 'Passer montanus', score: 0.9 }]]);
  assert.equal(result.res.body.engine, 'huggingface');
  assert.equal(result.res.body.results[0].label, 'Passer montanus');
  result = await scenario('image', [birdGate, [{ label: 'Passer montanus', score: 0.1 }]]);
  assert.equal(result.res.body.notBird, true);
  result = await scenario('image', [birdGate, new Error('offline'), { access_token: 'test-token' }, { labelName: 'Passer montanus', confidence: 0.9 }]);
  assert.equal(result.res.body.engine, 'nyckel');
  const multipart = result.calls.at(-1).options;
  assert.match(multipart.headers['content-type'], /multipart\/form-data; boundary=/);
  assert.match(multipart.body.getBuffer().toString(), /name="data"; filename="bird.jpg"/);
  result = await scenario('audio', [new Error('offline'), { data: [{ confidences: [{ label: 'Passer montanus', confidence: 0.8 }] }] }]);
  assert.equal(result.res.body.engine, 'birdnetSpace');
  assert.match(result.calls.at(-1).options.body.getBuffer().toString(), /name="audio"; filename="clip.wav"/);
});
