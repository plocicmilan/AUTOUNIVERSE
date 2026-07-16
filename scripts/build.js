/* ============================================================
   AUTO UNIVERSE — BUILD ASSEMBLER
   Kopira {app}/ u build/{app}/ i core/ u build/{app}/core/.
   Rewrite-uje sve `../core/` reference u `core/` (jedan nivo dole,
   ne sibling), jer u Capacitor WebView-u index.html je root i
   `../` nije dozvoljeno.

   PWA (GitHub Pages) NASTAVLJA da se servira iz izvornog {app}/
   sa `../core/` referencama — build/ je samo za Capacitor sync.

   webDir u capacitor.config → ../../build/{app}
   ============================================================ */
"use strict";

const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const CORE_DIR = path.join(ROOT, "core");
const BUILD    = path.join(ROOT, "build");

// Fajlovi u kojima menjamo `../core/` -> `core/`
const REWRITE_EXTS = [".html", ".js", ".json"];

function copyRecursive(src, dst, opts) {
  opts = opts || {};
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry.startsWith(".") || entry === "node_modules") continue;
      copyRecursive(path.join(src, entry), path.join(dst, entry), opts);
    }
  } else {
    if (opts.rewrite && REWRITE_EXTS.includes(path.extname(src))) {
      let content = fs.readFileSync(src, "utf8");
      content = content.replace(/\.\.\/core\//g, "core/");
      fs.writeFileSync(dst, content, "utf8");
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

function removeIfExists(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function build(appName) {
  const appSrc = path.join(ROOT, appName);
  if (!fs.existsSync(appSrc)) {
    console.error(`[build] App folder ne postoji: ${appSrc}`);
    process.exit(1);
  }

  const outApp  = path.join(BUILD, appName);
  const outCore = path.join(outApp, "core");

  console.log(`[build] Assembling ${appName}...`);
  removeIfExists(outApp);

  // 1) Kopiraj app fajlove sa rewrite putanja
  copyRecursive(appSrc, outApp, { rewrite: true });

  // 2) Kopiraj core UNUTAR app foldera (core je bez rewrite-a)
  copyRecursive(CORE_DIR, outCore, { rewrite: false });

  console.log(`[build] Done -> build/${appName}/ (sa core/ unutra)`);
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/build.js <garage|driver>");
  process.exit(1);
}
build(target);
