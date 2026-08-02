# AUTO UNIVERSE — MAPA SVETA v1.1

**Datum:** 17.07.2026. | **Status:** Ažurirano posle strateške sesije (AutoHub live, expense modul, trade toggle, marketplace model)
**Princip:** Thinking big, starting small. Mapa je spisak MOGUĆNOSTI, ne obaveza.

**Changelog v1.0 → v1.1:**
- AutoHub: prebačen iz ⏳ vizije u 🟢 LIVE (server + Cloudflare Tunnel)
- Driver Toolbox: dodaje se v1.2 sadržaj — expense modul + trade toggle
- Marketplace: promenjena priroda (besplatan javni utility, ne provizioni model)
- Trader Toolbox kao odvojena app: OBRISAN — Driver + toggle rešava
- Delovi marketplace: ⚪ later (čeka "moj inventar" signal iz Garage-a)
- AutoUniverse Account: novi entitet (Nivo 2 — monetizacijski nosač)
- Monetizacija: potpuno redefinisana (nalozi, ne provizije)
- Vehicle model: dodata polja `registered_owner`, `status`, `trade_mode`, `trade`
- Event model: dodato polje `cost`, proširen `type` katalog (expense_*)

---

# DEO I — VELIKA SLIKA

## 1. Filozofija

1. **Vozilo je centralni entitet.** Ljudi, servisi i firme dolaze i odlaze — vozilo i njegova istorija ostaju.
2. **Svaka aplikacija je standalone.** Radi sama, offline, bez naloga, bez servera. Vrednost od prvog minuta.
3. **Tri nivoa funkcija:** Basic (besplatno) → Otključano kodom (kupovina/licenca) → Platform (kada AutoHub nalog postoji: sync, deljenje, marketplace objava).
4. **Moduli, ne aplikacije.** Aplikacija = paket modula + config (boje, terminologija, jezik). Isti modul se nikad ne kodira dvaput.
5. **Jednom napisano — nikad više ne piše se.** Tehnička kartica vozila rešava "mnogo se piše" problem.
6. **Ne zatvaramo vrata.** Model podataka je od prvog dana spreman za platformu, iako platforma još ne postoji.
7. **VIN je globalni identifikator vozila.** Obe strane (Driver i Garage) unose nezavisno, isto vozilo se prepoznaje. Već utisnut u karoseriju.
8. **Vlasništvo ≠ Vozač.** Papirni vlasnik iz saobraćajne i korisnik aplikacije se često razlikuju (dedu, majku, prethodnika). Model to razdvaja od dana 1.

## 2. Slojevi sistema

```
NIVO 3 — EKOSISTEM (vizija, gradi se poslednje)
  Marketplace vozila (BESPLATAN javni utility, kontakt-forma, bez provizije)
  Digitalni priručnici • Partneri • AI preporuke
  Delovi marketplace (čeka signal iz Garage-a "moj inventar")

NIVO 2 — PLATFORMA (LIVE — u aktivnom razvoju)
  AutoHub server ✅ (Node.js + better-sqlite3 + Cloudflare Tunnel)
  Magic-link razmena servisa (mehaničar ↔ vozač)
  AutoUniverse Account (Free / Basic / Pro / Garage Pro) — monetizacijski nosač
  grant() permission primitiv (jedan primitiv za sve scenarije)
  Cloud storage slika (R2) • Sync između uređaja
  Automatski transfer vlasništva vozila (VIN handshake sa registrovanim servisima)

NIVO 1 — STANDALONE APLIKACIJE (LIVE)
  Garage Toolbox v1.1 (majstor) ✅
  Driver Toolbox v1.1 (vlasnik + preprodavac kroz toggle) ✅
  Driver v1.2 u razvoju: expense modul + trade toggle

NIVO 0 — ZAJEDNIČKI TEMELJ (LIVE)
  Core moduli + model podataka + config sistem
```

## 3. Aplikacije — kompletan spisak mogućnosti

