const { register, login, logout, requireAuth, requestMagicLink, verifyMagicLink, resetPassword, changePassword, MAGIC_LINK_MINUTES } = require('../auth');
const email = require('../email');
const cfg = require('../config');

module.exports = function authRoutes(router) {
  router.post('/auth/register', (req, res, body) => {
    const { email, password, name, phone } = body;
    if (!email || !password || !name) return res.json(400, { error: 'email, password, name obavezni' });
    try {
      const result = register(email, password, name, phone);
      const status = result.status === 'pending' ? 202 : 201;
      res.json(status, { id: result.id, status: result.status });
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.json(409, { error: 'Email već postoji' });
      throw e;
    }
  });

  router.post('/auth/login', (req, res, body) => {
    const { email, password } = body;
    if (!email || !password) return res.json(400, { error: 'email i password obavezni' });
    let result;
    try {
      result = login(email, password, req.socket?.remoteAddress);
    } catch (e) {
      return res.json(e.status || 500, { error: e.message });
    }
    if (!result) return res.json(401, { error: 'Pogrešni kredencijali' });
    if (result.error === 'pending')  return res.json(403, { error: 'Nalog čeka odobrenje admina.' });
    if (result.error === 'rejected') return res.json(403, { error: 'Nalog je odbijen.' });
    res.setHeader('Set-Cookie', `session=${result.sessionId}; HttpOnly; Path=/; Max-Age=${72 * 3600}`);
    res.json(200, { user: result.user, session: result.sessionId });
  });

  router.post('/auth/logout', (req, res) => {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '') ||
      ((req.headers['cookie'] || '').match(/session=([a-f0-9]+)/) || [])[1];
    if (token) logout(token);
    res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
    res.json(200, { ok: true });
  });

  router.get('/auth/me', (req, res) => {
    const user = requireAuth(req);
    res.json(200, user);
  });

  /* ─── Magic-link auth (Todo #125) ─── */

  // Trazi magic-link — telo: { email, purpose?='login' }
  // Vraca 200 uvek (anti-enumeration: ne otkriva da li email postoji)
  router.post('/auth/magic-link', async (req, res, body) => {
    const { email: emailAddr, purpose = 'login' } = body || {};
    if (!emailAddr) return res.json(400, { error: 'email obavezan' });
    try {
      const { token, expiresAt } = requestMagicLink(emailAddr, purpose);
      const verifyUrl = `${cfg.HUB_BASE_URL}/auth/verify?token=${token}`;
      // Salji email (async, ali ne cekamo — anti-timing)
      email.send({
        to: emailAddr,
        subject: 'AutoUniverse — prijava',
        html: tplMagicLink(verifyUrl, purpose, MAGIC_LINK_MINUTES)
      }).catch(e => console.error('[magic-link] email fail:', e.message));
      // Log token u konzoli za dev (dok Brevo domain verify nije gotov, #123)
      console.log(`[magic-link] ${emailAddr} (${purpose}) → ${verifyUrl}`);
      res.json(200, { ok: true, expiresAt });
    } catch (e) {
      const status = e.status || 500;
      res.json(status, { error: e.message });
    }
  });

  /* ─── Forgot / Reset password ─── */

  // POST /auth/forgot — pošalji reset email (anti-enumeration: uvek 200)
  router.post('/auth/forgot', async (req, res, body) => {
    const emailAddr = (body && body.email) ? String(body.email).toLowerCase().trim() : '';
    if (!emailAddr) return res.json(400, { error: 'email obavezan' });
    try {
      const { token, expiresAt } = requestMagicLink(emailAddr, 'password_reset');
      const resetUrl = `${cfg.HUB_BASE_URL}/auth/reset?token=${token}`;
      email.send({
        to: emailAddr,
        subject: 'AutoUniverse — resetuj lozinku',
        html: tplPasswordReset(resetUrl, MAGIC_LINK_MINUTES)
      }).catch(e => console.error('[forgot] email fail:', e.message));
      console.log(`[forgot] ${emailAddr} → ${resetUrl}`);
      res.json(200, { ok: true, expiresAt });
    } catch (e) {
      const s = e.status || 500;
      if (s === 500) console.error(e);
      res.json(200, { ok: true }); // anti-enumeration: ne otkrivaj greške
    }
  });

  // POST /auth/reset — resetuj password sa tokenom
  router.post('/auth/reset', (req, res, body) => {
    const { token, password } = body || {};
    if (!token || !password) return res.json(400, { error: 'token i password obavezni' });
    try {
      resetPassword(token, password);
      res.json(200, { ok: true });
    } catch (e) {
      res.json(e.status || 400, { error: e.message });
    }
  });

  /* ─── Sessions management ─── */

  // GET /auth/sessions — lista aktivnih sesija za ulogovanog korisnika
  router.get('/auth/sessions', (req, res) => {
    const user = requireAuth(req);
    const { getDb } = require('../db');
    const now = new Date().toISOString();
    const sessions = getDb().prepare(`
      SELECT id, created_at, expires_at FROM sessions
      WHERE user_id = ? AND expires_at > ?
      ORDER BY created_at DESC
    `).all(user.id, now);
    // Označi trenutnu sesiju
    const token = (req.headers['authorization'] || '').replace('Bearer ', '') ||
      ((req.headers['cookie'] || '').match(/session=([a-f0-9]+)/) || [])[1];
    res.json(200, sessions.map(s => ({ ...s, current: s.id === token })));
  });

  // DELETE /auth/sessions/:id — opozovi specifičnu sesiju
  router.delete('/auth/sessions/:id', (req, res, body, params) => {
    const user = requireAuth(req);
    const { getDb } = require('../db');
    const session = getDb().prepare(`SELECT * FROM sessions WHERE id = ?`).get(params.id);
    if (!session) { const e = new Error('Sesija ne postoji'); e.status = 404; throw e; }
    if (session.user_id !== user.id) { const e = new Error('Unauthorized'); e.status = 403; throw e; }
    getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(params.id);
    res.json(200, { ok: true });
  });

  // POST /auth/change-password — promeni lozinku (korisnik je ulogovan)
  router.post('/auth/change-password', (req, res, body) => {
    const user = requireAuth(req);
    const { current_password, new_password } = body || {};
    try {
      changePassword(user.id, current_password, new_password);
      res.json(200, { ok: true });
    } catch (e) {
      res.json(e.status || 400, { error: e.message });
    }
  });

  // Verifikuj token i kreiraj sesiju — GET /auth/verify?token=...
  router.get('/auth/verify', (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    try {
      const result = verifyMagicLink(
        token,
        req.socket?.remoteAddress,
        req.headers['user-agent']
      );
      res.setHeader('Set-Cookie', `session=${result.sessionId}; HttpOnly; Path=/; Max-Age=${72 * 3600}`);
      res.json(200, { ok: true, user: result.user, session: result.sessionId });
    } catch (e) {
      const status = e.status || 401;
      res.json(status, { error: e.message });
    }
  });
};

