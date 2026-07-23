# AUTO UNIVERSE — MAPA SVETA v2.0

**Datum:** 20.07.2026. | **Status:** Aktivni razvoj
**Trenutno stanje:** Garage Toolbox v1.18.0 (u testiranju) • Driver Toolbox u ranom testiranju • AU Core u razvoju (lokalno, izložen kroz Cloudflare Tunnel)
**Princip:** Thinking big, starting small, not closing doors. Mapa je spisak MOGUĆNOSTI, ne obaveza.

**Napomena o testerima:** Testeri su prijatelji koji probaju sve aplikacije koje dobiju, ne samo one koje odgovaraju njihovoj primarnoj ulozi. Feedback za aplikacije van njihovog domena ponekad je jednako koristan kao onaj iz domena.

---

# REČENICE-KOMPAS

Ove rečenice služe kao severna zvezda razvoja. Kada je odluka o novoj funkciji, novom modulu ili novoj aplikaciji nejasna, pitanje glasi: **da li nova stvar potvrđuje bar jednu od ovih rečenica?** Ako ne — verovatno ne pripada AutoUniverse-u.

*Grupe se mogu proširivati kako sistem raste. Nova rečenica ulazi u kompas tek kad opravda svoje mesto — treba da odgovori na pitanje koje se javlja češće od jednom.*

### O sistemu

> **Podatak nastaje jednom. Koristi se mnogo puta.**

> **Vozilo je centralni entitet. Aplikacije su različiti pogledi na iste podatke.**

### O proizvodima

> **Driver je digitalna servisna knjižica i lični dosije vozila.**

> **Mehaničar pravi dokumentaciju jednom. Ista dokumentacija ide vlasniku, ostaje u istoriji vozila, koristi se za garanciju i za buduću prodaju.**

> **AU Core nije mesto na koje se dolazi. AU Core je infrastruktura koja povezuje sve ostalo.**

### O pravilima razmene

> **Cena je informacija između profesionalca i vlasnika. Sve ostalo — delovi, radovi, kilometraža, fotografije — putuje kroz istoriju vozila.**

### O krajnjoj viziji

> **Ako nije u AutoUniverse, kao da se nije ni dogodilo.**

---

# DEO I — VELIKA SLIKA

## 1. Filozofija

1. **Vozilo je centralni entitet.** Ljudi, servisi i firme dolaze i odlaze — vozilo i njegova istorija ostaju.
2. **Svaka aplikacija je standalone.** Radi sama, offline, bez naloga, bez servera. Vrednost od prvog minuta.
3. **Tri nivoa funkcija:** Basic (besplatno) → Otključano kodom (kupovina/licenca) → Platform (kada platforma postoji: sync, deljenje, partneri).
4. **Moduli i zajedničko jezgro.** Različite aplikacije dele infrastrukturu (auth, sync, PDF, storage), ali imaju svoje event šeme i grant scope-ove.
5. **Jednom napisano — nikad više ne piše se.** Tehnička kartica vozila rešava "mnogo se piše" problem.
6. **Ne zatvaramo vrata.** Model podataka je od prvog dana spreman za platformu, iako platforma još ne postoji.
7. **Kodira se po redosledu, publikuje kroz feedback.** Kodiranje kreće sa poznatim informacijama; javno objavljivanje čeka signal iz stvarnog testiranja.

## 2. Slojevi sistema

```
NIVO 3 — EKOSISTEM (vizija, gradi se poslednje)
  AutoOglasi (peer-to-peer vozila) • AutoDelovi (peer-to-peer delovi)
  Naša prodavnica (Auto Kits, priručnici) • Partneri • Affiliate

NIVO 2 — AUTOHUB (konkretan proizvod u razvoju)
  Node.js + better-sqlite3 • grant() permission engine
  VIN kao globalni identifikator • Discovery preko platform-url.json
  Cloudflare R2 storage • Admin panel • Power user paneli

NIVO 1 — STANDALONE APLIKACIJE (gradimo SADA)
  Garage Toolbox (majstor) • Driver Toolbox (vlasnik)
  Faza 4+: Tire, Body, Paint, Electric, Glass, Wash, Tow,
  Dealer, Fleet, Rent, Insurance, Technical, Salvage

NIVO 0 — ZAJEDNIČKI TEMELJ (kod koji dele sve aplikacije)
  Core moduli + model podataka + config sistem
```

## 3. Aplikacije — spisak mogućnosti

| Aplikacija | Korisnik | Status |
|---|---|---|
| **Garage Toolbox** | automehaničar (freelance i servis) | 🟢 U TESTIRANJU (v1.18.0) |
| **Driver Toolbox** | vlasnik vozila | 🟢 RANO TESTIRANJE |
| **AU Core** | infrastruktura (bez krajnjeg korisnika) | 🟢 U RAZVOJU |
| Specijalizovane aplikacije Faze 4+ | vulkanizer (Tire), limar (Body), lakirer (Paint), autoelektričar (Electric), autostakla (Glass), detailing (Wash), šlep služba (Tow), auto salon (Dealer), flote (Fleet), rent-a-car (Rent), osiguranje (Insurance), tehnički pregled (Technical), otpad/rashodovana vozila (Salvage) | ⚪ Faza 4+ — zasebne aplikacije koje dele jezgro (vidi DEO VII) |

> **Napomena o listi specijalizovanih aplikacija:** Spisak nije konačan. Kao i sve u izgradnji, podložan je dopunama i izmenama. Nove aplikacije se dodaju kada iz feedback-a dođe konkretan signal, ne pre.

## 4. Master lista modula

Legenda: 🟢 basic (besplatno) • 🔑 otključava se kodom • ☁️ platform funkcija (kad platforma postoji) • ⚪ nije potrebno

### CORE moduli (Nivo 0 — dele ih sve aplikacije, kodiraju se JEDNOM)

| Modul | Šta radi |
|---|---|
| **Store** | lokalno čuvanje podataka (IndexedDB), CRUD |
| **Vehicle Registry** | vozila sa tehničkom karticom i kategorijom |
| **Event Engine** | svaki zapis je događaj (datum, km, tip, izvor, source) |
| **Contacts** | klijenti / dobavljači / servisi — jedan imenik, različite uloge |
| **PDF Engine** | jedan generator (jsPDF + DejaVu font za srpske karaktere) |
| **Camera & Photos** | slike sa metapodacima (before/during/after/damage), R2 upload |
| **Reminders** | podsetnici po datumu ILI kilometraži |
| **Backup / Export** | svi podaci u jedan fajl → sačuvaj / pošalji |
| **License Gate** | unos koda → otključavanje modula (Gumroad / Play Billing / AU Core subscription) |
| **Settings & Config** | profil, valuta, jezik, potpis on/off, tema |
| **i18n** | svi tekstovi u jezičkom fajlu; EN default, SR ugrađen |
| **Share** | slanje PDF/podataka: Viber, SMS, WhatsApp, mail (native share) |
| **Sync Engine** | razmena sa AU Core-om, offline-first, konflikt resolucija |

### Moduli po aplikacijama

| Modul | Garage | Driver | Tire | Inspection | Insurance |
|---|---|---|---|---|---|
| Karton vozila (istorija) | 🟢 | 🟢 | 🔑 | 🔑 | ☁️ |
| Tehnička kartica vozila | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Radni nalog (WO Snap tok) | 🟢 | ⚪ | 🔑 | ⚪ | ⚪ |
| Faktura / Invoice PDF | 🟢 | ⚪ | 🟢 | 🔑 | 🔑 |
| Ponuda / Estimate | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| Slike pre/posle | 🟢 | 🟢 | 🔑 | 🟢 | 🟢 |
| Klijenti / kontakti | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Evidencija delova po vozilu | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| Podsetnici (servis, rok) | 🔑 | 🟢 | 🔑 | 🟢 | 🟢 |
| Troškovi + gorivo (7 kategorija) | ⚪ | 🔑 | ⚪ | ⚪ | ⚪ |
| Trade / Reseller mode | ⚪ | 🔑 | ⚪ | ⚪ | ⚪ |
| Gume (dimenzije, sezona, kupovina) | 🔑 | 🟢 | 🟢 | ⚪ | ⚪ |
| Dokumenta vozila (slike saobraćajne, polise) | ⚪ | 🟢 | ⚪ | 🔑 | 🟢 |
| Kalkulatori (rad, marža, potrošnja) | 🔑 | 🔑 | 🔑 | ⚪ | ⚪ |
| Check liste (prijem vozila, put, zima) | 🔑 | 🔑 | 🔑 | 🟢 | ⚪ |
| Inspekcija / DVI (foto izveštaj stanja) | 🔑 | ⚪ | 🔑 | 🟢 | 🔑 |
| Inventar (delovi, ulja, gume na stanju) | 🔑 | ⚪ | 🔑 | ⚪ | ⚪ |
| Vizit karta + QR | 🔑 | ⚪ | 🔑 | ⚪ | 🔑 |
| Statistika / izveštaji | 🔑 | 🔑 | 🔑 | 🔑 | 🔑 |
| Sync na platformu | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| Deljenje istorije vlasnik↔servis | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| QR identitet vozila | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| Zakazivanje termina online | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| Marketplace / partneri / oglasi | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |
| AI asistent (preporuke iz istorije) | ☁️ | ☁️ | ☁️ | ☁️ | ☁️ |

> **Pravilo širenja:** kada budući modul zatreba, prvo se proveri da li postoji u ovoj tabeli. Ako postoji — koristi se CORE verzija sa config izmenama. Ako ne postoji — dodaje se u tabelu, pa tek onda kodira.

---

