import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './load-ts.mjs';

// Small deterministic hook lifecycle harness. Browser smoke tests cover the real React renderer.
function harness(load) {
  const state = [], refs = [], effects = [];
  let s = 0, r = 0;
  const react = {
    useState(initial) {
      const index = s++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
    useRef(initial) { const index = r++; return refs[index] ??= { current: initial }; },
    useEffect(effect) { effects.push(effect); },
  };
  const { useLiveBirdDetector } = loadTs('src/lib/liveDetect.ts', {
    react, '@tensorflow-models/coco-ssd': { load }, '@tensorflow/tfjs': {},
  });
  return {
    state, effects,
    render(video = null, enabled = false) { s = 0; r = 0; effects.length = 0; return useLiveBirdDetector(video, enabled); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('model download failure stops loading without an unhandled rejection', async () => {
  const hook = harness(async () => { throw new Error('offline'); });
  hook.render();
  const cleanup = hook.effects[0]();
  await flush();
  const result = hook.render();
  assert.equal(result.loading, false);
  assert.equal(result.ready, false);
  cleanup();
});

test('models are disposed on unmount, including downloads completing after unmount', async () => {
  for (const late of [false, true]) {
    let resolve, disposed = 0;
    const hook = harness(() => new Promise(done => { resolve = done; }));
    hook.render();
    const cleanup = hook.effects[0]();
    if (late) cleanup();
    resolve({ dispose() { disposed++; } });
    await flush();
    if (!late) { assert.equal(hook.render().ready, true); cleanup(); }
    assert.equal(disposed, 1);
    assert.equal(hook.render().ready, false);
  }
});

test('slow detection never overlaps and cannot publish boxes after disable/unmount', async t => {
  let nextFrame, resolveDetection, detections = 0, now = 1000;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = callback => { nextFrame = callback; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  t.mock.method(performance, 'now', () => now);
  t.after(() => {
    if (previousRaf) globalThis.requestAnimationFrame = previousRaf; else delete globalThis.requestAnimationFrame;
    if (previousCancel) globalThis.cancelAnimationFrame = previousCancel; else delete globalThis.cancelAnimationFrame;
  });
  const hook = harness(async () => ({
    dispose() {},
    detect() { detections++; return new Promise(resolve => { resolveDetection = resolve; }); },
  }));
  hook.render();
  const cleanupModel = hook.effects[0]();
  await flush();
  hook.render({ readyState: 2, videoWidth: 100, videoHeight: 100 }, true);
  const cleanupDetection = hook.effects[1]();
  const first = nextFrame();
  now += 500;
  await nextFrame();
  assert.equal(detections, 1);
  cleanupDetection();
  resolveDetection([{ class: 'bird', score: 0.9, bbox: [0,0,50,50] }]);
  await first;
  assert.deepEqual(hook.state[0], []);
  cleanupModel();
});
