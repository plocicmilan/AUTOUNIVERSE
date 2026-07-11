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
| 3 | **Multi-user signal — jedan permission primitiv rešava sve.** (A) Marko+Pavle: ista radionica. (B) Marko+Goran: povremena saradnja. (C) Vlasnik→majstor. Sva tri = `grant(user, target, vehicle, role, [expires])`. Team je automatizam preko primitiva, ne poseban entitet. Obaveza: implementirati kao jedinstveni primitiv od dana 1 AutoHub-a. | Marko (Garage) | **platform** | Garage (sad) + AutoHub (kasnije) | 🟢 za AutoHub S6 |
| 4 | **Reverse marketplace — "objavi potrebu → dobavljači se takmiče".** Parts, servisi, šlep, gume, polovni delovi. Nije signal sa terena, hipoteza iz razmišljanja. Puna analiza + uslovi aktivacije u `ideas/hypothesis/2026-07-11_reverse_marketplace.md`. | Desktop Claude (razmišljanje) | platform | AutoHub + Marketplace modul | ⚪ hipoteza — Faza 6+, ne pre uslova |

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
*Ažurirano: 2026-07-11 — Driver v1 live, stavka #3 (Marko + Pavle multi-user signal).*

### Detalji — Stavka #3

**Problem:** Marko i Pavle rade na istom vozilu. Marko upiše radni nalog u Garage,
Pavle ga ne vidi jer je Garage standalone i lokalan na Markovom telefonu. Trenutno
rešavaju tako što Marko šalje PDF preko Vibera — funkcioniše, ali nije istorija,
nego poruka.

**Zašto je važno:** ovo je prvi realan multi-user signal iz terena. Do sada je
Mapa sveta pretpostavljala da će vlasnici prvi tražiti povezivanje ("hoću da vidim
šta je majstor upisao"). Marko+Pavle pokazuje da **mehaničari mogu prvi da
signaliziraju potrebu za platformom**, pre vlasnika. To je iznenađujuće — i dobro,
jer su mehaničari ti koji plaćaju.

**Razjašnjenje (2026-07-11):** Nije A ili B — oba scenarija postoje za istog mehaničara:

- **(A) Marko + Pavle — ista radionica.** Dele mušterije, dele vozila, jedan biznis. Treba da vide sve zajedno stalno.
  → arhitektura: team account, deljena Garage baza, uloge (šef/radnik)

- **(B) Marko + Goran — različite radionice.** Goran ima svoju radionicu. Povremeno sarađuju na istom vozilu — Marko uradi jedno, Goran uradi nešto drugo, a ni jedan ni drugi ne znaju šta je drugi radio.
  → arhitektura: deljenje po vozilu, ne po radionici — Marko "pozove" Gorana na konkretan karton

**Ključni uvid:** vozilo je centralni entitet — potvrđeno iz terena. Karton vozila mora primati zapise od više izvora (Marko, Goran, vlasnik) i svaki zapis zna odakle je (`source`, `app` polja na EVENT-u već postoje upravo za ovo).

**Šta radimo sad:** ništa se ne kodira. Oba scenarija su zabeležena. AutoHub mora podržati oba modela — team (A) i per-vehicle sharing (B). Čeka Faza 3 + drugi slični signali.

**Privremeni radni tok:** Marko šalje PDF Pavlu/Goranu na Viber — ostaje kako jeste.

**Status flow:** 🔵 novo → 🟡 u analizi (aktivno, arhitektura poznata) → 🟢 za AutoHub MVP

---

### Ažuriranje 2026-07-11 — Desktop Claude arhitektonska sinteza

**Signal je otkrio da platformi treba samo JEDAN mehanizam dozvola, ne tri.**

Do sada su tri scenarija tretirana kao tri problema:
1. Vlasnik → mehaničar (vlasnik daje pristup majstoru)
2. Marko + Pavle (tim u istoj radionici)
3. Marko + Goran (povremena saradnja različitih radionica)

Marko+Goran forsira uvid: **sva tri su ista stvar sa različitim UX-om.**

**Primitiv (jedini permission model u AutoHub-u):**

```
grant(user_A, user_B, vehicle_id, role, [expires_at])
```

**Sve ostalo je UX preko istog primitiva:**

| Slučaj | Grant izraz |
|---|---|
| Vlasnik daje pristup majstoru | `grant(vlasnik, majstor, vozilo, "write")` |
| Marko poziva Gorana na jedan posao | `grant(Marko, Goran, vozilo, "write", +7 dana)` |
| Tim Marko+Pavle | auto-grant Pavlu na svako novo vozilo koje Marko doda |
| Buduće: vulkanizer vidi samo gume | `grant(vlasnik, vulkanizer, vozilo, "write-tires-only")` |

**Team accounts NISU poseban entitet.** Team je pravilo koje kaže "kad Marko doda novo vozilo, automatski dodeli Pavlu istu ulogu". Sintaktički šećer preko per-vozilo dozvola.

**Zašto je ovo odluka za dan 1 AutoHub-a:**
Ako AutoHub počne od "team accounts" kao primarni model, Marko+Goran postaje naknadna komplikacija koja se teško lepi. Ako AutoHub počne od `grant()` primitiva — sve slučajeve rešava jedan mehanizam, uključujući buduće koji još nisu identifikovani.

**Obaveza za AutoHub Sesiju 6 (dan 1):**
Permission model se gradi kao jedinstveni `grant()` primitiv od početka, ne kao naknadna dogradnja preko team account-a. Zapisano ovde da bi buduća sesija imala eksplicitnu obavezu.

**Status:** 🟡 u analizi → 🟢 za implementaciju u AutoHub Sesiji 6 (permission model dan 1)
