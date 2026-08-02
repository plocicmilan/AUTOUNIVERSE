# KONKURENCIJA — mobilne i desktop aplikacije za vozila i servise (Srbija)

**Verzija:** 1.0
**Datum:** 23.07.2026.
**Autor:** analiza iz veb istraživanja + testerski feedback (Marko, Goran, Nikola)
**Svrha:** referentni dokument za Driver Toolbox i Garage Toolbox pozicioniranje, gap analysis, i implementacione prioritete
**Status:** living document — ažurirati u mestu kad se pojavi nov signal
**Companion dokument:** `KONKURENCIJA_v1.md` (marketplace i webshop analiza)

---

## 0. TL;DR

1. **Za Garage postoji dominantan srpski proizvod: AutoTEK** (autotek.rs, Novi Sad, od 2015). Full ERP feature-set + e-Fiskalizacija + TecDoc + HaynesPro. Cilja **profesionalne servise** — Marko i Goran nisu ta ciljna grupa.
2. **Za Driver postoji 4 konkurenta**, uključujući **zvaničnu aplikaciju Puteva Srbije** sa ugrađenim "Servisni podsetnik" modulom. Testerski feedback: **Goran zna za nju ali je ne koristi** — validacija da državna aplikacija nije stvarna pretnja u praksi.
3. **Grant flow već postoji** kroz `eknjizica.rs` (fizička predaja saobraćajne) i `myesk.rs` (očitavanje saobraćajne u servisu). Nijedan nema role-based grant sa opozivom/istekom + offline-first, što je AU differencija.
4. **AU segmentacija je jasnija:** ne uzimaš klijente od AutoTEK-a, uzimaš 10.000 Markova/Gorana koje AutoTEK nikad neće imati. Ne uzimaš klijente od eKnjizica, uzimaš one koji hoće offline + trade mode + Trip Assistant.

---

## 1. Testerski feedback (integrisan iz Viber razgovora)

Signal koji **potvrđuje ili ruši** neke pretpostavke:

| Pitanje | Odgovor | Implikacija |
|---|---|---|
| Da li testeri znaju za Putevi Srbije aplikaciju? | **Goran zna, ne koristi.** Marko/Nikola nije pitano posebno. | Državna aplikacija je *nominalno* konkurent, ali u praksi neaktivan — vozači znaju da postoji ali ne koriste "Servisni podsetnik" modul. Pretnja se degradira. |
| Da li znaju za AutoTEK? | **Ne znaju.** Znaju da "postoje neke aplikacije". | Validacija segmentacije: AutoTEK je nevidljiv na Markovom nivou (jedan majstor u garaži). AutoTEK cilja formalne servise. AU Garage cilja prostor koji AutoTEK ne pokriva. |
| Kada Marko završi servis, treba li Nikola/vlasnik da vidi zapis u Driveru? | **Da.** | Potvrđuje grant flow kao core feature. |
| Kako povezati Garage → Driver zapis? | **Dva slučaja:** (1) ako su oba registrovana — dugme za slanje preko platforme; (2) ako vlasnik nije registrovan — **QR kod ili neki način**. | Ovo je konkretan implementacioni signal — vidi sekciju 6.2 za detaljni protok. |
| Da li Nikola koristi kalkulator registracije? | **Da.** | Kalkulator registracije ulazi u P0 gap-ove za Driver v1.1. |

---

## 2. Driver-tip konkurencija (za vlasnike vozila)

### 2.1 Pregled srpskog tržišta

| Aplikacija | Ko stoji iza | Platforma | Model | Ozbiljnost pretnje |
|---|---|---|---|---|
| **Putevi Srbije** | državna kompanija | iOS + Android | besplatno (javni servis) | ⚠️ nominalno visoka, u praksi niska (feedback) |
| **E-Knjižica** | Regos Software | Android + web (eknjizica.rs) | freemium + Atlas paketi + porodični/flotni | ⚠️⚠️⚠️ direktan konkurent, ima grant flow |
| **MyESK** | privatna firma | web + mobile (myesk.rs) | dual (vlasnici + servisi) | ⚠️⚠️ direktan konkurent, cloud-based grant |
| **Servisna Knjiga** | privatna firma | web (servisnaknjiga.rs) | fizička + pravna lica | ⚠️ manji, ali postoji |
| **e-Servisna.com** | hrvatska | web + mobile | freemium | ⚠️ ne-srpski, ali dostupan |
| **Drivvo, Fuelio, aCar, Simply Auto** | strani | Android/iOS | oglasi + Pro | ⚠️ jaka baza, ali ne-srpski UX |