# DEO II — MODEL PODATAKA

Radi u IndexedDB danas, u SQLite (AU Core) i eventualnoj centralnoj bazi sutra. Svaki objekat ima `id`, `created_at`, `updated_at`.

## VEHICLE (vozilo)

```json
{
  "id": "veh_001",
  "vin": "WVWZZZ...",              
  "category": "M1",
  "type_label": "Putnički automobil",
  "make": "Volkswagen",
  "model": "Golf 7",
  "year": 2016,
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

  "primary_driver_id": "con_003",
  "registered_owner_id": "con_007",
  "co_owners": [],

  "trade_mode": false,
  "purchase_data": {
    "date": null,
    "price": null,
    "currency": null,
    "mileage_km": null,
    "source": null,
    "informal": false
  },
  "sale_data": {
    "date": null,
    "price": null,
    "currency": null,
    "buyer_contact_id": null,
    "transfer_type": null,
    "informal": false
  },

  "photos": [],
  "notes": ""
}
```

**VIN kao globalni identifikator:** `vin` je na vrhu objekta jer je to jezik razmene kroz AU Core. Interni `id` (`veh_001`) ostaje kao lokalni ključ unutar aplikacije.

**VIN unos — metode (po fazama):** (1) Ručni unos 17 znakova + offline WMI decoder (`core/data/wmi.json`) koji momentalno prikaže marku i godište bez mreže — F1, radi u web PWA. (2) NHTSA vPIC enrichment (engine, fuel, body class) — F2, online, tiho pada na F1 bez neta. (3) Aztec 2D skener saobraćajne kamerom (`zxing-js`) — F3, **samo Capacitor build**, čeka testerski signal. NFC čip srpske saobraćajne otpisan (MUP format nedokumentovan). Detalji: `ideas/hypothesis/2026-07-22_vin_scanning_onboarding.md`.

**Ownership polja (RS realnost):** `primary_driver_id` (vozač) može biti različit od `registered_owner_id` (registrovani vlasnik u papirima). `co_owners` — više vozača u domaćinstvu.

**Trade / Reseller mode:** `trade_mode: true` otključava `purchase_data` i `sale_data` polja. Zamenjuje ideju zasebnog "Trader Toolbox" proizvoda.

### Kategorije vozila (šifarnik — po propisima RS)

| Kod | Opis |
|---|---|
| M1 / M2 / M3 | putnička vozila / autobusi do 5t / preko 5t |
| N1 / N2 / N3 | teretna do 3,5t / 3,5–12t / preko 12t |
| L | mopedi, motocikli, tricikli, kvadovi |
| O | prikolice i poluprikolice |
| T | traktori |
| R/TR | priključna vozila za traktore |
| RM | radne mašine (bager, utovarivač, valjak, dizalica) |
| SP | specijalna vozila (vatrogasno, hitna, kran, mikser) |

## EVENT (događaj — srce sistema)

Sve što se vozilu desi je događaj. Radni nalog, servis, sipanje goriva, tehnički, kupovina guma — sve isti oblik.

```json
{
  "id": "evt_042",
  "vehicle_vin": "WVWZZZ...",
  "vehicle_id": "veh_001",
  "type": "service",
  "date": "2026-07-10",
  "date_precision": "exact",
  "mileage_km": 185000,
  "km_precision": "exact",
  "title": "Mali servis",
  "items": [
    {
      "kind": "part",
      "name": "Ulje 5W-30",
      "qty": 4.3,
      "unit": "l",
      "price": 4800,
      "currency": "RSD"
    }
  ],
  "photos": [
    {
      "url": "r2://...",
      "type": "before",
      "annotation": null,
      "captured_at": "2026-07-10T09:14:00Z"
    }
  ],
  "contact_id": "con_003",

  "source": "mechanic",

  "retroactive": false,
  "initial_import": false,

  "cost": {
    "amount": null,
    "currency": null,
    "category": null,
    "informal": false
  },

  "visibility": "owner_only",

  "invalid": false,
  "invalid_reason": null,
  "superseded_by": null,

  "app": "garage",
  "documents": ["doc_017"]
}
```

**Ključna polja objašnjena:**

| Polje | Značenje |
|---|---|
| `vehicle_vin` | Primarni identifikator (globalni). Kompatibilnost: aplikacija uvek popunjava oba (`vehicle_vin` i `vehicle_id`). Lenj-migracija za postojeće v1.18 zapise. |
| `date_precision`, `km_precision` | `exact` / `approximate` / `estimated` — za retroaktivne unose. Legitiman je nesiguran unos, ali mora biti pošteno označen. |
| `source` | `mechanic` / `owner` / `receipt` / `imported` / `initial` — seme Trust Layer-a. |
| `retroactive` | true = uneto nakon događaja. |
| `initial_import` | true = uneto pri prvom povezivanju vozila u sistem. |
| `cost` | Personal expense tracking za Driver (7 kategorija). Vidi ispod. |
| `visibility` | `owner_only` / `owner_and_authors` / `grant_scoped` / `public_at_sale`. |
| `invalid`, `superseded_by` | Blaži pristup trajnosti — prvih 48h brisanje moguće, posle samo markiranje. |

### Cost kategorije (za Driver personal expense)

Enum polje `cost.category`:
- `fuel` (gorivo)
- `tires` (gume)
- `body` (karoserija)
- `registration` (registracija)
- `insurance` (osiguranje)
- `accessories` (dekorativni dodaci)
- `other` (ostalo)
- `custom` — kada je izabran custom, obavezno dodatno polje `cost.category_label` (string) za korisničku kategoriju (npr. "poliranje", "test vožnja")

**Primarni model:** cost blok na Event-u. **Opciono:** poseban EXPENSE entitet za personal troškove koji nisu vezani za konkretan servisni događaj (`vehicle_vin` referenca bez `event_id`).

## OWNERSHIP (poseban entitet — istorija vlasnika kroz vreme)

```json
{
  "id": "own_015",
  "vehicle_vin": "WVWZZZ...",
  "contact_id": "con_003",
  "role": "primary_driver",
  "start_date": "2022-05-14",
  "start_mileage_km": 120500,
  "end_date": null,
  "end_reason": null,
  "archive_visibility": "read_only",
  "personal_data_removed": false
}
```

**Uloge (`role`):** `primary_driver`, `registered_owner`, `co_owner`, `trade_holder`, `lease_holder`, `company_car`.

**Trenutni vlasnik:** najnoviji Ownership sa `end_date: null`. Prošli vlasnici imaju popunjen `end_date` i `end_reason` (`sold` / `family_transfer` / `scrapped` / `stolen` / `total_loss`).

## CONTACT / DOCUMENT / REMINDER (skraćeno)

- **CONTACT:** ime, telefon, uloge `["client","supplier","service"]`, vezana vozila, beleške. Jedan imenik za sve aplikacije.
- **DOCUMENT:** tip (invoice, work_order, saobraćajna, polisa), broj (GT-0001), datum, vezano vozilo/događaj, fajl/slika.
- **REMINDER:** naslov, okidač po datumu I/ILI kilometraži ("sledeći servis: 01.03.2027 ili 195.000 km — šta pre"), vezano vozilo.

## Valute

- Podrazumevana valuta u Settings (RSD ili EUR)
- **Svaka stavka nosi svoju valutu** (deo u RSD, rad u EUR — realnost)
- PDF prikazuje ukupno po valutama odvojeno; opciono jedan zbir po ručno unetom kursu
- Arhitektura otvorena za dodavanje valuta (BAM, HRK→EUR, USD)

## Event Catalog princip

Svaki događaj u sistemu ima istu strukturu (`source`, `entity`, `required data`, `optional data`, `affected modules`, `visibility`, `trust source marker`). **Pravilo:** pre nego što se doda nova funkcija ili nova aplikacija, prvo se piše event u `EVENT_CATALOG.md` fajl (odvojen dokument).

**6 pitanja pre nove funkcije/aplikacije:**
1. Koji događaj je nastao?
2. Za koje vozilo je vezan?
3. Ko ga je kreirao?
4. Koja nova znanja dodaje digitalnoj istoriji vozila?
5. Koji moduli treba da reaguju na taj događaj?
6. Ko, uz dozvolu vlasnika, ima pravo da ga vidi ili koristi?

Ako se ne može odgovoriti na svih 6 pitanja, verovatno funkcija ne pripada AutoUniverse-u.

---

# DEO III — SPECIFIKACIJE PRVE DVE APLIKACIJE

## APLIKACIJA 1: GARAGE TOOLBOX

**Korisnik:** Marko i Goran — samostalni majstori, bez firme, telefon u ruci, često bez interneta (teren, šuma, polje).
**Zamenjuje:** papir, svesku, Viber haos.
**Ne radi:** fiskalizaciju, knjigovodstvo, plaćanja.

### Ekrani (bottom nav: HOME | VOZILA | NOVI POSAO | KONTAKTI | SETTINGS)

**HOME** — današnji poslovi, aktivni nalozi, podsetnici koji stižu, dugme "+ Novi posao".

**VOZILA** — pretraga (tablica/model/vlasnik) → **Karton vozila**:
- zaglavlje: slika, marka/model/godina, vlasnik (klik→poziv)
- **Tehnička kartica** (ulje, filteri, gume — vidljivo odmah, bez traženja)
- istorija događaja (hronološki, sa slikama)
- dugmad: Novi posao za ovo vozilo • Podsetnik • Pozovi vlasnika

