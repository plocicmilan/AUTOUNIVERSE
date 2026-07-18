const http = require('http');
const path = require('path');
const fs   = require('fs');

const PORT = process.env.PORT || 3002;

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 2e6) reject(new Error('Body too large')); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) { res.json(404, { error: 'Not found' }); return; }
  const ext = path.extname(filePath);
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const router = makeRouter();
require('./routes/parts')(router);
require('./routes/messages')(router);

const server = http.createServer(async (req, res) => {
  makeRes(res);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Seller-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (pathname === '/' || pathname === '/delovi' || (pathname.startsWith('/delovi') && !pathname.includes('.'))) {
    return serveStatic(res, path.join(__dirname, 'public', 'index.html'));
  }

  if (pathname.startsWith('/public/')) {
    return serveStatic(res, path.join(__dirname, pathname));
  }

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
  return p.startsWith('/parts');
}

server.listen(PORT, () => {
  console.log(`Autodelovi server na http://localhost:${PORT}`);
  console.log(`Javna stranica: http://localhost:${PORT}/delovi`);
});

module.exports = server;
