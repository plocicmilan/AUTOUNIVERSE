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

function checkOverdueReminders() {
  const db  = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const dedup_cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();

  const overdue = db.prepare(`
    SELECT r.id, r.vehicle_id, r.title, r.due_date, v.owner_id, v.make, v.model
    FROM reminders r JOIN vehicles v ON r.vehicle_id = v.id
    WHERE r.done=0 AND r.due_date IS NOT NULL AND r.due_date < ?
  `).all(today);

  let count = 0;
  for (const rem of overdue) {
    const exists = db.prepare(`
      SELECT id FROM notifications
      WHERE recipient_user_id=? AND category='reminder_overdue'
        AND json_extract(metadata,'$.reminder_id')=?
        AND created_at > ?
    `).get(rem.owner_id, rem.id, dedup_cutoff);
    if (exists) continue;

    const vName    = `${rem.make} ${rem.model}`;
    const daysLate = Math.max(1, Math.floor((Date.now() - new Date(rem.due_date).getTime()) / 86400_000));
    db.prepare(`
      INSERT INTO notifications (recipient_user_id, category, priority, title, body, metadata)
      VALUES (?,?,?,?,?,?)
    `).run(
      rem.owner_id,
      'reminder_overdue',
      'high',
      `Zakasneli podsetnik: ${rem.title}`,
      `Podsetnik "${rem.title}" za ${vName} je istekao pre ${daysLate} dan${daysLate === 1 ? 'a' : 'a'}.`,
      JSON.stringify({ reminder_id: rem.id, vehicle_id: rem.vehicle_id })
    );
    count++;
  }
  if (count) console.log(`[drip] ${count} overdue reminder notif poslato`);
  return count;
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
  checkOverdueReminders();
  setInterval(checkOverdueReminders, CHECK_INTERVAL_MS);
  cleanup();
  setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

module.exports = { startDrip, runDrip, checkOverdueReminders };
