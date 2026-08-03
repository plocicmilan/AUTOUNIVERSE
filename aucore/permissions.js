const { getDb, audit } = require('./db');

const ROLES = ['read', 'write', 'write-tires-only', 'admin'];

function grant(grantorId, granteeId, vehicleId, role, expiresAt = null) {
  if (!ROLES.includes(role)) throw new Error(`Nepoznata uloga: ${role}`);
  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM grants WHERE grantor_id=? AND grantee_id=? AND vehicle_id=?'
  ).get(grantorId, granteeId, vehicleId);

  if (existing) {
    db.prepare(
      'UPDATE grants SET role=?, expires_at=? WHERE id=?'
    ).run(role, expiresAt, existing.id);
    audit('grant.update', { userId: grantorId, entity: 'grant', entityId: existing.id, detail: { granteeId, vehicleId, role, expiresAt } });
    return existing.id;
  }

  const result = db.prepare(
    'INSERT INTO grants (grantor_id, grantee_id, vehicle_id, role, expires_at) VALUES (?,?,?,?,?)'
  ).run(grantorId, granteeId, vehicleId, role, expiresAt);

  audit('grant.create', { userId: grantorId, entity: 'grant', entityId: result.lastInsertRowid, detail: { granteeId, vehicleId, role, expiresAt } });
  return result.lastInsertRowid;
}

function revoke(grantorId, granteeId, vehicleId) {
  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM grants WHERE grantor_id=? AND grantee_id=? AND vehicle_id=?'
  ).get(grantorId, granteeId, vehicleId);

  if (!existing) return false;

  db.prepare('DELETE FROM grants WHERE id=?').run(existing.id);
  audit('grant.revoke', { userId: grantorId, entity: 'grant', entityId: existing.id, detail: { granteeId, vehicleId } });
  return true;
}

function hasAccess(userId, vehicleId, requiredRole = 'read') {
  const db = getDb();
  const now = new Date().toISOString();

  const vehicle = db.prepare('SELECT owner_id FROM vehicles WHERE id=?').get(vehicleId);
  if (!vehicle) return false;
  if (vehicle.owner_id === userId) return true;

  const g = db.prepare(`
    SELECT role FROM grants
    WHERE grantee_id=? AND vehicle_id=?
    AND (expires_at IS NULL OR expires_at > ?)
  `).get(userId, vehicleId, now);

  if (!g) return false;
  return roleCovers(g.role, requiredRole);
}

function getGrants(vehicleId) {
  const db = getDb();
  const now = new Date().toISOString();
  return db.prepare(`
    SELECT g.*, u.name AS grantee_name, u.email AS grantee_email
    FROM grants g JOIN users u ON g.grantee_id = u.id
    WHERE g.vehicle_id=? AND (g.expires_at IS NULL OR g.expires_at > ?)
  `).all(vehicleId, now);
}

function roleCovers(grantedRole, requiredRole) {
  const hierarchy = { 'read': 0, 'write-tires-only': 1, 'write': 2, 'admin': 3 };
  return (hierarchy[grantedRole] ?? -1) >= (hierarchy[requiredRole] ?? 999);
}

module.exports = { grant, revoke, hasAccess, getGrants, ROLES };
