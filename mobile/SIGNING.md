# Release signing — AutoUniverse mobile

**Todo #148.** Google Play zahteva potpisan AAB. Keystore je **jedinstven po aplikaciji** (Garage i Driver imaju svoj) i **mora se čuvati zauvek** — bez njega ne možeš da izdaješ updateove za istu app.

---

## Korak 1 — Kreiraj keystore (jednom po app-u, radi Milan)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Garage
keytool -genkey -v -keystore D:\BELORA\autouniverse\mobile\garage-release.keystore `
  -alias autouniverse-garage -keyalg RSA -keysize 2048 -validity 10000

# Driver
keytool -genkey -v -keystore D:\BELORA\autouniverse\mobile\driver-release.keystore `
  -alias autouniverse-driver -keyalg RSA -keysize 2048 -validity 10000
```

**Odgovori:**
- Enter keystore password — biraš **jaku lozinku** (nemoj koristiti istu kao za druge servise)
- Re-enter — isto
- What is your first and last name? — `Milan Plocic`
- Organizational unit — `AutoUniverse`
- Organization — `Belora Ventures`
- City — `Kruševac`
- State — `Srbija`
- Country code — `RS`
- Is CN=Milan Plocic, ... correct? — `yes`
- Enter key password for <autouniverse-garage> — **isto kao keystore password (Enter za retval)**

**REZULTAT:** dva fajla `garage-release.keystore` i `driver-release.keystore` u `mobile/`.

⚠️ **Backup keystore-a NA VIŠE MESTA** (external drive, Google Drive, Cloudflare R2). Ako ga izgubiš, izgubio si mogućnost da izdaješ updateove — Google Play ne pomaže.

---

## Korak 2 — Kreiraj keystore.properties (u .gitignore)

**mobile/garage/android/keystore.properties:**
```properties
storeFile=../../garage-release.keystore
storePassword=TVOJA_LOZINKA
keyAlias=autouniverse-garage
keyPassword=TVOJA_LOZINKA
```

**mobile/driver/android/keystore.properties:** isto ali za driver.

Ovi fajlovi su u `.gitignore` — **ne commituju se**.

---

## Korak 3 — Ažuriraj build.gradle (Claude uradio, provera)

Otvori `mobile/garage/android/app/build.gradle`:
- Iznad `android {` treba **Properties loader** za keystore.properties
- Unutar `android {` treba **signingConfigs.release**
- Unutar `buildTypes.release` treba **signingConfig signingConfigs.release**

(Detalji su primenjeni skriptom, vidi sledeći korak.)

---

## Korak 4 — Build AAB (za Play Store)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\BELORA\AppData\Local\Android\Sdk"

# Garage AAB
cd D:\BELORA\autouniverse\mobile\garage\android
.\gradlew.bat bundleRelease

# Driver AAB
cd D:\BELORA\autouniverse\mobile\driver\android
.\gradlew.bat bundleRelease
```

Output: `mobile/garage/android/app/build/outputs/bundle/release/app-release.aab`

Ovaj AAB fajl uploaduješ na Play Console.

---

## Korak 5 — Version bump pre svakog release-a

**Pravilo:** `versionCode` MORA rasti pri svakom AAB-u koji uploaduješ. `versionName` je human-readable ("1.42.0").

Otvori `mobile/{app}/android/app/build.gradle`:
```gradle
versionCode 2       // <- inkrementiraj pre svakog release-a
versionName "1.42.1"
```

---

## Provera signature-a

```powershell
cd D:\BELORA\autouniverse\mobile\garage\android
.\gradlew.bat signingReport
```

Videćeš:
```
Variant: release
Config: release
Store: D:\BELORA\autouniverse\mobile\garage-release.keystore
Alias: autouniverse-garage
SHA1: XX:XX:XX...
```

SHA1 fingerprint upisuješ u Google Play Console za "App signing".
