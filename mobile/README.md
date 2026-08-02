# AutoUniverse — Capacitor mobile wrappers

Distribucija Garage Toolbox + Driver Toolbox PWA-ova preko **Google Play**.

Ista PWA source, thin Capacitor wrapper koji je pakuje u APK/AAB.

---

## Struktura

```
mobile/
├── build_www.js              # Kopira ../garage + ../core -> mobile/garage/www
├── garage/                   # Capacitor projekat 1 (com.autouniverse.garage)
│   ├── package.json
│   ├── capacitor.config.json
│   ├── www/                  # generirano skriptom (gitignore)
│   └── android/              # generirano od `cap add android`
└── driver/                   # Capacitor projekat 2 (com.autouniverse.driver)
    └── ...
```

## Preduslovi (već zadovoljeni na Milanovoj masini)

| Alat | Verzija | Lokacija |
|---|---|---|
| Node.js | v24.15.0 | PATH |
| Android Studio | latest | `C:\Program Files\Android\Android Studio\` |
| JDK 21 (JBR) | 21.0.10 | `C:\Program Files\Android\Android Studio\jbr\` |
| Android SDK | latest | `%LOCALAPPDATA%\Android\Sdk\` |

## Env vars (postavi u sesiji pre gradle build-a)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\BELORA\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

Za trajno rešenje: dodaj u User env vars kroz System Properties, ili sa `setx`.

---

## Rutinski build (posle izmene PWA source-a)

**Garage:**
```powershell
cd D:\BELORA\autouniverse\mobile\garage
npm run sync                 # kopira www + cap sync
npm run assemble:debug       # -> android\app\build\outputs\apk\debug\app-debug.apk
```

**Driver:**
```powershell
cd D:\BELORA\autouniverse\mobile\driver
npm run sync
npm run assemble:debug
```

## Instaliraj na povezani telefon

```powershell
adb devices                    # proveri da telefon vidi
adb install -r app-debug.apk   # -r = reinstall bez brisanja podataka
```

## Release build (za Play Store — kasnije)

1. Kreiraj keystore (jednom): `keytool -genkey -v -keystore autouniverse.keystore -alias autouniverse -keyalg RSA -keysize 2048 -validity 10000`
2. Dodaj `android/keystore.properties` sa lozinkama (u .gitignore)
3. `android/app/build.gradle`: dodaj signingConfigs.release
4. `gradlew.bat bundleRelease` -> AAB za Play Console

## Verzionisanje

- `package.json` "version" prati PWA SW cache verziju (Garage v1.42, Driver v1.19)
- `android/app/build.gradle` `versionCode` i `versionName` treba menjati pri svakom Play Store release-u

## Note

- Service Worker se **isključuje** iz APK build-a (`build_www.js` skip 'sw.js') — Capacitor WebView ima svoju cache strategiju
- Namespace izolacija je preservirana: `au_garage_*` i `au_driver_*` prefixi u localStorage/IndexedDB rade i unutar WebView-a
- Prvi debug APK-ovi: **Garage 3.87 MB**, **Driver 3.85 MB** (2026-07-21)
