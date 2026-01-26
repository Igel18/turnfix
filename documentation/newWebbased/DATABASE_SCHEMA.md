# TurnFix Database Schema Documentation

**Version**: 2.0 | **Last Updated**: 2025-10-31

This document provides a comprehensive overview of the TurnFix PostgreSQL database schema, including all tables, fields, data types, and relationships.

## ✅ Legacy Schema Compatibility

The TurnFix database maintains full compatibility with the original C++/Qt application database structure. All table and column names follow the original naming conventions:

- **Table prefix**: `tfx_` (e.g., `tfx_disziplinen`)
- **Column naming convention**: 
  - `int_` = Integer columns
  - `var_` = String/Text columns
  - `bol_` = Boolean columns
  - `flt_` = Float columns
  - `dat_` = Date columns

## 📊 Core Tables

### 1. tfx_bereiche (Categories/Regions)
Stores geographic regions and administrative areas.

```
Table: tfx_bereiche
├── int_bereicheid (PK, AutoIncrement) - Primary key
├── var_name (String, NOT NULL) - Region name (e.g., "Bayern")
└── Relationships: ← tfx_disziplinen, tfx_veranstalter, tfx_verband, tfx_verein
```

**Constraints**:
- Primary Key: `int_bereicheid`
- Foreign Key Relations: Referenced by multiple tables for regional organization

---

### 2. tfx_verband (Associations/Federations)
Stores sports federations and associations (e.g., DTB - Deutscher Turner-Bund).

```
Table: tfx_verband
├── int_verbandid (PK, AutoIncrement) - Primary key
├── int_bereicheid (FK) - Region identifier
├── var_name (String, NOT NULL) - Association name
├── var_kurzname (String) - Short name
└── Relationships: ← tfx_verein, tfx_veranstalter
```

**Constraints**:
- Primary Key: `int_verbandid`
- Foreign Key: `int_bereicheid` → `tfx_bereiche.int_bereicheid`
- Cascade Delete Rule (from tfx_bereiche)

---

### 3. tfx_verein (Clubs/Associations)
Stores individual gymnastics clubs/organizations.

```
Table: tfx_verein
├── int_vereinid (PK, AutoIncrement) - Primary key
├── int_verbandid (FK) - Federation identifier
├── int_bereicheid (FK) - Region identifier
├── var_name (String, NOT NULL) - Club name
├── var_kurzname (String) - Short name
├── var_ort (String) - Location/City
├── var_strasse (String) - Street address
├── var_plz (String) - Postal code
├── var_telefon (String) - Phone number
├── var_kontaktperson (String) - Contact person
├── var_email (String) - Email address
└── Relationships: ← tfx_person, tfx_veranstalter, tfx_mannschaft
```

**Constraints**:
- Primary Key: `int_vereinid`
- Foreign Keys: 
  - `int_verbandid` → `tfx_verband.int_verbandid`
  - `int_bereicheid` → `tfx_bereiche.int_bereicheid`
- Cascade Delete Rules

---

### 4. tfx_person (Participants/Athletes)
Stores individual athletes/participants in competitions.

```
Table: tfx_person
├── int_personid (PK, AutoIncrement) - Primary key
├── int_vereinid (FK) - Club identifier
├── var_vorname (String, NOT NULL) - First name
├── var_nachname (String, NOT NULL) - Last name
├── var_kurzname (String) - Short name
├── dat_geburtsdatum (Date) - Date of birth
├── var_geschlecht (String) - Gender ('männlich' | 'weiblich')
├── var_startnum (String) - Start number
├── var_passnummer (String) - Passport number
├── var_behinderung (String) - Disability information
├── bol_aktiv (Boolean) - Active status
├── var_notizen (String) - Notes
└── Relationships: ← tfx_wettkampfperson, tfx_mannschaft_person, tfx_wertung
```

**Constraints**:
- Primary Key: `int_personid`
- Foreign Key: `int_vereinid` → `tfx_verein.int_vereinid`
- Cascade Delete Rule

---

### 5. tfx_sport (Sport Categories)
Stores sport types/categories (e.g., "Turnen DTB", "Turnen DTB LK", "P-Geräte").

```
Table: tfx_sport
├── int_sportid (PK, AutoIncrement) - Primary key
├── var_name (String, NOT NULL) - Sport name
└── Relationships: ← tfx_disziplinen
```

**Constraints**:
- Primary Key: `int_sportid`
- Unique constraint on `var_name` (implicit through design)

---

### 6. tfx_disziplinen (Devices/Disciplines)
Stores gymnastics devices and discipline types (e.g., Floor, Vault, Bars).