**NOVI POSAO — WO Snap tok (7 koraka, svaki preskočiv):**
```
1. Vozilo      → postojeće ili novo (novo = min: marka, model)
2. Klijent     → iz imenika ili novi (ime + telefon dovoljno)
3. Opis rada   → tekst + 🎤 glasovni unos (fallback tastatura)
4. Slike       → pre / tokom / posle
5. Stavke      → deo/rad + cena + valuta (može prazno)
6. Potpis      → SAMO ako je uključen u Settings (default: OFF)
7. PDF         → pregled → Share (Viber/SMS/mail) / Sačuvaj / Kasnije
```
Svaki završen posao = EVENT u kartonu vozila. Automatski.

**KONTAKTI** — klijenti i dobavljači, klik = poziv/poruka, istorija poslova po klijentu.

**SETTINGS** — profil (ime, telefon, logo za PDF), valuta, jezik (EN/SR), potpis on/off, backup/export, licenca (unos koda).

### Nivoi funkcija

| 🟢 Basic (besplatno) | 🔑 Kod (Gumroad / tvoj kod) | ☁️ Platform (AU Core) |
|---|---|---|
| Vozila + tehnička kartica | Ponuda/Estimate | Sync i cloud backup |
| Radni nalog + PDF (watermark) | Podsetnici za mušterije | Deljenje kartona sa vlasnikom |
| Faktura PDF (watermark) | Kalkulatori (rad, marža) | QR identitet vozila |
| Slike | Evidencija delova + inventar | Online zakazivanje |
| Kontakti | Inspekcija/DVI izveštaj | Marketplace |
| Backup/export | Bez watermarka + statistika | |

### PDF standard (jedan engine, sva dokumenta)

```
LOGO + IME MAJSTORA           GT-0001 / INVOICE (ili WORK ORDER / ESTIMATE)
Datum • Klijent • Vozilo (marka, model, tablica, km)
──────────────────────────────
IZVRŠENI RADOVI / OPIS
DELOVI I RAD (tabela, cene po valutama)
UKUPNO:  X.XXX RSD  +  XX EUR
SLIKE [pre] [posle]
Potpisi (ako uključeno) • Footer + kontakt
```

## APLIKACIJA 2: DRIVER TOOLBOX

**Korisnik:** vlasnik vozila. Problem: "ne znam kad je bio servis, koje su gume, šta piše u saobraćajnoj."
**Suština:** sve o mom vozilu u džepu.
**Positioning:** Driver je digitalna servisna knjižica i lični dosije vozila.

### Ekrani (bottom nav: MOJE VOZILO | ISTORIJA | TROŠKOVI | DOKUMENTA | PODSETNICI)

**MOJE VOZILO** — kartica vozila (podaci iz saobraćajne uneti ručno jednom), tehnička kartica, gume, više vozila podržano, **vehicle switcher** (brz prelaz između vozila).

**ISTORIJA** — svi događaji: servis, popravka, gorivo, trošak, tehnički, gume. Brzi unos: "+ Servis" = datum, km, šta je rađeno, slika računa → gotovo za 30 sekundi.

**TROŠKOVI** — pregled troškova po vozilu i periodu (nedelja / mesec / kvartal / godina / sve). 7 kategorija (gorivo, gume, karoserija, registracija, osiguranje, dekorativni dodaci, ostalo) + custom kategorije. `informal` flag za gotovinske transakcije.

**DOKUMENTA** — slike saobraćajne, polise, računi, garancije.

**PODSETNICI** — registracija, tehnički, polisa, servis (datum i/ili km), zamena guma (sezonski).

### Trade / Reseller mode

Uključuje se preko toggle-a na Vehicle-u (`trade_mode: true`). Otključava:
- Purchase/sale polja (datum, cena, izvor, način plaćanja)
- Profit karticu (razlika prodaja − kupovina − troškovi)
- "Prodaj vozilo" wizard sa tri arhivska ishoda: **prodato** (buyer_contact_id opcion), **rashodovano** (scrapped/total_loss), **prenos u porodici** (family_transfer)

Preprodavci vozila kao kolega tester dobijaju sve funkcije bez zasebne aplikacije. Isti data model, samo dodatna polja i UI.

### Nivoi funkcija

| 🟢 Basic | 🔑 Kod | ☁️ Platform (AU Core) |
|---|---|---|
| 1 vozilo, kompletan karton | Više vozila (do 50 predlog) | Sync između uređaja |
| Istorija servisa | Cost tracking (7 kategorija + custom) | Poveži se sa servisom (Garage → Driver zapisi) |
| Dokumenta (slike) | Trade / Reseller mode | Verifikovana istorija za prodaju vozila |
| Podsetnici + gume | Kalkulatori, check liste | QR vozila |
| Backup/export | Izvoz istorije u PDF ("dosije vozila") | |

> **Most između aplikacija (mechanic-as-distribution-channel):** Marko završi posao u Garage → vlasnik u Driver-u dobije zapis `source: "mechanic" 🟢` preko AU Core `grant()`-a. Nekorisnici Driver-a dobijaju magic link → prompt za instalaciju.

---

# DEO IV — AUTOHUB (ARHITEKTURA INFRASTRUKTURNOG SLOJA)

*Rečenica-kompas: "AU Core nije mesto na koje se dolazi. AU Core je infrastruktura koja povezuje sve ostalo."*

## 1. Uloga

AU Core je infrastrukturni sloj ekosistema. Nema krajnjeg korisnika koji "koristi AU Core" — on postoji da bi Driver, Garage i buduće specijalizovane aplikacije mogle da razmenjuju podatke o vozilima uz saglasnost vlasnika. Ako bi se jednog dana AU Core prikazivao kao "još jedna aplikacija", to bi bila greška u pozicioniranju.

## 2. Ključni pojmovi

**VIN kao globalni identifikator vozila.** Isti VIN u Driver-u vlasnika i u Garage-u mehaničara označava isto vozilo. Aplikacije ne moraju da dele bazu podataka — dele identifikator. To je jednostavnije od zajedničke baze i sigurnije od nje.

**`grant()` kao jedini permission primitiv.** Formula:
```
grant(user_A, user_B, vehicle_id, role, [expires_at])
```
Vlasnik daje drugom korisniku (mehaničaru, budućem kupcu, članu porodice) pristup istoriji svog vozila. Role definiše obim pristupa. `expires_at` je opciono — postoje i trajni grantovi i vremenski ograničeni. Sve što nije eksplicitno grant-ovano nije vidljivo.

**Team accounts kao automatizacijski sloj.** Kada servis ima više radnika (mehaničar + pomoćnik, ili više mehaničara u istoj radionici), team account omogućava da vlasnik jednim `grant()`-om da pristup celom timu, umesto da grant-uje svakog radnika pojedinačno. Team account nije poseban entitet — to je grupa korisnika koja se u kontekstu `grant()`-a tretira kao jedan primalac.

**Mechanic-as-distribution-channel.** Kada profesionalac podeli servisni zapis preko magic link-a, primalac dobija prompt za instalaciju Driver-a. Rešava cold-start problem organično — korisnici Driver-a stižu preko postojećih relacija (mušterija ↔ mehaničar), ne preko marketinga.

## 3. Šta se razmenjuje kroz AU Core

| Razmenjuje se | Ne razmenjuje se |
|---|---|
| Delovi (brand + model) | **Cena** (privatnost profesionalac ↔ vlasnik) |
| Obavljeni radovi | Interne beleške profesionalca |
| Kilometraža | Podaci koji nisu vezani za konkretno vozilo |
| Preporuka za naredni servis | |
| Fotografije | |
| Trust source marker | |

Cena se namerno isključuje. Ako profesionalac želi da vlasnik ima ceo račun sa cenom, deli se kao **zaseban PDF po izboru profesionalca** — ne kroz AU Core razmenu.

**Napomena o granicama razmene:** Lista se može širiti kroz feedback. Nova polja (OBD kodovi iz Electric, DOT/dubina šare iz Tire, procena štete iz Body) ulaze u razmenu kada se pojavi specijalizovana aplikacija koja ih generiše. Cena ostaje van razmene po pravilu — ne po tehničkom ograničenju.

## 4. Storage kao infrastruktura i kao proizvod

**AU Core je odgovoran za trajno čuvanje istorije vozila — uključujući slike.** Slike se čuvaju u Cloudflare R2 (S3-kompatibilan, nula egress naknada), AU Core čuva reference i pravila pristupa.

**Storage je istovremeno tehnika i model naplate.** Free plan ima granice (broj vozila, broj slika po vozilu), preko kojih se prelazi u plaćene planove.

**Zašto storage mora biti trajan, ne samo tranzitni:**
- Preprodavac vozila drži 10+ slika po vozilu, više vozila mesečno
- Automehaničar-tester sa istorijom od nekoliko stotina vozila kroz godine
- Ako želimo da te slike jednog dana koristimo (verifikacija istorije pri prodaji, AI analize, statistika po modelu vozila), moramo ih imati u sistemu

**Model naplate okvirno** (konkretni brojevi ostaju otvoreno pitanje):

| Nivo | Vozila | Slike po vozilu | Ukupno storage |
|---|---|---|---|
| Free | do 50 (predlog) | ograničeno | mali |
| Plaćeni | neograničeno | prošireno | prema potrebi |

Egzaktne granice free plana i cene plaćenih planova dolaze iz feedback-a.

## 5. Discovery mehanizam

Aplikacije (Driver, Garage) ne znaju hardkodirano URL AU Core-a. Čitaju `platform-url.json` na GitHub Pages, koji sadrži trenutni URL. Prednosti:

- Promena URL-a (Cloudflare Tunnel → produkcioni server) ne zahteva update aplikacija
- Isti mehanizam može servisirati staging i produkciju
- Ako AU Core padne, aplikacije se ponašaju offline-first

