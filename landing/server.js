const http = require('http');
const fs   = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PORT    = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'autouniverse.db');
const PUBLIC  = path.join(__dirname, 'public');

// ── DB setup ──────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    source        TEXT,
    confirmed_at  DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME
  );
  CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    email      TEXT,
    type       TEXT,
    message    TEXT,
    ip         TEXT,
    handled    INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertSubscriber = db.prepare(
  `INSERT INTO subscribers (email, source) VALUES (?, ?)
   ON CONFLICT(email) DO NOTHING`
);
const insertContact = db.prepare(
  `INSERT INTO contacts (name, email, type, message, ip) VALUES (?, ?, ?, ?, ?)`
);

// ── Rate limiting (in-memory, per IP) ────────────────────────────────────
const rateLimits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 5;
  const key = ip;
  const entry = rateLimits.get(key) || { count: 0, reset: now + window };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + window; }
  entry.count++;
  rateLimits.set(key, entry);
  return entry.count <= max;
}

// ── MIME types ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.json': 'application/json',
};

// ── Helpers ───────────────────────────────────────────────────────────────
function getIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 8192) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('404');
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    const isImmutable = ['.css', '.js', '.png', '.svg', '.woff2'].includes(ext);
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': isImmutable ? 'public, max-age=31536000, immutable' : 'no-store'
    });
    res.end(data);
  });
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 200;
}

// ── Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const ip  = getIP(req);

  // CORS (za lokalni dev)
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // POST /api/subscribe
  if (req.method === 'POST' && url.pathname === '/api/subscribe') {
    if (!checkRate(ip)) return json(res, 429, { error: 'Previse zahteva. Sacekaj minut.' });
    const body = await readBody(req);
    if (body.website) return json(res, 400, { error: 'Bad request.' });
    if (!validateEmail(body.email)) return json(res, 400, { error: 'Nevalidan email.' });
    const source = ['footer','waitlist_hub','calc'].includes(body.source) ? body.source : 'unknown';
    insertSubscriber.run(body.email.toLowerCase().trim(), source);
    return json(res, 200, { ok: true });
  }

  // POST /api/contact
  if (req.method === 'POST' && url.pathname === '/api/contact') {
    if (!checkRate(ip)) return json(res, 429, { error: 'Previse zahteva. Sacekaj minut.' });
    const body = await readBody(req);
    if (body.website) return json(res, 400, { error: 'Bad request.' });
    const name    = (body.name    || '').slice(0, 200).trim();
    const email   = (body.email   || '').trim();
    const message = (body.message || '').slice(0, 4000).trim();
    const type    = ['feedback','bug','partnership','general'].includes(body.type) ? body.type : 'general';
    if (!name || !validateEmail(email) || !message) return json(res, 400, { error: 'Nedostaju polja.' });
    insertContact.run(name, email.toLowerCase(), type, message, ip);
    return json(res, 200, { ok: true });
  }

  // Static files — serve from root (index.html, css/, js/, assets/)
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }

  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }

  // If path has no extension, try as .html or fallback to index.html
  if (!path.extname(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) { filePath = htmlPath; }
    else { filePath = path.join(__dirname, 'index.html'); }
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`AutoUniverse landing → http://localhost:${PORT}`);
});
