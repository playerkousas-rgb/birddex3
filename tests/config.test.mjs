import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const json = path => JSON.parse(readFileSync(path, 'utf8'));

test('Vercel uses the guarded source build and publishes only dist', () => {
  const vercel = json('vercel.json');
  const pkg = json('package.json');
  assert.equal(vercel.framework, 'vite');
  assert.equal(vercel.outputDirectory, 'dist');
  assert.equal(vercel.buildCommand, 'npm run build');
  assert.match(vercel.installCommand, /npm ci --include=dev/);
  assert.match(pkg.scripts.build, /node scripts\/check-deployment\.mjs/);
  for (const name of ['vite','typescript','tailwindcss','postcss','autoprefixer','eslint','vite-plugin-pwa']) {
    assert.ok(pkg.devDependencies[name], `${name} must remain a devDependency`);
    assert.equal(pkg.dependencies[name], undefined);
  }
  for (const name of ['@imgly/background-removal','@tensorflow/tfjs','@tensorflow-models/coco-ssd','form-data','node-fetch']) {
    assert.ok(pkg.dependencies[name], `required feature dependency missing: ${name}`);
  }
});

test('PWA keeps v3 identity and ships actual 192/512 PNG install icons', () => {
  const manifest = json('public/manifest.json');
  assert.match(manifest.name, /BIRD-DEX 3/);
  for (const size of [192, 512]) {
    const src = `/icon-${size}.png`;
    assert.ok(manifest.icons.some(icon => icon.src === src && icon.sizes === `${size}x${size}` && icon.type === 'image/png'));
    const png = readFileSync(`public${src}`);
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16),size);
    assert.equal(png.readUInt32BE(20),size);
  }
  // 圖標全家福：favicon.ico(16+32) / apple-touch 180 / 192 / 512 全部要係真 PNG（scripts/gen-icons.py 產出）
  for (const [file, size] of [['favicon.ico', 32], ['icon-180.png', 180], ['icon-32.png', 32], ['icon-16.png', 16]]) {
    const buf = readFileSync(`public/${file}`);
    assert.ok(buf.length > 0, file);
    if (file.endsWith('.png')) {
      assert.equal(buf.subarray(1, 4).toString(), 'PNG', file);
      assert.equal(buf.readUInt32BE(16), size, file);
    } else {
      assert.equal(buf.readUInt16LE(2), 1, 'ICO type'); // PNG-in-ICO
    }
  }
  const html = readFileSync('index.html','utf8');
  assert.match(html, /rel="apple-touch-icon" href="\/icon-180.png"/);
  assert.match(html, /rel="icon" href="\/favicon.ico"/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1\.0/);
});
