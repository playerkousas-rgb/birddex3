/** Zero-dependency deployment guard. Budgets cover raw file bytes, not gzip. */
import { readdir, stat, readFile } from 'node:fs/promises';
import { resolve, relative, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const MiB = 1024 * 1024;
export const budgets = { output: 30 * MiB, public: 512 * 1024, asset: 4 * MiB, wasm: 24 * MiB };
const forbidden = /(^|\/)(node_modules|\.git|\.vercel|\.cache|\.vite|uploads|coverage|reference_data)(\/|$)|\.(map|tsbuildinfo)$|\.(bak|tmp|old|log)[^/]*$/i;

export async function listFiles(root) {
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Deployment must not contain symlinks: ${path}`);
      if (entry.isDirectory()) await visit(path);
      else files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: (await stat(path)).size });
    }
  }
  await visit(resolve(root));
  return files;
}

export async function checkDeployment(outputDir = 'dist', publicDir = 'public') {
  const output = await listFiles(outputDir);
  const publicFiles = await listFiles(publicDir);
  const total = files => files.reduce((sum, file) => sum + file.bytes, 0);
  const errors = [];
  for (const [label, files, budget] of [['dist', output, budgets.output], ['public', publicFiles, budgets.public]]) {
    if (total(files) > budget) errors.push(`${label}: ${total(files)} bytes exceeds ${budget}`);
    for (const file of files) {
      if (forbidden.test(file.path)) errors.push(`${label}/${file.path}: development/backup file leaked`);
      // Required by the existing sticker feature. Do not whitelist arbitrary large WASM files.
      const isStickerRuntime = label === 'dist' && /^ort-wasm-simd-threaded\.jsep-[\w-]+\.wasm$/.test(basename(file.path));
      const limit = isStickerRuntime ? budgets.wasm : budgets.asset;
      if (file.bytes > limit) errors.push(`${label}/${file.path}: ${file.bytes} bytes exceeds ${limit}`);
    }
  }
  for (const required of ['index.html', 'favicon.svg', 'manifest.json', 'sw.js', 'registerSW.js']) {
    if (!output.some(file => file.path === required)) errors.push(`dist/${required}: missing required application/PWA asset`);
  }
  const html = await readFile(resolve(outputDir, 'index.html'), 'utf8');
  const manifestLinks = html.match(/<link\b[^>]*\brel=["']manifest["'][^>]*>/g) ?? [];
  if (manifestLinks.length !== 1 || !manifestLinks[0].includes('/manifest.json')) {
    errors.push('dist/index.html must reference exactly one canonical /manifest.json');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { outputBytes: total(output), publicBytes: total(publicFiles), files: output.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await checkDeployment();
    console.log(`Deployment budget OK: ${result.files} files; dist ${result.outputBytes} bytes / ${budgets.output}; public ${result.publicBytes} bytes / ${budgets.public}`);
  } catch (error) {
    console.error(`Deployment budget FAILED:\n${error.message}`);
    process.exitCode = 1;
  }
}