| Aplikacija | Korisnik | Status |
|---|---|---|
| **Garage Toolbox** | automehaničar (freelance i servis) | 🟢 LIVE v1.1 — testeri Marko + Goran |
| **Driver Toolbox** | vlasnik vozila **+ preprodavac (kroz toggle)** | 🟢 LIVE v1.1 — testeri Nikola + kolega |
| **AutoHub** (server) | pozadinska razmena podataka | 🟢 LIVE — na Milanovom PC + Cloudflare Tunnel |
| **Marketplace vozila** (statička stranica) | prodavci polovnjaka + kupci | 🔵 P2 — MVP na istom AutoHub serveru |
| **AutoUniverse Account** (Nivo 2 nosač) | svi korisnici platforme | 🔵 P2 — priprema modela |
| Tire Toolbox | vulkanizer | ⚪ kasnije |
| Inspection Toolbox | linija tehničkog pregleda | ⚪ kasnije |
| Insurance Toolbox | zastupnik osiguranja | ⚪ kasnije |
| Fleet Toolbox | male flote (taxi, dostava, građevina) | ⚪ kasnije |
| ~~Trader Toolbox~~ | ~~preprodavac polovnjaka~~ | ❌ **OBRISAN** — Driver + trade toggle rešava |
| Salvage Toolbox | auto-otpad | ⚪ later (čeka signal) |
| Delovi marketplace | mehaničari + salvage | ⚪ later (čeka bol iz Garage-a "moj inventar") |

## 4. Master lista modula

Legenda: 🟢 basic (besplatno) • 🔑 otključava se kodom • ☁️ platform funkcija (kad AutoHub nalog postoji) • ⚪ nije potrebno

### CORE moduli (Nivo 0 — dele ih sve aplikacije, kodiraju se JEDNOM)

| Modul | Šta radi |
|---|---|
| **Store** | lokalno čuvanje podataka (localStorage/IndexedDB), CRUD |
| **Vehicle Registry** | vozila sa tehničkom karticom, kategorijom, **statusom** (active/for_sale/sold/archived/totaled), **trade_mode toggle** |
| **Event Engine** | svaki zapis je događaj (datum, km, tip, izvor, **cost**) |
| **Contacts** | klijenti / dobavljači / servisi — jedan imenik, različite uloge |
| **PDF Engine** | jedan generator za sve dokumente (nalog, faktura, ponuda, izveštaj, **dosije vozila**) |
| **Camera & Photos** | slike pre/posle, kompresija, vezivanje za događaj |
| **Reminders** | podsetnici po datumu ILI kilometraži |
| **Backup / Export** | svi podaci u jedan fajl → sačuvaj / pošalji |
| **License Gate** | unos koda → otključavanje modula (Gumroad API, offline posle) |
| **Settings & Config** | profil, valuta, jezik, potpis on/off, tema |
| **i18n** | svi tekstovi u jezičkom fajlu; EN default, SR ugrađen |
| **Share** | slanje PDF/podataka: Viber, SMS, WhatsApp, mail (native share) |
| **AutoHub Client** | HTTP klijent za razmenu sa AutoHub serverom (magic-link, sync) |

### Moduli po aplikacijama

