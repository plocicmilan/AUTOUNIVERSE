# JEDNA STRANICA — JEDAN AUTO
## Koncept SEO vertikale za autouniverse.rs

**Verzija:** 0.1 (koncept, pre P2 aktivacije)
**Datum:** 2026-08-06
**Autor:** Chat Claude (za Milana)
**Cilj dokumenta:** Definisati sadržaj, izvore, tok i diferencijaciju stranica tipa `/vozilo/<model>/` pre nego što Terminal Claude počne implementaciju.

---

## 1. Šta ovo NIJE

- **Nije Automanijak 2.0.** Oni su enciklopedija specifikacija sa subjektivnim ocenama. Mi to ne pobeđujemo količinom.
- **Nije wiki koji korisnici pišu.** Vlasnički sadržaj koji AU kontroliše.
- **Nije marketplace stranica.** Autopijaca vodi računa o oglasima, ova vertikala je *znanje o modelu*, ne prodaja konkretnog primerka.
- **Nije samo za SEO.** SEO je akvizicija; poenta je: čovek koji istražuje "da li da kupim Golf 6" — završi kao Driver korisnik.

## 2. Šta ovo JESTE

**Jedna URL-adresa po popularnom modelu, sa svime što bi kupac ili vlasnik tog auta trebalo da zna pre servisa ili kupovine — i CTA za Driver instalaciju.**

Za sada, sve što gradimo, gradimo tako da:
1. Google ga voli (unikalan sadržaj, brzo, strukturirano)
2. Čovek sa Golf 6 kaže "ovo je najbolja stranica o tom autu koju sam našao"
3. AU postepeno izgrađuje **pravu prednost**: realni podaci iz Driver/Garage baze

---

## 3. Diferencijacija vs Automanijak.com

| Šta | Automanijak | AU vertikala | Naša prednost |
|---|---|---|---|
| Tehničke specifikacije | ✅ (iz proizvođača) | ✅ (isti izvori) | pariti — ne pobeđujemo |
| Ocena vozača | ✅ (subjektivna 1–5) | ❌ (ne trošimo tu ulicu) | — |
| EuroNCAP | ✅ | ✅ | pariti |
| **Realna potrošnja** | ~oglasi/forumi | **agregirana iz Driver baze** | **jedinstveno** |
| **Najčešći kvarovi + km na kojima se javljaju** | ❌ | ✅ (seed + Garage baza) | **jedinstveno** |
| **Cene servisa u Srbiji** | ❌ | ✅ (Garage work orderi) | **jedinstveno** |
| **Cene delova** | ❌ | ✅ (Autodelovi + Garage) | **jedinstveno** |
| **Verifikovani primerci na prodaju** | ❌ (upućuju na MojAuto) | ✅ (Autopijaca sa Servisnim pasošem) | **jedinstveno** |
| Poređenje 2 modela | ✅ | ❌ (P3+) | — |
| VIN dekoder | ❌ | ✅ (već imamo u Driver-u) | **jedinstveno** |

**Zaključak:** Ne pokušavamo da im pariramo brojem modela (1.691). Uzimamo **top 25** i pravimo *najgušću, najkonkretniju* stranicu koja postoji za taj model u Srbiji. Fokus: **stvarni troškovi života sa autom u Srbiji**, ne katalog.

---

## 4. Odabir modela — revidirano prema stvarnim podacima

BRIEFING kaže "Golf, Astra, Punto, Clio, Passat". Web istraživanje (2026-08-06) pokazuje da **Punto i Clio nisu više u top 5**.

### TIER 0 — Prvih 5 stranica (MVP, 4–6 nedelja)

Presek "najprodavaniji polovnjaci" + "najgledaniji" — dokazana tražnja i akvizicija i istorije poseta:

| # | Model | Generacije prioritet | Izvor tražnje |
|---|---|---|---|
| 1 | **Volkswagen Golf** | Mk5 (2003–08), Mk6 (2008–12), Mk7 (2012–20) | Prodaja + interes |
| 2 | **Volkswagen Passat** | B6 (2005–10), B7 (2010–14), B8 (2014–19) | Prodaja |
| 3 | **Audi A4** | B7 (2004–08), B8 (2007–15) | Prodaja + interes (top 1 gledan) |
| 4 | **Opel Astra** | H (2004–09), J (2009–15) | Prodaja |
| 5 | **Volkswagen Polo** | Mk4 (2001–09), Mk5 (2009–17) | Prodaja |

