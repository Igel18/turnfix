# Konzept: Vereinheitlichung der Zuweisungs-UIs (Assignment UIs)

**Datum:** 2025-11-10  
**Punkt:** 146  
**Status:** Konzept/Planung

---

## 📋 Übersicht

Aktuell gibt es verschiedene UIs für die Zuweisung von Datensätzen zueinander. Diese sollen vereinheitlicht werden, um:
- Konsistente Benutzererfahrung zu schaffen
- Code-Wiederverwendung zu maximieren
- Wartbarkeit zu verbessern
- Entwicklungszeit für neue Zuweisungstypen zu reduzieren

---

## � Detaillierter Vergleich: Groups vs. Squads vs. Teams vs. EventParticipants

Diese Tabelle zeigt die Unterschiede zwischen den vier Hauptfeatures für Teilnehmer-Zuordnung:

| Feature | **Groups (Gruppen)** | **Squads (Riegen)** | **Teams (Mannschaften)** | **EventParticipants (Teilnehmer)** |
|---------|---------------------|---------------------|--------------------------|-----------------------------------|
| **Primäre Entität** | `tfx_gruppen` | *Virtual/In-Memory* | `tfx_mannschaften` | `tfx_teilnehmer` |
| **Verknüpfungstabelle** | `tfx_gruppen_x_teilnehmer` | `tfx_riegen_x_disziplinen` | `tfx_man_x_teilnehmer` | `tfx_wertungen` |
| **Beziehungstyp** | M:N (Group ↔ Participant) | M:N (Squad ↔ Discipline) | M:N (Team ↔ Participant) | **2-stufig**: M:N (Athlete ↔ Event), dann M:N (Participant ↔ Competition) |
| **Event-Zuordnung** | ❌ Nein (verein-übergreifend) | ❌ Nein | ❌ Nein | ✅ **JA** (über `tfx_wertungen`) |
| **Wettkampf-Zuordnung** | ❌ Nein | ✅ Ja, **mehrere** möglich | ✅ Ja, **genau EINER (Pflicht!)** | ✅ **JA** (über `tfx_wertungen`, M:N) |
| **Verein-Zuordnung** | ✅ Ja (Pflicht, `int_vereineid`) | ❌ Nein | ✅ Ja (Pflicht, `int_vereineid`) | ✅ Ja (über `tfx_teilnehmer.int_vereineid`) |
| **Teilnehmer-Zuordnung** | ✅ M:N (mehrere Teilnehmer pro Gruppe) | ✅ M:N (mehrere Teilnehmer pro Riege) | ✅ M:N (mehrere Teilnehmer pro Team) | - (ist selbst der Teilnehmer) |
| **Nummer** | ❌ Nein | ❌ Nein | ✅ Ja (`int_nummer`, Mannschafts-Nr.) | ❌ Nein |
| **Startnummer** | ❌ Nein | ❌ Nein | ✅ Ja (`int_startnummer`, optional) | ✅ Ja (`tfx_wertungen.int_startnummer`) |
| **Riegen-Buchstabe** | ❌ Nein | ❌ Nein | ✅ Ja (`var_riege`, z.B. "A") | ✅ Ja (`tfx_wertungen.var_riege`) |
| **Datenbank-Persistenz** | ✅ Immer persistent | ⚠️ Virtual bis erste Teilnehmer-Zuweisung | ✅ Immer persistent | ✅ Immer persistent |
| **UI-Pattern** | Three-Column Assignment | Three-Column Assignment | Three-Column Assignment | **Liste + Filter + Inline-Edit** |
| **Container-Navigation** | ✅ Ja (mehrere Gruppen gleichzeitig) | ✅ Ja (mehrere Riegen gleichzeitig) | ✅ Ja (mehrere Teams gleichzeitig) | ❌ Nein (alle Participants eines Events) |
| **Zweck** | Verein-interne Gruppierung | Wettkampf-Durchgänge organisieren | Mannschaftswettkämpfe | Event-Teilnahme + Wettkampf-Zuweisung |

### 🔍 Detaillierte Struktur-Unterschiede

#### **1. Groups (Gruppen)**
```sql
tfx_gruppen (int_gruppenid, int_vereineid, var_name)
  ↓ M:N via tfx_gruppen_x_teilnehmer
tfx_teilnehmer
```
- **Zweck**: Verein-interne Gruppierung von Teilnehmern (z.B. Trainingsgruppen, Altersklassen)
- **Beispiel**: "Nachwuchs-Team TV München", "Leistungsgruppe SV Berlin"
- **Keine Wettkampf-Bindung!** - Gruppen sind wettkampf-unabhängig
- **Persistenz**: Immer in Datenbank
- **UI**: Three-Column Master-Detail (Gruppen-Liste | Verfügbare Teilnehmer | Gruppen-Details)

#### **2. Squads (Riegen)**
```sql
VIRTUAL Squad Object (in-memory, nicht in DB)
  ↓ M:N via tfx_riegen_x_disziplinen
tfx_disziplinen (Geräte: Reck, Barren, etc.)
```
- **Zweck**: Wettkampf-Durchgänge organisieren (welche Riege turnt wann an welchem Gerät)
- **Beispiel**: "Riege A" turnt zuerst Reck (20:00 Uhr), dann Barren (20:15 Uhr)
- **Mehrere Wettkämpfe möglich!** - Eine Riege kann Teilnehmer aus mehreren Wettkämpfen enthalten
- **Persistenz**: Wird erst persistent, wenn Teilnehmer zugewiesen werden (in `tfx_wertungen.var_riege`)
- **Virtual Squad Hinweise**: Orange "Virtual"-Badge, Hinweis auf In-Memory-Status
- **UI**: Three-Column Master-Detail (Riegen-Liste | Verfügbare Teilnehmer | Riegen-Details mit Competitions)

#### **3. Teams (Mannschaften)** ⭐
```sql
tfx_mannschaften (
  int_mannschaftenid, 
  int_wettkaempfeid NOT NULL,  -- PFLICHT!
  int_vereineid NOT NULL,       -- PFLICHT!
  int_nummer, 
  var_riege, 
  int_startnummer
)
  ↓ M:N via tfx_man_x_teilnehmer
tfx_teilnehmer
```
- **Zweck**: Mannschaftswettkämpfe organisieren (z.B. "TV München Mannschaft 1" vs "SV Berlin Mannschaft 2")
- **Beispiel**: "TV München 1" turnt im Wettkampf "Mehrkampf männlich AK 12" mit Startnummer 42 in Riege A
- **PFLICHT-Felder**: 
  - `int_wettkaempfeid` - **Genau EIN Wettkampf muss zugewiesen sein!**
  - `int_vereineid` - Team gehört zu einem Verein
- **Charakteristik**: Ein Team = Ein Verein + Ein Wettkampf + Nummer + optional Startnummer/Riege
- **Persistenz**: Immer in Datenbank
- **UI**: Three-Column Master-Detail (Teams-Liste | Verfügbare Teilnehmer | Team-Details)

#### **4. EventParticipants (Teilnehmer)** 🎯
```sql
tfx_teilnehmer (
  int_teilnehmerid, 
  int_vereineid, 
  var_vorname, 
  var_nachname, 
  int_geschlecht, 
  dat_geburtstag
)
  ↓ 1:N via tfx_wertungen (M:N Join-Table!)
tfx_wettkaempfe (competitions within event)
```
- **Zweck**: Teilnehmer zu einem Event hinzufügen und dann Wettkämpfen zuweisen
- **Beispiel**: "Max Mustermann" → Event "Bezirksmeisterschaft" → Wettkämpfe ["Reck", "Barren", "Sprung"]
- **2-stufiger Prozess**:
  1. **Stufe 1**: Athlete zu Event hinzufügen → wird zu EventParticipant
  2. **Stufe 2**: EventParticipant zu Competitions zuweisen (M:N via `tfx_wertungen`)
- **`tfx_wertungen` = M:N Join-Table** mit zusätzlichen Feldern:
  - `int_wettkaempfeid` (Competition)
  - `int_teilnehmerid` (Participant)
  - `int_startnummer` (Startnummer des Teilnehmers)
  - `var_riege` (Riegen-Buchstabe, z.B. "A", "B")
  - `bol_startet_nicht` (DNS - Did Not Start)
  - `bol_ak` (Außer Konkurrenz)
  - `var_comment` (Kommentar)
- **Persistenz**: `tfx_teilnehmer` immer persistent, `tfx_wertungen` nur bei Wettkampf-Zuweisung
- **UI**: **NICHT Three-Column Assignment!** Stattdessen:
  - Tabelle/Cards-View mit Filtern (Verein, Geschlecht, Wettkampf)
  - Inline-Edit für Competition-Zuweisung (Dropdown mit Checkboxes)
  - Bulk-Actions für mehrere Teilnehmer gleichzeitig

