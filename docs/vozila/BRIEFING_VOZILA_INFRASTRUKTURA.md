# BRIEFING: Vozila SSG Infrastructure & Template
## Za Terminal Claude

**Verzija:** 1.0
**Datum:** 2026-08-06
**Autor:** Chat Claude
**Status:** ✅ Spremno za implementaciju
**Trajanje procenjeno:** 38-58h (1-2 nedelje part-time)

---

## 1. Cilj

Napraviti **"Vozila" sekciju** sajta autouniverse.rs — server-side generisane HTML stranice po modelu vozila, koje čitaju JSON fajlove kao izvor istine. Split-panel hub sa vanilla JS pretragom + individualne detail stranice sa SEO fokusom.

**Prvi live rezultat:** dve funkcionalne stranice (Golf 6 + Passat B7) sa split-panel hubom pod `autouniverse.rs/vozila/`.

## 2. Scope OVOG briefinga

**Ono što gradiš:**
- Node.js SSG build skript
- HTML template za detail stranice
- CSS koji prati AU design sistem
- Split-panel hub sa vanilla JS pretragom + filtrima
- Sitemap generacija
- Deploy na Hetzner VPS pod `/vozila/`
- Playwright integracioni test

**Ono što NIJE u ovom briefingu (obraditi kasnije):**
- Dodavanje novih JSON fajlova za modele (radi Chat Claude)
- SEO audit rezultata (posle deploya)
- Ispravka reg_calc-a (poseban audit dokument postoji: REG_CALC_AUDIT.md)
- Mobile wireframe tuning (Chat Claude će isporučiti pre implementacije)
- Autopijaca integracija (dinamički blokovi cena)

## 3. Reference dokumenti

Terminal Claude, pročitaj OVIM redosledom:

1. **VOZILA_v0.3_KONACNA_25.md** — spec dokument (šta se pravi)
2. **/data/vehicles/volkswagen-golf-6-2008-2013.json** — pilot model, kompletno popunjen (106 KB). Ovo je "ground truth" za strukturu.
3. **/data/vehicles/volkswagen-passat-b7-2010-2014.json** — drugi model (124 KB). Dokazuje da struktura radi za više VW modela.
4. **REG_CALC_AUDIT.md** — bag u kalkulatoru registracije (NE popravljati kroz ovaj briefing, samo znati)

**Ako neki dokument nedostaje** — pitaj Milana pre nego što nastaviš. Ne izmišljaj strukturu.

## 4. Tech stack (STROGO)

**Dozvoljeno:**
- Node.js 20+, ES modules (`.mjs` ili `"type": "module"` u package.json)
- Vanilla HTML, CSS, JavaScript
- CSS custom properties za design tokene
- Playwright za integracione testove
- `better-sqlite3` za opcioni cache (verovatno nepotrebno za MVP)

**NIJE dozvoljeno:**
- Frameworks: React, Vue, Svelte, Astro, Next.js, 11ty — NIŠTA
- Build tools: webpack, vite, rollup, esbuild — NIŠTA
- TypeScript
- CSS preprocessori (Sass, Less)
- CSS-in-JS
- Runtime CDN pozivi (sve asset-e lokalno)
- npm dependencies preko 5 (build vreme i sigurnost)

**Razlog stroge liste:** AU stack je vanilla-first po Milanovoj filozofiji. Sve što se doda kompleksuje životni ciklus projekta.

## 5. Struktura fajlova

Kreiraj sledeću strukturu u novom repo folder-u `autouniverse-vozila/`:

```
autouniverse-vozila/
├── build/                          # generated (gitignored)
│   ├── vozila/
│   │   ├── index.html              # hub sa split-panel
│   │   ├── volkswagen-golf-6-2008-2013/
│   │   │   └── index.html
│   │   ├── volkswagen-passat-b7-2010-2014/
│   │   │   └── index.html
│   │   └── sitemap.xml
│   └── static/                     # slike, CSS, JS
├── data/vehicles/                  # JSON source of truth (Chat Claude piše)
│   ├── volkswagen-golf-6-2008-2013.json
│   └── volkswagen-passat-b7-2010-2014.json
├── templates/
│   ├── detail.html                 # template za detail stranicu
│   ├── hub.html                    # template za hub stranicu
│   └── partials/                   # reusable HTML fragmenti
│       ├── head.html
│       ├── header.html
│       ├── footer.html
│       ├── engine_card.html
│       ├── issue_card.html
│       ├── cta_block.html
│       └── related_model_card.html
├── static/
│   ├── css/
│   │   ├── tokens.css              # AU design tokeni
│   │   ├── base.css                # reset + typography
│   │   ├── layout.css              # grid, containers
│   │   ├── components.css          # cards, buttons, tags
│   │   ├── hub.css                 # split-panel specific
│   │   └── detail.css              # detail stranica specific
│   ├── js/
│   │   ├── hub-search.js           # split-panel search + filter (vanilla)
│   │   └── detail-nav.js           # section navigation + expand engine cards
│   ├── img/
│   │   ├── models/                 # slike vozila (Wikimedia Commons)
│   │   │   ├── vw-golf-6/
│   │   │   └── vw-passat-b7/
│   │   └── icons/                  # ikonice (Tabler set)
│   └── favicon.ico
├── build.mjs                       # SSG entrypoint (glavni skript)
├── deploy.mjs                      # deploy skript (rsync)
├── package.json
├── .gitignore                      # build/ + node_modules/
└── tests/
    └── vozila.spec.js              # Playwright integracioni test
```

## 6. build.mjs — SSG skript zahtevi

```
Funkcionalne zahteve:

1. Učitaj sve *.json iz data/vehicles/
2. Validiraj svaki JSON:
   - Sva obavezna polja prisutna (make, model, generation, engines, etc)
   - Sve JSON strukturne integritet (bez trailing zareza, bez nedostajućih zareza)
   - Log warning ako neki motor nema `oem_parts`
   - Log warning ako neki kvar nema `dtc_codes`
3. Za svaki vehicle:
   - Učitaj templates/detail.html
   - Zameni sve {{...}} placeholder-e sa JSON podacima
   - Generiši JSON-LD schema (Vehicle + FAQPage + BreadcrumbList + HowTo)
   - Ubaci sve CTA blokove na tačne pozicije (position field)
   - Napiši u build/vozila/<slug>/index.html
4. Generiši hub index.html:
   - Kompletan spisak vozila sa marka/model/generacija/segment/motori
   - Ubaci JSON kao inline JS objekat za pretragu (< 5KB)
   - Ubaci šesnaest opcija filtera (marka, segment, gorivo)
5. Generiši sitemap-vozila.xml sa svim URL-ovima
6. Kopiraj static/ folder u build/
7. Report na standardni izlaz:
   - Broj generisanih stranica
   - Vreme izgradnje
   - Upozorenja (fali podatak, itd)
   - Ukupna težina rezultata (KB)
```

Primer terminal outputa nakon uspešnog build-a:

```
🔧 AU Vozila — Static Site Generator
────────────────────────────────────

📚 Ucitavanje JSON podataka...
  ✓ volkswagen-golf-6-2008-2013.json (106.2 KB)
  ✓ volkswagen-passat-b7-2010-2014.json (124.5 KB)

🔍 Validacija...
  ✓ Sve obavezno polje prisutno
  ⚠️  Golf 6 CAYC — nema `au_measured_l100` (očekivano, dopunjuje se AU bazom)

🏗️  Generisanje detail stranica...
  ✓ /vozila/volkswagen-golf-6-2008-2013/index.html (48.3 KB)
  ✓ /vozila/volkswagen-passat-b7-2010-2014/index.html (52.1 KB)

🏠 Generisanje hub stranice...
  ✓ /vozila/index.html (23.4 KB)

🗺️  Sitemap...
  ✓ /vozila/sitemap.xml (0.4 KB)

📦 Kopiranje static asset-a...
  ✓ 24 CSS + JS + img fajlova

────────────────────────────────────
✅ Build uspešan za 1.8s
   Ukupno: 27 fajlova, 386.8 KB
```

