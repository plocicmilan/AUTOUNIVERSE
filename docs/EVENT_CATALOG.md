# EVENT_CATALOG.md

**Svrha:** Spec dokument koji definiše sve tipove Event-a u AutoUniverse ekosistemu. Osigurava da Garage, Driver i AU Core koriste identičnu schema-u za razmenu podataka o vozilu.

**Kada dodati novi Event tip:**
1. Postoji jasan signal u `FEEDBACK.md` da je funkcionalnost potrebna
2. Definisan je source (ko kreira), entity (šta se menja), i required data
3. Definisano je ko sme da vidi Event (permission model)
4. Definisano je koje module Event notifikuje

**Kada NE dodati novi Event tip:**
- Nema signal u FEEDBACK.md (spekulacija)
- Postoji sličan Event koji može da se generalizuje (izbegavaj fragmentaciju)
- Preklapa se sa postojećim Event tipom samo na osnovu razlike u source-u

---

## 1. Osnovna schema Event-a

Svaki Event u sistemu ima isti oblik:

```typescript
interface Event {
  // Identifikatori
  id: string;                    // UUID
  type: string;                  // enum, npr. "maintenance_performed"
  vehicle_id: string;            // VIN, globalni identifikator
  version: number;               // schema version za forward compatibility

  // Poreklo
  source: EventSource;           // "garage" | "driver" | "system"
  source_user_id: string;        // ko je kreirao
  source_app: string;            // "garage-toolbox" | "driver-toolbox"
  source_app_version: string;    // za debugging kompatibilnosti

  // Vreme
  created_at: string;            // ISO 8601, kad je Event zapisan
  event_date: string;            // ISO 8601, kad se stvarno desilo (može biti retroaktivno)
  date_precision: DatePrecision; // "exact" | "day" | "month" | "year"

  // Trust markers
  retroactive: boolean;          // true ako se unosi post-hoc
  trust_source: TrustSource;     // "mechanic_verified" | "owner_reported" | "imported"

  // Podaci
  data: object;                  // type-specific payload (definisan po Event tipu)

  // Vidljivost
  visible_to: string[];          // lista user_id-jeva sa `grant()` pristupom
}
```

**Napomena o `trust_source`:** Ovo je ključno polje. Zapis koji je uneo mehaničar sa fotografijama ima drugačiju težinu od zapisa koji vlasnik unosi retroaktivno bez računa. Kupac polovnog vozila mora da vidi razliku.

---

## 2. Kategorije Event tipova

Za organizaciju, Event tipovi se grupišu u kategorije. Kategorija sama po sebi nije Event tip — samo namespace za sortiranje u Timeline-u.

| Kategorija | Opis | Primeri (tekući + planirani) |
|---|---|---|
| `ownership` | Promene vlasništva, akvizicija/prodaja | `vehicle_created`, `vehicle_sold`, `owner_changed` |
| `maintenance` | Servisni radovi, zamene delova | `maintenance_performed`, `oil_changed`, `parts_replaced` |
| `registration` | Registracija, tehnički pregled | `registered`, `inspection_passed` |
| `insurance` | Osiguranje | `policy_started`, `policy_renewed`, `claim_filed` |
| `expense` | Troškovi bez servisnog kontekstа | `fuel_added`, `toll_paid`, `registration_paid` |
| `document` | Dodati dokumenti | `document_uploaded` |
| `incident` | Nezgode, kvarovi | `accident_reported`, `breakdown_reported` |

**Trenutno implementirano:** Driver koristi generic `Event` model sa `cost` poljem i kategorijama (gorivo, gume, karoserija, registracija, osiguranje, dekorativni dodaci, ostalo). Katalog ovaj model formalizuje za razmenu preko AU Core-a.

---

## 3. Popunjeni primer: `MaintenancePerformed`

**Najverovatniji prvi Event tip koji ide preko AU Core-a** (Marko završava servis → Nikola vidi u Driver-u).

### 3.1 Metadata

| Polje | Vrednost |
|---|---|
| **Type** | `maintenance_performed` |
| **Kategorija** | `maintenance` |
| **Source** | `garage` |
| **Entity** | `vehicle` |
| **Trigger** | Mehaničar zatvara radni nalog u Garage Toolbox-u |
| **Version** | `1` |

### 3.2 Required data (`event.data`)

```typescript
interface MaintenancePerformedData {
  // Šta je urađeno
  work_performed: string;         // slobodan tekst opis (npr. "Zamena prednjih pločica")

  // Kilometraža
  mileage: number;                // km na trenutku servisa
  km_precision: DatePrecision;    // "exact" | "estimated"

  // Mehaničar / servis
  mechanic_name: string;          // ime mehaničara
  workshop_name: string;          // ime servisa (može biti isto kao mechanic_name za samostalne)

  // Delovi (može biti prazan array)
  parts_used: PartUsed[];         // vidi PartUsed schema ispod
}

interface PartUsed {
  brand: string;                  // proizvođač (npr. "ATE")
  model: string;                  // model/oznaka (npr. "13.0460-2871.2")
  category: string;               // "brake_pads" | "oil_filter" | "tire" | itd.
  position?: string;              // "front" | "rear" | "front-left" | itd. (opciono)
  quantity: number;               // koliko komada
}
```

**Namerno izostavljeno iz razmene:**
- ❌ **Cena** (potvrđena arhitektonska odluka: cena se deli samo kao zaseban PDF po izboru mehaničara)
- ❌ **Marža** (interna informacija servisa)
- ❌ **Nabavna cena delova** (interna informacija)

