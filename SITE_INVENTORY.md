# AutoUniverse — Site Inventory
**Ažurirano:** 2026-09-10
**Live na:** https://autouniverse.rs

Čitaj ovaj fajl na početku svake AU sesije zajedno sa `CLAUDE_CONTEXT.md`.
Ažuriraj kad god dodaješ ili uklanjаš stranicu/funkcionalnost.

---

## Subdomeni i servisi

| Subdomen | Port | PM2 (user: milan) | Opis |
|---|---|---|---|
| autouniverse.rs | 80/443 | `landing` | Landing + blog + kalkulatori (statični HTML) |
| hub.autouniverse.rs | 3000 | `aucore` | AU Core platforma (login, vozila, sinhronizacija) |
| autopijaca.autouniverse.rs | 3001 | `autopijaca` | Oglasnik za prodaju automobila |
| autodelovi.autouniverse.rs | 3002 | `autodelovi` | Oglasnik za prodaju auto delova |
| vozila.autouniverse.rs | — | nginx static | SSG baza vozila (200 modela) |
| analytics.autouniverse.rs | 8080 | GoatCounter | Analitika (self-hosted) |
| blog.autouniverse.rs | — | nginx 301 | → autouniverse.rs/blog (redirect) |

---

## autouniverse.rs — Landing

### Glavne stranice
| URL | Fajl | Opis |
|---|---|---|
| `/` | `index.html` | Homepage — hero, ekosistem, kalkulatori promo, testimonijali, install |
| `/ekosistem` | `ekosistem.html` | Šta je AU, sve app-e, arhitektura |
| `/o-nama` | `o-nama.html` | Tim, misija |
| `/kontakt` | `kontakt.html` | Kontakt forma → Brevo |
| `/potvrda` | `potvrda.html` | Email opt-in potvrda |
| `/privatnost` | `privatnost.html` | Politika privatnosti |
| `/uslovi` | `uslovi.html` | Uslovi korišćenja |
| `/garage` | `garage.html` | Landing za Garage Toolbox (APK download, screenshots) |
| `/driver` | `driver.html` | Landing za Driver Toolbox (APK download, screenshots) |
| `/garage-uputstvo` | `garage-uputstvo.html` | Uputstvo za Garage (11 koraka, screenshots) |
| `/driver-uputstvo` | `driver-uputstvo.html` | Uputstvo za Driver (13 koraka, screenshots) |

### Kalkulatori
| URL | Fajl | Opis |
|---|---|---|
| `/kalkulatori` | `kalkulatori.html` | Hub svih kalkulatora |
| `/kalkulatori/registracije` | `kalkulatori/registracije.html` | Kalkulator troškova registracije (ccm, godište, gorivo → RSD po stavkama) |
| `/kalkulatori/uvoza` | `kalkulatori/uvoza.html` | Kalkulator uvoza vozila (carina + PDV + homologacija) |
| `/kalkulatori/kredit` | `kalkulatori/kredit.html` | Kalkulator auto kredita |
| `/kalkulatori/osiguranje` | `kalkulatori/osiguranje.html` | Kalkulator AO osiguranja |
| `/kalkulatori/potrosnja` | `kalkulatori/potrosnja.html` | Kalkulator potrošnje goriva |
| `/kalkulatori/tco` | `kalkulatori/tco.html` | Total cost of ownership |
| `/kalkulatori/vin` | `kalkulatori/vin.html` | VIN dekoder |
| `/kalkulator-registracije` | — | 301 → `/kalkulatori/registracije` (legacy) |
| `/kalkulator-uvoza` | — | 301 → `/kalkulatori/uvoza` (legacy) |

### Blog
| URL | Opis |
|---|---|
| `/blog` | `blog.html` — listing svih blog postova |
| `/blog/*.html` | 98 blog postova u `landing/blog/` folderu |