### 🎯 Der zentrale Unterschied

**EventParticipants ist KEIN klassisches M:N Assignment wie Groups/Squads/Teams!**

**Teams (klassisches M:N Assignment)**:
```
Container (Team) ↔ Items (Participants) zuweisen
↑
Fokus: Teilnehmer zwischen Teams hin- und herbewegen
```

**EventParticipants (2-stufige Zuordnung)**:
```
Stufe 1: Athlete → Event hinzufügen (wird zu EventParticipant)
Stufe 2: EventParticipant ↔ Competitions zuweisen (M:N)
↑
Fokus: Competitions an bestehende Participants zuweisen
```

**Warum EventParticipants eine Listen-UI braucht:**
- ✅ Alle Participants eines Events in einer Liste
- ✅ Filtern nach Verein, Geschlecht, Wettkampf, etc.
- ✅ Inline-Edit für Competition-Zuweisung
- ✅ Bulk-Actions (z.B. alle Teilnehmer eines Vereins zu einem Wettkampf zuweisen)
- ❌ **KEINE** Container-Navigation (kein "Team 1", "Team 2" auswählen)
- ❌ **KEINE** "Verfügbar vs Zugewiesen" Spalten

**Warum Teams/Groups/Squads Three-Column Assignment brauchen:**
- ✅ Container-Navigation (Team/Gruppe/Riege auswählen)
- ✅ "Verfügbar vs Zugewiesen" Spalten
- ✅ Teilnehmer zwischen Containern verschieben
- ✅ Klare Zuweisung zu genau einem Container zur Zeit

---

## �🔢 Beziehungstypen & UI-Patterns

---

### Was ist eine 1:1 Beziehung?

**Definition:** Eine **1:1 (One-to-One)** Beziehung bedeutet, dass ein Datensatz der einen Seite mit maximal einem Datensatz der anderen Seite verbunden ist, und umgekehrt.

**Beispiele:**
- **Benutzer ↔ Profil**: Ein Benutzer hat ein Profil, ein Profil gehört zu einem Benutzer
- **Person ↔ Reisepass**: Eine Person hat einen Reisepass, ein Reisepass gehört zu einer Person
- **Wettkampf ↔ Siegerehrung**: Ein Wettkampf hat eine Siegerehrung, eine Siegerehrung gehört zu einem Wettkampf

**Charakteristik:**
- ✅ Exklusive Beziehung (1:1 Mapping)
- ✅ Oft Denormalisierung oder Aufteilung großer Tabellen
- ❌ Keine Mehrfachzuweisung
- ❌ Keine "Verfügbar"-Liste sinnvoll

**Passende UI-Patterns:**

| Pattern | Beschreibung | Use Case |
|---------|--------------|----------|
| **Inline-Formular** | Details direkt im Hauptformular | Profil-Daten im User-Formular |
| **Verknüpfter Tab** | Separate Tab-Section | Erweiterte Details |
| **Modal mit Einzelauswahl** | Auswahl eines verknüpften Elements | Beziehung herstellen |
| **Autocomplete-Feld** | Typeahead-Suche | Große Auswahl an möglichen Verknüpfungen |

**Beispiel UI (Person ↔ Profil - 1:1):**
```
┌─────────────────────────────────────────────────┐
│  Person bearbeiten                             │
├─────────────────────────────────────────────────┤
│  Name:      [Max Mustermann          ]         │
│  Geburtstag: [01.01.2000             ]         │
│                                                 │
│  ┌─ Profil-Details ────────────────────────┐   │
│  │ Bio:     [Sportler seit...          ]   │   │
│  │ Website: [https://...               ]   │   │
│  │ Foto:    [Upload...]                    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Speichern] [Abbrechen]                       │
└─────────────────────────────────────────────────┘
```

**Warum NICHT UnifiedAssignmentModal?**
- ❌ Keine "Zuweisung" im eigentlichen Sinne
- ❌ Kein "Verfügbar" vs "Zugewiesen" - nur eine direkte Verknüpfung
- ❌ Meist Teil des Hauptformulars (Inline-Edit)

---

### Was ist eine 1:N Beziehung?

**Definition:** Eine **1:N (One-to-Many)** Beziehung bedeutet, dass ein Datensatz der einen Seite mit mehreren Datensätzen der anderen Seite verbunden sein kann, aber jeder Datensatz der anderen Seite gehört zu maximal einem Datensatz der ersten Seite.

**Beispiele:**
- **Verein ↔ Teilnehmer**: Ein Verein hat viele Teilnehmer, aber jeder Teilnehmer gehört zu einem Verein
- **Wettkampf ↔ Ergebnisse**: Ein Wettkampf hat viele Ergebnisse, aber jedes Ergebnis gehört zu einem Wettkampf
- **Kategorie ↔ Produkte**: Eine Kategorie hat viele Produkte, aber ein Produkt gehört zu einer Kategorie

**WICHTIG - EventParticipants ist NICHT 1:N:**
- ❌ **Event ↔ Teilnehmer** ist eigentlich **M:N** (Athlete ↔ Event)!
  - Ein Athlete kann in **mehreren Events** teilnehmen
  - Ein Event hat **mehrere Athletes**
  - → Zwischentabelle: `EventParticipants` (Join-Table)
- ❌ **EventParticipant ↔ Competition** ist ebenfalls **M:N**!
  - Ein Participant kann an **mehreren Competitions** teilnehmen
  - Eine Competition hat **mehrere Participants**
  - → Zwischentabelle: `ParticipantCompetitions` (Join-Table)

**Charakteristik:**
- ✅ Hierarchische Beziehung (Eltern-Kind)
- ✅ Klare Zugehörigkeit
- ❌ Keine mehrfache Zuweisung möglich

**Passende UI-Patterns:**

| Pattern | Beschreibung | Use Case |
|---------|--------------|----------|
| **Liste mit Filter** | Haupttabelle mit Filteroptionen | Große Datenmengen (EventParticipants) |
| **Dropdown-Auswahl** | Auswahl des übergeordneten Elements | Wenige Optionen (Event auswählen) |
| **Hierarchische Ansicht** | Tree-View mit Expandable Items | Verschachtelte Strukturen |
| **Master-Detail** | Liste links, Details rechts | Detail-Ansicht wichtig |

**Beispiel UI (EventParticipants - 1:N):**
```
┌─────────────────────────────────────────────────┐
│  Event: Bezirksmeisterschaft 2025              │
├─────────────────────────────────────────────────┤
│  [Filter: Verein ▼] [Filter: Geschlecht ▼]    │
├─────────────────────────────────────────────────┤
│  Teilnehmer-Liste (Tabelle/Cards)              │
│  ┌──────────────────────────────────────────┐  │
│  │ □ Max Mustermann | TV Musterstadt | m   │  │
│  │ □ Anna Beispiel  | SV Beispiel    | w   │  │
│  │ □ Peter Test     | TV Musterstadt | m   │  │
│  └──────────────────────────────────────────┘  │
│  [+ Teilnehmer hinzufügen] [Bulk-Actions]     │
└─────────────────────────────────────────────────┘
```

**Warum NICHT UnifiedAssignmentModal?**
- ❌ Keine "Zuweisung" zwischen zwei gleichberechtigten Entitäten
- ❌ Kein "Verfügbar" vs "Zugewiesen" - alle Teilnehmer gehören bereits zum Event
- ❌ Fokus liegt auf **Verwaltung/Anzeige**, nicht auf **Zuweisung**

**Anmerkung zu EventParticipants:**
EventParticipants sieht aus wie 1:N, ist aber technisch **M:N**:
- **Athlete ↔ Event** (M:N): `EventParticipants` ist die Join-Table
- **EventParticipant ↔ Competition** (M:N): `ParticipantCompetitions` ist die Join-Table

Dennoch wird eine **Listen-UI** verwendet (nicht Assignment-UI), weil:
- Fokus auf Verwaltung der Participants **innerhalb eines Events**
- Keine "Container-Auswahl" wie bei Riegen
- Bulk-Zuweisung von Competitions an Participants (Inline-Dropdown)

---

### Was ist eine M:N Beziehung?

**Definition:** Eine **M:N (Many-to-Many)** Beziehung bedeutet, dass ein Datensatz der einen Seite mit mehreren Datensätzen der anderen Seite verbunden sein kann, UND umgekehrt.

**Beispiele:**
- **Riegen ↔ Teilnehmer**: Eine Riege hat mehrere Teilnehmer, ein Teilnehmer kann in mehreren Riegen sein
- **Gruppen ↔ Teilnehmer**: Eine Gruppe hat mehrere Mitglieder, ein Teilnehmer kann in mehreren Gruppen sein
- **Wettkämpfe ↔ Disziplinen**: Ein Wettkampf hat mehrere Disziplinen, eine Disziplin kommt in mehreren Wettkämpfen vor
- **Mannschaften ↔ Teilnehmer**: Ein Team hat mehrere Mitglieder, ein Teilnehmer kann in mehreren Teams sein
- **Kampfrichter ↔ Disziplinen**: Ein Kampfrichter bewertet mehrere Disziplinen, eine Disziplin wird von mehreren Kampfrichtern bewertet

