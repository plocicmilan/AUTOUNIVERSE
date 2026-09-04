const { requireAuth } = require('../auth');
const { getDb, audit, getTierLimits } = require('../db');
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
        (SELECT COUNT(*) FROM reminders WHERE vehicle_id=v.id AND done=0) AS active_reminders_count,
        (SELECT id FROM vehicle_photos WHERE vehicle_id=v.id ORDER BY created_at LIMIT 1) AS cover_photo_id
      FROM vehicles v WHERE owner_id=?
    `).all(user.id);

    const shared = db.prepare(`
      SELECT v.*, g.role AS my_role,
        (SELECT COUNT(*) FROM events WHERE vehicle_id=v.id) AS event_count,
        (SELECT MAX(event_date) FROM events WHERE vehicle_id=v.id) AS last_event_date,
        (SELECT COUNT(*) FROM reminders WHERE vehicle_id=v.id AND done=0) AS active_reminders_count,
        (SELECT id FROM vehicle_photos WHERE vehicle_id=v.id ORDER BY created_at LIMIT 1) AS cover_photo_id
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

    // Tier enforcement: Free = max 1 vozilo
    const limits = getTierLimits(user.subscription_tier);
    const owned = db.prepare('SELECT COUNT(*) AS n FROM vehicles WHERE owner_id=? AND status != ?').get(user.id, 'deleted').n;
    if (owned >= limits.vehicles) {
      return res.json(403, {
        error: 'tier_limit',
        message: `${limits.label} nalog dozvoljava maksimum ${limits.vehicles} vozilo. Nadogradi nalog za više.`,
        current_tier: user.subscription_tier,
        vehicle_limit: limits.vehicles,
        vehicle_count: owned,
      });
    }

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
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    db.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    audit('vehicle.update', { userId: user.id, entity: 'vehicle', entityId: id, detail: { fields: sets.map(s => s.split(' ')[0]) } });
    res.json(200, { ok: true });
  });

  router.get('/vehicles/:id/export', (req, res, _, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    if (!hasAccess(user.id, id, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(id);
    if (!vehicle) return res.json(404, { error: 'Ne postoji' });

    const events   = db.prepare('SELECT * FROM events WHERE vehicle_id=? ORDER BY event_date DESC').all(id);
    const reminders = db.prepare('SELECT * FROM reminders WHERE vehicle_id=? ORDER BY due_date ASC').all(id);
    const notes    = db.prepare(
      vehicle.owner_id === user.id
        ? 'SELECT * FROM owner_notes WHERE vehicle_id=? ORDER BY created_at DESC'
        : 'SELECT * FROM owner_notes WHERE vehicle_id=? AND visibility=\'shared\' ORDER BY created_at DESC'
    ).all(id);
    const grants   = db.prepare(`
      SELECT g.*, u.name AS grantee_name, u.email AS grantee_email
      FROM grants g JOIN users u ON g.grantee_id = u.id
      WHERE g.vehicle_id=? AND (g.expires_at IS NULL OR g.expires_at > ?)
    `).all(id, new Date().toISOString());

    res.json(200, {
      exported_at:  new Date().toISOString(),
      vehicle,
      events,
      reminders,
      notes,
      grants,
      summary: {
        event_count:    events.length,
        reminder_count: reminders.length,
        note_count:     notes.length,
        grant_count:    grants.length,
      }
    });
  });

  // POST /vehicles/:id/transfer — prodavac trigeruje prodaju, mehaničari dobijaju notifikaciju
  router.post('/vehicles/:id/transfer', (req, res, body, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    const db = getDb();

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(id);
    if (!vehicle) return res.json(404, { error: 'Ne postoji' });
    if (vehicle.owner_id !== user.id) return res.json(403, { error: 'Samo vlasnik može pokrenuti transfer' });
    if (vehicle.status === 'sold') return res.json(400, { error: 'Vozilo je već prodato' });

    const { sold_at } = body;
    const vName = `${vehicle.make} ${vehicle.model}${vehicle.year ? ' ' + vehicle.year : ''}`;

    // Svi korisnici koji su ikad imali grant na ovo vozilo (mehaničari, ne vlasnik)
    const mechanics = db.prepare(`
      SELECT DISTINCT g.grantee_id, u.name
      FROM grants g JOIN users u ON u.id = g.grantee_id
      WHERE g.vehicle_id = ? AND g.grantee_id != ?
    `).all(id, user.id);

    db.transaction(() => {
      db.prepare(`UPDATE vehicles SET status='sold', sold_at=? WHERE id=?`).run(
        sold_at || new Date().toISOString().slice(0, 10), id
      );

      const ins = db.prepare(`
        INSERT INTO notifications (recipient_user_id, category, priority, title, body, metadata)
        VALUES (?, 'lead', 'normal', ?, ?, ?)
      `);
      for (const m of mechanics) {
        ins.run(
          m.grantee_id,
          `Vozilo ${vName} je prodato`,
          `${vName} koje si servisirao/la je prodato. Novi vlasnik možda traži pouzdan servis — budi spreman.`,
          JSON.stringify({ vehicle_id: id, vehicle_name: vName })
        );
      }
    })();

    audit('vehicle.transfer', { userId: user.id, entity: 'vehicle', entityId: id,
      detail: { mechanics_notified: mechanics.length, sold_at } });

    res.json(200, { ok: true, vehicle_status: 'sold', mechanics_notified: mechanics.length });
  });

  /* ─── Batch sync (Faza 5b) ───
     POST /vehicles/sync
     Body: { vehicles: [{local_id, server_id?, make, model, year, plate, vin, status, updated_at}], last_pull? }
     Radi za sve tier-ove; Free korisnici sync-uju samo 1 vozilo (isti limit kao POST /vehicles)
  */
  router.post('/vehicles/sync', (req, res, body) => {
    const user = requireAuth(req);
    const db   = getDb();
    const limits  = getTierLimits(user.subscription_tier);
    const now     = new Date().toISOString();
    const syncAt  = now;

    const incoming = Array.isArray(body.vehicles) ? body.vehicles : [];
    const lastPull = body.last_pull || null;

    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (owner_id, make, model, year, plate, vin, status, updated_at)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    const updateVehicle = db.prepare(`
      UPDATE vehicles SET make=?, model=?, year=?, plate=?, vin=?, status=?, updated_at=?
      WHERE id=? AND owner_id=?
    `);
    const findByVin    = db.prepare('SELECT * FROM vehicles WHERE vin=? AND owner_id=?');
    const findById     = db.prepare('SELECT * FROM vehicles WHERE id=? AND owner_id=?');
    const countOwned   = () => db.prepare("SELECT COUNT(*) AS n FROM vehicles WHERE owner_id=? AND status != 'deleted'").get(user.id).n;

    const merged = [];

    for (const v of incoming) {
      const localId    = v.local_id || null;
      const clientDate = v.updated_at || now;
      const make  = (v.make  || '').trim() || '?';
      const model = (v.model || '').trim() || '?';
      const year  = v.year   ? Number(v.year)  : null;
      const plate = v.plate  ? String(v.plate).trim() : null;
      const vin   = v.vin    ? String(v.vin).trim().toUpperCase() : null;
      const status = v.status || 'active';

      let existing = null;

      // 1. Traži po server_id ako je dat
      if (v.server_id) {
        existing = findById.get(Number(v.server_id));
      }
      // 2. Fallback: traži po VIN ako postoji
      if (!existing && vin) {
        existing = findByVin.get(vin, user.id);
      }

      if (existing) {
        // Last-write-wins: ažuriraj samo ako je klijent noviji
        if (clientDate > (existing.updated_at || '')) {
          updateVehicle.run(make, model, year, plate, vin, status, clientDate, existing.id, user.id);
          merged.push({ local_id: localId, server_id: existing.id, action: 'updated', updated_at: clientDate });
        } else {
          merged.push({ local_id: localId, server_id: existing.id, action: 'skipped', updated_at: existing.updated_at });
        }
      } else {
        // Novo vozilo — provjeri tier limit
        if (countOwned() >= limits.vehicles) {
          merged.push({
            local_id: localId, server_id: null, action: 'rejected',
            reason: 'tier_limit', vehicle_limit: limits.vehicles,
          });
          continue;
        }
        const result = insertVehicle.run(user.id, make, model, year, plate, vin, status, clientDate);
        audit('vehicle.sync_create', { userId: user.id, entity: 'vehicle', entityId: result.lastInsertRowid, detail: { make, model } });
        merged.push({ local_id: localId, server_id: result.lastInsertRowid, action: 'created', updated_at: clientDate });
      }
    }

    // Vozila sa servera koja klijent treba (novija od last_pull, ili sva ako last_pull null)
    const fromServer = lastPull
      ? db.prepare("SELECT * FROM vehicles WHERE owner_id=? AND updated_at > ? AND status != 'deleted'").all(user.id, lastPull)
      : db.prepare("SELECT * FROM vehicles WHERE owner_id=? AND status != 'deleted'").all(user.id);

    res.json(200, { merged, from_server: fromServer, sync_at: syncAt });
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