### 2.2 Putevi Srbije — državna aplikacija (deprioritized)

**Kompletan feature set:**
- Interaktivna mapa (stanje puteva realtime)
- Moja Ruta
- Cena putarine (kalkulator po kategoriji vozila)
- Obaveštenja (radovi, gužve)
- ENP (elektronska naplata putarine)
- Usluge (elektropunjači, WiFi)
- **Servisni podsetnik**: informacije o vozilu, podsetnici za servis/registraciju/zamenu ulja, evidencija troškova

**Zašto je pretnja teoretski velika:**
- Svaki vozač ima razlog da instalira (putarina, ENP)
- "Servisni podsetnik" je 1 tap dalje
- Besplatno, sponzorisano državnim budžetom

**Zašto je pretnja praktično mala (Goran feedback):**
- Vozači znaju da postoji, ali ne koriste "Servisni podsetnik" modul
- Državne aplikacije istorijski loše UX
- Modul je verovatno tanak — bez grant flow-a, bez integracije sa servisima
- Retko dobija nadogradnje

**Zaključak:** Ne pokušavaj da pobediš Puteve Srbije funkcionalno. Ne postoji na Markovom radaru kao alternativa.

### 2.3 E-Knjižica (Regos Software) — glavni konkurent Driver-u

**Feature-set (Google Play listing):**
- Evidencija vozila
- Servisna knjižica
- Podsetnici
- Evidencija troškova
- **Kalkulator registracije vozila** ← AU nema
- **Adresar servisa u RS** ← AU nema (statički)
- **Kupovina Atlas 24h pomoći na putu** ← monetizacijski kanal (affiliate)
- **Porodični i flotni paketi** ← B2B model

**Razlike u odnosu na Driver:**
- Fokus na *knjižicu* kao statičku evidenciju, ne na *stvarnu razmenu podataka sa mehaničarem*
- Kalkulator registracije (koji AU treba da doda)
- Statički adresar servisa (AU može da napravi dinamičan "moji servisi" iz grant istorije)
- Monetizuje kroz Atlas asistenciju (affiliate model)
- **Ima flotne pakete** — B2B ka rent-a-car, taxi, kompanije sa voznim parkovima

**Nije jasno:**
- Da li ima realan bi-direkcioni grant workflow ili je čisto self-service
- Da li podržava offline
- Cena porodičnog/flotnog paketa

### 2.4 MyESK — najbliži konceptualni konkurent

**Sistem opisan sa myesk.rs:**
> "Sistem za vođenje elektronske evidencije servisne istorije svih automobila... Svi podaci koji se upisuju u ESK su trajno i bezbedno sačuvani u MyESK sistemu koji koristi najsavremeniju cloud tehnologiju."

**Grant flow:**
> "Registrovani serviseri mogu pronaći Vašu ESK očitavanjem Vaše saobraćajne dozvole ili pretragom na osnovu registarskih oznaka (tablica) ili broja šasije Vašeg automobila. Serviseri mogu da vide kompletnu servisnu istoriju Vašeg automobila ukoliko su očitali saobraćajnu dozvolu, u suprotnom imaće pristup samo zapisima koje su oni uneli."

**Automatski prenos vlasništva:**
> "Podaci ostaju trajno sačuvani bilo da se promeni vlasnik automobila ili auto-servis."

**Diferencijator MyESK:**
- Dual registracija (vlasnici + servisi u istom sistemu)
- Ratings sistem: vlasnici ocenjuju servise, servisi se rangiraju u pretrazi
- Cloud-only, nema offline

**Konceptualna razlika u odnosu na AU `grant()`:**

