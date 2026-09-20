import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, truncate } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDeployment, budgets } from '../scripts/check-deployment.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'birddex-budget-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'dist');
  const publicDir = join(root, 'public');
  await mkdir(output); await mkdir(publicDir);
  for (const file of ['favicon.svg', 'manifest.json', 'sw.js', 'registerSW.js']) await writeFile(join(output, file), '');
  await writeFile(join(output, 'index.html'), '<link rel="manifest" href="/manifest.json">');
  return { output, publicDir };
}

test('deployment guard accepts minimal output and rejects leaked source maps/backups', async t => {
  const { output, publicDir } = await fixture(t);
  assert.equal((await checkDeployment(output, publicDir)).files, 5);
  for (const name of ['app.js.map', 'draft.bak', 'notes.bak.1', 'notes.bak2', 'draft.tmp1', 'debug.log']) {
    await writeFile(join(output, name), 'test');
    await assert.rejects(checkDeployment(output, publicDir), /leaked/);
    await rm(join(output, name));
  }
});

test('deployment guard rejects oversized assets and public folder growth', async t => {
  const { output, publicDir } = await fixture(t);
  const file = join(output, 'huge.png');
  await writeFile(file, ''); await truncate(file, budgets.asset + 1);
  await assert.rejects(checkDeployment(output, publicDir), /exceeds/);
  await rm(file);
  const publicFile = join(publicDir, 'photo.png');
  await writeFile(publicFile, ''); await truncate(publicFile, budgets.public + 1);
  await assert.rejects(checkDeployment(output, publicDir), /public:.*exceeds/);
});

test('deployment guard rejects duplicate manifest links and missing SW', async t => {
  const { output, publicDir } = await fixture(t);
  await writeFile(join(output, 'index.html'), '<link rel="manifest" href="/manifest.json"><link rel="manifest" href="/manifest.webmanifest">');
  await assert.rejects(checkDeployment(output, publicDir), /exactly one/);
  await rm(join(output, 'sw.js'));
  await assert.rejects(checkDeployment(output, publicDir), /missing required/);
});

test('deployment guard enforces total output budget and the narrow WASM exception', async t => {
  const { output, publicDir } = await fixture(t);
  const wasm = join(output, 'ort-wasm-simd-threaded.jsep-test.wasm');
  await writeFile(wasm, ''); await truncate(wasm, budgets.wasm);
  await checkDeployment(output, publicDir);
  for (let i = 0; i < 2; i++) {
    const file = join(output, `chunk-${i}.js`);
    await writeFile(file, ''); await truncate(file, budgets.asset);
  }
  await assert.rejects(checkDeployment(output, publicDir), /dist:.*exceeds/);
  await truncate(wasm, budgets.wasm + 1);
  await assert.rejects(checkDeployment(output, publicDir), /wasm:.*exceeds/);
});
