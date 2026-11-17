import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

// 真理倉 docs/13 V2：內文版號三處同步 — package.json ↔ index.html meta ↔ runtime 常數。
// Vite SPA 冇「檔名版號」，以 meta + title + 頁尾代替「檔名」位。
test('V: package.json / index.html / runtime constant stay on one version', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const html = readFileSync('index.html', 'utf8');
  const { APP_VERSION } = loadTs('src/version.ts');
  const meta = html.match(/<meta name="app-version" content="([^"]+)"\s*\/?>/);
  assert.ok(meta, 'index.html must carry <meta name="app-version">');
  assert.equal(meta[1], pkg.version, 'meta app-version must equal package.json version');
  assert.equal(APP_VERSION, pkg.version, 'src/version.ts must equal package.json version');
  assert.ok(html.includes(`<title>BIRD-DEX 3 v${pkg.version}`), 'title carries version');
  // 用家可見版號（V2 ⑤）
  const profile = readFileSync('src/components/ProfileScreen.tsx', 'utf8');
  assert.ok(profile.includes('v{APP_VERSION}'), 'visible footer shows version');
});
