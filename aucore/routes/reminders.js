const { requireAuth } = require('../auth');
const { getDb, audit } = require('../db');
const { hasAccess } = require('../permissions');

module.exports = function reminderRoutes(router) {
  // Kreiraj podsetnik
  router.post('/vehicles/:vid/reminders', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    if (!hasAccess(user.id, vehicleId, 'write')) return res.json(403, { error: 'Nemaš pristup' });

    const { title, due_date, due_mileage_km } = body;
    if (!title || !title.trim()) return res.json(400, { error: 'title je obavezan' });
    if (!due_date && !due_mileage_km) return res.json(400, { error: 'due_date ili due_mileage_km je obavezan' });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO reminders (vehicle_id, author_id, title, due_date, due_mileage_km)
      VALUES (?,?,?,?,?)
    `).run(vehicleId, user.id, title.trim(), due_date ?? null, due_mileage_km ? Number(due_mileage_km) : null);

    audit('reminder.create', { userId: user.id, entity: 'reminder', entityId: result.lastInsertRowid, detail: { vehicleId } });
    res.json(201, { id: result.lastInsertRowid });
  });

  // Lista podsetnika
  router.get('/vehicles/:vid/reminders', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);

    const db = getDb();
    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    if (!vehicle) return res.json(404, { error: 'Vozilo ne postoji' });
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const isOwner = vehicle.owner_id === user.id;
    const q = req.query || {};
    const showDone = q.done === '1';

    const rows = db.prepare(`
      SELECT r.*, u.name AS author_name
      FROM reminders r JOIN users u ON r.author_id = u.id
      WHERE r.vehicle_id=? ${showDone ? '' : 'AND r.done=0'}
      ORDER BY r.done ASC, r.due_date ASC NULLS LAST, r.due_mileage_km ASC NULLS LAST
    `).all(vehicleId);

    res.json(200, { reminders: rows, total: rows.length });
  });

  // Ažuriraj podsetnik
  router.put('/vehicles/:vid/reminders/:rid', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    const remId = Number(params.rid);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const rem = db.prepare('SELECT * FROM reminders WHERE id=? AND vehicle_id=?').get(remId, vehicleId);
    if (!rem) return res.json(404, { error: 'Podsetnik ne postoji' });

    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    if (rem.author_id !== user.id && vehicle.owner_id !== user.id) return res.json(403, { error: 'Nemaš pravo izmene' });

    const sets = [], vals = [];
    if (body.title !== undefined) { sets.push('title=?'); vals.push(body.title.trim()); }
    if (body.due_date !== undefined) { sets.push('due_date=?'); vals.push(body.due_date || null); }
    if (body.due_mileage_km !== undefined) { sets.push('due_mileage_km=?'); vals.push(body.due_mileage_km ? Number(body.due_mileage_km) : null); }
    if (body.done !== undefined) {
      sets.push('done=?');
      vals.push(body.done ? 1 : 0);
      sets.push('done_at=?');
      vals.push(body.done ? new Date().toISOString() : null);
    }
    if (sets.length === 0) return res.json(400, { error: 'Nema polja za ažuriranje' });

    vals.push(remId);
    db.prepare(`UPDATE reminders SET ${sets.join(', ')} WHERE id=?`).run(...vals);
    audit('reminder.update', { userId: user.id, entity: 'reminder', entityId: remId });
    res.json(200, { ok: true });
  });

  // Briši podsetnik
  router.delete('/vehicles/:vid/reminders/:rid', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    const remId = Number(params.rid);

    const db = getDb();
    const rem = db.prepare('SELECT * FROM reminders WHERE id=? AND vehicle_id=?').get(remId, vehicleId);
    if (!rem) return res.json(404, { error: 'Podsetnik ne postoji' });

    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    if (rem.author_id !== user.id && vehicle.owner_id !== user.id) return res.json(403, { error: 'Nemaš pravo brisanja' });

    db.prepare('DELETE FROM reminders WHERE id=?').run(remId);
    audit('reminder.delete', { userId: user.id, entity: 'reminder', entityId: remId });
    res.json(200, { ok: true });
  });
};
