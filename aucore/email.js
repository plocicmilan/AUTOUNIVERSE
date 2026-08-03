/* Brevo transactional email — vanilla fetch (Node 18+) */
const cfg = require('./config');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

async function send({ to, subject, html }) {
  if (!cfg.BREVO_API_KEY) { console.warn('[email] BREVO_API_KEY nije postavljen'); return; }
  const body = JSON.stringify({
    sender:      { name: cfg.BREVO_SENDER_NAME, email: cfg.BREVO_SENDER_EMAIL },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
  });
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': cfg.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Brevo greška:', res.status, err);
  } else {
    console.log('[email] Poslat:', subject, '→', to);
  }
}

/* ─── Šabloni ─── */

function tplWelcome(name, verifyUrl) {
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dobrodošli u AutoUniverse</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#111;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .header span{color:#e53935;font-size:28px}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 16px}
  .btn{display:block;width:fit-content;margin:20px auto;background:#e53935;color:#fff;
       text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span>🚗</span><h1>AutoUniverse</h1></div>
  <div class="body">
    <p>Zdravo${name ? ' <b>' + esc(name) + '</b>' : ''},</p>
    <p>Dobrodošli u <b>AutoUniverse</b> — digitalni dom za tvoje vozilo.</p>
    <p>Klikni dugme ispod da potvrdiš email adresu i aktiviraš nalog:</p>
    <a class="btn" href="${verifyUrl}">Potvrdi email</a>
    <p style="font-size:13px;color:#888">Ili kopiraj link u browser:<br>${verifyUrl}</p>
    <p>Ako nisi registrovan/a, ignoriši ovaj mejl.</p>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://plocicmilan.github.io/AUTOUNIVERSE/" style="color:#888">autouniverse</a></div>
</div>
</body></html>`;
}

function tplAutopijaca(name) {
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prodaj auto bez provizije</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#111;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .accent{color:#FF5722}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 16px}
  .highlight{background:#fff3e0;border-left:4px solid #FF5722;padding:12px 16px;border-radius:4px;margin:16px 0}
  .btn{display:block;width:fit-content;margin:20px auto;background:#FF5722;color:#fff;
       text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span class="accent">🚗</span><h1>Auto<span class="accent">Pijaca</span></h1></div>
  <div class="body">
    <p>Zdravo${name ? ' <b>' + esc(name) + '</b>' : ''},</p>
    <p>Znaš li da sada možeš da prodaš auto <b>direktno</b> — bez posrednika, bez provizije?</p>
    <div class="highlight">
      <b>Autopijaca</b> je besplatan javni oglas koji ide uz tvoj Driver Toolbox nalog.<br><br>
      Kupac vidi <b>kompletnu servisnu istoriju</b> vozila — nešto što ni KP ni PA ne mogu da ponude.
    </div>
    <p>Kako radi:</p>
    <p>1. U Driver Toolbox uključi <b>"Ovo vozilo je za prodaju"</b><br>
       2. Klikni <b>"Objavi oglas"</b><br>
       3. Oglas ide na javnu stranicu — kupci te kontaktiraju direktno</p>
    <a class="btn" href="https://plocicmilan.github.io/AUTOUNIVERSE/driver/">Otvori Driver Toolbox</a>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://plocicmilan.github.io/AUTOUNIVERSE/" style="color:#888">autouniverse</a></div>
</div>
</body></html>`;
}

function tplAutodelovi(name) {
  return `<!DOCTYPE html>
<html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prodaj auto delove</title>
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px}
  .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden}
  .header{background:#111;padding:24px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:22px;letter-spacing:1px}
  .accent{color:#0EA5E9}
  .body{padding:28px 24px}
  .body p{color:#333;line-height:1.6;margin:0 0 16px}
  .highlight{background:#e0f2fe;border-left:4px solid #0EA5E9;padding:12px 16px;border-radius:4px;margin:16px 0}
  .cats{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
  .cat{background:#f0f9ff;border:1px solid #0EA5E9;color:#0369a1;padding:4px 10px;border-radius:4px;font-size:13px}
  .btn{display:block;width:fit-content;margin:20px auto;background:#0EA5E9;color:#fff;
       text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:bold}
  .footer{background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888}
</style></head>
<body>
<div class="wrap">
  <div class="header"><span class="accent">🔧</span><h1>Auto<span class="accent">Delovi</span></h1></div>
  <div class="body">
    <p>Zdravo${name ? ' <b>' + esc(name) + '</b>' : ''},</p>
    <p>Imaš stare delove koji skupljaju prašinu? Ili si mehaničar sa viškom rezervnih delova?</p>
    <div class="highlight">
      <b>Autodelovi</b> je besplatan oglas za prodaju auto delova iz Garage Toolbox naloga.<br><br>
      Kupac pretražuje po <b>kategoriji i kompatibilnosti</b> — vidljivo samo delovi za njegovo vozilo.
    </div>
    <div class="cats">
      <span class="cat">Motor</span><span class="cat">Kočnice</span><span class="cat">Transmisija</span>
      <span class="cat">Elektrika</span><span class="cat">Karoserija</span><span class="cat">Gume</span>
      <span class="cat">Auspuh</span><span class="cat">Klimatizacija</span><span class="cat">Svetla</span>
    </div>
    <p>Dodaj deo za manje od 60 sekundi direktno iz Garage Toolbox aplikacije.</p>
    <a class="btn" href="https://plocicmilan.github.io/AUTOUNIVERSE/garage/">Otvori Garage Toolbox</a>
  </div>
  <div class="footer">AutoUniverse · Kruševac · <a href="https://plocicmilan.github.io/AUTOUNIVERSE/" style="color:#888">autouniverse</a></div>
</div>
</body></html>`;
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

module.exports = { send, tplWelcome, tplAutopijaca, tplAutodelovi };