## 6. Outbound komunikacija AU Core → aplikacije

**AU Core mora biti sposoban da pošalje obaveštenja aplikacijama.** Bez toga nema smisla razmena podataka — ako mehaničar zatvori radni nalog i pošalje zapis, vlasnik u Driver-u treba da vidi da ima nešto novo.

**Kanali obaveštenja:**
- **In-app notifikacije** — kada aplikacija sinhronizuje sa AU Core-om, dobija spisak novih događaja od poslednje sinhronizacije. Radi offline-first.
- **Push notifikacije** — predviđene kao punopravni kanal u produkciji. Capacitor omotava PWA i omogućava pravi FCM push. Push je istovremeno korisnički kanal i distribucijski kanal.
- **Email** — otvoreno pitanje, možda opciono za kritične događaje

**Sadržaj obaveštenja — otvoreno pitanje:** klasična kratka poruka, ili "news feed" style ka sekciji u aplikaciji, ili hibrid — odluka se donosi kroz feedback kasnije. Arhitektura mora podržavati oba.

**Šta AU Core NE radi kao komunikacioni kanal:** ne šalje Viber, ne šalje SMS. Ti kanali ostaju kanali korisnika.

## 7. Paneli i UI

AU Core ima ograničen UI sloj, ne za krajnjeg korisnika u svakodnevnom smislu, već za power korisnike i administraciju:

- **Admin panel (obavezan)** — za operatera sistema. Pregled korisnika, storage utilizacije, naplate, tehnički zdravstveni indikatori.
- **Korisnički power panel** — na primer:
  - Preprodavac koji hoće statistiku ("koliko sam vozila prodao ovog kvartala, prosečan profit, prosečno vreme držanja vozila")
  - Mehaničar-tester koji hoće bulk-download svojih slika sa servera na računar (arhiva, štampa, backup)
  - Vlasnik sa više vozila koji hoće izvoz kompletne istorije kao PDF ili ZIP
- **Web pregled istorije za magic link** — kada vlasnik pošalje magic link (npr. potencijalnom kupcu), otvara se web stranica sa istorijom, bez potrebe da primalac instalira Driver. Mobilna aplikacija ostaje primarni proizvod; web pregled ne slabi mobilnu aplikaciju jer se dva režima ne takmiče — web je za "hoću brzo da vidim", aplikacija je za "hoću da imam".

**Filozofija panela:** UI sloj se dodaje kada feedback pokaže konkretnu potrebu, ne pre.

## 8. Tehnički stack

| Sloj | Rešenje | Zašto |
|---|---|---|
| Runtime | Node.js | bez frameworka (Express nije korišćen), bez ORM-a |
| Baza | better-sqlite3 | jedan fajl, transakcije, dovoljno brzo za predvidivi broj korisnika |
| Skladištenje slika | Cloudflare R2 | S3-kompatibilan, nula egress naknada |
| Development izlaganje | Cloudflare Tunnel | privremeni HTTPS URL prema lokalnom AU Core-u |

## 9. Trenutna faza razvoja

AU Core se pokreće lokalno i izlaže kroz Cloudflare Tunnel. Prvi proof-of-concept cilj je end-to-end flow: mehaničar-tester radi `grant()` vlasniku vozila, koji vidi zapis sa fotografijama u Driver-u — na dva stvarna telefona, kroz tunnel. Kada ovaj flow prođe, otvara se pitanje produkcionog hosting-a i domena (vidi DEO IX).

## 10. Granice — čvrste i meke

**Čvrste granice** (odluke koje neće biti povučene):

- **Nije marketplace** — AU Core ne prikazuje oglase i ne obrađuje transakcije prodaje vozila ili delova.
- **Nije reklamna platforma** — AdMob se ne koristi u AutoUniverse-u. Narušio bi poziciju "podaci nikad ne napuštaju sistem bez saglasnosti vlasnika". AdMob ostaje mogućnost samo za mini-aplikacije van AutoUniverse ekosistema (Multiuniverse portfolio).
- **Ne čuva cene servisa** — cena je informacija između profesionalca i vlasnika, ne stavka istorije vozila.

**Meke granice** (odluke koje mogu evoluirati kroz feedback):

- Obim korisničkog panela
- Set događaja koji se razmenjuju
- Model naplate storage-a
- Notifikacioni kanali (email, možda kasnije nešto drugo)

**Sve granice u ovoj sekciji podležu reviziji.** Klasifikacija čvrste/meke je snapshot trenutnog razmišljanja, ne pravna kategorija. Svaka granica se preispituje kad ekosistem naraste ili kad feedback pokaže drugi smer.

---

# DEO V — VEHICLE DIGITAL PASSPORT (OKVIR PRIKUPLJANJA)

*Rečenica-kompas: "Vozilo je centralni entitet. Aplikacije su različiti pogledi na iste podatke."*

## 1. Šta Passport jeste

Vehicle Digital Passport je **sveukupna digitalna istorija jednog vozila** koja živi vezano za VIN, a ne za korisnika. Vlasnici, mehaničari i drugi profesionalci dolaze i odlaze — Passport ostaje. Kada se vozilo proda, Passport (uz saglasnost starog vlasnika) prelazi novom vlasniku kao osnov poverenja.

Passport nije jedna baza podataka i nije jedna aplikacija. To je **skup događaja, dokumenata i pravila pristupa** koji zajedno opisuju život vozila.

## 2. Dve tačke gledišta na Passport

| Passport kao okvir prikupljanja (sada) | Passport kao proizvod (kasnije) |
|---|---|
| Definiše koje podatke Garage i Driver **već sada** pumpaju u istoriju | Definiše kako se ta istorija jednog dana prezentuje kao "digitalni pasoš vozila" |
| Diktira šeme events-a, polja u Vehicle modelu | Diktira UI ekrane, PDF izvoze, javne dele-link stranice |
| Radi se danas — kroz Garage v1.18, Driver, AU Core | Radi se kad ima dovoljno podataka i kad feedback zatraži prezentacioni sloj |
| Bez ovoga, sutra nedostaju podaci | Bez ovoga, korisnik ne vidi vrednost sistema kao celine |

**Ovaj DEO se fokusira na levu kolonu.** Desna kolona je posao Faze 4+ kada budu postojali korisnici koji su akumulirali dovoljno istorije.

## 3. Kategorije podataka koje Passport sadrži

### 3.1 Vlasništvo (Ownership timeline)

- **Izvor:** Driver, AU Core (prilikom prenosa preko magic link-a)
- **Obavezan minimum:** VIN, datum početka vlasništva, tip veze
- **Opciono:** ime i kontakt vlasnika, datum kraja vlasništva, razlog kraja
- **Vidljivost:** samo trenutni vlasnik i oni kojima je grant-ovao
- **Napomena:** RS realnost — vozač ne mora biti isti kao registrovani vlasnik u papirima

### 3.2 Kilometraža

- **Izvor:** Garage (pri svakom radnom nalogu), Driver (svaki manuelni unos ili sipanje goriva), Technical
- **Obavezan minimum:** VIN, datum očitavanja, km vrednost, izvor
- **Opciono:** `km_precision` za retroaktivne unose
- **Vidljivost:** deo istorije vozila; potencijalno javno pri prodaji
- **Zašto:** kilometraža je najlažiraniji podatak na tržištu polovnih vozila. Passport sa više nezavisnih očitavanja postaje verifikator.

### 3.3 Servisi i intervencije

- **Izvor:** Garage, Driver (vlasnik ručno beleži ili slika račun), buduće specijalizovane aplikacije
- **Obavezan minimum:** VIN, datum, km, tip intervencije, izvor
- **Opciono:** delovi, radovi, mehaničar, radionica, fotografije, preporuka za naredni servis
- **Vidljivost:** trenutni vlasnik, autor zapisa, i oni kojima je grant-ovano
- **Trust source marker:** obavezan `source` — `mechanic` / `owner` / `receipt` / `imported` / `initial`

### 3.4 Delovi i garancije

- **Izvor:** Garage, buduće specijalizovane aplikacije, ponekad Driver
- **Obavezan minimum:** VIN, datum ugradnje, opis dela
- **Opciono:** OEM broj, dobavljač, garantni rok, datum isteka garancije
- **Vidljivost:** vlasnik, autor zapisa, potencijalno budući vlasnik pri prodaji

### 3.5 Fotografije

- **Izvor:** sve aplikacije koje snimaju vizuelno stanje vozila
- **Obavezan minimum:** VIN, datum, tip (`before` / `during` / `after` / `documentation` / `damage` / `part`), referenca na događaj
- **Opciono:** anotacije, lokacija na vozilu
- **Vidljivost:** kao i događaj za koji je vezana
- **Skladištenje:** Cloudflare R2

### 3.6 Dokumenti vozila

- **Izvor:** Driver (saobraćajna, polisa, garantna knjižica), Insurance, Technical
- **Obavezan minimum:** VIN, tip dokumenta, datum
- **Opciono:** fajl/slika, broj dokumenta, rok važenja
- **Vidljivost:** samo vlasnik i oni kojima je grant-ovao
- **Napomena:** najosetljivija kategorija — sadrži lične podatke

### 3.7 Nezgode i popravke posle nezgode

- **Izvor:** Driver (prijava), Body/Paint (kad postoje), Insurance
- **Obavezan minimum:** VIN, datum, tip štete, izvor prijave
- **Opciono:** lokacija, opis, policijski zapisnik, fotografije, procena, izveštaj limara
- **Vidljivost:** vlasnik, autori popravke; **potencijalno javno pri prodaji uz eksplicitnu saglasnost**
- **Napomena:** najviše utiče na tržišnu vrednost. Passport koji dokazuje "nezgoda evidentirana, popravka dokumentovana" je jači od "prvi vlasnik, nikad kucnut" bez dokaza.