**Blog teme:** istorijati modela (Audi, BMW, Citroën, Dacia, Fiat, Ford, Hyundai, Kia, Mazda, Mercedes, Mitsubishi, Nissan, Opel, Peugeot, Renault, SEAT, Škoda, Toyota, VW), plus vodiči (amortizeri, osiguranje, zelena karta, uvoz, EV, vozačka dozvola...)

**Kako je Petar Jovanović (organski user) pronašao sajt:** blog post → Autodelovi.

---

## vozila.autouniverse.rs — Baza vozila

**SSG** (Static Site Generator), `build.mjs` generiše HTML iz JSON-a.
**Deploy path:** `/var/www/autouniverse/vozila/`

| URL | Opis |
|---|---|
| `/` | Hub — grid 200 vozila, filteri (marka/segment/gorivo), sort |
| `/{slug}` | Detail stranica po modelu (npr. `/volkswagen-golf-6-2008-2013`) |
| `/sitemap-vozila.xml` | Sitemap (200 URL-ova) |
| `/404.html` | Custom 404 |

**Pokriva:** 200 modela, 26 marki (Audi, BMW, Citroën, Dacia, Fiat, Ford, Honda, Hyundai, Kia, MINI, Mazda, Mercedes/Mercedes-Benz, Mitsubishi, Nissan, Opel, Peugeot, Renault, SEAT, Subaru, Suzuki, Toyota, VW, Volvo, Škoda)

**Svaka stranica prikazuje:** motori, kvarovi (Known Faults Library), cene po godištu (market_data_serbia), kupovni savet, slični modeli, cross-link na Autopijaca + Autodelovi

**JSON data:** `autouniverse-vozila/data/vehicles/*.json` (200 fajlova)

---

## hub.autouniverse.rs — AU Core

**Node.js API + HTML SPA**, port 3000, `aucore/`

### Funkcionalnosti
- Registracija / login (magic link + lozinka)
- Tiers: Free (1 vozilo), Basic (10), Pro (neograničeno)
- Lista vozila, dodaj/uredi/obriši vozilo
- Cloud sync (POST /vehicles/sync — last-write-wins)
- Bidirectionalni events sync (Garage ↔ Driver)
- Deli vozilo (grant pristup po emailu, role: read_only)
- Prenos vlasništva (/vehicles/:id/transfer)
- Autopijaca integracija (postavi vozilo na prodaju direktno iz Hub-a)
- Upload dokumenata i slika (vozila)
- Notifikacioni bell (60s poll)
- Forgot password, profile edit, obriši nalog

### API rute (ključne)
| Metod | Ruta | Opis |
|---|---|---|
| POST | `/auth/register` | Registracija |
| POST | `/auth/login` | Login (magic link ili lozinka) |
| GET | `/auth/me` | Trenutna sesija |
| GET/POST | `/vehicles` | Lista / dodaj vozilo |
| POST | `/vehicles/sync` | Cloud sync batch |
| POST | `/vehicles/:id/transfer` | Prenos vlasništva |
| POST/DELETE | `/vehicles/:id/autopijaca` | Postavi/povuci oglas |
| GET/POST | `/events/batch` | Sync događaja (Garage↔Driver) |
| POST | `/grants` | Deli vozilo |

---

## autodelovi.autouniverse.rs — Auto Delovi Oglasnik

**Node.js server**, port 3002, `autodelovi/`

### Funkcionalnosti
- Pretraži delove (po marki, modelu, kategoriji, ključnoj reči)
- Postavi oglas (title, cena, kategorija, gorivo/godište, dostava, zamena, 3 foto, kontakt: telefon + email)
- Auth opcionalan (POST /parts — user_id = null za anonimne)
- Seller token (prikazan pri kreiranju — čuva ga kupac za edit/brisanje)
- Token recovery (POST /parts/recover-token — po emailu, 1x/h)
- SSR stranice po delu (`/deo/{id}-{slug}`) — JSON-LD Product+Offer schema
- Sitemap `/sitemap.xml`
- 24 kategorije delova