| Modul | Garage | Driver | Tire | Inspection | Insurance |
|---|---|---|---|---|---|
| Karton vozila (istorija) | 🟢 | 🟢 | 🔑 | 🔑 | ☁️ |
| Tehnička kartica vozila | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Radni nalog (WO Snap tok) | 🟢 | ⚪ | 🔑 | ⚪ | ⚪ |
| **"Podeli sa vlasnikom" (AutoHub)** | ☁️ | ⚪ | ☁️ | ☁️ | ☁️ |
| Faktura / Invoice PDF | 🟢 | ⚪ | 🟢 | 🔑 | 🔑 |
| Ponuda / Estimate | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| Slike pre/posle | 🟢 | 🟢 | 🔑 | 🟢 | 🟢 |
| Klijenti / kontakti | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Evidencija delova po vozilu | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| **Grupisane servisne kategorije (12 grupa) + učenje iz istorije** | 🟢 | 🟢 (autocomplete) | 🟢 | ⚪ | ⚪ |
| Podsetnici (servis, rok) | 🔑 | 🟢 | 🔑 | 🟢 | 🟢 |
| **Expense modul (troškovi + gorivo + 7 kategorija)** | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ |
| **Trade toggle (preprodavac-mod)** | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ |
| **"Prodaj vozilo" wizard sa 3 ishoda** | ⚪ | 🟢 | ⚪ | ⚪ | ⚪ |
| **Trade dashboard (godišnji profit sažetak)** | ⚪ | 🔑 | ⚪ | ⚪ | ⚪ |
| Gume (dimenzije, sezona, kupovina) | 🔑 | 🟢 | 🟢 | ⚪ | ⚪ |
| Dokumenta vozila (slike saobraćajne, polise...) | ⚪ | 🟢 | ⚪ | 🔑 | 🟢 |
| Kalkulatori (rad, marža, potrošnja) | 🔑 | 🔑 | 🔑 | ⚪ | ⚪ |
| Check liste (prijem vozila, put, zima) | 🔑 | 🔑 | 🔑 | 🟢 | ⚪ |
| Inspekcija / DVI (foto izveštaj stanja) | 🔑 | ⚪ | 🔑 | 🟢 | 🔑 |
| Inventar (delovi, ulja, gume na stanju) | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| Vizit karta + QR | 🔑 | ⚪ | 🔑 | ⚪ | 🔑 |
| Statistika / izveštaji | 🔑 | 🔑 | 🔑 | 🔑 | 🔑 |
| **Sync između uređaja (AutoUniverse Account)** | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| **Cloud slike (R2)** | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| Deljenje istorije vlasnik↔servis | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| QR identitet vozila | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| Zakazivanje termina online | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| **Objava marketplace oglasa** | ⚪ | ☁️ | ⚪ | ⚪ | ⚪ |
| **Automatski transfer podataka pri prodaji vozila (VIN handshake)** | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| AI asistent (preporuke iz istorije) | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |

> **Pravilo širenja:** kada budući modul zatreba, prvo se proveri da li postoji u ovoj tabeli. Ako postoji — koristi se CORE verzija sa config izmenama. Ako ne postoji — dodaje se u tabelu, pa tek onda kodira.

---

# DEO II — MODEL PODATAKA (najvažniji deo dokumenta)

Radi u IndexedDB danas, u SQLite (better-sqlite3) na AutoHub-u već. Svaki objekat ima `id`, `created_at`, `updated_at`.

## VEHICLE (vozilo) — v1.1 sa proširenjima

```json
{
  "id": "veh_001",
  "category": "M1",
  "type_label": "Putnički automobil",
  "make": "Volkswagen",
  "model": "Golf 7",
  "year": 2016,
  "vin": "WVWZZZ...",              // opciono za sad, obavezno u Fazi 5
  "plate": "KŠ-123-AB",
  "engine": {
    "code": "CRLB",
    "displacement_ccm": 1968,
    "power_kw": 110,
    "fuel": "diesel",
    "gearbox": "manual_6"
  },
  "service_data": {
    "oil_type": "5W-30 507.00",
    "oil_qty_l": 4.3,
    "oil_filter": "MANN HU 6013 z",
    "air_filter": "...",
    "fuel_filter": "...",
    "cabin_filter": "...",
    "brake_notes": "...",
    "battery": "70Ah",
    "custom_fields": []
  },
  "tires": {
    "size_front": "205/55 R16",
    "size_rear": "205/55 R16",
    "current_set": "letnje, Michelin, kupljene 05/2025"
  },
  "owner_contact_id": "con_003",

  // NOVA POLJA v1.1
  "registered_owner": "Milan Marković",     // ime iz saobraćajne, opciono
  "status": "active",                        // active | for_sale | sold | archived | totaled
  "trade_mode": false,                       // preprodavac-mod toggle
  "trade": {                                 // opciono polje, popuni ako trade_mode = true
    "purchase": {
      "date": "2026-05-10",
      "price": 4500, "currency": "EUR",
      "source": "individual",                // individual | auction | import
      "notes": ""
    },
    "sale": {                                // popuni pri prodaji
      "date": null,
      "price": null, "currency": "EUR"
    }
  },

  "photos": [],
  "notes": ""
}
```

### Kategorije vozila (šifarnik — po propisima RS)

| Kod | Opis |
|---|---|
| M1 / M2 / M3 | putnička vozila / autobusi do 5t / preko 5t |
| N1 / N2 / N3 | teretna do 3,5t / 3,5–12t / preko 12t |
| L | mopedi, motocikli, tricikli, kvadovi |
| O | prikolice i poluprikolice |
| T | traktori |
| R/TR | priključna vozila za traktore |
| RM | radne mašine (bager, utovarivač, valjak, dizalica...) |
| SP | specijalna vozila (vatrogasno, hitna, kran, mikser...) |

