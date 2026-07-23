# KONKURENCIJA — srpsko tržište auto oglasa i delova

**Verzija:** 1.0
**Datum:** 23.07.2026.
**Autor:** analiza iz veb istraživanja (izvori: polovniautomobili.com, autohub.rs, mojagaraza.rs, autopijac.rs, mojauto.rs)
**Svrha:** referentni dokument za odluke o Marketplace fazi (5+), Salvage/Parts modul, i differentiator strategiju AutoUniverse-a
**Status:** living document — ažurirati u mestu kad se pojavi nov signal

---

## 0. TL;DR

1. **Inspira Grupa** dominira srpskim tržištem sa 5 povezanih sajtova: `polovniautomobili.com`, `autohub.rs`, `prodajadelova.rs`, `osiguranik.com`, `mojagaraza.rs`. Pokrivaju **transakcione vertikale** (kupovina/prodaja/osiguranje) + **community** (forum).
2. **Prazan prostor:** operativne aplikacije za vlasnika vozila i mehaničara. Niko na tržištu ne nudi Driver-tip ili Garage-tip alat sa realnim usvajanjem. Ovo je AutoUniverse teritorija.
3. **Differentiator za AutoUniverse marketplace (Faza 5+):** verifikovana servisna istorija koja dolazi iz `grant(mehaničar, vlasnik, VIN, role)` protoka. Bez ovoga marketplace nema šanse protiv PA SEO snage i količine oglasa.
4. **Referentna taksonomija** (10 potkategorija delova + oprema checkbox + sigurnost checkbox) — preuzeti iz PA modela za prepoznatljivost kod korisnika.

---

## 1. Inspira Grupa — ekosistem konkurenata

Iz footera `polovniautomobili.com` identifikovan je portfolio:

| Sajt | Vertikala | Model | Preklop sa AU |
|---|---|---|---|
| `polovniautomobili.com` | marketplace vozila + delovi | oglasi (freemium + paketi) | Marketplace (Faza 5+) |
| `autohub.rs` | B2C e-commerce delovi | fiksne cene, korpa, kurirska dostava | Parts modul (Salvage L3) |
| `prodajadelova.rs` | marketplace delovi (P2P) | oglasi | Parts modul (Salvage L3) |
| `mojagaraza.rs` | community/forum | Q&A na "I know" platformi (Vibe Network d.o.o.) | ⚠️ ime slično, funkcija drugačija |
| `osiguranik.com` | osiguranje + registracija | affiliate/lead | Driver ekosistem (integracija) |
| `4zida.rs` | nekretnine | oglasi | van scope-a |

### Ključan uvid: Inspira **nema** operativne aplikacije

- Niko od Inspira sajtova ne nudi dnevno praćenje vozila (kilometraža, servis, dokumenti, podsetnici).
- Niko ne nudi CRM/radne naloge za mehaničare.
- Niko ne nudi grant-baziranu razmenu servisne istorije između vlasnika i mehaničara.
- Community sloj (`mojagaraza.rs`) je outsourceovan na eksterni Vibe Network — signal da im nije strateški prioritet.

**Zaključak:** solo developer sa brzim iteracijama može održati prozor 12–24 meseca dok Inspira ne uzvrati (ako uopšte).

---

## 2. Polovni Automobili — referentna anatomija

Ovo je zlatni standard za srpsko tržište. Sve što gradiš u marketplace fazi meri se prema njemu.

### 2.1 Top-level navigacija

```
[Ponuda Vozila]
  ├── Putnička vozila           (~75.000 aktivnih oglasa)
  ├── Motori
  ├── Transportna vozila         (kombi, kamioni <7.5t, kamioni >7.5t,
  │                                prikolice, autobusi, kamperi)
  ├── Poljoprivredne mašine      (traktori, kombajni, priključne, prikolice)
  ├── Radne mašine
  ├── Plovila
  └── Bicikli

[Delovi i oprema]
  ├── Auto delovi                (10 potkategorija — vidi 2.2)
  ├── Auto oprema
  ├── Gume
  ├── Felne i ratkapne
  ├── Delovi za motore
  ├── Delovi za transportna vozila
  ├── Delovi za poljoprivredne mašine
  ├── Delovi za radne mašine
  ├── Delovi za plovila
  └── Delovi za bicikle

[Prodajem]
  ├── Postavi oglas              (formular)
  ├── Prodaj sopstveno vozilo    (besplatni + dodatni)
  ├── Oglasi celokupnu ponudu    (za trgovce/auto placeve)
  └── Ubrzaj prodaju             (istaknuti oglasi)

[Auto osiguranje]                (integracija osiguranik.com)
[Saveti i vesti]                 (SEO farma)
[Usluge i krediti]
[Ponuda za oglašavanje]          (media kit za dilere)
```