**Charakteristik:**
- ✅ Gleichberechtigte Beziehung (keine Hierarchie)
- ✅ Mehrfache Zuweisung in beide Richtungen
- ✅ Zwischentabelle in Datenbank (Join-Table)
- ✅ Items können "verfügbar" oder "zugewiesen" sein

**Passende UI-Patterns:**

| Pattern | Beschreibung | Use Case | Layout |
|---------|--------------|----------|--------|
| **Two-Column Assignment** | Verfügbar ↔ Zugewiesen | Einfache M:N ohne Container | 2-Spalten |
| **Three-Column Master-Detail** | Container ↔ Verfügbar ↔ Details | M:N mit mehreren Containern (Riegen!) | 3-Spalten |
| **Checkbox-Grid** | Checkboxen für alle Optionen | Wenige Items mit zusätzlichen Feldern | Inline |
| **Dropdown mit Liste** | Dropdown + zugewiesene Liste | Sehr wenige Items | Vertikal |

**Beispiel UI: Two-Column (Gruppen ↔ Teilnehmer):**
```
┌─────────────────────────────────────────────────────┐
│  Gruppe: "U12 Jungs" - Mitglieder verwalten   [X] │
├─────────────────────────────────────────────────────┤
│  [Search: Suche...]  [Filter: Verein ▼]           │
├──────────────────────┬──────────────────────────────┤
│  Verfügbar (25)      │  Zugewiesen zu Gruppe (8)   │
│  ┌────────────────┐  │  ┌────────────────┐         │
│  │ ☐ Max M.   [→] │  │  │ ☑ Anna B.  [←] │         │
│  │ ☐ Peter T. [→] │  │  │ ☑ Lisa S.  [←] │         │
│  │ ☐ Tom K.   [→] │  │  │ ☑ Jan W.   [←] │         │
│  │   ...          │  │  │   ...          │         │
│  └────────────────┘  │  └────────────────┘         │
│  [Assign Selected]   │  [Remove Selected]          │
└──────────────────────┴──────────────────────────────┘
```

**Beispiel UI: Three-Column Master-Detail (Riegen ↔ Teilnehmer):**
```
┌───────────────────────────────────────────────────────────────┐
│  Riegen Management                                   [X]      │
├───────────────────────────────────────────────────────────────┤
│  [Search] [Filter: Verein ▼] [Filter: Wettkampf ▼]          │
├──────────────┬─────────────────────┬──────────────────────────┤
│  Riegen (5)  │  Verfügbar (50)     │  Riege "A" Details      │
│  ┌────────┐  │  ┌──────────────┐   │  ┌──────────────────┐   │
│  │▶ Riege A│  │  │☐ Max M.  [→] │   │  │☑ Anna B.    [←]  │   │
│  │  Riege B│  │  │☐ Peter T.[→] │   │  │☑ Lisa S.    [←]  │   │
│  │  Riege C│  │  │☐ Tom K.  [→] │   │  │☑ Jan W.     [←]  │   │
│  │  + Neu  │  │  │   ...        │   │  │   ...            │   │
│  └────────┘  │  └──────────────┘   │  └──────────────────┘   │
│              │                     │                          │
│  Master-List │  Available Items    │  Detail-Pane             │
│  (Container) │  (zum Zuweisen)     │  (Zugewiesene + Info)    │
└──────────────┴─────────────────────┴──────────────────────────┘
```

**Warum UnifiedAssignmentModal PERFEKT passt:**
- ✅ Klare "Verfügbar" vs "Zugewiesen" Trennung
- ✅ Bidirektionale Zuweisung (hinzufügen/entfernen)
- ✅ Bulk-Operationen sinnvoll
- ✅ Such- und Filterfunktionen wichtig
- ✅ Drei-Spalten-Layout für mehrere Container (z.B. mehrere Riegen gleichzeitig verwalten)

---

### Vergleich: 1:N vs M:N

| Aspekt | 1:N (One-to-Many) | M:N (Many-to-Many) |
|--------|-------------------|-------------------|
| **Beziehung** | Hierarchisch, Eltern-Kind | Gleichberechtigt |
| **Mehrfachzuweisung** | ❌ Nein (Kind hat nur 1 Eltern) | ✅ Ja (beide Seiten mehrfach) |
| **Datenbank** | Foreign Key in Child-Tabelle | Join-Tabelle erforderlich |
| **UI-Fokus** | Verwaltung, Anzeige, Filter | Zuweisung, Auswahl, Transfer |
| **Typische Aktionen** | Erstellen, Bearbeiten, Löschen, Filtern | Zuweisen, Entfernen, Bulk-Assign |
| **"Verfügbar"-Konzept** | ❌ Nicht sinnvoll | ✅ Zentral wichtig |
| **UnifiedAssignmentModal** | ❌ Nicht geeignet | ✅ Perfekt geeignet |

**Beispiel-Szenarien:**

**1:N Szenario** (EventParticipants):
```
Event: "Bezirksmeisterschaft 2025"
├── Teilnehmer: Max Mustermann
├── Teilnehmer: Anna Beispiel
├── Teilnehmer: Peter Test
└── Teilnehmer: Lisa Schmidt

→ Jeder Teilnehmer gehört NUR zu diesem Event
→ Fokus: Liste anzeigen, filtern, bearbeiten
→ UI: Tabelle/Cards mit Filtern
```

**M:N Szenario** (Riegen ↔ Teilnehmer):
```
Riege A (Boden)          Teilnehmer            Riege B (Sprung)
├── Max Mustermann ←───→ Max Mustermann ←───→ (auch hier!)
├── Anna Beispiel  ←───→ Anna Beispiel  ←───→ (auch hier!)
└── Peter Test                                └── Lisa Schmidt

→ Max und Anna sind in BEIDEN Riegen
→ Fokus: Items zwischen Riegen hin- und herbewegen
→ UI: Two/Three-Column Assignment mit "Verfügbar"/"Zugewiesen"
```

---

### Entscheidungsbaum: Welches UI-Pattern?

```
Beziehungstyp?
│
├─ 1:1 (One-to-One)
│  └─ Inline-Formular oder Modal mit Autocomplete
│
├─ 1:N (One-to-Many)
│  └─ Anzahl Items?
│     ├─ Wenig (<20)     → Master-Detail (links Liste, rechts Details)
│     ├─ Mittel (20-100) → Tabelle mit Inline-Edit
│     └─ Viel (>100)     → Tabelle + Filter + Pagination
│
└─ M:N (Many-to-Many)
   └─ Gibt es mehrere "Container"?
      ├─ Nein (1 Container)
      │  └─ Anzahl Items?
      │     ├─ Wenig (<20)     → Single-Column (Dropdown + Liste)
      │     ├─ Mittel (20-50)  → Two-Column Assignment
      │     └─ Viel (>50)      → Two-Column + Search + Filter
      │
      └─ Ja (Mehrere Container, z.B. mehrere Riegen)
         └─ Three-Column Master-Detail
            ├─ Spalte 1: Container-Auswahl (Master-List)
            ├─ Spalte 2: Verfügbare Items (Available-List)
            └─ Spalte 3: Zugewiesene Items + Details (Detail-Pane)
```

**Beispiele:**

| Use Case | Beziehung | Container? | Items | UI-Pattern |
|----------|-----------|------------|-------|------------|
| User → Profil | 1:1 | - | 1 | Inline-Formular (NICHT Assignment) |
| Verein → Teilnehmer | 1:N | - | >100 | Tabelle + Filter (NICHT Assignment) |
| **Athlete → Event** | **M:N** | - | >100 | **Liste + Filter** (Spezialfall: Listen-UI statt Assignment)* |
| **EventParticipant → Competition** | **M:N** | - | 5-15 | **Inline-Dropdown** (Bulk-Zuweisung)* |
| Gruppen → Teilnehmer | M:N | 1 Gruppe | 20-50 | Two-Column Assignment |
| Riegen → Teilnehmer | M:N | **Mehrere Riegen** | >50 | **Three-Column Master-Detail** |
| Teams → Teilnehmer | M:N | 1 Team | 10-20 | Two-Column oder Dropdown+Liste |
| Wettkampf → Disziplinen | M:N | 1 Wettkampf | 10-15 | Checkbox-Grid (wegen max_score) |

**\* EventParticipants Spezialfall:**
- Technisch **M:N** (Athlete ↔ Event, EventParticipant ↔ Competition)
- ABER: UI ist **Listen-fokussiert** (keine Assignment-UI)
- Grund: Verwaltung **innerhalb eines Events**, keine Container-Navigation
- Competitions werden via Inline-Dropdown **bulk-zugewiesen**