### 3.8 Registracije i tehnički pregledi

- **Izvor:** Driver, Technical (kad postoji), buduće partnerstvo sa evidencijom pregleda
- **Obavezan minimum:** VIN, datum, rezultat (`passed` / `failed` / `conditional`), datum sledećeg
- **Opciono:** stanica, primedbe, izmerena kilometraža
- **Vidljivost:** vlasnik; agregatni statusi potencijalno javno pri prodaji

### 3.9 Prodaje i prenosi vlasništva

- **Izvor:** Driver (`trade_mode` "Prodaj vozilo" workflow), AU Core (magic link → novi grant)
- **Obavezan minimum:** VIN, datum, tip prenosa (`sold` / `family_transfer` / `scrapped` / `stolen` / `total_loss`)
- **Opciono:** novi vlasnik (ako pristao), prodajna cena (privatno, nikad javno), razlog
- **Vidljivost:** stari vlasnik zauvek (arhiva), novi vlasnik postaje vlasnik Passport-a
- **Ključno pravilo:** cena prodaje je namerno privatna

### 3.10 Osiguranje

- **Izvor:** Driver (unos polise, prijava štete), Insurance aplikacija (kad postoji integracija)
- **Obavezan minimum:** VIN, tip polise (`kasko` / `obavezno` / `dopunsko`), datum početka, datum isteka
- **Opciono:** osiguravajuća kuća, broj polise, slika polise, prijavljene štete, isplate
- **Vidljivost:** samo vlasnik i oni kojima je grant-ovao. Prijave šteta mogu biti javne pri prodaji uz eksplicitnu saglasnost.
- **Napomena:** počinje kao dokument (slika polise + rok za podsetnik), raste u punopravni modul kada Insurance aplikacija stigne.

### 3.11 Modifikacije

- **Izvor:** Driver (vlasnik prijavi), Garage (mehaničar zabeleži), specijalizovane aplikacije (Electric/Body/Paint)
- **Obavezan minimum:** VIN, datum, tip modifikacije (`chip_tuning` / `body_kit` / `accessories` / `retrofit` / `restoration` / `other`), opis
- **Opciono:** brand+model komponente, izvođač, fotografije pre/posle, cena, uticaj na garanciju
- **Vidljivost:** vlasnik, autor zapisa; **javno pri prodaji uz saglasnost**
- **Napomena:** relevantne pri prodaji — kupac mora znati šta je originalno a šta ne. Chip tuning može ukinuti garanciju.

## 4. Pravila trajnosti i prenosa

**Trajnost sa periodom ispravke:**
- **Prvih 48 sati** posle unosa: događaj se može obrisati u potpunosti (greška u unosu, dupli zapis)
- **Posle 48h:** događaj se ne briše, već označava kao `invalid` (uz obavezan razlog) ili `superseded_by` (referenca na tačniji zapis)
- **Razlog:** prva 48h štite od gluposti, ostatak štiti od zlonamernog čišćenja istorije pre prodaje

**Brisanje ličnih podataka vs. brisanje događaja:**
Prošli vlasnik može zatražiti brisanje svojih ličnih identifikatora iz zapisa (ime, telefon, adresa), ali sam događaj o vozilu ostaje anonimizovan.

**Prošli vlasnici i pravila pristupa:**
Pri prodaji vozila:
- Stari vlasnik **gubi aktivnu kontrolu** — više ne može dodavati, menjati ni brisati
- Stari vlasnik **zadržava read-only arhivsku kopiju** svog perioda vlasništva
- Stari vlasnik **može zatražiti brisanje sopstvene arhivske kopije** — više ne vidi istoriju, njegovi lični podaci se anonimizuju
- **Istorija vozila ostaje u sistemu** — vezana za VIN, ne za starog vlasnika. Novi vlasnik nasleđuje puni Passport, AutoUniverse zadržava operativna prava za buduće prenose i verifikaciju.

**Ključna razlika:** stari vlasnik može obrisati *svoju vezu sa vozilom*. Ne može obrisati *istoriju samog vozila* — jer to nije više njegovo, to je vozilo.

**Retroaktivni unos:** vlasnik može retroaktivno da unese istoriju iz perioda pre AutoUniverse-a. Takvi unosi imaju `retroactive: true`, `source: initial`, i polja `date_precision` / `km_precision` postavljena na `approximate` ili `estimated`. To je pošteno beleženje nesigurnog znanja.

**Automatski prenos vlasništva (planirano, ne implementirano):** pri prodaji kroz AU Core, svi mehaničari koji imaju taj VIN dobijaju tihu notifikaciju o promeni kontakta vlasnika. Ne prekida se `grant()` automatski — novi vlasnik odlučuje.

## 5. Kako Passport oblikuje razvoj *danas*

Passport kao okvir prikupljanja diktira konkretne odluke u kodu Garage-a, Driver-a i AU Core-a već sada:

1. **Svaki Event mora imati `source` polje**
2. **VIN je globalni identifikator, ne interni ID vozila**
3. **Kilometraža se beleži pri svakoj interakciji s vozilom** — više očitavanja = jača verifikacija
4. **Fotografije nose metapodatke** (`type: before/after/damage/...`)
5. **`retroactive`, `date_precision`, `km_precision` polja moraju postojati u Event modelu od početka**
6. **Vlasništvo je poseban entitet** (Ownership tabela), ne samo `owner_contact_id` na Vehicle-u
7. **`registered_owner` različit od `primary_driver`** — RS realnost

## 6. Passport se kodira sada, prezentuje kroz feedback

Passport kao okvir prikupljanja se aktivno gradi u kodu Garage-a, Driver-a i AU Core-a već sada — bez čekanja aktivacionih uslova. Razlog: **Passport je infrastrukturna odluka**, ne funkcija. Bez ranog kodiranja Passport šema, tri aplikacije bi divergirale u različitim strukturama podataka, i sutra ne bi imale zajednički jezik.

**Šta se kodira sada:**
- Šeme događaja koje pišu u Passport (Event model dopune)
- Vehicle model sa svim potrebnim poljima
- AU Core endpoints za razmenu Passport podataka
- Trust source marker

**Šta se ne prezentuje korisniku eksplicitno kao "Passport" sada:**
- Passport ekran u Driver-u ("Passport mog vozila") — dolazi kada Driver testeri traže vizuelni pregled istorije
- Public deljivi Passport (magic link → web stranica) — dolazi kada postoji realan scenario prodaje
- PDF izvoz Passport-a — dolazi kad ima šta da se izveze

**Filozofija:** kodiraj kompletnu strukturu, prezentuj postupno kroz signale.

---

# DEO VI — REDOSLED RAZVOJA

*Rečenica-kompas: "Podatak nastaje jednom. Koristi se mnogo puta." — svaki novi modul mora povećavati vrednost postojećih.*

## 1. Filozofija faza

Faze u ovom dokumentu **ne znače "kada se počinje sa kodiranjem"**. Kodiranje po utvrđenom redosledu ide kontinuirano, sa poznatim informacijama i istraživanjem. Faze označavaju **kada nešto postane javno**.

- **Kodira se za testiranje** — bez čekanja feedback-a
- **Objavljuje se javno** — samo kada postoji signal iz stvarnog testiranja da funkcija ima smisla

Testeri imaju pristup verzijama koje javno još ne postoje. To je legitiman deo razvoja, ne "isporuka".

## 2. Trenutno stanje (snapshot 20.07.2026)

| Aplikacija | Status | Šta ima | Šta nedostaje |
|---|---|---|---|
| **Garage Toolbox** | v1.18.0, u testiranju | 53+ automatskih testova, PDF, WO Snap tok, offline-first, tehnička kartica, jsPDF sa DejaVu srpskim fontovima | Play Store paketovanje, Capacitor shell, integracija sa AU Core-om |
| **Driver Toolbox** | Rano testiranje | Karton vozila, istorija, dokumenti, podsetnici, gume | Cost tracking modul, trade_mode, sync sa AU Core-om |
| **AU Core** | U razvoju, lokalno | Node.js + better-sqlite3, izložen kroz Cloudflare Tunnel | `grant()` primitiv, discovery, produkcioni hosting, admin panel |
| **Honey Toolbox** | v0.9 (paralelni projekat) | Excel import/export, Capacitor scaffold — nasleđuje se za AutoUniverse | Nije direktno deo AutoUniverse-a, ali dokazuje Capacitor pipeline |

## 3. Faza 1 — Osnovni pipeline (u toku)

**Cilj:** Garage i Driver stabilizovani za srpsko tržište, AU Core prošao proof-of-concept.

**Kodira se sada:**
- Garage v1.18 → v2.0 (integracija VIN kao globalnog ID-a, dopune EVENT modela, priprema za AU Core sync)
- Driver → cost tracking modul, trade_mode, priprema za AU Core sync
- AU Core → `grant()`, discovery preko `platform-url.json`, admin panel skica
- Capacitor migracija Garage-a za Android APK (koristi Honey Toolbox iskustvo)
- Domen infrastruktura — `autouniverse.rs`, Coming Soon stranica

