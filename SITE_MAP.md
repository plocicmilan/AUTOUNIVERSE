# SITE_MAP — autouniverse.rs ekosistem
**Ažurirano:** 2026-09-05
**VPS:** 46.225.236.107 (nginx, PM2, certbot)
**Ažurirati kad se doda/ukloni stranica.**

---

## autouniverse.rs — Landing

| URL | Opis |
|---|---|
| https://autouniverse.rs/ | Homepage |
| https://autouniverse.rs/ekosistem | Ekosistem prikaz |
| https://autouniverse.rs/o-nama | O nama |
| https://autouniverse.rs/kontakt | Kontakt |
| https://autouniverse.rs/potvrda | Email opt-in potvrda |
| https://autouniverse.rs/garage-uputstvo | Garage Toolbox uputstvo (11 koraka) |
| https://autouniverse.rs/driver-uputstvo | Driver Toolbox uputstvo (13 koraka) |

---

## PWA Aplikacije

| URL | Opis | Verzija | PM2 port |
|---|---|---|---|
| https://garage.autouniverse.rs | Garage Toolbox — za mehaničare | v1.60.0 | — (static) |
| https://driver.autouniverse.rs | Driver Toolbox — za vozače | v1.45.0 | — (static) |
| https://hub.autouniverse.rs | AU Core Hub (nalozi, deljenje vozila) | LIVE | 3000 |
| https://autopijaca.autouniverse.rs | Autopijaca (kupoprodaja vozila) | LIVE | 3001 |
| https://autodelovi.autouniverse.rs | Autodelovi (kupoprodaja delova) | v2 LIVE | 3002 |

### Autodelovi — stranice
| URL | Opis |
|---|---|
| https://autodelovi.autouniverse.rs/delovi | Lista oglasa + pretraga |
| https://autodelovi.autouniverse.rs/pomoc | FAQ (12 pitanja) |
| https://autodelovi.autouniverse.rs/vodic | Vizuelni vodič za postavljanje oglasa |
| https://autodelovi.autouniverse.rs/o-nama | O nama |
| https://autodelovi.autouniverse.rs/uslovi-koristenja | Uslovi korišćenja |
| https://autodelovi.autouniverse.rs/politika-privatnosti | Politika privatnosti |
| https://autodelovi.autouniverse.rs/kontakt | Kontakt |

---

## vozila.autouniverse.rs — SSG (122 modela)

| URL | Opis |
|---|---|
| https://vozila.autouniverse.rs/ | Hub — sva vozila (sort, filter, hero slike) |
| https://vozila.autouniverse.rs/models/{slug}/ | Detail stranica × 122 |

**122 modela** — JSON fajlovi u `autouniverse-vozila/data/vehicles/`
**Sitemap:** `autouniverse-vozila/build/vozila/sitemap-vozila.xml` (123 URL-ova)

Primeri slugova: `audi-a3`, `bmw-3-serija`, `golf-6`, `passat-b7`, `skoda-octavia`, `toyota-corolla`, `renault-megane`...

---

## Email

| Adresa | Ruta | Svrha |
|---|---|---|
| hello@autouniverse.rs | → beloraventures@gmail.com | Support, biznis kontakt |

---

## APK (Android)

| Fajl | Opis |
|---|---|
| Driver-v1.40.apk | Driver Toolbox debug APK |
| Garage-v1.57.apk | Garage Toolbox debug APK |
Lokacija: `autouniverse/platforms/`