### 2.2 Referentna taksonomija — delovi (10 potkategorija)

**PRIMENA U AU:** koristi identičnu taksonomiju za Garage servisne zapise i budući Parts marketplace. Prepoznatljivost > originalnost.

```
1.  Karoserija, šasija, limarija
2.  Elektrika i elektronika
3.  Motor i mehanički delovi
4.  Oslanjanje i upravljanje
5.  Enterijer
6.  Transmisija
7.  Izduvni sistem
8.  Klima, grejanje i ventilacija
9.  Kočioni sistemi
10. Svetla i signalizacija
```

**Napomena:** AutoHub.rs koristi granulariniju taksonomiju od 29 kategorija za e-commerce navigaciju. To je "granularni" nivo za direktnu prodaju. Za marketplace/servisne zapise, 10-potkategorijski nivo je prava granulacija.

### 2.3 Filteri pretrage vozila

**Osnovni (persistentni u UI):**
- Marka + Model (kaskadno)
- Cena od–do (€)
- Godište od–do
- Karoserija
- Gorivo (benzin, dizel, hibrid, električni, plin, plin+benzin)
- Region

**Detaljna pretraga:**
- Način finansiranja (keš, kredit)
- Kubikaža od–do
- Snaga motora (kW/KS)
- Kilometraža
- Menjač (manuelni, automatski, poluautomatski)
- Pogon (napred, nazad, 4x4)
- Boja
- Broj vrata / sedišta
- Emisiona klasa
- Prvi vlasnik (da/ne)
- Kupljen nov u Srbiji (da/ne)
- Registrovan do
- Garancija (da/ne)
- Zamena (jeftinije/isto/skuplje/svejedno)
- Vlasništvo (privatno / auto plac / registrovan servis)

**Predefinisani quick-linkovi** (odlična SEO strategija — svaki je zasebna landing stranica):
- Najnoviji oglasi (poslednja 24h)
- Novi automobili
- Prvi vlasnik
- Kupljen nov u Srbiji
- Automobili na kredit
- Sa garancijom
- Za zamenu
- Preporuke prodavaca
- Sniženo u poslednjih 7 dana
- Prodato u poslednja 24h (transparency signal)

### 2.4 Struktura pojedinačnog oglasa

**Preview kartica (u listi rezultata):**

```
┌─────────────────────────────────────┐
│ [Slika 4:3]  Naslov (do ~60 char)   │
│ [Badge:      Cena €                  │
│  NOVO /      Godište                 │
│  ISTAKNUT /  ♡ Sačuvaj  ↗ Podeli    │
│  XL /        🗨 Poruka  ☏ Klik...   │
│  SNIŽENO]                            │
└─────────────────────────────────────┘
```

**Detaljna stranica — redosled sekcija:**

1. Breadcrumbs (Naslovna → Putnička → Marka → Model → Karoserija → Gorivo)
2. **Galerija fotografija** (do ~30 slika, glavna 1920×1080, thumb strip)
3. **Naslov + godište** (H1)
4. **Cena** + "dodatni troškovi kupovine" + widget "Izračunaj ratu keš kredita"
5. **Opšte informacije** blok:
   - Stanje (polovno/novo)
   - Marka, Model
   - Godište, Kilometraža
   - Karoserija, Gorivo
   - Kubikaža, Snaga motora (kW/KS)
   - Fiksna cena (DA/NE), Zamena (DA/NE)
   - Broj oglasa, Datum objave
6. **Dodatne informacije** (menjač, pogon, broj vrata, boja...)
7. **Sigurnost** (ABS, ESP, airbagovi, ISOFIX — checkbox lista)
8. **Oprema** (audio, klima, senzori, tempomat... — checkbox lista, često 30+ stavki)
9. **Stanje** (registrovan do, prvi vlasnik, servisna knjižica, oštećenja)
10. **Kontakt** (grad, "Klik da vidiš broj" pattern, forma poruke, "Svi oglasi oglašivača")
11. **Slobodan opis** (plain text — kako prodavac formuliše)
12. **Widget:** cena registracije od–do (osiguranik.com)
13. **Widget:** rezervacija tehničkog pregleda online
14. **Widget:** kasko osiguranje
15. **Reklame** (razapete kroz stranicu, 4–5 blokova)
16. **Preporučeno** (slični oglasi)

