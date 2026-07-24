/* AU Core — Drip email scheduler
   Pokreće se pri startu servera.
   Sekvenca (posle email verifikacije):
     drip_step=1 → odmah (welcome poslat pri verify)
     drip_step=2 → +2 dana → Autopijaca intro
     drip_step=3 → +4 dana od step 2 → Autodelovi intro         */

const { getDb } = require('./db');
const emailMod = require('./email');
const { tplAutopijaca, tplAutodelovi } = emailMod;

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // svakih 10 min

const STEPS = [
  { step: 2, delayDays: 2, subject: 'Prodaj auto bez provizije — AutoUniverse', tpl: tplAutopijaca },
  { step: 3, delayDays: 4, subject: 'Prodaj auto delove — AutoUniverse',         tpl: tplAutodelovi },
];

async function runDrip(dryRun = false) {
  const db = getDb();
  const now = new Date();
  const results = [];

  for (const { step, delayDays, subject, tpl } of STEPS) {
    const prevStep = step - 1;
    const cutoff = new Date(now - delayDays * 86400 * 1000).toISOString();

    const users = db.prepare(`
      SELECT id, email, name FROM users
      WHERE email_verified=1 AND drip_step=? AND drip_sent_at <= ?
    `).all(prevStep, cutoff);

    for (const user of users) {
      if (dryRun) {
        results.push({ step, email: user.email, status: 'would_send' });
        continue;
      }
      try {
        await emailMod.send({ to: user.email, subject, html: tpl(user.name) });
        db.prepare('UPDATE users SET drip_step=?, drip_sent_at=datetime(\'now\') WHERE id=?').run(step, user.id);
        console.log(`[drip] step ${step} → ${user.email}`);
        results.push({ step, email: user.email, status: 'sent' });
      } catch (err) {
        console.error(`[drip] greška step ${step} → ${user.email}:`, err.message);
        results.push({ step, email: user.email, status: 'error', error: err.message });
      }
    }
  }
  return results;
}

function cleanup() {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const sessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    const links    = db.prepare('DELETE FROM magic_links WHERE expires_at < ?').run(now);
    if (sessions.changes || links.changes) {
      console.log(`[cleanup] ${sessions.changes} sesija + ${links.changes} magic_link-ova obrisano`);
    }
  } catch (e) {
    console.error('[cleanup] greška:', e.message);
  }
}

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // svaki sat

function startDrip() {
  console.log('[drip] Scheduler pokrenut (interval 10 min)');
  runDrip().catch(console.error);
  setInterval(() => runDrip().catch(console.error), CHECK_INTERVAL_MS);
  cleanup();
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

module.exports = { startDrip, runDrip };
