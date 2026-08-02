#!/usr/bin/env node
/* Bootstrap script za app ikone u Capacitor Android projektima.
   Kopira postojecu 512x512 PWA ikonu (../garage/icons/icon-512.png,
   ../driver/icons/icon-512.png) u sve mipmap-* foldere kao ic_launcher.png.

   ANDROID SKALIRA SAM — nije idealno za produkciju, ali za MVP dovoljno.
   Kad Milan dobije 1024x1024 branded ikone (crveni zupcanik za Garage,
   tirkizni auto za Driver), pokrenuti @capacitor/assets za proper multi-res.

   Run:
     node mobile/generate_icons.js garage
     node mobile/generate_icons.js driver
     node mobile/generate_icons.js all
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MOBILE = __dirname;

const MIPMAP_DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

function copyIconTo(srcPng, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(srcPng, dst);
}

function generateFor(app) {
  const srcIcon = path.join(ROOT, app, 'icons', 'icon-512.png');
  if (!fs.existsSync(srcIcon)) {
    throw new Error(`Nema source ikone: ${srcIcon}`);
  }
  const resDir = path.join(MOBILE, app, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(resDir)) {
    throw new Error(`Nema Android res foldera (pokreni prvo cap add android): ${resDir}`);
  }

  console.log(`[${app}] source: ${srcIcon}`);
  for (const density of MIPMAP_DENSITIES) {
    const dstDir = path.join(resDir, `mipmap-${density}`);
    const foreground = path.join(dstDir, 'ic_launcher_foreground.png');
    const launcher = path.join(dstDir, 'ic_launcher.png');
    const round = path.join(dstDir, 'ic_launcher_round.png');
    copyIconTo(srcIcon, launcher);
    copyIconTo(srcIcon, round);
    if (fs.existsSync(path.join(dstDir, 'ic_launcher_foreground.xml'))) {
      // Capacitor default je adaptivna ikona; ostavlja se
    } else {
      copyIconTo(srcIcon, foreground);
    }
    console.log(`  -> mipmap-${density}/ (ic_launcher, ic_launcher_round)`);
  }

  // Optional: splash sliku (Capacitor placeholder je "splash.png" u drawable/)
  const splashDrawable = path.join(resDir, 'drawable', 'splash.png');
  if (fs.existsSync(path.dirname(splashDrawable))) {
    copyIconTo(srcIcon, splashDrawable);
    console.log(`  -> drawable/splash.png (postavljena source ikona kao placeholder splash)`);
  }
  console.log(`[${app}] gotovo.\n`);
}

const arg = process.argv[2];
if (!arg || arg === 'all') {
  generateFor('garage');
  generateFor('driver');
} else {
  generateFor(arg);
}
