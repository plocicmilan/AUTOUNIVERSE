/* AU Core — owner_notes routes
   POST   /vehicles/:vid/notes          → dodaj belesku (vlasnik ili write grantee)
   GET    /vehicles/:vid/notes          → lista beleški (vlasnik ili grantee sa read)
   DELETE /vehicles/:vid/notes/:nid     → briši belesku (autor ili vlasnik vozila)
*/

const { requireAuth } = require('../auth');
const { getDb, audit } = require('../db');
const { hasAccess } = require('../permissions');

module.exports = function notesRoutes(router) {

  router.post('/vehicles/:vid/notes', (req, res, body, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    if (!hasAccess(user.id, vehicleId, 'write')) return res.json(403, { error: 'Nemaš pristup' });

    const { content, visibility } = body;
    if (!content || !String(content).trim()) return res.json(400, { error: 'content je obavezan' });

    const vis = ['owner', 'shared'].includes(visibility) ? visibility : 'owner';

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO owner_notes (author_id, vehicle_id, content, visibility) VALUES (?,?,?,?)'
    ).run(user.id, vehicleId, String(content).trim(), vis);

    audit('note.create', { userId: user.id, entity: 'note', entityId: result.lastInsertRowid, detail: { vehicleId } });
    res.json(201, { id: result.lastInsertRowid });
  });

  router.get('/vehicles/:vid/notes', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    if (!hasAccess(user.id, vehicleId, 'read')) return res.json(403, { error: 'Nemaš pristup' });

    const db = getDb();
    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    if (!vehicle) return res.json(404, { error: 'Vozilo ne postoji' });

    const isOwner = vehicle.owner_id === user.id;

    const notes = isOwner
      ? db.prepare(`
          SELECT n.*, u.name AS author_name
          FROM owner_notes n JOIN users u ON n.author_id = u.id
          WHERE n.vehicle_id=?
          ORDER BY n.created_at DESC
        `).all(vehicleId)
      : db.prepare(`
          SELECT n.*, u.name AS author_name
          FROM owner_notes n JOIN users u ON n.author_id = u.id
          WHERE n.vehicle_id=? AND n.visibility='shared'
          ORDER BY n.created_at DESC
        `).all(vehicleId);

    res.json(200, { notes, total: notes.length });
  });

  router.delete('/vehicles/:vid/notes/:nid', (req, res, _, params) => {
    const user = requireAuth(req);
    const vehicleId = Number(params.vid);
    const noteId    = Number(params.nid);

    const db = getDb();
    const note    = db.prepare('SELECT * FROM owner_notes WHERE id=?').get(noteId);
    if (!note)               return res.json(404, { error: 'Beleška ne postoji' });
    if (note.vehicle_id !== vehicleId) return res.json(404, { error: 'Beleška ne pripada ovom vozilu' });

    const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
    const isAuthor  = note.author_id   === user.id;
    const isVehOwner = vehicle?.owner_id === user.id;

    if (!isAuthor && !isVehOwner) return res.json(403, { error: 'Nemaš pravo brisanja' });

    db.prepare('DELETE FROM owner_notes WHERE id=?').run(noteId);
    audit('note.delete', { userId: user.id, entity: 'note', entityId: noteId, detail: { vehicleId } });
    res.json(200, { ok: true });
  });
};
