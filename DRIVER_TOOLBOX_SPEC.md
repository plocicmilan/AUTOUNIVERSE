# DRIVER TOOLBOX — SPECIFIKACIJA

Živi dokument. Izmene se upisuju ovde (changelog na dnu), bez verzija u nazivu fajla.
Temelj: **Mapa sveta v1** + **AUTO_UNIVERSE_README** (monorepo, `core/`). Nasleđuje `core/`
od Garage-a; deli ~70% koda. Bez framework-a, offline-first, PWA.

**Korisnik:** vlasnik vozila (prvi tester: ti). Problem: "ne znam kad je bio servis,
koje su gume, šta piše u saobraćajnoj, kad ističe registracija."
**Suština:** sve o mom vozilu u džepu — i kad kupim polovnjak koji već ima istoriju iza sebe.

---

## 1. Šta se nasleđuje iz `core/` (NE piše se ponovo)

| Core modul | Koristi Driver? | Napomena |
|---|---|---|
| `store.js` (IndexedDB + settings) | ✅ | vozila, događaji, dokumenta, podsetnici |
| `models.js` (model + šifarnici + zbir po valutama) | ✅ | + dopuna iz §5 |
| `pdf.js` (jsPDF, DejaVu font sa š/ć/č/ž/đ) | ✅ | "dosije vozila" izvoz |
| `i18n.js` (EN/SR) | ✅ | isti mehanizam |
| `license.js` (Gumroad, TEST-UNLOCK) | ✅ | 🔑 moduli |
| Backup/Export | ✅ | kritično za iOS |
| Reminders engine | ✅ | pokreće se iz početnog stanja (§4) |

**Driver-specifično (novo):** `config/driver_v1.json` (boje, terminologija, moduli+tier),
onboarding tok (§3), "Početno stanje" ekran (§4), timeline prikaz retroaktivnih događaja (§5).

---

## 2. Ekrani (bottom nav)

```
MOJE VOZILO | ISTORIJA | DOKUMENTA | PODSETNICI | SETTINGS
```

- **MOJE VOZILO** — kartica vozila (podaci iz saobraćajne uneti ručno jednom: kubikaža,
  snaga, masa, br. šasije), tehnička kartica (ulje, filteri), gume (dimenzija, koje su na
  autu, kad kupljene, gde je drugi set). Više vozila (🔑).
- **ISTORIJA** — timeline svih događaja. Brzi unos "+ Servis": datum, km, šta je rađeno,
  slika računa → 30 sekundi. Ovde žive i retroaktivni unosi (§5).
- **DOKUMENTA** — slike saobraćajne, polise, računi, garancije. Sve lokalno.
- **PODSETNICI** — registracija, tehnički, polisa, servis (datum i/ili km), gume (sezonski).
- **SETTINGS** — profil, valuta, jezik, backup/export, licenca.

Tier (iz Mape): 🟢 1 vozilo + karton + istorija + dokumenta + podsetnici + gume + backup.
🔑 više vozila, troškovi+gorivo+statistika, kalkulatori, check liste, PDF "dosije vozila".
☁️ sync, veza sa servisom, verifikovana istorija za prodaju, QR.

---

## 3. ONBOARDING — prvi ulazak

Cilj: za < 2 minuta doći do kartona koji odmah pali korisne podsetnike. Sve posle
osnovnih podataka je **preskočivo**. Ni jedan zid od 20 pitanja.

```
1. Dobrodošlica (1 ekran, šta app radi — 1 rečenica)
        ↓
2. Dodaj vozilo
   OBAVEZNO:  marka, model
   OPCIONO:   godište, registracija, gorivo, tekuća kilometraža
        ↓
3. POČETNO STANJE  ← srce onboarding-a (§4). Ceo korak ima dugme "Preskoči".
        ↓
4. Gotovo → MOJE VOZILO, sa već upaljenim podsetnicima ako je uneto dovoljno
```

Ako korisnik preskoči korak 3, app radi normalno — samo nema podsetnika dok ih ručno ne
doda. Kasnije se početno stanje može dopuniti u bilo kom trenutku (dugme "Dopuni istoriju").

---

## 4. EKRAN "POČETNO STANJE"

Četiri kartice, svaka nezavisno preskočiva. Svaka popunjena kartica = ili podsetnik,
ili retroaktivni događaj (§5), ili oboje.

### 4.1 Kilometraža
- `Trenutna km` (broj). Postaje referentna tačka za sve km-bazirane podsetnike.

### 4.2 Poslednji servis
- `Datum` — fleksibilan unos (§5.2): tačan / samo mesec+godina / "pre ~X meseci".
- `Na km` — fleksibilan (tačno / "~oko").
- `Šta je rađeno` — slobodan tekst (opciono) ili čekboks lista (ulje, filteri, kaiš…).
- `Slika računa` (opciono) → diže poverenje na `receipt`.
- → kreira **retroaktivni EVENT** (tip: servis) + predlaže podsetnik za sledeći servis.

