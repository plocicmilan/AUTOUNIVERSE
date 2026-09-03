# AutoUniverse — CHANGELOG
> Obuhvata: autouniverse (AU Core, landing, PWA) + autouniverse-vozila (SSG)
> Format: datum · projekat · šta je promenjeno

---

## 2026-08-08 (nastavak 4)

**Hub — Vehicle Data Platform (storage + upload)**
- `aucore/lib/multipart.js` (NOVO) — vanilla multipart/form-data parser (zero deps)
- `aucore/lib/tiers.js` (NOVO) — tier limits (Free/Tier1/Tier2/Tier3): vozila, slike/vozilu, dok/vozilu, storage MB
- `aucore/db.js` — nove tabele: `vehicle_photos`, `vehicle_documents` (lazy migration, safe)
- `aucore/routes/uploads.js` (NOVO):
  - `POST/GET/DELETE /vehicles/:id/photos` — upload slika (JPEG/PNG/WEBP, max 8 MB)
  - `GET /vehicles/:id/photos/:pid/file` — serve slike kroz auth (cookie)
  - `POST/GET/DELETE /vehicles/:id/documents` — upload dokumenata (PDF/JPG/PNG, max 15 MB)
  - `GET /vehicles/:id/documents/:did/file` — serve dokumenta
  - `GET /accounts/me/storage` — usage + tier limits JSON
- `aucore/server.js` — readBody ažuriran: multipart/form-data → `_multipart` objekat; uploads route registrovan
- `aucore/hub/index.html` — REWRITE: Vehicle Data Platform SPA
  - Auth: login/register/magic-link
  - Dashboard: moja vozila + podeljena + storage gauge (usage/limit bar)
  - Vehicle detail: 3 taba — Slike (galerija + upload), Dokumenti (po tipu + upload), Info
  - Tier badge u headeru (Free/Tier1/Tier2/Tier3)
- `aucore/uploads/` — lokalni upload direktorijum (VPS: `/var/www/autouniverse/aucore/uploads/`)
- Live: `https://hub.autouniverse.rs/`

## 2026-08-08 (nastavak 3)

**Hub UI — SPA v1 (zamenjeno u nastavku 4)**
- `aucore/hub/index.html` (NOVO) — SPA: login/register, lista vozila, vehicle detail
- "Prodaj ovo vozilo" dugme per vozilo (uklonjeno u nastavku 4 — pripada Autopijaci)
- `server.js`: dodata ruta `/` i `/hub` → servira hub/index.html
- Live: `https://hub.autouniverse.rs/`

---

## 2026-08-08 (nastavak 2)

**Garage Toolbox — uputstvo za korisnike**
- `landing/garage-uputstvo.html` (NOVO) — 8 koraka: instalacija, profil radnje, radni nalog, predračun, kontakti, vozila, dnevnik, export/PDF
- `docs/garage-guide/` — 7 screenshotova iz live app-a
- `landing/garage.html` — dodata sekcija "Uputstvo" sa linkom na `/garage-uputstvo`
- Live: `https://autouniverse.rs/garage-uputstvo`

**Driver Toolbox — uputstvo za korisnike** (iz iste sesije)
- `landing/driver-uputstvo.html` (NOVO) — 10 koraka sa screenshotovima
- `landing/driver.html` — dodata sekcija "Uputstvo" sa linkom
- Live: `https://autouniverse.rs/driver-uputstvo`

---

## 2026-08-08 (nastavak)

**Fix: CF001 ostatak — pushState koristio `/vozila/{slug}/`**
- `hub-search.js` linija 79: `history.pushState` menjao URL u adress baru na `/vozila/{slug}/` — korisnik kopira URL → 404
- Fix: `/${v.slug}/`
- Cache-bust: `hub-search.js?v=2` u hub template (nginx `expires 7d` keširao stari fajl)

---

## 2026-08-08

**SSL fix — svi subdomeni**
- Nginx config nije imao HTTPS blokove za `hub`, `garage`, `driver`, `autopijaca`, `autodelovi` — samo HTTP
- Chrome odbijao vezu jer je fallback cert pokrivao samo `analytics.autouniverse.rs`
- Dodat 443 blok za svih 7 subdomena sa ispravnim certifikatima (cert `autouniverse.rs` pokriva hub/garage/driver/autopijaca/autodelovi)
- Lokalna kopija: `D:\BELORA\autouniverse-vozila\nginx-autouniverse.conf`

**Fix: 404 na vozila.autouniverse.rs**
- Deploy je koristio pogrešan SCP target `/var/www/vozila.autouniverse.rs/` umesto `/var/www/autouniverse/vozila/`
- Fix: kopiranje sa pogrešnog u pravi path + komentar sa ispravnom deploy komandom na vrhu `build.mjs`

**AU Core — email konekcija**
- `email.js`: GitHub Pages linkovi zamenjeni sa `hub.autouniverse.rs`
- Dodat `tplGrantAccess` template (email kad korisnik dobije pristup vozilu)
- `routes/accounts.js`, `routes/grants.js`: ažurirani da koriste `tplGrantAccess`
- VPS: kreiran `.env` sa `BREVO_API_KEY` — emailovi sada stvarno stižu