**Šta ide u strukturirana polja (za pretragu):**
marka, model, godište, karoserija, gorivo, kubikaža, snaga, menjač, pogon, boja, kilometraža, region, cena, prvi vlasnik, garancija, oprema (checkbox), sigurnost (checkbox)

**Šta ide u slobodan tekst:**
istorija vlasnika, priča o autu, razlog prodaje, opravke, "kupcu ostaje samo registracija", uvoz odakle, kontakt informacije van platforme (često TOS prekršaj)

### 2.5 Monetizacija — svi kanali

| Kanal | Ko plaća | Cena (2024–2026) | Trajanje |
|---|---|---|---|
| Besplatan oglas (sopstveno vozilo) | privatna lica | 0 | 30 dana |
| Aktivacija dodatnog oglasa | privatna lica sa 2+ vozila | 1.680 din / 1.380 din (SMS: 2.880 / 2.250) | oglas |
| Istaknut u pretrazi | svi | 1.450 din / 1.120 din (SMS: 2.690 / 2.110) | 30 dana |
| Istaknut na naslovnoj | svi | 1.850 din / 860 din | 30 dana |
| XL oglas (veći format, glavna + 4 dodatne u listi) | svi | 1.120 din / 1.060 din (SMS: 2.110) | 30 dana |
| Paketi za auto placeve | dileri | ugovorno | mesečno |
| Paketi za delove | trgovci delova | 5.000 oglasa u paketu, doplata 3.300 RSD na 25k–35k oglasa, +1.100 din/10k dodatnih | mesečno |
| Facebook/Instagram promocija | dileri | ugovorno | kampanja |
| Preporuke prodavaca | dileri | uključeno u paket | trajno |
| Osiguranje/registracija integracija | osiguranik.com plaća PA | lead fee | po transakciji |
| Kalkulator kredita | banke | affiliate/lead | po lead-u |
| Programske reklame | Google Ads + direktne | CPM/CPC | rotirano |
| Sadržajni marketing | brendovi | native/sponzorisano | po članku |

**Napomena:** cene "putničkih vozila" su više od "ostalih kategorija" — logika je da najveća monetizacija dolazi iz kategorije sa najvećim volumenom pretrage.

**Realna procena mesečnog prihoda samo iz isticanja:** analiza iz 2021. je izračunala ~5.7M RSD/mesec za istaknute oglase. Uz inflaciju i rast količine 2021→2026, realno je 10–15M RSD/mesec samo iz ovog kanala (~100–150k EUR/mesec).

### 2.6 Auto usluge tab

PA ima poseban direktorijum:
- Servisi (mehaničari)
- Prodavnice delova
- Renta car
- Alarmi
- Tehnički pregledi
- Auto škole
- Vulkanizeri

**IMPLIKACIJA ZA AU:** ovaj prostor je već zauzet kao statički direktorijum. AU **ne treba** da pravi konkurentski direktorijum. Umesto toga, "nađi vulkanizera" u Driver-u treba da bude *kontekstualan* (Trip Assistant model iz `10.07.2026__razvoj_platforme.txt`):
- da li radi sada
- prima li kartice
- izlazi na teren
- popravlja ili samo menja gume
- procena vremena dolaska
- direktan poziv

---

## 3. AutoHub.rs — B2C e-commerce delovi

### 3.1 Struktura

```
[Odaberite vozilo]                    (persistentan filter u header-u)
  ├── Passenger vehicles / Commercial / Motorcycles
  ├── Proizvođač → Model → Godište → Agregat
  └── [PRONAĐITE DELOVE]

[Kategorije auto-delova]              29 kategorija (granularni nivo)

[Korpa]                               standardni e-commerce
[Moja vozila]                         ⚠️ funkcija "garaža" za user-a
[Kontakt]                             telefonska podrška 024 555 111
[Prijava / Registracija]
```

### 3.2 Ključna funkcija: "Moja vozila"

