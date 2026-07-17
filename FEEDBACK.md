# AUTO UNIVERSE — FEEDBACK & DORADE

Živa lista signala iz stvarnog korišćenja (Faza 3+4). Svaka stavka: ko je prijavio,
šta, u koji sloj ide (**core** = dele sve aplikacije / **app** = samo jedna / **hub** = AutoHub server), i status.

Pravilo: kad krene v1.x, radi se redom sa vrha. Ništa se ne kodira dok nije ovde.

Legenda statusa: 🔵 novo • 🟡 u analizi • 🟢 za implementaciju • ✅ urađeno • ⚪ odbačeno / na čekanju

---

## Otvoreno

| # | Stavka | Izvor | Sloj | Aplikacije | Status |
|---|--------|-------|------|-----------|--------|
| 1 | **Početno stanje vozila (retroaktivni unos istorije).** Nova aplikacija/prazan karton — vlasnik/majstor uzima vozilo "iz sredine" života i mora da unese zatečeno stanje: trenutna km, poslednji servis (datum + km), rok registracije/tehničkog, gume. | Marko (Garage) | core (Event model) | Garage + Driver | ✅ URAĐENO u OBE app |
| 2 | **Deljena IndexedDB baza između aplikacija na istom origin-u.** Odlučiti pre platform faze. | Claude (build) | core (store) | sve | 🟡 u analizi |
| 3 | **Multi-user — jedan primitiv rešava sve.** `grant(user, target, vehicle, role, [expires])`. Team NIJE poseban entitet, samo automatizam preko primitiva. | Marko + arhitektura | hub | sve | 🟢 za AutoHub — implementacija u toku |
| 4 | **Reverse marketplace hipoteza** — "objavi potrebu → dobavljači se takmiče". Nije signal sa terena. Uslov aktivacije: 2+ mehaničara nezavisno traže brz parts sourcing + Faza 3 završena. | Desktop Claude | hub | — | ⚪ hipoteza — Faza 6+ |
| 5 | **Play Protect upozorenje** — "Nebezbedna aplikacija" pri instalaciji Garage PWA na Androidu. Nije bug u kodu (Google WebAPK). | Marko | app (Garage) | Garage | 🔴 blokira onboarding — rešenje u manualu |
| 6 | **Nikola — prvi realni Driver tester** van autora projekta. Aktivan od 2026-07-11. | Nikola | — | Driver | 🟢 aktivan |
| 7 | **Katalog vozila** — padajući meni za marku/model umesto slobodnog kucanja. `core/js/catalog.js`, offline embedded, 38 marki ~550 modela. | Nikola + Milan | core (data) | Garage + Driver | ✅ URAĐENO (Driver v1.7.0, Garage v1.25.0) |
| 8 | **Servisne kategorije preuzake** — Goran nabraja nedostajuće: ulje u menjaču, diferencijal (prednji/zadnji), veliki servis, autodijagnostika, svećice, dizne, ulje u kočnicama, klima. Trenutni "top 6–8" ne pokriva realan raspon rada. **Rešenje:** grupisana lista (2 nivoa, 12 kategorija) + učenje iz istorije za "poslednje korišćeno" + slobodan tekst/glas ostaje. | Goran (Garage) | app (Garage) + core (Event subtype) | Garage + Driver (autocomplete) | ✅ URAĐENO (v1.23.0) — 6 chip-ova, Klima sub-chips, Veliki servis preset |
| 9 | **AutoHub magic-link razmena** — mehaničar završi posao → klik "Podeli sa vlasnikom" → short link koji preživljava PWA instalaciju (auto-install + auto-import). Bez ovoga se gubi 70% vozača na koraku "prvo instaliraj". Mehaničar je distribucijski kanal Drivera. | Milan + arhitektura | hub + Garage + Driver | sve | ✅ URAĐENO (Garage v1.26.0 + Driver v1.7.0 + AutoHub server) |
| 10 | **Strukturisan JSON payload razmene** — VIN kao ključ; delovi sa brand+model+kataloški broj; `next_service` postaje Driver podsetnik automatski; `source: mechanic` = Trust pečat. **Cene NE idu automatski** — nije svaki majstor pravi račun, marža privatna. Ako vozač dobije PDF → prikači kao dokument. | Milan (odluka) | hub + core (Event) | sve | ✅ URAĐENO — next_service u WO draft + payload + auto-reminder u Driver |
| 11 | **Expense modul za Driver-a** — `event.cost` proširenje: total, currency, entered_by, receipt_document_id (opciono), `informal: boolean` (bez računa). 7 novih EVENT kategorija: fuel, tires, bodywork, registration, insurance, decorative, other. Novi ekran TROŠKOVI sa vehicle switcher + period filter + sažetak po kategoriji. | Nikola + kolega | core (Event) + app (Driver) | Driver | ✅ URAĐENO (Driver v1.7.0) |
| 12 | **Vehicle switcher + status polje** — Nikola ima 4 vozila (kombi/kamion/2 auta), kolega 4 aktivno + 5–6 mesečno. `vehicle.status: active/for_sale/sold/archived/totaled`. Sold+totaled se automatski sklanja sa aktivne liste. | Nikola + kolega | core (Vehicle) + app (Driver) | Driver | ✅ URAĐENO (Driver v1.7.0) |
| 13 | **Trade toggle po vozilu (preprodavac-mod)** — kolega preprodavac (nova persona). `vehicle.trade_mode: boolean` + `vehicle.trade: { purchase, sale }` opciono polje. Toggle otključava nabavnu cenu, status, "Prodaj vozilo" wizard, profit karticu. **Isti Driver za vozača i preprodavca** — Trader Toolbox se briše iz mape. | Kolega preprodavac | core (Vehicle) + app (Driver) | Driver | ✅ URAĐENO (Driver v1.7.0) |
| 14 | **"Prodaj vozilo" wizard sa 3 ishoda** — kolega hoće sve tri opcije: (a) Podeli kupcu preko AutoHub link-a, (b) Sačuvaj u arhivi (status: sold, detalji ostaju), (c) Sačuvaj samo statistiku (detalji brisani, agregat u godišnjem sažetku). | Kolega | core (Vehicle) + app (Driver) + hub | Driver + AutoHub | ✅ URAĐENO (Driver v1.7.0) |
| 15 | **`informal: true` flag na trošku** — kolegini "drugari-servisi" i vulkanizer + Nikolove sitnice često nemaju račun. Legitimni troškovi, ali dokazno slabiji. Dosije PDF razdvaja "dokumentovana ulaganja" od "prijavljena bez dokaza". Nema poresku konotaciju — samo indikator vozaču/kupcu. | Kolega + Nikola | core (Event.cost) | Driver | ✅ URAĐENO (Driver v1.7.0) |
| 16 | **Vlasništvo ≠ Vozač (registered_owner polje)** — kolegin case "vozilo se vodi na dedu/majku/prethodnika, ja vozim, ja unosim". Nije izuzetak nego normalan slučaj kod polovnjaka. `vehicle.registered_owner: string (opciono)` odvaja papirnog vlasnika od korisnika aplikacije. | Kolega | core (Vehicle) | Driver + Garage | ✅ URAĐENO (Driver v1.7.0) |
| 17 | **Automatski transfer podataka pri prodaji vozila** — kada kolega proda vozilo preko AutoHub-a, server pronalazi sve mehaničare koji imaju taj VIN u bazi i šalje tihu notifikaciju o novom vlasniku. Isti `grant()` primitiv, target = "all_registered_mechanics_of_this_vin", read-only. Prvi put u srpskom auto tržištu vozilo ima kontinuiranu digitalnu istoriju kroz vlasnike. Novi vlasnik u onboarding-u: opt-in za deljenje kontakta prethodnim servisima. | Kolega + strateški razgovor | hub | sve | 🟢 za Fazu 5 — model se dizajnira sad, implementacija posle |
| 18 | **Marketplace kao besplatan javni utility** — Milan odluka: marketplace ne zarađuje, AutoHub zarađuje. Nema provizije, nema pakovanja/dostave/garancije. Kontakt-forma spaja ponudu i potražnju, kupci i prodavci dogovaraju direktno. Javna stranica bez login-a (kupci vide, SEO indeksira, Viber deljenje). Prodavac plaća Basic nalog da bi objavio. Diferencijacija: verifikovana istorija vozila (dosije + potvrđeni servisi + računi) — nemoguće na KP/PA. | Milan (strateška odluka) | hub + statička stranica | novi sloj | 🟢 za P2 — MVP na istom AutoHub serveru |
| 19 | **AutoUniverse Account (monetizacijski model)** — nivoi Free/Basic/Pro/Garage Pro. Free = lokalne app + marketplace read-only. Basic (2–5 EUR) = sync + backup + objava oglasa. Pro (5–10 EUR) = razmena sa mehaničarima + cloud slike + "Verifikovan prodavac" pečat. Garage Pro (15–25 EUR) = sve + Garage funkcije. Naplata kroz Gumroad/Stripe, ne provizije. | Milan (strateška odluka) | hub | novi sloj | 🟢 za P2/P3 — priprema modela sad, naplata kad je proizvod dokazan |
| 20 | **Mehaničar dobija besplatnu reputaciju preko marketplace-a** — vozač na kraju servisa opt-in (default da): "Da li želiš da ovaj servis bude javan na oglasu kada prodaješ vozilo?". Markov naziv u dosijeu svakog vozila koje je servisirao. Kupac zove Marka da potvrdi. Marko dobija reklamu bez plaćanja. | Milan + arhitektura | core (Event.public flag) + hub | Garage + marketplace | 🟢 za P2 — polje na Event modelu se dodaje sad |

