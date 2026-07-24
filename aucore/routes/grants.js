const { requireAuth } = require('../auth');
const { getDb } = require('../db');
const { grant, revoke, getGrants, hasAccess, ROLES } = require('../permissions');

module.exports = function grantRoutes(router) {
  router.post('/grants', (req, res, body) => {
    const user = requireAuth(req);
    const { grantee_email, vehicle_id, role, expires_in_days } = body;

    if (!grantee_email || !vehicle_id || !role) return res.json(400, { error: 'grantee_email, vehicle_id, role obavezni' });
    if (!ROLES.includes(role)) return res.json(400, { error: `Uloga mora biti: ${ROLES.join(', ')}` });

    const db = getDb();
    if (!hasAccess(user.id, Number(vehicle_id), 'write')) return res.json(403, { error: 'Nemaš pristup vozilu' });

    const grantee = db.prepare('SELECT id FROM users WHERE email=?').get(grantee_email.toLowerCase().trim());
    if (!grantee) return res.json(404, { error: 'Korisnik nije pronađen' });

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 86400 * 1000).toISOString()
      : null;

    const id = grant(user.id, grantee.id, Number(vehicle_id), role, expiresAt);
    res.json(201, { id });
  });

  router.delete('/grants', (req, res, body) => {
    const user = requireAuth(req);
    const { grantee_email, vehicle_id } = body;
    if (!grantee_email || !vehicle_id) return res.json(400, { error: 'grantee_email i vehicle_id obavezni' });

    const db = getDb();
    const grantee = db.prepare('SELECT id FROM users WHERE email=?').get(grantee_email.toLowerCase().trim());
    if (!grantee) return res.json(404, { error: 'Korisnik nije pronađen' });

    const ok = revoke(user.id, grantee.id, Number(vehicle_id));
    res.json(200, { ok });
  });

  // Svi grantovi gde je trenutni user grantee
  router.get('/grants/mine', (req, res) => {
    const user = requireAuth(req);
    const db = getDb();
    const now = new Date().toISOString();

    const grants = db.prepare(`
      SELECT g.id, g.vehicle_id, g.role, g.expires_at, g.created_at,
             v.make, v.model, v.year, v.plate,
             u.name AS grantor_name, u.email AS grantor_email
      FROM grants g
      JOIN vehicles v ON g.vehicle_id = v.id
      JOIN users u ON g.grantor_id = u.id
      WHERE g.grantee_id=? AND g.revoked_at IS NULL
        AND (g.expires_at IS NULL OR g.expires_at > ?)
      ORDER BY g.created_at DESC
    `).all(user.id, now);

    res.json(200, { grants });
  });

  router.get('/vehicles/:id/grants', (req, res, _, params) => {
    const user = requireAuth(req);
    const id = Number(params.id);
    if (!hasAccess(user.id, id, 'read')) return res.json(403, { error: 'Nemaš pristup' });
    res.json(200, getGrants(id));
  });
};