| Karakteristika | MyESK | AU `grant()` |
|---|---|---|
| Proof of ownership | očitavanje saobraćajne u servisu | eksplicitan grant kroz aplikaciju |
| Trajanje pristupa | jednom očitano = trajan pristup | opciono `expires_at` |
| Opoziv pristupa | nije jasno da li postoji | eksplicitno u modelu |
| Role-based pristupi | ne (samo "servis") | eksplicitni role (servis, vulkanizer, tehnički pregled) |
| Backend | MyESK cloud | AU tvoj server |
| Offline režim | ne (cloud-only) | offline-first (tvoja arhitektura) |
| Ko inicira | servis (očitavanjem) | vlasnik ili servis + potvrda |

### 2.5 Servisna Knjiga (servisnaknjiga.rs)

- Fizička ILI pravna lica
- Neograničen broj vozila
- Fokus: čuva servisnu istoriju za sva vozila na jednom mestu
- Za pravna lica: ceo vozni park
- Manji, ali validira model

### 2.6 Globalne aplikacije koje se koriste u Srbiji

| Aplikacija | Platforma | Fokus | Napomena |
|---|---|---|---|
| **Drivvo** | iOS/Android | gorivo + servis + troškovi | najpopularniji generalno |
| **Fuelio** | Android | gorivo primarno | jako u lokalnom tracking-u goriva |
| **aCar** | Android | full auto management | konkurent Drivvo |
| **Simply Auto** | iOS/Android | full | popularan globalno |
| **Fuelly** | iOS | gorivo | ima web dashboard |
| **FIXD** | Android | + OBD-II senzor (paid) | postoji ali retko koristi |

**Zajedničke karakteristike:**
- Nemaju srpski jezik (barem ne u dobrom prevodu)
- Nemaju kalkulator srpske registracije
- Nemaju adresar srpskih servisa
- Nemaju integraciju sa lokalnim mehaničarima

**Realan rizik:** srpski power-user koji već ima Drivvo — teško će preći na Driver samo za "isto plus srpski jezik". Mora da mu doneseš nešto što Drivvo nema (trade mode, verifikovana istorija, Trip Assistant).

---

## 3. Garage-tip konkurencija (za servise)

### 3.1 AutoTEK — dominantan srpski proizvod

**Adresa:** Miće Popovića 18, 21203 Novi Sad-Veternik
**Kontakt:** 060/500-21-94, 060/500-21-98, office@autotek.rs
**Postoji od:** 2015.
**Vidljivi klijenti (parcijalni spisak, 20+):**

- **Beograd:** Kiler Auto (Zemun), Lav Auto (Čerak), Gaga Motors (Čukarica), AC Krstevski (Čukarica), Čupa Ford (Čukarica), Euro-Car (Zvezdara), BMW Stefanović (Mladenovac)
- **Novi Sad:** Beta Motors Suzuki, Gumatic doo, Auto servis Arsenov, Wagen Trade
- **Šabac:** AC BRAJIĆ, AKS DRIVE
- **Kragujevac:** Viva Company
- **Zrenjanin:** KPM Automobili, OPEL Ćircom
- **Ostali:** Carglass, AKS AUTOMOTIVE, Auto Beli (Šid), X-Tim Logistic (Bačka Topola)

**Pun feature-set:**

| Modul | Opis |
|---|---|
| Evidencija vozila | Detaljni podaci + istorija servisa + ugrađeni delovi |
| Stranke i dobavljači | Kontakt + vozni park + finansijske kartice + praćenje dužnika |
| Radni nalozi | Brz unos stranke/vozila/radova/delova iz šifrarnika + upis u e-knjižicu |
| Učinak majstora | Automatska evidencija rada + obračun zarade |
| E-knjižica | Vlasnik može pregledati svoju e-knjižicu (kroz eknjizica.rs) |
| TecDoc | Pretraga aktuelne baze delova + direktno naručivanje iz programa |
| HaynesPro | Tehničke specifikacije + ilustracije + uputstva za servisiranje |
| E-Računi dobavljača | Elektronski prijem računa; ažuran lager |
| Hotel za gume | Ulaz/izlaz/broj dana na čuvanju + pretraga po parametrima |
| Izdavanje računa | Fakture, profakture, avansni, kasa blok, gotovinski, fiskalni |
| Robno knjigovodstvo | Šifrarnici, magacini, lageri, kalkulacije, KEP knjiga, import izvoda |
| Fiskalna kasa | Direktna štampa fiskalnih računa iz programa |
| **e-Fiskalizacija** | **Sertifikovani od Poreske uprave. Bez fiskalne kase — štampa na laserskom/termalnom štampaču.** |
| Prava pristupa | Po korisniku i magacinu |
| Statistika | Troškovi, zarada na delovima/uslugama, pregled po markama/starosti/gorivu |
| Kalendar zakazivanja | Pregled po majstorima/radnim mestima, pomaže i kod naručivanja delova |
| Podsetnici & SMS | SMS iz programa (mali servis, gume, klima, akcije) |
| Štampa dokumenata | Radni nalog, račun, ponuda, atest, garancija |
| Čitač saobraćajne | Očitavanje saobraćajne + lične karte + **TecDoc pretraga sa čipa** |
| Slikanje vozila | Mobilna aplikacija sa auto-sync u desktop |
| Tehnička podrška | Telefon + email + TeamViewer + subota do 13h |
| Ažuriranje | Automatsko |

