/* Prosti Node http server za Playwright — servira D:\BELORA\autouniverse/ kao static.
   Zvog PWA-a (SW + IndexedDB), origin mora biti localhost:port.
*/
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || 4173);
const ROOT = path.resolve(__dirname, '..', '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end('Forbidden'); }
    if (!fs.existsSync(filePath)) { res.statusCode = 404; return res.end('Not found: ' + urlPath); }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    // Bez keširanja — omogucava fresh reload izmedju testova
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.statusCode = 500;
    res.end('Server error: ' + e.message);
  }
}).listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT}/  ROOT=${ROOT}`);
});
