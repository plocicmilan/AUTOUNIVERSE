# AU Account — Specifikacija v1
**Datum:** 2026-09-02  
**Autor:** Terminal Claude (na osnovu BRIEFING_AU_ACCOUNT_MVP_DESIGN_v1.md)  
**Status:** Odluke donete — spreman za implementaciju (Faza 2, Q1 2027)

---

## 1. Šta je AU Account

Naplativi sync sloj iznad besplatnih offline aplikacija (Garage Toolbox, Driver Toolbox). Bez naloga, sve radi lokalno. Sa nalogom, podaci se sinhronizuju sa AU Core serverom i dostupni su na do 2 uređaja.

**Vrednost za vozača:** kompletna istorija vozila zauvek, čak i kad promeni telefon. Servisni pasoš za prodaju.  
**Vrednost za mehaničara:** business continuity — klijentske kartice i radni nalozi ne smeju da nestanu.

---

## 2. Proizvod i pricing

**Odluka: jedan proizvod, dva tier-a** (ne dva odvojena proizvoda — prevremeno za 0 paying users).

| Tier | Za koga | Vozila | Storage | Cena |
|---|---|---|---|---|
| **Free** | Svi korisnici | 1 | 0 — samo offline | 0 |
| **Driver Pro** | Vozači | 5 | 2 GB | 400 RSD/mes (≈4€) |
| **Garage Pro** | Servisi, preprodavači | Neograničeno | 20 GB | 2.000 RSD/mes (≈20€) |

**Godišnja pretplata:** 20% popust (10 meseci cena za 12).  
**Valuta:** RSD (srpsko tržište lakše prihvata domaću valutu).  
**Revizija:** posle 6 meseci / prvih 20 paying users.

---

## 3. Šta se sinhronizuje

### Driver Pro

| Entitet | Sync | Napomena |
|---|---|---|
| vehicles | ✅ | JSON, mali |
| service_events | ✅ | Istorija, append-only |
| expenses | ✅ | Fin. evidencija, append-only |
| documents_metadata | ✅ | JSON reference na R2 fajl |
| documents_files | ✅ | PDF, JPG — u R2 bucket |
| photos | ✅ | JPG, WebP — u R2 bucket |
| reminders | ✅ | JSON, mali |
| user_prefs | ✅ | JSON, mali |
| session_tokens | ❌ | Samo lokalno |
| TEST-UNLOCK state | ❌ | Samo lokalno |
| IndexedDB cache | ❌ | Samo lokalno |

### Garage Pro (sve iz Driver Pro, plus)

| Entitet | Sync | Napomena |
|---|---|---|
| work_orders | ✅ | JSON + PDF invoice — R2 |
| client_contacts | ✅ | JSON |
| calendar_entries | ✅ | JSON |
| business_branding | ✅ | Logo (R2) + tekst |

---

## 4. Conflict resolution

**Pravilo po entitetu:**

| Entitet | Strategija | Razlog |
|---|---|---|
| vehicles | Last-write-wins (LWW) | Retko se menja, konflikti retki |
| service_events | **Append-only** | Istorija servisa ne sme da se izgubi |
| expenses | **Append-only** | Finansijska evidencija |
| work_orders | **Append-only** | Poslovna evidencija |
| client_contacts | LWW | Idempotentno (poslednji edit ispravlja) |
| reminders | LWW | Idempotentno |
| user_prefs | LWW | Uvek pobeđuje poslednji uređaj |
| documents_metadata | LWW | Referenca — fajl u R2 se ne briše |
| calendar_entries | LWW | Raspored je uvek poslednja verzija |
| business_branding | LWW | Config entitet |

**Append-only implementacija:**
- Svaki zapis ima `uuid` + `created_at` + `is_deleted` (tombstone)
- Edit = novi zapis sa `parent_uuid` referencom na stari
- Sync dodaje samo — nikad briše bez tombstone-a
- UI prikazuje "poslednji aktivan zapis" po entitetu

---

## 5. Multi-device

- **MVP:** maksimum 2 uređaja po nalogu
- **Onboarding na novom uređaju:** bulk download iz cloud-a (blokira UI dok se ne završi)
- **Incremental sync:** svakih 5 minuta dok je app otvorena, pri svakom otvaranju app-a
- **3+ uređaja:** Faza 2 (posle 50 paying users)

---

## 6. Billing (MVP)

**Manuelno, bez payment gateway integracije.**

**Flow:**
1. Korisnik šalje uplatu (IPS QR / bank transfer)
2. Milan potvrđuje uplatu
3. Milan otvara AU Admin Panel → aktivira nalog (email + tier + expiry_date)
4. Korisnik dobija email potvrdu + instrukcije za login

**Gateway integracija:** Faza 2, kad bude 20+ paying users. Paddle ili Stripe tada.

---

## 7. Pravni okvir

**MVP (pre prvog paying usera):**
- Dodati AU Account sekciju u Uslove korišćenja (šta se čuva, koliko dugo, brisanje na zahtev)
- Ažurirati Politiku privatnosti: "plaćeni korisnici imaju cloud sync" (bez toga su svi offline)
- GDPR minimum: right to export, right to delete (manual process u MVP)

**Faza 2 (pre 50+ korisnika):**
- Pravna konsultacija (~200-500€) — ZZPL usklađenost, EU korisnici
- Automatizovani export i brisanje naloga

---

## 8. Tehnička arhitektura

### Storage