**Kriterijumi za "javni izlazak" (kraj Faze 1):**
1. **Proof-of-concept flow prošao:** mehaničar radi `grant()` vlasniku, koji vidi zapis sa fotografijama u Driver-u na dva stvarna telefona kroz tunnel
2. **Google Play Gate G1 — otvoreno pitanje, ne blokira Fazu 1.** Ako se ne uspe obezbediti 12 opt-in testera + 14 dana testiranja, plan B je **direktna distribucija APK-a preko `autouniverse.rs`** — korisnik skida instalacioni fajl sa sajta, uz uputstvo za "instalacija iz nepoznatih izvora"
3. **Prvi manual (PDF uputstvo) po aplikaciji spreman** — obavezno pravilo
4. **Feedback iz najmanje 4 testera** (mehaničari + Driver testeri) da postojeće funkcije rade

## 4. Faza 2 — Prvi javni pilot

**Cilj:** Garage i Driver dostupni na Play Store (ili preko sajta), mali broj realnih korisnika van uskog testerskog kruga.

**Ciljna publika:** krug prijatelja i njihovih prijatelja. Marko i Goran poznaju druge mehaničare kroz zanatske krugove; Nikola poznaje druge vlasnike vozila; kolega preprodavac poznaje druge preprodavce. Network effect kroz postojeće veze, ne hladno osvajanje.

**Ne računa se kao "krug prijatelja":** korisnici koji su sami našli aplikaciju preko sajta, Google pretrage, ili Play Store-a — oni pripadaju već Fazi 3+.

**Šta se dešava:**
- Garage i Driver objavljeni na Play Store ili direktnom APK download-u
- iOS ostaje PWA (Capacitor iOS build je odvojen posao, ne blokira Fazu 2)
- Landing sajt na `autouniverse.rs` postaje pun (ne više "coming soon")
- Prvi transactional ESP ako AU Core počne slati mailove
- Rečenice-kompas postaju sadržaj landing sajta

**Kriterijumi za završetak Faze 2:**
1. Minimum 5-10 realnih korisnika van uskog testerskog kruga (uključujući prijatelje prijatelja)
2. AU Core izašao iz Cloudflare Tunnel faze, produkcioni VPS
3. Backup i disaster recovery za AU Core SQLite bazu automatski
4. Retention: bar 3 korisnika koji su aktivni 30+ dana

## 5. Faza 3 — Feedback petlja i konsolidacija

**Cilj:** Ne dodavati nove aplikacije. Uraditi ono što feedback traži.

**Šta se dešava:**
- Sve što je Faza 1 i 2 pustila u produkciju se koriguje
- Nove funkcije unutar Garage/Driver/AU Core prema signalima
- Vehicle Digital Passport dobija svoj prvi eksplicitni UI (verovatno u Driver-u — "Passport mog vozila" ekran)
- Prvi magic link → web pregled istorije
- **Free plan ostaje default.** Prvi plaćeni pretplatnik NIJE kriterijum. Kriterijum je izdržljivost, ne prihod.

**Monetizacija u Fazi 3:** Free plan ostaje default sve dok troškovi održavanja servera ne pređu prag koji zahteva delimičnu monetizaciju. Kada se aktivira, prvi model je AU Core subscription za storage preko free tier-a.

**Kriterijumi za završetak Faze 3:**
1. Minimum 3 Driver korisnika sa akumuliranom istorijom od 6+ meseci
2. Bar jedan zabeležen end-to-end scenario prodaje vozila kroz sistem (Driver → magic link → novi vlasnik)

## 6. Faza 4 — Specijalizovane aplikacije (početak)

**Cilj:** Prve 1-3 specijalizovane aplikacije prema prioritetu.

**Redosled prioriteta (revidiran):**

**P1 — Tire prva.** Ne zahteva B2B partnerstvo (svaki vulkanizer je nezavisan biznis, isti model kao Marko za Garage). Ima najbliži feedback signal: Nikola, Marko i Goran svi imaju gume u istoriji vozila, i svi znaju vulkanizere u svojim mrežama. Distribucijski kanal je već tu.

**P1 sredina / P2 rani — Insurance, Technical.** Zahtevaju B2B partnerstva pa idu paralelno sa razvojem odnosa sa osiguravajućim kućama i tehničkim stanicama.

**P2 — Body, Electric, Glass.** Popravke posle nezgoda, dijagnostika — kritični podaci za integritet Passport-a.

**P3 — Dealer, Fleet, Rent, Salvage.** Zahtevaju pun ekosistem oko sebe.

**P4 — Paint, Wash, Tow.** Specijalizovana niša, manja publika.

**Kriterijumi za završetak Faze 4:**
1. Bar jedna specijalizovana aplikacija u produkciji
2. AU Core grant scope-ovi funkcionišu za više aplikacija
3. `EVENT_CATALOG.md` dokument stabilizovan sa ~20-30 event tipova

## 7. Faza 5+ — Marketplace, AI, ekosistemski efekat

**"Marketplace" nije jedan proizvod, već tri različita proizvoda sa različitim timing-om:**

| Proizvod | Model | Aktivacija |
|---|---|---|
| **AutoOglasi (AutoPijaca)** | Peer-to-peer oglasi vozila. Mi hostujemo besplatno, bez komisije. | **Rano, čim tehnika dozvoli.** Ne zavisi od finansiranja jer nema inventara. Aktivacioni uslov: 3+ Driver korisnika sa akumuliranom istorijom (za verifikovanu istoriju kao diferencijator). |
| **AutoDelovi** | Peer-to-peer marketplace polovnih delova. Kroz Salvage aplikaciju ili direktan unos preko Driver/Garage-a. | **Rano.** Isti princip kao AutoOglasi. Aktivacioni uslov: prvi zabeležen `PART_HARVESTED` event kroz Salvage ILI prvi neiskorišćen deo kroz Garage. |
| **Naša prodavnica** (Auto Kits, digitalni priručnici, oprema, alati) | Direktna prodaja od AutoUniverse-a — mi držimo inventar. | **Kasnije, zavisi od finansiranja.** Zahteva kapital za inventar (osim digitalnih priručnika). Aktivacioni uslov: dostupno finansiranje ili prihod sa AU Core subscription-a. |

**Zašto ova razlika:** *"AutoUniverse nije marketplace"* pravilo iz DEO IV nije narušeno — AutoOglasi i AutoDelovi su peer-to-peer, AutoUniverse tehnički samo hostuje. Naša prodavnica je odvojen biznis nad ekosistemom.

**AI sloj:** dolazi kada bude dovoljno podataka za treniranje. Predictive maintenance, Cost Analysis, Vehicle Health Score — sve zavisi od akumuliranih Passport-ova.

## 8. Monetizacija — okvir kroz faze

| Faza | Model | Naplata |
|---|---|---|
| Faza 1 | Testeri besplatno | Nula prihoda |
| Faza 2 | Free plan sa ograničenjima | Gumroad — jednokratna licenca za profesionalce (Garage) |
| Faza 3 | Free + Premium kada troškovi rastu | AU Core subscription za storage preko free tier-a |
| Faza 4 | Uvod B2B modela | Specijalizovane aplikacije sa svojim licencama |
| Faza 5+ | Ekosistem | AU Core subscription, API po volumenu, naša prodavnica |

**Šta se ne monetizuje:**
- AdMob (isključeno u DEO IV)
- Prodaja podataka trećim stranama
- Komisija na prodaju vozila kroz AutoOglasi
- Komisija na prodaju delova kroz AutoDelovi

## 9. Šta nikad nije "završeno"

Prema principu "not closing doors":

- Rečenice-kompas se mogu proširivati
- Spisak specijalizovanih aplikacija se proširuje
- Vehicle Digital Passport kategorije rastu sa novim aplikacijama
- Otvorena pitanja se rešavaju, ali se generišu i nova
- Ovaj dokument je "living document" — v2.0 nije poslednja verzija

---

# DEO VII — SPECIJALIZOVANE APLIKACIJE FAZE 4+

*Rečenica-kompas: "Podatak nastaje jednom. Koristi se mnogo puta."*

## 1. Zašto zasebne aplikacije, ne config varijante

U v1.0 dokumenta bile su klasifikovane kao "config varijante Garage-a". U v2.0 ta odluka se povlači. Razlog:

**Data shape se stvarno razlikuje.** Vulkanizer piše DOT/dubinu šare/poziciju točka/sezonsko skladištenje. Limar piše fotografije oštećenja pre/posle, procenu težine štete. Autoelektričar piše OBD kodove, zamenjene senzore, softverske update-ove. Ovo nisu iste tabele sa drugačijim labelima — ovo su različite event šeme.

**Grant scope se razlikuje.** Vlasnik koji daje pristup vulkanizeru ne mora davati puni servisni grant. Vlasnik koji daje pristup limaru za jednu popravku ne treba da vidi celokupnu servisnu istoriju. `grant()` po ulozi znači da je svaka specijalizovana aplikacija zaseban grant scope.

**Distribucija se razlikuje.** Vulkanizer distribuira Tire mušterijama, limar distribuira Body svojim mušterijama. Ako je sve "Garage sa različitim modom", distribucija se meša.

## 2. Šta *jeste* zajedničko

Specijalizovane aplikacije **dele jezgro**, ne kod jedne aplikacije:

| Zajednički sloj | Šta radi |
|---|---|
| Auth | Login, session, korisnički nalog (kroz AU Core) |
| Sync | Razmena podataka sa AU Core-om, offline-first |
| PDF Engine | Isti generator, različiti template-ovi po aplikaciji |
| Storage | IndexedDB šema + Cloudflare R2 slike |
| i18n | Isti jezički fajlovi |
| License Gate | Gumroad / Play Billing / AU Core subscription |
| Camera & Photos | Kompresija, metapodaci, upload u R2 |
| Notifications | In-app + push (kroz Capacitor) |
| Backup/Export | Format kompatibilan između aplikacija |

Oko 60-70% koda. Specifično za svaku aplikaciju: event šeme, UI ekrani, PDF template-ovi, terminologija.

