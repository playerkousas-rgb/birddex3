import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTs } from './load-ts.mjs';

const copyright = loadTs('src/lib/copyright.ts');

test('Scout System copyright is consistent across metadata and project notices', () => {
  assert.equal(copyright.COPYRIGHT_OWNER, 'Scout System');
  assert.equal(copyright.COPYRIGHT_SHORT, `© ${copyright.COPYRIGHT_YEAR} Scout System`);
  const html = readFileSync('index.html', 'utf8');
  assert.ok(html.includes(`<meta name="author" content="${copyright.COPYRIGHT_OWNER}" />`));
  assert.ok(html.includes(`<meta name="copyright" content="${copyright.COPYRIGHT_FULL}" />`));
  for (const path of ['COPYRIGHT.md', 'README.md']) {
    assert.ok(readFileSync(path, 'utf8').includes(copyright.COPYRIGHT_FULL), path);
  }
});

test('profile and downloadable trainer card use the shared copyright strings', () => {
  const profile = readFileSync('src/components/ProfileScreen.tsx', 'utf8');
  assert.match(profile, /import \{ COPYRIGHT_FULL, COPYRIGHT_SHORT \} from '\.\.\/lib\/copyright'/);
  assert.ok(profile.includes('{COPYRIGHT_FULL}'));
  const cardStart = profile.indexOf('ref={shareCardRef}');
  const cardEnd = profile.indexOf('onClick={doShareCardImage}', cardStart);
  assert.ok(cardStart >= 0 && cardEnd > cardStart);
  assert.ok(profile.slice(cardStart, cardEnd).includes('{COPYRIGHT_SHORT}'));
});