---

## 🎯 Betroffene Zuweisungstypen

### Identifizierte Zuweisungen

| # | Zuweisung | Beziehung | Aktueller Ort | Status | UI-Pattern |
|---|-----------|-----------|---------------|--------|------------|
| 1 | **Wettkämpfe ↔ Disziplinen** | **M:N** | `CompetitionFormModal.tsx` | ✅ Vorhanden | Inline-Checkboxen in Modal |
| 2 | **Athlete ↔ Event** | **M:N** | `EventParticipants` (Page) | ✅ Vorhanden | Liste + Filter (Spezialfall)* |
| 2b | **EventParticipant ↔ Competition** | **M:N** | `EventParticipants` (Inline) | ✅ Vorhanden | Inline-Dropdown (Bulk) |
| 3 | **Riegen ↔ Teilnehmer** | **M:N** | `SquadManagement.tsx` | ✅ Vorhanden | Drag & Drop + 3-Column Master-Detail |
| 4 | **Mannschaften ↔ Teilnehmer** | **M:N** | `TeamPenaltiesModal.tsx` (Abzüge)<br>`components/` (fehlend) | ⚠️ Teilweise | Modal |
| 5 | **Gruppen ↔ Teilnehmer** | **M:N** | `GroupMembersModal.tsx` | ✅ Vorhanden | Modal mit Dropdown |

**Legende Beziehungstypen:**
- **1:1 (One-to-One)**: Exklusive Beziehung, 1:1 Mapping → **❌ UnifiedAssignmentModal NICHT geeignet** (Inline-Formular)
- **1:N (One-to-Many)**: Item gehört zu maximal einem Eltern-Element → **❌ UnifiedAssignmentModal NICHT geeignet** (Listen-UI)
- **M:N (Many-to-Many)**: Item kann mehrfach zugewiesen werden (z.B. Teilnehmer in mehreren Riegen) → **✅ UnifiedAssignmentModal geeignet**

**\* EventParticipants Spezialfall:**
- Beziehungen sind technisch **M:N** (Athlete ↔ Event, EventParticipant ↔ Competition)
- ABER: UI ist **Listen-fokussiert** statt Assignment-fokussiert
- Grund: Verwaltung innerhalb eines Events, keine Container-Navigation wie bei Riegen
- Dennoch könnten Teilbereiche (z.B. Competition-Zuweisung) theoretisch UnifiedAssignmentModal nutzen

### Weitere identifizierte Zuweisungen

| # | Zuweisung | Beziehung | Potenzieller Bedarf | Priorität |
|---|-----------|-----------|---------------------|-----------|
| 7 | **Wettkämpfe ↔ Durchgänge** | **M:N** | TimePlanning | Niedrig (bereits integriert) |
| 8 | **Riegen ↔ Wettkämpfe** | **M:N** | SquadManagement | Mittel |
| 9 | **Kampfrichter ↔ Wettkämpfe** | **M:N** | Jury Portal | Hoch (separates System) |
| 10 | **Mannschaften ↔ Wettkämpfe** | **M:N** | Teams Page | Hoch (aktuell fehlend?) |

---

## 🔍 Analyse der bestehenden Implementierungen

### 1. Wettkämpfe ↔ Disziplinen
**Datei:** `client/src/components/CompetitionFormModal.tsx` (905 Zeilen)

**Pattern:**
- Checkboxen-Grid innerhalb des Competition-Formulars
- Disziplinen gefiltert nach Geschlecht
- Gruppierung nach Disziplinen-Gruppen
- Inline max-score Eingabe pro Disziplin

**Eigenschaften:**
```typescript
// Daten-Struktur
disciplines: { disciplineId: number; maxScore: number }[]

// UI-Features
- Gender-basierte Filterung
- Disziplinen-Gruppen Dropdown
- Bulk-Actions (alle setzen)
- Inline validation
- Visuelles Feedback (bereits zugewiesen)
```

**Stärken:**
- ✅ Übersichtlich bei wenigen Disziplinen
- ✅ Schnelle Mehrfachauswahl
- ✅ Zusätzliche Parameter (maxScore) direkt sichtbar

**Schwächen:**
- ❌ Nicht skalierbar bei vielen Disziplinen
- ❌ Keine Suchfunktion
- ❌ Modal bereits sehr groß (905 Zeilen - needs SoC!)

---

### 2. Teilnehmer ↔ Wettkämpfe
**Datei:** `client/src/pages/EventParticipants/` (verschiedene Komponenten)

**Pattern:**
- Inline-Auswahl in Teilnehmer-Tabelle
- Bulk-Assignment möglich
- Status-Anzeige (Anzahl zugewiesener Wettkämpfe)

**Eigenschaften:**
```typescript
// UI-Features
- Multi-select für Teilnehmer
- Dropdown für Wettkampf-Auswahl
- Bulk-Zuweisung
- Status-Badge mit Count
```

**Stärken:**
- ✅ Schnelle Bulk-Operationen
- ✅ Übersichtliche Status-Anzeige
- ✅ Direkt in der Hauptansicht

**Schwächen:**
- ❌ Keine Detail-Ansicht der Zuweisungen
- ❌ Schwer, individuelle Zuweisungen zu prüfen

---

### 3. Riegen ↔ Teilnehmer
**Datei:** `client/src/pages/SquadManagement.tsx` (1070 Zeilen - CRITICAL SoC needed!)

**Pattern:**
- **Drei-Spalten-Layout** (Master-Detail Pattern)
  - **Spalte 1:** Riegen-Liste (Master) mit Auswahl
  - **Spalte 2:** Verfügbare Teilnehmer
  - **Spalte 3:** Details der ausgewählten Riege (Detail)
- Drag & Drop Unterstützung (geplant, aktuell Click-to-assign)
- Virtuelle Riegen ("Nicht zugeordnet")
- Detaillierte Filterung

**Eigenschaften:**
```typescript
// UI-Features
- Master-List: Riegen-Auswahl (links)
- Available List: Teilnehmer zum Zuweisen (mitte)
- Detail Pane: Zugewiesene Teilnehmer + Riegen-Info (rechts)
- Click-to-assign (Pfeil-Button)
- Umfangreiche Filter (gender, club, competition)
- Virtuelle "Nicht zugeordnet" Riege
- Competition-basiertes Highlighting
- PDF Export
- 3-Spalten Grid Layout: lg:grid-cols-3
```

**Stärken:**
- ✅ Sehr intuitiv (Master-Detail Navigation)
- ✅ Visuell ansprechend
- ✅ Umfangreiche Filteroptionen
- ✅ Gute Übersicht über alle Riegen
- ✅ Gleichzeitige Anzeige: Riegen, Verfügbar, Zugewiesen
- ✅ Competition-Highlighting (zeigt relevante Teilnehmer)

**Schwächen:**
- ❌ Datei zu groß (1070 Zeilen - urgent refactoring!)
- ❌ Komplex in der Wartung
- ❌ Nicht generisch wiederverwendbar
- ❌ Kein echtes Drag & Drop (nur Buttons)
- ❌ Layout nur für Full-Screen optimiert

**Besonderheit:**
Dies ist das **einzige UI mit Master-Detail Pattern** - zeigt mehrere "Container" (Riegen) gleichzeitig und erlaubt Navigation zwischen ihnen.

---

### 4. Gruppen ↔ Teilnehmer
**Datei:** `client/src/components/GroupMembersModal.tsx` (263 Zeilen)

**Pattern:**
- Modal mit zwei Bereichen (zugewiesen | hinzufügen)
- Dropdown-Auswahl für verfügbare Teilnehmer
- Liste der zugewiesenen Mitglieder
- Club-basierte Filterung automatisch

**Eigenschaften:**
```typescript
// UI-Features
- Dropdown mit verfügbaren Teilnehmern
- Liste der aktuellen Mitglieder
- Add/Remove Buttons
- Automatische Filterung (gleicher Verein)
- Keine Duplikate möglich
```

**Stärken:**
- ✅ Einfaches, klares Pattern
- ✅ Verhindert automatisch Duplikate
- ✅ Kompakt und wartbar
- ✅ Gute Code-Qualität (263 Zeilen)

**Schwächen:**
- ❌ Dropdown nicht ideal bei vielen Teilnehmern
- ❌ Keine Bulk-Operationen
- ❌ Keine Suchfunktion

---

### 5. Mannschaften ↔ Teilnehmer (Abzüge)
**Datei:** `client/src/components/TeamPenaltiesModal.tsx` (239 Zeilen)

**Hinweis:** Dies ist eigentlich "Mannschaften ↔ Abzugstypen", nicht Teilnehmer!

**Pattern:**
- Modal mit Dropdown für verfügbare Abzugstypen
- Liste der zugewiesenen Abzüge
- Add/Remove Pattern