## 3. Spisak specijalizovanih aplikacija

**Nije konačna lista.** Podložna dopunama kroz feedback.

| Aplikacija | Domen | Primarni korisnik | Ključni eventi u Passport | Grant scope |
|---|---|---|---|---|
| **Tire** | vulkanizeraj | vulkanizer | `TIRE_INSTALLED`, `TIRE_STORED`, `TIRE_ROTATED`, `TREAD_MEASURED` | `tire_events` |
| **Body** | limarski radovi | limar | `BODY_DAMAGE_REPORTED`, `BODY_REPAIR_STARTED`, `BODY_REPAIR_COMPLETED` | `body_events` |
| **Paint** | farbarski radovi | lakirer | `PAINT_JOB_STARTED`, `PAINT_JOB_COMPLETED`, `PAINT_MATCH_REGISTERED` | `paint_events` |
| **Electric** | autoelektričar | autoelektričar | `OBD_SCAN`, `SENSOR_REPLACED`, `SOFTWARE_UPDATE`, `DTC_CLEARED` | `electric_events` |
| **Glass** | autostakla | staklorezac | `GLASS_REPLACED`, `GLASS_REPAIRED` | `glass_events` |
| **Wash** | detailing | detailing | `DETAIL_JOB`, `CERAMIC_COATING_APPLIED` | `wash_events` |
| **Tow** | šlep služba | šleper | `TOW_REQUESTED`, `TOW_COMPLETED`, `TOW_INCIDENT` | `tow_events` |
| **Dealer** | auto salon | prodavac | `VEHICLE_LISTED`, `VEHICLE_INSPECTED_FOR_SALE`, `VEHICLE_SOLD_BY_DEALER` | `dealer_events` |
| **Fleet** | flote (taxi, dostava, građevina) | flota menadžer | `FLEET_VEHICLE_ADDED`, `FLEET_DRIVER_ASSIGNED`, `FLEET_INCIDENT` | `fleet_events` |
| **Rent** | rent-a-car | rent operater | `RENT_STARTED`, `RENT_ENDED`, `RENT_DAMAGE_ASSESSED` | `rent_events` |
| **Insurance** | osiguranje | zastupnik osiguranja | `POLICY_ISSUED`, `POLICY_RENEWED`, `CLAIM_OPENED`, `CLAIM_CLOSED` | `insurance_events` |
| **Technical** | tehnički pregled | linija tehničkog pregleda | `INSPECTION_PASSED`, `INSPECTION_FAILED`, `INSPECTION_CONDITIONAL` | `technical_events` |
| **Salvage** | otpad / rashodovana vozila | reciklažni servisi, prodavci polovnih delova | `VEHICLE_SCRAPPED`, `PART_HARVESTED`, `PART_LISTED_FROM_SALVAGE` | `salvage_events` |

## 4. Aktivacioni uslov za razvoj svake pojedinačne aplikacije

**Kodiranje kreće po utvrđenom redosledu prioriteta, sa poznatim informacijama.** Ne čeka se pojava konkretnog profesionalca-testera pre kodiranja. Razlog: kada test korisnik naiđe, aplikacija mora već postojati u minimalno upotrebljivom obliku.

**Ono što se čeka pre javnog objavljivanja:**
1. Prolazna verzija koja pokriva P0 tokove specifične za tu ulogu
2. Definisan set eventova u `EVENT_CATALOG.md`
3. Definisan grant scope na AU Core-u
4. Bar jedan feedback signal — profesionalac iz relevantnog domena koji je testirao verziju

**Ono što se ne čeka pre kodiranja:**
- Konkretan tester (kodira se sa poznatim domenom znanja i istraživanjem)
- Formalno tržišno istraživanje (ekosistemski princip: novi modul povećava vrednost postojećih)

**Filozofija:** kodiraj po redosledu sa onim što znaš, publikuj javno tek sa feedback signalom.

## 5. Distribucijski model

Svaka specijalizovana aplikacija je istovremeno alat za profesionalca **i** kanal akvizicije Driver korisnika. Isti princip kao Garage → Driver:

- Vulkanizer (Tire) šalje mušteriji zapis o sezonskoj zameni → mušterija instalira Driver → Driver dobija Tire zapis kao deo Passport-a
- Limar (Body) šalje zapis o završenoj popravci → vlasnik vidi u Driver-u "Popravka posle nezgode"
- Autoelektričar (Electric) šalje OBD izveštaj → vlasnik u Driver-u vidi trend dijagnostike

**Svaka specijalizovana aplikacija sama sebe distribuira.** Nema centralnog marketinga — svaki profesionalac je marketing agent za AutoUniverse ekosistem kroz razmenu sa svojim mušterijama.

## 6. Šta se *ne* razdvaja

Za razliku od Garage/Driver/AU Core trojke, specijalizovane aplikacije **nemaju** svoj AU Core. Sve koriste isti AU Core, uz specifične grant scope-ove. Razlog: infrastruktura je jedna, aplikacije su mnogo. Ako bi svaka imala svoj backend, izgubili bismo suštinu "podatak nastaje jednom, koristi se mnogo puta".

Slično, sve specijalizovane aplikacije koriste iste jezičke fajlove, isti PDF engine, isti storage sistem. Diverzitet je u UI-u i event šemama, ne u infrastrukturi.

---

# DEO VIII — TEHNIČKA ARHITEKTURA

Preuzeto iz dokazanog Toolbox projekta, uz dopune:

| Komponenta | Rešenje | Napomena |
|---|---|---|
| Frontend | Vanilla JS + HTML + CSS (PWA) | bez framework-a, bez build tool-a |
| Offline | Service Worker | GATE A: airplane mode test — OBAVEZAN |
| Storage lokalno | IndexedDB (+ localStorage za settings) | IndexedDB zbog slika i količine podataka |
| Storage cloud | Cloudflare R2 (kroz AU Core) | S3-kompatibilan, nula egress |
| PDF | jsPDF + DejaVu font subset za srpske karaktere | jedan engine, bundled lokalno |
| Licenca | Gumroad License API / Play Billing / AU Core subscription | verify jednom → offline zauvek |
| Hosting frontend | Cloudflare Pages / GitHub Pages | besplatno |
| Backend (AU Core) | Node.js + better-sqlite3, bez frameworka | vidi DEO IV |
| iOS | PWA preko Safari "Add to Home Screen" | Capacitor iOS build otvoreno pitanje |
| **Android APK / Play Store** | **Capacitor** (shell oko vanilla JS codebase-a) | **TWA/Bubblewrap odbijen** — Chrome ostaje vlasnik storage-a, što ubija offline-first garanciju. Capacitor daje pristup pravom filesystemu (rešava brisanje podataka i fotografija pod Android storage pressure-om). |
| Jezik | i18n fajlovi: `en.json`, `sr.json` | EN default, SR ugrađen |
| Config | `garage_v1.json`, `driver_v1.json` | boje, moduli, terminologija |
| Discovery | `platform-url.json` na GitHub Pages | AU Core URL discovery |
| Testovi | Node.js test runner (`tests/*.test.js`) | 53+ testova u Garage-u |

**Deljenje koda:** jedan `core/` folder (store, pdf, events, contacts, i18n, license, sync) + config po aplikaciji. Garage i Driver dele ~70% koda. Specijalizovane aplikacije dele ~60-70% jezgra.

**Quality gates:**
- GATE A — offline test (airplane mode)
- GATE B — automatski testovi (53+ u Garage-u)
- GATE C — bez cross-trade kontaminacije između aplikacija
- GATE D — backup/restore round-trip test na iPhone-u

**Google Play Gate G1:** lični developer nalog zahteva identity verifikaciju + 12 opt-in testera kroz 14 dana; organizacijski nalog zaobilazi to ali zahteva D-U-N-S broj. Otvoreno pitanje, ne blokira razvoj (plan B: direktna APK distribucija sa sajta).

---

# DEO IX — DOMEN I INFRASTRUKTURA

*Ovaj deo je operativan, ne arhitekturalni. Ažurira se češće od ostatka dokumenta i može evoluirati bez potrebe za novom major verzijom.*

## 1. Root domeni

**Odluka:** registrovati sada samo `autouniverse.rs`.

**Status ostalih ekstenzija (provera 20.07.2026):**
- `.com` — zauzet (nije poznato ko drži; ne registruje se preventivno bez dodatne istrage)
- `.net`, `.eu`, `.co`, `.io`, `.app`, `.dev` — većinom zauzete

**Šta ovo znači strateški:**
- Brend AutoUniverse je fokusiran na srpsko tržište prvenstveno — `.rs` je i geografski primeren i dovoljan
- Ako se pojavi ozbiljno globalno tržišno pitanje kasnije, tada se investira u istragu ko drži `.com`
- Alternativa za budućnost: prefiks-domeni (npr. `getautouniverse.com` ili `try.autouniverse.rs`)

**Napomena o žigu:** registrovanje žiga "AutoUniverse" za Srbiju i EU je zasebna odluka, ne blokira domen setup. Preporuka: sačekati dok AU Core ne izađe iz Cloudflare Tunnel faze.

## 2. Subdomen mapa

