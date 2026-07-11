# DEPLOY — Garage Toolbox na internet i telefone

Aplikacija je gotova (Sesije 1–5). Ovde je kako da je objaviš i instaliraš.
Ceo posao je jednokratan, ~15 minuta.

---

## Deo 1 — GitHub (čuvanje koda + besplatan hosting)

### Ako koristiš GitHub Desktop (lakše, preporuka za početak)
1. Napravi nalog na github.com (besplatan)
2. Instaliraj **GitHub Desktop** (desktop.github.com)
3. File → Add Local Repository → izaberi folder `auto-universe`
4. Ako pita "create a repository" — potvrdi (name: `auto-universe`)
5. Dole levo upiši poruku "Sesije 1-5" → **Commit to main**
6. Gore desno **Publish repository** (možeš ostaviti privatno ili javno)

### Ako koristiš komandnu liniju
```bash
cd auto-universe
git init
git add .
git commit -m "Garage Toolbox — sesije 1-5"
git branch -M main
git remote add origin https://github.com/TVOJE-IME/auto-universe.git
git push -u origin main
```
(GitHub će tražiti login jednom u browseru.)

> **Nikad ne stavljaj lozinke ni tokene u kod.** Config `product_id` je prazan
> dok Gumroad proizvod ne postoji — to je u redu.

---

## Deo 2 — Objavi kao sajt (GitHub Pages)

Aplikacija je u pod-folderu `garage/`, zato je bitna putanja.

1. Na GitHub-u: repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → Branch: **main** → folder: **/ (root)** → Save
3. Za minut-dva dobiješ link tipa: `https://TVOJE-IME.github.io/auto-universe/`
4. **Aplikacija je na:** `https://TVOJE-IME.github.io/auto-universe/garage/`

> Ako radije Cloudflare Pages: poveži repo, build command prazan,
> output folder `/` (nije potreban build — čist static).

---

## Deo 3 — Instalacija na telefon ("Add to Home Screen")

Otvori link aplikacije (`.../garage/`) u browseru telefona:

### Android (Marko) — Chrome
- Meni (⋮) → **Add to Home screen** / "Instaliraj aplikaciju"
- Ikona se pojavi kao prava aplikacija, radi offline

### iPhone (Goran) — obavezno **Safari**
- Dugme Share (kvadrat sa strelicom) → **Add to Home Screen**
- (Na iOS-u samo Safari ume PWA install — ne Chrome)
- Zbog Safari ograničenja: **redovno pravi Backup** (Settings → Izvezi)

---

## Deo 4 — Prvi put u aplikaciji

1. **Settings → Profil:** ime/naziv radnje + telefon (ide na PDF)
2. **Settings → Licenca:** unesi `TEST-UNLOCK` → sve otključano (za tebe, Marka, Gorana)
3. **Settings → valuta:** RSD ili EUR (svaka stavka i dalje može svoju valutu)
4. Dodaj kontakt → dodaj vozilo sa tehničkom karticom → napravi prvi nalog

---

## Ažuriranje kasnije (kad pravimo v1.1)

1. Zameni fajlove novom verzijom
2. Commit + push (Desktop: Commit → Push; CLI: `git add . && git commit -m "v1.1" && git push`)
3. **Podigni broj keša** u `garage/sw.js` (npr. `v1.4.0` → `v1.5.0`) — inače telefoni
   drže stari keš. Ovo je jedini "gotcha".
4. Telefoni pokupe novo pri sledećem otvaranju (uz internet)

---

## Checklist pre deljenja Marku i Goranu

- [ ] Otvara se na tvom telefonu, offline radi (uključi avion mod pa probaj)
- [ ] Napravljen probni nalog, PDF izlazi sa tvojim imenom i tačnim zbirom
- [ ] Backup izvezen i ponovo uvezen (posebno na iPhone-u)
- [ ] Naša slova (š, ć, č) ispravna na PDF-u
- [ ] TEST-UNLOCK otključava podsetnike i skida watermark

Kad ovo prođe — šalji link Marku i Goranu i skupljaj feedback (Faza 3).

---

## DODATO — Driver Toolbox (druga aplikacija, isti repo)

Driver je u istom repozitorijumu, u folderu `driver/` (kao Garage u `garage/`). Ne treba
novi repo ni novi hosting — kad push-uješ, obe aplikacije se objave na istom sajtu.

**Linkovi posle deploy-a (GitHub Pages):**
- Garage: `https://TVOJE-IME.github.io/auto-universe/garage/`
- Driver: `https://TVOJE-IME.github.io/auto-universe/driver/`

Svaka se instalira zasebno preko "Add to Home Screen" (dve odvojene ikone na telefonu).

**Bitno — deljena baza na istom pregledaču:** Garage i Driver dele lokalnu bazu ako se
otvore na ISTOM telefonu/pregledaču (isti origin). U praksi: Marko drži Garage na svom
telefonu, vlasnik Driver na svom → nema preklapanja. Ako TI testiraš obe na istom
telefonu, videćeš ista vozila u obe — to je očekivano za sada (vidi FEEDBACK #2).

### Checklist za Driver na telefonu (Faza 3)

- [ ] Otvara se, offline radi (avion mod)
- [ ] Dodaj vozilo → "Unesi početno stanje" → servis sa "približnim" datumom + rok registracije
- [ ] Retroaktivni zapis u Istoriji je prigušen, sa oznakom "unet naknadno" i ⚪ ikonom
- [ ] Rok registracije se pojavi u Podsetnicima sa bojom po hitnosti
- [ ] Slika računa na događaju → zapis postaje 🟣 (receipt)
- [ ] Dokument (slika saobraćajne) se sačuva i vidi u DOKUMENTA
- [ ] TEST-UNLOCK → dugme "Dosije vozila" pravi PDF sa celom istorijom i našim slovima
- [ ] Backup izvezen i uvezen (posebno iPhone)

### Garage v1.1 (isti push)

Garage je dobio dugme **"+ Raniji unos (istorija)"** na kartonu vozila — Marko sad može
da zabeleži šta je već rađeno na vozilu pre aplikacije (retroaktivno, sa slikom računa).
Keš je podignut na `v1.5.0`, pa će Markov telefon pokupiti novo pri sledećem otvaranju uz
internet. To je bio feedback #1 — sad rešen u obe aplikacije.