**Autopijaca integracija (AU Core ↔ Autopijaca)**
- 5 novih kolona u `vehicles`: `for_sale`, `sale_price`, `sale_currency`, `autopijaca_listing_id`, `autopijaca_seller_token`
- Nova ruta `routes/autopijaca.js`: GET/POST/PUT/DELETE `/vehicles/:id/autopijaca`
- Driver v1.40.0: dugme "Prodaj ovo vozilo" u vehicle detail → `hub_sell` screen → POST na AU Core

---

## 2026-08-07

**vozila SSG — Faza 2 + Faza 3 (107 modela)**
- Faza 2: 25 modela (Polo, Clio, Golf Plus, Megane, Focus, W204, E90, Octavia, Qashqai, i30, León, Grande Punto, Corolla, Civic, Cee'd, Mazda3, Lancer, Zafira, Fabia 2, Logan, Sandero, Yaris, Clio 3...)
- Faza 3: 57 novih modela (Outlander, Ibiza 4, Swift 3, Laguna 3, Yaris 3, Astra K, Yeti, Fiat 500, Q3, Mondeo Mk4, Rio 3, Santa Fe 2, MINI R56, Golf Plus, C4 2, Superb 3, Meriva A, Accord 7, Punto 2, Kangoo 2, 408 Mk1, V70 2...)
- Ukupno live: **107 modela** na `vozila.autouniverse.rs`

**vozila SSG — bugfixevi**
- `years 2–0` bug: parser pogrešno splitovao godine kad je drugi broj manji od prvog
- `price N/A` bug: engine bez cene prikazivao "N/A" umesto praznog polja
- `engine years string` bug u `detail.mjs`
- `related models note` field dodat

**robots.txt**
- Generisan automatski pri buildu, dodat u `build.mjs`
- Live: `vozila.autouniverse.rs/robots.txt`

**CF001 fix (hub-search.js)**
- JS-generisani linkovi koristili `/vozila/{slug}/` prefix koji ne postoji na subdomenu
- Ispravljeno na `/{slug}/` na 3 mesta (renderList, openModel, renderGrid)

**Known Faults Library**
- `core/data/known_faults.json` — 12 kvarova: VAG timing chain, EGR, DPF, DSG, lambda, MAF, alternator, amortizeri, kočnice/ABS...
- `build.mjs`: `matchKnownFaults()` — match po engine kodu, marki, VAG/PSA grupi, "generički"
- `detail.mjs`: sekcija "Poznati sistemski kvarovi" u kvarovi tabu

---

## 2026-08-05 / 2026-08-06

**Driver v1.39.0**
- `reg_calc` — formula za porez na upotrebu po zapremnini motora + Euro klasa + starost vozila

**Driver v1.38.0**
- FEEDBACK #17: transfer call na AU Core pri prodaji vozila

**Capacitor Android**
- `platforms/driver` — Capacitor projekat (Filesystem + Preferences + Camera + Share)
- npm scripts: `cap:sync`, `cap:apk` prebačeni na `platforms/`

---

## 2026-08-04

**VPS (Hetzner CX23) — go-live**
- PM2 fork mode fix, nginx config finalizovan
- HTTPS live za sve subdomene
- `deploy.sh` — kreira `data/` foldere, PM2 restart kroz `milan` user, `npm install` umesto `npm ci`

**Landing sajt v1 — autouniverse.rs**
- Početna stranica, `/ekosistem`, `/o-nama`, `/kontakt`
- `/driver`, `/garage` app landing stranice
- Kalkulatori: potrošnja, kredit, TCO, VIN, osiguranje AO + `/kalkulatori` hub
- Blog: 50 članaka u 5 kategorija
- OG image (1200×630), favicon, sitemap, 404
- Email double opt-in via Brevo
- GoatCounter analitika
- Android APK download sekcija

**Garage v1.57.0**
- QR kod offline (bundled `qrcode` MIT biblioteka)

**Driver v1.37.0**
- QR kod offline (bundled)

---

## 2026-07-22 / 2026-07-24

**VPS bootstrap (Hetzner CX23)**
- nginx config za `autouniverse.rs`, `hub`, `garage`, `driver`, `autopijaca`, `autodelovi`, `tradesmanplaybook.com`
- Certbot SSL za sve subdomene

**vozila SSG v1.0 — MVP**
- 4 modela live: Golf 6, Passat B7, Golf 4, Golf 5
- SSG engine: mini template engine, JSON vozila, generisanje detail stranica + hub + sitemap
- Statičke stranice na `vozila.autouniverse.rs`

---

## 2026-07-21

**AU Core — platforma paralelno sa testiranjem**
- Autopijaca integracija početak
- FEEDBACK protokol nije više gate za AutoHub/Autopijaca/Autodelovi

---

## 2026-07-18 / 2026-07-20

**Driver v1.37.0**
- QR share za vozilo
- `aucore_vehicle_map` localStorage — mapira lokalni ID na `hubServerId`

**AU Core — grants sistem**
- `POST /vehicles/:id/grants` — vlasnik daje pristup drugom korisniku
- In-app notifikacija pri dodeli pristupa

---

## 2026-07-16 / 2026-07-17

**AU Core rename / docs**
- Dokumentacija ažurirana, stari `docs/` folderi arhivirani
- `BRIEFING.md` — redovna ažuriranja statusa

---

## 2026-07-11 / 2026-07-12

**AU Core v0.6 — Autopijaca servis**
- Autopijaca (port 3001) deploy
- Autodelovi (port 3002) deploy
- Nginx reverse proxy za sve tri AU Core usluge

---