## 7. detail.html template — obavezne sekcije

Redosled sekcija u detail stranici (u ovom redosledu tačno):

```
1. Hero
   - Slika 1600x900 WebP (lazy=false, ovo je above-fold)
   - Naslov: "Volkswagen Golf 6 (2008-2013)"
   - Podnaslov: segment + karoserija + šasija + platforma
   - 4 quick fact kartice: snaga, potrošnja, cena, godišnji trošak

2. Tab navigacija (sticky pri scroll-u)
   - Motori (N)
   - Kvarovi (N)
   - Održavanje
   - Točkovi
   - Multimedija
   - Cene
   - Kupovina
   - Slični

3. Motori
   - Lista motora kao expandable kartice
   - Zbijene: kod + naziv + snaga + potrošnja + verdict (kraćen)
   - Otvorene: sve tehnike detalji (torque, OEM parts, fluidi, itd)
   - JavaScript accordion (bez librarije)

4. Realna potrošnja
   - Tabela: motor, deklarisano grad/highway/kombinovano, AU izmereno
   - Ako je AU sample size = 0, prikaži seed_combined_l100 + napomenu

5. Kvarovi (najveci SEO magnet)
   - Sortirati po severity high → low
   - Za svaki: ikonica + title + km + DTC + simptomi + cena + izvor
   - Boja severity: high=crven, medium=žut, low=zelen (svela)

6. Održavanje
   - Tabela: task, interval, cena EUR, cena RSD, DIY difficulty
   - Torque specs za svaku stavku koja ih ima

7. Točkovi
   - Vizual dimenzija po trim-u
   - PCD, ET, TPMS specs
   - Tabela pritisaka

8. Multimedija
   - Accordion sa radio opcijama
   - Klima, audio, ADAS opcije

9. Cene u Srbiji
   - Grafik cena po godini
   - Top 20 delova sa cenama
   - Prosečan servis

10. Kupovina
    - Safe bet / avoid preporuke
    - Buying checklist sekcije (dokumenti/spolja/motor/enterijer/test-vožnja/OBD)

11. Slični modeli
    - Kartice sa slikom, imenom, cenom, razlogom

12. CTA blokovi
    - Ubaciti na tačne pozicije po JSON `position` polju
    - after_hero, after_engines_section, after_consumption, itd.

13. Footer
    - Atribucija slika (Wikimedia Commons + autor + licenca)
    - Datum poslednje revizije
    - "Podaci iz agregirane AU baze N=X vozila"
    - Kontakt / feedback link
```

## 8. hub.html template zahtevi

Split-panel struktura (desktop):

```
┌─────────────────────────────────────────┐
│ Header: AutoUniverse [Blog|Vozila|...]  │
├─────────────┬───────────────────────────┤
│ Left        │ Right                     │
│ 320px       │ fluid                     │
│             │                           │
│ 🔍 Pretraga │ Odaberi vozilo iz spiska  │
│             │ ili klikni na jedno       │
│ [Marka▾]    │ ispod:                    │
│ [Segment▾]  │                           │
│ [Gorivo▾]   │ [Grid preview 6 vozila]   │
│             │                           │
│ Popularni:  │                           │
│ ▸ VW Golf 6 │                           │
│ ▸ VW Pass.  │                           │
│             │                           │
│ Svi: (2)    │                           │
│ ▸ ...       │                           │
└─────────────┴───────────────────────────┘
```

Mobile (< 768px) — dva ekrana:

```
Ekran 1 — Lista (kada se otvori /vozila/):
┌────────────────────┐
│ [☰]  Vozila   [🔍] │
│ [Pretraga...]      │
│ [Filter chips row] │
├────────────────────┤
│ ▸ VW Golf 6    → │
│ ▸ VW Passat B7 → │
└────────────────────┘

Ekran 2 — Detalj (kada se klikne):
┌────────────────────┐
│ [← Nazad]  Golf 6  │
│ [Hero slika]       │
│ [Naslov + facts]   │
│ ...                │
└────────────────────┘
```

