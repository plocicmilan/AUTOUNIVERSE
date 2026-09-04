const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb, audit } = require('./db');

const SESSION_HOURS = 72;
const MAGIC_LINK_MINUTES = 15;   // SPEC 6.3 predlog
const VALID_PURPOSES = ['login', 'register', 'password_reset', 'device_link'];

// Brute-force zaštita: Map<ip, { count, firstAt }>
const LOGIN_ATTEMPTS = new Map();
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000; // 15 minuta

function _checkRateLimit(ip) {
  if (!ip) return;
  const now = Date.now();
  const entry = LOGIN_ATTEMPTS.get(ip);
  if (!entry || (now - entry.firstAt) > WINDOW_MS) {
    LOGIN_ATTEMPTS.set(ip, { count: 1, firstAt: now });
    return;
  }
  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const err = new Error('Previše pokušaja. Pokušaj ponovo za 15 minuta.');
    err.status = 429;
    throw err;
  }
}

function _clearRateLimit(ip) {
  if (ip) LOGIN_ATTEMPTS.delete(ip);
}

function register(email, password, name, phone = null, role = 'user') {
  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  const isFirst = count === 0;
  const actualRole   = isFirst ? 'owner' : role;
  const actualStatus = 'active'; // self-registration, bez admin odobrenja
  const result = db.prepare(
    'INSERT INTO users (email, password, name, phone, role, status) VALUES (?,?,?,?,?,?)'
  ).run(email.toLowerCase().trim(), hash, name.trim(), phone || null, actualRole, actualStatus);
  audit('auth.register', { userId: result.lastInsertRowid, entity: 'user', entityId: result.lastInsertRowid, detail: { status: actualStatus } });
  return { id: result.lastInsertRowid, status: actualStatus };
}

function login(email, password, ip = null) {
  _checkRateLimit(ip); // throws 429 if over limit
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) return null;
  if (user.status === 'pending')  return { error: 'pending' };
  if (user.status === 'rejected') return { error: 'rejected' };

  _clearRateLimit(ip); // uspešan login resetuje brojač
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?,?,?)').run(sessionId, user.id, expiresAt);

  audit('auth.login', { userId: user.id, entity: 'user', entityId: user.id, ip });
  return { sessionId, user: publicUser(user) };
}