### 4.3 Rokovi (dokumenti)
- `Registracija ističe` (datum) → podsetnik.
- `Tehnički ističe` (datum, opciono) → podsetnik.
- `Polisa ističe` (datum, opciono) → podsetnik.
- Ovo su čisti **podsetnici**, ne događaji (obaveza u budućnosti, ne prošli čin).

### 4.4 Gume
- `Dimenzija` (npr. 205/55 R16), `Sezona` (letnje/zimske/cele godine),
  `Koje su sad na autu`, `Kad kupljene` (fleksibilan datum), `Gde je drugi set` (tekst).
- → tehnička kartica + (opciono) sezonski podsetnik za zamenu.

**Princip:** minimum za korisnu vrednost je **4.1 + 4.3 registracija**. To dvoje već daje
"koliko sam prešao" + "kad mi ističe reg" — dovoljno da app ima smisla od prvog dana.

---

## 5. DOPUNA EVENT MODELA (ide u Mapu sveta → core `models.js`)

Retroaktivni unos NIJE novi entitet — to je običan EVENT sa datumom u prošlosti. Dodaju
se samo polja za poreklo i preciznost. Ovo je jedina izmena core modela za ovu funkciju.

### 5.1 Nova/proširena polja na EVENT

| Polje | Vrednosti | Značenje |
|---|---|---|
| `source` | `owner` · `mechanic` · `receipt` · **`initial`** · `inspection` · `insurance` | dodaje se `initial` = uneto pri onboardingu/naknadno, bez dokaza |
| `retroactive` | `true` / `false` | zapis unet posle događaja (za prikaz i Trust sloj) |
| `date_precision` | `exact` · `month` · `approx` | koliko je datum pouzdan |
| `km_precision` | `exact` · `approx` | koliko je km pouzdan |

Pravilo poverenja: `initial` → nizak nivo. Ako se priloži slika računa → `source` prelazi
u `receipt`, poverenje raste. Servis kasnije može potvrditi → `mechanic` (☁️, platform faza).

### 5.2 Fleksibilan datum — kako se čuva

Ne uvoditi poseban tip. Čuva se **stvarni datum** (najbolja procena) + preciznost:

- `exact` → korisnik uneo pun datum.
- `month` → uneo samo mesec+godinu; čuvamo 1. u mesecu, prikazujemo "MM.GGGG".
- `approx` → "pre ~X meseci"; računamo datum od danas unazad, prikazujemo "~ pre X meseci".

Isto za km: `approx` znači "oko te vrednosti" (npr. ±2.000 km) — bitno da podsetnik ne
okida prerano/prekasno kao da je tačan broj.

### 5.3 Prikaz u ISTORIJI (timeline)

- Retroaktivni događaji vizuelno razdvojeni: prigušeniji, sa oznakom **"unet naknadno"**.
- Ikonica poverenja uz svaki: 🔵 vlasnik · 🟣 račun · ⚪ početno/nepoznato.
- Tako korisnik (i budući kupac vozila) odmah vidi šta je dokazano, a šta upisano po sećanju.

---

## 6. "ISKOPAJ FIOKU" — rast istorije unazad

Odvojeno od onboarding-a, dostupno uvek (ISTORIJA → "+ Stari račun"):
korisnik slika stari račun/garanciju → app kreira retroaktivni EVENT (`source: receipt`,
`retroactive: true`). Istorija raste unazad postepeno, bez pritiska na startu. Ovo je
prirodan način da prazan karton polako postane pun "dosije vozila".

---

## 7. Redosled kodiranja Driver-a (kad stigne zip)

1. `config/driver_v1.json` + shell (index.html, app.js, sw.js, manifest) — nasleđuje core.
2. MOJE VOZILO + tehnička kartica (najveći deo već postoji kroz core store/models).
3. Onboarding tok + "Početno stanje" ekran (§3–4).
4. Dopuna `models.js` (§5) + testovi (fleksibilan datum, preciznost, poverenje) — GATE B.
5. ISTORIJA timeline sa retroaktivnim prikazom (§5.3) + "iskopaj fioku" (§6).
6. PODSETNICI iz početnog stanja + gume.
7. Gates A–D, ikona, deploy (isti postupak kao Garage).

---

## Changelog

- **10.07.2026.** — Dokument kreiran. Onboarding + "Početno stanje" + dopuna Event modela
  (source `initial`, `retroactive`, `date_precision`, `km_precision`). Izvor funkcije:
  feedback #1 (Marko/Garage) — vidi FEEDBACK.md.
