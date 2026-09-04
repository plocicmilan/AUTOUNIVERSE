const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { getDb } = require('../db');
const { send, tplSellerToken } = require('../email');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

function genToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = function (router) {

  // GET /stats — javna statistika tržišta
  router.get('/stats', async (req, res) => {
    const db = getDb();
    const active = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status='active'").get().n;
    const sold   = db.prepare("SELECT COUNT(*) AS n FROM listings WHERE status='sold'").get().n;
    const total  = db.prepare("SELECT COUNT(*) AS n FROM listings").get().n;
    const avg    = db.prepare("SELECT AVG(price) AS a FROM listings WHERE status='active' AND currency='EUR'").get().a;
    const recent = db.prepare("SELECT make, model, year, price, currency, city FROM listings WHERE status='active' ORDER BY created_at DESC LIMIT 5").all();
    res.json(200, {
      active, sold, total,
      avg_price_eur: avg ? Math.round(avg) : null,
      recent
    });
  });

  // POST /listings — Driver objavljuje oglas
  router.post('/listings', async (req, res, body) => {
    const { make, model, year, mileage_km, fuel, gearbox, vin,
            price, currency, description, city,
            contact_name, contact_phone, contact_email, contact_method,
            history_token, photos } = body;

    if (!make || !model || !price || !contact_name || !contact_phone) {
      const e = new Error('make, model, price, contact_name, contact_phone su obavezni');
      e.status = 400; throw e;
    }

    const db = getDb();
    const seller_token = genToken();

    const result = db.prepare(`
      INSERT INTO listings
        (seller_token, make, model, year, mileage_km, fuel, gearbox, vin,
         price, currency, description, city, contact_name, contact_phone,
         contact_email, contact_method, history_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      seller_token, make, model, year ?? null, mileage_km ?? null,
      fuel ?? null, gearbox ?? null, vin ?? null,
      price, currency ?? 'EUR', description ?? null, city ?? null,
      contact_name, contact_phone, contact_email ?? null,
      contact_method ?? 'phone_call', history_token ?? null
    );

    const listing_id = result.lastInsertRowid;

    if (Array.isArray(photos) && photos.length > 0) {
      const ins = db.prepare(`INSERT INTO listing_photos (listing_id, url, sort_order) VALUES (?, ?, ?)`);
      photos.forEach((url, i) => ins.run(listing_id, url, i));
    }

    if (contact_email) {
      send({
        to: contact_email,
        subject: `Oglas objavljen: ${make} ${model} (ID: ${listing_id})`,
        html: tplSellerToken(listing_id, seller_token, make, model),
      }).catch(err => console.error('[listings] email greška:', err));
    }

    res.json(201, {
      id: listing_id,
      seller_token,
      url: `/prodaja/${listing_id}`
    });
  });

  // GET /listings — javna lista (filteri: q, make, model, city, max_price, currency, fuel, min_year, max_year, sort)
  router.get('/listings', async (req, res) => {
    const { q, make, model, city, max_price, currency, fuel, min_year, max_year, sort, limit, offset } = req.query;

    let sql = `SELECT l.*, GROUP_CONCAT(p.url ORDER BY p.sort_order) as photos
               FROM listings l
               LEFT JOIN listing_photos p ON p.listing_id = l.id
               WHERE l.status = 'active'`;
    const params = [];

    if (q)         { sql += ` AND (l.make LIKE ? OR l.model LIKE ? OR l.description LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (make)      { sql += ` AND l.make LIKE ?`;      params.push(`%${make}%`); }
    if (model)     { sql += ` AND l.model LIKE ?`;     params.push(`%${model}%`); }
    if (city)      { sql += ` AND l.city LIKE ?`;      params.push(`%${city}%`); }
    if (max_price) { sql += ` AND l.price <= ?`;       params.push(Number(max_price)); }
    if (currency)  { sql += ` AND l.currency = ?`;     params.push(currency); }
    if (fuel)      { sql += ` AND l.fuel = ?`;         params.push(fuel); }
    if (min_year)  { sql += ` AND l.year >= ?`;        params.push(Number(min_year)); }
    if (max_year)  { sql += ` AND l.year <= ?`;        params.push(Number(max_year)); }

    const orderBy = sort === 'price_asc'  ? 'l.price ASC'
                  : sort === 'price_desc' ? 'l.price DESC'
                  : sort === 'year_desc'  ? 'l.year DESC'
                  : 'l.created_at DESC';
    sql += ` GROUP BY l.id ORDER BY ${orderBy}`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 20, Number(offset) || 0);

    const rows = getDb().prepare(sql).all(...params);

    res.json(200, rows.map(r => ({
      ...r,
      seller_token: undefined,
      photos: r.photos ? r.photos.split(',') : []
    })));
  });

  // GET /listings/:id — jedan oglas (javno, bez seller_token)
  router.get('/listings/:id', async (req, res, body, params) => {
    const db = getDb();
    const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(params.id);
    if (!listing) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }

    // Inkrement views
    db.prepare(`UPDATE listings SET views = views + 1 WHERE id = ?`).run(params.id);

    const photos = db.prepare(`SELECT url FROM listing_photos WHERE listing_id = ? ORDER BY sort_order`).all(params.id);

    res.json(200, {
      ...listing,
      seller_token: undefined,
      views: listing.views + 1,
      photos: photos.map(p => p.url)
    });
  });

  // PUT /listings/:id — prodavac menja status ili podatke (autorizacija: seller_token u headeru)
  router.put('/listings/:id', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(params.id);
    if (!listing) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (listing.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

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
    db.prepare(`UPDATE listings SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    res.json(200, { ok: true });
  });

  // DELETE /listings/:id — prodavac briše oglas
  router.delete('/listings/:id', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(params.id);
    if (!listing) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (listing.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

    const photos = db.prepare(`SELECT url FROM listing_photos WHERE listing_id = ?`).all(params.id);
    photos.forEach(p => {
      const filename = path.basename(p.url);
      try { fs.unlinkSync(path.join(UPLOADS_DIR, filename)); } catch {}
    });

    db.prepare(`DELETE FROM listings WHERE id = ?`).run(params.id);
    res.json(200, { ok: true });
  });

  // GET /listings/:id/seller — prodavac čita sopstveni oglas (sa porukami i seller_token)
  router.get('/listings/:id/seller', async (req, res, body, params) => {
    const token = req.headers['x-seller-token'];
    if (!token) { const e = new Error('x-seller-token header obavezan'); e.status = 401; throw e; }

    const db = getDb();
    const listing = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(params.id);
    if (!listing) { const e = new Error('Oglas ne postoji'); e.status = 404; throw e; }
    if (listing.seller_token !== token) { const e = new Error('Unauthorized'); e.status = 403; throw e; }

    const photos = db.prepare(`SELECT url FROM listing_photos WHERE listing_id = ? ORDER BY sort_order`).all(params.id);
    const msgs = db.prepare(`SELECT * FROM messages WHERE listing_id = ? ORDER BY created_at DESC`).all(params.id);

    res.json(200, { ...listing, photos: photos.map(p => p.url), messages: msgs });
  });
};