## EVENT (događaj — srce sistema) — v1.1 sa proširenjima

Sve što se vozilu desi je događaj.

```json
{
  "id": "evt_042",
  "vehicle_id": "veh_001",
  "type": "service",
  // Katalog type v1.1:
  //   service | repair | work_order | inspection | tires | document | reminder_done | note
  //   expense_fuel | expense_tires | expense_bodywork | expense_registration
  //   expense_insurance | expense_decorative | expense_other
  "subtype": "mali_servis",                  // za service: mali_servis | veliki_servis | ...
  "date": "2026-07-10",
  "mileage_km": 185000,
  "title": "Mali servis",
  "description": "Ulje, filteri, provera kočnica",
  "items": [
    {
      "kind": "part",
      "category": "oil_motor",
      "name": "Motorno ulje",
      "brand": "Castrol",                    // NOVO v1.1 — brand za razmenu
      "model": "Edge 5W-30",                 // NOVO v1.1 — model / kataloški broj
      "qty": 4.3, "unit": "l",
      "price": 4800, "currency": "RSD"
    },
    {
      "kind": "part",
      "category": "filter_oil",
      "name": "Filter ulja",
      "brand": "Mann-Filter",
      "model": "W7018",
      "qty": 1, "unit": "kom",
      "price": 1200, "currency": "RSD"
    },
    {"kind": "labor", "name": "Zamena ulja i filtera", "price": 30, "currency": "EUR"}
  ],

  // NOVA POLJA v1.1
  "cost": {                                   // agregat za expense modul (Driver)
    "total": 6000,
    "currency": "RSD",
    "entered_by": "owner",
    "entered_at": "2026-07-10T15:30:00Z",
    "receipt_document_id": null,              // opciono link u DOKUMENTA
    "informal": false                          // "bez računa" flag (sitnice, drugari, keš)
  },
  "public_on_marketplace": true,              // opt-in za prikaz u dosijeu prodaje (default: true)
  "retroactive": false,
  "date_precision": "exact",                  // exact | month | approx
  "km_precision": "exact",                    // exact | approx
  "next_service": {                           // predlog za automatski podsetnik u Driveru
    "km": 195000,
    "date": "2027-07-10"
  },

  "photos": [],
  "contact_id": "con_003",
  "source": "mechanic",                       // TRUST polje: mechanic | owner | receipt | initial | inspection | insurance
  "app": "garage",
  "documents": ["doc_017"]
}
```

**Polja `source`, `app`, `retroactive`, `cost.informal` su seme Trust Layer-a** — koštaju nula sada, a omogućavaju verifikovanu istoriju i dosije za prodaju sutra.

## CONTACT / DOCUMENT / REMINDER (skraćeno)

- **CONTACT:** ime, telefon, uloge `["client","supplier","service","buyer","seller"]`, vezana vozila, beleške. Jedan imenik za sve aplikacije.
- **DOCUMENT:** tip (invoice, work_order, saobraćajna, polisa, garantija, ostalo), broj (GT-0001), datum, vezano vozilo/događaj, fajl/slika.
- **REMINDER:** naslov, okidač po datumu I/ILI kilometraži, vezano vozilo.

## AUTOHUB — novi entiteti (Nivo 2)

### ACCOUNT (AutoUniverse nalog)

```json
{
  "id": "acc_042",
  "email": "milan@example.com",
  "phone": "+381...",
  "tier": "basic",                            // free | basic | pro | garage_pro
  "created_at": "2026-08-01T...",
  "verified": {
    "email": true,
    "phone": true,
    "identity": false,                        // JMBG — samo za marketplace prodavce
    "professional": false                     // link ka SIA/BRA — samo mehaničari
  },
  "linked_devices": [
    { "device_id": "...", "app": "driver", "last_sync": "..." }
  ]
}
```

### GRANT (permission primitiv)

```json
{
  "id": "grant_017",
  "grantor_account": "acc_042",              // ko daje pristup
  "grantee_account": "acc_015",               // kome (može biti null za javne share linkove)
  "vehicle_id": "veh_001",                    // ili VIN ako grantee_account = null
  "vin": "WVWZZZ...",
  "role": "read:events" | "write:events" | "read:full_history" | "owner",
  "expires_at": null,                         // null = permanent (za transfer vlasništva)
  "created_at": "..."
}
```

