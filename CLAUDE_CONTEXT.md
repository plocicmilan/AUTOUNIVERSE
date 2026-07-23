# AutoUniverse — Claude Kontekst
**Poslednji update:** 2026-07-24
**Folder:** `D:\BELORA\autouniverse\`
**GitHub:** `https://github.com/plocicmilan/AUTOUNIVERSE`
**Pages:** `https://plocicmilan.github.io/AUTOUNIVERSE/`

---

## Šta je projekat

PWA ekosistem za auto industriju. Filozofija: vozilo je centralni entitet. Sve počinje standalone — bez servera, bez naloga, offline first. Platforma se gradi tek kad standalone dokaže vrednost.

**Tri nivoa funkcija:**
- 🟢 Basic — besplatno (watermark na PDF)
- 🔑 Otključano kodom (`TEST-UNLOCK` za testere, budući Gumroad za produkciju)
- ☁️ Platform — kad platforma postoji (sync, deljenje, QR)

---

## Aplikacije

### Garage Toolbox (`/garage/`)
- **Korisnik:** Marko (Android/Chrome) i Goran (iPhone/Safari)
- **Zamenjuje:** svesku i Viber haos
- **Core flow:** WO Snap (7 koraka) → PDF → Share Viber/SMS
- **Ikona:** crveni zupčanik
- **Verzija:** v1.56.0 (live na GitHub Pages)
- **SW verzija:** `garage-toolbox-v1.56.0`
- **Moduli implementirani (2026-07-24):**
  - 🟢 WO Snap + autocomplete iz istorije, Vozila (foto, beleška), Kontakti (search, istorija, prihod)
  - 🟢 PDF (firma detalji, logo, watermark za free tier), Dosije vozila PDF
  - 🔑 Predračun/Estimate, Podsetnici, Statistike, Kalkulatori (marža/servis/rad/PDV)
  - 🔑 DVI Inspekcija (6×29), Check liste (prijem/put/zima), Gume modul
  - 🔑 Vizit karta (bez QR), Event Detail screen, Dnevnik (termini + zakazivanje)
  - 🔑 Servisne kategorije (12 grupa), Autodelovi integracija (sell_part + my_parts ekrani)
  - ☁️ Notification bell (AutoHub) — unread count + sheet, read-all, 5min poll
  - HOME: termini danas + poslednji poslovi + stat tiles
  - Vozila sortiraju po poslednjoj aktivnosti
  - CSV export: predračuni, radni nalozi, kontakti (BOM, Excel-safe)
- **Deferred:** Inventar (čeka signal), QR kod (čeka bundled lib)

### Driver Toolbox (`/driver/`)
- **Korisnik:** vlasnik vozila (prvi tester: Milan)
- **Zamenjuje:** "ne znam kad je bio servis, koje su gume..."
- **Core flow:** Dodaj vozilo → Početno stanje (4 kartice) → Podsetnici automatski
- **Ikona:** tirkizni auto sa dokumentom
- **Verzija:** v1.36.0 (live; SW: driver-toolbox-v1.36.0)
- **Posebno:** "Iskopaj fioku" (retroaktivni unos), Trust Layer, Expense modul, Vehicle status, Trade toggle, Autopijaca integracija, Notification bell, Kalkulatori (registracija/gorivo/vlasništvo/uvoz/kasko), Browse Autopijaca/Autodelovi, Forgot/Reset lozinka, Sessions ekran, URL token handler (reset link iz emaila)

### AU Core (`aucore/`)
- **Šta je:** backend server (ranije AutoHub) koji Garage i Driver "vide" kad vlasnik i mehaničar žele da dele podatke
- **Stack:** Node.js v24 (vanilla http modul) + better-sqlite3 + bcryptjs
- **Port:** 3000
- **Status:** 🟢 **LIVE** — na Milanovom PC + Cloudflare Tunnel, testiranje aktivno
- **Endpointi:** auth (register/login/logout/magic-link/forgot/reset/sessions), vehicles, grants, events, notifications, share, public, admin
- **Admin panel:** `http://localhost:3000/admin` — health status 3 servera, korisnici, audit log, notifikacije, drip preview
- **Magic-link razmena:** ✅ URAĐENO (Garage šalje link → Driver skenira QR/otvara link → prihvata/odbija)

