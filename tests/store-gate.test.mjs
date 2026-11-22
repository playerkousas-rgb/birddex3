import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...segs) => readFileSync(path.join(ROOT, ...segs), 'utf8');
const cjs = { exports: {} };
vm.runInNewContext(read('public', 'store_gate_v1.0.js'), {
  URL,
  module: cjs,
  exports: cjs.exports,
});
const gate = cjs.exports;

/** 極簡 DOM mock（零依賴，驗開 APP 時白名單／關站對話框與背景隱藏） */
function makeMockEnv({
  referrer = '',
  inIframe = false,
  standalone = false,
  navigatorStandalone = false,
  storageThrows = false,
  lang = 'zh-HK',
  dataLang = '',
  selfOrigin = 'https://scoutbook-five.vercel.app',
} = {}) {
  const store = new Map();
  const makeElement = (tag) => {
    const attrs = new Map();
    const el = {
      tagName: String(tag).toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      href: '',
      target: '',
      rel: '',
      children: [],
      get firstChild() {
        return this.children[0] || null;
      },
      setAttribute(k, v) {
        attrs.set(k, String(v));
        if (k === 'id') this.id = String(v);
      },
      getAttribute(k) {
        return attrs.has(k) ? attrs.get(k) : null;
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx >= 0) this.children.splice(idx, 1);
        return child;
      },
    };
    return el;
  };

  const html = makeElement('html');
  if (lang) html.setAttribute('lang', lang);
  if (dataLang) html.setAttribute('data-lang', dataLang);
  const head = makeElement('head');
  const body = makeElement('body');
  html.appendChild(head);
  html.appendChild(body);

  const findById = (node, id) => {
    if (node.id === id) return node;
    for (const ch of node.children) {
      const hit = findById(ch, id);
      if (hit) return hit;
    }
    return null;
  };

  const doc = {
    referrer,
    documentElement: html,
    head,
    body,
    createElement: makeElement,
    getElementById(id) {
      return findById(html, id);
    },
    addEventListener() {},
  };

  const timers = [];
  const win = {
    document: doc,
    navigator: { standalone: navigatorStandalone, serviceWorker: { ready: true } },
    matchMedia(q) {
      return { matches: q === '(display-mode: standalone)' && standalone };
    },
    localStorage: {
      getItem(k) {
        if (storageThrows) throw new Error('SecurityError: storage disabled');
        return store.has(k) ? store.get(k) : null;
      },
      setItem(k, v) {
        if (storageThrows) throw new Error('SecurityError: storage disabled');
        store.set(k, String(v));
      },
    },
    sessionStorage: {
      getItem(k) {
        if (storageThrows) throw new Error('SecurityError: storage disabled');
        return store.has(k) ? store.get(k) : null;
      },
      setItem(k, v) {
        if (storageThrows) throw new Error('SecurityError: storage disabled');
        store.set(k, String(v));
      },
    },
    location: {
      origin: selfOrigin,
      replacedWith: null,
      replace(u) {
        this.replacedWith = u;
      },
    },
    setTimeout(fn, ms) {
      timers.push({ fn, ms });
      return timers.length;
    },
  };
  win.self = win;
  win.top = inIframe ? { location: win.location } : win;

  return { win, doc, store, timers };
}


/* ────────────────────────────────────────────────────────────────
 * birddex3 白名單合約（SG1–SG19）：本機模擬，唔代表真機驗收。
 * ──────────────────────────────────────────────────────────────── */

const OPTS = {
  appKey: 'birddex3',
  mode: 'entry-gate',
  portalIds: ['appstore'],
  silentPortalIds: ['library'],
  allowStandalone: true,
  autoRedirectSeconds: 0,
};