**Poslovni model:**
- 7 dana besplatna proba
- Instalacija i obuka besplatne
- Cena javno nije objavljena — verovatno mesečna licenca 40–100 €
- Dedicirani sales/support (2 telefona, radno vreme, TeamViewer)

**Ciljna grupa:** profesionalni srednji do veliki servis (formalna firma, PIB, redovna knjigovodstvena potreba, više majstora, više radnih mesta, e-fiskalna obaveza).

### 3.2 Kritični AutoTEK feature-i koji AU Garage nema

| Feature | Zašto AU nema | Alternativa/plan |
|---|---|---|
| **e-Fiskalizacija** | obavezno od 30.04.2022 za formalne servise | Marko/Goran verovatno rade neformalno → nije im potrebno; ako dodje formalni servis, kasnija integracija |
| **TecDoc katalog** | komercijalna licenca u desetinama hiljada € godišnje | Manuelni unos iz iskustva; kasnije partnership sa autohub.rs |
| **HaynesPro** | komercijalna licenca | Slično — nema šansa za direktnu integraciju |
| **Robno knjigovodstvo, KEP knjiga** | ozbiljna investicija u ERP funkcionalnost | Ne treba dok Garage ne cilja formalne servise |
| **Čitač saobraćajne (NFC/OCR)** | zahteva Android integraciju | Planirano istražiti "posle v1" (postoji u MAPA_SVETA otvorena pitanja) |

### 3.3 Kritični AutoTEK feature-i koje AU Garage može/treba da doda

| Feature | Prioritet | Napomena |
|---|---|---|
| **Kalendar zakazivanja** | P1 | Marko/Goran ovo koriste na papiru — pravo mesto za digitalizaciju |
| **SMS/Viber podsetnici klijentima** | P2 | Viber je verovatno bolji izbor — jeftinije + Marko/Goran ionako koriste za komunikaciju |
| **Učinak majstora / statistika po majstoru** | P2 | Za servise sa 2+ majstora |
| **Šifrarnici delova + osnovni lager** | P2 | Bez punog robnog knjigovodstva, samo "koje delove držim u magacinu" |

### 3.4 Kritični AU differencijatori u odnosu na AutoTEK

| Feature | AU Garage | AutoTEK |
|---|---|---|
| Platforma | PWA + Android APK (Capacitor) | Desktop (Windows) |
| Instalacija | zero-touch, PWA iz browsera | dedicirani računar u servisu |
| Radno mesto | u ruci dok radi | fiksno, unos posle rada |
| Offline režim | tvrdi uslov (offline-first) | verovatno online-first |
| Cena | freemium + jednokratno | mesečna pretplata |
| Ciljna grupa | jedan čovek, garaža, počeci | formalni servis, 5+ zaposlenih |
| Instant grant ka vlasniku | ✅ (kroz AU grant, bez SMS/saobraćajne) | ✅ (kroz eknjizica.rs, ali sa fizičkom razmenom saobraćajne) |
| Kroz AutoUniverse ekosistem | Driver + Garage + budući marketplace | samostalan servisni ERP |

---

## 4. eKnjizica.rs — grant flow analiza (za oba segmenta)