- Korisnik unese svoja vozila (proizvođač/model/godište/agregat)
- Pri pretrazi delova, automatski filtrira samo kompatibilne
- Sinhronizacija sa nalogom

**Ne postoji:** evidencija servisa, podsetnici, dokumenti, kilometraža tracking. Samo "šta imam za pretragu delova".

**IMPLIKACIJA ZA AU:** ovo je *tanak* preklop sa Driver Toolbox konceptom "moja vozila" ali *ne* konkurent na funkcionalnom nivou. Driver ima pun životni ciklus vozila; AutoHub Moja Vozila je samo shopping filter.

### 3.3 Monetizacija

- Klasična B2C marža na prodatim delovima
- Kurirska dostava (naplata dostave)
- Vezano brendiranje sa Inspirom (verovatno cross-sell sa polovniautomobili preko delova sekcije)

---

## 4. MojaGaraza.rs — community/forum

### 4.1 Struktura

```
[Naslovna]
[Automobili]              katalog marki + diskusije po modelu
[Gume]                    sekcija (preporuke/testovi)
[Diskusije]               forum — Q&A vozači ↔ majstori
[Fotke]                   korisničke galerije
[Login/Registracija]
```

### 4.2 Karakteristike

- Tech: **eksterna platforma "I know" (Vibe Network d.o.o., Beograd)** — nije Inspira inhouse
- Model: forum Q&A, vozači postavljaju pitanja, majstori i drugi vozači odgovaraju
- Misija (deklarisana): "olakšati donošenje prave odluke o kupovini vozila, omogućiti razmenu iskustava"

### 4.3 Zašto ovo NIJE Driver-tip proizvod

- **Nema tracking vozila** kroz vreme (kilometraža, servis, troškovi)
- **Nema personal dashboard** za "moja vozila"
- **Nema podsetnike** (registracija, servis, gume)
- **Nema dokumente** (saobraćajna, osiguranje, računi)
- **Nema PDF fakture** ili radne naloge
- **Nema offline režim**

To je čist **user-generated content forum** oko auto tema. Preklop sa AU je nula.

### 4.4 Implikacija za naming

Ime "Moja Garaža" je zauzeto. Ali AU ne koristi to ime — Driver Toolbox i Garage Toolbox su različiti brendovi. **Nema kolizije za javne brendove.**

---

## 5. KupujemProdajem.com — auto sekcija

### 5.1 Pozicija

- Najveći generalni klasifikovani sajt u Srbiji (~20+ godina)
- Auto vertikala jedna od jačih, ali PA je specijalizovan i vodeći u toj vertikali
- Snaga KP: **širina** (auto je jedna od 100+ kategorija; svi ionako imaju otvoreno)

### 5.2 Razlike u strukturi oglasa u odnosu na PA

- **Manje strukturirano** — glavna polja: stanje, opis, cena
- **Više naglaska na lokaciji** (opština/mesto, ne region)
- **Poruka kroz platformu** je defaultni kanal (chat), telefon je iza click-a
- **Ocene prodavca** — reputacioni sistem preko svih kategorija
- **Bookmark/Sačuvaj** je jak feature
- **Notifikacije za pretragu** ("javi mi kad neko doda Golf 6 do 3000€")

### 5.3 Monetizacija

- Besplatan bazni oglas za privatna lica
- Istaknuti oglas (nekoliko nivoa)
- **KP Pro** — pretplata za dilere: neograničeno oglasa, brendiran storefront, statistike
- Auto sekcija Premium paketi za auto placeve (ugovorno)
- Bumping — plaćeno vraćanje oglasa na vrh
- Programske reklame (Google Ads)

**Ključna razlika u odnosu na PA:** KP nema integracije sa osiguranjem/registracijom/kreditima. Auto sekcija je light — bez auto-specifičnih widgeta.

---

## 6. Referentna anatomija oglasa vozila — sumarno

Ovo je *šablon* koji AU marketplace mora da poštuje da bi bio ozbiljno shvaćen:

### 6.1 Preview kartica

```
IKONA/BADGE:  ⭐ Istaknut / NOVO / SNIŽENO / XL / PROMO
GLAVNA SLIKA: 4:3 ratio, ~300px width
NASLOV:       "Marka Model /varijanta/oprema"  (≤60 char)
CENA:         "11.250 €" | "Na upit" | "Zamena"
META:         Godište | Kilometraža | Karoserija | Gorivo | Grad
KONTAKT:      dugme "Klik da vidiš broj" (privacy pattern)
AKCIJE:       ♡ Sačuvaj | ↗ Podeli | 🗨 Poruka
```

