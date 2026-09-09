const http = require('http');
const path = require('path');
const fs   = require('fs');

const { getDb } = require('./db');

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
    req.on('data', chunk => { data += chunk; if (data.length > 8e6) reject(new Error('Body too large')); });
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
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
                 '.json': 'application/json', '.webmanifest': 'application/manifest+json',
                 '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
                 '.webp': 'image/webp', '.ico': 'image/x-icon' };
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const router = makeRouter();
require('./routes/parts')(router);
require('./routes/messages')(router);
require('./routes/photos')(router);

router.get('/health', (req, res) => {
  let dbOk = false;
  try { require('./db').getDb().prepare('SELECT 1').get(); dbOk = true; } catch {}
  res.json(dbOk ? 200 : 503, {
    service:  'autodelovi',
    status:   dbOk ? 'ok' : 'degraded',
    uptime_s: Math.floor(process.uptime()),
    db:       dbOk ? 'ok' : 'error',
    ts:       new Date().toISOString(),
  });
});

// --- SSR helpers ---

const BASE_URL = 'https://autodelovi.autouniverse.rs';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function partSlug(p) { return `${p.id}-${slugify(p.title)}`; }

function partDesc(p) {
  const parts = [];
  if (p.make && p.model) parts.push(`${p.make} ${p.model}`);
  if (p.year_from) parts.push(p.year_to && p.year_to !== p.year_from ? `${p.year_from}–${p.year_to}` : String(p.year_from));
  if (p.city) parts.push(p.city);
  if (p.price) parts.push(`${p.price} ${p.currency || 'EUR'}`);
  const base = parts.join(', ');
  const desc = p.description ? p.description.slice(0, 120) : '';
  return base ? (desc ? `${base}. ${desc}` : base) : desc;
}

function renderPartPage(part, photos) {
  const canonical = `${BASE_URL}/deo/${partSlug(part)}`;
  const titleTxt = part.title;
  const descTxt = partDesc(part);
  const photo = photos[0] ? `${BASE_URL}${photos[0]}` : '';
  const price = part.price ? `${part.price} ${part.currency || 'EUR'}` : 'Po dogovoru';
  const condMap = { nov: 'Novo', polovan: 'Polovan', renoviran: 'Renoviran', neispravan: 'Neispravan' };
  const cond = condMap[part.condition] || part.condition || '';
  const compatStr = (() => {
    try { const c = JSON.parse(part.compatible || '[]'); return c.length ? c.join(', ') : ''; } catch { return ''; }
  })();
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: part.title,
    ...(part.description ? { description: part.description } : {}),
    ...(photos.length ? { image: photos.map(u => `${BASE_URL}${u}`) } : {}),
    ...((part.catalog_number || part.part_number) ? { sku: part.catalog_number || part.part_number } : {}),
    category: part.category,
    offers: {
      '@type': 'Offer',
      price: part.price || 0,
      priceCurrency: part.currency || 'EUR',
      availability: 'https://schema.org/InStock',
      areaServed: { '@type': 'Country', name: 'Srbija' },
      seller: { '@type': 'Person', name: part.contact_name },
    },
  };
  const compatBlock = (compatStr || part.make) ? `\n    <p class="sl">Odgovara za</p>
    <p class="desc">${esc([part.make, part.model].filter(Boolean).join(' '))}${part.year_from ? ` (${part.year_from}${part.year_to && part.year_to !== part.year_from ? '–' + part.year_to : ''})` : ''}${part.engine_code ? ', ' + esc(part.engine_code) : ''}${compatStr ? '\n' + esc(compatStr) : ''}</p>` : '';
  const skuBlock = (part.catalog_number || part.part_number) ? `\n    <p class="sl">OE / Kataloški broj</p>
    <p class="desc">${esc(part.catalog_number || part.part_number)}</p>` : '';
  const descBlock = part.description ? `\n    <p class="sl">Opis</p>
    <p class="desc">${esc(part.description)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titleTxt)} — Autodelovi</title>
<meta name="description" content="${esc(descTxt)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(titleTxt)}">
<meta property="og:description" content="${esc(descTxt)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:site_name" content="Autodelovi">
${photo ? `<meta property="og:image" content="${esc(photo)}">` : ''}
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#080B10;color:#DDE1EC;min-height:100vh}
a{color:#0EA5E9;text-decoration:none}
header{background:linear-gradient(135deg,#0D1118,#141824);border-bottom:1px solid rgba(255,255,255,.07);padding:16px 20px}
.hdr{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:12px}
.logo{width:36px;height:36px;background:#0EA5E9;border-radius:8px;display:flex;align-items:center;justify-content:center}
.logo svg{width:20px;height:20px;fill:#fff}
.brand{font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;letter-spacing:.5px}
.brand span{color:#0EA5E9}
.crumb{font-size:.8rem;color:#5A6070;margin-top:2px}
main{max-width:900px;margin:0 auto;padding:24px 20px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media(max-width:640px){main{grid-template-columns:1fr}}
.photo img{width:100%;border-radius:12px;object-fit:cover;max-height:360px}
.photo-ph{height:240px;background:#111520;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#5A6070;font-size:.85rem}
h1{font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:700;line-height:1.2;margin-bottom:12px}
.price{font-size:1.5rem;font-weight:700;color:#0EA5E9;margin-bottom:16px}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.badge{background:#1A1F2E;border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:4px 10px;font-size:.78rem}
.badge.g{border-color:#10B981;color:#10B981}
.sl{font-size:.7rem;font-weight:600;color:#5A6070;text-transform:uppercase;letter-spacing:.8px;margin:14px 0 5px}
.desc{font-size:.9rem;line-height:1.6;color:#A0A8BC;white-space:pre-wrap}
.cta{display:inline-block;margin-top:20px;padding:12px 24px;background:#0EA5E9;color:#fff;border-radius:8px;font-weight:600;font-size:.95rem}
footer{max-width:900px;margin:32px auto 0;padding:20px;border-top:1px solid rgba(255,255,255,.07);font-size:.8rem;color:#5A6070;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
footer a{color:#5A6070}
</style>
</head>
<body>
<header>
  <div class="hdr">
    <div class="logo"><svg viewBox="0 0 24 24"><path d="M3 17h2v-6H3v6zm4 0h2V7H7v10zm4 0h2v-4h-2v4zm4 0h2v-8h-2v8zm4 0h2V4h-2v13z"/></svg></div>
    <div><div class="brand">Auto<span>Delovi</span></div><div class="crumb"><a href="${BASE_URL}/delovi">← Svi oglasi</a></div></div>
  </div>
</header>
<main>
  <div class="photo">${photo ? `<img src="${esc(photo)}" alt="${esc(titleTxt)}" loading="lazy">` : '<div class="photo-ph">Bez fotografije</div>'}</div>
  <div class="info">
    <h1>${esc(titleTxt)}</h1>
    <div class="price">${esc(price)}</div>
    <div class="badges">
      <span class="badge g">${esc(cond)}</span>
      ${part.category ? `<span class="badge">${esc(part.category)}</span>` : ''}
      ${part.city ? `<span class="badge">📍 ${esc(part.city)}</span>` : ''}
      ${part.delivery ? '<span class="badge">🚚 Dostava</span>' : ''}
      ${part.exchange ? '<span class="badge">🔄 Zamena</span>' : ''}
    </div>${compatBlock}${skuBlock}${descBlock}
    <a href="${BASE_URL}/delovi" class="cta">Otvori u aplikaciji →</a>
  </div>
</main>
<footer>
  <span>© Autodelovi — AutoUniverse.rs</span>
  <span><a href="${BASE_URL}/o-nama">O nama</a> · <a href="${BASE_URL}/uslovi-koristenja">Uslovi</a> · <a href="${BASE_URL}/politika-privatnosti">Privatnost</a></span>
</footer>
</body>
</html>`;
}