Objavljen protok pristupa (izvor: reno.rs/e-knjizica, Auto Servis Krstevski):

> "E-knjižici može da pristupa samo vlasnik, tj. onaj ko poseduje saobraćajnu dozvolu, kao i oni kojima vlasnik to dozvoli davanjem saobraćajne dozvole (auto servisu prilikom održavanja vozila). Oba podatka neophodna za pristup pišu na samoj saobraćajnoj dozvoli. Na prednjoj strani piše broj dokumenta, a na zadnjoj broj šasije. Podatke ćete dobiti i putem sms-a."

**Postojeći flow:**
1. Vlasnik dolazi u servis
2. Predaje saobraćajnu dozvolu
3. Servis očitava broj šasije + broj dokumenta
4. Sistem im daje pristup e-knjižici tog vozila
5. Vlasnik dobija pristupne podatke putem SMS-a

**Razlike u odnosu na AU `grant()`:**

| Karakteristika | eKnjizica | AU `grant()` |
|---|---|---|
| Proof of ownership | broj šasije + broj dokumenta saobraćajne (fizička razmena) | eksplicitni grant kroz aplikaciju |
| Trajanje pristupa | čini se trajno (jednom očitano = pristup) | opciono `expires_at` |
| Opoziv pristupa | nije javno da postoji | eksplicitno u modelu |
| Različiti nivoi role | ne | eksplicitni role u `grant()` (servis/vulkanizer/tehnički pregled) |
| Zavisi od AutoTEK-a | da (eKnjizica je vezan za AutoTEK klijente) | ne — bilo koji majstor sa Garage može |
| Kanal notifikacije vlasniku | SMS (skupo, tromo) | push u aplikaciji + email fallback |

**AU differencijator (tri stvari koje niko nema):**
1. **Opoziv i istek pristupa** — možeš da povučeš pristup nakon što je auto prodat, ili da limitiraš na 30 dana za jednokratnog vulkanizera
2. **Role-based pristup** — vulkanizer vidi samo gume, tehnički pregled samo dokumente, servis vidi sve
3. **Nije vezan za jedan desktop program** — AU je platform-agnostičan; bilo koji Garage user radi grant, bilo koji Driver user prima

---

## 5. Feature komparacija — sumarna tabela

### 5.1 Driver — komparacija sa srpskim tržištem

| Funkcija | AU Driver | Putevi Srbije | E-Knjižica | MyESK | Drivvo |
|---|---|---|---|---|---|
| Evidencija vozila | ✅ | ✅ | ✅ | ✅ | ✅ |
| Servisna knjižica | ✅ | ✅ | ✅ | ✅ | ✅ |
| Podsetnici (servis, registracija) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Evidencija troškova (7 kategorija) | ✅ (planirano) | ✅ | ✅ | ? | ✅ |
| **Kalkulator registracije** | ❌ (P0 gap) | ? | ✅ | ? | ❌ |
| **Adresar servisa** | ❌ | ❌ | ✅ (statički) | ✅ | ❌ |
| Verifikovana istorija od mehaničara | ✅ (grant) | ❌ | ✅ (eKnjizica flow) | ✅ (očitavanje saobraćajne) | ❌ |
| Trip Assistant (kontekstualan) | ✅ (planirano) | delimično (mapa/ruta) | ❌ | ❌ | ❌ |
| **Reseller/trade mode** | ✅ | ❌ | ❌ | ❌ | ❌ |
| Automatski prenos vlasništva | ✅ (planirano) | ❌ | ❌ | ✅ | ❌ |
| **Offline-first arhitektura** | ✅ | ? | ? | ❌ (cloud) | delimično |
| Cloud slike | ✅ (R2 planirano) | ❌ | ✅ (Atlas paket) | ✅ | ✅ (Pro) |
| **Porodični/flotni paketi** | ❌ | ❌ | ✅ | ❌ | ✅ |
| Srpski jezik + srpski UX | ✅ | ✅ | ✅ | ✅ | ❌ (delimično) |
| 24h asistencija (affiliate) | ❌ | ❌ | ✅ (Atlas) | ❌ | ❌ |

**Ključni gap-ovi za Driver v1.1:**
- Kalkulator registracije (P0 — Nikola koristi taj feature)
- "Moji servisi" adresar (dinamički iz grant istorije — jeftin)