test('SG0：閘門檔同真理倉 pin 一致（sha256 原封不動）', () => {
  const bytes = readFileSync(path.join(ROOT, 'public', 'store_gate_v1.0.js'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '45de189d68e9fbf64d560a4306987d1a03cd03f03e56dd24222a4343011e3d5b');
  assert.equal(gate.VERSION, 'v1.0');
});

test('SG19：index.html 只掛 appstore 掣；library 靜默放行；supportNudge 關', () => {
  const html = read('index.html');
  for (const kw of ["appKey: 'birddex3'", "mode: IS_PRODUCTION ? 'entry-gate' : 'open'", "portalIds: ['appstore']",
    "silentPortalIds: ['library']", 'allowStandalone: true', 'autoRedirectSeconds: 0']) {
    assert.ok(html.includes(kw), `缺 ${kw}`);
  }
  assert.ok(!/supportNudge\s*:/.test(html), 'supportNudge 唔准開');
  const scriptAt = html.indexOf('<script src="/store_gate_v1.0.js"></script>');
  assert.ok(scriptAt > html.indexOf('<meta charset="UTF-8"') && scriptAt < html.indexOf('<title>'));
});

test('SG3/SG19：直接打網址 → 攔截卡只有 1 粒 APP STORE 掣、簡短文案、無倒數', () => {
  const { win, doc } = makeMockEnv({ referrer: '' });
  const res = gate.initStoreGate(OPTS, win);
  assert.equal(res.allowed, false);
  assert.equal(res.reason, 'missing-whitelist-entry');
  assert.equal(doc.documentElement.getAttribute('data-store-gated'), 'missing-whitelist-entry');
  const box = doc.getElementById('scoutStoreGate');
  assert.ok(box, '攔截卡要出現，唔好白屏／404');
  const texts = box.children.map(c => c.textContent).join(' | ');
  assert.match(texts, /需經由 SCOUT APP STORE 開啟/);
  assert.match(texts, /請按下方按鈕前往 APP STORE 開啟/);
  const actions = box.children.find(c => c.className === 'sg-actions');
  const links = actions.children.filter(c => c.tagName === 'A');
  assert.equal(links.length, 1, '只准 1 粒掣（library 已 silent）');
  assert.equal(links[0].href, 'https://scoutappstore.vercel.app/');
  assert.equal(links[0].target, '_top');
  assert.equal(links[0].textContent, '前往 APP STORE', '單掣要去掉 1. 編號');
  assert.ok(!texts.includes('圖書館'), ' silent library 唔可以出成掣');
  assert.ok(!texts.includes('秒後'), 'autoRedirectSeconds=0 唔准倒數');
  assert.match(doc.getElementById('scoutStoreGateStyle').textContent,
    /body > :not\(#scoutStoreGate\)\s*\{\s*display:\s*none\s*!important/);
});

test('SG19：APP STORE 進入放行，sessionStorage 保 F5；matchedPortalId=appstore', () => {
  const env = makeMockEnv({ referrer: 'https://scoutappstore.vercel.app/apps' });
  const res = gate.initStoreGate(OPTS, env.win);
  assert.equal(res.allowed, true);
  assert.equal(res.reason, 'referrer-whitelist');
  assert.equal(res.matchedPortalId, 'appstore');
  assert.equal(env.store.get('birddex3.store_pass'), '1');
  env.doc.referrer = '';
  assert.equal(gate.initStoreGate(OPTS, env.win).reason, 'session-pass');
});

test('SG19：圖書館進入照樣放行並報 matchedPortalId=library，但唔出掣', () => {
  const lib = makeMockEnv({ referrer: 'https://scout-circulars.vercel.app/tools' });
  const res = gate.initStoreGate(OPTS, lib.win);
  assert.equal(res.allowed, true);
  assert.equal(res.matchedPortalId, 'library');
  assert.equal(lib.doc.getElementById('scoutStoreGate'), null);
});

test('SG5：主畫面直開放行；偽造 Referer／額外 portalId 照擋', () => {
  assert.equal(gate.initStoreGate(OPTS, makeMockEnv({ standalone: true }).win).allowed, true);
  assert.equal(gate.initStoreGate(OPTS, makeMockEnv({ navigatorStandalone: true }).win).allowed, true);
  for (const ref of [
    'https://scoutappstore.vercel.app.evil.com/',
    'https://evil.com/?from=https://scoutappstore.vercel.app',
    'http://scoutappstore.vercel.app/',
  ]) {
    assert.equal(gate.initStoreGate(OPTS, makeMockEnv({ referrer: ref }).win).allowed, false, ref);
  }
  const extra = gate.portalsFromIds(['appstore', 'library', 'member', 'district', 'gemini']).map(p => p.id);
  assert.equal(JSON.stringify(extra.sort()), JSON.stringify(['appstore', 'district', 'gemini', 'library', 'member']));
});

test('SG18：getAppStoreUrl 用 slug 組主站詳情卡，唔寫死喺 app 碼', () => {
  assert.equal(gate.getAppStoreUrl('birddex3'), 'https://scoutappstore.vercel.app/?app=birddex3');
  const btn = read('src/components/StoreSupportButton.tsx');
  assert.match(btn, /id="storeSupportTop"/);
  assert.match(btn, /getAppStoreUrl\('birddex3'\)/);
  assert.match(btn, /target="_blank"/);
  assert.match(btn, /rel="noopener"/);
  assert.match(btn, /hidden/);
  const css = read('src/index.css');
  assert.match(css, /\[hidden\]\{display:none\}/);
  assert.match(css, /\.support-btn\[hidden\]\{display:none\}/);
  assert.match(css, /@media print[\s\S]*#storeSupportTop/);
  assert.match(css, /@media \(max-width: 559px\)[\s\S]*\.support-btn-label \{ display: none; \}/);
  const dex = read('src/components/DexScreen.tsx');
  assert.match(dex, /pr-12 min-\[560px\]:pr-\[150px\]/, '圖鑑 header 為右上角固定讚好掣預留空間');
  const profile = read('src/components/ProfileScreen.tsx');
  assert.match(profile, /https:\/\/github\.com\/playerkousas-rgb\/birddex3\/issues\/new/);
  assert.match(profile, /<StoreSupportButton variant="profile" \/>/);
  assert.match(read('src/App.tsx'), /view !== 'profile' && <StoreSupportButton \/>/,
    '觀鳥員頁改用頁尾讚好入口，避免浮動掣遮住右上方形象圖');
  for (const f of ['src/App.tsx', 'src/components/StoreSupportButton.tsx', 'index.html']) {
    const txt = read(f);
    assert.ok(!/bump_hearts|bump_stars|supabase\.co/.test(txt), `${f} 唔准直連主站 Supabase`);
  }
});

test('SG19：GitHub allowedOrigins 放行未上架檢查，但攔截卡仍只得 1 粒掣', () => {
  const cfg = { ...OPTS, allowedOrigins: ['https://github.com'] };
  const gh = makeMockEnv({ referrer: 'https://github.com/playerkousas-rgb/birddex3' });
  const res = gate.initStoreGate(cfg, gh.win);
  assert.equal(res.allowed, true);
  assert.equal(res.matchedPortalId, '', 'GitHub 唔係官方 portal，只係額外放行來源');
  assert.equal(gh.doc.getElementById('scoutStoreGate'), null);

  const direct = makeMockEnv({ referrer: '' });
  gate.initStoreGate(cfg, direct.win);
  const box = direct.doc.getElementById('scoutStoreGate');
  const actions = box.children.find(c => c.className === 'sg-actions');
  assert.equal(actions.children.length, 1, 'GitHub 只做 silent 放行，唔可以出成第二粒掣');
  assert.ok(!box.children.map(c => c.textContent).join(' ').includes('GitHub'));
  assert.ok(read('index.html').includes("'https://github.com'"));
});

test('預覽一律 open，唔使靠 origin 比對；正式 Vercel 仍係 entry-gate', () => {
  const html = read('index.html');
  assert.ok(html.includes("var IS_PRODUCTION = /(^|\\.)vercel\\.app$/.test(location.hostname);"));
  assert.ok(html.includes("mode: IS_PRODUCTION ? 'entry-gate' : 'open'"));

  // 任何 preview 環境落 open → 一定放行，唔會出 APP STORE 攔截卡
  const preview = gate.evaluateStoreGate({ ...OPTS, mode: 'open' }, { selfOrigin: 'https://3000-abc.e2b.app' });
  assert.equal(preview.allowed, true);
  assert.equal(preview.reason, 'open');

  // 正式域名對應嘅 entry-gate 仍要白名單 referrer
  const prod = gate.evaluateStoreGate({ ...OPTS, allowedOrigins: ['https://github.com'] },
    { selfOrigin: 'https://birddex3.vercel.app' });
  assert.equal(prod.allowed, false);
  const gh = gate.evaluateStoreGate({ ...OPTS, allowedOrigins: ['https://github.com'] },
    { referrer: 'https://github.com/playerkousas-rgb/birddex3' });
  assert.equal(gh.allowed, true);
});