function generatePartSitemap(db) {
  const parts = db.prepare(`SELECT id, title, updated_at FROM parts WHERE status = 'active' ORDER BY created_at DESC`).all();
  const lines = parts.map(p => {
    const lastmod = (p.updated_at || '').slice(0, 10);
    return `  <url>\n    <loc>${BASE_URL}/deo/${partSlug(p)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url>\n    <loc>${BASE_URL}/delovi</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    ...lines,
    '</urlset>',
  ].join('\n');
}

const server = http.createServer(async (req, res) => {
  makeRes(res);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Seller-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // SSR: individual part page
  if (pathname.startsWith('/deo/')) {
    const id = parseInt(pathname.slice(5), 10);
    if (!id) { res.html(404, '<h1>404 — oglas nije pronađen</h1>'); return; }
    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ? AND status = 'active'`).get(id);
    if (!part) { res.html(404, '<h1>Oglas nije pronađen</h1>'); return; }
    db.prepare(`UPDATE parts SET views = views + 1 WHERE id = ?`).run(id);
    const photos = db.prepare(`SELECT url FROM part_photos WHERE part_id = ? ORDER BY sort_order`).all(id).map(r => r.url);
    return res.html(200, renderPartPage(part, photos));
  }

  // Sitemap
  if (pathname === '/sitemap.xml') {
    try {
      const xml = generatePartSitemap(getDb());
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(xml);
    } catch (e) {
      console.error('[sitemap]', e);
      res.json(500, { error: 'Sitemap generation failed' });
    }
    return;
  }

  if (pathname === '/' || pathname === '/delovi' || (pathname.startsWith('/delovi') && !pathname.includes('.'))) {
    return serveStatic(res, path.join(__dirname, 'public', 'index.html'));
  }

  // Pravne i info stranice
  const staticPages = ['/o-nama', '/uslovi-koristenja', '/politika-privatnosti', '/kontakt', '/pomoc', '/vodic'];
  if (staticPages.includes(pathname)) {
    return serveStatic(res, path.join(__dirname, 'public', pathname.slice(1) + '.html'));
  }

  // Guide slike
  if (pathname.startsWith('/guide/')) {
    return serveStatic(res, path.join(__dirname, 'public', pathname));
  }

  // Service worker i manifest
  if (pathname === '/sw.js' || pathname === '/manifest.json') {
    return serveStatic(res, path.join(__dirname, 'public', pathname));
  }

  if (pathname.startsWith('/public/') || pathname.startsWith('/uploads/') || pathname.startsWith('/icons/')) {
    const rel = pathname.startsWith('/public/') ? pathname : ('public' + pathname);
    return serveStatic(res, path.join(__dirname, rel));
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
  return p.startsWith('/parts') || p.startsWith('/messages') || p.startsWith('/photos') || p === '/health' || p === '/stats';
}

server.listen(PORT, () => {
  console.log(`Autodelovi server na http://localhost:${PORT}`);
  console.log(`Javna stranica: http://localhost:${PORT}/delovi`);
});

module.exports = server;
