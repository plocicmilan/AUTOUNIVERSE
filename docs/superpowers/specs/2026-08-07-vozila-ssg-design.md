# Vozila SSG — Design Spec
**Datum:** 2026-08-07
**Status:** Approved
**Autor:** Claude Code + Milan Plocic

---

## 1. Šta gradimo

Statički generisane HTML stranice za svaki popularni model vozila na srpskom tržištu. Jedna URL = jedan model. Sadržaj je "blog za taj auto" — sve što bi kupac ili vlasnik trebao da zna, pisano narativno, sa podacima iz AU ekosistema kao diferencirajućim elementom.

**Nije** spec sheet. **Nije** Automanijak klon. **Jeste** najgušća, najkonkretnija stranica o tom modelu u Srbiji — pisana za čoveka, indeksirana za Google.

**Primer:** `vozila.autouniverse.rs/volkswagen-golf-6-2008-2013/`
> "Šta je Golf 6 zapravo — iskustvo 15 godina od uvoza. Koji motor izbeći, zašto mehaničari ne vole DSG7, koliko zaista troši u Kruševcu."

---

## 2. Arhitektura

```
autouniverse/vozila/          ← source (u repo)
├── data/vehicles/            ← JSON source of truth (jedan fajl/model)
├── templates/
│   ├── detail.html           ← master template za model stranicu
│   ├── hub.html              ← hub/lista svih modela
│   └── partials/             ← reusable fragmenti
│       ├── head.html
│       ├── header.html
│       ├── footer.html
│       ├── engine_card.html
│       ├── issue_card.html
│       └── cta_block.html
├── static/
│   ├── css/                  ← tokens, base, layout, components, hub, detail
│   ├── js/                   ← hub-search.js, detail-nav.js
│   └── img/models/           ← WebP slike (Wikimedia Commons, lokalno)
├── build.mjs                 ← SSG entrypoint
└── deploy.mjs                ← rsync + nginx reload

build/vozila/                 ← output (gitignored, deploy target)
```

---

## 3. Template engine (mini, zero-dep)

80 linija Node.js u `build.mjs`. Podržava:

```
{{field}}                     ← simple interpolation
{{#each engines}}...{{/each}} ← array iteration, scope = element
{{#if condition}}...{{/if}}   ← conditional (truthy check)
{{#unless condition}}...{{/unless}}
```

Logika renderovanja je u `build.mjs`, template ostaje čitljiv HTML.

---

## 4. Detail stranica — sekcije (redosled)

Svaka stranica je "blog za jedan model" — narativno, sa podacima:

| # | Sekcija | Tip | SEO vrednost |
|---|---|---|---|
| 1 | Hero — slika + quick facts (snaga, potrošnja, cena, trošak/god) | Static | Visoka (above fold) |
| 2 | Sticky tab navigacija | UI | — |
| 3 | Uvod — narativni paragraf o modelu (šta je, zašto je bitan) | Static | Srednja |
| 4 | Motori — expandable kartice, sve varijante | Static | Visoka |
| 5 | Realna potrošnja — tabela (seed → AU agregat) | Hybrid | Visoka |
| 6 | **Kvarovi** — sortiran po severity, DTC, cene u Srbiji | Static+Garage | **Najveća** |
| 7 | Održavanje — intervali, torque specs, cene | Static | Visoka |
| 8 | Kupovina — safe bet, šta izbegavati, checklist | Static | Visoka |
| 9 | Točkovi — PCD, ET, pritisci | Static | Srednja |
| 10 | Multimedija — klima, audio, ADAS accordion | Static | Niska |
| 11 | Cene u Srbiji — price range + top 20 delova | Static+Autodelovi | Visoka |
| 12 | Slični modeli — kartice | Static | Srednja |
| 13 | CTA blokovi — kontekstualni, po JSON `position` polju | Static | — |
| 14 | Footer — atribucija slika, datum revizije, AU izvor | Static | E-E-A-T |

---

## 5. Hub stranica (`vozila.autouniverse.rs/`)

Split-panel desktop, two-screen mobile (per wireframe koji je Milan dostavio).

- Levo: search input + filter chips (Marka, Segment, Gorivo)
- Desno: lista/grid vozila sa pregledom
- Vanilla JS search — debounced 300ms, filter URL hash, bez fetch-a
- Podaci inlinovani kao `<script type="application/json">` u HTML

---

## 6. CSS — design sistem

6 fajlova, sve CSS custom properties:

| Fajl | Sadržaj |
|---|---|
| `tokens.css` | Boje, tipografija, spacing, radius, shadow — AU design tokeni |
| `base.css` | Reset + tipografija |
| `layout.css` | Grid, container, split-panel |
| `components.css` | Kartice, dugmad, tagovi, tabovi |
| `hub.css` | Split-panel specific |
| `detail.css` | Tab nav, accordion, severity badges, tabele |

---

## 7. JSON-LD schema (per model)

```json
[Vehicle, FAQPage, BreadcrumbList, HowTo]
```

- `FAQPage` — "koji motor izbeći", "koliko troši u gradu" → Google featured snippets
- `HowTo` → "šta proveriti pri kupovini" → linkuje Driver `car_check`

---

## 8. Build script (build.mjs) — šta radi

```
1. Učitaj sve JSON iz data/vehicles/
2. Validiraj obavezna polja, logiraj warnings
3. Za svaki model → detail.html (template render + JSON-LD)
4. Generiši hub index.html (inline JSON za pretragu)
5. Generiši sitemap-vozila.xml
6. Kopiraj static/ u build/vozila/static/
7. Report: N stranica, vreme, veličina, warnings
```

---

## 9. Deploy

**Target:** `vozila.autouniverse.rs` → `/var/www/autouniverse/vozila/`
**Web server:** nginx static (isti pattern kao `garage.autouniverse.rs`)

Izmene infra:
1. `infra/nginx-autouniverse.conf` — novi server blok za `vozila.autouniverse.rs`
2. VPS: `certbot certonly --nginx -d vozila.autouniverse.rs` (dodati subdomain)
3. `deploy.mjs` → rsync + nginx reload

```bash
npm run build:vozila   # node vozila/build.mjs
npm run deploy:vozila  # node vozila/deploy.mjs
```

---

## 10. Pilot scope (MVP)

- **2 modela:** VW Golf 6 (2008-2013) + VW Passat B7 (2010-2014)
- **JSON fajlovi:** kompletni, dostavljeni od Chat Claude-a
- **Slike:** 1 hero WebP po modelu, skidam sa Wikimedia Commons
- **Gate za P2:** organski saobraćaj > 0 u 30 dana → nastavljamo sa top 25

---

## 11. Šta NE ulazi u MVP

- Dinamički podaci iz AU baze (potrošnja N=, cene servisa) → Faza 4, kad baza naraste
- Playwright testovi → posle prvog deploya
- Autopijaca integracija (cene živih oglasa) → Faza 2
- Interaktivni SVG dijagram delova → Faza 3-4

---

## 12. Odluke

| Odluka | Razlog |
|---|---|
| Mini template engine (Option C) | Templates ostaju HTML, logika u JS, bez deps |
| `vozila/` unutar AU monorepa | Jedan repo, jedan deploy workflow |
| `vozila.autouniverse.rs` subdomain | SEO: odvojen od główne landing stranice |
| Slike lokalno (WebP) | Nema CDN runtime poziva, Lighthouse score |
| Wikimedia Commons only | Legalno čisto, CC BY-SA uz atribuciju |
| Srpski jezik (latinica) | Ciljno tržište Srbija, Q1 2027 razmisliti o eng |
