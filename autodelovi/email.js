/* Autodelovi — Brevo transactional email (Node 18+ fetch) */

const BREVO_URL    = 'https://api.brevo.com/v3/smtp/email';
const SENDER_EMAIL = 'info@autouniverse.rs';
const SENDER_NAME  = 'AutoUniverse';

async function send({ to, subject, html }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) { console.warn('[email] BREVO_API_KEY nije postavljen'); return; }
  const body = JSON.stringify({
    sender:      { name: SENDER_NAME, email: SENDER_EMAIL },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
  });
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Brevo greška:', res.status, err);
  } else {
    console.log('[email] Poslat:', subject, '→', to);
  }
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function tplSellerToken(part_id, seller_token, title) {
  const panelUrl = `https://autodelovi.autouniverse.rs/?part=${part_id}&seller_token=${encodeURIComponent(seller_token)}`;
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Oglas objavljen — Autodelovi</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#0EA5E9;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 16px}
  .token-box{background:#e0f2fe;border:2px solid #0EA5E9;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:center}
  .token-box .label{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .token-box .token{font-family:monospace;font-size:14px;font-weight:bold;color:#333;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:4px;display:block}
  .btn{display:block;width:fit-content;margin:20px auto;background:#0EA5E9;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>⚙️ AUTODELOVI</h1></div>
  <div class="body">
    <p>Oglas za <b>${esc(title)}</b> je uspešno objavljen! (ID oglasa: <b>${part_id}</b>)</p>
    <p><b>Sačuvaj sledeće podatke</b> — jedini su način da upravljaš oglasom, promeniš status ili pregledaš poruke kupaca:</p>
    <div class="token-box">
      <div class="label">Tvoj seller token — čuvaj tajno!</div>
      <span class="token">${esc(seller_token)}</span>
    </div>
    <p>Klikni dugme ispod da odmah otvoriš panel sa oglasom:</p>
    <a class="btn" href="${panelUrl}">Otvori moj oglas</a>
    <p style="font-size:12px;color:#888">Ili sačuvaj ovaj link u bookmarke:<br><a href="${panelUrl}" style="color:#0EA5E9">${panelUrl}</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:13px;color:#888">Oglas je vidljiv na <a href="https://autodelovi.autouniverse.rs/" style="color:#0EA5E9">autodelovi.autouniverse.rs</a>. Kupci te kontaktiraju direktno telefonom ili porukom kroz oglas.</p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://autodelovi.autouniverse.rs/" style="color:#888">autodelovi.autouniverse.rs</a></div>
</div>
</body></html>`;
}

function tplRecoverTokens(items) {
  const rows = items.map(it => {
    const panelUrl = `https://autodelovi.autouniverse.rs/?part=${it.id}&seller_token=${encodeURIComponent(it.seller_token)}`;
    return `<tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <div style="font-weight:bold;color:#333">${esc(it.title)}</div>
        <div style="font-size:12px;color:#888">ID: ${it.id} · Status: ${esc(it.status)}</div>
        <a href="${panelUrl}" style="display:inline-block;margin-top:8px;background:#0EA5E9;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px">Otvori panel →</a>
      </td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Povraćaj tokena — Autodelovi</title>
<style>
body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
.header{background:#0EA5E9;padding:24px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
.body{padding:28px 24px}
.body p{color:#333;line-height:1.6;margin:0 0 16px}
table{width:100%;border-collapse:collapse;margin:16px 0}
.footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>⚙️ AUTODELOVI</h1></div>
  <div class="body">
    <p>Zatraženo je povraćaj tokena za oglase pod ovim email-om. Ispod je lista svih tvojih oglasa i direktni linkovi za upravljanje:</p>
    <table>${rows}</table>
    <p style="font-size:12px;color:#888">Ako nisi ti zatražio ovo — ignoriši email. Ništa se nije promenilo.</p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://autodelovi.autouniverse.rs/" style="color:#888">autodelovi.autouniverse.rs</a></div>
</div>
</body></html>`;
}

function tplWelcome(part_id, seller_token, title) {
  const panelUrl = `https://autodelovi.autouniverse.rs/?part=${part_id}&seller_token=${encodeURIComponent(seller_token)}`;
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dobrodošao na Autodelovi</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#0EA5E9;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .header p{color:#e0f2fe;margin:6px 0 0;font-size:14px}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 14px}
  .tip{background:#f8f9fa;border-left:3px solid #0EA5E9;padding:12px 16px;border-radius:0 6px 6px 0;margin:8px 0;font-size:14px;color:#444}
  .apps{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
  .app{flex:1;min-width:140px;background:#e0f2fe;border-radius:8px;padding:14px;text-align:center;text-decoration:none}
  .app .icon{font-size:24px;display:block;margin-bottom:6px}
  .app .name{font-size:13px;font-weight:bold;color:#0369a1}
  .app .desc{font-size:11px;color:#666;margin-top:3px}
  .btn{display:block;width:fit-content;margin:20px auto;background:#0EA5E9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>⚙️ AUTODELOVI</h1><p>Deo AutoUniverse ekosistema</p></div>
  <div class="body">
    <p>Zdravo! Tvoj oglas za <b>${esc(title)}</b> je objavljen — sada ga mogu videti kupci širom Srbije.</p>
    <p><b>3 saveta za brzu prodaju:</b></p>
    <div class="tip">📸 <b>Dodaj fotografije</b> — oglasi sa slikama dobijaju 5× više upita</div>
    <div class="tip">💬 <b>Budi precizan u opisu</b> — navedi za koji motor i godište odgovara deo</div>
    <div class="tip">💰 <b>Realna cena</b> — pogledaj slične oglase i cenu prilagodi stanju dela</div>
    <a class="btn" href="${panelUrl}">Otvori moj oglas →</a>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:13px"><b>Još nisi isprobao ostatak AutoUniverse-a?</b></p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:8px;text-align:center;background:#e0f2fe;border-radius:8px;width:48%">
        <div style="font-size:22px">🚗</div>
        <div style="font-weight:bold;font-size:13px;color:#0369a1">Autopijaca</div>
        <div style="font-size:11px;color:#666">Prodaj celo vozilo</div>
        <a href="https://autopijaca.autouniverse.rs/" style="font-size:11px;color:#0EA5E9">autopijaca.autouniverse.rs</a>
      </td>
      <td width="4%"></td>
      <td style="padding:8px;text-align:center;background:#e0f2fe;border-radius:8px;width:48%">
        <div style="font-size:22px">🔧</div>
        <div style="font-weight:bold;font-size:13px;color:#0369a1">Garage Toolbox</div>
        <div style="font-size:11px;color:#666">Za majstore</div>
        <a href="https://autouniverse.rs/garage" style="font-size:11px;color:#0EA5E9">autouniverse.rs/garage</a>
      </td>
    </tr></table>
    <p style="font-size:12px;color:#888;margin-top:16px">Pitanja? Piši nam na <a href="mailto:hello@autouniverse.rs" style="color:#0EA5E9">hello@autouniverse.rs</a></p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://autouniverse.rs" style="color:#888">autouniverse.rs</a></div>
</div>
</body></html>`;
}

module.exports = { send, tplSellerToken, tplRecoverTokens, tplWelcome };
