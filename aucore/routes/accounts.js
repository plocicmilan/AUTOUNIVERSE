/* AU Core — Accounts: lagana registracija (email + phone, bez password-a)
   POST /accounts/register  → email capture, šalje welcome+verify email
   GET  /accounts/verify/:token → potvrda emaila, HTML stranica              */

const crypto = require('crypto');
const { getDb, audit, getTierLimits } = require('../db');
const { requireAuth } = require('../auth');
const { send, tplWelcome } = require('../email');
const { fmtBytes } = require('../lib/tiers');
const cfg = require('../config');

const VERIFY_HOURS = 48;

module.exports = function (router) {

  /* ── Profil sa tier info i limitima ── */
  router.get('/accounts/me', (req, res) => {
    const user = requireAuth(req);
    const db = getDb();

    const fullUser = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    if (!fullUser) return res.json(404, { error: 'Korisnik ne postoji' });

    const tier = fullUser.subscription_tier || 'free';
    const limits = getTierLimits(tier);
    const vehicleCount = db.prepare(
      "SELECT COUNT(*) AS n FROM vehicles WHERE owner_id=? AND status != 'deleted'"
    ).get(user.id).n;

    res.json(200, {
      id:    fullUser.id,
      email: fullUser.email,
      name:  fullUser.name,
      phone: fullUser.phone || null,
      role:  fullUser.role,
      tier,
      tier_label:      limits.label,
      vehicle_count:   vehicleCount,
      vehicle_limit:   limits.vehicles,
      cloud_sync:      limits.cloud_sync,
      at_limit:        vehicleCount >= limits.vehicles,
      subscription_expires_at: fullUser.subscription_expires_at || null,
      created_at:      fullUser.created_at,
      last_login_at:   fullUser.last_login_at || null,
    });
  });

  /* ── Storage info za Hub UI ── */
  router.get('/accounts/me/storage', (req, res) => {
    const user = requireAuth(req);
    const db = getDb();

    const fullUser = db.prepare('SELECT subscription_tier, tier FROM users WHERE id=?').get(user.id);
    const tier = fullUser?.subscription_tier || fullUser?.tier || 'free';
    const limits = getTierLimits(tier);

    const vehicleCount = db.prepare(
      "SELECT COUNT(*) AS n FROM vehicles WHERE owner_id=? AND status != 'deleted'"
    ).get(user.id).n;

    const photoBytes = db.prepare(
      'SELECT COALESCE(SUM(size_bytes),0) AS n FROM vehicle_photos WHERE user_id=?'
    ).get(user.id)?.n || 0;
    const docBytes = db.prepare(
      'SELECT COALESCE(SUM(size_bytes),0) AS n FROM vehicle_documents WHERE user_id=?'
    ).get(user.id)?.n || 0;
    const storageBytes = photoBytes + docBytes;

    res.json(200, {
      tier,
      tier_label: limits.label,
      usage: {
        vehicles:      vehicleCount,
        storage_bytes: storageBytes,
        storage_fmt:   fmtBytes(storageBytes),
      },
      limits: {
        vehicles:      limits.vehicles,
        storage_bytes: limits.bytes,
        storage_fmt:   fmtBytes(limits.bytes),
        cloud_sync:    limits.cloud_sync,
      },
      at_vehicle_limit: vehicleCount >= limits.vehicles,
    });
  });

  /* ── Registracija ── */
  router.post('/accounts/register', async (req, res, body) => {
    const email = (body.email || '').toLowerCase().trim();
    const name  = (body.name  || '').trim();
    const phone = (body.phone || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.json(400, { error: 'Nevažeći email' });
    }

    const db = getDb();

    // Provera duplikata
    const existing = db.prepare('SELECT id, email_verified FROM users WHERE email=?').get(email);
    if (existing) {
      if (existing.email_verified) return res.json(409, { error: 'Email već registrovan' });
      // Ponovo šalje verify ako nije verifikovao
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(existing.id);
      const verifyUrl = buildVerifyUrl(user.verification_token);
      await send({ to: email, subject: 'Potvrdi email — AutoUniverse', html: tplWelcome(user.name, verifyUrl) });
      return res.json(200, { ok: true, resent: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + VERIFY_HOURS * 3600 * 1000).toISOString();
    // Placeholder password (sha256 od tokena — ne može se koristiti za login dok ne postavi pravi)
    const placeholder = crypto.createHash('sha256').update(token).digest('hex');

    const result = db.prepare(`
      INSERT INTO users (email, password, name, phone, role, status, email_verified, verification_token, drip_step)
      VALUES (?, ?, ?, ?, 'user', 'pending', 0, ?, 0)
    `).run(email, placeholder, name || email.split('@')[0], phone || null, token);

    audit('accounts.register', { userId: result.lastInsertRowid, entity: 'user', entityId: result.lastInsertRowid, detail: { email } });

    const verifyUrl = buildVerifyUrl(token);
    await send({ to: email, subject: 'Dobrodošli u AutoUniverse — potvrdi email', html: tplWelcome(name, verifyUrl) });

    return res.json(201, { ok: true });
  });

  /* ── Email verifikacija ── */
  router.get('/accounts/verify/:token', async (req, res, body, params) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE verification_token=?').get(params.token);

    if (!user) {
      return res.html(400, verifyPage(false, 'Link nije važeći ili je istekao.'));
    }

    db.prepare(`
      UPDATE users SET email_verified=1, verification_token=NULL, status='active',
                       drip_step=1, drip_sent_at=datetime('now')
      WHERE id=?
    `).run(user.id);

    audit('accounts.verify', { userId: user.id, entity: 'user', entityId: user.id });

    return res.html(200, verifyPage(true, user.name || user.email));
  });

};

function buildVerifyUrl(token) {
  const base = cfg.HUB_BASE_URL.replace(/\/$/, '');
  return `${base}/accounts/verify/${token}`;
}

function verifyPage(ok, nameOrMsg) {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (ok) {
    return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email potvrđen — AutoUniverse</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
  .box{background:#fff;border-radius:12px;padding:40px 32px;max-width:400px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .ico{font-size:56px;margin-bottom:16px}
  h1{font-size:22px;color:#1E8A4C;margin:0 0 10px}
  p{color:#555;line-height:1.6;margin:0 0 20px}
  a{display:inline-block;background:#D5281B;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700}
</style></head><body>
<div class="box">
  <div class="ico">✅</div>
  <h1>Email potvrđen!</h1>
  <p>Zdravo <b>${esc(nameOrMsg)}</b>,<br>tvoj AutoUniverse nalog je aktivan.</p>
  <a href="https://hub.autouniverse.rs/">Otvori AutoUniverse Hub</a>
</div>
</body></html>`;
  } else {
    return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Greška — AutoUniverse</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
  .box{background:#fff;border-radius:12px;padding:40px 32px;max-width:400px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.1)}
  .ico{font-size:56px;margin-bottom:16px}
  h1{font-size:22px;color:#B3261E;margin:0 0 10px}
  p{color:#555;line-height:1.6;margin:0}
</style></head><body>
<div class="box">
  <div class="ico">❌</div>
  <h1>Link nije važeći</h1>
  <p>${esc(nameOrMsg)}</p>
</div>
</body></html>`;
  }
}
