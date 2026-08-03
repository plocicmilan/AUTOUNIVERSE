/* AU Core — Public vehicle history (bez login-a)
   GET /public/v/:vehicleId       → HTML stranica sa istorijom
   GET /public/v/:vehicleId/qr    → SVG QR kod koji vodi na HTML stranicu */

const QRCode = require('qrcode');
const path = require('path');
const { getDb } = require('../db');
const cfg = require('../config');
const Trust = require(path.join('..', '..', 'core', 'js', 'trust.js'));

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const EVENT_LABELS = {
  service: 'Servis', oil_change: 'Zamena ulja', tire_change: 'Zamena guma',
  tire_rotation: 'Rotacija guma', inspection: 'Tehnički pregled',
  registration: 'Registracija', insurance: 'Osiguranje', repair: 'Popravka',
  fuel: 'Gorivo', mileage: 'Stanje km', note: 'Beleška', initial: 'Početno stanje',
  work_order: 'Radni nalog', estimate: 'Predračun', other: 'Ostalo',
};

function eventLabel(type) {
  return EVENT_LABELS[type] || type;
}

// Mapiranje AU Core event-a u Trust format (source + type unifikacija)
// AU Core events: source='user'|'garage'|'mechanic'|'driver', data JSON string
// Trust ocekuje: source='mechanic'|'owner', type='service'|'work_order'|'repair'
function toTrustEvent(e) {
  const data = typeof e.data === 'string' ? (function () {
    try { return JSON.parse(e.data); } catch (_) { return {}; }
  })() : (e.data || {});

  // Source: mechanic ako je stigao iz Garage share-a (mechanic_name != null)
  // ili ako je originalno source='mechanic'
  const isMech = e.source === 'mechanic' || !!data.mechanic_name;
  const source = isMech ? 'mechanic' : 'owner';

  // Type: work_order i estimate su Garage share; service/repair su direct
  const type = e.type;   // Trust vec podrzava 'service', 'repair', 'work_order'

  return {
    vehicle_id: e.vehicle_id,
    source,
    type,
    event_date: e.event_date,
    km: data.mileage_km || data.km,
    retroactive: e.retroactive === 1 || e.retroactive === true,
    photos: data.photos || []
  };
}

function computeTrust(vehicle, events) {
  const trustEvents = events.map(toTrustEvent);
  // Documents: AU Core trenutno nema documents tabelu, prosledjujemo prazan array
  return Trust.compute(vehicle, trustEvents, []);
}

function trustBadgeHtml(result) {
  const colors = {
    gold:   { bg: '#0d3f2d', border: '#1D9E75', text: '#4ade80', label: '🏆 Zlatni' },
    silver: { bg: '#3a2a10', border: '#EF9F27', text: '#fbbf24', label: '🥈 Srebrni' },
    bronze: { bg: '#2a2a2a', border: '#B4B2A9', text: '#d4d4d4', label: '🥉 Bronzani' }
  };
  const c = colors[result.level] || colors.bronze;
  const b = result.breakdown;
  return `
    <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:16px;margin:16px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:.95rem;letter-spacing:.06em;color:${c.text};font-weight:700">${c.label} TRUST SCORE</div>
        <div style="font-size:1.8rem;font-weight:700;color:${c.text}">${result.score}<span style="font-size:1rem;opacity:.6">/100</span></div>
      </div>
      <div style="height:6px;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${result.score}%;background:${c.border};transition:width .5s ease"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem;color:#cbd5e1">
        <div>Verifikovani servisi: <b style="color:#f1f5f9">${b.verified_services}</b></div>
        <div>Vlasnikovi zapisi: <b style="color:#f1f5f9">${b.owner_records}</b></div>
        <div>km konzistentna: <b style="color:#f1f5f9">${b.km_consistent ? '✓' : '✗'}</b></div>
        <div>Praznine > 18mo: <b style="color:#f1f5f9">${b.gaps_over_18mo}</b></div>
      </div>
    </div>`;
}

