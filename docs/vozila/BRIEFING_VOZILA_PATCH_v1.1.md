# PATCH: BRIEFING_VOZILA_INFRASTRUKTURA.md
## Dopuna v1.0 → v1.1

**Kreirao:** Chat Claude
**Datum:** 2026-08-07
**Odnosi se na:** BRIEFING_VOZILA_INFRASTRUKTURA.md v1.0 (2026-08-06)
**Status:** ✅ Spremno za implementaciju

Ovaj patch **NE ZAMENJUJE** originalni BRIEFING v1.0 — dopunjuje ga informacijama o novom sadržaju (2 dodatna modela, schema v0.4). Pročitati OBA dokumenta.

---

## 1. Šta se promenilo od v1.0

**Novi JSON fajlovi:**

| Fajl | Veličina | Status | Schema |
|---|---|---|---|
| `audi-a4-b8-2007-2015.json` | 83 KB | ✅ nov | v0.4 |
| `opel-astra-j-2009-2015.json` | 67 KB | ✅ nov | v0.4 |
| `volkswagen-golf-6-2008-2013.json` | 106 KB | ⏳ postoji, čeka retrofit | v0.3 → v0.4 |
| `volkswagen-passat-b7-2010-2014.json` | 124 KB | ⏳ postoji, čeka retrofit | v0.3 → v0.4 |

**Retrofit dokumenti:**
- `RETROFIT_GOLF6_v0.3_to_v0.4.md`
- `RETROFIT_PASSAT_B7_v0.3_to_v0.4.md`

**Total zapakovan sadržaj za SSG:** cca 380 KB podataka za 4 modela = prosek 95 KB po modelu. Skaliranje: za 25 modela (Tier 0+1) iz VOZILA_v0.3_KONACNA_25.md — očekivano 2-2.5 MB ukupno. Dovoljno malo za GitHub commit.

---

## 2. Schema v0.4 — nova polja

Sledeća polja su uvedena u v0.4 i **frontend template MORA da ih rukuje uslovno** (guard clauses).

### 2.1 `platform.engine_orientation` (obavezno)

```json
"platform": {
  "code": "...",
  "engine_orientation": "transverse" | "longitudinal",
  "layout_notes": "..."
}
```

**Template guard:** ne treba — svi modeli u v0.4 imaju ovo polje.

### 2.2 `awd_system` (novi root blok)

Dva oblika:

```json
// Za modele sa AWD opcijom (A4 B8, Passat B7 4Motion)
"awd_system": {
  "brand_name": "quattro" | "4Motion" | "...",
  "availability": "opis kada je dostupno",
  "type": "quattro_torsen" | "quattro_crown_gear" | "haldex_gen4",
  "differential": "...",
  "default_bias_front_rear": "40:60",
  "extreme_bias": "70:30 do 15:85",
  "notes": "..."
}

// Za modele bez AWD (Astra J)
"awd_system": {
  "available": false,
  "note": "objašnjenje zašto nema"
}
```

**Template guard:** OBAVEZAN
```javascript
{data.awd_system && !data.awd_system.available === false && (
  // Renderuj puni AWD blok
)}
{data.awd_system && data.awd_system.available === false && (
  // Renderuj "AWD nije dostupan" napomenu
)}
```

### 2.3 `generations_internal` (opcionalno)

Postoji samo kod modela sa značajnim facelift-om unutar iste generacije (A4 B8/B8.5, Astra J pre/post 2012). NE postoji kod Golf 6 i Passat B7.

```json
"generations_internal": [
  {
    "code": "B8 (pre-facelift)",
    "years": [2007, 2011],
    "production_start": "...",
    "production_end": "...",
    "distinctions": [ "...", "..." ]
  },
  {
    "code": "B8.5 (facelift)",
    ...
  }
]
```

**Template guard:**
```javascript
{data.generations_internal && data.generations_internal.length > 1 && (
  // Renderuj sekciju "Pre-facelift vs Facelift"
)}
```

### 2.4 `body_variants[].market_share_serbia_estimate` (obavezno)

```json
"body_variants": [
  {
    "code": "Sedan",
    ...
    "market_share_serbia_estimate": "55-60%",
    ...
  }
]
```

**Template guard:** ne treba — u svim v0.4 modelima. Za v0.3 modele (pre retrofit-a) treba fallback: `data.body_variants[i].market_share_serbia_estimate || 'N/A'`.

### 2.5 `au_ecosystem_integration` (opcionalno)

Novi root blok koji povezuje JSON sa AU aplikacijama:

```json
"au_ecosystem_integration": {
  "driver_toolbox": {
    "vin_prefix_wmi": "WVW",
    "vin_year_position": 10,
    "engine_data_prefill": "opis..."
  },
  "garage_toolbox": {
    "common_work_orders_template": [ "..." ]
  },
  "autopijaca": {
    "listing_categories": [ "..." ],
    "verified_history_advantage": "..."
  },
  "autodelovi": {
    "compatible_parts_high_volume": [ "..." ]
  }
}
```

**Template koristi:** za dinamičke CTA linkove na kraju stranice ("Instaliraj Driver Toolbox za ovaj model" — sa prefilled prefill config-om). Optional — ako nema, ne renderuje.

---

## 3. Redosled izvršenja (revidiran)

**Faza 1 — Priprema podataka (Milan pregleda, Terminal Claude izvršava):**

1. Uploaded na server (ili commit u `/data/vehicles/`):
   - `audi-a4-b8-2007-2015.json` (nov)
   - `opel-astra-j-2009-2015.json` (nov)
2. Retrofit patch na postojeće:
   - Primeniti `RETROFIT_GOLF6_v0.3_to_v0.4.md` na `volkswagen-golf-6-2008-2013.json`
   - Primeniti `RETROFIT_PASSAT_B7_v0.3_to_v0.4.md` na `volkswagen-passat-b7-2010-2014.json`
