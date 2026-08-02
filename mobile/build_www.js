#!/usr/bin/env node
/* Build skript za mobile/{garage,driver}/www/
   Kopira PWA source (../{garage,driver}) + core/ deljene module u www/,
   pa Capacitor moze da uzme ceo webDir pri sync-u.

   Run:
     node mobile/build_www.js garage
     node mobile/build_www.js driver
     node mobile/build_www.js all
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');   // autouniverse/
const MOBILE = __dirname;                      // autouniverse/mobile/

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { rimraf(p); fs.rmdirSync(p); }
    else fs.unlinkSync(p);
  }
}

function copyDir(src, dst, opts = {}) {
  const skip = opts.skip || [];
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d, opts);
    else fs.copyFileSync(s, d);
  }
}

function buildApp(name) {
  const appSrc = path.join(ROOT, name);
  const coreSrc = path.join(ROOT, 'core');
  const wwwDst = path.join(MOBILE, name, 'www');

  if (!fs.existsSync(appSrc)) throw new Error('Nema PWA foldera: ' + appSrc);
  if (!fs.existsSync(coreSrc)) throw new Error('Nema core/ foldera: ' + coreSrc);

  console.log(`[${name}] cistim ${wwwDst}...`);
  rimraf(wwwDst);
  fs.mkdirSync(wwwDst, { recursive: true });

  console.log(`[${name}] kopiram ${name}/ -> www/`);
  copyDir(appSrc, wwwDst, { skip: ['node_modules', '.git', 'sw.js'] });
  // sw.js se ne treba u APK-u (Capacitor koristi WebView, ne SW)

  console.log(`[${name}] kopiram core/ -> www/core/`);
  copyDir(coreSrc, path.join(wwwDst, 'core'), { skip: ['node_modules', '.git'] });

  // Popravka relativnih putanja: garage/driver koriste "../core/*"; sad su
  // u www/ pa treba "./core/*". Kratki fix: menjam index.html reference.
  const indexPath = path.join(wwwDst, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    const before = html;
    html = html.replace(/(["'])\.\.\/core\//g, '$1./core/');
    if (html !== before) {
      fs.writeFileSync(indexPath, html);
      console.log(`[${name}] index.html: relativne putanje ../core/ -> ./core/`);
    }
  }

  console.log(`[${name}] gotovo.\n`);
}

const arg = process.argv[2];
if (!arg || arg === 'all') {
  buildApp('garage');
  buildApp('driver');
} else {
  buildApp(arg);
}
