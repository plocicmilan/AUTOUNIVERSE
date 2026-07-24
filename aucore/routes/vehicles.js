const { requireAuth } = require('../auth');
const { getDb, audit } = require('../db');
const { hasAccess, getGrants } = require('../permissions');

module.exports = function vehicleRoutes(router) {
  router.get('/vehicles', (req, res) => {
    const user = requireAuth(req);
    const db = getDb();
    const now = new Date().toISOString();

    const owned = db.prepare('SELECT * FROM vehicles WHERE owner_id=?').all(user.id);
    const shared = db.prepare(`
      SELECT v.*, g.role AS my_role
      FROM vehicles v
      JOIN grants g ON g.vehicle_id = v.id
      WHERE g.grantee_id=? AND (g.expires_at IS NULL OR g.expires_at > ?)
    `).all(user.id, now);

    res.json(200, { owned, shared });
  });

  router.post('/vehicles', (req, res, body) => {
    const user = requireAuth(req);
    const { make, model, year, plate, vin } = body;
    if (!make || !model) return res.json(400, { error: 'make i model obavezni' });

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO vehicles (owner_id, make, model, year, plate, vin) VALUES (?,?,?,?,?,?)'
    ).run(user.id, make, model, year ?? null, plate ?? null, vin ?? null);

    audit('vehicle.create', { userId: user.id, entity: 'vehicle', entityId: result.lastInsertRowid, detail: { make, model } });
    res.json(201, { id: result.lastInsertRowid });
  });

  router.get('/vehicles/:id', (req, res, _, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    if (!hasAccess(user.id, id, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(id);
    if (!vehicle) return res.json(404, { error: 'Ne postoji' });

    const events = db.prepare('SELECT * FROM events WHERE vehicle_id=? ORDER BY event_date DESC').all(id);
    const grants = getGrants(id);

    res.json(200, { vehicle, events, grants });
  });

  router.put('/vehicles/:id', (req, res, body, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    const db = getDb();
    const v = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(id);
    if (!v) return res.json(404, { error: 'Ne postoji' });
    if (v.owner_id !== user.id) return res.json(403, { error: 'Samo vlasnik može menjati' });

    const allowed = ['make', 'model', 'year', 'plate', 'vin'];
    const sets = [];
    const vals = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { sets.push(`${key} = ?`); vals.push(body[key]); }
    }
    if (sets.length === 0) return res.json(400, { error: 'Nema polja za ažuriranje' });
    vals.push(id);
    db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    audit('vehicle.update', { userId: user.id, entity: 'vehicle', entityId: id, detail: { fields: sets.map(s => s.split(' ')[0]) } });
    res.json(200, { ok: true });
  });

  router.delete('/vehicles/:id', (req, res, _, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    const db = getDb();
    const v = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(id);
    if (!v) return res.json(404, { error: 'Ne postoji' });
    if (v.owner_id !== user.id) return res.json(403, { error: 'Samo vlasnik može obrisati' });

    db.prepare('DELETE FROM vehicles WHERE id=?').run(id);
    audit('vehicle.delete', { userId: user.id, entity: 'vehicle', entityId: id });
    res.json(200, { ok: true });
  });
};
