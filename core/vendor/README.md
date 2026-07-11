# core/vendor/

Sve eksterne biblioteke idu OVDE, bundled lokalno. **Nikad CDN** (offline-first pravilo, lekcija #3 iz Toolbox-a).

Planirano (dodaje se u Sesiji 3–4):

| Fajl | Biblioteka | Za šta |
|---|---|---|
| `jspdf.umd.min.js` | jsPDF | PDF Engine (nalog, faktura, ponuda) |
| `qrcode.js` | qrcode.js | Vizit karta + QR (🔑 modul) |

Posle dodavanja fajla ovde → dodati putanju u `garage/sw.js` PRECACHE listu i podići verziju keša.