```
Table: tfx_disziplinen
├── int_disziplinenid (PK, AutoIncrement) - Primary key
├── int_bereicheid (FK) - Region identifier
├── int_sportid (FK) - Sport category identifier
├── var_name (String, NOT NULL) - Device name (e.g., "Boden", "Reck")
├── var_anzeigename (String) - Display name
├── var_kurzname (String) - Short name
├── bol_m (Boolean) - Male allowed
├── bol_w (Boolean) - Female allowed
├── int_gymnetid (Integer) - GymNet system ID
└── Relationships: ← tfx_disziplinen_felder, tfx_disziplinen_gruppen, tfx_wettkampf_disziplin
```

**Constraints**:
- Primary Key: `int_disziplinenid`
- Foreign Keys:
  - `int_bereicheid` → `tfx_bereiche.int_bereicheid`
  - `int_sportid` → `tfx_sport.int_sportid`
- Cascade Delete Rules

**Data Example**:
```
| int_disziplinenid | var_name | bol_m | bol_w | int_sportid |
|---|---|---|---|---|
| 31 | Pferd | true | false | 1 |
| 46 | Reck | true | false | 1 |
| 50 | Ringe | true | false | 1 |
| 68 | Stufenbarren | false | true | 1 |
| 71 | Sprung | true | true | 2 |
| 73 | Schwebebalken | false | true | 1 |
| 74 | Boden | true | true | 1 |
| 75 | Gerätebahn A | true | true | 3 |
| 76 | Gerätebahn B | true | true | 3 |
| 77 | Minitrampolin | true | true | 3 |
```

---

### 7. tfx_disziplinen_felder (Device Fields/Scoring Components)
Stores field definitions for each device (e.g., "Übungswert", "Abzüge Ausführung", "Endwert").

```
Table: tfx_disziplinen_felder
├── int_feldid (PK, AutoIncrement) - Primary key
├── int_disziplinenid (FK) - Device identifier
├── var_name (String, NOT NULL) - Field name
├── var_kurzname (String) - Short name
├── int_position (Integer) - Display order
├── var_feldartenid (String) - Field type
├── bol_sichtbar (Boolean) - Visibility flag
├── bol_bearbeitbar (Boolean) - Editable flag
├── int_nachkomma (Integer) - Decimal places
└── Relationships: ← tfx_wertung
```

**Constraints**:
- Primary Key: `int_feldid`
- Foreign Key: `int_disziplinenid` → `tfx_disziplinen.int_disziplinenid`
- Cascade Delete Rule

**Special Note - P-Device Fields**:
For P-device types (Minitrampolin, Gerätebahn A/B), exactly 3 fields are created:
```
1. Stufe (Stage)
2. AbzugAusf. (Deduction Execution)
3. Endwert (Final Value)
```

---

### 8. tfx_formeln (Calculation Formulas)
Stores mathematical formulas for score calculations.

```
Table: tfx_formeln
├── int_formelid (PK, AutoIncrement) - Primary key
├── int_disziplinenid (FK) - Device identifier
├── var_name (String, NOT NULL) - Formula name
├── var_formel (String, NOT NULL) - Formula expression
├── var_typ (String) - Formula type (e.g., "Endwert", "Wertung")
└── Relationships: ← tfx_wertung
```

**Constraints**:
- Primary Key: `int_formelid`
- Foreign Key: `int_disziplinenid` → `tfx_disziplinen.int_disziplinenid`
- Cascade Delete Rule

**Formula Examples**:
```
Device: Boden (Floor)
├── Endwert = Uebungsstufe + AbzugAusf.
├── Wertung = Endwert

Device: Pferd (Vault)
├── Endwert = Uebungsstufe + AbzugAusf.
└── Wertung = Endwert

Device: Minitrampolin (P-Device)
├── Endwert = Stufe + AbzugAusf.
└── Wertung = Endwert
```

---

### 9. tfx_disziplinen_gruppen (Device Groups)
Groups related devices together (e.g., all male apparatuses, all female apparatuses).

```
Table: tfx_disziplinen_gruppen
├── int_disziplinen_gruppeid (PK, AutoIncrement) - Primary key
├── int_disziplinenid (FK) - Device identifier
├── int_gruppeid (FK) - Group identifier
├── var_name (String) - Group name
└── Relationships: ← tfx_gruppe
```

**Constraints**:
- Primary Key: `int_disziplinen_gruppeid`
- Foreign Keys:
  - `int_disziplinenid` → `tfx_disziplinen.int_disziplinenid`
  - `int_gruppeid` → `tfx_gruppe.int_gruppeid`

---

### 10. tfx_veranstaltung (Events)
Stores competition events (e.g., "Landesmeisterschaften 2024").