---

### Detalji — Stavka #1

**Problem:** karton kreće od nule, a vozilo ima istoriju iza sebe. Bez početnog
stanja podsetnici ne mogu da rade (ne zna se kad je sledeći servis / rok).

**Rešenje (bez novog entiteta):** retroaktivni unos je običan EVENT sa datumom u
prošlosti. Dodaje se samo:

- vrednost izvora `source: "initial"` (ili flag `retroactive: true`) → niži nivo
  poverenja u Trust sloju; ako se priloži slika starog računa → prelazi u `"receipt"`.
- **fleksibilan datum**: dozvoliti samo mesec/godinu ili "pre ~6 meseci / na ~20.000 km".
- u timeline-u vizuelno drugačiji (sivlji, oznaka "unet naknadno").

**Onboarding (Driver):** posle osnovnih podataka o vozilu → opcioni, preskočivi korak
"Početno stanje": km + poslednji servis + rokovi + gume.

**"Iskopaj fioku" tok:** korisnik bilo kad slika stare račune/garancije → svaki postaje
retroaktivni događaj. Istorija raste unazad postepeno.

---

### Detalji — Stavka #8 (Servisne kategorije)

**Predložene 12 grupa:**

| Kategorija | Šta ulazi |
|---|---|
| Motorno ulje + filteri | Zamena ulja, filter ulja, vazduha, goriva, kabinski |
| Fluidi ostali | Rashladna, kočiono (DOT4), menjač (ručni/automatik), diferencijal prednji/zadnji, servo |
| Paljenje i ubrizgavanje | Svećice, kablovi, dizne, bobine |
| Kaiševi i lanci | Zupčasti kaiš (+ pumpa vode), micro-V, lanac razvoda |
| Kočnice | Diskovi, pločice, čeljusti, cevi/creva |
| Trap i vešanje | Amortizeri, opruge, spone, kraci, homokinetički, ležajevi |
| Izduv | Auspuh, katalizator, EGR, DPF, lambda sonda |
| Klima i grejanje | Punjenje freona, kompresor klime, ventilator, senzori |
| Elektro | Akumulator, alternator, anlaser, senzori |
| Dijagnostika | Čitanje grešaka, kodiranje, TPMS reset, servisni reset |
| Veliki servis | Kombinacija (preset koji doda 6–8 podstavki jednim tapom) |
| Popravka | Slobodan tekst — sve što ne ulazi u kategorije |