```
AU Core (VPS, PostgreSQL ili SQLite)
├── au_accounts         — nalog, tier, expiry
├── au_sync_cursors     — poslednji sync timestamp po uređaju
└── au_sync_log         — log svih sync operacija

Cloudflare R2
└── au-sync/{account_id}/
    ├── documents/
    ├── photos/
    └── work_orders/
```

### Sync protokol (delta-based)

```
Client → Server: GET /api/sync/pull?cursor=<last_timestamp>&device_id=<uuid>
Server → Client: { deltas: [...], new_cursor: <timestamp> }

Client → Server: POST /api/sync/push { device_id, deltas: [...] }
Server → Client: { accepted: true, new_cursor: <timestamp> }
```

**Delta format:**
```json
{
  "entity": "service_events",
  "operation": "upsert",
  "uuid": "abc-123",
  "data": { ... },
  "client_timestamp": 1725264000000,
  "device_id": "device-uuid"
}
```

### Endpoint lista

```
POST /api/auth/login         — email + password → JWT
POST /api/auth/logout
GET  /api/account/me         — tier, storage usage, expiry
GET  /api/sync/pull          — delta pull od cursor-a
POST /api/sync/push          — batch delta push
POST /api/files/upload       — R2 upload (pre-signed URL)
GET  /api/files/:key         — R2 download (pre-signed URL)
DELETE /api/account/delete   — GDPR delete (soft delete, 30 dana)
```

---

## 9. DB Schema

### au_accounts

```sql
CREATE TABLE au_accounts (
  id           TEXT PRIMARY KEY,          -- uuid
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,            -- bcrypt
  tier         TEXT NOT NULL DEFAULT 'free', -- 'free' | 'driver_pro' | 'garage_pro'
  storage_used_bytes INTEGER DEFAULT 0,
  storage_limit_bytes INTEGER DEFAULT 0, -- 0 = no cloud (free tier)
  active_until DATE,                      -- NULL = free tier
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at   DATETIME                  -- soft delete / GDPR
);

CREATE TABLE au_devices (
  id           TEXT PRIMARY KEY,          -- uuid (client-generated)
  account_id   TEXT REFERENCES au_accounts(id),
  device_name  TEXT,
  last_seen    DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE au_sync_cursors (
  account_id   TEXT REFERENCES au_accounts(id),
  device_id    TEXT REFERENCES au_devices(id),
  cursor_ts    INTEGER NOT NULL DEFAULT 0, -- unix ms timestamp
  PRIMARY KEY (account_id, device_id)
);

CREATE TABLE au_sync_deltas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id   TEXT REFERENCES au_accounts(id),
  device_id    TEXT,
  entity       TEXT NOT NULL,             -- 'service_events', 'vehicles', ...
  operation    TEXT NOT NULL,             -- 'upsert' | 'delete'
  entity_uuid  TEXT NOT NULL,
  payload      TEXT NOT NULL,             -- JSON
  client_ts    INTEGER NOT NULL,          -- unix ms, od klijenta
  server_ts    INTEGER NOT NULL,          -- unix ms, od servera (za cursor)
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deltas_account_ts ON au_sync_deltas(account_id, server_ts);

CREATE TABLE au_files (
  id           TEXT PRIMARY KEY,          -- uuid
  account_id   TEXT REFERENCES au_accounts(id),
  entity       TEXT,                      -- 'documents' | 'photos' | 'work_orders'
  entity_uuid  TEXT,
  r2_key       TEXT NOT NULL,             -- path u R2 bucketu
  size_bytes   INTEGER NOT NULL,
  mime_type    TEXT,
  deleted_at   DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### AU Admin Panel (Milan's manual activation)

```sql
CREATE TABLE au_subscriptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id   TEXT REFERENCES au_accounts(id),
  tier         TEXT NOT NULL,
  started_at   DATE NOT NULL,
  expires_at   DATE NOT NULL,
  amount_rsd   INTEGER,
  payment_ref  TEXT,                      -- IPS referentni broj ili opis
  notes        TEXT,
  created_by   TEXT DEFAULT 'milan',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. Implementacioni redosled (kad dođe vreme)

**Faza 1 — osnova (2-3 nedelje):**
1. AU Core: PostgreSQL schema + auth (JWT, bcrypt)
2. `/api/sync/pull` + `/api/sync/push` (bez R2, samo JSON entiteti)
3. Admin panel: Milan aktivira nalog manuelno
4. Client SDK: `syncManager.js` modul u `core/` — pull/push + cursor storage

**Faza 2 — fajlovi (1-2 nedelje):**
5. R2 integracija: upload/download pre-signed URL-ovi
6. File sync u Driver/Garage app

**Faza 3 — polish (1 nedelja):**
7. Conflict UI za edge cases
8. Bulk download UX za novi uređaj
9. GDPR delete endpoint

**Tek tada:** ToS update + test sa Markom i Goranom.

---

## 11. Šta Desktop Claude treba da revidira

1. Da li je append-only strategija implementaciono realna sa trenutnom IndexedDB strukturom?
2. Da li sync protokol (delta + cursor) radi sa offline-first PWA arhitekturom?
3. Tier limiti — da li 400/2000 RSD ima smisla za srpsko tržište?
4. Da li AU Core treba PostgreSQL ili je SQLite na VPS dovoljan za 100 korisnika?
5. Admin panel — šta minimalno treba (email, tier, expiry, aktivacija)?

---

*Ovaj dokument je ulaz za implementaciju. Nema više otvorenih pitanja — sve odluke su donete. Desktop Claude validira arhitekturu, Terminal Claude implementira.*