```
Table: tfx_veranstaltung
├── int_veranstaltungid (PK, AutoIncrement) - Primary key
├── int_verbandid (FK) - Federation identifier
├── int_vereinid (FK) - Organizing club identifier
├── int_bereicheid (FK) - Region identifier
├── var_name (String, NOT NULL) - Event name
├── var_kurzname (String) - Short name
├── var_ort (String) - Location
├── dat_von (Date) - Start date
├── dat_bis (Date) - End date
├── var_notizen (String) - Notes
└── Relationships: ← tfx_wettkampf, tfx_wettkampf_disziplin
```

**Constraints**:
- Primary Key: `int_veranstaltungid`
- Foreign Keys:
  - `int_verbandid` → `tfx_verband.int_verbandid`
  - `int_vereinid` → `tfx_verein.int_vereinid`
  - `int_bereicheid` → `tfx_bereiche.int_bereicheid`
- Cascade Delete Rules

---

### 11. tfx_wettkampf (Competitions)
Stores individual competitions within an event.

```
Table: tfx_wettkampf
├── int_wettkampfid (PK, AutoIncrement) - Primary key
├── int_veranstaltungid (FK) - Event identifier
├── var_name (String, NOT NULL) - Competition name
├── var_type (String) - Competition type
├── dat_wettkampftag (Date) - Competition date
├── tim_start (Time) - Start time
├── var_geschlecht (String) - Gender ('männlich' | 'weiblich' | 'gemischt')
├── int_altersgruppe (Integer) - Age group
├── var_klasse (String) - Class/Level
├── bol_aktiv (Boolean) - Active status
└── Relationships: ← tfx_wettkampfperson, tfx_wettkampf_disziplin, tfx_durchgang, tfx_wertung
```

**Constraints**:
- Primary Key: `int_wettkampfid`
- Foreign Key: `int_veranstaltungid` → `tfx_veranstaltung.int_veranstaltungid`
- Cascade Delete Rule

---

### 12. tfx_wettkampf_disziplin (Competition Disciplines)
Junction table linking competitions to their disciplines/devices.

```
Table: tfx_wettkampf_disziplin
├── int_wettkampf_disziplinid (PK, AutoIncrement) - Primary key
├── int_wettkampfid (FK) - Competition identifier
├── int_disziplinenid (FK) - Device identifier
├── int_position (Integer) - Display order
├── bol_geraetegruppe (Boolean) - Device group flag
└── Relationships: ← tfx_durchgang, tfx_wertung
```

**Constraints**:
- Primary Key: `int_wettkampf_disziplinid`
- Foreign Keys:
  - `int_wettkampfid` → `tfx_wettkampf.int_wettkampfid`
  - `int_disziplinenid` → `tfx_disziplinen.int_disziplinenid`
- Cascade Delete Rules

---

### 13. tfx_wettkampfperson (Competition Participants)
Participants enrolled in specific competitions.

```
Table: tfx_wettkampfperson
├── int_wettkampfpersonid (PK, AutoIncrement) - Primary key
├── int_wettkampfid (FK) - Competition identifier
├── int_personid (FK) - Participant identifier
├── var_startnum (String) - Start number in competition
├── var_geschlecht (String) - Gender
├── int_altersgruppe (Integer) - Age group
├── var_klasse (String) - Class/Level
└── Relationships: ← tfx_wertung
```

**Constraints**:
- Primary Key: `int_wettkampfpersonid`
- Foreign Keys:
  - `int_wettkampfid` → `tfx_wettkampf.int_wettkampfid`
  - `int_personid` → `tfx_person.int_personid`
- Cascade Delete Rules

---

### 14. tfx_durchgang (Rounds/Rotations)
Stores rounds or rotation groups in a competition.

```
Table: tfx_durchgang
├── int_durchgangid (PK, AutoIncrement) - Primary key
├── int_wettkampfid (FK) - Competition identifier
├── int_wettkampf_disziplinid (FK) - Competition discipline identifier
├── var_name (String) - Round name (e.g., "Rotation 1")
├── int_position (Integer) - Display order
├── tim_start (Time) - Start time
├── bol_aktiv (Boolean) - Active status
└── Relationships: ← tfx_wertung
```

**Constraints**:
- Primary Key: `int_durchgangid`
- Foreign Keys:
  - `int_wettkampfid` → `tfx_wettkampf.int_wettkampfid`
  - `int_wettkampf_disziplinid` → `tfx_wettkampf_disziplin.int_wettkampf_disziplinid`
- Cascade Delete Rules

---

### 15. tfx_wertung (Scores/Ratings)
Stores individual scores for participants.