function logout(sessionId) {
  const db = getDb();
  const session = db.prepare('SELECT user_id FROM sessions WHERE id=?').get(sessionId);
  if (session) {
    db.prepare('DELETE FROM sessions WHERE id=?').run(sessionId);
    audit('auth.logout', { userId: session.user_id });
  }
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT s.*, u.id AS uid, u.email, u.name, u.role, u.subscription_tier
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.id=? AND s.expires_at > ?
  `).get(sessionId, now);
  if (!row) return null;
  return { id: row.uid, email: row.email, name: row.name, role: row.role, subscription_tier: row.subscription_tier || 'free' };
}

function requireAuth(req) {
  const token = parseBearerToken(req) || parseCookieToken(req);
  const user = getSession(token);
  if (!user) throw Object.assign(new Error('Neautorizovan'), { status: 401 });
  return user;
}

function requireAdmin(req) {
  const user = requireAuth(req);
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw Object.assign(new Error('Zabranjen pristup'), { status: 403 });
  }
  return user;
}

function parseBearerToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

function parseCookieToken(req) {
  const cookie = req.headers['cookie'] || '';
  const match = cookie.match(/session=([a-f0-9]+)/);
  return match ? match[1] : null;
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status };
}

/* ─── Magic-link auth (Todo #125, SPEC 6.1) ─── */

/**
 * Kreira jednokratan magic-link token za dati email.
 * Ne otkriva da li email postoji u bazi (anti-enumeration).
 * @returns { token, expiresAt } — email se salje eksterno preko email.js
 */
function requestMagicLink(email, purpose = 'login') {
  if (!VALID_PURPOSES.includes(purpose)) {
    throw Object.assign(new Error('Nepoznata namena magic-link-a'), { status: 400 });
  }
  const db = getDb();
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized.includes('@')) {
    throw Object.assign(new Error('Nevalidan email'), { status: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO magic_links (token, email, purpose, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, normalized, purpose, expiresAt);

  audit('auth.magic_link.request', { entity: 'magic_link', detail: { email: normalized, purpose } });
  return { token, expiresAt };
}

/**
 * Validira magic-link token i kreira sesiju.
 * - Ako user ne postoji sa tim email-om -> auto-register (samo purpose='register'|'login')
 * - Token je jednokratan (used_at se postavi)
 * @param token, ip?, userAgent?
 * @returns { sessionId, user } ili baca gresku sa status
 */
function verifyMagicLink(token, ip = null, userAgent = null) {
  if (!token || typeof token !== 'string') {
    throw Object.assign(new Error('Token nedostaje'), { status: 400 });
  }
  const db = getDb();
  const now = new Date().toISOString();

  const row = db.prepare(`
    SELECT * FROM magic_links WHERE token = ?
  `).get(token);

  if (!row) throw Object.assign(new Error('Nevalidan token'), { status: 401 });
  if (row.used_at) throw Object.assign(new Error('Token vec iskoriscen'), { status: 401 });
  if (row.expires_at < now) throw Object.assign(new Error('Token je istekao'), { status: 401 });

  // Nadji ili kreiraj usera
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(row.email);
  if (!user) {
    if (row.purpose === 'password_reset') {
      throw Object.assign(new Error('Nalog ne postoji'), { status: 404 });
    }
    // Auto-register bez password-a (magic-link je autentifikacija)
    const placeholder = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);
    const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const result = db.prepare(`
      INSERT INTO users (email, password, name, role, status, email_verified, drip_step, drip_sent_at)
      VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'))
    `).run(row.email, placeholder, row.email.split('@')[0], count === 0 ? 'owner' : 'user', 'active');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    audit('auth.magic_link.register', { userId: user.id, entity: 'user', entityId: user.id });
  } else if (!user.email_verified) {
    // Prvi uspesan magic-link verifikuje email + pokrece drip sekvence
    db.prepare(`
      UPDATE users SET email_verified=1, drip_step=1, drip_sent_at=datetime('now') WHERE id=?
    `).run(user.id);
    user.email_verified = 1;
  }

  // Oznacio kao iskoristen
  db.prepare('UPDATE magic_links SET used_at = ? WHERE token = ?').run(now, token);

  // Kreiraj sesiju sa device tracking-om
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, user.id, expiresAt, ip, userAgent, now);

  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);
  audit('auth.magic_link.verify', { userId: user.id, entity: 'session', detail: { purpose: row.purpose }, ip });

  return { sessionId, user: publicUser(user) };
}

/**
 * Resetuje password koristeći password_reset token iz magic_links.
 * Token mora biti neiskorišten i ne sme biti istekao.
 */
function resetPassword(token, newPassword) {
  if (!token || !newPassword || newPassword.length < 8) {
    throw Object.assign(new Error('Token i password (min 8 znakova) su obavezni'), { status: 400 });
  }
  const db = getDb();
  const now = new Date().toISOString();

  const row = db.prepare('SELECT * FROM magic_links WHERE token = ?').get(token);
  if (!row || row.purpose !== 'password_reset') {
    throw Object.assign(new Error('Nevalidan token'), { status: 401 });
  }
  if (row.used_at)       throw Object.assign(new Error('Token već iskorišten'), { status: 401 });
  if (row.expires_at < now) throw Object.assign(new Error('Token je istekao'), { status: 401 });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(row.email);
  if (!user) throw Object.assign(new Error('Nalog ne postoji'), { status: 404 });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, user.id);
  db.prepare('UPDATE magic_links SET used_at = ? WHERE token = ?').run(now, token);
  // Poništi sve aktivne sesije (sigurnosna mjera)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

  audit('auth.password_reset', { userId: user.id, entity: 'user', entityId: user.id });
  return { ok: true };
}

function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw Object.assign(new Error('Trenutna i nova lozinka (min 8 znakova) su obavezne'), { status: 400 });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw Object.assign(new Error('Korisnik ne postoji'), { status: 404 });
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    throw Object.assign(new Error('Trenutna lozinka nije ispravna'), { status: 401 });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
  audit('auth.password_change', { userId, entity: 'user', entityId: userId });
  return { ok: true };
}

/** Cleanup — brisanje isteklih magic_links. Poziva se periodicno (cron ili on-demand). */
function pruneExpiredMagicLinks() {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare('DELETE FROM magic_links WHERE expires_at < ?').run(now);
  return result.changes;
}

/**
 * Samobrisanje naloga — hard delete sa kaskadama.
 * Zahteva potvrdu trenutne lozinke (password).
 * Vlasnik (role='owner') ne može se obrisati — zaštita od accidental lockout.
 */
function deleteAccount(userId, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) { const e = new Error('Korisnik ne postoji'); e.status = 404; throw e; }
  if (user.role === 'owner') {
    const e = new Error('Owner nalog ne može se obrisati putem self-delete. Kontaktiraj admina.');
    e.status = 403; throw e;
  }
  if (!bcrypt.compareSync(password, user.password)) {
    const e = new Error('Pogrešna lozinka'); e.status = 401; throw e;
  }

  db.transaction(() => {
    // Vozila ovog korisnika — kaskadno brisanje
    const vehicles = db.prepare('SELECT id FROM vehicles WHERE owner_id=?').all(userId);
    for (const v of vehicles) {
      db.prepare('DELETE FROM reminders   WHERE vehicle_id=?').run(v.id);
      db.prepare('DELETE FROM owner_notes WHERE vehicle_id=?').run(v.id);
      db.prepare('DELETE FROM events      WHERE vehicle_id=?').run(v.id);
      db.prepare('DELETE FROM grants      WHERE vehicle_id=?').run(v.id);
      db.prepare('DELETE FROM vehicles    WHERE id=?').run(v.id);
    }
    // Grantovi gde je ovaj user grantee (ili grantor na tuđim vozilima)
    db.prepare('DELETE FROM grants WHERE grantee_id=? OR grantor_id=?').run(userId, userId);
    // Notifikacije
    db.prepare('DELETE FROM notifications WHERE recipient_user_id=?').run(userId);
    // Sesije
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
    // Magic links (keyed by email, not user_id)
    db.prepare('DELETE FROM magic_links WHERE email=?').run(user.email);
    // Audit_log: nullify FK ref pre brisanja (audit_log.user_id je nullable)
    db.prepare('UPDATE audit_log SET user_id=NULL WHERE user_id=?').run(userId);
    // Sami user
    db.prepare('DELETE FROM users WHERE id=?').run(userId);
  })();

  // Audit se piše posle brisanja sa user_id=NULL (user više ne postoji)
  db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (NULL,?,?,?,?)`)
    .run('auth.account_delete', 'user', userId, JSON.stringify({ email: user.email }));

  return true;
}

module.exports = {
  register, login, logout,
  getSession, requireAuth, requireAdmin,
  requestMagicLink, verifyMagicLink, resetPassword, changePassword,
  deleteAccount, pruneExpiredMagicLinks,
  MAGIC_LINK_MINUTES
};