**Eigenschaften:**
```typescript
// UI-Features
- Dropdown mit verfügbaren Penalty-Types
- Liste mit zugewiesenen Penalties
- Automatische Duplikat-Vermeidung
- Sofortige Punktzahl-Anzeige
```

**Stärken:**
- ✅ Sehr ähnlich zu GroupMembersModal (gutes Pattern!)
- ✅ Kompakt und wartbar
- ✅ Klare Trennung

**Schwächen:**
- ❌ Name irreführend ("Penalties" nicht "Members")
- ❌ Eigentlich kein Teilnehmer-Assignment

**Fehlend:** Echte Mannschaften ↔ Teilnehmer Zuweisung!

---

### 6. Teilnehmer ↔ Veranstaltung
**Datei:** `client/src/pages/EventParticipants/components/AddParticipantModal.tsx` (172 Zeilen)

**Pattern:**
- Modal mit Suche und Tabelle
- Einzelne Zuweisung per Klick
- Filterung durch Suchbegriff

**Eigenschaften:**
```typescript
// UI-Features
- Suchfeld für Teilnehmer
- Tabelle mit allen verfügbaren Teilnehmern
- Gender-Badge Anzeige
- Club-Anzeige
- Add-Button pro Zeile
```

**Stärken:**
- ✅ Suchfunktion vorhanden
- ✅ Übersichtliche Tabelle
- ✅ Guter Code (172 Zeilen)
- ✅ Klare Struktur

**Schwächen:**
- ❌ Keine Bulk-Operationen
- ❌ Keine Sortierung
- ❌ Keine erweiterten Filter

---

## 🎨 Unified Assignment Component - Design Konzept

### Ziel
Eine wiederverwendbare `UnifiedAssignmentModal` Komponente, die alle Zuweisungstypen abdecken kann.

### Core Features

#### 1. Generische Daten-Schnittstelle
```typescript
interface AssignmentItem {
  id: number;
  displayName: string;
  secondaryInfo?: string;
  metadata?: Record<string, any>;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'error';
  };
}

// NEW: Container für Master-Detail Pattern (z.B. Riegen)
interface AssignmentContainer {
  id: number | string;
  name: string;
  displayName: string;
  itemCount: number;
  metadata?: Record<string, any>;
  isVirtual?: boolean;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'error';
  };
}

interface AssignmentConfig<TItem extends AssignmentItem = AssignmentItem> {
  // Titles & Labels
  title: string;
  availableLabel: string;
  assignedLabel: string;
  searchPlaceholder: string;
  emptyAvailableMessage: string;
  emptyAssignedMessage: string;
  
  // Data
  availableItems: TItem[];
  assignedItems: TItem[];
  
  // Master-Detail Pattern (NEW - optional, for 3-column layout)
  containers?: AssignmentContainer[];
  selectedContainer?: AssignmentContainer | null;
  onContainerSelect?: (container: AssignmentContainer) => void;
  onContainerCreate?: () => void;
  onContainerDelete?: (containerId: number | string) => void;
  containerLabel?: string; // e.g. "Riegen", "Teams"
  
  // Actions
  onAssign: (item: TItem, containerId?: number | string) => Promise<void>;
  onUnassign: (item: TItem, containerId?: number | string) => Promise<void>;
  onBulkAssign?: (items: TItem[], containerId?: number | string) => Promise<void>;
  onBulkUnassign?: (items: TItem[], containerId?: number | string) => Promise<void>;
  
  // Features
  enableSearch?: boolean;
  enableBulkActions?: boolean;
  enableDragDrop?: boolean;
  enableFilters?: boolean;
  filters?: AssignmentFilter[];
  
  // Display
  displayMode?: 'two-column' | 'three-column' | 'single-column' | 'checkbox-grid';
  columns?: AssignmentColumn[];
  
  // Additional data per assignment
  additionalFields?: AssignmentField[];
  
  // Validation
  validateAssignment?: (item: TItem, containerId?: number | string) => string | null;
  
  // Custom renderers
  renderItem?: (item: TItem) => React.ReactNode;
  renderBadge?: (item: TItem) => React.ReactNode;
  renderContainer?: (container: AssignmentContainer) => React.ReactNode; // NEW
  renderDetailPane?: (container: AssignmentContainer, items: TItem[]) => React.ReactNode; // NEW
}

interface AssignmentFilter {
  id: string;
  label: string;
  type: 'select' | 'text' | 'checkbox';
  options?: { value: string; label: string }[];
  filterFn: (item: AssignmentItem, value: any) => boolean;
}

interface AssignmentColumn {
  id: string;
  label: string;
  width?: string;
  render: (item: AssignmentItem) => React.ReactNode;
  sortable?: boolean;
}

interface AssignmentField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'select';
  required?: boolean;
  defaultValue?: any;
  options?: { value: any; label: string }[];
  validate?: (value: any) => string | null;
}
```

#### 2. UI Layouts

**Layout 1: Two-Column (Simple Assignment)**
```
┌─────────────────────────────────────────────────────┐
│  Modal Title                              [X]       │
├─────────────────────────────────────────────────────┤
│  [Search] [Filter ▼] [Filter ▼]                   │
├──────────────────────┬──────────────────────────────┤
│  Verfügbar (50)      │  Zugewiesen (12)            │
│  ┌────────────────┐  │  ┌────────────────┐         │
│  │ ☐ Item 1   [→] │  │  │ ☑ Item A   [X] │         │
│  │ ☐ Item 2   [→] │  │  │ ☑ Item B   [X] │         │
│  │ ☐ Item 3   [→] │  │  │ ☑ Item C   [X] │         │
│  │   ...          │  │  │   ...          │         │
│  └────────────────┘  │  └────────────────┘         │
│  [Assign Selected]   │  [Remove Selected]          │
└──────────────────────┴──────────────────────────────┘
```

**Layout 1b: Three-Column (Master-Detail Pattern für SquadManagement)**
```
┌───────────────────────────────────────────────────────────────┐
│  Squad Management                                    [X]      │
├───────────────────────────────────────────────────────────────┤
│  [Search] [Filter ▼] [Filter ▼] [Filter ▼]                  │
├──────────────┬─────────────────────┬──────────────────────────┤
│  Riegen (5)  │  Verfügbar (50)     │  Riege "A" Details      │
│  ┌────────┐  │  ┌──────────────┐   │  ┌──────────────────┐   │
│  │▶ Riege A│  │  │☐ Person 1 [→]│   │  │☑ Person X    [←] │   │
│  │  Riege B│  │  │☐ Person 2 [→]│   │  │☑ Person Y    [←] │   │
│  │  Riege C│  │  │☐ Person 3 [→]│   │  │☑ Person Z    [←] │   │
│  │  + Neu  │  │  │   ...        │   │  │   ...            │   │
│  └────────┘  │  └──────────────┘   │  └──────────────────┘   │
│              │                     │                          │
│              │  [Assign Selected]  │  Competitions:           │
│              │                     │  • Competition 1         │
│              │                     │  • Competition 2         │
│              │                     │                          │
│              │                     │  [Delete Squad]          │
└──────────────┴─────────────────────┴──────────────────────────┘
```
**Use Case:** Wenn mehrere "Ziel-Container" existieren (z.B. Riegen)  
**Features:** 
- Master-List (Spalte 1): Auswahl des Ziel-Containers
- Available (Spalte 2): Items zum Zuweisen
- Detail (Spalte 3): Zugewiesene Items + Container-Details