### TIER 1 — Sledećih 10 stranica (nedelje 7–14)

| # | Model | Zašto |
|---|---|---|
| 6 | Audi A3 | 4. najgledaniji |
| 7 | Audi A6 | 2. najgledaniji |
| 8 | BMW Serija 3 (E90) | 3. najgledaniji |
| 9 | Renault Clio | Klasik srpskog tržišta |
| 10 | Fiat Punto | Klasik, i dalje masovan |
| 11 | Peugeot 206 / 207 | Masovni polovnjak |
| 12 | Ford Focus | Masovni polovnjak |
| 13 | Škoda Octavia | Rastuća popularnost |
| 14 | Škoda Fabia | Rastuća, Top 5 novi |
| 15 | Opel Corsa | Klasik |

### TIER 2 — Do top 25 (nedelje 15–24)

+ Mercedes C (W203/204), BMW Serija 5, Renault Megane, Ford Fiesta, VW Touran, Toyota Yaris, Toyota Corolla, Nissan Qashqai, Hyundai i30, Kia Ceed

### TIER 3 — Komercijalna vozila (nedelje 25+)

Fiat Doblo, VW Caddy, Ford Transit, Fiat Ducato — **veliki gap na tržištu**, Marko ih servisira. Automanijak ovo skoro uopšte ne pokriva.

### Zašto NE 50 odmah

BRIEFING pominje "top 50 modela (P2, 90–180 dana)". **Predlog:** srezati na **top 25 u P2**, top 50 tek posle mesec dana metrika. Razlog: 25 stranica × 15 sati po stranici (istraživanje + pisanje + slike + kvarovi) = 375 sati. 50 stranica = 750 sati. Bolje 25 odličnih nego 50 osrednjih.

---

## 5. Anatomija stranice — šta ide na `/vozilo/volkswagen-golf-6-2008-2013/`

Podeljeno u sekcije po **koliko su podaci pouzdani i skalabilni**. Ono što je "static seed" — pišemo jednom. Ono što je "AU dinamički" — automatski se dopunjuje kako Driver/Garage rastu.

### Sekcija A — Hero + brzi rezime (STATIC SEED)

```
[Foto glavna, 1600×900, WebP]
Volkswagen Golf 6 (2008–2013)
Kompaktni hečbek • VI generacija • Šasija 5K1

⚡ Snaga: 80–270 KS   ⛽ Potrošnja: 4.5–8.9 L/100km
🔧 Održavanje: ~85€/god    💰 Cena polovnog: 3.500–8.500 €
```

### Sekcija B — Tehnički pregled (STATIC SEED)

- **Šasija** (Golf 6 = platforma PQ35)
- **Karoserija** (hečbek 3v/5v, karavan Variant, kabriolet, GTI)
- **Dimenzije** (dužina, širina, visina, međuosovinsko rastojanje, gepek, masa)
- **Broj sedišta**
- **Godine proizvodnje / facelift godine**
- **Tržišta gde je prodavan**

### Sekcija C — Motori (STATIC SEED, ali obiman)

Tabela: kod motora, zapremina, snaga (kW/KS), moment, gorivo, transmisija, Euro standard, 0–100, max brzina, deklarisana potrošnja.

**Za Golf 6 to je ~15 varijanti motora.** Ovo je najveća investicija u pisanju — ali radi se jednom.

### Sekcija D — Realna potrošnja u Srbiji ⭐ (HIBRIDNO: seed → AU)

- **Danas:** Seed vrednosti iz srpskih foruma + web pretrage ("Golf 6 1.6 TDI potrošnja Beograd")
- **Za 6 meseci:** Zamena seed vrednosti agregatnim `anonymized_events` iz Driver baze (kada bude 100+ vozila po varijanti motora → k-anonymity je zadovoljen)

**Prikaz:**
| Motor | Deklarisano | Grad | Auto-put | Kombinovano | Uzorak |
|---|---|---|---|---|---|
| 1.6 TDI (105KS) | 4.5 L | 6.1 L | 4.8 L | 5.4 L | 12 vozila (AU) |
| 1.4 TSI (122KS) | 6.2 L | 8.3 L | 6.5 L | 7.2 L | 8 vozila (AU) |

**Ovo Automanijak nema. Ne mogu ni da imaju** dok ne naprave svoju aplikaciju sa 100+ instalacija po modelu.

### Sekcija E — Najčešći kvarovi ⭐ (HIBRIDNO: seed → AU)