**UI tok:**
1. Top red: "Poslednje" (4 chip-a koje je Goran najskorije koristio, uči iz istorije)
2. Ispod: 6 velikih chip-ova (Motor · Fluidi · Kočnice · Klima · Elektro · Dijagnostika)
3. Uvek dostupno: slobodan tekst + glas
4. Multi-select — chip-ovi se dodaju, ne zamenjuju

**Blokirajuća pitanja (Viber, Marko + Goran):**
1. "Veliki servis" — JEDAN klik koji doda 6 stavki, ili jedan zapis bez razlaganja?
2. Dijagnostika — poseban tip zapisa (bez delova) ili obični posao?
3. Klima — jedna stavka (freon) ili razdvaja punjenje/kompresor/kabinski?
4. Kad piše šta je radio — delove i rad ODVOJENO po stavkama, ili "šta je rađeno + ukupna cifra"?

---

### Detalji — Stavka #9 + #10 (AutoHub razmena)

**Magic-link tok:**

```
Marko klik "Podeli sa vlasnikom"
  ↓
Server generiše short link (npr. hub.plocic.rs/s/aB3xY7)
  ↓
Marko šalje Viberom vozaču
  ↓
Vozač klik:
  ├─ ako Driver instaliran → app otvara i uvozi
  └─ ako nije → landing "Driver Toolbox" → PWA install →
                posle instalacije auto-fetch tog zapisa
```