3. Validacija:
   ```bash
   for f in /data/vehicles/*.json; do
     python3 -c "import json; d=json.load(open('$f')); assert d['schema_version']=='0.4'" && echo "$f ✓" || echo "$f ✗"
   done
   ```
   Očekivan izlaz: sva 4 fajla ✓

**Faza 2 — SSG build (kako je opisano u BRIEFING v1.0), ali sa dopunama:**

4. `build.js` mora da rukuje sa 4 modela umesto 2 (nema hardkodovanja slug-ova — čita ceo `/data/vehicles/` folder)
5. HTML template mora da ima guard clauses za nova polja (v. sekcija 2 gore)
6. Split-panel hub (`/vozila/index.html`) mora da renderuje sve 4 modela u levom panelu sa filterima:
   - Filter po marki: Volkswagen, Audi, Opel
   - Filter po segmentu: C (Golf, Astra), D (Passat, A4)
   - Filter po tipu karoserije: Hatchback, Sedan, Karavan/Variant/SportsTourer, Coupé (GTC)

**Faza 3 — Testiranje:**

7. Playwright test za sve 4 URL-a:
   - `/vozila/volkswagen-golf-6-2008-2013/`
   - `/vozila/volkswagen-passat-b7-2010-2014/`
   - `/vozila/audi-a4-b8-2007-2015/`
   - `/vozila/opel-astra-j-2009-2015/`
8. Provere po URL-u:
   - `<h1>` sadrži model ime
   - `<meta name="description">` sadrži seo_description iz JSON-a
   - Deep-links iz body_variants sekcije rade
   - AWD sekcija se renderuje uslovno (Astra J prikazuje "AWD nedostupan", ostali detaljan blok)
   - Common faults tabela ima cene u EUR i validne severity oznake

**Faza 4 — Deploy (kako je u v1.0):**

9. Deploy na Hetzner `/var/www/autouniverse.rs/vozila/`
10. Sitemap regeneracija sa 4 URL-a
11. Prvi Google Search Console submit

---

## 4. Šta se NE menja iz v1.0

Sve ostalo iz originalnog BRIEFING v1.0 ostaje na snazi:

- SSG pristup (Node.js build skript)
- Vanilla JS pretraga na klijentu (100 stavki je malo)
- Split-panel UI (desktop, docs-site pattern)
- Mobile — 2 ekrana umesto split
- CSS koji prati AU design sistem
- Nema SPA framework-a
- Hetzner VPS deploy
- Playwright integracioni test

---

## 5. Novi rizici (dopunjeni u odnosu na v1.0)

| Rizik | Verovatnoća | Uticaj | Ublažavanje |
|---|---|---|---|
| Retrofit patch-a neuspešan (Golf 6 ili Passat B7 se ne migrira čisto) | Nisko | Srednje | Milan pregleda pre izvršenja. Verifikacioni script na kraju svakog patch-a. Fallback: ostati na v0.3 za tu model, imati IF/ELSE u template-u. |
| Template guard clause nedostaje za `awd_system.available: false` | Srednje | Malo | Playwright test za Astra J proverava da nema greške u konzoli. Astra J je test slučaj. |
| GM motorske porodice (Family Z, Isuzu Circle L) ne grupišu se dobro u frontend-u | Nisko | Malo | Grupacije nisu kritične za MVP. Odloži za v0.5. |
| Body variant "GTC" (3-vrata) ne prikazuje se u filter-u | Srednje | Malo | Filter po tipu karoserije treba da uključi "Coupé/3-vrata" kategoriju. |

---

## 6. Verifikacija po završetku

Sledeći komandu izvršiti posle Faze 4:

```bash
# 1. Provera da svi JSON-ovi validni v0.4
python3 << 'EOF'
import json, os
required_v04 = ['schema_version', 'platform', 'awd_system', 'body_variants']
for f in sorted(os.listdir('/data/vehicles')):
    if not f.endswith('.json'): continue
    d = json.load(open(f'/data/vehicles/{f}'))
    missing = [k for k in required_v04 if k not in d]
    print(f"{f}: schema={d.get('schema_version')}, missing={missing}")
    for bv in d.get('body_variants', []):
        if 'market_share_serbia_estimate' not in bv:
            print(f"  ✗ body_variant '{bv.get('code')}' nedostaje market_share")
EOF

# 2. Provera da svi URL-ovi odgovaraju
for slug in volkswagen-golf-6-2008-2013 volkswagen-passat-b7-2010-2014 audi-a4-b8-2007-2015 opel-astra-j-2009-2015; do
  curl -s -o /dev/null -w "%{http_code} https://autouniverse.rs/vozila/$slug/\n" "https://autouniverse.rs/vozila/$slug/"
done
# Očekivano: 4× 200

# 3. Sitemap sadrži sve 4 URL-a
curl -s https://autouniverse.rs/sitemap.xml | grep -c "vozila/"
# Očekivano: 5 (4 modela + 1 hub)
```

## 7. Šta ide u FEEDBACK.md posle live-a

Kad `/vozila/` sekcija bude javna, Milan pokazuje Marku i Goranu i beleži:

- Da li im tehnički podaci izgledaju tačno (npr. oil_capacity za motore koje oni serviraju)
- Šta bi dodali (poznati kvari koji nisu u JSON-u)
- Da li bi platili za PDF eksport pojedinačne stranice
- Da li bi delili link mušterijama kada im preporučuju model za kupovinu

Ovo su prvi realni signali za dalji rad na Vozila vertikali — do tada, sve dodatne modele **PARKIRATI**.