Ovo je **najveća SEO vrednost stranice** — ljudi to guglaju direktno.

**Struktura po stavci:**
```
🔧 DPF filter — začepljenje
Kada: obično 150.000+ km, kod dizel varijanti (1.6 TDI, 2.0 TDI)
Simptomi: gubitak snage, "check engine", ulazi u regeneraciju često
Cena popravke u Srbiji: 150–400€ (čišćenje) / 500–900€ (zamena)
Preventiva: dugačke vožnje, izbegavanje kratkih startova
Izvor: Garage baza (23 slučaja) + srpski forumi
```

**Golf 6 primeri (seed lista):**
- 1.4 TSI: rasteže se lanac razvoda (~120.000 km)
- 1.6/2.0 TDI: EGR ventil, DPF, injektori
- DSG7 (DQ200): mehatronika (~150.000 km), zvučna sinhrona
- Podizači stakala (znameniti Golf problem)
- Bobine / svećice na TSI motorima

Ovo pravimo **iz 3 izvora**:
1. **Seed:** Ručno istraživanje foruma (Benzinci, Dizelaši, Automotoklub, VW forumi) — pišemo mi
2. **Garage baza:** Kada Marko/Goran urade `work_order` sa problem opisom → agregira se
3. **NHTSA opozivi:** Za novije modele (Golf 7+) postoji lista opoziva u VPIC bazi

### Sekcija F — Održavanje: intervali i troškovi (STATIC SEED)

- Zamena ulja: km / meseci
- Filter goriva: km
- Timing (kaiš vs lanac): km, cena zamene
- Kočnice prosečan vek
- Klima servis
- **Ugrađeno u Driver aplikaciju** — CTA: "Instaliraj Driver, unesi VIN, dobij plan održavanja"

### Sekcija G — Slabosti karoserije (STATIC SEED)

- Gde rđa (pragovi, luk zadnjeg točka, unutrašnjost vrata)
- Uobičajena mesta udaraca
- Farovi (žutljive plastike)

### Sekcija H — Dobri i loši primerci na tržištu (STATIC SEED + AU)

- **Koji motor izbeći**: npr. 1.4 TSI EA111 sa problemom lanca
- **Koji je "safe bet"**: npr. 1.6 TDI CAYC posle 2011
- **Šta proveriti pri kupovini**: linkuje na `car_check` u Driver-u ← direktan CTA
- **Trenutne cene na Autopijaci**: dinamički blok koji vuče iz naše marketplace baze

### Sekcija I — Trošak života s autom (AU DINAMIČKO, za 6+ meseci)

Kalkulacija po km:
- Gorivo: prosečna potrošnja × cena
- Servis: iz Garage podataka
- Registracija: iz `reg_calc` kalkulatora (kW+godište → RSD)
- Osiguranje: iz `kasko_calc`
- **Ukupan trošak vlasništva prve godine**

Ovo je **AU-only feature** koji ne postoji nigde u Srbiji.

### Sekcija J — CTA blokovi (kroz stranicu)

Ne jedan na dnu, već **kontekstualni**:
- Pored potrošnje: "Prati svoju potrošnju u Driver-u →"
- Pored kvarova: "Vodi karton vozila u Driver-u, dobiješ podsetnike →"
- Pored dobrih primeraka: "Traži verifikovane primerke na Autopijaci →"
- Pored intervala servisa: "Instaliraj Driver, VIN → automatski plan →"

### Sekcija K — Fusnote i izvori

Sitno na dnu — bitno za poverenje i SEO E-E-A-T:
- Kredit za slike (Wikimedia autor, licenca)
- Datum poslednje revizije
- "Podaci iz agregirane AU baze N=X vozila"

---

## 6. Izvori podataka — legalna matrica (green-light)

| Sloj podataka | Primarni izvor | Licenca | Kome se atribuira | Rizik |
|---|---|---|---|---|
| Specifikacije (motor, dim.) | **Wikidata** (Q entiteti modela) | CC0 | ne mora | ⚪ nizak |
| Specifikacije backup | **Wikipedia** (sr, en, de) | CC BY-SA | fusnota | ⚪ nizak |
| Slike (glavne) | **Wikimedia Commons** | CC BY-SA (2.0–4.0) | Autor + link licence + link datoteke | ⚪ nizak |
| Slike (zvanične proizvođačke) | media.vw.com, press.audi.com | ⚠ press-only | **NE koristiti** | 🔴 visok |
| VIN dekoding | **NHTSA VPIC** | Public domain | ne mora | ⚪ nizak |
| EuroNCAP rezultati | euroncap.com | Fair use citata | link ka izvoru | 🟡 srednji |
| Seed lista kvarova | Srpski forumi | Nema licence | parafrazirati (ne kopirati) | 🟡 srednji |
| Realna potrošnja | **Driver anonimizovana baza** | AU vlasništvo | — | ⚪ nizak |
| Cene delova | **Autodelovi + Garage** | AU vlasništvo | — | ⚪ nizak |
| Cene servisa | **Garage anonimizovane WO** | AU vlasništvo | — | ⚪ nizak |
| Cene polovnjaka | **Autopijaca listinzi** | AU vlasništvo | — | ⚪ nizak |