### Autopijaca (`autopijaca/`)
- **Šta je:** marketplace za prodaju automobila — poseban server
- **Stack:** Node.js v24 + better-sqlite3 (isti pattern kao AutoHub)
- **Port:** 3001
- **Status:** 🟢 **LIVE** — Cloudflare Tunnel aktivan, Driver integracija ✅, javna stranica Industrial Dark dizajn
- **Tok:** Driver (`trade_mode=true`) → POST `/listings` → javna `/prodaja` stranica
- **Auth:** `seller_token` (random 32 hex, vraća se pri kreiranju, čuva u Driver-u)
- **Javna stranica:** Industrial Dark, Barlow Condensed, orange accent (#FF5722), SVG car watermark
- **Pokreni:** `node D:\BELORA\autouniverse\autopijaca\server.js`

### Autodelovi (`autodelovi/`)
- **Šta je:** marketplace za prodaju auto delova — poseban server
- **Stack:** Node.js v24 + better-sqlite3 (isti pattern kao AutoHub i Autopijaca)
- **Port:** 3002
- **Status:** 🟢 **LIVE** — Cloudflare Tunnel aktivan, Garage integracija ✅, javna stranica Industrial Dark dizajn
- **Tok:** Garage (`sell_part` ekran) → POST `/parts` → javna `/delovi` stranica sa 11 kategorija + filter kompatibilnosti
- **Auth:** `seller_token` (random 32 hex, isti pattern kao Autopijaca)
- **Posebno:** `compatible` JSON array ({make, model, year_from, year_to}) — kupac može da traži deo po svom vozilu
- **Javna stranica:** Industrial Dark, Barlow Condensed, steel blue accent (#0EA5E9), SVG wrench watermark
- **Pokreni:** `node D:\BELORA\autouniverse\autodelovi\server.js`

---

---

## Strateške odluke 2026-07-23

| Tema | Odluka |
|---|---|
| **Driver monetizacija** | Potpuno besplatan — ad-supported + affiliate + lead gen (čeka 500+ MAU) |
| **Garage monetizacija** | Freemium — basic free (watermark na PDF), Premium ~10€/mes (ključovane funkcije) |
| **Autopijaca hosting** | Subdomen `autopijaca.autouniverse.rs` — standalone SEO, deljena SSO baza korisnika |
| **Autodelovi tip** | P2P od majstora, kroz Garage flow, direktan dogovor kupac-prodavac (kao KupujemProdajem) |
| **AU Score arhitektura** | Interpretacija B — agregatni anonimni podaci sistema; pojedinačni zapisi (VIN, ime, fotos, računi) ostaju na telefonu |
| **Novi brend termin** | "Servisni pasoš auta" = dosije vozila za prodaju (timeline + zapisi + AU Score) |
| **Nova vertikala** | "Jedna stranica — jedan auto" → `autouniverse.rs/vozilo/volkswagen-golf-6-2008-2013/` — SEO baza, P2 faza |
| **AdMob / Lead gen** | Sačekati 500+ MAU pre otvaranja |

### P0 sprinta (0–30 dana)
1. **Kalkulator registracije** — Driver v1.1 + landing page `autouniverse.rs/kalkulator-registracije`
   - Nikola već koristi ovaj feature na E-Knjižici
   - Formula iz osiguranik.com (javna), ažurira se jednom godišnje
   - Fallback: "Poslednji update: DD.MM.GGGG — proveri na osiguranik.com"
2. **QR + share flow Garage → Driver** — za neregistrovanog vlasnika
   - Marko završava servis → klikne "Podeli sa vlasnikom"
   - Generiše QR kod + link: `autouniverse.rs/share/{token}` (30 dana, read-only)
   - Marko štampa QR na PDF računu ILI šalje Viber-om
   - Vlasnik skenira → vidi zapis + CTA "Instaliraj Driver Toolbox"

### P1 (30–90 dana)
- Timeline view u Driver-u (vizuelna alternativa tabeli)
- Kalkulator troškova vlasništva
- Kalkulator potrošnje goriva
- "Šta proveriti pri kupovini" PDF checklist (email capture)
- Garage: "Ovaj deo je još upotrebljiv?" → auto oglas na Autodelovi
- Kalendar zakazivanja za Garage (Marko vodi na papiru)

### P2 (90–180 dana)
- "Jedna stranica jedan auto" Faza 1 (top 50 modela)
- Autodelovi MVP (lista, filter, direktan kontakt)
- Kalkulator uvoza vozila
- "Servisni pasoš auta" PDF export za prodaju vozila

### P3–P4 (6–12+ meseci)
- Interaktivni SVG dijagram delova — top 5 modela (Golf, Astra, Punto, Clio, Passat)
- AU Score v1 (za mehaničare)
- "Koliko košta kvar" baza (iz Garage podataka)
- Autopijaca subdomen + marketplace (Faza 5+)
- Lead gen + AdMob (posle 500+ MAU)

### Konkurencija — referentni dokumenti
- `docs/KONKURENCIJA_v1.md` — Inspira Grupa, PA, marketplace analiza
- `docs/KONKURENCIJA_APLIKACIJE_v1.md` — AutoTEK, E-Knjižica, MyESK, Putevi Srbije
- `docs/AU_PROIZVOD_STRATEGIJA_v1.md` — Konsolidovana strategija sa Milanovima odlukama

### Ključni uvidi iz konkurentske analize
- **Inspira Grupa** (PA + AutoHub.rs + MojaGaraza.rs) nema operativne aplikacije — AU teritorija je čista
- **AutoTEK** cilja formalne servise (e-fiskalizacija, TecDoc, 5+ zaposlenih) — Marko/Goran ne znaju za njega
- **E-Knjižica** ima kalkulator registracije (Nikola ga koristi) → P0 gap
- **MyESK** ima grant flow ali cloud-only, bez opoziva, bez role-based → AU je strukturno bolji
- **AU differentiator:** offline-first + role-based grant sa istekom/opozivom + trade mode (niko nema)

---

## Faze projekta

| Faza | Opis | Status |
|---|---|---|
| 1 | Garage Toolbox v1 | ✅ ZAVRŠENA |
| 2 | Driver Toolbox v1 | ✅ ZAVRŠENA |
| 3 | Feedback petlja (Marko/Goran/Nikola) | 🟢 AKTIVNA — signal stigao, implementacija u toku |
| 4 | AutoHub server + magic-link razmena | ✅ ZAVRŠENA — LIVE sa Cloudflare tunnelom |
| 4.1 | Driver v1.9 — expense, trade toggle, vehicle status, Autopijaca integracija | ✅ ZAVRŠENA |
| 4.2 | Garage v1.28 — servisne kategorije, Autodelovi integracija | ✅ ZAVRŠENA |
| 4.3 | Autopijaca + Autodelovi marketplace | ✅ MVP LIVE — Cloudflare tunneli, Industrial Dark UI |
| 5 | AutoUniverse Account + napredne funkcije | 🔵 P2/P3 — čeka feedback sa terena |

---

## Tehničke činjenice

| Komponenta | Rešenje |
|---|---|
| Frontend | Vanilla JS + HTML + CSS (PWA) |
| Offline | Service Worker (GATE A: avion mod test) |
| Storage | IndexedDB + localStorage za settings |
| PDF | jsPDF bundled lokalno |
| Hosting | GitHub Pages (besplatno, isti origin = deli IndexedDB) |
| Licenca | Gumroad License API; TEST-UNLOCK za dev/testere |
| iOS | Safari + "Add to Home Screen" (NE Chrome!) |
| Node.js | v24.15.0 (instaliran, spreman za AutoHub) |

**Storage izolacija (ODLUČENO 2026-07-19):** Svaka app mora imati SOPSTVENI namespace u Store-u i sopstveni export/import podataka. Garage i Driver NE dele IndexedDB bazu iako su na istom GitHub Pages origin-u. FEEDBACK #2 zatvoren.

**SW cache verzije:** kad pushneš update, OBAVEZNO podigni broj u `garage/sw.js` i `driver/sw.js` — inače telefoni drže stari keš.

---

## Ispitanici

| Osoba | Uređaj | App | Kod | Napomena |
|---|---|---|---|---|
| Marko | Android/Chrome | Garage | TEST-UNLOCK | Ima kolegu Pavla (multi-user signal) |
| Goran | iPhone/Safari | Garage + Driver | TEST-UNLOCK | Backup obavezan! Safari briše podatke |
| Nikola | Android/Chrome | Driver | TEST-UNLOCK | Aktivan tester od 2026-07-11; koristi i Honey (MU) |
| Kolega preprodavac | nepoznato | Driver + trade mod | TEST-UNLOCK | 4 aktivna vozila, 5–6 mesečno, čeka draft poruku |
| Milan | Bilo koji | Driver + Garage + AutoHub admin | TEST-UNLOCK | Vlasnik projekta |

---

## FEEDBACK.md status

Stavke **#1–#20** u `autouniverse/FEEDBACK.md`. Ažurirano 2026-07-19.

| # | Opis | Status |
|---|---|---|
| 1 | Retroaktivni unos (početno stanje) | ✅ URAĐENO |
| 2 | Deljena IndexedDB — namespace odluka | 🟡 u analizi |
| 8 | Servisne kategorije preuzake (12 grupa) | ✅ URAĐENO — v1.23.0 |
| 9 | AutoHub magic-link razmena | ✅ URAĐENO |
| 10 | JSON payload razmene (VIN, delovi, next_service) | ✅ URAĐENO |
| 11 | Expense modul (event.cost, 7 kategorija, TROŠKOVI ekran) | ✅ URAĐENO |
| 12 | Vehicle switcher + status polje | ✅ URAĐENO |
| 13 | Trade toggle po vozilu | ✅ URAĐENO |
| 14 | Prodaj wizard (Autopijaca integracija iz Driver-a) | ✅ URAĐENO — v1.9.0 |
| 15 | Informal flag | ✅ URAĐENO |
| 16 | registered_owner | ✅ URAĐENO |
| 17 | Automatski transfer pri prodaji model design | 🔵 Faza 5 |
| 18 | Marketplace (pokriven Autopijaca + Autodelovi) | ✅ URAĐENO — LIVE |
| 19–20 | AutoUniverse Account... | 🔵 P2/P3 — čeka feedback |

**Pravilo:** ništa se ne kodira dok nije u FEEDBACK.md.

---

## Folder struktura

```
autouniverse/
├── CLAUDE_CONTEXT.md        ← OVAJ FAJL
├── BRIEFING.md              ← Kompaktni status za Desktop Claude (kopiraj-nalepi)
├── DEPLOY.md                ← Uputstvo za deploy
├── DRIVER_TOOLBOX_SPEC.md   ← Driver specifikacija
├── FEEDBACK.md              ← Živa lista signala iz terena (od korisnika)
├── README.md
├── core/                    ← Zajednički moduli (~70% koda)
├── garage/                  ← Garage Toolbox PWA (v1.1 live)
├── driver/                  ← Driver Toolbox PWA (v1 live)
├── tests/                   ← 53 testa (GATE B ✅)
├── docs/                    ← Korisnička dokumenta + Mapa sveta + Market Research
├── sessions/                ← Dnevnik rada
├── ideas/                   ← Ideje, hipoteze, predlozi (Ideas Hub)
│   ├── INDEX.md             ← Katalog svih ideja + status
│   ├── raw/                 ← Drop zona (prazna posle obrade)
│   ├── hypothesis/          ← "Možda kasnije" — sa uslovima aktivacije
│   ├── accepted/            ← Odobreno, čeka implementaciju
│   └── rejected/            ← Odbačeno sa razlogom (da se ne vraća)
└── autohub/                 ← BUDUĆI server (Faza 4)
```

## Ideas Hub — kako se koristi

Razlika od FEEDBACK.md:
- **FEEDBACK.md** = konkretni signali iz upotrebe (ko je rekao šta, kada) → drives implementation
- **ideas/** = razmatranja svih vrsta (strategija, hipoteze, istraživanja, predlozi bez trigger-a)

**Tok:** Milan baci fajl u `ideas/raw/` → Claude Code razgovara sa njim → premesti u `hypothesis/`/`accepted/`/`rejected/` → upiši u INDEX.md.

**Komande:**
- *"pročitaj autouniverse/ideas/raw/"* — obradi sve u raw/
- *"obradi ovu ideju: ..."* — upiši direktno iz razgovora
- *"šta imamo u hipotezama"* — lista svega u hypothesis/

---

## Dokumenti projekta

| Fajl | Sadržaj |
|---|---|
| `AUTO_UNIVERSE_MAPA_SVETA_v1.md` (u docs/) | Filozofija, moduli, model podataka, redosled razvoja, monetizacija |
| `MARKET_RESEARCH.md` (u docs/) | Konkurencija (globalna + lokalna), GAP analiza |
| `Garage_Toolbox_uputstvo_za_Marka.pdf` | User manual za mehaničara (6 str) |
| `Driver_Toolbox_uputstvo_za_Gorana.pdf` | User manual za vlasnika — iPhone (6 str) |

---

## AutoHub — plan kad dođe vreme

```
autohub/
├── server.js          ← vanilla Node.js http server
├── db.js              ← better-sqlite3 + migracije
├── auth.js            ← registracija/login/JWT tokeni
├── permissions.js     ← grant() primitiv — jedinstveni model dozvola
├── routes/            ← API endpointi
├── admin/             ← statični HTML admin panel
├── data/autohub.db    ← SQLite baza
└── package.json
```

### ⚠️ OBAVEZA za AutoHub Sesiju 6 (dan 1)

**Permission model se gradi kao JEDAN primitiv, ne kao tri.**

```
grant(user_A, user_B, vehicle_id, role, [expires_at])
```

Sve što liči na "team account", "workshop", "share with mechanic" — sve su UX obrasci preko istog primitiva. Ne graditi paralelne modele.

| Slučaj | Kako se rešava |
|---|---|
| Vlasnik daje pristup majstoru | `grant(vlasnik, majstor, vozilo, "write")` |
| Marko + Pavle (ista radionica) | auto-grant pravilo: Pavle dobija pristup na svako novo Markovo vozilo |
| Marko + Goran (povremeno) | `grant(Marko, Goran, vozilo, "write", +7d)` |
| Vulkanizer vidi samo gume | `grant(vlasnik, vulkanizer, vozilo, "write-tires-only")` |

**Razlog:** Ako AutoHub počne od "team accounts", Marko+Goran postaje naknadna komplikacija. Ako počne od `grant()`, sve slučajeve rešava jedan mehanizam — uključujući i one koji još nisu identifikovani.

**Izvor:** FEEDBACK.md #3 + Desktop Claude sinteza (2026-07-11).

**Cloudflare Tunnel** za testiranje: `npx cloudflare tunnel --url http://localhost:3000`
→ javna HTTPS adresa bez VPS-a, radi dok je računar upaljen.

**`platform-url.json`** na GitHub Pages: aplikacije čitaju gde je trenutni server.
→ kad se tunel promeni, samo updateuješ ovaj fajl (jedan commit, 10 sekundi).

---

## Komande koje koristimo

| Komanda | Šta radi |
|---|---|
| `git push origin main` | Deploy na GitHub Pages (obe app-e automatski) |
| Podigni cache u sw.js | `v1.X.0` → `v1.X+1.0` pre svakog pusha |
| `node autohub/server.js` | Pokretanje AutoHub servera (Faza 4) |
| `npx cloudflare tunnel --url http://localhost:3000` | Javna HTTPS adresa za testere |
