#!/usr/bin/env node
/**
 * 最小可用 preflight（零第三方依賴）— 本 repo 的白名單／交付前靜態檢查。
 * 用法：node scripts/preflight.mjs [--json]
 * exit 1 = 有 FAIL。只做靜態檢查；唔代替真機驗收（見 A-GROUP-INSTRUCTION §5）。
 *
 * 檢查：版號三處一致、Vercel 發佈根目錄、入口檔／script 引用、storage key 白名單、
 *      零主站 Supabase 直連、真理倉 store_gate 原封不動、SG19 設定、SG18 掣。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');
const checks = [];
const add = (id, ok, detail) => checks.push({ id, ok: !!ok, detail: String(detail) });
const rel = (p) => path.join(ROOT, p);
const exists = (p) => existsSync(rel(p));
const read = (p) => exists(p) ? readFileSync(rel(p), 'utf8') : '';
const readDirSafe = (p) => exists(p) ? readdirSync(rel(p)) : [];
const readDirSize = (p) => readDirSafe(p).reduce((sum, f) => sum + statSync(rel(path.join(p, f))).size, 0);

const APP_KEY = 'birddex3';
const APP_SLUG = 'birddex3';
const gateFile = 'public/store_gate_v1.0.js';
// 真理倉 templates/vercel/store_gate_v1.0.js（SG1–SG19）sha256；改邏輯要重新審批。
const GATE_SHA256 = '45de189d68e9fbf64d560a4306987d1a03cd03f03e56dd24222a4343011e3d5b';
const ALLOWED_STORAGE_KEYS = new Set([
  'bd_collection_v3', 'bd_collection_v2', 'bd_profile_v1', 'bd_settings_v1',
  'bd_altart_v1', 'bd_last_zoom', 'pwa-dismissed-worker', `${APP_KEY}.store_pass`,
]);

const scanFiles = [];
function walk(dir) {
  if (!exists(dir)) return;
  for (const name of readdirSync(rel(dir))) {
    const p = path.join(dir, name);
    const st = statSync(rel(p));
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|mjs|cjs|html|json)$/.test(name)) scanFiles.push(p);
  }
}
for (const dir of ['src', 'public', 'api']) walk(dir);
scanFiles.push('index.html');

/* 1. 版號（docs/13 V1/V2） */
const pkg = JSON.parse(read('package.json') || '{}');
const version = String(pkg.version || '');
const runtime = /APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(read('src/version.ts'))?.[1] || '';
const meta = /<meta\s+name="app-version"\s+content="([^"]+)"/.exec(read('index.html'))?.[1] || '';
const title = /<title>[^<]*v([0-9]+\.[0-9]+\.[0-9]+)/.exec(read('index.html'))?.[1] || '';
add('version', version && version === runtime && version === meta && version === title,
  `package.json=${version} · version.ts=${runtime} · meta=${meta} · title=${title}`);

/* 2. Vercel 實際發佈根目錄：outputDirectory = dist，script 放 public/（Vite 抄去 dist/ 根） */
let vcfg = {};
try { vcfg = JSON.parse(read('vercel.json')); } catch { /* reported below */ }
add('vercel-root', vcfg.outputDirectory === 'dist' && /npm run build/.test(vcfg.buildCommand || '') &&
  /--include=dev/.test(vcfg.installCommand || '') && exists('index.html') && exists('public/manifest.json'),
  `outputDirectory=${vcfg.outputDirectory || '(missing)'} · buildCommand=${vcfg.buildCommand || '(missing)'} · installCommand=${vcfg.installCommand || '(missing)'}`);

/* 3. 入口檔同 script 引用 */
for (const f of ['index.html', 'public/manifest.json', 'src/main.tsx', 'src/lib/storage.ts', 'api/analyze.js']) {
  add(`file:${f}`, exists(f), exists(f) ? '存在' : '缺檔');
}
const html = read('index.html');
const charsetAt = html.search(/<meta\s+charset="UTF-8"/i);
const titleAt = html.indexOf('<title>');
add('charset', charsetAt >= 0 && charsetAt < titleAt, `charset@${charsetAt} · title@${titleAt}`);
for (const [, src] of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
  const target = src.startsWith('/')
    ? (exists(`public${src}`) || exists(`src${src}`) || exists(`.${src}`))
    : exists(src);
  add(`script:${src}`, target, target ? '引用到位' : '死連：檔案唔存在');
}