**PRAVILO:** Svaki podatak koji ne ide iz zvanično zelenih izvora — **prepisujemo svojim rečima**. Ne kopiramo tabele.

**PRAVILO za slike:** Fusnota mora izgledati: *"Foto: [Autor], [licenca], Wikimedia Commons"* + link ka fajlu na Commons-u. CC BY-SA znači da naš izlazni tekst NE postaje CC BY-SA — samo slika. Naš vlastiti sadržaj ostaje AU vlasništvo.

---

## 7. Slike — legalni tok

### Šta koristimo
- **Wikimedia Commons** — glavni izvor (ima 55+ Golf 6 fotografija u Commons kategoriji)
- **Autopijaca listinzi** — kada AU već ima primerak istog modela sa dobrim slikama (uz saglasnost prodavca u ToS-u)
- **Naši testeri** — Marko/Goran imaju te modele u svom servisu → snimimo za AU u zamenu za nešto (godina Premium-a?)

### Šta NE koristimo
- Zvanične PR slike proizvođača (media.vw.com i sl.) — press-only licence
- Google Slike bez proveravanja izvora
- AutoScout / Mobile.de slike (touđi listinzi)
- Slike sa foruma (nemamo saglasnost)

### Format i optimizacija
- Glavna slika: 1600×900 WebP, ~150 KB
- Galerija: 3–5 slika, 800×600 WebP
- Alt tekst: `"Volkswagen Golf 6 karoserija hečbek 5 vrata, pogled sa prednje leve strane, 2010."`
- Lazy loading za sve osim glavne
- Fusnota atribucije **direktno ispod slike** (nije samo na dnu stranice)

---

## 8. Data model za content

Predlog JSON strukture — jedan fajl po modelu, statički se generiše u HTML.

```json
{
  "slug": "volkswagen-golf-6-2008-2013",
  "make": "Volkswagen",
  "model": "Golf",
  "generation": "Mk6",
  "generation_display": "VI",
  "chassis_code": "5K",
  "years": [2008, 2013],
  "segment": "C",
  "body_types": ["hatchback_3d", "hatchback_5d", "wagon", "cabrio"],
  "platform": "PQ35",
  "wikidata_qid": "Q1417956",
  "hero_image": {
    "url": "/img/models/vw-golf-6/hero.webp",
    "attribution": "M 93, CC BY-SA 3.0, Wikimedia Commons",
    "source_url": "https://commons.wikimedia.org/wiki/File:..."
  },
  "dimensions": { "length_mm": 4199, "width_mm": 1779, "height_mm": 1479, "wheelbase_mm": 2578, "trunk_l": 350, "curb_weight_kg": [1218, 1500] },
  "engines": [
    {
      "code": "CAYC",
      "displacement_ccm": 1598,
      "fuel": "diesel",
      "power_kw": 77,
      "power_hp": 105,
      "torque_nm": 250,
      "transmission_options": ["manual_5", "dsg_7"],
      "euro": "5",
      "consumption": { "declared_combined_l": 4.5, "au_measured_combined_l": 5.4, "au_sample_size": 12 },
      "common_issues": ["dpf_clogging", "egr_valve", "injector_failure"]
    }
  ],
  "common_issues": [
    {
      "id": "dpf_clogging",
      "title": "DPF filter — začepljenje",
      "severity": "medium",
      "affects_engines": ["CAYC", "CFHC", "CBDC"],
      "typical_km": 150000,
      "symptoms": ["gubitak snage", "kontrolna lampica motora", "česta regeneracija"],
      "cost_serbia_eur": { "min": 150, "max": 400, "type": "cleaning" },
      "prevention": "Dugačke vožnje, izbegavanje kratkih startova.",
      "sources": ["garage_db:23", "forum:benzinci"]
    }
  ],
  "maintenance_schedule": [
    { "task": "Zamena ulja i filtera", "interval_km": 15000, "interval_months": 12, "cost_eur_range": [45, 70] }
  ],
  "market_data_serbia": {
    "price_range_used_eur": [3500, 8500],
    "last_updated": "2026-08-06",
    "source": "autopijaca_aggregate"
  },
  "buying_advice": {
    "safe_bet_engines": ["CAYC (1.6 TDI posle 2011)"],
    "avoid_engines": ["CAVD (1.4 TSI EA111 sa problemom lanca)"],
    "key_checks": ["stanje lanca (TSI)", "regeneracija DPF (TDI)", "mehatronika DSG"]
  },
  "seo": {
    "title": "Volkswagen Golf 6 (2008–2013): motori, kvarovi, cene u Srbiji | AU",
    "meta": "Kompletan vodič za Volkswagen Golf 6 — svih 15 motora, najčešći kvarovi po km, cene servisa i delova u Srbiji, realna potrošnja iz AU baze.",
    "jsonld_schema": "Vehicle + FAQPage"
  },
  "content_status": "draft|review|published",
  "last_reviewed": "2026-08-06"
}
```