### 3.3 Optional data

```typescript
interface MaintenancePerformedOptionalData {
  // Preporuke za sledeći servis
  next_service_recommendation?: {
    work_needed: string;          // šta treba (npr. "Zadnji diskovi 30% do zamene")
    urgency: "high" | "medium" | "low";
    estimated_km_until: number;   // za koliko km
  };

  // Fotografije
  photos?: string[];              // R2 URL-ovi (nakon što se otključa cloud storage)

  // Napomene mehaničara
  mechanic_notes?: string;        // slobodan tekst, vidljiv vlasniku
  internal_notes?: string;        // samo za servis, NE deli se
}
```

### 3.4 Trust source rules

Za `maintenance_performed` Event:
- `mechanic_verified` — mehaničar zatvorio radni nalog u Garage-u (default)
- `owner_reported` — vlasnik retroaktivno unosi servis koji se desio pre nego što je Auto Universe koristio
- `imported` — bulk import iz starih evidencija (rezervisano za buduće use case-e)

### 3.5 Affected modules

Kad AU Core primi `maintenance_performed` Event, obaveštava:

| Modul | Šta radi |
|---|---|
| **Vehicle Timeline** (Driver) | Dodaje stavku u hronologiju |
| **Expenses** (Driver) | Ako je vlasnik plaćanje unosio nezavisno preko Driver-a, može da uveže |
| **Reminders** (Driver) | Ako postoji `next_service_recommendation`, kreira podsetnik |
| **Vehicle History Report** (Marketplace) | Uključuje u istoriju kad se vozilo oglašava za prodaju |
| **Garage lokalna baza** | Ostaje autoritativan izvor za mehaničara |

### 3.6 Notifikacije

| Ko | Kako | Kada |
|---|---|---|
| Vlasnik vozila (Driver user) | Push + in-app notifikacija | Odmah po prijemu Event-a u AU Core |
| Mehaničar (Garage user) | In-app potvrda | Odmah po slanju Event-a |

### 3.7 Permission model

Event je vidljiv:
- Vlasniku vozila (uvek, ne može se opozvati bez brisanja)
- Mehaničaru koji je kreirao Event (uvek, deo Garage baze)
- Bilo kojoj strani sa validnim `grant(user_A, vehicle_id, role: "read")` — npr. budući kupac koji ima magic link

Vlasnik može opozvati `grant()` u bilo kom trenutku. Opoziv NE briše Event iz Garage baze mehaničara.

### 3.8 Migracija na verziju 2 (primer forward compat)

Ako se u budućnosti doda polje (npr. `warranty_expires_at`), postupak:
1. Kreiraj version 2 schema
2. AU Core prihvata i v1 i v2 Event-e
3. Driver Toolbox čita oba, tretira nedostajuća polja kao `undefined`
4. Nikad ne menjaj v1 schema — samo dodavanje novih verzija

---

## 4. Rules za dodavanje novih Event tipova

Kad se pojavi feedback signal za novu funkcionalnost, procedura:

1. **Provera:** Da li se može modelovati kao varijacija postojećeg tipa? (npr. `tire_change` je specijalizacija `maintenance_performed` sa `parts_used` gde je category `tire`)
2. **Ako da:** ne dodaj novi Event tip. Proširi postojeći sa opcionim poljima.
3. **Ako ne:** kreiraj novi tip u ovom katalogu prvo, PRE nego što ijedan red koda bude napisan.
4. **Definiši ista polja kao za `MaintenancePerformed`:**
   - Type, Category, Source, Entity, Trigger, Version
   - Required data, Optional data
   - Trust source rules
   - Affected modules
   - Notifikacije
   - Permission model

5. **Peer-review:** briefing sa novim Event tipom ide u Chat Claude na proveru (da li kompatibilno sa filozofijom, da li duplira postojeći).

---

## 5. Trenutni status implementacije

| Event tip | Katalogizovan | Driver ima | Garage ima | AU Core prima |
|---|---|---|---|---|
| `maintenance_performed` | ✅ (ovaj dokument) | ⚠️ generic Event | ✅ radni nalog | ❌ |
| `fuel_added` | ⬜ TBD | ✅ (kategorija "gorivo") | ❌ | ❌ |
| `registration_paid` | ⬜ TBD | ✅ (kategorija "registracija") | ❌ | ❌ |
| `insurance_paid` | ⬜ TBD | ✅ (kategorija "osiguranje") | ❌ | ❌ |
| `vehicle_created` | ⬜ TBD | ✅ | ✅ | ❌ |
| `vehicle_sold` | ⬜ TBD | ✅ (trade mode wizard) | ❌ | ❌ |

**Prioritet katalogizacije:** samo `maintenance_performed` je P0 (potreban za prvi end-to-end AU Core flow). Ostali čekaju feedback signal.

---

## 6. Anti-Event tipovi (namerno NE u katalog)

Ovi predloženi Event tipovi su odbijeni. Ne dodavati bez fresh feedback signala:

| Predlog | Zašto odbijen |
|---|---|
| `ai_prediction_generated` | AI je odbijen bez signala (vidi FEEDBACK.md Anti-signals) |
| `marketplace_listing_created` | Marketplace je fazа 5+, ne treba Event tip pre nego što feature postoji |
| `insurance_claim_filed` | Nema tester signal, insurance integracija je van scope-a |
| `financing_offer_received` | Financing je odbijena vertikala |
| `fleet_report_generated` | Fleet management je van scope-a |

---

**Kraj dokumenta.**