### SHARE LINK (magic-link razmena)

```json
{
  "share_id": "sh_aB3xY7",
  "type": "event_share" | "vehicle_transfer" | "marketplace_listing",
  "payload": { /* JSON iz sekcije razmene */ },
  "expires_at": "2026-07-24T...",             // 7 dana za event share; nikad za transfer
  "consumed_by": null                         // account_id koji je uvezao
}
```

### MARKETPLACE LISTING

```json
{
  "id": "list_009",
  "account_id": "acc_042",
  "vehicle_id": "veh_001",
  "price": 8500, "currency": "EUR",
  "description": "Prodaje se Golf VII 2016, kompletna istorija dostupna...",
  "status": "active" | "sold" | "expired",
  "public_events": ["evt_042", "evt_017", ...], // iz events sa public_on_marketplace = true
  "contact_method": "phone_call" | "message",
  "views": 0,
  "messages_count": 0
}
```

## Valute

- Podrazumevana valuta u Settings (RSD ili EUR)
- **Svaka stavka nosi svoju valutu** (deo u RSD, rad u EUR — realnost)
- Expense modul: sabira po valuti odvojeno
- Trade profit računica: neophodan izbor referentne valute (nabavka + prodaja u istoj)

---

# DEO III — SPECIFIKACIJE APLIKACIJA

## APLIKACIJA 1: GARAGE TOOLBOX

**Korisnik:** Marko i Goran — samostalni majstori, bez firme, telefon u ruci, često bez interneta.
**Zamenjuje:** papir, svesku, Viber haos.
**Ne radi:** fiskalizaciju, knjigovodstvo, plaćanja.

### Ekrani (bottom nav: HOME | VOZILA | NOVI POSAO | KONTAKTI | SETTINGS)

**HOME** — današnji poslovi, aktivni nalozi, podsetnici koji stižu, dugme "+ Novi posao".

**VOZILA** — pretraga → Karton vozila (zaglavlje + tehnička kartica + istorija + dugmad).

**NOVI POSAO — WO Snap tok (7 koraka, svaki preskočiv):**
```
1. Vozilo      → postojeće ili novo (min: marka, model)
2. Klijent     → iz imenika ili novi (ime + telefon dovoljno)
3. Opis rada   → NOVO v1.2: grupisane servisne kategorije (12 grupa)
                    - Top red: "Poslednje" (4 chip-a, uči iz istorije)
                    - Ispod: 6 kategorija (Motor · Fluidi · Kočnice · Klima · Elektro · Dijagnostika)
                    - Uvek: slobodan tekst + 🎤 glas
                    - Multi-select (dodaje, ne zamenjuje)
                    - "Veliki servis" preset (dodaje 6-8 podstavki jednim tapom)
4. Slike       → pre / tokom / posle
5. Stavke      → NOVO v1.2: deo/rad + brand + model + qty + cena + valuta
6. Potpis      → SAMO ako je uključen (default: OFF)
7. PDF         → pregled → Share / Sačuvaj / Kasnije
                 NOVO v1.2: dugme "☁️ Podeli sa vlasnikom" (AutoHub magic-link)
```

**KONTAKTI** — klijenti i dobavljači, klik = poziv/poruka, istorija poslova po klijentu.

**SETTINGS** — profil, valuta, jezik, potpis, backup/export, licenca, **AutoHub nalog (v1.2)**.

### Nivoi funkcija

| 🟢 Basic (besplatno) | 🔑 Kod (Gumroad) | ☁️ Platform (AutoHub Pro) |
|---|---|---|
| Vozila + tehnička kartica | Ponuda/Estimate | Sync i cloud backup |
| Radni nalog + PDF (watermark) | Podsetnici za mušterije | **Podeli sa vlasnikom** (magic-link) |
| Faktura PDF (watermark) | Kalkulatori (rad, marža) | Cloud slike (R2) |
| **Grupisane servisne kategorije** | Evidencija delova + inventar | QR identitet vozila |
| Slike | Inspekcija/DVI izveštaj | Prijem posla iz vlasnikovog QR-a |
| Kontakti | Bez watermarka + statistika | Reputacija na marketplace-u (naziv u dosijeu) |
| Backup/export | | |

