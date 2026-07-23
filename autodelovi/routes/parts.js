const crypto = require('crypto');
const { getDb } = require('../db');

function genToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Dozvoljene kategorije
const CATEGORIES = [
  'motor', 'menjac', 'kocnice', 'trap', 'karoserija',
  'elektrika', 'klima', 'filteri', 'gume', 'stakla', 'ostalo'
];

module.exports = function (router) {

  // POST /parts — Garage objavljuje deo
  router.post('/parts', async (req, res, body) => {
    const {
      title, category, condition, part_number, compatible,
      price, currency, description, city,
      contact_name, contact_phone, contact_method,
      photos
    } = body;

    if (!title || !price || !contact_name || !contact_phone) {
      const e = new Error('title, price, contact_name, contact_phone su obavezni');
      e.status = 400; throw e;
    }

    const db = getDb();
    const seller_token = genToken();

    const result = db.prepare(`
      INSERT INTO parts
        (seller_token, title, category, condition, part_number, compatible,
         price, currency, description, city, contact_name, contact_phone, contact_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seller_token,
      title,
      CATEGORIES.includes(category) ? category : 'ostalo',
      ['nov', 'polovan', 'renoviran'].includes(condition) ? condition : 'polovan',
      part_number ?? null,
      JSON.stringify(Array.isArray(compatible) ? compatible : []),
      price,
      currency ?? 'EUR',
      description ?? null,
      city ?? null,
      contact_name,
      contact_phone,
      contact_method ?? 'phone_call'
    );

    const part_id = result.lastInsertRowid;

    if (Array.isArray(photos) && photos.length > 0) {
      const ins = db.prepare(`INSERT INTO part_photos (part_id, url, sort_order) VALUES (?, ?, ?)`);
      photos.forEach((url, i) => ins.run(part_id, url, i));
    }

    res.json(201, {
      id: part_id,
      seller_token,
      url: `/delovi/${part_id}`
    });
  });

  // GET /parts — javna lista (filteri: category, condition, make, model, city, max_price)
  router.get('/parts', async (req, res) => {
    const { category, condition, make, model, city, max_price, limit, offset } = req.query;

    let sql = `SELECT p.*, GROUP_CONCAT(ph.url ORDER BY ph.sort_order) as photos
               FROM parts p
               LEFT JOIN part_photos ph ON ph.part_id = p.id
               WHERE p.status = 'active'`;
    const params = [];

    if (category)  { sql += ` AND p.category = ?`;    params.push(category); }
    if (condition) { sql += ` AND p.condition = ?`;   params.push(condition); }
    if (city)      { sql += ` AND p.city = ?`;        params.push(city); }
    if (max_price) { sql += ` AND p.price <= ?`;      params.push(Number(max_price)); }

    // Pretraga po marci/modelu: compatible JSON ILI title
    if (make)  { sql += ` AND (p.compatible LIKE ? OR p.title LIKE ?)`; params.push(`%${make}%`, `%${make}%`); }
    if (model) { sql += ` AND (p.compatible LIKE ? OR p.title LIKE ?)`; params.push(`%${model}%`, `%${model}%`); }

    sql += ` GROUP BY p.id ORDER BY p.created_at DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 20, Number(offset) || 0);

    const rows = getDb().prepare(sql).all(...params);

    res.json(200, rows.map(r => ({
      ...r,
      seller_token: undefined,
      compatible: JSON.parse(r.compatible || '[]'),
      photos: r.photos ? r.photos.split(',') : []
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
      photos: photos.map(p => p.url)
    });
  });

  // PUT /parts/:id — prodavac menja status ili podatke
  router.put('/parts/:id', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (part.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

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
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const part = db.prepare(`SELECT * FROM parts WHERE id = ?`).get(params.id);
    if (!part) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (part.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

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