**Zašto JSON, a ne markdown:** Stranica ima 20+ dinamičkih blokova (potrošnja iz AU baze, cene sa Autopijace). Markdown je za blog; ovo su strukturirani podaci.

**Rendering:** Node.js SSG skript čita JSON + `_template.html` → generiše statičku HTML. Dinamični blokovi (cene, N=X uzorci) se refreshuju noćnom cron skriptom kada AU baza dovoljno naraste.

---

## 9. URL i SEO strategija

### URL šema

- `autouniverse.rs/vozilo/` — hub sa listom svih modela
- `autouniverse.rs/vozilo/volkswagen-golf-6-2008-2013/` — model page
- `autouniverse.rs/vozilo/volkswagen-golf/` — svi Golfovi (preusmeri ili disambiguation)
- `autouniverse.rs/vozilo/volkswagen/` — svi VW modeli (P3+)

### JSON-LD schema

- **Vehicle** (za osnovne podatke)
- **FAQPage** (za "koji motor izbeći", "koliko troši u gradu" itd) — direktno hvata Google featured snippets
- **BreadcrumbList**
- **HowTo** za sekciju "šta proveriti pri kupovini" (linkuje na Driver `car_check`)

### Internal linking

Svaki model se linkuje sa:
- **Kalkulatorima:** "Izračunaj registraciju za Golf 6 1.6 TDI" → `reg_calc?power_kw=77`
- **Blog člancima:** "Da li kupiti Golf 6 ili Astra J?" (poredni članci)
- **Autopijacom:** "Aktuelni oglasi za Golf 6 (23)"
- **Driver-om:** kontekstualni CTA-ovi
- **Sličnim modelima:** "Slično: Škoda Octavia 2, VW Golf 5, Seat Leon 2"

### Ciljne SEO keywords po stranici

Za Golf 6 primer:
- "volkswagen golf 6 iskustva"
- "golf 6 najčešći kvarovi"
- "golf 6 1.6 tdi potrošnja"
- "koji motor golf 6 izbeći"
- "golf 6 cena servisa"
- "golf 6 dsg problemi"

**Jedna stranica cilja 20–40 long-tail upita.**

---

## 10. Faze isporuke

### Faza 0 — Priprema (2 nedelje, PRE P2)

- ✅ Ovaj koncept dokument (ovo što čitaš)
- ⬜ Odluka o gore navedenih otvorenih pitanjima (Sekcija 12)
- ⬜ Wireframe stranice (1 model kao mockup, ne kodirati)
- ⬜ Signal iz FEEDBACK.md ili strateška odluka da se ide bez signala (SEO ne trpi feedback-first pristup — SEO investicija zahteva vera-first)

### Faza 1 — Pilot 1 model (2–3 nedelje)

Cilj: **Volkswagen Golf 6** kao pilot.
- SSG skript koji čita JSON i renderuje HTML
- Template + CSS
- Puno istraživanje sadržaja za Golf 6 (možda 20–30h istraživanja)
- Slike sa Commons-a, atribucija
- CTA blokovi
- JSON-LD
- Ubaciti u sitemap.xml + Search Console

**Gate:** Da li stranica dobija organski saobraćaj u 4 nedelje? Ako da → Faza 2.

### Faza 2 — Top 5 (6–8 nedelja)

