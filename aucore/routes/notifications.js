/* AU Core — notification routes
   GET  /notifications               → lista za prijavljenog korisnika
   POST /notifications/read/:id      → označi jednu pročitano
   POST /notifications/read-all      → označi sve pročitano
   POST /notifications               → (interni admin) pošalji notifikaciju korisniku
*/

const { requireAuth } = require('../auth');
const { getDb } = require('../db');

const MAX_FETCH = 50;

module.exports = function notificationRoutes(router) {

  /* ── GET /notifications ────────────────────────────────────────────── */
  router.get('/notifications', (req, res) => {
    const user = requireAuth(req);
    const db   = getDb();
    const q    = req.query || {};
    const limit  = Math.min(Number(q.limit  || 20), MAX_FETCH);
    const offset = Number(q.offset || 0);
    const unread_only = q.unread === '1';

    const where = unread_only
      ? 'WHERE recipient_user_id=? AND read_at IS NULL AND (expires_at IS NULL OR expires_at > datetime(\'now\'))'
      : 'WHERE recipient_user_id=? AND (expires_at IS NULL OR expires_at > datetime(\'now\'))';

    const rows = db.prepare(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(user.id, limit, offset);

    const unread = db.prepare(
      'SELECT COUNT(*) AS n FROM notifications WHERE recipient_user_id=? AND read_at IS NULL'
    ).get(user.id).n;

    res.json(200, { notifications: rows, unread, limit, offset });
  });

  /* ── POST /notifications/read-all ──────────────────────────────────── */
  router.post('/notifications/read-all', (req, res) => {
    const user = requireAuth(req);
    const db   = getDb();
    db.prepare(
      "UPDATE notifications SET read_at=datetime('now') WHERE recipient_user_id=? AND read_at IS NULL"
    ).run(user.id);
    res.json(200, { ok: true });
  });

  /* ── POST /notifications/read/:id ──────────────────────────────────── */
  router.post('/notifications/read/:id', (req, res, _, params) => {
    const user = requireAuth(req);
    const db   = getDb();
    const notif = db.prepare('SELECT * FROM notifications WHERE id=?').get(Number(params.id));
    if (!notif) return res.json(404, { error: 'Notifikacija ne postoji' });
    if (notif.recipient_user_id !== user.id) return res.json(403, { error: 'Nemaš pristup' });
    db.prepare("UPDATE notifications SET read_at=datetime('now') WHERE id=?").run(notif.id);
    res.json(200, { ok: true });
  });

  /* ── DELETE /notifications/:id ────────────────────────────────────── */
  router.delete('/notifications/:id', (req, res, _, params) => {
    const user = requireAuth(req);
    const db   = getDb();
    const notif = db.prepare('SELECT * FROM notifications WHERE id=?').get(Number(params.id));
    if (!notif) return res.json(404, { error: 'Notifikacija ne postoji' });
    if (notif.recipient_user_id !== user.id) return res.json(403, { error: 'Nemaš pristup' });
    db.prepare('DELETE FROM notifications WHERE id=?').run(notif.id);
    res.json(200, { ok: true });
  });

  /* ── POST /notifications/clear (briše sve pročitane) ──────────────── */
  router.post('/notifications/clear', (req, res) => {
    const user = requireAuth(req);
    const db   = getDb();
    const { changes } = db.prepare(
      'DELETE FROM notifications WHERE recipient_user_id=? AND read_at IS NOT NULL'
    ).run(user.id);
    res.json(200, { ok: true, deleted: changes });
  });

  /* ── POST /notifications (admin: šalje notifikaciju) ──────────────── */
  router.post('/notifications', (req, res, body) => {
    const user = requireAuth(req);
    if (user.role !== 'admin' && user.role !== 'owner') return res.json(403, { error: 'Samo admin može slati notifikacije' });

    const { recipient_user_id, category, title, body: bodyText, action_url, priority, metadata, expires_at } = body;
    if (!recipient_user_id || !category || !title || !bodyText) {
      return res.json(400, { error: 'recipient_user_id, category, title, body obavezni' });
    }

    const db = getDb();
    const user_exists = db.prepare('SELECT id FROM users WHERE id=?').get(Number(recipient_user_id));
    if (!user_exists) return res.json(404, { error: 'Primalac ne postoji' });

    const result = db.prepare(`
      INSERT INTO notifications (recipient_user_id, category, priority, title, body, action_url, metadata, expires_at)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      Number(recipient_user_id),
      category,
      priority || 'normal',
      title,
      bodyText,
      action_url || null,
      metadata ? JSON.stringify(metadata) : null,
      expires_at || null
    );

    res.json(201, { id: result.lastInsertRowid });
  });
};
