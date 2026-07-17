# Garage Toolbox — Instalacija na Android (Play Protect upozorenje)

**Za:** Marko, Goran i sve koji instaliraju APK direktno (sideload)  
**Problem:** Android prikazuje upozorenje "Nebezbedna aplikacija" ili "Play Protect je blokirao ovu app"

---

## Zašto se ovo dešava

Google Play Protect automatski skenira svaku APK koja se instalira van Play Store-a. Ovo **nije greška u aplikaciji** — Garage Toolbox je bezbedan. Google jednostavno ne zna za app koja nije prošla njihov pregled ($25 jednokratno).

---

## Kako instalirati (korak po korak)

### Korak 1 — Dozvoli instalaciju iz nepoznatih izvora

Na Androidu 8+:

1. Otvori **Podešavanja** → **Aplikacije**
2. Pronađi **Chrome** (ili pretraživač kojim si skinuo APK) → tapni
3. Tapni **Instaliraj nepoznate aplikacije**
4. Uključi: **"Dozvoli iz ovog izvora"**

> Na nekim telefonima: Podešavanja → Bezbednost → Nepoznati izvori → Uključi

---

### Korak 2 — Instaliraj APK

1. Otvori preuzeti fajl `GarageToolbox.apk` (u Preuzimanjima)
2. Tapni **Instaliraj**

---

### Korak 3 — Play Protect upozorenje

Ako se pojavi ekran "Play Protect je blokirao instalaciju":

1. Tapni **Više detalja** (ili strelica dole)
2. Tapni **Svejedno instaliraj**
3. Potvrdi: **Instaliraj svejedno**

Ako se pojavi poruka "Ova aplikacija može biti štetna":

1. Tapni **Instaliraj svejedno**

> Ovo upozorenje se pojavljuje **samo jednom**, pri prvoj instalaciji. Nakon toga app radi normalno.

---

### Korak 4 — Proveri da radi

1. Pronađi **Garage Toolbox** ikonicu na ekranu
2. Otvori — trebalo bi da vidiš početni ekran
3. Ako pitah za dozvole (kamera, mikrofon) — dozvoli

---

## Česta pitanja

**"Da li je app stvarno bezbedan?"**  
Da. Kod je open-source na GitHubu: [github.com/plocicmilan/AUTOUNIVERSE](https://github.com/plocicmilan/AUTOUNIVERSE). Svako može da provjeri šta app radi.

**"Zašto nije na Play Store-u?"**  
Play Store zahteva jednokratnu naknadu od $25 i traje 2–3 sedmice za pregled. Planiramo to u narednoj fazi.

**"Moram li ovo raditi svaki put?"**  
Ne. Dozvola za nepoznate izvore se pamti. Pri sledećem ažuriranju APK-a, tapneš samo "Instaliraj svejedno" i gotovo.

**"Play Protect nastavlja da upozorava na app?"**  
Tapni: Play Protect → Skeniranje → Garage Toolbox → "Ne traži više za ovu app".

---

## Za Marka (pri slanju APK-a testerima)

Preporučena poruka uz APK link:

> "Evo linka za Garage Toolbox APK. Kad instaliraš, Android će reći 'nebezbedna aplikacija' — to je normalno jer nije na Play Store-u. Tapni 'Svejedno instaliraj' i gotovo. App je bezbedan, kod je na GitHubu."

---

*Poslednje ažuriranje: 2026-07-17*