**Realni AU differencijator:**
- Trade/reseller mode (niko nema)
- Trip Assistant kontekstualan (niko nema)
- Offline-first (svi ostali online-only ili delimično)
- Role-based grant sa istekom/opozivom (niko nema)

### 5.2 Garage — komparacija sa AutoTEK

Vidi sekciju 3.2 i 3.3 za detaljni gap analiza. Sumarno:

**AutoTEK ima što AU nema:**
- e-Fiskalizacija (sertifikovano)
- TecDoc + HaynesPro katalozi
- Robno knjigovodstvo + KEP knjiga
- Čitač saobraćajne + lične karte

**AU Garage ima što AutoTEK nema:**
- PWA + zero-touch install
- Offline-first arhitektura
- Cena za jednog čoveka (segment ispod AutoTEK-a)
- Kroz AutoUniverse ekosistem (Driver + budući marketplace)
- Instant grant ka Driver-u bez SMS/saobraćajne gimnastike

---

## 6. Konkretne implementacione preporuke

### 6.1 Kalkulator registracije za Driver (P0)

**Zašto:** Nikola koristi taj feature. E-Knjizica ga ima. Formula je javna (osiguranik.com i super-registracija-vozila.rs).

**Šta:** Kalkulator prima godište, zapreminu, snagu, gorivo (benzin/dizel/elektro/plin) → vraća cenu registracije od–do.

**Kako:**
- Ekstraktovati aktuelnu formulu iz osiguranik.com kalkulatora (javno dostupno)
- Formule se menjaju jednom godišnje (uskladiti sa osiguravajućim zakonom)
- Ugraditi u Driver kao standalone screen ili kao widget u detalje vozila
- Fallback: prikaz "Poslednji update: DD.MM.GGGG — proveri na osiguranik.com za tačan iznos"

**Napomena:** cene registracije nisu iste za sve regione (postoje razlike zavisno od komunalne takse), pa kalkulator treba da traži i grad ili da vrati opseg.

### 6.2 Grant flow Garage → Driver — implementacioni protok

**Feedback od Milana:** dva slučaja — (1) oba registrovana, (2) samo Garage registrovan.

**Slučaj 1: oba registrovana**

```
1. Marko (Garage) završava radni nalog za Nikolino vozilo.
2. Klikne "Pošalji vlasniku".
3. Sistem provera: postoji li Driver user sa tim VIN-om u sistemu?
   → DA: kreiraj grant(Marko, Nikola, VIN, "servis", NULL) automatski
4. Nikola dobija push notifikaciju u Driver:
   "Marko je završio servis za Golf 6 — pogledaj detalje"
5. Nikola klikne → vidi zapis + fotografije + opciono cenu (PDF, samo ako je Marko dao)
6. Nikola ostavlja "trust marker" (potvrdio zapis) — trust score raste
```

**Slučaj 2: vlasnik nije registrovan (Marko još uvek koristi Garage)**

**Opcija A — QR kod (najbolji balans UX-a i sigurnosti):**

```
1. Marko završava radni nalog.
2. Klikne "Podeli sa vlasnikom".
3. Sistem generiše jednokratni URL: 
   autouniverse.rs/share/{token}
   token = kratkotrajan (npr. 30 dana), vezan za konkretan grant + VIN
4. Marko štampa QR kod na PDF računu (već postoji jsPDF PDF flow).
   ILI: pošalje link Viber-om (svakako komunicira Viber-om).
5. Nikola skenira QR / klikne link:
   a. Vidi read-only stranicu sa zapisom + fotkama (bez logina)
   b. CTA: "Instaliraj Driver Toolbox da sačuvaš istoriju vozila"
   c. Ako instalira → link postaje "automatski povuci" u njegov nalog
6. Grant se stalno konvertuje kad Nikola instalira Driver i registruje vozilo.
```

**Opcija B — magic link kroz email/SMS:** treba samo email/telefon → magic link u inbox. Ali:
- SMS košta (integracije + jedinice)
- Email traje duže (spam folder)
- Manje "trenutno wow" nego QR kod
- **Preporučujem QR + Viber link kao primarni put** (Milanova originalna ideja iz razgovora)