/* 4. 本機儲存 keys（唔准為咗白名單改 key／格式） */
const foundKeys = new Set();
for (const f of scanFiles) {
  for (const m of read(f).matchAll(/['"`](bd_[a-z0-9_]+|pwa-dismissed-worker|[a-z0-9-]+\.store_pass)['"`]/g)) {
    foundKeys.add(m[1]);
  }
}
const unknownKeys = [...foundKeys].filter((k) => !ALLOWED_STORAGE_KEYS.has(k));
add('storage-keys', unknownKeys.length === 0,
  unknownKeys.length ? `未登記 key：${unknownKeys.join(', ')}` : `已登記 ${foundKeys.size} 個 key：${[...foundKeys].sort().join(', ')}`);

/* 5. 零主站 Supabase 直連／零 bump RPC（SG18） */
let directDb = '';
for (const f of scanFiles) {
  // 真理倉閘門檔已用 sha256 釘死；佢嘅註解提到 bump RPC，唔當係本 app 直連。
  if (f === gateFile) continue;
  const hit = /bump_hearts|bump_stars|https:\/\/[a-z0-9.-]+\.supabase\.co|eyJ[A-Za-z0-9_-]{20,}/.exec(read(f));
  if (hit) directDb += `${f}:${hit[0]} `;
}
add('no-direct-supabase', !directDb, directDb || '無 anon key／Supabase URL／bump RPC');

/* 6. 真理倉 store_gate 原封不動（sha256 釘死）＋ SG19／SG18 靜態合約 */
const gateRel = gateFile;
if (!exists(gateRel)) {
  add('store-gate', false, '未接入白名單：public/store_gate_v1.0.js 唔存在（C 階段未完成）');
} else {
  const sha = createHash('sha256').update(readFileSync(rel(gateRel))).digest('hex');
  add('store-gate-hash', sha === GATE_SHA256, `sha256=${sha}`);
  const scriptAt = html.indexOf('<script src="/store_gate_v1.0.js"></script>');
  add('store-gate-script', charsetAt < scriptAt && scriptAt < titleAt,
    `charset@${charsetAt} < gate@${scriptAt} < title@${titleAt}`);
  const init = html.slice(Math.max(0, scriptAt), scriptAt + 1200);
  const required = [
    `appKey: '${APP_KEY}'`, "mode: IS_PRODUCTION ? 'entry-gate' : 'open'", "portalIds: ['appstore']",
    "silentPortalIds: ['library']", 'allowStandalone: true', 'autoRedirectSeconds: 0',
  ];
  const missing = required.filter((s) => !init.includes(s));
  add('sg19-config', missing.length === 0, missing.length ? `缺：${missing.join(' | ')}` : required.join(' · '));
  const forbidden = /supportNudge\s*:|portalIds\s*:\s*\[[^\]]*['"](member|district|gemini|library)['"]/.test(init);
  add('sg19-forbidden', !forbidden,
    forbidden ? 'supportNudge／library 掣／member|district|gemini 不應出現' : '無 supportNudge／額外 portalId');
  add('sg19-github', init.includes("allowedOrigins: ['https://github.com']"),
    'GitHub repo 頁可直入檢查未上架 App（只做額外放行來源，唔出掣）');
  add('sg19-preview', html.includes('vercel') &&
    html.includes("mode: IS_PRODUCTION ? 'entry-gate' : 'open'"),
    '非 Vercel 預覽一律 open；正式 vercel.app 維持 entry-gate');
  const button = read('src/components/StoreSupportButton.tsx');
  const css = read('src/index.css');
  add('sg18-button',
    /id="storeSupportTop"/.test(button) &&
    new RegExp(`getAppStoreUrl\\('${APP_SLUG}'\\)`).test(button) &&
    /target="_blank"/.test(button) && /rel="noopener"/.test(button) &&
    /\.support-btn\[hidden\]\{display:none\}/.test(css) &&
    /\[hidden\]\{display:none\}/.test(css) &&
    /@media print/.test(css) && css.includes('#storeSupportTop'),
    '頂欄 #storeSupportTop ＋ getAppStoreUrl(slug) ＋ [hidden]{display:none} ＋ print 隱藏');
}

/* 7. 去寶可夢化：UI 文案同圖示（內部檔名／key 唔郁） */
const uiFiles = ['index.html', 'public/manifest.json', 'src/data/birds.json',
  ...scanFiles.filter((f) => f.startsWith('src/'))];
const pokemonWords = /精靈球|鳥精靈|訓練師|捕捉|GOTCHA!/;
const hits = uiFiles.filter((f) => pokemonWords.test(read(f)));
add('depokemon-copy', hits.length === 0,
  hits.length ? `仍有舊詞：${hits.join(', ')}` : 'UI／描述用「拍攝、拍到、觀鳥員、鳥卡」');
const iconSrc = read('scripts/gen-icons.py') + read('public/favicon.svg');
add('depokemon-icon', /雙筒望遠鏡/.test(iconSrc) &&
  exists('public/icon-512.png') && exists('public/icon-192.png') && exists('public/favicon.ico'),
'雙筒望遠鏡圖示＋PNG/ICO 資產存在');

/* 8. 對卡特徵：答 2 條即出候選，第 3 題問身形（外形），答錯一格唔會踢走正解 */
const quizUi = read('src/components/QuizScreen.tsx');
const quizLib = read('src/lib/birdFilter.ts');
const quizTraits = read('src/data/quizTraits.ts');
add('quiz-answers', quizUi.includes('答幾條，對返你張相') &&
  quizUi.includes('candidateResult') &&
  /MIN_ANSWERS\s*=\s*2/.test(quizLib) &&
  /INITIAL_PAGE\s*=\s*12/.test(quizLib) &&
  /MAX_CANDIDATES\s*=\s*120/.test(quizLib) &&
  quizUi.includes('SHAPE_OPTIONS') && /SHAPE_OPTIONS\s*=\s*\[/.test(quizTraits) &&
  quizUi.includes('成隻雀個身形係點？'),
'對卡特徵 · 答 2 條即出候選 · 第 3 題問身形（外形） · 首頁 12 張、上限 120');

/* 9. 專屬 ICON：進化／頭像／標誌全部 AI 貼紙，SVG 只做 fallback，唔用 emoji */
const profileUi = read('src/components/ProfileScreen.tsx');
add('custom-icons', exists('src/components/EvolutionIcon.tsx') &&
  exists('src/components/PlayerAvatarIcon.tsx') &&
  profileUi.includes('<EvolutionArt') && profileUi.includes('<AvatarArt') &&
  exists('public/app-logo.avif') && exists('public/badge-frame.avif') &&
  exists('src/components/AvatarArt.tsx') &&
  read('src/components/DexScreen.tsx').includes('<AppLogo') &&
  read('src/components/TrainerTierBadge.tsx').includes('/evolution/level-') &&
  !profileUi.includes('{stage.emoji}') && !/\bemoji:/.test(profileUi),
'App logo／金牌框／進化圖用 AI 貼紙 AVIF，無emoji');

const evolutionArt = readDirSafe('public/evolution').filter((f) => f.endsWith('.avif'));
add('evolution-art-avif', evolutionArt.length === 12,
  `12 級 AI 貼紙 AVIF：${evolutionArt.length}/12 · ${Math.round(readDirSize('public/evolution') / 1024)} KB`);
const avatarArt = readDirSafe('public').filter((f) => /^avatar-.*\.avif$/.test(f));
const levelBadges = readDirSafe('public/badges').filter((f) => f.endsWith('.avif'));
add('avatar-art-avif', avatarArt.length === 7 && levelBadges.length === 12 &&
  read('src/components/ProfileScreen.tsx').includes('上傳自己的照片') &&
  read('src/components/AvatarArt.tsx').includes('customAvatar'),
  `7 個 AI 頭像＋12 級標誌＋用戶照片上傳：${avatarArt.length}/7`);

/* 10. 離線圖卡：Cache Storage + SW runtimeCaching，唔新增 localStorage key */
add('offline-cards', exists('src/lib/offlineCards.ts') &&
  profileUi.includes('下載離線圖卡') &&
  read('vite.config.ts').includes('bd-birdcards-v1') &&
  /caches\.open\(OFFLINE_CARDS_CACHE\)/.test(read('src/lib/offlineCards.ts')),
'離線圖卡預載 · Cache Storage 快取 R2 鳥卡');

const failed = checks.filter((c) => !c.ok);
const result = { tool: 'preflight', repo: 'birddex3', ok: failed.length === 0,
  counts: { pass: checks.length - failed.length, fail: failed.length }, checks };
if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.id.padEnd(24)} ${c.detail}`);
  console.log(result.ok ? `\n✅ PREFLIGHT PASS — ${checks.length}/${checks.length}` :
    `\n❌ PREFLIGHT FAIL — ${failed.length} 項未過`);
}
process.exit(result.ok ? 0 : 1);