**Layout 2: Single Column (GroupMembers Pattern)**
```
┌─────────────────────────────────────────────────────┐
│  Modal Title                              [X]       │
├─────────────────────────────────────────────────────┤
│  Zugewiesen (5)                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ ● Item A                           [Remove] │   │
│  │ ● Item B                           [Remove] │   │
│  │ ● Item C                           [Remove] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Verfügbar hinzufügen                              │
│  [Dropdown: Select item...        ▼] [Add]        │
│  oder                                              │
│  [Search: Type to search...]                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ ○ Item 1                          [Add]     │   │
│  │ ○ Item 2                          [Add]     │   │
│  │ ○ Item 3                          [Add]     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Layout 3: Inline Checkboxes (CompetitionForm Pattern)**
```
┌─────────────────────────────────────────────────────┐
│  Select Disciplines                                │
│  [Filter by group: All ▼]                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ ☑ Boden      [Max Score: 10.0]            │   │
│  │ ☐ Sprung     [Max Score: 10.0]            │   │
│  │ ☑ Barren     [Max Score: 10.0]            │   │
│  │ ☐ Reck       [Max Score: 10.0]            │   │
│  └─────────────────────────────────────────────┘   │
│  [Set all to: 10.0] [Apply]                       │
└─────────────────────────────────────────────────────┘
```

#### 3. Varianten-Matrix

| Feature | Two-Column | Three-Column (Master-Detail) | Single-Column | Inline-Checkboxes |
|---------|-----------|------------------------------|---------------|-------------------|
| Drag & Drop | ✅ Ja | ✅ Ja | ❌ Nein | ❌ Nein |
| Bulk-Actions | ✅ Ja | ✅ Ja | ⚠️ Optional | ✅ Ja |
| Search | ✅ Ja | ✅ Ja | ✅ Ja | ⚠️ Optional |
| Filters | ✅ Ja | ✅✅ Advanced | ⚠️ Limited | ✅ Ja |
| Additional Fields | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional | ✅ Ja |
| Multiple Containers | ❌ Nein | ✅✅ Ja (Master-List) | ❌ Nein | ❌ Nein |
| Container Details | ❌ Nein | ✅ Ja (Detail-Pane) | ❌ Nein | ❌ Nein |
| Best for | Simple 1:N | Complex M:N (Riegen) | Few items | Medium items |
| Complexity | Mittel | Hoch | Niedrig | Mittel |
| Use Case | Groups→Members | Squads→Participants | Event→Participant | Competition→Disciplines |

---

## 🏗️ Implementierungs-Roadmap

### Phase 1: Foundation (Woche 1-2)
**Ziel:** Core UnifiedAssignmentModal Component erstellen

**Tasks:**
1. ✅ Analyse der bestehenden Patterns (✅ DONE - dieses Dokument)
2. Create base `UnifiedAssignmentModal.tsx` component
3. Implement basic two-column layout
4. **Implement three-column layout (Master-Detail pattern for SquadManagement)**
5. Implement basic single-column layout
6. Add search functionality
7. Add basic filter support
8. Write comprehensive tests
9. Create Storybook stories

**Dateien:**
- `client/src/components/assignments/UnifiedAssignmentModal.tsx`
- `client/src/components/assignments/layouts/TwoColumnLayout.tsx`
- `client/src/components/assignments/layouts/ThreeColumnLayout.tsx` **(NEW!)**
- `client/src/components/assignments/layouts/SingleColumnLayout.tsx`
- `client/src/components/assignments/AssignmentList.tsx`
- `client/src/components/assignments/AssignmentItem.tsx`
- `client/src/components/assignments/AssignmentFilters.tsx`
- `client/src/components/assignments/MasterList.tsx` **(NEW - for 3-column)**
- `client/src/components/assignments/DetailPane.tsx` **(NEW - for 3-column)**
- `client/src/components/assignments/types.ts`

---

### Phase 2: Advanced Features (Woche 3-4)
**Ziel:** Erweiterte Funktionen implementieren

**Tasks:**
1. Implement drag & drop (react-dnd or dnd-kit)
2. Add bulk actions
3. Implement additional fields support
4. Add validation framework
5. Implement inline-checkboxes layout
6. Add custom renderers
7. Performance optimization (virtualization for large lists)

**Dateien:**
- `client/src/components/assignments/DragDropAssignment.tsx`
- `client/src/components/assignments/BulkActions.tsx`
- `client/src/components/assignments/AdditionalFields.tsx`

---

### Phase 3: Migration (Woche 5-8)
**Ziel:** Bestehende UIs auf neues System migrieren

**Priority Order:**

#### 3.1 Gruppen ↔ Teilnehmer (EINFACH - Start here!)
- ✅ Ähnlich zu bestehendem Pattern
- ✅ Kleine Komponente (263 Zeilen)
- ✅ Wenig Business-Logik
- **Effort:** ~2 Tage
- **Files:** `GroupMembersModal.tsx`

#### 3.2 Teilnehmer ↔ Veranstaltung (EINFACH)
- ✅ Klare Anforderungen
- ✅ Gute Code-Basis (172 Zeilen)
- **Effort:** ~2 Tage
- **Files:** `AddParticipantModal.tsx`

#### 3.3 Wettkämpfe ↔ Disziplinen (MITTEL)
- ⚠️ Zusätzliche Felder (maxScore)
- ⚠️ Komplexe Filterung
- ⚠️ Teil eines großen Modals (905 Zeilen - needs SoC anyway!)
- **Effort:** ~1 Woche
- **Files:** `CompetitionFormModal.tsx` (extract discipline assignment)

#### 3.4 Mannschaften ↔ Teilnehmer (NEU!)
- ⚠️ Komponente fehlt komplett
- ⚠️ Benötigt Backend-Route
- **Effort:** ~1 Woche
- **Files:** `components/TeamMembersModal.tsx` (NEW)

#### 3.5 Riegen ↔ Teilnehmer (KOMPLEX - Last!)
- ❌ Sehr große Datei (1070 Zeilen - CRITICAL SoC!)
- ❌ Viel Business-Logik
- ❌ Drag & Drop erforderlich
- ❌ Virtuelle Riegen-Konzept
- **Effort:** ~2 Wochen
- **Files:** `SquadManagement.tsx` (major refactoring)

---

### Phase 4: Documentation & Polish (Woche 9)
**Ziel:** Dokumentation und Feinschliff

**Tasks:**
1. Write comprehensive documentation
2. Create usage examples
3. Update developer guidelines
4. Create migration guide
5. Performance audit
6. Accessibility audit
7. Localization completion
8. User acceptance testing

---

## 📐 Technical Specifications

### Component Architecture

```
UnifiedAssignmentModal (Container)
├── AssignmentHeader
│   ├── Title
│   ├── SearchBar
│   └── FilterBar
├── AssignmentContent (Layout-specific)
│   ├── TwoColumnLayout
│   │   ├── AvailableList
│   │   │   ├── AssignmentItem[]
│   │   │   └── BulkActions
│   │   └── AssignedList
│   │       ├── AssignmentItem[]
│   │       └── BulkActions
│   ├── ThreeColumnLayout (NEW - Master-Detail)
│   │   ├── MasterList (Container Selection)
│   │   │   ├── ContainerItem[]
│   │   │   └── CreateButton
│   │   ├── AvailableList
│   │   │   ├── AssignmentItem[]
│   │   │   └── BulkActions
│   │   └── DetailPane (Selected Container)
│   │       ├── ContainerInfo
│   │       ├── AssignedList
│   │       │   └── AssignmentItem[]
│   │       └── ContainerActions
│   ├── SingleColumnLayout
│   │   ├── AssignedList
│   │   ├── DropdownSelector
│   │   └── AvailableList
│   └── InlineCheckboxLayout
│       ├── FilterRow
│       └── CheckboxGrid
└── AssignmentFooter
    ├── Stats
    └── Actions (Save/Cancel)
```

### State Management

```typescript
// Internal state
interface AssignmentState {
  // Data
  availableItems: AssignmentItem[];
  assignedItems: AssignmentItem[];
  
  // UI State
  searchTerm: string;
  filters: Record<string, any>;
  selectedAvailable: Set<number>;
  selectedAssigned: Set<number>;
  
  // Operation State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Drag & Drop (if enabled)
  draggedItem: AssignmentItem | null;
}

// Actions
type AssignmentAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER'; payload: { key: string; value: any } }
  | { type: 'SELECT_AVAILABLE'; payload: number[] }
  | { type: 'SELECT_ASSIGNED'; payload: number[] }
  | { type: 'ASSIGN_ITEMS'; payload: AssignmentItem[] }
  | { type: 'UNASSIGN_ITEMS'; payload: AssignmentItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
```

### API Contract

```typescript
// Backend-Seite standardisieren
interface AssignmentEndpoints {
  // Get available items (not yet assigned)
  getAvailable: (entityId: number, params?: Record<string, any>) => Promise<TItem[]>;
  
  // Get assigned items
  getAssigned: (entityId: number) => Promise<TItem[]>;
  
  // Assign single item
  assign: (entityId: number, itemId: number, data?: Record<string, any>) => Promise<void>;
  
  // Unassign single item
  unassign: (entityId: number, itemId: number) => Promise<void>;
  
  // Bulk assign (optional)
  bulkAssign?: (entityId: number, itemIds: number[], data?: Record<string, any>) => Promise<void>;
  
  // Bulk unassign (optional)
  bulkUnassign?: (entityId: number, itemIds: number[]) => Promise<void>;
}
```

---

## 🎯 Anwendungsbeispiele

### Beispiel 1: Gruppen ↔ Teilnehmer (Single-Column)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('groups.members.title', { name: group.name }),
    availableLabel: t('groups.members.available'),
    assignedLabel: t('groups.members.assigned'),
    searchPlaceholder: t('groups.members.searchPlaceholder'),
    
    displayMode: 'list',
    enableSearch: true,
    enableBulkActions: false,
    
    availableItems: availableParticipants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      badge: { text: p.gender, variant: 'info' }
    })),
    
    assignedItems: members.map(m => ({
      id: m.id,
      displayName: `${m.firstname} ${m.lastname}`,
      secondaryInfo: m.club
    })),
    
    onAssign: async (item) => {
      await apiPost(`/groups/${group.id}/members`, {
        participantId: item.id
      });
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/groups/${group.id}/members/${item.id}`);
    },
    
    filters: [
      {
        id: 'club',
        label: t('common.club'),
        type: 'select',
        options: clubOptions,
        filterFn: (item, value) => item.metadata?.clubId === value
      }
    ]
  }}
