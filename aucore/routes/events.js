const { requireAuth } = require('../auth');
const { getDb, audit } = require('../db');
const { hasAccess } = require('../permissions');

const VALID_TYPES = [
  'service', 'oil_change', 'tire_change', 'tire_rotation',
  'inspection', 'registration', 'insurance', 'repair',
  'fuel', 'mileage', 'note', 'initial', 'work_order', 'estimate', 'other'
];

module.exports = function eventRoutes(router) {
  // Dodaj jedan event
  router.post('/vehicles/:id/events', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'write')) return res.json(403, { error: 'Nemaš pristup' });

    const { type, data, event_date, retroactive, source, app } = body;
    if (!type) return res.json(400, { error: 'type je obavezan' });
    if (!VALID_TYPES.includes(type)) return res.json(400, { error: `Nepoznat tip. Dozvoljeni: ${VALID_TYPES.join(', ')}` });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO events (vehicle_id, author_id, type, data, event_date, retroactive, source, app)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      vehicleId,
      user.id,
      type,
      JSON.stringify(data ?? {}),
      event_date ?? new Date().toISOString(),
      retroactive ? 1 : 0,
      source ?? 'user',
      app ?? 'aucore'
    );

    audit('event.create', { userId: user.id, entity: 'event', entityId: result.lastInsertRowid, detail: { vehicleId, type } });
    res.json(201, { id: result.lastInsertRowid });
  });

  // Batch sync — šalje offline-first app (Garage/Driver)
  router.post('/vehicles/:id/events/batch', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'write')) return res.json(403, { error: 'Nemaš pristup' });

    const events = Array.isArray(body) ? body : body.events;
    if (!events || !events.length) return res.json(400, { error: 'events niz je obavezan' });
    if (events.length > 500) return res.json(400, { error: 'Max 500 evenata po batch-u' });

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO events (vehicle_id, author_id, type, data, event_date, retroactive, source, app)
      VALUES (?,?,?,?,?,?,?,?)
    `);

    const results = db.transaction(() => {
      return events.map(e => {
        if (!e.type || !VALID_TYPES.includes(e.type)) return { error: `Nepoznat tip: ${e.type}`, local_id: e.local_id };
        const r = insert.run(
          vehicleId,
          user.id,
          e.type,
          JSON.stringify(e.data ?? {}),
          e.event_date ?? new Date().toISOString(),
          e.retroactive ? 1 : 0,
          e.source ?? 'app',
          e.app ?? 'unknown'
        );
        return { id: r.lastInsertRowid, local_id: e.local_id ?? null };
      });
    })();

    audit('event.batch', { userId: user.id, entity: 'vehicle', entityId: vehicleId, detail: { count: events.length } });
    res.json(200, { synced: results });
  });

  // Lista evenata vozila
  router.get('/vehicles/:id/events', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const q      = req.query || {};
    const limit  = Math.min(Number(q.limit  || 100), 500);
    const offset = Number(q.offset || 0);
    const type   = q.type || null;

    const where = type ? 'WHERE vehicle_id=? AND type=?' : 'WHERE vehicle_id=?';
    const args  = type ? [vehicleId, type, limit, offset] : [vehicleId, limit, offset];

    const events = db.prepare(`
      SELECT e.*, u.name AS author_name
      FROM events e JOIN users u ON e.author_id = u.id
      ${where}
      ORDER BY event_date DESC
      LIMIT ? OFFSET ?
    `).all(...args);

    const total = db.prepare(`SELECT COUNT(*) AS n FROM events ${where}`)
      .get(...(type ? [vehicleId, type] : [vehicleId])).n;

    res.json(200, { events, total, limit, offset });
  });

  // Summary — poslednji event po tipu + ukupan broj + poslednih 5
  router.get('/vehicles/:id/events/summary', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();

    const byType = db.prepare(`
      SELECT type,
             MAX(event_date) AS last_date,
             COUNT(*)        AS count,
             (SELECT data FROM events WHERE vehicle_id=? AND type=e.type ORDER BY event_date DESC LIMIT 1) AS last_data
      FROM events e
      WHERE vehicle_id=?
      GROUP BY type
      ORDER BY last_date DESC
    `).all(vehicleId, vehicleId);

    const recent = db.prepare(`
      SELECT id, type, event_date, data, retroactive, source
      FROM events WHERE vehicle_id=? ORDER BY event_date DESC LIMIT 5
    `).all(vehicleId);

    const total = db.prepare('SELECT COUNT(*) AS n FROM events WHERE vehicle_id=?').get(vehicleId).n;

    res.json(200, { total, by_type: byType, recent });
  });

  // Jedan event
  router.get('/vehicles/:vid/events/:eid', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id=? AND vehicle_id=?').get(Number(params.eid), vehicleId);
    if (!event) return res.json(404, { error: 'Event ne postoji' });
    res.json(200, event);
  });

  // Ažuriraj event (samo autor ili vlasnik vozila)
  router.put('/vehicles/:vid/events/:eid', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    const eventId   = Number(params.eid);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id=? AND vehicle_id=?').get(eventId, vehicleId);
    if (!event) return res.json(404, { error: 'Event ne postoji' });

    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    const canEdit = event.author_id === user.id || vehicle.owner_id === user.id;
    if (!canEdit) return res.json(403, { error: 'Nemaš pravo izmene' });

    const allowed = ['type', 'data', 'event_date', 'source', 'retroactive'];
    const sets = [];
    const vals = [];
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === 'type') {
        if (!VALID_TYPES.includes(body[key])) return res.json(400, { error: `Nepoznat tip: ${body[key]}` });
      }
      sets.push(`${key} = ?`);
      vals.push(key === 'data' ? JSON.stringify(body[key]) : key === 'retroactive' ? (body[key] ? 1 : 0) : body[key]);
    }
    if (sets.length === 0) return res.json(400, { error: 'Nema polja za ažuriranje' });

    vals.push(eventId);
    db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    audit('event.update', { userId: user.id, entity: 'event', entityId: eventId, detail: { vehicleId, fields: sets.map(s => s.split(' ')[0]) } });
    res.json(200, { ok: true });
  });

  // Briši event (samo autor ili vlasnik vozila)
  router.delete('/vehicles/:vid/events/:eid', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    const eventId   = Number(params.eid);

    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id=? AND vehicle_id=?').get(eventId, vehicleId);
    if (!event) return res.json(404, { error: 'Event ne postoji' });

    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    const canDelete = event.author_id === user.id || vehicle.owner_id === user.id;
    if (!canDelete) return res.json(403, { error: 'Nemaš pravo brisanja' });

    db.prepare('DELETE FROM events WHERE id=?').run(eventId);
    audit('event.delete', { userId: user.id, entity: 'event', entityId: eventId });
    res.json(200, { ok: true });
  });
};
