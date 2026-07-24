const { requireAdmin } = require('../auth');
const { getDb } = require('../db');

module.exports = function adminRoutes(router) {
  router.get('/admin/briefing', (req, res) => {
    const user = requireAdmin(req);
    const db = getDb();

    const stats = {
      users:    db.prepare("SELECT COUNT(*) AS n FROM users WHERE status='active'").get().n,
      pending:  db.prepare("SELECT COUNT(*) AS n FROM users WHERE status='pending'").get().n,
      vehicles: db.prepare('SELECT COUNT(*) AS n FROM vehicles').get().n,
      grants:   db.prepare('SELECT COUNT(*) AS n FROM grants WHERE expires_at IS NULL OR expires_at > ?').get(new Date().toISOString()).n,
      events:   db.prepare('SELECT COUNT(*) AS n FROM events').get().n,
    };

    const recent_audit = db.prepare(`
      SELECT a.*, u.email AS user_email
      FROM audit_log a LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 20
    `).all();

    const pending_users = db.prepare(
      "SELECT id, email, name, created_at FROM users WHERE status='pending' ORDER BY created_at ASC"
    ).all();

    const active_grants = db.prepare(`
      SELECT g.*, u1.email AS grantor_email, u2.email AS grantee_email, v.make, v.model
      FROM grants g
      JOIN users u1 ON g.grantor_id = u1.id
      JOIN users u2 ON g.grantee_id = u2.id
      JOIN vehicles v ON g.vehicle_id = v.id
      WHERE g.expires_at IS NULL OR g.expires_at > ?
      ORDER BY g.created_at DESC
    `).all(new Date().toISOString());

    res.json(200, {
      as_of:   new Date().toISOString(),
      uptime_s: Math.floor(process.uptime()),
      version: require('../package.json').version,
      stats,
      pending_users,
      recent_audit,
      active_grants,
    });
  });

  router.get('/admin/audit', (req, res) => {
    requireAdmin(req);
    const db = getDb();
    const q = req.query || {};
    const limit  = Math.min(Number(q.limit  || 50), 200);
    const offset = Number(q.offset || 0);
    const rows = db.prepare(`
      SELECT a.*, u.email AS user_email
      FROM audit_log a LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) AS n FROM audit_log').get().n;
    res.json(200, { rows, total, limit, offset });
  });

  router.get('/admin/users', (req, res) => {
    requireAdmin(req);
    const db = getDb();
    const users = db.prepare('SELECT id, email, name, phone, role, status, drip_step, last_login_at, created_at FROM users ORDER BY created_at DESC').all();
    res.json(200, users);
  });

  router.get('/admin/users/pending', (req, res) => {
    requireAdmin(req);
    const db = getDb();
    const users = db.prepare("SELECT id, email, name, created_at FROM users WHERE status='pending' ORDER BY created_at ASC").all();
    res.json(200, users);
  });

  router.post('/admin/users/:id/approve', (req, res, _, params) => {
    const admin = requireAdmin(req);
    const db = getDb();
    const user = db.prepare('SELECT id, email, status FROM users WHERE id=?').get(Number(params.id));
    if (!user) return res.json(404, { error: 'Korisnik ne postoji' });
    if (user.status !== 'pending') return res.json(400, { error: 'Korisnik nije u pending statusu' });
    db.prepare("UPDATE users SET status='active' WHERE id=?").run(user.id);
    const { audit } = require('../db');
    audit('user.approve', { userId: admin.id, entity: 'user', entityId: user.id, detail: { email: user.email } });
    res.json(200, { ok: true });
  });

  router.post('/admin/users/:id/reject', (req, res, _, params) => {
    const admin = requireAdmin(req);
    const db = getDb();
    const user = db.prepare('SELECT id, email, status FROM users WHERE id=?').get(Number(params.id));
    if (!user) return res.json(404, { error: 'Korisnik ne postoji' });
    db.prepare("UPDATE users SET status='rejected' WHERE id=?").run(user.id);
    const { audit } = require('../db');
    audit('user.reject', { userId: admin.id, entity: 'user', entityId: user.id, detail: { email: user.email } });
    res.json(200, { ok: true });
  });

  router.post('/admin/users/:id/role', (req, res, body, params) => {
    requireAdmin(req);
    const { role } = body;
    if (!['user', 'admin', 'owner'].includes(role)) return res.json(400, { error: 'Uloga mora biti user, admin ili owner' });
    const db = getDb();
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, Number(params.id));
    res.json(200, { ok: true });
  });

  // GET /admin/notifications?user_id=X&limit=50 — lista notifikacija po korisniku
  router.get('/admin/notifications', (req, res) => {
    requireAdmin(req);
    const db = getDb();
    const q = req.query || {};
    const limit = Math.min(Number(q.limit || 50), 200);
    const user_id = q.user_id ? Number(q.user_id) : null;

    const where = user_id ? 'WHERE n.recipient_user_id=?' : '';
    const args  = user_id ? [user_id, limit] : [limit];

    const rows = db.prepare(`
      SELECT n.*, u.name AS recipient_name, u.email AS recipient_email
      FROM notifications n JOIN users u ON n.recipient_user_id = u.id
      ${where}
      ORDER BY n.created_at DESC LIMIT ?
    `).all(...args);

    res.json(200, rows);
  });

  // GET /admin/drip/preview — prikaži koji korisnici čekaju sledeći drip korak (bez slanja)
  router.get('/admin/drip/preview', async (req, res) => {
    requireAdmin(req);
    const { runDrip } = require('../drip');
    const results = await runDrip(true);
    const db = getDb();
    const allUsers = db.prepare(
      'SELECT id, email, drip_step, drip_sent_at FROM users WHERE email_verified=1 ORDER BY drip_sent_at ASC'
    ).all();
    res.json(200, { pending: results, all_verified_users: allUsers });
  });

  // POST /admin/drip/run — pokreni drip scheduler odmah (šalje stvarne emailove)
  router.post('/admin/drip/run', async (req, res) => {
    requireAdmin(req);
    const { runDrip } = require('../drip');
    const results = await runDrip(false);
    res.json(200, { ok: true, sent: results.length, results });
  });

  // GET /admin/drip/overdue — pregled zakasnelih podsetnika (bez slanja)
  router.get('/admin/drip/overdue', (req, res) => {
    requireAdmin(req);
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`
      SELECT r.id, r.vehicle_id, r.title, r.due_date, r.done,
             v.owner_id, v.make, v.model,
             u.email AS owner_email
      FROM reminders r
      JOIN vehicles v ON r.vehicle_id = v.id
      JOIN users u ON v.owner_id = u.id
      WHERE r.done=0 AND r.due_date IS NOT NULL AND r.due_date < ?
      ORDER BY r.due_date ASC
    `).all(today);
    res.json(200, { count: rows.length, reminders: rows });
  });

  // POST /admin/drip/check-reminders — okida overdue notifikacije odmah
  router.post('/admin/drip/check-reminders', (req, res) => {
    requireAdmin(req);
    const { checkOverdueReminders } = require('../drip');
    const count = checkOverdueReminders();
    res.json(200, { ok: true, notified: count });
  });
};
