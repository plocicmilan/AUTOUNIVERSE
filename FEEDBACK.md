# AUTO UNIVERSE — FEEDBACK & DORADE

Živa lista signala iz stvarnog korišćenja (Faza 3). Svaka stavka: ko je prijavio,
šta, u koji sloj ide (**core** = dele sve aplikacije / **app** = samo jedna), i status.

Pravilo: kad krene v1.1, radi se redom sa vrha. Ništa se ne kodira dok nije ovde.

Legenda statusa: 🔵 novo • 🟡 u analizi • 🟢 za v1.1 • ✅ urađeno • ⚪ odbačeno

---

## Otvoreno

| # | Stavka | Izvor | Sloj | Aplikacije | Status |
|---|--------|-------|------|-----------|--------|
| 1 | **Početno stanje vozila (retroaktivni unos istorije).** Nova aplikacija/prazan karton — vlasnik/majstor uzima vozilo "iz sredine" života i mora da unese zatečeno stanje: trenutna km, poslednji servis (datum + km), rok registracije/tehničkog, gume. | Marko (Garage) | **core** (Event model) | Garage + Driver | ✅ URAĐENO u OBE app — core Event polja + Driver wizard (S2) + Garage "Raniji unos" (v1.1) + retroaktivni trust prikaz |
| 2 | **Deljena IndexedDB baza između aplikacija na istom origin-u.** Odlučiti: Garage i Driver dele bazu (platform seme) ili se razdvajaju (namespace po app-u) — pre platform faze. Ne menjati sad (obrisalo bi Markove podatke). | Claude (build) | core (store) | sve | 🟡 u analizi |

### Detalji — Stavka #1

**Problem:** karton kreće od nule, a vozilo ima istoriju iza sebe. Bez početnog
stanja podsetnici ne mogu da rade (ne zna se kad je sledeći servis / rok).

**Rešenje (bez novog entiteta):** retroaktivni unos je običan EVENT sa datumom u
prošlosti. Dodaje se samo:

- vrednost izvora `source: "initial"` (ili flag `retroactive: true`) → niži nivo
  poverenja u Trust sloju; ako se priloži slika starog računa → prelazi u `"receipt"`.
- **fleksibilan datum**: dozvoliti samo mesec/godinu ili "pre ~6 meseci / na ~20.000 km"
  (niko ne pamti tačan datum — ako tražiš tačan, ljudi ne unesu ništa).
- u timeline-u vizuelno drugačiji (sivlji, oznaka "unet naknadno").

**Onboarding (Driver):** posle osnovnih podataka o vozilu → opcioni, preskočivi korak
"Početno stanje": km + poslednji servis + rokovi + gume. Minimum koji odmah pali podsetnike.

**"Iskopaj fioku" tok:** korisnik bilo kad slika stare račune/garancije → svaki postaje
retroaktivni događaj. Istorija raste unazad postepeno, umesto zida od 20 pitanja na startu.

---

## Zatvoreno

*(prazno — prva v1.1 stavka još nije odrađena)*

---

*Otvoreno: 10.07.2026. — Garage v1 na terenu kod Marka, čeka se dalji feedback.*