**Zašto je ovo bolje od eKnjizica flow-a:**
- Ne treba fizička saobraćajna dozvola
- Ne treba SMS gateway
- Trenutan feedback za korisnika (skenira, vidi rezultat u 2 sekunde)
- Radi u zabačenom mestu bez signala (QR je štampan)
- Konverzija ka aplikaciji je organska: "vidim ovo, hoću još"

**Ovo je konkretan differencijator — vredan zasebnog blog posta / marketinga kad bude vreme.**

### 6.3 Kalendar zakazivanja za Garage (P1)

Marko/Goran ovo trenutno vode na papiru ili telefonu (screenshotovi). AutoTEK ga ima kao core feature.

**Minimum viable feature:**
- Ekran "Zakazani termini" sa kalendarom (dnevni + nedeljni view)
- Novi termin: klijent + vozilo + kratak opis + datum/vreme + procenjeno trajanje
- Notifikacija dan pre (in-app + opciono Viber preko copy-paste)
- Klik na termin → otvara postojeći ili novi radni nalog

**Ne raditi (bar ne odmah):**
- Automatski SMS klijentima (Viber je bolji, ali treba manuelno slanje)
- Multi-majstor pregled (Marko/Goran su solo)
- Naručivanje delova iz kalendara (AutoTEK ima, ali to je TecDoc integracija)

### 6.4 "Moji servisi" — dinamički adresar za Driver (P2)

E-Knjizica ima statički adresar servisa. AU može bolje: dinamički adresar iz `grant()` istorije.

**Kako funkcioniše:**
- Kad Nikola dobije prvi zapis od Marka kroz grant(), Marko se automatski pojavljuje u "Moji servisi"
- Meta: naziv servisa, grad, telefon, poslednji rad (datum + opis), broj radova ukupno
- Filter: "Koji servisi rade na Golf 6?" — pretraga po istoriji

**Zašto je bolje od statičkog adresara:**
- Uvek tačno (svaki unos je verifikovan grant-om)
- Uvek relevantno (samo servisi kod kojih si stvarno bio)
- Ne treba održavati bazu 500 servisa u Srbiji manuelno

**Napomena:** ovo NE zamenjuje pretragu servisa u nepoznatom gradu (kad si na putu). Za to je Trip Assistant.

### 6.5 Šta NE raditi (izbaciti iz roadmap-a)

- **Sopstveni TecDoc/HaynesPro** — komercijalne licence u desetinama hiljada €
- **Sopstveno robno knjigovodstvo + KEP knjiga** — ozbiljna investicija, cilja segment koji nije tvoj
- **Sopstvena e-Fiskalizacija** — obimna sertifikacija, ne treba za Markov segment
- **Statički adresar servisa** — E-Knjizica ga ima, ne uzimaš tržište time; dinamički adresar iz grant istorije je bolji
- **Sopstveni SMS gateway** — Viber je već tu

---

## 7. Ažurirana pozicioniranja i marketinške poruke

Nakon ove analize, prava priča prema testerima i budućim korisnicima:

### 7.1 Za Driver (vlasnike vozila)

> "Srpska aplikacija za praćenje vozila — sa razlikom: kad tvoj mehaničar unese servis, ti to odmah vidiš u aplikaciji. Kad prodaješ auto, kupac vidi verifikovanu istoriju bez povika 'servisna knjižica je izgubljena'. Radi offline. Podržava trade/reseller mode ako preprodaješ vozila."

**Ključni marketing hooks:**
- "Verifikovana servisna istorija — direktno od mehaničara"
- "Radi bez neta" (offline-first)
- "Za vozače koji menjaju automobile" (trade mode — niko nema)
- "Trip Assistant za putovanja" — kad krećeš na put, sve ti je na jednom mestu

### 7.2 Za Garage (mehaničare)

> "Za jednog čoveka u garaži, ne za velike servise. Radi na telefonu, u dvorištu, bez neta. PDF računi za klijente. Kad vlasnik dođe sledeći put, već zna šta si radio. Za pola cene AutoTEK-a. Kad ti zatreba fiskalna kasa i TecDoc, prelaziš na AutoTEK — mi smo za onaj deo pre toga."

