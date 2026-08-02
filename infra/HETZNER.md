# Hetzner VPS — AutoUniverse

**Poslednji update:** 2026-07-22 (kasno uveče, pauzirano)
**Status:** ⏳ Nalog otvoren, čeka 2FA + kreiranje servera

## Progres (2026-07-22)
- ✅ Nalog otvoren, client number `K0738892026`, EUR valuta, kartica dodata
- ✅ SSH ključ generisan (`~/.ssh/id_ed25519`, fingerprint `SHA256:2kdRhLrv8pzQMeoq7C5bi6q2OuIXq3lKLzFilEwzn0U`)
- ⏳ **SLEDEĆI KORAK:** Uključiti 2FA (accounts.hetzner.com → Two-factor authentication)
- ⏳ Kreirati projekat "Belora Ventures" u Cloud Console
- ⏳ Dodati SSH ključ u projekat (Security → SSH Keys)
- ⏳ Kreirati CX22 server (`belora-prod-1`, Nuremberg, Ubuntu 24.04, backups on)
- ⏳ Zabeležiti javni IP
- ⏳ Postaviti DNS na mint.rs (A + wildcard)
- ⏳ Pokrenuti vps-bootstrap.sh i deploy.sh

---

## Nalog

| Polje | Vrednost |
|---|---|
| Provajder | Hetzner Cloud (https://console.hetzner.com) |
| Nalog email | plocicmilan@gmail.com |
| Client number | `K0738892026` |
| Currency | EUR (nepromenljivo) |
| Nalog otvoren | 2026-07-22 |
| Password | ⚠️ NIKAD u ovom fajlu — čuva se u password manager-u |
| 2FA | ⏳ obavezno uključiti posle prvog logina |
| Kartica | Virtuelna kartica (ista koju koristi za Anthropic) |
| VAT ID | prazno / N/A (Srbija, fizičko lice, nije u EU) |
| Projekat | `Belora Ventures` |

---

## Server

| Polje | Vrednost |
|---|---|
| Name | `belora-prod-1` |
| Type | **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD, 20 TB traffic) |
| Cena | ~€4.51/mesec + Backups €0.90 = **~€5.41/mesec** |
| Location | Nuremberg (nbg1) |
| OS | Ubuntu 24.04 LTS |
| Backups | ✅ Enabled (dnevni snapshot 7 dana) |
| Public IPv4 | ⏳ *(popuniti kad se server napravi)* |
| Public IPv6 | ⏳ |
| Root user | `root` (početno; kasnije se pravi `belora` user + disable root SSH) |

---

## SSH ključ

| Polje | Vrednost |
|---|---|
| Ključ u Hetzner projektu | `belora-milan-pc` |
| Fingerprint | `SHA256:2kdRhLrv8pzQMeoq7C5bi6q2OuIXq3lKLzFilEwzn0U` |
| Public key file | `C:\Users\BELORA\.ssh\id_ed25519.pub` |
| Private key file | `C:\Users\BELORA\.ssh\id_ed25519` |
| Passphrase | (prazno) |

**Konekcija (kad server bude aktivan):**
```powershell
ssh root@<HETZNER_IP>
```

---

## Šta ide na server

| Servis | Port | Domen | Tip |
|---|---|---|---|
| AutoHub API | 3000 | `hub.autouniverse.rs` | Node.js |
| Autopijaca | 3001 | `autopijaca.autouniverse.rs` | Node.js |
| Autodelovi | 3002 | `autodelovi.autouniverse.rs` | Node.js |
| Garage Toolbox PWA | — | `garage.autouniverse.rs` | Statika |
| Driver Toolbox PWA | — | `driver.autouniverse.rs` | Statika |
| Landing | — | `autouniverse.rs` | Statika |
| NGINX | 80/443 | reverse proxy + SSL | System |
| Certbot | — | Let's Encrypt auto-renew | Cron |

**Bootstrap skripta:** `autouniverse/infra/vps-bootstrap.sh`
**Deploy skripta:** `autouniverse/infra/deploy.sh`
**NGINX config:** `autouniverse/infra/nginx-autouniverse.conf`
**Cron:** `autouniverse/infra/crontab.txt`

---

## DNS setup (mint.rs)

Kad server dobije IP:

| Tip | Host | Vrednost | TTL |
|---|---|---|---|
| A | `@` | `<HETZNER_IP>` | 300 |
| A | `*` | `<HETZNER_IP>` | 300 |
| AAAA | `@` | `<HETZNER_IPv6>` | 300 |
| AAAA | `*` | `<HETZNER_IPv6>` | 300 |

Wildcard `*` pokriva sve subdomene odjednom (hub, autopijaca, autodelovi, garage, driver).

---

## Sigurnost — checklist posle prvog logina

- [ ] `passwd` — postaviti root password (backup ako ključ zafali)
- [ ] `apt update && apt upgrade -y`
- [ ] `adduser belora` + `usermod -aG sudo belora`
- [ ] Kopirati SSH ključ na `belora` user: `rsync --archive --chown=belora:belora ~/.ssh /home/belora`
- [ ] `sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`
- [ ] `systemctl restart ssh`
- [ ] Testirati SSH kao `belora` user PRE nego što se odjaviš iz root sesije
- [ ] `ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`
- [ ] Hetzner Cloud Firewall: dozvoli 22/80/443, blokiraj 3000-3002 spolja (samo interno)
- [ ] `fail2ban` install

---

## Troškovi mesečno (procena)

| Stavka | Cena |
|---|---|
| CX22 | €4.51 |
| Backups (20%) | €0.90 |
| **Ukupno** | **~€5.41/mesec** |

Godišnje: **~€65** (~7.700 RSD)

Skaliranje: prelazak na CX32 (4 vCPU, 8 GB, 80 GB) je +€3/mesec — jedan klik u dashboardu, minimalan downtime.

---

## Reference

- Dashboard: https://console.hetzner.cloud
- Docs: https://docs.hetzner.com/cloud/
- Status: https://status.hetzner.com
- Podrška: support@hetzner.com (na engleskom)
- Domen registry: `C:\Users\BELORA\.claude\projects\D--BELORA\memory\project_domains.md`
