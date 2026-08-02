# Hetzner Cloud — Reference fajl
**Kreiran:** 2026-08-02
**Izvor:** https://docs.hetzner.com/cloud/

---

## Naplata

### Kako funkcioniše
- **Hourly billing** — naplaćuje se po satu, zaokruženo na gore
- **Mesečni cap** — nikad ne platiš više od mesečne cene (niža od: cap vs hourly × sati)
- Faktura stiže mesečno, do 28 dana posle kraja meseca
- Sitni iznosi zaokruženi po komercijalnim pravilima

### Šta se naplaćuje kad je server ISKLJUČEN
**Da, naplaćuje se.** Hetzner rezerviše resurse bez obzira na power state.
- Jedini način da prestaneš plaćati server = **obriši ga**
- Snapshot/backup pre brisanja ako treba podatke

### IPv4
- **€0.50/mes** po IPv4 adresi (naplaćuje se i ako nije attachovan na server!)
- IPv6 = **besplatno**
- Preporuka: koristi IPv6 + Cloudflare proxy kad god možeš

### Traffic
- **Incoming traffic:** besplatan
- **Internal traffic** (između Hetzner servera): besplatan
- **Outgoing traffic:** uključen u server cenu (20 TB za CX/CPX seriju)
- Alertovi na 75% i 100% iskorišćenosti

### Snapshots
- Naplaćuju se **po GB/mes** (kompresovana veličina)
- Korisni za: backup pre upgradea, kloniranje servera

### Backups (automatski)
- **+20% od cene servera/mes**
- 7 dnevnih backup slotova (rotacija)
- CX23 (~€5.49) → backups ~€1.10/mes
- **Volumeni NISU uključeni u backup!**

### Spending alert
- Podesi u Console → Usage → opcioni limit za troškove

---

## Serveri

### Tipovi
| Kategorija | Serija | Napomena |
|---|---|---|
| Cost-Optimized | CX23, CX33... | Stariji hardver, ograničena dostupnost, najjeftinije |
| Regular | CPX12, CPX22... | AMD, noviji hardver, uvek dostupno |
| Dedicated | CCX | Dedicated vCPU, skuplje, za produkciju visokog opterećenja |

### Naš izbor: CX23 (kad se oslobodi)
- 2 vCPU, 4 GB RAM, 40 GB SSD, 20 TB traffic
- ~€5.49/mes + €0.50 IPv4 = **~€6/mes ukupno**
- Dovoljan za: AU Core + Autopijaca + Autodelovi + tradesmanplaybook.com

### Fallback ako CX ne bude dostupan: CPX12
- 1 vCPU, 2 GB RAM, 40 GB SSD
- ~€11.49/mes — tijesno za više Node.js procesa

### Limiti po nalogu (default)
- Max 5 servera (do 8 dedicated)
- 1 IPv4 + 1 IPv6 po serveru
- Do 16 volumena po serveru
- Do 5 firewalla po serveru
- Do 20 Floating IP po nalogu
- Limiti se mogu povećati na zahtev

### Korisne akcije na serveru
- **Rescue mode** — boota u recovery sistem (kad OS ne radi)
- **Rebuild** — reinstalira OS (briše podatke, nova instalacija)
- **Resize** — upgrade na veći tip (downgrade nije uvek moguć)
- **Snapshot** — zamrzne stanje diska
- **Console** — VNC pristup direktno u browser (kad SSH ne radi)
- **Enable/Disable backups** — uključi/isključi automatske backupe

---

## Networking

### Private Networks
- **Besplatno** — nema naknade
- Serveri komuniciraju interno bez trošenja public traffic-a
- Korisno kad imamo više servera (npr. app server + DB server)
- Max 100 resursa po mreži, 50 subneta, 100 ruta

### Floating IPs
- Statična IP adresa koja se može premestiti između servera
- Korisno za: zero-downtime migracija, failover
- Naplaćuje se mesečno (prorata)

### DNS (Hetzner DNS)
- Besplatan DNS servis na `dns.hetzner.com`
- Nismo koristili — koristimo mint.rs za autouniverse.rs i Cloudflare za tradesmanplaybook.com

### Load Balancers
- Distribuiraju traffic na više servera
- Za nas: **nije potrebno** u ovoj fazi

---

## Storage

### Volumes (Block Storage)
- SSD blok storage, trostruka redundancija
- Min 10 GB, max 10 TB (po 1 GB koracima)
- Do 5000 IOPS sustained / 7500 burst
- Do 200 MB/s throughput sustained / 300 burst
- **Nije uključen u server backup/snapshot!**
- Korisno za: baze podataka, media fajlovi koji ne stanu na server disk

### Object Storage
- S3-kompatibilan
- Za statične fajlove, slike, videe — alternativa za budućnost

### Storage Boxes
- Managed storage (SFTP/FTP/SMB pristup)
- Nije relevantno za nas

---

## Firewalls

- Besplatni, do 5 po serveru
- Pravila: inbound/outbound po portu i protokolu
- **Preporuka za naš server:**
  - Allow: 22 (SSH), 80 (HTTP), 443 (HTTPS)
  - Allow: 3000, 3001, 3002 (AU servisi interno)
  - Deny: sve ostalo

---

## Snapshots — korisni scenariji

| Kada | Akcija |
|---|---|
| Pre upgradea OS | Snapshot → upgrade → ako padne, restore |
| Pre deploy-a novog koda | Snapshot → deploy → ako padne, restore |
| Kloniranje servera | Snapshot prvog → kreiraj novi iz snapshot-a |
| Brisanje servera | Snapshot → obriši → obnovi kad zatreba |

---

## Šta nam je korisno (tl;dr)

**Odmah:**
- CX23 server (Nuremberg, Ubuntu 24.04, SSH key)
- IPv4 (€0.50/mes) — potreban za DNS
- Firewall (besplatan) — sigurnost

**Kad budemo stabilni:**
- Backups (+20%) — za produkcioni mir
- Snapshot pre svakog većeg deploymenta

**Kad budemo rasli:**
- Volume za bazu (ako SQLite postane bottleneck)
- Drugi server + Private Network + Load Balancer

**Nikad (za nas):**
- Storage Boxes
- Dedicated CCX (preskupo, nepotrebno)
- Floating IP (samo ako imamo 2+ servera za failover)