| Subdomen | Namena | Faza aktivacije |
|---|---|---|
| `autouniverse.rs` | Root marketing landing, statička HTML | Sada |
| `www.autouniverse.rs` | Redirect ka root domenu | Sada |
| `hub.autouniverse.rs` | AU Core API endpoint | Kada AU Core izađe iz Cloudflare Tunnel faze |
| `api.autouniverse.rs` | Alias ka `hub.` ili dedicirana developerska dokumentacija | Kada bude prvi partner |
| `garage.autouniverse.rs` | Garage Toolbox PWA | Kada Garage stabilizuje za javnost |
| `driver.autouniverse.rs` | Driver Toolbox PWA | Kada Driver stabilizuje za javnost |
| `docs.autouniverse.rs` | Developer / korisnička dokumentacija | Faza 4+ |
| `status.autouniverse.rs` | Status stranica za uptime | Kada AU Core bude produkcija sa realnim SLA |
| `admin.autouniverse.rs` | Admin panel (samo za operatera) | Kada AU Core bude produkcija |

**Odloženo:** subdomeni za specijalizovane aplikacije (`tire.`, `body.`, `electric.`, ...) — odluka kada svaka pojedinačna aplikacija dođe u razvoj.

## 3. Email strategija

**Adrese koje treba obezbediti:**

| Adresa | Namena | Prioritet |
|---|---|---|
| `noreply@autouniverse.rs` | Sistem obaveštenja | Kada AU Core šalje email |
| `support@autouniverse.rs` | Kontakt sa korisnicima | Sada |
| `security@autouniverse.rs` | GDPR/ZZPL bezbednosni izveštaji | Obavezno pri objavljivanju |
| `garage@autouniverse.rs` | Pitanja specifična za Garage | Kad testeri traže formalni kontakt |
| `driver@autouniverse.rs` | Pitanja specifična za Driver | Isto |
| `milan@autouniverse.rs` | Lični | Sada |
| `abuse@autouniverse.rs` | Zloupotrebe | Kad AU Core bude javan |
| `postmaster@autouniverse.rs` | Mail zloupotrebe (RFC 5321) | Isto |

**Email hosting strategija:**

**Faza sada — Cloudflare Email Routing (besplatno, samo prijem):**
- Sve `@autouniverse.rs` adrese se forward-uju ka ličnom email nalogu
- Ne šalje se email iz `@autouniverse.rs` — samo prijem
- DNS zapisi (MX) se automatski podešavaju kroz Cloudflare

**Faza kada AU Core počne slati email — otvoreno pitanje, tri opcije za istragu:**
1. Transactional ESP (Postmark ~$15/mesec za 10k mailova, Brevo besplatno do 300/dan, Amazon SES ~$0.10 za 1000)
2. Full mail hosting (Zoho Mail besplatno do 5 korisnika, Fastmail ~$3/mesec)
3. Srpski hosting paket (deliverability rizik zbog shared IP-a)

## 4. DNS podešavanja (SPF, DKIM, DMARC)

**Minimalna konfiguracija (Cloudflare Email Routing faza):**

| Zapis | Vrednost |
|---|---|
| MX | Cloudflare Email Routing default (automatski) |
| SPF (TXT) | `v=spf1 include:_spf.mx.cloudflare.net ~all` |
| DMARC (TXT) | `v=DMARC1; p=none; rua=mailto:security@autouniverse.rs` |

**Puna konfiguracija za produkciju** (kada šaljemo poštu): SPF, DKIM, DMARC prema izabranom ESP-u, iterativno od `p=none` → `p=quarantine` → `p=reject`.

## 5. Napomena o VPS-u i email-u

**VPS i email idu odvojeno.** Unmanaged VPS (Hetzner, Contabo, DigitalOcean) daje samo Linux server — sve dodatno se instalira. Managed hosting sa cPanel-om ima email uključen, ali kompromituje AU Core arhitekturu (cPanel serveri nisu optimizovani za Node.js). Srpski hosting paketi često nude "sve u jednom" ali imaju deliverability rizik zbog shared IP reputacije.

**Preporuka:**
- **VPS za AU Core:** unmanaged, Hetzner ili sličan (~5-10 EUR/mesec)
- **Email:** odvojen servis — počni sa Cloudflare Email Routing (prijem), transactional ESP za slanje sistemskih poruka

## 6. Redosled aktivacije

**Sada (nedelja dana):**
1. Registruj `autouniverse.rs` preko istraženog RNIDS registrara (otvoreno pitanje)
2. Prenesi DNS na Cloudflare
3. Postavi Cloudflare Email Routing → sve adrese forward na lični email
4. Postavi minimalnu "Coming Soon" HTML stranicu
5. `www.autouniverse.rs` redirect ka root

**Coming Soon stranica — predlog sadržaja:**
- Logo (privremen tekst-logo je OK)
- Glavna rečenica-kompas: *"Digitalna istorija svakog vozila. Uskoro."*
- Podnaslov: *"Za vozače, mehaničare i celu automobilsku industriju."*
- Bez newsletter forme za sada (traži GDPR/ZZPL okvir)
- Kontakt link: `support@autouniverse.rs`

**Kada AU Core izađe iz Cloudflare Tunnel faze:**
6. `hub.autouniverse.rs` → produkcioni AU Core (VPS ili managed hosting)
7. Ažuriraj `platform-url.json` na GitHub Pages
8. Konfiguriši SSL kroz Cloudflare (Full/Strict mod)

**Kada Garage/Driver stabilizuju za javnost:**
9. `garage.autouniverse.rs` → GitHub Pages hosting
10. `driver.autouniverse.rs` → isto
11. Ažuriraj Play Store listinge (kada Capacitor build bude spreman)

**Kada AU Core počne slati email:**
12. Odluka: transactional ESP vs. full mail hosting
13. SPF, DKIM, DMARC prema izabranom rešenju
14. Prva sistemska email adresa aktivna: `noreply@autouniverse.rs`

**Kada bude realna potreba:**
15. `docs.` — kad prvi partner traži developer dokumentaciju
16. `status.` — kad AU Core bude produkcija sa SLA
17. `admin.` — verovatno pre ovoga

## 7. Procenjeni troškovi (godišnje)

**Minimalna operacija (Faza sada):**
- `autouniverse.rs`: ~1.500 RSD (~15 EUR)
- Cloudflare (DNS, Email Routing, Pages, SSL): 0 EUR
- **Ukupno: ~15 EUR/godišnje**

**Srednja operacija (Faza AU Core produkcija):**
- Gore + VPS za AU Core (~5-10 EUR/mesec, Hetzner CX11 ili slično): ~120 EUR/god
- Cloudflare R2 storage: nula do umerene korišćenja
- Email hosting/ESP: 0 do ~50 EUR/god
- **Ukupno: ~200-300 EUR/godišnje**

---

# OTVORENA PITANJA

Konsolidovana lista strateških odluka koje čekaju odgovor. Ne blokiraju razvoj, ali će zatražiti odgovor kada relevantna faza sazri.

## Arhitektura i AU Core

1. Konkretne vrednosti `grant()` uloga (viewer, contributor, admin, family_member, future_buyer, ...) — enum se definiše prvim ozbiljnijim korišćenjem
2. Kada AU Core prelazi sa Cloudflare Tunnel-a na produkcioni VPS — trigger, ne datum
3. Push notifikacije: klasična kratka poruka, "news feed" style, ili hibrid
4. Web pregled istorije preko magic linka: koliki obim funkcionalnosti prikazati, koliki CTA za instalaciju Driver-a
5. Capacitor iOS build — kada i kako

## Passport i data model

6. Šta se dešava sa Passport-om rashodovanog vozila (`scrapped` / `total_loss`) — koliko dugo se čuva, ko plaća storage
7. Cherry-picking pri javnom deljenju Passport-a: prodavac bira set, ne pojedinačne zapise
8. Automatski prenos vlasništva kroz AU Core — implementacija tihe notifikacije mehaničarima
9. Da li mehaničar-tester ima pravo da "iznese" svoju istoriju zapisa ako napusti ekosistem

## Proizvod i monetizacija

10. Egzaktne granice free plana (broj vozila, broj slika po vozilu, ukupan storage)
11. Ceo model naplate: fixed subscription, per-vehicle, per-storage-GB
12. Pragovi za prelazak sa Cloudflare Email Routing na pun mail hosting
13. Kada aktivirati transactional ESP (Postmark, Brevo, Amazon SES)
14. AdMob za mini-aplikacije van AutoUniverse-a — odvojen ekosistem (Multiuniverse), otvoreno pitanje monetizacije van jezgra

## Infrastruktura

15. Registrator za `.rs` domen (Loopia, Verat, MojHost, drugi) — istraživanje pre kupovine
16. VPS provajder i lokacija — Hetzner (Nemačka) vs. srpski provajder — trade-off latencija vs. GDPR
17. Backup strategija za AU Core SQLite bazu (off-site, frekvencija, disaster recovery)
18. WHOIS istraga vlasnika `autouniverse.com` — kada bude relevantno
19. Cloudflare kao jedini glavni provajder ili diversifikacija provajdera

## Pravni okvir

20. GDPR/ZZPL saglasnost pri povezivanju Driver-a i mehaničara (Garage) — mora postojati pre javne dostupnosti
21. Kurs EUR/RSD u PDF zbiru — ručno polje ili bez ukupnog zbira
22. Uslovi korišćenja, Privacy Policy — potrebni pre Faze 2 (Play Store zahteva)

## Iz Google Play distribucije

23. Google Play Gate G1 — 12 opt-in testera + 14 dana testiranja: da li obezbediti ili ići plan B (direktna APK distribucija)?
24. Organizacijski nalog za Play Store (D-U-N-S broj) — investicija ili kasnije

---

*Živi dokument. v2.0 — 20.07.2026.*
*Prethodna verzija: v1.0 (10.07.2026) — sačuvana kao istorijska referenca.*
*Sledeća revizija: kada Faza 1 pređe u Fazu 2, ili kad nastupi krupna arhitekturalna promena.*
