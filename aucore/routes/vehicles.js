const { requireAuth } = require('../auth');
const { getDb, audit } = require('../db');
const { hasAccess, getGrants } = require('../permissions');

module.exports = function vehicleRoutes(router) {
  router.get('/vehicles', (req, res) => {
    const user = requireAuth(req);
    const db = getDb();
    const now = new Date().toISOString();

    const owned = db.prepare(`
      SELECT v.*,
        (SELECT COUNT(*) FROM events WHERE vehicle_id=v.id) AS event_count,
        (SELECT MAX(event_date) FROM events WHERE vehicle_id=v.id) AS last_event_date,
        (SELECT COUNT(*) FROM reminders WHERE vehicle_id=v.id AND done=0) AS active_reminders_count
      FROM vehicles v WHERE owner_id=?
    `).all(user.id);

    const shared = db.prepare(`
      SELECT v.*, g.role AS my_role,
        (SELECT COUNT(*) FROM events WHERE vehicle_id=v.id) AS event_count,
        (SELECT MAX(event_date) FROM events WHERE vehicle_id=v.id) AS last_event_date,
        (SELECT COUNT(*) FROM reminders WHERE vehicle_id=v.id AND done=0) AS active_reminders_count
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

  // Agregat statistika vozila (events + reminders summary)
  router.get('/vehicles/:id/stats', (req, res, _, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    if (!hasAccess(user.id, id, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const vehicle = db.prepare('SELECT id FROM vehicles WHERE id=?').get(id);
    if (!vehicle) return res.json(404, { error: 'Ne postoji' });

    const totRow  = db.prepare('SELECT COUNT(*) AS n FROM events WHERE vehicle_id=?').get(id);
    const datesRow = db.prepare('SELECT MIN(event_date) AS first, MAX(event_date) AS last FROM events WHERE vehicle_id=?').get(id);
    const kmRow   = db.prepare(`
      SELECT CAST(json_extract(data, '$.mileage_km') AS INTEGER) AS mileage_km
      FROM events WHERE vehicle_id=?
        AND json_extract(data, '$.mileage_km') IS NOT NULL
        AND CAST(json_extract(data, '$.mileage_km') AS INTEGER) > 0
      ORDER BY event_date DESC, id DESC LIMIT 1
    `).get(id);
    const activeRem = db.prepare('SELECT COUNT(*) AS n FROM reminders WHERE vehicle_id=? AND done=0').get(id).n;
    const byType = db.prepare('SELECT type, COUNT(*) AS count FROM events WHERE vehicle_id=? GROUP BY type ORDER BY count DESC').all(id);

    res.json(200, {
      vehicle_id: id,
      total_events: totRow.n,
      first_event_date: datesRow.first ?? null,
      last_event_date:  datesRow.last  ?? null,
      last_mileage_km:  kmRow ? kmRow.mileage_km : null,
      active_reminders: activeRem,
      events_by_type:   byType,
    });
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

    db.transaction(() => {
      db.prepare('DELETE FROM reminders   WHERE vehicle_id=?').run(id);
      db.prepare('DELETE FROM owner_notes WHERE vehicle_id=?').run(id);
      db.prepare('DELETE FROM events      WHERE vehicle_id=?').run(id);
      db.prepare('DELETE FROM grants      WHERE vehicle_id=?').run(id);
      db.prepare('DELETE FROM vehicles    WHERE id=?').run(id);
    })();
    audit('vehicle.delete', { userId: user.id, entity: 'vehicle', entityId: id });
    res.json(200, { ok: true });
  });
};
