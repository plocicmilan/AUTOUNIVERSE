const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

// Load .env (local secrets, not committed)
(function loadEnv() {
  try {
    const envFile = path.join(__dirname, '.env');
    fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
  } catch (_) {}
})();

const PORT           = process.env.PORT || 4000;
const DB_PATH        = process.env.DB_PATH || path.join(__dirname, 'data', 'autouniverse.db');
const BREVO_API_KEY  = process.env.BREVO_API_KEY || '';
const SITE_URL       = 'https://autouniverse.rs';

// ── DB setup ──────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT UNIQUE NOT NULL,
    source          TEXT,
    confirm_token   TEXT,
    confirmed_at    DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
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
// Migracija — dodaj kolonu ako ne postoji (stare baze)
try { db.exec('ALTER TABLE subscribers ADD COLUMN confirm_token TEXT'); } catch (_) {}

const insertSubscriber = db.prepare(
  `INSERT INTO subscribers (email, source, confirm_token) VALUES (?, ?, ?)
   ON CONFLICT(email) DO NOTHING`
);
const confirmSubscriber = db.prepare(
  `UPDATE subscribers SET confirmed_at = CURRENT_TIMESTAMP, confirm_token = NULL
   WHERE confirm_token = ? AND confirmed_at IS NULL`
);
const getByToken = db.prepare(
  `SELECT id, confirmed_at FROM subscribers WHERE confirm_token = ?`
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
  '.txt':  'text/plain',
  '.xml':  'application/xml',
  '.apk':  'application/vnd.android.package-archive',
};

const REDIRECTS = {
  '/kalkulator-registracije': '/kalkulatori/registracije',
  '/kalkulator-uvoza':        '/kalkulatori/uvoza',
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

function serve404(res) {
  const p404 = path.join(__dirname, '404.html');
  fs.readFile(p404, (err, data) => {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(err ? '404 Not Found' : data);
  });
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { serve404(res); return; }
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

function sendConfirmationEmail(email, token) {
  if (!BREVO_API_KEY) return Promise.resolve(false);
  const confirmUrl = `${SITE_URL}/api/confirm?token=${token}`;
  const htmlContent = `
<!DOCTYPE html><html lang="sr"><body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:40px 20px">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#0f1d35;padding:28px 40px">
    <span style="font-family:system-ui,sans-serif;font-weight:900;font-size:22px;color:#ff6b35;border:2px solid #ff6b35;padding:3px 10px;border-radius:5px;letter-spacing:-1px">AU</span>
    <span style="font-family:system-ui,sans-serif;font-weight:700;font-size:20px;color:#e2e8f0;margin-left:10px">AutoUniverse</span>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f1d35">Potvrdi svoju pretplatu</h2>
    <p style="margin:0 0 24px;color:#475569;line-height:1.6">Hvala što se prijavио/la! Klikni dugme ispod da aktiviraš pretplatu i budeš prvi/a obaveštena o novostima iz AutoUniverse ekosistema.</p>
    <a href="${confirmUrl}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px">Potvrdi pretplatu →</a>
    <p style="margin:32px 0 0;font-size:12px;color:#94a3b8">Ako nisi slao/la ovaj zahtev, možeš ignorisati ovaj mejl.<br>Link važi 48h.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 40px;font-size:12px;color:#94a3b8">
    © 2026 AutoUniverse · <a href="${SITE_URL}" style="color:#ff6b35">autouniverse.rs</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const payload = JSON.stringify({
    sender: { name: 'AutoUniverse', email: 'beloraventures@gmail.com' },
    to: [{ email }],
    subject: 'Potvrdi pretplatu — AutoUniverse',
    htmlContent,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => { res.resume(); resolve(res.statusCode < 300); });
    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
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
    const token  = crypto.randomBytes(32).toString('hex');
    insertSubscriber.run(body.email.toLowerCase().trim(), source, token);
    sendConfirmationEmail(body.email.toLowerCase().trim(), token).catch(() => {});
    return json(res, 200, { ok: true, message: 'Proveri email — poslaće ti se link za potvrdu.' });
  }

  // GET /api/confirm?token=...
  if (req.method === 'GET' && url.pathname === '/api/confirm') {
    const token = url.searchParams.get('token') || '';
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      res.writeHead(302, { Location: '/' }); res.end(); return;
    }
    const row = getByToken.get(token);
    if (!row) {
      res.writeHead(302, { Location: '/?err=confirm' }); res.end(); return;
    }
    if (!row.confirmed_at) confirmSubscriber.run(token);
    res.writeHead(302, { Location: '/potvrda' }); res.end(); return;
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

  // 301 redirects
  if (req.method === 'GET' && REDIRECTS[url.pathname]) {
    res.writeHead(301, { Location: REDIRECTS[url.pathname] });
    res.end(); return;
  }

  // Static files — serve from root (index.html, css/, js/, assets/)
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }

  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }

  // If path has no extension, try as .html or 404
  if (!path.extname(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) { filePath = htmlPath; }
    else { serve404(res); return; }
  }

  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`AutoUniverse landing → http://localhost:${PORT}`);
});