### Email flowovi
- **tplSellerToken** — potvrda oglasa + token (odmah po postavljanju)
- **tplWelcome** — welcome email za prvi oglas sa emailom (3 saveta za brzu prodaju)
- **tplRecoverTokens** — recovery email za token

### DB: `autodelovi/data/autodelovi.db`
Tabele: `parts` (id, title, price_eur, category, make, model, year, mileage, fuel, description, condition, compatible_vehicles, oe_number, contact_phone, contact_email, contact_method, images, delivery, swap, seller_token, user_id, created_at, updated_at, status)

---

## autopijaca.autouniverse.rs — Prodaja Automobila

**Node.js server**, port 3001, `autopijaca/`

### Funkcionalnosti
- Pretraži oglase (gorivo, cena, sort)
- Postavi oglas (make, model, godište, km, gorivo, menjač, cena, VIN, 3 foto, kontakt)
- Seller token + recovery
- SSR stranice po autu (`/auto/{id}-{slug}`) — JSON-LD Vehicle schema
- Sitemap `/sitemap.xml`
- Contact forma za sve oglase

### DB: `autopijaca/data/autopijaca.db`
Tabele: `listings` (id, make, model, year, mileage_km, fuel, gearbox, price_eur, description, vin, images, contact_phone, contact_email, contact_method, seller_token, user_id, created_at, updated_at, status)

---

## PWA Apps (offline, installable)

### Garage Toolbox — za auto servise / mehaničare
**URL:** `https://garage.autouniverse.rs` (statički iz `/var/www/autouniverse/garage/`)
**Verzija:** v1.60.0 | **APK:** `Garage-v1.60.apk`
**Funkcionalnosti:** radni nalozi, klijenti, vozila, eventi, sell_part, cloud sync, AU Core login, QR share, PDF servisni pasoš, nedeljni kalendar

### Driver Toolbox — za vozače
**URL:** `https://driver.autouniverse.rs`
**Verzija:** v1.45.0 | **APK:** `Driver-v1.45.apk`
**Funkcionalnosti:** moja vozila, istorija servisa, timeline view, kalkulatori (registracija, uvoz, potrošnja, troškovi), car_check checklist, prodaj vozilo (Autopijaca), prodaj deo (Autodelovi), cloud sync, AU Core login, deljeno vozilo (read-only), pretraži delove

---

## Infrastruktura

| Stavka | Vrednost |
|---|---|
| VPS | Hetzner belora-vps-01, CX23, Nuremberg |
| IP | 46.225.236.107 |
| OS | Ubuntu, nginx/1.28.3 |
| SSL | Let's Encrypt, *.autouniverse.rs važi do 2026-11-05 |
| DNS | Cloudflare (autouniverse.rs zona), wildcard `*.autouniverse.rs` → VPS |
| Email | Cloudflare Email Routing: hello@autouniverse.rs → beloraventures@gmail.com |
| Analitika | GoatCounter na analytics.autouniverse.rs (self-hosted, port 8080) |
| PM2 | procesi pod `milan` userom (ne root!) |

**Deploy pattern:**
```
scp file root@46.225.236.107:/var/www/autouniverse/...
su - milan -c 'pm2 restart <service>'  # za Node.js servise
nginx -s reload                         # za nginx config promene
```

---

## Poznati issues (otvoreni)

| # | Gde | Problem | Prioritet |
|---|---|---|---|
| 1 | vozila | 2 Citroën hero slike 404 (berlingo-2, c3-2) | ✅ RIJEŠENO 2026-09-13 |
| 2 | autodelovi / autopijaca | favicon.ico + icon-192.png 404 (PWA install) | ✅ RIJEŠENO 2026-09-13 |
| 3 | 54 vozila | Nedostaju `years_production_start/end` (old JSON schema) | ✅ RIJEŠENO 2026-09-13 |
