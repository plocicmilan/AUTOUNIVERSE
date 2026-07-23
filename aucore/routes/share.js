/* AutoHub — share routes
   POST /public/share      → mehaničar kreira token (no auth, javni)
   GET  /public/share/:tok → Driver fetchuje JSON payload (no auth)
   GET  /share/:tok        → browser HTML strana sa "Otvori u Driver" dugmetom  */

const crypto = require('crypto');
const { getDb } = require('../db');

const EXPIRE_DAYS  = 30;
const DRIVER_BASE  = 'https://plocicmilan.github.io/AUTOUNIVERSE/driver/';

module.exports = function shareRoutes(router) {

  /* ------------------------------------------------------------------ */
  /* POST /public/share                                                   */
  /* Garage Toolbox šalje sanitizovani payload (BEZ cena).               */
  /* ------------------------------------------------------------------ */
  router.post('/public/share', (req, res, body) => {
    const { event, vehicle, mechanic_name, hub_url } = body;
    if (!event || !event.type) return res.json(400, { error: 'event.type je obavezan' });

    // Ukloni cene — FEEDBACK #10: prices NEVER auto-shared
    const safeItems = (event.items || []).map(function (it) {
      return { name: it.name || '', qty: it.qty != null ? Number(it.qty) : 1, unit: it.unit || 'kom' };
    });

    const payload = {
      event: {
        type:        event.type,
        title:       event.title || '',
        description: event.description || '',
        date:        event.date || new Date().toISOString().slice(0, 10),
        mileage_km:  event.mileage_km != null ? Number(event.mileage_km) : null,
        items:       safeItems,
        next_service: event.next_service || null
      },
      vehicle: vehicle ? {
        vin:   vehicle.vin   || '',
        make:  vehicle.make  || '',
        model: vehicle.model || '',
        year:  vehicle.year  || null,
        plate: vehicle.plate || ''
      } : null,
      mechanic_name: mechanic_name || ''
    };

    const token    = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + EXPIRE_DAYS * 86400_000).toISOString();
    const hubUrl   = (hub_url || '').toString().trim();

    const db = getDb();
    db.prepare(
      'INSERT INTO share_tokens (token, payload, hub_url, mechanic_name, expires_at) VALUES (?,?,?,?,?)'
    ).run(token, JSON.stringify(payload), hubUrl, mechanic_name || '', expiresAt);

    const shareUrl = hubUrl ? `${hubUrl}/share/${token}` : `/share/${token}`;
    res.json(201, { token, url: shareUrl, expires_at: expiresAt });
  });

  /* ------------------------------------------------------------------ */
  /* GET /public/share/:token  — Driver povlači JSON                     */
  /* ------------------------------------------------------------------ */
  router.get('/public/share/:token', (req, res, _, params) => {
    const row = getDb().prepare(
      'SELECT * FROM share_tokens WHERE token=?'
    ).get(params.token);

    if (!row) return res.json(404, { error: 'Link ne postoji' });
    if (row.expires_at < new Date().toISOString()) return res.json(410, { error: 'Link je istekao' });

    const payload = JSON.parse(row.payload);
    res.json(200, Object.assign({}, payload, {
      token:      row.token,
      hub_url:    row.hub_url,
      expires_at: row.expires_at
    }));
  });

  /* ------------------------------------------------------------------ */
  /* GET /share/:token  — HTML strana za browser (vlasnik dobija link)   */
  /* ------------------------------------------------------------------ */
  router.get('/share/:token', (req, res, _, params) => {
    const row = getDb().prepare(
      'SELECT * FROM share_tokens WHERE token=?'
    ).get(params.token);

    if (!row) return res.html(404, '<h1>Link ne postoji ili je istekao.</h1>');
    if (row.expires_at < new Date().toISOString()) return res.html(410, '<h1>Ovaj link je istekao.</h1>');

    const p        = JSON.parse(row.payload);
    const ev       = p.event    || {};
    const veh      = p.vehicle  || {};
    const mech     = p.mechanic_name || 'Servis';
    const itemsHtml = (ev.items || []).map(function (it) {
      return `<li>${it.qty}&nbsp;&times;&nbsp;${it.name}</li>`;
    }).join('');
    const nextHtml = ev.next_service
      ? `<p><b>Sledeći servis:</b> ${ev.next_service.km ? ev.next_service.km + ' km' : ''} ${ev.next_service.date || ''}</p>`
      : '';
    const vehHtml = veh.make
      ? `<div class="card"><b>${veh.make} ${veh.model}</b>` +
        `<p class="muted">${veh.plate || ''} ${veh.year || ''} ${veh.vin ? '• VIN: ' + veh.vin : ''}</p></div>`
      : '';

    const importUrl = `${DRIVER_BASE}?hub_import=${params.token}&hub=${encodeURIComponent(row.hub_url || '')}`;

    res.html(200, `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Servisni zapis — ${mech}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:480px;margin:2rem auto;padding:1rem;background:#F1F5F6}
h1{color:#0F766E;font-size:1.2rem;margin-bottom:.2rem}
.card{background:#fff;border-radius:12px;padding:1rem;margin:1rem 0;box-shadow:0 1px 4px rgba(0,0,0,.1)}
.btn{display:block;background:#0F766E;color:#fff;text-align:center;padding:.9rem;border-radius:10px;
     text-decoration:none;font-weight:700;margin-top:1.5rem;font-size:1rem}
.muted{color:#6B7280;font-size:.875rem;margin:.3rem 0}
ul{margin:.4rem 0;padding-left:1.2rem}
</style>
</head>
<body>
<h1>🔧 Servisni zapis</h1>
<p class="muted">Od: ${mech}</p>
<div class="card">
  <b>${ev.title || ev.type || 'Servis'}</b>
  <p class="muted">${ev.date || ''}${ev.mileage_km ? ' • ' + ev.mileage_km + ' km' : ''}</p>
  ${ev.description ? `<p>${ev.description}</p>` : ''}
  ${itemsHtml ? `<ul>${itemsHtml}</ul>` : ''}
  ${nextHtml}
</div>
${vehHtml}
<a href="${importUrl}" class="btn">📲 Dodaj u Driver Toolbox</a>
<p class="muted" style="text-align:center;margin-top:.8rem">Link ističe: ${row.expires_at.slice(0,10)}</p>
</body>
</html>`);
  });
};
