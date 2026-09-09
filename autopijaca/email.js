/* Autopijaca — Brevo transactional email (Node 18+ fetch) */

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

function tplSellerToken(listing_id, seller_token, make, model) {
  const panelUrl = `https://autopijaca.autouniverse.rs/?listing=${listing_id}&seller_token=${encodeURIComponent(seller_token)}`;
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Oglas objavljen — Autopijaca</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#FF5722;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 16px}
  .token-box{background:#fff3e0;border:2px solid #FF5722;border-radius:8px;padding:16px 20px;margin:16px 0;text-align:center}
  .token-box .label{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .token-box .token{font-family:monospace;font-size:14px;font-weight:bold;color:#333;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:4px;display:block}
  .btn{display:block;width:fit-content;margin:20px auto;background:#FF5722;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><h1>🚗 AUTOPIJACA</h1></div>
  <div class="body">
    <p>Oglas za <b>${esc(make)} ${esc(model)}</b> je uspešno objavljen! (ID oglasa: <b>${listing_id}</b>)</p>
    <p><b>Sačuvaj sledeće podatke</b> — jedini su način da upravljaš oglasom, promeniš status ili pregledaš poruke kupaca:</p>
    <div class="token-box">
      <div class="label">Tvoj seller token — čuvaj tajno!</div>
      <span class="token">${esc(seller_token)}</span>
    </div>
    <p>Klikni dugme ispod da odmah otвориш panel sa oglasom:</p>
    <a class="btn" href="${panelUrl}">Otvori moj oglas</a>
    <p style="font-size:12px;color:#888">Ili sačuvaj ovaj link u bookmarke:<br><a href="${panelUrl}" style="color:#FF5722">${panelUrl}</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:13px;color:#888">Oglas je vidljiv na <a href="https://autopijaca.autouniverse.rs/" style="color:#FF5722">autopijaca.autouniverse.rs</a>. Kupci te kontaktiraju direktno telefonom ili porukom kroz oglas.</p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://autopijaca.autouniverse.rs/" style="color:#888">autopijaca.autouniverse.rs</a></div>
</div>
</body></html>`;
}

function tplRecoverTokens(items) {
  const rows = items.map(it => {
    const panelUrl = `https://autopijaca.autouniverse.rs/?listing=${it.id}&seller_token=${encodeURIComponent(it.seller_token)}`;
    const title = `${it.make} ${it.model}${it.year ? ' ' + it.year : ''}`;
    return `<tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <div style="font-weight:bold;color:#333">${esc(title)}</div>
        <div style="font-size:12px;color:#888">ID: ${it.id} · Status: ${esc(it.status)}</div>
        <a href="${panelUrl}" style="display:inline-block;margin-top:8px;background:#0EA5E9;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px">Otvori panel →</a>
      </td>
    </tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Povraćaj tokena — Autopijaca</title>
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
  <div class="header"><h1>🚗 AUTOPIJACA</h1></div>
  <div class="body">
    <p>Zatraženo je povraćaj tokena za oglase pod ovim email-om. Ispod je lista svih tvojih oglasa i direktni linkovi za upravljanje:</p>
    <table>${rows}</table>
    <p style="font-size:12px;color:#888">Ako nisi ti zatražio ovo — ignoriši email. Ništa se nije promenilo.</p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://autopijaca.autouniverse.rs/" style="color:#888">autopijaca.autouniverse.rs</a></div>
</div>
</body></html>`;
}

module.exports = { send, tplSellerToken, tplRecoverTokens };