## APLIKACIJA 2: DRIVER TOOLBOX

**Korisnik:** vlasnik vozila (Nikola, Milan) **+ preprodavac (kolega — kroz toggle)**.
**Suština:** sve o mom vozilu u džepu — i kada vodim račun i za sopstveno vozilo i kada prodajem tuđi polovnjak.

### Ekrani (bottom nav v1.2: MOJE VOZILO | ISTORIJA | TROŠKOVI | DOKUMENTA | PODSETNICI | SETTINGS)

**MOJE VOZILO** — kartica vozila (podaci iz saobraćajne, tehnička kartica, gume). Više vozila. **NOVO v1.2:** vehicle switcher; polje `registered_owner`; toggle "Ovo vozilo je za prodaju" (otključava trade polja).

**ISTORIJA** — timeline svih događaja: servis, popravka, tehnički, gume. Retroaktivni unosi. Brzi unos "+ Servis". **NOVO v1.2:** prijem servisnog zapisa iz AutoHub magic-link (auto-uvoz sa Trust pečatom 🟢).

**TROŠKOVI (NOVO v1.2)** — expense modul:
- Vehicle switcher: [Sve ▼] [Kombi] [Kamion] [Golf] [Yaris]
- Period: [Ovaj mesec ▼] [Prethodni] [3 meseca] [Godina] [Sve]
- Sažetak ukupno + po kategoriji (7 kategorija)
- Hronološka lista (📎 ako ima priložen dokument, ⓘ ako `informal: true`)
- Brzi unos: gorivo (l/100km auto), servis, registracija, ostalo
- **Za trade_mode vozila:** profit kartica (nabavka − ulaganja − prodajna)

**DOKUMENTA** — slike saobraćajne, polise, računi (uključujući PDF-ove primljene od mehaničara), garancije.

**PODSETNICI** — registracija, tehnički, polisa, servis, gume (sezonski). **NOVO v1.2:** automatski podsetnik iz `next_service` polja primljenog EVENT-a.

**SETTINGS** — profil, valuta, jezik, backup/export, licenca, **AutoHub nalog (v1.2)**, preprodavac-mod on/off (globalno + default toggle za nova vozila).

### "Prodaj vozilo" wizard (samo ako `trade_mode = true`)

```
1. Datum prodaje: [___]
2. Prodajna cena: [___] [RSD/EUR]
3. Prikazuje se: PROFIT: 320 EUR
4. Šta sa istorijom?
   ○ Podeli kupcu (šalje AutoHub link, kupac uvozi u svoj Driver)
   ○ Sačuvaj u arhivi (status: sold, detalji ostaju za mene)
   ○ Sačuvaj samo statistiku (detalji brisani, agregat u godišnjem sažetku)
5. [Potvrdi]
```

### Trade dashboard (godišnji sažetak, 🔑)

```
2026 — TRADE SAŽETAK
Prodato vozila:    7
Aktivno u obrtu:   4
Prosečan profit:  280 EUR
Ukupan profit:  1.960 EUR
Prosečno vreme:  42 dana

Top vozilo:  Golf VII 2016  (+520 EUR, 28 dana)
Loše:        Fiesta 2012    (-90 EUR, 76 dana)
```

### Nivoi funkcija (v1.2)

| 🟢 Basic | 🔑 Kod | ☁️ Platform (AutoHub Basic/Pro) |
|---|---|---|
| 1 vozilo, kompletan karton | Više vozila | Sync između uređaja |
| Istorija servisa | Troškovi + gorivo (expense modul) | Prijem od mehaničara (magic-link) |
| Dokumenta (slike) | Trade toggle + wizard | Cloud slike (R2) |
| Podsetnici + gume | Trade dashboard (statistika) | Verifikovana istorija za prodaju vozila |
| Backup/export | Kalkulatori, check liste | **Objava marketplace oglasa** |
| **Grupisane servisne kategorije** | Izvoz istorije u PDF ("dosije vozila") | QR vozila |
| **`informal` flag na trošku** | | Automatski transfer podataka pri prodaji |