### 6.2 Detaljna stranica — redosled

1. Breadcrumbs
2. Galerija fotografija (glavna + strip)
3. Naslov + godište (H1)
4. Cena + kalkulator kredita
5. Opšte informacije (10–12 polja)
6. Dodatne informacije
7. Sigurnost (checkbox)
8. Oprema (checkbox 30+)
9. Stanje
10. Kontakt (grad, telefon iza click-a, forma poruke, drugi oglasi prodavca)
11. Slobodan opis
12. Widgeti (registracija, tehnički pregled, kasko)
13. Preporučeno (slični oglasi)
14. Reklame

### 6.3 AU differentiator sekcija (dodatak PA modelu)

Ovde AU dodaje ono što niko drugi nema:

```
━━━ VERIFIKOVANA SERVISNA ISTORIJA ━━━

📋 Timeline zapisa (iz Garage grant() protoka):
   • 22.06.2026 — Marko (verifikovan mehaničar)
     Mali servis: ulje, filter ulja, filter vazduha
     Km: 145.320
   • 03.02.2026 — Goran (verifikovan mehaničar)
     Zamena kočionih pločica (prednje)
     Km: 138.100
   • ... (10 dodatnih zapisa)

📊 Trust score: 87/100
   - 12 servisnih zapisa u poslednje 3 godine
   - 92% km history pokriveno
   - 2 nezavisna mehaničara potvrdila istoriju

🔗 QR kod → read-only Driver profil vozila
```

---

## 7. Strateške implikacije za AutoUniverse

### 7.1 Marketplace ostaje Faza 5+

Istraživanje **potvrđuje** postojeću odluku iz `AUTO_UNIVERSE_MAPA_SVETA_v1.md`. Direktno takmičenje sa PA na njihovom terenu je neizvodljivo:
- 75.000+ aktivnih oglasa (pilešće/jaje problem)
- Godišnji SEO autoritet koji se ne kupuje
- Kalkulatori, integracije, checkbox oprema — očekivane funkcije koje moraš imati samo da uđeš

### 7.2 Šta preuzeti iz PA modela (validne prakse)

- **Taksonomija delova (10 potkategorija)** — koristi identičnu radi prepoznatljivosti
- **Filteri vozila** — preuzmi PA set kompletno
- **Struktura ad-a** — 14 sekcija tim redom
- **Preview shape** — slika 4:3, cena bold, godište/km/grad kao meta
- **Predefinisani quick-linkovi** — SEO strategija (svaki je landing stranica)

### 7.3 Šta NE pokušavati

- Direktorijum servisa/vulkanizera (već zauzet — PA "Auto usluge")
- Kalkulator registracije (osiguranik.com pokriva sve konkurente)
- SMS naplata (skupa infrastruktura za male količine)
- Facebook remarketing paketi (van scope-a)
- Generalni Q&A forum (mojagaraza.rs postoji)

### 7.4 Šta je AU jedinstveno (moat)

- **Verifikovana servisna istorija** kroz Garage `grant()` — jedini na tržištu
- **Cene delova/radova su privatne** (arhitekturalna odluka — vidi MAPA_SVETA)
- **Automatski prenos vlasništva** kroz VIN pri prodaji
- **QR na registraciji/oglasu** → verifikovani Driver profil vozila
- **Trust score** kao kompozit istorije + nezavisne verifikacije
- **Offline-first** (nijedan konkurent nema)

### 7.5 Preduslov za pokretanje Marketplace (Faza 5+)

Ne otvarati marketplace dok:
- ✅ Nema 3–5 aktivnih Driver korisnika sa realnom istorijom
- ✅ Nema bar 20 verifikovanih servisnih zapisa u sistemu
- ✅ Grant flow radi end-to-end kroz AU Core backend
- ✅ QR link vodi na read-only public Driver profil vozila

Bez ovih 4 uslova, marketplace je samo PA klon i nema razlog postojanja.

---

## 8. Feature-set za Marketplace MVP (kad dođe vreme)

Referentna checklista za spec Faze 5+:

```
CORE (obavezno, po PA modelu):
✓ 10–30 fotografija (4:3, do 5MB po slici)
✓ Strukturirana polja: marka, model, godište, km, karoserija, gorivo,
  kubikaža, snaga (kW/KS), menjač, pogon, boja, region, cena,
  fiksno (da/ne), zamena (da/ne)
✓ Oprema checkbox (30+ stavki — audio, klima, senzori, tempomat...)
✓ Sigurnost checkbox (ABS, ESP, airbagovi, ISOFIX...)
✓ Stanje (registrovan do, prvi vlasnik, servisna knjižica, oštećenja)
✓ Slobodan opis (do 2000 karaktera)
✓ Kontakt (grad, telefon iza click-a, forma poruke)
✓ Preview kartica po PA šablonu (4:3, badge, meta, akcije)

DIFFERENTIATOR (AU jedinstveno):
✓ Timeline verifikovanih servisnih zapisa iz Garage grant()
✓ Trust score (0–100) — kompozit istorije + verifikacije
✓ Broj nezavisnih mehaničara koji su potvrdili istoriju
✓ QR kod → public read-only Driver profil vozila
✓ % km history pokriveno servisima

MODUL TROŠKOVA (iz Driver arhitekture):
✓ Kumulativan trošak održavanja (opcija za prodavca da pokaže)
✓ Prosečan mesečni trošak goriva (opciono)

INTEGRACIJE (opciono, kasnije):
◯ Kalkulator registracije (osiguranik.com — affiliate?)
◯ Kalkulator kredita
◯ Zakazivanje tehničkog pregleda
```

**Procena rada:** 6–8 nedelja za MVP marketplace nakon što je preduslov ispunjen (vidi 7.5).

---

## 9. Actionable za Terminal Claude

Kad dođe vreme za Faza 5+ implementaciju, ovaj dokument daje:

1. **Taksonomiju delova** za Garage servisne zapise (sada) → poravnaj sa PA 10-potkategorija
2. **Referentnu strukturu preview kartice** za buduće `ads_list.html` template
3. **Referentnu strukturu detail stranice** — 14 sekcija tim redom, plus AU differentiator sekcija
4. **Checkbox liste** (oprema, sigurnost) — koristiti PA set kao inicijalni skup
5. **Filter skup** za vozila — PA osnovni + detaljni set kompletno

**Šta ne treba raditi (ušteda vremena):**
- Ne kucati sopstvenu taksonomiju delova
- Ne izmišljati sopstveni set filtera
- Ne pokušavati generalni forum ili direktorijum servisa

---

## 10. Otvorena pitanja (za dalje istraživanje)

1. **KupujemProdajem auto sekcija** — dublji pregled monetizacije i strukture (nije potpuno pokrivena zbog rate limit-a tokom istraživanja)
2. **Prodajadelova.rs** — nije detaljno analiziran (P2P marketplace delova); pokriti pre Salvage L3 razvoja
3. **Mobile app konkurenata** — PA ima iOS/Android/Huawei aplikacije; nisu analizirane; relevantno za Driver Capacitor odluku
4. **Data licenciranje** — da li PA prodaje API/podatke drugim biznisima? Nije potvrđeno
5. **Regulativa** — Zakon o zaštiti podataka o ličnosti (ZZPL), obaveze marketplace operatera; pravni okvir za Faza 5+

---

## 11. Izvori

- `polovniautomobili.com/` (naslovna, oglasi, kategorije)
- `polovniautomobili.com/usluge-promocije-oglasa`
- `polovniautomobili.com/cenovnik`
- `polovniautomobili.com/o-nama`
- `polovniautomobilihelp.zendesk.com` (help centar — cene isticanja)
- `autohub.rs/` (naslovna, kategorije, "Moja vozila")
- `mojagaraza.rs/` (naslovna, O nama)
- `autopijac.rs/` (naslovna)
- `mojauto.rs/` (naslovna)
- `nativemedia.rs/blog/kako-postaviti-oglas-na-polovne-automobile/` (spoljna analiza)
- Forum Krstarice — analiza troškova isticanja
- Media Kit PA 2026 (referenca u footer-u)

---

*Živi dokument. v1.0 — 23.07.2026.*
*Sledeća revizija: nakon istraživanja mobilnih aplikacija konkurenata ILI pre Faza 5+ spec-a, šta prvo bude.*