Passat, A4, Astra, Polo. Isti template, samo drugi sadržaj.

**Gate za nastavak:** Kombinovan organski saobraćaj tih 5 stranica > 500 poseta/mes → nastavi.

### Faza 3 — Top 25 (P2, ~4 meseca)

Ostalih 20 modela. Ovde počinje **sistem** — možda i eksterna pomoć (freelance auto novinar) za pisanje seed sadržaja pod AU stilskim vodičem.

### Faza 4 — Ojačavanje sa AU podacima (kontinuirano, počevši od meseca 3)

Kako Driver/Garage baza raste:
- Potrošnja: seed → agregirana AU vrednost
- Kvarovi: dodavanje novih iz Garage `work_order` podataka
- Cene servisa: agregirana AU vrednost
- Cene polovnjaka: agregirana Autopijaca vrednost

**Ovo je moat koji Automanijak ne može da kopira bez cele infrastrukture.**

### Faza 5 — Interaktivni SVG dijagram delova (P3–P4, top 5 modela)

Kao što BRIEFING kaže. Klik na kočnicu → odvedi na Autodelovi filter "kočnice + Golf 6".

---

## 11. Odnos prema apps ekosistemu

Ovo je bitno da bude jasno pre nego što Terminal Claude počne:

- Stranica **NIJE** apps u browseru. To je statična HTML.
- Stranica **JESTE** akvizicioni levak za Driver.
- Podaci teku **u oba smera** (kada baze narastu):
  - AU → stranica: agregat potrošnje, kvarova, cena
  - Stranica → AU: klik na "instaliraj Driver" nosi UTM koji AU beleži u `install_source`
- Stranica se **generiše na build time**, ne runtime — nikad ne poziva AU Core sinhron
- Noćni cron: `regenerate_vehicle_pages.js` čita najnovije agregate iz AU Core → prepisuje JSON → rebuild HTML → deploy

---

## 12. Otvorena pitanja (za Milana pre nego što Terminal Claude počne)

1. **Broj modela u P2:** 25 (moj predlog) ili 50 (BRIEFING)?
2. **Ko piše seed sadržaj:** ja (Chat Claude, uz tvoju reviziju), Milan sam, ili eksterni pisac?
3. **Legalni pristup slikama:** Wikimedia Commons only (siguran), ili pokušavamo dobiti pismenu saglasnost od Marka/Gorana za korišćenje slika sa Autopijaca listinzi?
4. **Ime CTA dugmeta:** "Instaliraj Driver" vs "Otvori u Driver-u" vs "Vodi karton ovog auta →"
5. **Jezik:** samo srpski (latinica), ili i ćirilica verzija, ili i engleski (za buduće tržište)?
6. **Merit criteria za "Zar da počinjemo bez FEEDBACK signala"** — ovo je jedini deo AU projekta gde feedback-first ne radi. SEO zahteva investiciju pre signala. Da li se slažemo sa tim izuzetkom?
7. **Rebranding:** Da li ovaj koncept ima ime u AU brendovima? Predlog: **"AU Baza vozila"** ili **"Servisni pasoš — model"** (kao ekstenzija brend terma). Ovo utiče na navigaciju.
8. **Konkurencija sa autoblog.rs, kupujemprodajem forumima:** Da li postoji rizik da polovniautomobili.com podigne isti sadržaj brže od nas (imaju budžet)?

---

## 13. Šta ide u BRIEFING.md posle ovog dokumenta

Kada Milan odobri koncept, sažetak koji ide u BRIEFING za Terminal Claude:

```markdown
## SEO vertikala — "Jedna stranica jedan auto" (P2 aktivirano YYYY-MM-DD)

- Koncept dokument: JEDAN_AUTO_JEDNA_STRANICA_KONCEPT.md
- Pilot model: Volkswagen Golf 6
- Template: node SSG + JSON data + HTML template
- URL: /vozilo/<slug>/
- Izvori: Wikidata (CC0), Wikimedia Commons (CC BY-SA + atribucija), AU baza (agregat)
- CTA cilj: Driver install
- Faza 1: 1 model za 3 nedelje
- Gate: organski saobraćaj > 0 u mesec dana → Faza 2 (top 5)
```

---

**Kraj koncepta v0.1**

Sledeći korak nije kôd — sledeći korak je da Milan pređe otvorena pitanja iz Sekcije 12, pa da napravimo Milan-in wireframe za jednu stranicu (Golf 6). Tek tada BRIEFING i Terminal Claude.