/>
```

### Beispiel 2: Riegen ↔ Teilnehmer (Three-Column Master-Detail)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('squadManagement.title'),
    availableLabel: t('squadManagement.available'),
    assignedLabel: t('squadManagement.assigned'),
    containerLabel: t('squadManagement.squads.label'),
    
    displayMode: 'three-column',
    enableSearch: true,
    enableBulkActions: true,
    enableDragDrop: true, // Future: drag from available to detail pane
    enableFilters: true,
    
    // Master List (Riegen)
    containers: squads.map(s => ({
      id: s.id,
      name: s.name,
      displayName: s.name,
      itemCount: s.participantCount,
      isVirtual: s.isVirtual,
      metadata: {
        competitions: s.competitions,
        hints: s.hints
      },
      badge: s.isVirtual ? {
        text: t('squadManagement.squads.virtual'),
        variant: 'warning'
      } : undefined
    })),
    
    selectedContainer: selectedSquad ? {
      id: selectedSquad.id,
      name: selectedSquad.name,
      displayName: selectedSquad.name,
      itemCount: selectedSquad.participantCount,
      metadata: selectedSquad
    } : null,
    
    onContainerSelect: (container) => {
      const squad = squads.find(s => s.id === container.id);
      setSelectedSquad(squad);
    },
    
    onContainerCreate: () => {
      setIsCreateModalOpen(true);
    },
    
    onContainerDelete: async (containerId) => {
      if (!window.confirm(t('squadManagement.confirmDelete'))) return;
      await apiDelete(`/squads/${containerId}`);
      await loadSquads();
    },
    
    // Available Items
    availableItems: filteredParticipants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      metadata: {
        firstname: p.firstname,
        lastname: p.lastname,
        gender: p.gender,
        birthYear: p.birthYear,
        competitions: p.competitions,
        competitionCount: p.competitionCount
      },
      badge: {
        text: p.gender,
        variant: 'info'
      }
    })),
    
    // Assigned Items (from selected container)
    assignedItems: selectedSquad?.participants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      metadata: {
        competitions: p.competitions,
        gender: p.gender
      }
    })) || [],
    
    // Table columns for available/assigned lists
    columns: [
      {
        id: 'name',
        label: t('common.name'),
        render: (item) => item.displayName,
        sortable: true
      },
      {
        id: 'club',
        label: t('common.club'),
        render: (item) => item.secondaryInfo,
        sortable: true
      },
      {
        id: 'age',
        label: t('common.age'),
        render: (item) => {
          const age = new Date().getFullYear() - item.metadata.birthYear;
          return age;
        },
        sortable: true
      },
      {
        id: 'competitions',
        label: t('common.competitions'),
        render: (item) => (
          <span className="text-xs">
            {item.metadata.competitionCount || 0} {t('common.competitions')}
          </span>
        )
      }
    ],
    
    // Actions
    onAssign: async (item, containerId) => {
      if (!containerId) {
        alert(t('squadManagement.messages.selectSquadFirst'));
        return;
      }
      await apiPost('/squad-management/assign', {
        squadId: containerId,
        participantId: item.id,
        eventId: eventId
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/squad-management/unassign`, {
        params: { 
          participantId: item.id, 
          eventId: eventId 
        }
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    onBulkAssign: async (items, containerId) => {
      if (!containerId) {
        alert(t('squadManagement.messages.selectSquadFirst'));
        return;
      }
      await apiPost('/squad-management/bulk-assign', {
        squadId: containerId,
        participantIds: items.map(i => i.id),
        eventId: eventId
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    // Filters
    filters: [
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          { value: 'male', label: t('gender.male') },
          { value: 'female', label: t('gender.female') }
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.metadata.gender === value;
        }
      },
      {
        id: 'competition',
        label: t('common.competition'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          ...allCompetitions.map(c => ({
            value: c.id.toString(),
            label: `${c.name} (Nr. ${c.number})`
          }))
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.metadata.competitions?.some(
            c => c.id.toString() === value
          );
        }
      },
      {
        id: 'club',
        label: t('common.club'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          ...allClubs.map(club => ({ value: club, label: club }))
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.secondaryInfo === value;
        }
      }
    ],
    
    // Custom render for container item (in master list)
    renderContainer: (container) => (
      <div className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        selectedSquad?.id === container.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'hover:border-gray-300'
      } ${container.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900">{container.displayName}</h4>
          {container.badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {container.badge.text}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {container.itemCount} {t('squadManagement.squads.participants')}
        </p>
        {container.metadata?.hints?.storage && (
          <p className="text-xs text-orange-600 mt-1">
            💾 {container.metadata.hints.storage}
          </p>
        )}
        {container.metadata?.competitions && (
          <div className="mt-2 flex flex-wrap gap-1">
            {container.metadata.competitions.slice(0, 2).map((comp, idx) => (
              <span 
                key={idx} 
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {comp.name} (Nr. {comp.number})
              </span>
            ))}
            {container.metadata.competitions.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                +{container.metadata.competitions.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    ),
    
    // Custom render for detail pane
    renderDetailPane: (container, items) => (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('squadManagement.squadDetails.info')}
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('common.name')}:</dt>
              <dd className="font-medium">{container.displayName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('squadManagement.squads.participants')}:</dt>
              <dd className="font-medium">{items.length}</dd>
            </div>
            {container.metadata?.competitions && (
              <div>
                <dt className="text-gray-500 mb-1">{t('common.competitions')}:</dt>
                <dd className="space-y-1">
                  {container.metadata.competitions.map((comp, idx) => (
                    <div key={idx} className="text-xs bg-blue-50 px-2 py-1 rounded">
                      {comp.name} (Nr. {comp.number})
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
        
        {container.isVirtual && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-800">
              <strong>{t('squadManagement.virtualInfo.title')}</strong><br />
              {t('squadManagement.virtualInfo.description')}
            </p>
          </div>
        )}
      </div>
    ),
    
    validateAssignment: (item, containerId) => {
      if (!containerId) {
        return t('squadManagement.messages.selectSquadFirst');
      }
      // Add custom validation logic here
      return null;
    }
  }}
/>
```

**Key Features des Three-Column Layouts:**
- Master-List zeigt alle Container (Riegen) mit Metadaten
- Auswahl eines Containers lädt dessen zugewiesene Items in Detail-Pane
- Available-List zeigt filterbare Items zum Zuweisen
- Detail-Pane zeigt Container-Info + zugewiesene Items
- Bulk-Assignment an ausgewählten Container
- Custom Renderer für Container und Detail-Pane
- Unterstützt virtuelle Container (z.B. "Nicht zugeordnet")

---

### Beispiel 2b: Riegen ↔ Teilnehmer (Two-Column Simplified - Alternative)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('squadManagement.title'),
    availableLabel: t('squadManagement.available'),
    assignedLabel: t('squadManagement.assigned', { name: squad.name }),
    
    displayMode: 'table',
    enableSearch: true,
    enableBulkActions: true,
    enableDragDrop: true,
    enableFilters: true,
    
    columns: [
      {
        id: 'name',
        label: t('common.name'),
        render: (item) => `${item.metadata.firstname} ${item.metadata.lastname}`,
        sortable: true
      },
      {
        id: 'club',
        label: t('common.club'),
        render: (item) => item.secondaryInfo,
        sortable: true
      },
      {
        id: 'competitions',
        label: t('common.competitions'),
        render: (item) => (
          <span className="text-xs">
            {item.metadata.competitions?.join(', ')}
          </span>
        )
      }
    ],
    
    availableItems: availableParticipants,
    assignedItems: squadParticipants,
    
    onAssign: async (item) => {
      await apiPost('/squad-management/assign', {
        squadId: squad.id,
        participantId: item.id,
        eventId: eventId
      });
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/squad-management/unassign`, {
        params: { participantId: item.id, eventId: eventId }
      });
    },
    
    onBulkAssign: async (items) => {
      await apiPost('/squad-management/bulk-assign', {
        squadId: squad.id,
        participantIds: items.map(i => i.id),
        eventId: eventId
      });
    },
    
    filters: [
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'select',
        options: [
          { value: 'männlich', label: t('gender.male') },
          { value: 'weiblich', label: t('gender.female') }
        ],
        filterFn: (item, value) => item.metadata.gender === value
      },
      {
        id: 'competition',
        label: t('common.competition'),
        type: 'select',
        options: competitionOptions,
        filterFn: (item, value) => 
          item.metadata.competitions?.includes(value)
      }
    ]
  }}
/>
```

### Beispiel 3: Wettkämpfe ↔ Disziplinen (Inline-Checkboxes)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('competitions.selectDisciplines'),
    
    displayMode: 'checkbox-grid',
    enableSearch: false,
    enableFilters: true,
    
    availableItems: disciplines.map(d => ({
      id: d.id,
      displayName: d.name,
      metadata: {
        maleAllowed: d.male_allowed,
        femaleAllowed: d.female_allowed,
        groupId: d.groupId
      }
    })),
    
    assignedItems: formData.disciplines.map(d => ({
      id: d.disciplineId,
      displayName: d.name,
      metadata: { maxScore: d.maxScore }
    })),
    
    additionalFields: [
      {
        id: 'maxScore',
        label: t('competitions.maxScore'),
        type: 'number',
        required: true,
        defaultValue: 10.0,
        validate: (value) => {
          if (value <= 0) return t('competitions.maxScoreMustBePositive');
          if (value > 100) return t('competitions.maxScoreTooHigh');
          return null;
        }
      }
    ],
    
    onAssign: async (item) => {
      // Inline: update formData directly
      setFormData(prev => ({
        ...prev,
        disciplines: [
          ...prev.disciplines,
          { disciplineId: item.id, maxScore: item.metadata.maxScore }
        ]
      }));
    },
    
    onUnassign: async (item) => {
      setFormData(prev => ({
        ...prev,
        disciplines: prev.disciplines.filter(d => d.disciplineId !== item.id)
      }));
    },
    
    filters: [
      {
        id: 'group',
        label: t('disciplines.group'),
        type: 'select',
        options: disciplineGroupOptions,
        filterFn: (item, value) => item.metadata.groupId === value
      },
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'checkbox',
        filterFn: (item, value) => {
          if (value === 'male') return item.metadata.maleAllowed;
          if (value === 'female') return item.metadata.femaleAllowed;
          return true;
        }
      }
    ],
    
    validateAssignment: (item) => {
      // Example: Check gender compatibility
      if (formData.gender === 'männlich' && !item.metadata.maleAllowed) {
        return t('competitions.disciplineNotAllowedForGender');
      }
      return null;
    }
  }}
/>
```

---

## 🚀 Benefits der Vereinheitlichung

### Für Entwickler
- ✅ **Code Reuse:** ~70% weniger Code für neue Zuweisungen
- ✅ **Consistency:** Einheitliches Pattern für alle Zuweisungen
- ✅ **Maintainability:** Eine Komponente statt 6+ verschiedene
- ✅ **Type Safety:** Generische TypeScript Interfaces
- ✅ **Testing:** Einmal testen, überall nutzen
- ✅ **SoC:** Separation of Concerns - kleine, fokussierte Komponenten

### Für Benutzer
- ✅ **Consistency:** Gleiche Bedienung überall
- ✅ **Lernkurve:** Einmal lernen, überall anwenden
- ✅ **Features:** Alle Zuweisungen erhalten gleiche Features (Search, Filter, etc.)
- ✅ **Performance:** Optimiert und virtualisiert
- ✅ **Accessibility:** Einheitliche A11y-Standards

### Für Projekt
- ✅ **Velocity:** Schnellere Entwicklung neuer Features
- ✅ **Quality:** Höhere Code-Qualität durch Wiederverwendung
- ✅ **Maintenance:** Einfachere Wartung
- ✅ **Scalability:** Leicht erweiterbar für neue Zuweisungstypen

---

## ⚠️ Risiken & Herausforderungen

### Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Zu generisch → schwer verwendbar | Mittel | Hoch | Iteratives Design, User Testing |
| Performance bei vielen Items | Mittel | Mittel | Virtualisierung (react-window) |
| Drag & Drop Kompatibilität | Niedrig | Mittel | Bewährte Libraries (dnd-kit) |
| Rückwärts-Kompatibilität | Niedrig | Niedrig | Schrittweise Migration |
| Over-Engineering | Mittel | Mittel | Start simple, add features as needed |

### Organisatorische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Zu lange Entwicklungszeit | Mittel | Hoch | Phased Approach, MVP first |
| User Acceptance | Niedrig | Hoch | Early User Testing, Beta-Phase |
| Breaking Changes | Niedrig | Mittel | Feature Flags, Parallel Running |

---

## 📊 Effort Estimation

### Development Effort (Person-Days)

| Phase | Tasks | Effort | Priority |
|-------|-------|--------|----------|
| **Phase 1: Foundation** | Base Component + 3 Layouts | 12 Tage | 🔴 Critical |
| **Phase 2: Advanced** | Drag & Drop, Bulk, Fields | 10 Tage | 🟡 High |
| **Phase 3.1: Gruppen** | Migration | 2 Tage | 🟡 High |
| **Phase 3.2: Event** | Migration | 2 Tage | 🟡 High |
| **Phase 3.3: Competitions** | Migration + SoC | 5 Tage | 🟢 Medium |
| **Phase 3.4: Teams** | New Component | 5 Tage | 🟢 Medium |
| **Phase 3.5: Squads** | Migration + Heavy SoC (3-col layout!) | 12 Tage | 🔵 Low |
| **Phase 4: Polish** | Documentation, Testing | 5 Tage | 🟡 High |
| **TOTAL** | | **53 Tage** | |

**Estimated Timeline:** ~11 Wochen (bei 1 Entwickler, full-time)

**Note:** Phase 3.5 (Squads) benötigt mehr Zeit aufgrund des komplexen 3-Spalten Master-Detail Patterns.

---

## 🎯 Success Criteria

### Must-Have (MVP)
- [ ] UnifiedAssignmentModal base component funktioniert
- [ ] Two-Column Layout implementiert
- [ ] Single-Column Layout implementiert
- [ ] Search funktioniert
- [ ] Basic filtering funktioniert
- [ ] Mindestens 2 Zuweisungen migriert (Gruppen + Event)
- [ ] Tests geschrieben (>80% coverage)
- [ ] Dokumentation vorhanden

### Should-Have
- [ ] Drag & Drop funktioniert
- [ ] Bulk actions funktioniert
- [ ] Inline-Checkboxes Layout
- [ ] Additional fields support
- [ ] 4 von 6 Zuweisungen migriert
- [ ] Performance optimiert (virtualization)
- [ ] Accessibility audit passed

### Nice-to-Have
- [ ] Alle 6 Zuweisungen migriert
- [ ] Custom renderers support
- [ ] Advanced validation
- [ ] Keyboard shortcuts
- [ ] Undo/Redo functionality
- [ ] Export/Import functionality

---

## 📝 Next Steps

### Immediate Actions (Diese Woche)

1. **Review & Approval** 
   - Review dieses Konzept
   - Feedback einholen
   - Prioritäten validieren

2. **Technical Spike**
   - Prototyp einer einfachen UnifiedAssignmentModal
   - Test mit GroupMembersModal-Daten
   - Performance-Tests mit großen Datenmengen

3. **Team Alignment**
   - Entwickler informieren
   - Code Review Guidelines anpassen
   - Migration Plan kommunizieren

### Short-Term (Nächste 2 Wochen)

1. Start Phase 1 Development
2. Create base component structure
3. Implement first layout (Single-Column)
4. Write initial tests
5. Create Storybook stories

### Mid-Term (Nächste 4 Wochen)

1. Complete Phase 1 & 2
2. Start Phase 3 migrations (Gruppen, Event)
3. Gather user feedback
4. Iterate on design

### Long-Term (Nächste 8 Wochen)

1. Complete all migrations
2. Full documentation
3. Performance optimization
4. Production deployment
5. Legacy code cleanup

---

## 📚 Related Documents

- `API_ROUTE_MISMATCHES.md` - Field mapping conventions
- `FRONTEND_SERVING_IMPLEMENTATION.md` - Deployment patterns
- `PRIORITY_FIXES_LOG.md` - Historical fixes
- `.github/copilot-instructions.md` - Development guidelines
- `client/src/components/templates/EventManagementTemplate.tsx` - Template pattern

---

## ✅ Conclusion

Die Vereinheitlichung der Zuweisungs-UIs ist ein wichtiger Schritt zur Verbesserung der Code-Qualität und Benutzererfahrung. Mit einem klaren, phasenweisen Ansatz können wir:

1. **Reduktion der Code-Duplikation** um ~70%
2. **Konsistente UX** für alle Zuweisungen
3. **Schnellere Entwicklung** neuer Features
4. **Bessere Wartbarkeit** durch SoC

**Empfehlung:** Start mit Phase 1 (Foundation) und Phase 3.1 (Gruppen-Migration) als Proof of Concept.

---

**Autor:** GitHub Copilot  
**Datum:** 2025-11-10  
**Version:** 1.0  
**Status:** ✅ Ready for Review
