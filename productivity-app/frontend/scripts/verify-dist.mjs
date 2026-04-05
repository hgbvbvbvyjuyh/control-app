/**
 * Fails the build if dist/ is incomplete (missing index, broken asset references, empty files).
 * Run after `vite build` (see package.json postbuild).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');

function fail(msg) {
  console.error('[verify-dist] FAILED:', msg);
  process.exit(1);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  fail('dist/index.html is missing');
}

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

const scriptSrc = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/gi)].map((m) => m[1]);
const linkHref = [...html.matchAll(/<link[^>]*\shref=["']([^"']+)["']/gi)].map((m) => m[1]);

const isLocal = (u) =>
  u &&
  !u.startsWith('http://') &&
  !u.startsWith('https://') &&
  !u.startsWith('//') &&
  !u.startsWith('data:') &&
  !u.startsWith('mailto:');

for (const ref of [...scriptSrc, ...linkHref].filter(isLocal)) {
  const normalized = ref.replace(/^\.\//, '');
  const full = path.join(dist, normalized);
  if (!fs.existsSync(full)) {
    fail(`referenced asset missing on disk: "${ref}" (expected ${full})`);
  }
  const st = fs.statSync(full);
  if (!st.isFile()) {
    fail(`referenced path is not a file: "${ref}"`);
  }
  if (st.size < 64) {
    fail(`referenced file too small (${st.size} bytes), likely corrupt: "${ref}"`);
  }
}

const jsEntries = scriptSrc.filter((s) => s.includes('.js'));
if (jsEntries.length === 0) {
  fail('no module script src="*.js" in dist/index.html');
}

const cssLinked = linkHref.filter((h) => h.endsWith('.css'));
const assetsDir = path.join(dist, 'assets');
const cssOnDisk =
  fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).some((f) => f.endsWith('.css'));

if (cssLinked.length === 0 && !cssOnDisk) {
  fail('no stylesheet link and no .css under dist/assets');
}

console.log('[verify-dist] OK');