JavaScript zahtevi za hub-search.js:

```
- Filter po title, marci, generaciji
- Multi-select filter po segmentu (A, B, C, D, E)
- Multi-select po gorivu (benzin, dizel)
- Debounced input (300ms)
- Update URL hash za shareable filter (npr /vozila/#marka=vw)
- History API pushState kad se klikne na model
- Bez fetch-a — sve podaci inlinovani u HTML kao <script id="vehicles-data" type="application/json">
```

## 9. Design tokens (tokens.css)

```css
:root {
  /* Surface */
  --surface-1: #fafafa;
  --surface-2: #ffffff;
  --surface-3: #f4f4f5;
  
  /* Border */
  --border: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.16);
  
  /* Text */
  --text-primary: #1a1a1a;
  --text-secondary: rgba(0, 0, 0, 0.6);
  --text-muted: rgba(0, 0, 0, 0.4);
  --text-inverse: #ffffff;
  
  /* Accent (AU brand) */
  --bg-accent: #eef4ff;
  --text-accent: #1e40af;
  --border-accent: #3b82f6;
  
  /* Severity (za kvarove) */
  --severity-high: #dc2626;
  --severity-high-bg: #fee2e2;
  --severity-medium: #d97706;
  --severity-medium-bg: #fef3c7;
  --severity-low: #059669;
  --severity-low-bg: #d1fae5;
  
  /* Prevalence markers */
  --very-high: #10b981;
  --high: #34d399;
  --medium: #fbbf24;
  --low: #94a3b8;
  --very-low: #cbd5e1;
  
  /* Typography */
  --font-system: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Monaco, Menlo, monospace;
  
  /* Font sizes */
  --fs-xs: 11px;
  --fs-sm: 12px;
  --fs-base: 14px;
  --fs-md: 16px;
  --fs-lg: 18px;
  --fs-xl: 22px;
  --fs-2xl: 28px;
  --fs-3xl: 36px;
  
  /* Font weight */
  --fw-normal: 400;
  --fw-medium: 500;
  --fw-bold: 600;
  --fw-heavy: 700;
  
  /* Spacing */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-12: 48px;
  --sp-16: 64px;
  
  /* Radius */
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-xl: 16px;
  --r-full: 9999px;
  
  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  
  /* Layout */
  --max-content-width: 1240px;
  --hub-sidebar-width: 320px;
  --detail-tabs-height: 48px;
}
```

## 10. Deploy

**Target:** Hetzner Cloud CX22 (Nürnberg) VPS
**Path:** `/var/www/autouniverse.rs/public/vozila/`
**Web server:** nginx sa CORS + gzip + brotli
**SSL:** Cloudflare (već konfigurisano)

**Deploy skript (deploy.mjs):**

```
1. Trči build.mjs
2. rsync -avz build/ user@vps:/var/www/autouniverse.rs/public/
3. SSH poziva `sudo systemctl reload nginx`
4. Log: uspeh/neuspeh + broj sinhronizovanih fajlova
```

**Cron za automatsku dnevnu regeneraciju** (kasnije, kada AU baza počne da rasti):

```
0 3 * * * cd /home/user/autouniverse-vozila && node build.mjs && node deploy.mjs
```

**Zasad manuelni deploy** — Milan trči `npm run deploy` posle svakog updata JSON-a.

## 11. Testiranje (Playwright)

`tests/vozila.spec.js` mora pokriti:

```javascript
1. Hub se učita na autouniverse.rs/vozila/
2. Pretraga "golf" filtrira na Golf 6
3. Klik na Golf 6 otvara detail stranicu (URL menja)
4. Detail stranica ima svih 14 glavnih sekcija
5. Direktan URL /vozila/volkswagen-golf-6-2008-2013/ radi
6. Svi CTA linkovi imaju validne UTM parametre
7. JSON-LD parsira bez grešaka (jsonld biblioteka za test)
8. Mobile viewport (375px) — split-panel se raspada u dva ekrana
9. Tab navigacija radi (klik → scroll ka sekciji)
10. Accordion motora se otvara na klik
```