function tplPasswordReset(resetUrl, minutes) {
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AutoUniverse — Resetuj lozinku</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#111;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .header span{color:#e53935;font-size:28px}
  .body{padding:28px 24px;color:#333;line-height:1.6}
  .btn{display:block;width:fit-content;margin:24px auto;background:#e53935;color:#fff;
       text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
  .note{font-size:13px;color:#888;background:#fafafa;padding:10px;border-radius:4px;margin-top:20px}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span>🚗</span><h1>AutoUniverse</h1></div>
  <div class="body">
    <p>Primili smo zahtev za resetovanje lozinke za tvoj AutoUniverse nalog.</p>
    <p>Klikni dugme ispod da postaviš novu lozinku:</p>
    <a class="btn" href="${resetUrl}">Resetuj lozinku</a>
    <p style="font-size:13px;color:#888">Ili kopiraj link u browser:<br>${resetUrl}</p>
    <div class="note">Link važi ${minutes} minuta. Ako nisi tražio/la resetovanje, ignoriši ovaj mejl — tvoja lozinka ostaje nepromenjena.</div>
  </div>
  <div class="footer">AutoUniverse · Kruševac</div>
</div>
</body></html>`;
}

function tplMagicLink(verifyUrl, purpose, minutes) {
  const heading = purpose === 'register' ? 'Aktiviraj nalog' : 'Prijavi se';
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AutoUniverse — ${heading}</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#111;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .header span{color:#e53935;font-size:28px}
  .body{padding:28px 24px;color:#333;line-height:1.6}
  .btn{display:block;width:fit-content;margin:24px auto;background:#e53935;color:#fff;
       text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
  .note{font-size:13px;color:#888;background:#fafafa;padding:10px;border-radius:4px;margin-top:20px}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span>🚗</span><h1>AutoUniverse</h1></div>
  <div class="body">
    <p>Zdravo,</p>
    <p>Klikni dugme ispod da se prijaviš — bez unosa lozinke.</p>
    <a class="btn" href="${verifyUrl}">${heading}</a>
    <p style="font-size:13px;color:#888">Ili kopiraj link u browser:<br>${verifyUrl}</p>
    <div class="note">Link vazi ${minutes} minuta i moze da se iskoristi samo jednom. Ako nisi trazio/la ovaj mejl, ignorisi ga.</div>
  </div>
  <div class="footer">AutoUniverse · Kruševac</div>
</div>
</body></html>`;
}
