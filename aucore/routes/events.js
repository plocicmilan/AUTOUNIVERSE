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
  // Podržava bidirectional sync: body.last_pull → vraća from_server (novije od last_pull)
  router.post('/vehicles/:id/events/batch', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'write')) return res.json(403, { error: 'Nemaš pristup' });

    const incoming = Array.isArray(body) ? body : (Array.isArray(body.events) ? body.events : []);
    const lastPull = body.last_pull || null;
    const syncAt   = new Date().toISOString();

    if (incoming.length > 500) return res.json(400, { error: 'Max 500 evenata po batch-u' });

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO events (vehicle_id, author_id, type, data, event_date, retroactive, source, app)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    const findDup = db.prepare(`
      SELECT id FROM events
      WHERE vehicle_id=? AND author_id=? AND type=? AND event_date=? AND source=?
      LIMIT 1
    `);

    const synced = db.transaction(() => {
      return incoming.map(e => {
        if (!e.type || !VALID_TYPES.includes(e.type)) return { error: `Nepoznat tip: ${e.type}`, local_id: e.local_id };
        const eventDate = e.event_date ?? syncAt;
        const source    = e.source ?? 'app';
        // Idempotency: preskoči duplicate (isti vehicle/author/type/date/source)
        const dup = findDup.get(vehicleId, user.id, e.type, eventDate, source);
        if (dup) return { id: dup.id, local_id: e.local_id ?? null, action: 'skipped' };
        const r = insert.run(
          vehicleId,
          user.id,
          e.type,
          JSON.stringify(e.data ?? {}),
          eventDate,
          e.retroactive ? 1 : 0,
          source,
          e.app ?? 'unknown'
        );
        return { id: r.lastInsertRowid, local_id: e.local_id ?? null, action: 'created' };
      });
    })();

    // Bidirectional pull: svi eventi na serveru noviji od last_pull (i evtl. od drugog korisnika)
    const fromServer = lastPull
      ? db.prepare(`
          SELECT e.*, u.name AS author_name
          FROM events e JOIN users u ON e.author_id = u.id
          WHERE e.vehicle_id=? AND e.created_at > datetime(?)
          ORDER BY e.event_date DESC
        `).all(vehicleId, lastPull)
      : [];

    audit('event.batch', { userId: user.id, entity: 'vehicle', entityId: vehicleId, detail: { pushed: incoming.length, pulled: fromServer.length } });
    res.json(200, { synced, from_server: fromServer, sync_at: syncAt });
  });

  // Unified timeline — eventi + podsetnici za vozilo, sortirani po datumu
  router.get('/vehicles/:id/timeline', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db  = getDb();
    const q   = req.query || {};
    const limit   = Math.min(Number(q.limit || 50), 200);
    const from    = q.from || null;
    const to      = q.to   || null;
    const noRem   = q.reminders === '0';

    // Events
    let evWhere = 'WHERE vehicle_id=?';
    const evArgs = [vehicleId];
    if (from) { evWhere += ' AND event_date >= ?'; evArgs.push(from); }
    if (to)   { evWhere += ' AND event_date <= ?'; evArgs.push(to); }

    const events = db.prepare(`
      SELECT 'event' AS item_type, id, type, event_date AS item_date,
             data, retroactive, source, author_id
      FROM events ${evWhere}
    `).all(...evArgs);

    // Reminders (active only, sorted by due_date)
    let items = events.map(e => ({
      item_type:  'event',
      id:         e.id,
      type:       e.type,
      item_date:  e.item_date,
      data:       e.data,
      retroactive: e.retroactive,
      source:     e.source,
    }));

    if (!noRem) {
      let remWhere = 'WHERE vehicle_id=? AND done=0';
      const remArgs = [vehicleId];
      if (from) { remWhere += ' AND due_date >= ?'; remArgs.push(from); }
      if (to)   { remWhere += ' AND due_date <= ?'; remArgs.push(to); }

      const reminders = db.prepare(`
        SELECT 'reminder' AS item_type, id, title, due_date AS item_date, due_mileage_km
        FROM reminders ${remWhere} AND due_date IS NOT NULL
      `).all(...remArgs);

      reminders.forEach(r => items.push({
        item_type: 'reminder',
        id: r.id,
        type: 'reminder',
        item_date: r.item_date,
        title: r.title,
        due_mileage_km: r.due_mileage_km,
      }));
    }

    // Sort by date DESC, limit
    items.sort((a, b) => (b.item_date || '').localeCompare(a.item_date || ''));
    const sliced = items.slice(0, limit);

    res.json(200, { timeline: sliced, total: items.length, limit });
  });

  // Poslednja poznata kilometraža (iz svih evenata koji imaju data.mileage_km)
  router.get('/vehicles/:id/mileage', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.id);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const row = db.prepare(`
      SELECT id AS event_id, type AS event_type, event_date,
             CAST(json_extract(data, '$.mileage_km') AS INTEGER) AS mileage_km
      FROM events
      WHERE vehicle_id=?
        AND json_extract(data, '$.mileage_km') IS NOT NULL
        AND CAST(json_extract(data, '$.mileage_km') AS INTEGER) > 0
      ORDER BY event_date DESC, id DESC
      LIMIT 1
    `).get(vehicleId);

    if (!row) return res.json(200, { mileage_km: null, event_date: null, event_id: null, event_type: null });
    res.json(200, row);
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
    const type   = q.type  || null;
    const since  = q.since || null;
    const appFilter = q.app || null;

    const conds = ['vehicle_id=?'];
    const baseArgs = [vehicleId];
    if (type)      { conds.push('type=?');                   baseArgs.push(type); }
    if (since)     { conds.push('e.created_at>datetime(?)'); baseArgs.push(since); }
    if (appFilter) { conds.push('e.app=?');                  baseArgs.push(appFilter); }

    const whereClause = 'WHERE ' + conds.join(' AND ');

    const events = db.prepare(`
      SELECT e.*, u.name AS author_name
      FROM events e JOIN users u ON e.author_id = u.id
      ${whereClause}
      ORDER BY event_date DESC
      LIMIT ? OFFSET ?
    `).all(...baseArgs, limit, offset);

    const total = db.prepare(`SELECT COUNT(*) AS n FROM events e ${whereClause}`)
      .get(...baseArgs).n;

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