**JSON payload minimalni:**

```json
{
  "share_id": "sh_aB3xY7",
  "created_at": "2026-07-17T14:22:00Z",
  "from": {
    "mechanic_id": "mec_042",
    "name": "Marko",
    "phone": "+381...",
    "shop_name": "Auto servis Marko"
  },
  "vehicle": {
    "vin": "WVWZZZ1KZAW123456",
    "brand": "VW", "model": "Golf VII", "year": 2016,
    "plate": "NI-123-AB", "fuel": "diesel"
  },
  "event": {
    "type": "service",
    "subtype": "mali_servis",
    "date": "2026-07-17",
    "mileage_km": 187500,
    "description": "Mali servis - ulje, filteri",
    "items": [
      {"kind":"part", "category":"oil_motor",   "name":"Motorno ulje",
       "brand":"Castrol", "model":"Edge 5W-30", "qty":4.3, "unit":"l"},
      {"kind":"part", "category":"filter_oil",  "name":"Filter ulja",
       "brand":"Mann-Filter", "model":"W7018",  "qty":1,   "unit":"kom"},
      {"kind":"labor","name":"Zamena ulja i filtera"}
    ],
    "photos": ["url1", "url2"],
    "next_service": {"km": 197500, "date": "2027-07-17"}
  },
  "source": "mechanic"
}
```

Napomene:
- **`items[].brand` + `items[].model`** = jedini pravi trag da mehaničar dodaje vrednost
- **`next_service`** = automatski Driver podsetnik
- **`source: "mechanic"`** = 🟢 Trust pečat u Driver timeline-u
- **Cene NIKAD u payload-u** — vozač unosi ručno posle

---

### Detalji — Stavka #11 (Expense modul)

**Event proširenje:**

```js
event.cost: {
  total: number,
  currency: "RSD" | "EUR",
  entered_by: "owner",
  entered_at: ISO,
  receipt_document_id: string,  // opciono link u DOKUMENTA
  informal: boolean             // true = "bez računa"
}
```

**Nove EVENT kategorije za expense:**
- `expense_fuel`
- `expense_tires`
- `expense_bodywork`
- `expense_registration`
- `expense_insurance`
- `expense_decorative` (sitnice, dekorativno)
- `expense_other`

**Ekran TROŠKOVI (novi tab u Driver bottom nav):**
- Vehicle switcher: [Sve ▼] [Kombi] [Kamion] [Golf] [Yaris]
- Period: [Ovaj mesec ▼] [Prethodni] [3 meseca] [Godina] [Sve]
- Sažetak ukupno + po kategoriji
- Hronološka lista (📎 ako ima priložen dokument)
- Brzi unos "+ Nov trošak"