> **Most između aplikacija (AutoHub live):** Marko završi posao u Garage → klik "Podeli" → link Viberom → vozač otvara Driver → EVENT stigao sa `source: "mechanic" 🟢`. **Ovo se implementira SADA, ne u budućnosti.**

---

# DEO IV — TEHNIČKA ARHITEKTURA

| Komponenta | Rešenje | Napomena |
|---|---|---|
| Frontend | Vanilla JS + HTML + CSS (PWA) | bez framework-a, bez build tool-a |
| Offline | Service Worker | GATE A: airplane mode test — OBAVEZAN |
| Storage lokalno | IndexedDB (+ localStorage za settings) | Slike + veće količine podataka |
| **Backend (AutoHub)** | **Node.js + better-sqlite3 + bcryptjs** | **LIVE** — na Milanovom PC |
| **Backend tunel** | **Cloudflare Tunnel** | **LIVE** — javna HTTPS bez VPS-a |
| **Cloud slike** | Cloudflare R2 | Faza 5 — kad AutoHub Pro krene |
| **Discovery endpoint** | `platform-url.json` na GitHub Pages | LIVE — aplikacije nalaze AutoHub URL |
| PDF | jsPDF, bundled lokalno | DejaVu font za srpske karaktere |
| Licenca | Gumroad License API | verify jednom → offline zauvek; TEST-UNLOCK za razvoj |
| Hosting frontend | GitHub Pages | besplatno |
| iOS | PWA preko Safari "Add to Home Screen" | Backup obavezan zbog Safari ograničenja |
| **Android distribucija** | **Capacitor + Play Store (odluka doneta)** | Faza 5 — čeka registraciju DOO/preduzetnika ili 12 testera |
| Jezik | i18n fajlovi | EN default, SR ugrađen |
| Config | `garage_v1.json`, `driver_v1.json`, `driver_v2.json` (v1.2 dodaje expense) | trade-config princip |

**Deljenje koda:** jedan `core/` folder + config po aplikaciji. Garage i Driver dele ~70% koda. AutoHub Client je novi core modul (~10% koda dodatnog).

**Quality gates:** A) offline test • B) 53 assertion testa (proširiti sa expense/trade testovima) • C) contamination sweep • D) backup/restore test na iPhone-u • **E) AutoHub round-trip test (novo v1.2)**.

---

# DEO V — REDOSLED RAZVOJA

**Faza 1 — Garage Toolbox v1** ✅ (jul 2026)

**Faza 2 — Driver Toolbox v1** ✅ (jul 2026)

**Faza 3 — Feedback petlja** 🟢 aktivna (jul 2026 →)
- Marko, Goran (Garage) — testiraju
- Nikola (Driver) — aktivan tester
- Kolega preprodavac — potencijalan (čeka draft poruke)

**Faza 4 — AutoHub v0** 🟢 **LIVE** (jul 2026)
- Server na Milanovom PC + Cloudflare Tunnel
- Magic-link razmena servisa: implementacija u toku
- `grant()` primitiv od dana 1
- Testeri direktno preko Cloudflare URL-a

**Faza 4.1 — Driver v1.2** 🟢 u razvoju (P0)
- Expense modul (`event.cost`, 7 kategorija, TROŠKOVI ekran)
- Vehicle switcher + `status` polje
- `informal` flag
- `registered_owner` polje
- Grupisane servisne kategorije (autocomplete iz istorije)

**Faza 4.2 — Driver v1.2 + Trade** 🟢 u razvoju (P1)
- Trade toggle po vozilu
- `vehicle.trade` polje
- "Prodaj vozilo" wizard sa 3 ishoda
- Profit kartica

**Faza 4.3 — Garage v1.2** 🟢 u razvoju (P0)
- Grupisane servisne kategorije (12 grupa)
- Brand + model na stavkama
- "Podeli sa vlasnikom" dugme (AutoHub integracija)

**Faza 5 — Marketplace + Account** 🔵 P2/P3 (kasnije 2026)
- Marketplace MVP na istom AutoHub serveru
- Javna stranica `/prodaja` (bez login-a)
- AutoUniverse Account (Free/Basic/Pro)
- Naplata kroz Gumroad/Stripe
- Automatski transfer vlasništva vozila (VIN handshake)
- Cloud slike (R2)