Trči sa: `npm test`

## 12. Gates za prihvatanje

Ove kriterijume MORA da zadovolji pre nego što se stavi live:

- [ ] Sve Playwright testove prolaze
- [ ] Golf 6 i Passat B7 stranice se renderuju bez grešaka
- [ ] Sitemap sadrži oba URL-a
- [ ] Bez console error-a u browseru
- [ ] Lighthouse Performance > 90 (mobile)
- [ ] Lighthouse SEO > 95
- [ ] Lighthouse Accessibility > 90
- [ ] Težina jedne stranice < 300KB (bez slika)
- [ ] Nema runtime CDN poziva
- [ ] Slike su lokalne, WebP, < 200KB svaka
- [ ] Fusnota atribucije slika prisutna
- [ ] JSON-LD validan (schema.org validator)

## 13. Šta NE raditi

- **Ne menjaj JSON podatke.** To radi Chat Claude, ti si samo consumer.
- **Ne dodavaj framework** — vanilla-first je AU pravilo.
- **Ne dodavaj analytics** (Plausible je posebna odluka, ne kroz ovaj briefing)
- **Ne linkuj eksterne CDN-e** za produkciju
- **Ne pravi lazy loading za above-fold slike** (SEO gubitak)
- **Ne kreiraj novi sadržaj u JSON-u** — to je Chat Claude posao
- **Ne dodavaj funkcionalnost koja nije u ovom briefingu** — sve dodatno vraća se Milanu na odluku

## 14. Vremenska procena

| Zadatak | Sati |
|---|---|
| Infrastruktura setup (Node projekt, gitignore, tokens) | 4-6 |
| build.mjs SSG skript | 6-10 |
| detail.html template + partials | 10-14 |
| hub.html + hub-search.js | 8-12 |
| CSS design sistem (tokens + layout + components) | 8-12 |
| Playwright testovi | 4-6 |
| Deploy skript + nginx konfiguracija | 3-5 |
| Slike sa Wikimedia + optimizacija | 2-4 |
| Bug fixing + polish | 4-6 |
| **UKUPNO** | **49-75h** |

Konzervativan procena: **60h**. To je 1.5 nedelje full-time ili 3 nedelje uz posao.

## 15. Pitanja za Milana pre nego što počneš

1. **Repo lokacija** — nov GitHub repo `autouniverse-vozila` ili u postojeći monorepo?
2. **Hetzner deploy** — imaš li već ssh pristup podešen, ili treba prvi setup?
3. **Slike** — da li da manuelno preuzimam sa Wikimedia (2-3 sata rada), ili imaš već lokalne?
4. **Playwright** — okej sa Chromium only za MVP, ili sve tri (Chromium/Firefox/Webkit)?
5. **Analitika** — Plausible/Umami odluka je već pao? Ako ne, hardcode-ovaću je van tokom testa i dodaje se pre live-a.
6. **Domain routing** — `/vozila/` je novi tab u glavnom sajtu, ili poseban subdomain `vozila.autouniverse.rs`?

Odgovori na ovo pre nego što počneš imaju veliki uticaj na strukturu. Pitaj Milana i čekaj odgovore.

## 16. Šta posle uspešnog deploya

Kada je Golf 6 + Passat B7 live pod `/vozila/`:

1. **Ispuni Google Search Console** sitemap-vozila.xml
2. **Ping Google via /ping?sitemap=** za brzu indeksaciju
3. **Prijavljivanje na SEO monitoring** (Ahrefs Site Audit ili slično)
4. **Milan će zatražiti Chat Claude-u da napravi treći model** (Audi A4 B8) — dokaz da struktura radi za drugi brend Volkswagen grupe

Cilj: **do kraja mesec dana imamo 5 modela live sa merljivim organskim saobraćajem.**

---

**Kraj BRIEFING-a v1.0**

Terminal Claude, ako imaš pitanja na koje ovaj dokument ne odgovara — pitaj Milana pre nego što nastaviš. Ne izmišljaj rešenja koja mogu biti pogrešna.