**Brzi tokovi:**
1. Gorivo: datum, l, cena, km → automatski računa l/100km
2. Servis: datum, opis, cena (ili se povezuje sa postojećim service EVENT-om)
3. Registracija: iznos, veže se sa postojećim podsetnikom
4. Ostalo: slobodan tekst + cena

---

### Detalji — Stavka #13 + #14 (Trade toggle + Prodaj wizard)

**Vehicle proširenje:**

```js
vehicle.trade_mode: boolean
vehicle.status: "active" | "for_sale" | "sold" | "archived" | "totaled"
vehicle.trade: {
  purchase: {
    date: "2026-05-10",
    price: 4500, currency: "EUR",
    source: "individual" | "auction" | "import"
  },
  sale: {
    date: "2026-08-15",
    price: 5800, currency: "EUR"
  }
}
```

**Wizard "Prodaj vozilo" (samo ako trade_mode = true):**

```
1. Datum prodaje: [___]
2. Prodajna cena: [___] [RSD/EUR]
3. Prikazuje se: PROFIT: 320 EUR
4. Šta sa istorijom?
   ○ Podeli kupcu (šalje link)
   ○ Sačuvaj u arhivi (samo za mene)
   ○ Sačuvaj samo statistiku (obriši detalje)
5. [Potvrdi]
```

**Profit kartica (samo za trade_mode vozila):**

```
📊 Golf VII (aktivan)
Nabavka:       4.500 EUR
Ulaganja:        320 EUR (limar 250 + gume 70)
Trenutna cena: 4.820 EUR — potrebno da izađe u plus
```

**Trade dashboard (godišnji sažetak, P2):**

```
2026 — TRADE SAŽETAK

Prodato vozila:     7
Aktivno u obrtu:    4
Prosečan profit:  280 EUR
Ukupan profit:  1.960 EUR
Prosečno vreme:   42 dana

Top vozilo:  Golf VII 2016  (+520 EUR, 28 dana)
Loše:        Fiesta 2012    (-90 EUR, 76 dana)
```

---

### Detalji — Stavka #18 (Marketplace MVP)

**Endpoint-i (na istom AutoHub serveru):**

| Endpoint | Šta radi |
|---|---|
| `POST /marketplace/listings` | Kreiraj oglas iz Driver-a |
| `GET /marketplace/listings` | Javna lista oglasa (filteri: marka, godina, cena) |
| `GET /marketplace/listings/:id` | Javna stranica jednog oglasa + dosije |
| `POST /marketplace/messages` | Pošalji poruku prodavcu (kontakt-forma) |

**Javna stranica `/prodaja`:**
- Ne PWA — obična HTML stranica sa listom
- Bez login-a
- SEO-friendly
- Deli se Viberom/Facebook-om
- Kupac otvara oglas → vidi dosije → kontakt-forma → mail/SMS prodavcu

**Diferencijacija od KP/PA:**

```
Golf VII 2016
Cena: 8.500 EUR
Prodaje: Petar (Kruševac)

📊 ISTORIJA VOZILA
├── 47 zapisanih događaja od 2019
├── 12 servisa (3 potvrđena od mehaničara ✅)
├── 8 računa priloženo (PDF)
├── Prosečna godišnja kilometraža: 18.500 km
└── Vlasnik #2 od 2024

📄 [Preuzmi kompletan dosije PDF]

Kontakt: [Pošalji poruku]
```

**Nijedna druga aplikacija ili sajt u regionu ovo trenutno nema.**

---

## Zatvoreno

*(prazno — čeka se implementacija prve od stavki #8–#20)*

---

*Otvoreno: 10.07.2026. — Ažurirano: 17.07.2026. sa signalima iz strateške sesije (Goran servisi, Nikola expense odgovori, kolega preprodavac persona, AutoHub live, marketplace model, monetizacija).*
