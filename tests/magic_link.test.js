/* Magic-link auth unit testovi (Todo #125) — direktan poziv auth.js funkcija,
   bez HTTP layera (to je smoke test u dev-u).
*/
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Test radi na live autohub bazi — brise se sav test data (magic_links + test users) na kraju
const { getDb } = require(path.join('..', 'autohub', 'db.js'));
const { register, requestMagicLink, verifyMagicLink, pruneExpiredMagicLinks } = require(path.join('..', 'autohub', 'auth.js'));

const TEST_EMAIL = 'magiclink_test_' + Date.now() + '@example.com';

function cleanup() {
  const db = getDb();
  db.prepare('DELETE FROM magic_links WHERE email LIKE ?').run('magiclink_test_%@example.com');
  const userIds = db.prepare('SELECT id FROM users WHERE email LIKE ?').all('magiclink_test_%@example.com').map(r => r.id);
  for (const uid of userIds) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM audit_log WHERE user_id = ?').run(uid);
    db.prepare('DELETE FROM owner_notes WHERE author_id = ?').run(uid);
    db.prepare('DELETE FROM users WHERE id = ?').run(uid);
  }
}

test('requestMagicLink kreira token sa expiry ~15 min', () => {
  cleanup();
  const { token, expiresAt } = requestMagicLink(TEST_EMAIL);
  assert.ok(token && token.length === 64, 'token je 32-byte hex (64 chars)');
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  assert.ok(diffMs > 14 * 60 * 1000 && diffMs < 16 * 60 * 1000, `expires ~15 min (got ${diffMs}ms)`);
});

test('requestMagicLink odbija nevalidan email', () => {
  assert.throws(() => requestMagicLink('nema-at-znaka'), /Nevalidan email/);
  assert.throws(() => requestMagicLink(''), /Nevalidan email/);
});

test('requestMagicLink odbija nepoznatu purpose', () => {
  assert.throws(() => requestMagicLink(TEST_EMAIL, 'hakerske_svrhe'), /Nepoznata namena/);
});

test('verifyMagicLink: valjan token → auto-register + sesija', () => {
  cleanup();
  const { token } = requestMagicLink(TEST_EMAIL, 'login');
  const result = verifyMagicLink(token, '127.0.0.1', 'test-agent/1.0');
  assert.ok(result.sessionId && result.sessionId.length === 64);
  assert.strictEqual(result.user.email, TEST_EMAIL);
  assert.strictEqual(result.user.status, 'active');
  cleanup();
});

test('verifyMagicLink: token je jednokratan', () => {
  cleanup();
  const { token } = requestMagicLink(TEST_EMAIL);
  verifyMagicLink(token);
  assert.throws(() => verifyMagicLink(token), /Token vec iskoriscen/);
  cleanup();
});

test('verifyMagicLink: nevalidan token → greska', () => {
  assert.throws(() => verifyMagicLink('nema-takvog-tokena'), /Nevalidan token/);
  assert.throws(() => verifyMagicLink(''), /Token nedostaje/);
  assert.throws(() => verifyMagicLink(null), /Token nedostaje/);
});

test('verifyMagicLink: postojeci user dobija email_verified=1', () => {
  cleanup();
  const db = getDb();
  // Registruj usera kroz auth.register (koristi bcrypt iz autohub/node_modules)
  register(TEST_EMAIL, 'temp_password_x', 'Test User');
  db.prepare('UPDATE users SET email_verified = 0, status = ? WHERE email = ?').run('active', TEST_EMAIL);

  const { token } = requestMagicLink(TEST_EMAIL);
  verifyMagicLink(token);
  const user = db.prepare('SELECT email_verified FROM users WHERE email = ?').get(TEST_EMAIL);
  assert.strictEqual(user.email_verified, 1);
  cleanup();
});

test('pruneExpiredMagicLinks: brise samo istekle', () => {
  cleanup();
  const db = getDb();
  // Rucno ubaci token sa proslim expires_at
  db.prepare(`INSERT INTO magic_links (token, email, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run('expired_' + Date.now(), TEST_EMAIL, 'login', '2020-01-01T00:00:00.000Z', new Date().toISOString());
  const { token: freshToken } = requestMagicLink(TEST_EMAIL);

  const pruned = pruneExpiredMagicLinks();
  assert.ok(pruned >= 1, `pruned >=1 (got ${pruned})`);

  // Fresh token ne sme biti obrisan
  const fresh = db.prepare('SELECT token FROM magic_links WHERE token = ?').get(freshToken);
  assert.ok(fresh, 'fresh token mora ostati');
  cleanup();
});