function publicPage(vehicle, events, pageUrl) {
  const trust = computeTrust(vehicle, events);
  const eventRows = events.map(e => {
    const data = JSON.parse(e.data || '{}');
    const desc  = esc(data.description || data.note || '');
    const kmVal = data.mileage_km || data.km;
    const km    = kmVal ? `<span class="km">${Number(kmVal).toLocaleString('sr')} km</span>` : '';
    const mech  = data.mechanic_name || (e.source === 'mechanic' ? 'Mehaničar' : null);
    const src   = mech ? `<span class="badge-mech">✓ ${esc(mech)}</span>` : '';
    return `<div class="ev-row${mech ? ' mech' : ''}">
      <div class="ev-top">
        <span class="ev-type">${esc(eventLabel(e.type))}</span>
        ${src}${km}
        <span class="ev-date">${esc((e.event_date || '').slice(0, 10))}</span>
      </div>
      ${desc ? `<div class="ev-desc">${desc}</div>` : ''}
    </div>`;
  }).join('');

  const totalEvents = events.length;
  const mechEvents  = events.filter(e => e.source === 'mechanic').length;

  return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(vehicle.make)} ${esc(vehicle.model)} — AutoUniverse Dosije</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',Arial,sans-serif;background:#0d0d0f;color:#e2e8f0;min-height:100vh;padding:0 0 40px}
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Barlow+Condensed:wght@600;700&display=swap');
  .header{background:#161618;border-bottom:1px solid #2a2a30;padding:20px 16px}
  .brand{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;letter-spacing:.08em;color:#64748b;margin-bottom:8px}
  .vh-title{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:700;color:#f1f5f9}
  .vh-sub{color:#94a3b8;font-size:.9rem;margin-top:4px}
  .stats{display:flex;gap:12px;padding:16px;flex-wrap:wrap}
  .stat{background:#1e1e24;border-radius:8px;padding:12px 16px;flex:1;min-width:100px;text-align:center}
  .stat-n{font-size:1.8rem;font-weight:700;color:#38bdf8}
  .stat-l{font-size:.75rem;color:#64748b;margin-top:2px}
  .section-title{font-family:'Barlow Condensed',sans-serif;font-size:1rem;letter-spacing:.06em;color:#64748b;
    padding:0 16px;margin:16px 0 8px;text-transform:uppercase}
  .ev-row{background:#1e1e24;border-radius:8px;margin:6px 16px;padding:12px 14px;border-left:3px solid #334155}
  .ev-row.mech{border-left-color:#22c55e}
  .ev-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.85rem}
  .ev-type{font-weight:600;color:#f1f5f9}
  .ev-date{color:#64748b;margin-left:auto}
  .ev-desc{color:#94a3b8;font-size:.82rem;margin-top:6px}
  .km{background:#0f172a;border-radius:4px;padding:2px 6px;font-size:.75rem;color:#38bdf8}
  .badge-mech{background:#14532d;color:#4ade80;border-radius:4px;padding:2px 6px;font-size:.72rem}
  .qr-section{padding:16px;text-align:center}
  .qr-section svg{max-width:160px;border-radius:8px;background:#fff;padding:8px}
  .qr-label{color:#64748b;font-size:.78rem;margin-top:8px}
  .empty{color:#475569;text-align:center;padding:40px 16px;font-size:.9rem}
  .footer{color:#334155;font-size:.72rem;text-align:center;margin-top:32px}
</style>
</head>
<body>
<div class="header">
  <div class="brand">AutoUniverse · Javni Dosije</div>
  <div class="vh-title">${esc(vehicle.make)} ${esc(vehicle.model)}${vehicle.year ? ' ' + vehicle.year : ''}</div>
  <div class="vh-sub">${vehicle.plate ? esc(vehicle.plate) : ''}${vehicle.vin ? ' · VIN: ' + esc(vehicle.vin) : ''}</div>
</div>

${trustBadgeHtml(trust)}

<div class="stats">
  <div class="stat"><div class="stat-n">${totalEvents}</div><div class="stat-l">Ukupno unosa</div></div>
  <div class="stat"><div class="stat-n">${mechEvents}</div><div class="stat-l">Potvrđeno od mehaničara</div></div>
</div>

<div class="section-title">Istorija vozila</div>
${eventRows || '<div class="empty">Nema javnih unosa za ovo vozilo.</div>'}

<div class="qr-section">
  <img src="${esc(pageUrl)}/qr" alt="QR kod" style="max-width:160px;border-radius:8px">
  <div class="qr-label">Skeniraj za deljenje</div>
</div>

<div class="footer">AutoUniverse · autouniverse.rs · Podaci uneti od strane vlasnika vozila i servisera.</div>
</body>
</html>`;
}

module.exports = function publicRoutes(router) {

  /* ── HTML stranica ── */
  router.get('/public/v/:vehicleId', async (req, res, _, params) => {
    const id = Number(params.vehicleId);
    if (!id) return res.json(400, { error: 'Nevažeći ID' });

    const db = getDb();
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id=?').get(id);
    if (!vehicle) return res.html(404, '<h1>Vozilo nije pronađeno</h1>');

    // Prikazujemo samo events gdje public_on_marketplace != false
    const events = db.prepare(`
      SELECT * FROM events
      WHERE vehicle_id=?
        AND (json_extract(data, '$.public_on_marketplace') IS NULL
             OR json_extract(data, '$.public_on_marketplace') != 0)
      ORDER BY event_date DESC
    `).all(id);

    const pageUrl = `${cfg.HUB_BASE_URL.replace(/\/$/, '')}/public/v/${id}`;
    res.html(200, publicPage(vehicle, events, pageUrl));
  });

  /* ── QR kod (SVG) ── */
  router.get('/public/v/:vehicleId/qr', async (req, res, _, params) => {
    const id = Number(params.vehicleId);
    if (!id) return res.json(400, { error: 'Nevažeći ID' });

    const db = getDb();
    const v = db.prepare('SELECT id FROM vehicles WHERE id=?').get(id);
    if (!v) return res.json(404, { error: 'Ne postoji' });

    const pageUrl = `${cfg.HUB_BASE_URL.replace(/\/$/, '')}/public/v/${id}`;
    const svg = await QRCode.toString(pageUrl, { type: 'svg', width: 200, margin: 1 });

    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' });
    res.end(svg);
  });

};