**Faza 6+ — ekosistem** ⚪
- Tire, Inspection, Insurance Toolbox
- Delovi marketplace (čeka signal iz Garage-a)
- Salvage Toolbox
- AI preporuke iz istorije
- Auto Kits / priručnici / partneri

## Monetizacija (v1.1 — potpuno redefinisana)

**Princip:** Marketplace ne zarađuje. AutoHub zarađuje.

| Sloj | Model | Prihodi | Trošak |
|---|---|---|---|
| **Marketplace vozila** | Besplatan javni utility, kontakt-forma bez provizije | 0 EUR (mamac) | ~0 EUR (statička stranica) |
| **AutoUniverse Account Free** | Standalone Driver/Garage lokalno, marketplace read-only | 0 EUR | ~0 EUR |
| **AutoUniverse Account Basic** | Sync između uređaja, backup na server, objava oglasa | 2–5 EUR/mesec | R2 storage + tunel |
| **AutoUniverse Account Pro** | Razmena sa mehaničarima, cloud slike, "Verifikovan prodavac" pečat, dosije PDF sa QR | 5–10 EUR/mesec | R2 storage veći |
| **Garage Pro (mehaničari)** | AutoHub Pro + Garage funkcije + prioritetni support | 15–25 EUR/mesec | isto |
| **Jednokratne licence (Gumroad)** | Otključavanje 🔑 modula bez cloud-a | $19–49 po aplikaciji | ~0 EUR |

**Ključne odluke:**
- Nema provizija ni od jedne strane (marketplace, razmena, transakcije)
- Nema fiskalizacije ni PDV-a (SaaS, ne roba)
- Nema logistike (dostava, pakovanje, garancija — sve van sistema)
- Google Play Billing izuzet za SaaS (ne za digitalna dobra unutar Play appa)
- Cifre ilustrativne — testiraće se u P3, ne pre 20 zainteresovanih naloga

**Realistična očekivanja:**
- **Godina 1:** verovatno neto negativna. Cilj 100 aktivnih naloga.
- **Godina 2:** ako marketplace privuče vozače, prihod raste. Cilj 500+ naloga.
- **Godina 3:** ako marketplace postane referentna tačka za polovnjake u regionu, ozbiljna vrednost.

---

## Otvorena pitanja (rešavaju se kasnije, ne blokiraju razvoj)

1. Konačna imena aplikacija i marketplace domena (`autouniverseprodajaautomobila.rs`, `autouniverse.rs` — proveriti zauzetost)
2. Očitavanje saobraćajne dozvole (barkod/NFC) — istražiti posle v1.2
3. Tačni rokovi tehničkog pregleda po kategorijama — u Inspection spec
4. Pravni okvir deljenja podataka — u AutoHub Pro fazi (saglasnost pri povezivanju, ZZPL/GDPR)
5. Kurs EUR/RSD u PDF zbiru — čekaju odgovori Marka/Gorana
6. Kada seliti AutoHub sa PC-a na VPS — kad prekoračimo 50+ istovremenih korisnika ili kad uptime postane žalba
7. Naplatni provajder — Gumroad (postoji integracija) vs Stripe (bolja UX) — odluka pre P3

---

## Rešene odluke (ova sesija — 17.07.2026.)

- ✅ **Trader Toolbox se ne pravi** — Driver + trade toggle rešava
- ✅ **Cene se NE dele automatski** kroz AutoHub razmenu — vozač unosi ručno
- ✅ **VIN je globalni identifikator** — ostaje opciono do Faze 5
- ✅ **Vlasništvo ≠ Vozač** — `registered_owner` polje
- ✅ **Marketplace bez provizije** — samo kontakt-forma
- ✅ **Monetizacija = AutoHub nalozi**, ne provizije
- ✅ **Expense modul u P0** — Nikola i kolega imaju šta da testiraju
- ✅ **Kolega preprodavac = nova persona** — 4 aktivno, 5–6 mesečno, papir → digital
- ✅ **`informal` flag** — sitnice, drugari, keš (kolegin realan slučaj)
- ✅ **Marketplace = pogled na podatke, ne app** — statička stranica koja crta iz baze
- ✅ **Mehaničar dobija besplatnu reputaciju** — naziv servisa u javnom dosijeu vozila

---

*Živi dokument. v1.1 — 17.07.2026. Sledeći update: posle Terminal Claude implementacije P0/P1.*
