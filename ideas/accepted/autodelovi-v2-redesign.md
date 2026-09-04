# Autodelovi v2 — Redesign Plan

**Datum:** 2026-09-04  
**Izvor:** Istraživanje autohub.rs + polovni-autodelovi.rs + Zakon o elektronskoj trgovini  
**Status:** 🟢 accepted — čeka implementaciju  

---

## Kontekst

Trenutni Autodelovi (v1) je MVP: 11 kategorija, seller_token bez naloga, minimalna polja oglasa.  
Istraživanjem tržišta (autohub.rs — 28 kategorija, polovni-autodelovi.rs — 24 kategorije, 32.000+ oglasa) utvrđeno šta treba za v2.

---

## 1. Kategorije delova (proširiti sa 11 na 24)

### Zadržati (iz v1):
- Motor i mehanički delovi
- Menjači
- Kočioni sistem
- Elektrika i elektronika
- Karoserija, šasija i limarija
- Vešanje i amortizeri
- Gume
- Klima, grejanje i ventilacija
- Svetla i signalizacija
- Enterijer
- Razni delovi

### Dodati (novo):
- Airbagovi i pojasevi
- Audio oprema i multimedija
- Auto staklo (bočno, prednje, zadnje)
- Branici i spojleri
- Felne i ratkapne *(odvojiti od Guma)*
- Izduvni sistem (auspuh, DPF filteri, katalizatori)
- Ključevi i brave
- Kompletan auto u delovima *(velika kategorija — ceo auto ide za delove)*
- Zaptivači i brtve
- Alati i auto oprema
- Rezervni i servisni delovi *(novi, originalni, OEM)*
- Trap i vešanje *(odvojiti od Vešanje i amortizeri)*
- Usluge *(montaža, dijagnostika, demontaža)*

**Podkategorije (primeri za Motor):**
Kompletan motor / Blok motora / Glava motora / Boš pumpa / Bregasta osovina / Cevi i creva / Dizne / EGR ventil / Turbo / Alternator / Starter

---

## 2. Polja oglasa (novo — proširiti schema)

### Obavezna polja:
| Polje | Tip | Opis |
|---|---|---|
| `naziv` | text | Slobodan, npr. "Motor 1.9 TDI BLS" |
| `kategorija` | enum | Iz liste kategorija |
| `podkategorija` | enum | Zavisno od kategorije |
| `marka_vozila` | enum | VW, Mercedes, Opel... |
| `model_vozila` | text | Golf 5, E 220... |
| `godiste_od` | int | Raspon godišta za koje odgovara |
| `godiste_do` | int | |
| `stanje` | enum | Polovno / Novo / Renovirano / Neispravan |
| `cena` | int ili null | EUR; null = "Cena na upit" |
| `lokacija` | text | Grad |
| `opis` | text | Slobodan tekst |
| `slike` | array | Min 1, max 10 |

### Opcionalna polja (preporučena za ključne kategorije):
| Polje | Tip | Kada |
|---|---|---|
| `sifra_motora` | text | Motor, menjač, turbina — npr. BLS, OM651 |
| `km_dela` | int | Koliko km je deo imao kad je skinut |
| `odgovara_i_za` | text[] | Ostale marke/modeli — npr. ["Audi A3 8P", "Seat Leon 1P"] |
| `kataloški_broj` | text | OEM/OE broj — za nove ili originalne delove |
| `dostava` | bool | Da/Ne |
| `zamena` | bool | Prihvatam zamenu Da/Ne |

### Prikaz na oglasu:
- Badge: **POLOVNO / NOVO / RENOVIRANO**
- Cena istaknuta ili **"Cena na upit"**
- Marka + Model + Godište uvek vidljivi
- Broj telefona maskiran dok se ne klikne (anti-spam)
- Profil prodavca: ime, datum registracije, broj oglasa

---

## 3. Pravni okvir — Oglasna tabla

### Šta mora biti na sajtu (Zakon o elektronskoj trgovini RS):

**Footer na svakoj stranici:**
> "Autodelovi.autouniverse.rs ne odgovara za tačnost sadržaja oglasa. Tačnost podataka je isključivo odgovornost lica koje je postavilo oglas. Svako ugovaranje i realizacija kupoprodajnog posla je direktna saglasnost volje između kupca i prodavca — platforma nije strana u transakciji i ne naplaćuje proviziju."

**Stranice koje treba kreirati:**
1. `/o-nama` — "Šta je Autodelovi" + da smo oglasna tabla bez provizije
2. `/uslovi-koristenja` — odricanje od odgovornosti, zabrana lažnih oglasa, pravo na brisanje
3. `/politika-privatnosti` — GDPR: šta čuvamo, koliko dugo, pravo brisanja
4. `/kontakt` — forma za prijavu zloupotrebljavajućih oglasa

**Ključno:** Sve dok ne naplaćujemo proviziju i ne posredujemo u plaćanju → nismo obavezni da se registrujemo kao e-commerce operator. Ako ikad dođe do naplate → postajemo regulisani (PDV, e-fiskalizacija).

---

## 4. Registracija — Unified model (Opcija A)

### Odluka: Jedan nalog za ceo AU ekosistem.

**Ko se registruje na Autodelovi → dobija AU Core nalog automatski.**

Prednosti:
- Prodavac može upravljati oglasima (edit, delete, obnovi)
- Isto korisničko ime/lozinka za Hub, Garage, Driver cloud sync
- Bolja zaštita od spam oglasa (nalog može biti banovan)
- Istorija prodaje vidljiva na profilu
- Budući: notifikacije kad neko pošalje poruku za oglas

### Registracija flow:
```
Postavi oglas → [Prijavite se / Registrujte se] → AU Core auth
     ↓ (posle login-a)
Forma oglasa → Postavi → Oglas live
```

### Za kupca (bez naloga):
- Može pregledati sve oglase
- Može vidjeti broj telefona (klikne → otkriva se)
- Može slati poruku prodavcu SAMO ako je ulogovan

### Seller token (v1) — šta raditi:
- Stare oglase sa seller_tokenom ostaviti da rade do isteka (30 dana)
- Novi oglasi → samo sa nalogom
- Migracija: ne automatska, neka prodavci repostuju

---

## 5. Implementacioni redosled (preporuka)

| Korak | Šta | Prioritet |
|---|---|---|
| 1 | Proširiti kategorije u DB schema i UI | VISOKO |
| 2 | Dodati nova polja u `parts` tabelu | VISOKO |
| 3 | Forma za postavljanje oglasa — sa nalogom | VISOKO |
| 4 | Stranice /o-nama, /uslovi, /privatnost, /kontakt | VISOKO |
| 5 | Footer disclaimer | VISOKO |
| 6 | Seller profil stranica (oglasi prodavca) | SREDNJE |
| 7 | Maskiranje telefona + "Prikaži broj" | SREDNJE |
| 8 | Podkategorije za Motor i mehanički delovi | SREDNJE |
| 9 | Poruke između kupca i prodavca (inbox) | NISKO |
| 10 | Promoted oglasi (monetizacija — čeka 100+ oglasa) | NISKO |

---

## Reference

- [autohub.rs](https://autohub.rs) — B2C katalog novih delova (28 kategorija, Inspira Grupa)
- [polovni-autodelovi.rs](https://polovni-autodelovi.rs) — P2P polovna (24 kategorije, 32.000+ oglasa)
- [Zakon o elektronskoj trgovini RS](https://www.paragraf.rs/propisi/zakon_o_elektronskoj_trgovini.html)