**Ključni marketing hooks:**
- "Radi na telefonu, ne na računaru"
- "Radi bez neta u garaži"
- "Zamenjuje papir i telefon, ne knjigovodstveni program"
- "Klijenti dobijaju svoj digital record trenutno kroz QR ili aplikaciju"

---

## 8. Otvorena pitanja za dalje istraživanje

1. **Cena AutoTEK-a** — javno nije objavljena. Trebalo bi kontaktirati office@autotek.rs sa lažnom pričom o "probnom periodu" ili preko postojećih klijenata (Kiler Auto, Beta Motors, itd.) da se dobije stvarna cena mesečno.
2. **MyESK grant flow** — nije jasno da li ima opoziv pristupa i kako se transferuje pri promeni vlasnika. Trebalo bi napraviti test nalog i proći kroz flow.
3. **E-Knjizica flotni paketi** — cena i feature-set nije javan. Bitno za buduću B2B monetizaciju AU (rent-a-car, taxi).
4. **Putevi Srbije "Servisni podsetnik"** — potvrdiiti sa još 2-3 vozača (ne samo Goran) da niko ne koristi. Ako niko ne koristi, potvrdno je nivo pretnje "0".
5. **Sertifikacija za e-Fiskalizaciju** — koliko traje, koliko košta, koje su tehničke zavisnosti. Kritično pre nego što se cilja formalne servise.
6. **TecDoc licenca** — cena za srpsko tržište, minimum volume, tehnički zahtevi za integraciju.

---

## 9. Konkretne akcije za sledeći sprint

1. **Ažurirati BRIEFING.md** sa ovim nalazima i testerskim feedback-om
2. **Ažurirati AUTO_UNIVERSE_MAPA_SVETA_v1.md** — dodati Segmentaciju sekciju sa jasnim "AU cilja segment ispod AutoTEK-a" pozicioniranjem
3. **P0 za Driver v1.1**: Kalkulator registracije (6h rada)
4. **P0 za Garage v1.19**: QR + link share flow (grant flow za neregistrovanog vlasnika)
5. **P1 za Garage v1.20**: Kalendar zakazivanja
6. **Testerska pitanja za Viber** (na FEEDBACK.md):
   - Marko/Goran: "Koji je najgori deo tvog trenutnog toka rada koji Garage još ne rešava?"
   - Nikola: "Koje sve informacije o autu bi hteo da vidiš kad ti Marko pošalje servisni zapis?"
   - Svima: "Da li koristite Putevi Srbije aplikaciju? Šta u njoj?" (potvrda Goranovog signala)

---

## 10. Izvori

**Direktan istraživanje (fetch/search):**
- `autotek.rs` (naslovna + opcije programa + klijenti)
- `eknjizica.rs` (naslovna + kontakt + adresar)
- `myesk.rs` (naslovna + Šta je ESK)
- `servisnaknjiga.rs` (naslovna)
- `apps.apple.com/us/app/putevi-srbije` (App Store listing)
- `play.google.com/store/apps/details?id=com.regossoftware.esb` (E-Knjižica na Google Play)
- `reno.rs/e-knjizica/` (Auto Servis Krstevski — objašnjenje protoka)
- `super-registracija-vozila.rs/vesti/75/aplikacija-eknjizica` (spoljna analiza)

**Referentne aplikacije:**
- Drivvo, Fuelio, aCar, Simply Auto, Fuelly, FIXD (globalni), CARFAX Car Care
- Tekmetric, Shopmonkey, Mitchell 1, AutoLeap (globalni Garage-tip)

**Testerski feedback:**
- Goran (Viber, 23.07.2026): Putevi Srbije aplikacija — zna, ne koristi
- Marko/Goran (Viber, 23.07.2026): ne znaju za AutoTEK, znaju "da postoje neke aplikacije"
- Nikola (Viber, 23.07.2026): koristi kalkulator registracije
- Milan (odluka, 23.07.2026): grant flow Garage → Driver — dva slučaja (registrovan + QR/link za neregistrovanog)

---

*Živi dokument. v1.0 — 23.07.2026.*
*Sledeća revizija: nakon istraživanja AutoTEK cena + MyESK grant testa ILI pre P0 kalkulator registracije implementacije, šta prvo bude.*
