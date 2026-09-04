const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const { getDb } = require('../db');
const { send, tplSellerToken } = require('../email');

const AU_CORE = 'http://localhost:3000';

function validateAuSession(req) {
  return new Promise((resolve) => {
    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) return resolve(null);
    const token = auth.slice(7);
    const opts = {
      hostname: 'localhost', port: 3000,
      path: '/auth/me', method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const r = http.request(opts, res2 => {
      let data = '';
      res2.on('data', c => { data += c; });
      res2.on('end', () => {
        if (res2.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        } else {
          resolve(null);
        }
      });
    });
    r.on('error', () => resolve(null));
    r.end();
  });
}

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

function genToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Dozvoljene kategorije (v2 — 24)
const CATEGORIES = [
  // Originalne (11)
  'motor', 'menjac', 'kocnice', 'trap', 'karoserija',
  'elektrika', 'klima', 'filteri', 'gume', 'stakla', 'enterijer',
  // Nove (13)
  'airbag', 'audio', 'branik', 'felne', 'auspuh',
  'kljucevi', 'ceo_auto', 'zaptivaci', 'alati', 'servisni',
  'usluge', 'svetla', 'ostalo',
];

module.exports = function (router) {

  // GET /stats — javna statistika
  router.get('/stats', async (req, res) => {
    const db = getDb();
    const active = db.prepare("SELECT COUNT(*) AS n FROM parts WHERE status='active'").get().n;
    const sold   = db.prepare("SELECT COUNT(*) AS n FROM parts WHERE status='sold'").get().n;
    const total  = db.prepare("SELECT COUNT(*) AS n FROM parts").get().n;
    const byCat  = db.prepare("SELECT category, COUNT(*) AS n FROM parts WHERE status='active' GROUP BY category ORDER BY n DESC").all();
    const recent = db.prepare("SELECT title, category, price, currency, city FROM parts WHERE status='active' ORDER BY created_at DESC LIMIT 5").all();
    res.json(200, { active, sold, total, by_category: byCat, recent });
  });

  // GET /parts/mine — oglasi ulogovanog korisnika
  router.get('/parts/mine', async (req, res) => {
    const user = await validateAuSession(req);
    if (!user) { const e = new Error('Prijavite se da biste videli vaše oglase'); e.status = 401; throw e; }

    const db = getDb();
    const parts = db.prepare(`
      SELECT p.*, GROUP_CONCAT(ph.url ORDER BY ph.sort_order) as photos
      FROM parts p
      LEFT JOIN part_photos ph ON ph.part_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all(user.id);

    res.json(200, parts.map(r => ({
      ...r,
      seller_token: undefined,
      compatible: JSON.parse(r.compatible || '[]'),
      also_fits:  JSON.parse(r.also_fits  || '[]'),
      photos: r.photos ? r.photos.split(',') : [],
      delivery: !!r.delivery,
      exchange: !!r.exchange,
    })));
  });

  // POST /parts — objavi oglas
  router.post('/parts', async (req, res, body) => {
    const {
      title, category, condition, part_number, compatible,
      price, currency, description, city,
      contact_name, contact_phone, contact_email, contact_method,
      photos,
      // v2 nova polja
      make, model, year_from, year_to, engine_code,
      km_driven, also_fits, catalog_number, delivery, exchange,
    } = body;

    const auUser = await validateAuSession(req);
    if (!auUser) {
      const e = new Error('Prijavite se da biste objavili oglas'); e.status = 401; throw e;
    }

    if (!title || !contact_name || !contact_phone) {
      const e = new Error('title, contact_name, contact_phone su obavezni');
      e.status = 400; throw e;
    }

    const db = getDb();
    const seller_token = genToken();

    const result = db.prepare(`
      INSERT INTO parts
        (seller_token, user_id, title, category, condition, part_number, compatible,
         price, currency, description, city, contact_name, contact_phone,
         contact_email, contact_method,
         make, model, year_from, year_to, engine_code,
         km_driven, also_fits, catalog_number, delivery, exchange)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seller_token,
      auUser.id,
      title,
      CATEGORIES.includes(category) ? category : 'ostalo',
      ['nov', 'polovan', 'renoviran', 'neispravan'].includes(condition) ? condition : 'polovan',
      part_number ?? null,
      JSON.stringify(Array.isArray(compatible) ? compatible : []),
      price != null ? Number(price) : null,
      currency ?? 'EUR',
      description ?? null,
      city ?? null,
      contact_name,
      contact_phone,
      contact_email ?? null,
      contact_method ?? 'phone_call',
      make ?? null,
      model ?? null,
      year_from ? Number(year_from) : null,
      year_to   ? Number(year_to)   : null,
      engine_code ?? null,
      km_driven ? Number(km_driven) : null,
      JSON.stringify(Array.isArray(also_fits) ? also_fits : []),
      catalog_number ?? null,
      delivery ? 1 : 0,
      exchange ? 1 : 0,
    );

    const part_id = result.lastInsertRowid;

    if (Array.isArray(photos) && photos.length > 0) {
      const ins = db.prepare(`INSERT INTO part_photos (part_id, url, sort_order) VALUES (?, ?, ?)`);
      photos.forEach((url, i) => ins.run(part_id, url, i));
    }

    if (contact_email) {
      send({
        to: contact_email,
        subject: `Oglas objavljen: ${title} (ID: ${part_id})`,
        html: tplSellerToken(part_id, seller_token, title),
      }).catch(err => console.error('[parts] email greška:', err));
    }

    res.json(201, {
      id: part_id,
      seller_token,
      url: `/delovi/${part_id}`
    });
  });

  // GET /parts — javna lista
  router.get('/parts', async (req, res) => {
    const { q, category, condition, make, model, city, max_price, year, sort, limit, offset } = req.query;

    let sql = `SELECT p.*, GROUP_CONCAT(ph.url ORDER BY ph.sort_order) as photos
               FROM parts p
               LEFT JOIN part_photos ph ON ph.part_id = p.id
               WHERE p.status = 'active'`;
    const params = [];

    if (q)         { sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.make LIKE ? OR p.model LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
    if (category)  { sql += ` AND p.category = ?`;    params.push(category); }
    if (condition) { sql += ` AND p.condition = ?`;   params.push(condition); }
    if (city)      { sql += ` AND p.city LIKE ?`;     params.push(`%${city}%`); }
    if (max_price) { sql += ` AND p.price <= ?`;      params.push(Number(max_price)); }
    if (make)      { sql += ` AND (p.make LIKE ? OR p.compatible LIKE ? OR p.title LIKE ?)`; params.push(`%${make}%`, `%${make}%`, `%${make}%`); }
    if (model)     { sql += ` AND (p.model LIKE ? OR p.compatible LIKE ? OR p.title LIKE ?)`; params.push(`%${model}%`, `%${model}%`, `%${model}%`); }
    if (year)      { sql += ` AND (p.year_from IS NULL OR p.year_from <= ?) AND (p.year_to IS NULL OR p.year_to >= ?)`; params.push(Number(year), Number(year)); }

    const orderBy = sort === 'price_asc'  ? 'p.price ASC'
                  : sort === 'price_desc' ? 'p.price DESC'
                  : 'p.created_at DESC';
    sql += ` GROUP BY p.id ORDER BY ${orderBy}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 20, Number(offset) || 0);

    const rows = getDb().prepare(sql).all(...params);

    res.json(200, rows.map(r => ({
      ...r,
      seller_token: undefined,
      compatible: JSON.parse(r.compatible || '[]'),
      also_fits:  JSON.parse(r.also_fits  || '[]'),
      photos: r.photos ? r.photos.split(',') : [],
      delivery: !!r.delivery,
      exchange: !!r.exchange,
    })));
  });

  // GET /parts/:id — jedan oglas (javno)
  router.get('/parts/:id', async (req, res, body, params) => {
    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }

    db.prepare(`UPDATE parts SET views = views + 1 WHERE id = ?`).run(params.id);

    const photos = db.prepare(`SELECT url FROM part_photos WHERE part_id = ? ORDER BY sort_order`).all(params.id);

    res.json(200, {
      ...part,
      seller_token: undefined,
      views: part.views + 1,
      compatible: JSON.parse(part.compatible || '[]'),
      also_fits:  JSON.parse(part.also_fits  || '[]'),
      photos: photos.map(p => p.url),
      delivery: !!part.delivery,
      exchange: !!part.exchange,
    });
  });

  // PUT /parts/:id — prodavac menja status ili podatke
  router.put('/parts/:id', async (req, res, body, params) => {
    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }

    const auUser = await validateAuSession(req);
    const token  = req.headers['x-seller-token'];
    const okViaSession = auUser && part.user_id === auUser.id;
    const okViaToken   = token && part.seller_token === token;
    if (!okViaSession && !okViaToken) {
      const e = new Error('Unauthorized'); e.status = 403; throw e;
    }

    const allowed = ['status', 'price', 'description', 'city', 'contact_phone', 'contact_method'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        vals.push(body[key]);
      }
    }

    if (sets.length === 0) { const e = new Error('Nema polja za ažuriranje'); e.status = 400; throw e; }

    sets.push(`updated_at = datetime('now')`);
    vals.push(params.id);
    db.prepare(`UPDATE parts SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    res.json(200, { ok: true });
  });

  // DELETE /parts/:id
  router.delete('/parts/:id', async (req, res, body, params) => {
    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }

    // Dozvoli via AU Core session ILI seller_token (backward compat)
    const auUser = await validateAuSession(req);
    const token  = req.headers['x-seller-token'];
    const okViaSession = auUser && part.user_id === auUser.id;
    const okViaToken   = token && part.seller_token === token;
    if (!okViaSession && !okViaToken) {
      const e = new Error('Unauthorized'); e.status = 403; throw e;
    }

    const photos = db.prepare(`SELECT url FROM part_photos WHERE part_id = ?`).all(params.id);
    photos.forEach(p => {
      const filename = path.basename(p.url);
      try { fs.unlinkSync(path.join(UPLOADS_DIR, filename)); } catch {}
    });

    db.prepare(`DELETE FROM parts WHERE id = ?`).run(params.id);
    res.json(200, { ok: true });
  });

  // GET /parts/:id/seller — prodavac vidi oglas + poruke
  router.get('/parts/:id/seller', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (part.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

    const photos = db.prepare(`SELECT url FROM part_photos WHERE part_id = ? ORDER BY sort_order`).all(params.id);
    const msgs = db.prepare(`SELECT * FROM messages WHERE part_id = ? ORDER BY created_at DESC`).all(params.id);

    res.json(200, {
      ...part,
      compatible: JSON.parse(part.compatible || '[]'),
      photos: photos.map(p => p.url),
      messages: msgs
    });
  });
};
