const http = require('http');
const path = require('path');
const fs   = require('fs');
const { parseMultipart } = require('./lib/multipart');

const PORT = process.env.PORT || 3000;

// --- Mini router ---

const routes = [];

function makeRouter() {
  function addRoute(method, pattern, handler) {
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
    );
    routes.push({ method, re, keys, handler });
  }

  return {
    get:    (p, h) => addRoute('GET',    p, h),
    post:   (p, h) => addRoute('POST',   p, h),
    put:    (p, h) => addRoute('PUT',    p, h),
    delete: (p, h) => addRoute('DELETE', p, h),
  };
}

// --- Response helpers ---

function makeRes(res) {
  res.json = (status, data) => {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
  };
  res.html = (status, html) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  };
  return res;
}

// --- Body parser ---

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const ct = req.headers['content-type'] || '';
    const isMultipart = ct.includes('multipart/form-data');
    const limit = isMultipart ? 20e6 : 1e6;

    req.on('data', chunk => {
      chunks.push(chunk);
      const total = chunks.reduce((s, c) => s + c.length, 0);
      if (total > limit) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (isMultipart) {
        const boundary = ct.match(/boundary=([^\s;]+)/)?.[1];
        if (!boundary) { resolve({}); return; }
        try { resolve({ _multipart: parseMultipart(buf, boundary) }); }
        catch { resolve({}); }
      } else {
        try { resolve(buf.length ? JSON.parse(buf.toString()) : {}); }
        catch { resolve({}); }
      }
    });
    req.on('error', reject);
  });
}

// --- Static file server (admin/) ---

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) { res.json(404, { error: 'Not found' }); return; }
  const ext = path.extname(filePath);
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

// --- Register routes ---

const router = makeRouter();
require('./routes/auth')(router);
require('./routes/accounts')(router);
require('./routes/vehicles')(router);
require('./routes/grants')(router);
require('./routes/events')(router);
require('./routes/notifications')(router);
require('./routes/share')(router);
require('./routes/public')(router);
require('./routes/admin')(router);
require('./routes/notes')(router);
require('./routes/reminders')(router);
require('./routes/autopijaca')(router);
require('./routes/uploads')(router);

// Health check — bez auth, za monitoring/uptime alate
router.get('/health', (req, res) => {
  let dbOk = false;
  try { require('./db').getDb().prepare('SELECT 1').get(); dbOk = true; } catch {}
  res.json(dbOk ? 200 : 503, {
    status:   dbOk ? 'ok' : 'degraded',
    uptime_s: Math.floor(process.uptime()),
    version:  require('./package.json').version,
    db:       dbOk ? 'ok' : 'error',
    ts:       new Date().toISOString(),
  });
});

// Public stats endpoint
router.get('/stats', async (req, res) => {
  const { getDb } = require('./db');
  const db = getDb();
  const stats = {
    users:    db.prepare('SELECT COUNT(*) as n FROM users').get().n,
    vehicles: db.prepare('SELECT COUNT(*) as n FROM vehicles').get().n,
    events:   db.prepare('SELECT COUNT(*) as n FROM events').get().n,
    grants:   db.prepare('SELECT COUNT(*) as n FROM grants WHERE revoked_at IS NULL').get().n,
    uptime_s: Math.floor(process.uptime()),
    version:  require('./package.json').version,
  };
  res.json(200, stats);
});

require('./drip').startDrip();

// --- Request dispatcher ---

const server = http.createServer(async (req, res) => {
  makeRes(res);

  // CORS — Driver na GitHub Pages mora da fetchuje odavde
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // Hub user-facing interface (root)
  if (pathname === '/' || pathname === '/hub') {
    return serveStatic(res, path.join(__dirname, 'hub/index.html'));
  }

  // Admin static files
  if (pathname === '/admin' || pathname.startsWith('/admin/') && pathname.includes('.')) {
    const rel = pathname === '/admin' ? '/admin/index.html' : pathname;
    return serveStatic(res, path.join(__dirname, rel));
  }

  // API routes
  if (pathname.startsWith('/api') || isApiPath(pathname)) {
    const apiPath = pathname.startsWith('/api') ? pathname.slice(4) || '/' : pathname;
    req.query = Object.fromEntries(url.searchParams);
    let body = {};
    try { body = await readBody(req); } catch { return res.json(400, { error: 'Bad request body' }); }

    for (const route of routes) {
      if (route.method !== req.method) continue;
      const m = apiPath.match(route.re);
      if (!m) continue;
      const params = {};
      route.keys.forEach((k, i) => { params[k] = m[i + 1]; });
      try {
        await route.handler(req, res, body, params);
      } catch (e) {
        const status = e.status || 500;
        res.json(status, { error: e.message });
        if (status === 500) console.error(e);
      }
      return;
    }

    return res.json(404, { error: 'Route not found' });
  }

  res.json(404, { error: 'Not found' });
});

function isApiPath(p) {
  return p.startsWith('/auth') || p.startsWith('/vehicles') || p.startsWith('/grants') ||
         p.startsWith('/admin') || p.startsWith('/events') || p.startsWith('/share') ||
         p.startsWith('/public') || p.startsWith('/accounts') || p.startsWith('/notifications') ||
         p.startsWith('/stats') || p.startsWith('/health') || p.startsWith('/reminders');
  // /vehicles/:id/photos and /vehicles/:id/documents covered by /vehicles above
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`AU Core server na http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Briefing:    http://localhost:${PORT}/admin/briefing`);
  });
}

module.exports = server;