```
Table: tfx_wertung
├── int_wertungid (PK, AutoIncrement) - Primary key
├── int_wettkampfpersonid (FK) - Participant identifier
├── int_durchgangid (FK) - Round identifier
├── int_disziplinenid (FK) - Device identifier
├── int_feldid (FK) - Field identifier
├── int_formelid (FK) - Formula identifier
├── var_wert (String) - Score value
├── var_benutzer (String) - User who entered score
├── dat_aenderung (Date) - Last modification date
├── tim_aenderung (Time) - Last modification time
└── Relationships: (leaf table)
```

**Constraints**:
- Primary Key: `int_wertungid`
- Foreign Keys:
  - `int_wettkampfpersonid` → `tfx_wettkampfperson.int_wettkampfpersonid`
  - `int_durchgangid` → `tfx_durchgang.int_durchgangid`
  - `int_disziplinenid` → `tfx_disziplinen.int_disziplinenid`
  - `int_feldid` → `tfx_disziplinen_felder.int_feldid`
  - `int_formelid` → `tfx_formeln.int_formelid`
- Cascade Delete Rules
- No cascade delete from fields/formulas (Restrict rule) to preserve audit trail

---

## 🔗 Key Relationships

### Data Flow
```
tfx_bereiche (Region)
├── tfx_verband (Federation)
│   └── tfx_verein (Club)
│       └── tfx_person (Participant)
│           └── tfx_wettkampfperson (Enrollment)
│               └── tfx_wertung (Score)
│                   ├── tfx_disziplinen (Device)
│                   │   ├── tfx_disziplinen_felder (Field)
│                   │   └── tfx_formeln (Formula)
│                   └── tfx_durchgang (Round)
│                       └── tfx_wettkampf_disziplin (Comp. Discipline)
│                           └── tfx_wettkampf (Competition)
│                               └── tfx_veranstaltung (Event)
```

### Cascade Delete Rules
- **Cascade**: `tfx_bereiche` → all regional entities (verband, verein, person, disziplinen)
- **Cascade**: `tfx_veranstaltung` → competitions, participants
- **Cascade**: `tfx_wettkampf` → participants, rounds, scores
- **Cascade**: `tfx_person` → competition enrollments, scores
- **Restrict**: Score integrity preserved when deleting formulas/fields

---

## 📋 Initialization Process

### Step 1: Create Database
```sql
CREATE DATABASE turnfix;
```

### Step 2: Initialize Schema
Executed via `prisma migrate deploy`:
- Creates all 15+ tables
- Establishes foreign key relationships
- Sets up cascade rules
- Creates auto-increment sequences

### Step 3: Populate GymNet Presets
Inserts canonical data:
- 4 Sport categories (Turnen DTB, Turnen DTB LK, Turnen DTB Turn10, Turnen DTB P)
- 60+ Devices with gender flags
- 100+ Scoring formulas
- Device field templates (3 fields for P-devices, 5+ for regular devices)

---

## 🔍 Data Type Mapping

| Type | PostgreSQL | Description | Example |
|------|-----------|-------------|---------|
| `int_*` | INTEGER | Auto-increment IDs | 1, 2, 3 |
| `var_*` | VARCHAR(255) | Text strings | "Boden", "Reck" |
| `bol_*` | BOOLEAN | True/False flags | true, false |
| `flt_*` | DECIMAL(5,2) | Decimal numbers | 8.50, 9.25 |
| `dat_*` | DATE | Dates | 2024-10-31 |
| `tim_*` | TIME | Times | 10:30:00 |
| `txt_*` | TEXT | Long text | Notes, descriptions |

---

## 🚀 Usage in Application

### Backend API (Node.js/Prisma)
```typescript
// Example: Get all devices for a sport
const devices = await prisma.tfx_disziplinen.findMany({
  where: { int_sportid: 1 },
  include: { tfx_disziplinen_felder: true, tfx_formeln: true }
});

// Example: Insert competition scores
await prisma.tfx_wertung.create({
  data: {
    int_wettkampfpersonid: 123,
    int_durchgangid: 456,
    int_disziplinenid: 31,
    int_feldid: 1,
    var_wert: "8.50"
  }
});
```

### Frontend API Routes
```
GET  /api/disciplines          - List all devices
GET  /api/competitions/:id     - Get competition details
POST /api/scores               - Record a score
GET  /api/results/:eventId     - Get competition results
```

---

## 📝 Notes

- All times are stored as local wall-clock time (no timezone information)
- Scores are stored as strings to preserve formatting precision
- Deleting a region cascades to all dependent data
- Sport categories are managed through configuration UI
- Device fields for P-devices are automatically generated during schema creation
- GymNet IDs (`int_gymnetid`) enable integration with external systems

---

**End of Database Schema Documentation**
