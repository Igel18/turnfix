# Automatische Riegeneinteilung (Squad Auto Assign)

**Feature**: Punkt 44 — Automatische Zuweisung von Teilnehmern zu Riegen  
**Status**: ✅ Implementiert  
**Verfügbar ab**: v2.0

---

## Übersicht

Die automatische Riegeneinteilung verteilt Teilnehmer einer Veranstaltung optimal auf Riegen.
Der Benutzer konfiguriert Kriterien (Geschlechtertrennung, Vereinszugehörigkeit, Altersstufen, Riegengröße),
generiert mehrere Vorschläge und wählt den besten aus. Die Zuweisung wird direkt in die Datenbank geschrieben (`tfx_wertungen.var_riege`).

### Zugriff

1. Seite **Riegeneinteilung** öffnen (`/squads?eventId=...`)
2. Lila Button **„Automatische Zuweisung"** (SparklesIcon) im Seitenkopf klicken
3. Dreistufiger Dialog: **Kriterien → Vorschläge → Angewendet**

---

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                               │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ AutoAssignDialog.tsx │  │ useAutoAssign.ts (Custom Hook)   │  │
│  │ (620 Zeilen, 3-Step │──│ - criteria State                 │  │
│  │  Wizard mit Sub-     │  │ - generateProposals(eventId)     │  │
│  │  Komponenten)        │  │ - applyProposal(eventId, prop.)  │  │
│  └─────────────────────┘  └──────────┬───────────────────────┘  │
│                                      │ HTTP POST                │
├──────────────────────────────────────┼──────────────────────────┤
│  Backend (Express)                   ▼                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ squadAutoAssign.ts (Route + Algorithmus)                 │   │
│  │ POST /api/squad-management/auto-assign/generate          │   │
│  │ POST /api/squad-management/auto-assign/apply             │   │
│  │                                                          │   │
│  │ Interne Funktionen:                                      │   │
│  │ - fetchEventParticipants()  - distributeIntoSquads()     │   │
│  │ - parseAgeCategoryRanges()  - generateSquadName()        │   │
│  │ - getAgeCategory()          - generateProposal()         │   │
│  │ - shuffle() (Fisher-Yates)                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────┐                               │
│  │ PostgreSQL                   │                               │
│  │ tfx_wertungen.var_riege      │                               │
│  │ tfx_teilnehmer               │                               │
│  │ tfx_wettkaempfe              │                               │
│  │ tfx_vereine                  │                               │
│  └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### Dateien

| Schicht | Datei | Zeilen | Beschreibung |
|---------|-------|--------|-------------|
| Backend | `server/src/routes/squadAutoAssign.ts` | ~498 | Route + Algorithmus |
| Backend | `server/src/routes/squadManagement.ts` | 345 | Mountpoint für Auto-Assign-Router |
| Frontend | `client/src/pages/SquadManagement/AutoAssign.types.ts` | 59 | TypeScript-Interfaces |
| Frontend | `client/src/pages/SquadManagement/hooks/useAutoAssign.ts` | 117 | Custom Hook (API-Calls + State) |
| Frontend | `client/src/pages/SquadManagement/components/AutoAssignDialog.tsx` | 620 | UI-Dialog (3-Step Wizard) |
| Frontend | `client/src/pages/SquadManagement/index.tsx` | 362 | Integration in Hauptseite |
| Tests | `server/tests/unit/squadAutoAssign.test.ts` | ~260 | 25 Unit-Tests |

---

## Algorithmus

### Ablauf

```
1. Teilnehmer laden
   └─ SQL: DISTINCT ON (int_teilnehmerid) aus tfx_wertungen → tfx_teilnehmer → tfx_vereine
   └─ Filter: nur Teilnehmer mit Wertungen in der gewählten Veranstaltung
   └─ Berechnung: Alter aus dat_geburtstag, Geschlecht aus int_geschlecht (1=m, 2=w)

2. Nach Geschlecht gruppieren (optional)
   ├─ separateGenders=true:  → male[], female[], mixed[]
   └─ separateGenders=false: → mixed[] (alle)

3. Shuffle (Fisher-Yates)
   └─ Jede Geschlechtergruppe wird zufällig gemischt
   └─ Erzeugt Variation zwischen den Vorschlägen

4. Nach Alterskategorie unterteilen (optional)
   └─ Parst z.B. "6-8,9-10,11-12,13-14,15-18"
   └─ Jeder Teilnehmer wird einer Kategorie zugeordnet
   └─ "unknown" bei fehlendem Geburtsdatum, "other" bei außerhalb

5. Verteilung in Riegen
   ├─ keepClubsTogether=true:
   │   └─ Bin-Packing-Heuristik (First-Fit Decreasing)
   │   └─ Vereine nach Größe sortiert, größte zuerst zugewiesen
   │   └─ Überfüllte Vereine werden in max-große Blöcke aufgeteilt
   └─ keepClubsTogether=false:
       └─ Einfache sequenzielle Auffüllung

6. Benennung
   ├─ "gender": Präfix (m/w/g) + Farbkürzel → "mRot", "wBlau", "gGlb"
   ├─ "number": Nummeriert → "R01", "R02", "R03"
   └─ "none":   Nur Farbe → "Rot", "Blau", "Grn"
   └─ ALLE Namen ≤ 5 Zeichen (Datenbankfeld VarChar(5))

7. Pausen-Riegen anhängen
   └─ Leere Riegen für Geräte-Rotation ("Paus" / "P01")

8. Statistiken berechnen
   └─ Gesamt, Durchschnitt, Min, Max Teilnehmer pro Riege
   └─ Geschlechterverteilung

9. Wiederholen für jeden Vorschlag (Shuffle erzeugt Variation)

10. Anwenden (bei Auswahl eines Vorschlags)
    └─ clearExisting: var_riege = NULL für alle Wertungen der Veranstaltung
    └─ Update: var_riege = Riegenname für jeden zugewiesenen Teilnehmer
```

### Farbpalette für Riegennamen

20 Farben stehen zur Verfügung, die zyklisch durchlaufen werden:

| Farbe | Kürzel | Farbe | Kürzel |
|-------|--------|-------|--------|
| Rot | Rot | Rosa | Rosa |
| Blau | Blau | Grau | Grau |
| Grün | Grn | Türkis | Türk |
| Gelb | Glb | Braun | Brn |
| Schwarz | Schw | Mint | Mint |
| Weiß | Weiß | Sand | Sand |
| Lila | Lila | Navy | Navy |
| Orange | Oran | Rubin | Rbn |
| Gold | Gold | Silber | Slbr |
| Kupfer | Kpfr | Jade | Jade |

### Bin-Packing (Vereinszugehörigkeit erhalten)

Wenn `keepClubsTogether` aktiviert ist, werden Vereine nach Größe absteigend sortiert und mit einem First-Fit-Decreasing-Algorithmus auf die Riegen verteilt:

1. Alle Vereine nach Anzahl der Teilnehmer sortieren (größte zuerst)
2. Für jede Vereinsgruppe:
   - Passt sie in eine bestehende Riege → dort einordnen
   - Passt sie nirgends → neue Riege erstellen
   - Ist der Verein größer als `maxParticipantsPerSquad` → in gleichmäßige Blöcke aufteilen
3. Ergebnis: Teilnehmer desselben Vereins bleiben so weit wie möglich zusammen

---

## API-Endpunkte

### POST `/api/squad-management/auto-assign/generate`

Generiert Vorschläge für die Riegeneinteilung.

**Authentifizierung**: JWT erforderlich

**Request Body**:

| Feld | Typ | Standard | Bereich | Beschreibung |
|------|-----|----------|---------|-------------|
| `eventId` | `number` | *Pflicht* | int > 0 | Veranstaltungs-ID |
| `maxParticipantsPerSquad` | `number` | `12` | 2–50 | Max. Teilnehmer pro Riege |
| `separateGenders` | `boolean` | `true` | | Geschlechter trennen |
| `keepClubsTogether` | `boolean` | `true` | | Vereinsmitglieder zusammenhalten |
| `groupByAgeCategory` | `boolean` | `false` | | Nach Alterskategorie gruppieren |
| `ageCategoryRanges` | `string` | `"6-8,9-10,11-12,13-14,15-18"` | | Kommagetrennte Altersbereiche |
| `numberOfProposals` | `number` | `3` | 1–10 | Anzahl zu generierender Vorschläge |
| `namingPrefix` | `enum` | `"gender"` | `"gender"`, `"number"`, `"none"` | Benennungsschema |
| `breakCount` | `number` | `0` | 0–10 | Anzahl Pausen-Riegen |

**Response (200)**:
```json
{
  "proposals": [
    {
      "id": 1,
      "squads": [
        {
          "name": "mRot",
          "colorName": "Rot",
          "genderGroup": "male",
          "ageCategory": null,
          "participants": [
            { "id": 42, "firstname": "Max", "lastname": "Müller", "club": "TV Musterstadt", "clubId": 5, "gender": "male", "age": 12, "birthYear": 2014 }
          ],
          "isBreak": false
        }
      ],
      "stats": {
        "totalSquads": 6,
        "totalParticipants": 48,
        "avgParticipantsPerSquad": 8.0,
        "minParticipantsPerSquad": 7,
        "maxParticipantsPerSquad": 9,
        "breakSquads": 0,
        "genderDistribution": { "male": 24, "female": 24 }
      }
    }
  ],
  "eventId": 59,
  "totalParticipants": 48,
  "criteria": { "maxParticipantsPerSquad": 12, "separateGenders": true, "..." : "..." }
}
```

**Fehler**:
- `400`: Keine Teilnehmer gefunden / Validation Error
- `500`: Server-Fehler

---

### POST `/api/squad-management/auto-assign/apply`

Übernimmt einen ausgewählten Vorschlag in die Datenbank.

**Authentifizierung**: JWT erforderlich

**Request Body**:

| Feld | Typ | Standard | Beschreibung |
|------|-----|----------|-------------|
| `eventId` | `number` | *Pflicht* | Veranstaltungs-ID |
| `squads` | `Array<{name, participantIds}>` | *Pflicht* | Riegen mit zugeordneten Teilnehmern |
| `squads[].name` | `string` | | Riegenname (1–5 Zeichen) |
| `squads[].participantIds` | `number[]` | | Teilnehmer-IDs |
| `clearExisting` | `boolean` | `true` | Bestehende Zuweisungen vorher löschen |

**Ablauf**:
1. Falls `clearExisting=true`: `UPDATE tfx_wertungen SET var_riege = NULL` für alle Wertungen der Veranstaltung
2. Für jede Riege: `UPDATE tfx_wertungen SET var_riege = $name` für alle Teilnehmer der Riege

**Response (200)**:
```json
{
  "success": true,
  "message": "Successfully assigned 48 participants to 6 squads",
  "eventId": 59,
  "squadsCreated": 6,
  "participantsAssigned": 48
}
```

---

## UI-Dialog

### 3-Schritt-Wizard

Der Dialog führt den Benutzer durch drei Schritte mit einer visuellen Fortschrittsanzeige (StepIndicator):

#### Schritt 1: Kriterien konfigurieren

| Einstellung | Typ | Beschreibung |
|-------------|-----|-------------|
| Max. Teilnehmer pro Riege | Zahleneingabe (2–50) | Obergrenze für die Riegengröße |
| Anzahl Vorschläge | Zahleneingabe (1–10) | Wie viele verschiedene Varianten generiert werden |
| Namensgebung | Auswahl (3 Optionen) | Geschlecht+Farbe / Nummeriert / Nur Farbe |
| Geschlechter trennen | Toggle | Männliche und weibliche Teilnehmer getrennt |
| Vereinsmitglieder zusammenhalten | Toggle | Versucht Vereinsmitglieder in einer Riege zu halten |
| Nach Alterskategorie gruppieren | Toggle | Aktiviert Altersgruppen-Eingabe |
| Alterskategorien | Texteingabe | Kommagetrennte Bereiche (z.B. `6-8,9-10,11-12`) |
| Anzahl Pausen-Riegen | Zahleneingabe (0–10) | Leere Riegen für Geräte-Rotation |

Buttons: **Abbrechen** | **Vorschläge generieren** (+ Lade-Spinner)

#### Schritt 2: Vorschläge bewerten

- **Blaues Banner**: Zusammenfassung (z.B. „3 Vorschläge für 48 Teilnehmer generiert")
- **Tab-Leiste**: Zwischen Vorschlägen wechseln (Vorschlag 1, 2, 3 …)
- **Statistik-Leiste**: 4 Kacheln (Riegen / Teilnehmer / Ø pro Riege / Min–Max)
- **Riegen-Liste** (aufklappbare Karten):
  - Header: Name, Farbname, Geschlecht-Badge, Altersstufe, Teilnehmer-Anzahl
  - Ausgeklappt: Tabelle mit Name, Verein, Alter
  - Pausen-Riegen: gestrichelte Rahmenlinie mit ⏸-Icon
- **Warnung**: „Bestehende Zuweisungen werden ersetzt"

Buttons: **Zurück zu Kriterien** | **Vorschlag übernehmen** (+ Lade-Spinner)

#### Schritt 3: Erfolgreich angewendet

- Grünes Häkchen-Icon
- Erfolgsmeldung mit Anzahl der Riegen und Teilnehmer
- Button: **Schließen** (aktualisiert die Riegeneinteilung im Hintergrund)

<!-- 
### Screenshots

TODO: Screenshots der drei Dialog-Schritte hinzufügen:
- Schritt 1: Kriterien-Formular
- Schritt 2: Vorschläge mit Statistiken und Riegen-Karten
- Schritt 3: Erfolgsbestätigung

Ablageort: documentation/newWebbased/images/ui-screenshots/squad-auto-assign/
-->

---

## Konfiguration

Standard-Werte sind unter **Einstellungen** → **App Settings** → `squadAutoAssign` konfigurierbar:

```json
{
  "description": "Default criteria for automatic squad assignment (Riegeneinteilung).",
  "maxParticipantsPerSquad": 12,
  "separateGenders": true,
  "keepClubsTogether": true,
  "groupByAgeCategory": false,
  "ageCategoryRanges": "6-8,9-10,11-12,13-14,15-18",
  "numberOfProposals": 3,
  "namingPrefix": "gender",
  "breakCount": 0
}
```

Der Dialog lädt diese Defaults beim Öffnen über `GET /api/app-settings/squadAutoAssign`.

---

## Unit Tests

**Datei**: `server/tests/unit/squadAutoAssign.test.ts` (~260 Zeilen, 25 Tests)

> Hinweis: Da die Hilfsfunktionen nicht exportiert werden, replizieren die Tests den Algorithmus-Kern inline.

### Testübersicht

| Bereich | Testname | Beschreibung |
|---------|----------|-------------|
| **parseAgeCategoryRanges** | should parse comma-separated ranges | `"6-8,9-10,11-12"` → 3 Bereiche |
| | should handle whitespace | Leerzeichen werden ignoriert |
| | should skip invalid ranges | Ungültige Bereiche übersprungen |
| | should return empty for empty string | Leerer String → `[]` |
| **getAgeCategory** | should return correct category for age within range | Korrekte Zuordnung |
| | should return "other" for age outside any range | Alter außerhalb → `"other"` |
| | should return "unknown" for null age | Kein Alter → `"unknown"` |
| | should handle boundary values | Randwerte (6, 8, 18) korrekt |
| **generateSquadName** | should generate gender-prefixed names | `"mRot"`, `"wBlau"`, `"gGlb"` |
| | should generate numbered names | `"R01"`, `"R12"` |
| | should generate color-only names | `"Rot"`, `"Blau"` |
| | should never exceed 5 characters | Alle Kombinationen ≤ 5 Zeichen |
| | should cycle through colors | Index-Überlauf → Zurück zum Anfang |
| **distributeIntoSquads** | should return empty for empty input | `[]` → `[]` |
| | should distribute evenly without club grouping | Gleichmäßig verteilt |
| | should respect max per squad | Keine Riege überfüllt |
| | should keep clubs together | Vereinsmitglieder zusammen |
| | should split oversized club groups | Große Vereine aufgeteilt |
| | should handle single participant | 1 Teilnehmer → 1 Riege |
| | should handle participants equal to max | Genau max → 1 Riege |
| **Geschlechtertrennung** | should separate male and female | 5m + 5f korrekt getrennt |
| | should put all in mixed when not separating | Alle in Mixed |
| **Gesamtablauf** | should produce expected number of squads | 24 ÷ 6 = 4 Riegen |
| | should include all participants | Kein Teilnehmer verloren |
| | should produce unique squad names | 6 einzigartige Namen bei Geschlechtertrennung |

### Tests ausführen

```powershell
cd server
npx jest tests/unit/squadAutoAssign.test.ts --verbose
```

---

## Lokalisierung (i18n)

Alle UI-Texte sind über `squadManagement.autoAssign.*` lokalisiert:

| Schlüssel | Deutsch | English |
|-----------|---------|---------|
| `.title` | Automatische Riegeneinteilung | Automatic Squad Assignment |
| `.button` | Automatische Zuweisung | Auto Assign |
| `.steps.criteria` | Kriterien | Criteria |
| `.steps.proposals` | Vorschläge | Proposals |
| `.steps.applied` | Angewendet | Applied |
| `.criteriaDescription` | Konfigurieren Sie die Kriterien für die automatische Riegeneinteilung… | Configure the criteria for automatic squad assignment… |
| `.fields.maxPerSquad` | Max. Teilnehmer pro Riege | Max participants per squad |
| `.fields.numberOfProposals` | Anzahl Vorschläge | Number of proposals |
| `.fields.namingPrefix` | Namensgebung | Naming convention |
| `.fields.breakCount` | Anzahl Pausen-Riegen | Number of break squads |
| `.fields.separateGenders` | Geschlechter trennen | Separate genders |
| `.fields.keepClubsTogether` | Vereinsmitglieder zusammenhalten | Keep club members together |
| `.fields.groupByAgeCategory` | Nach Alterskategorie gruppieren | Group by age category |
| `.fields.ageCategoryRanges` | Alterskategorien (Bereiche) | Age categories (ranges) |
| `.generateButton` | Vorschläge generieren | Generate Proposals |
| `.applyButton` | Vorschlag übernehmen | Apply Proposal |
| `.applyWarning` | Bestehende Zuweisungen werden ersetzt | Existing assignments will be replaced |
| `.appliedTitle` | Riegeneinteilung erfolgreich! | Squad assignment successful! |
| `.appliedMessage` | {{participants}} Teilnehmer wurden auf {{squads}} Riegen verteilt. | {{participants}} participants have been assigned to {{squads}} squads. |

Weitere Schlüssel: `.hints.*`, `.namingOptions.*`, `.stats.*`, `.generating`, `.applying`, `.backToCriteria`, `.proposalSummary`, `.proposalTab`, `.breakSquad`, `.participants`, `.years`, `.clubColumn`, `.ageColumn`

---

## Datenbank-Operationen

### Betroffene Tabellen

| Tabelle | Operation | Beschreibung |
|---------|-----------|-------------|
| `tfx_wertungen` | READ | Teilnehmer einer Veranstaltung ermitteln |
| `tfx_wertungen` | UPDATE | `var_riege` setzen/leeren |
| `tfx_wettkaempfe` | READ (JOIN) | Veranstaltungsfilter |
| `tfx_teilnehmer` | READ (JOIN) | Teilnehmerdaten (Name, Geschlecht, Geburtsdatum) |
| `tfx_vereine` | READ (LEFT JOIN) | Vereinsname und -ID |

### SQL-Abfragen

**Teilnehmer laden**:
```sql
SELECT DISTINCT ON (t.int_teilnehmerid) 
  t.int_teilnehmerid, t.var_vorname, t.var_nachname,
  v.var_name as vereinsname, t.int_vereineid,
  t.int_geschlecht, t.dat_geburtstag
FROM tfx_wertungen w
JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
WHERE wk.int_veranstaltungenid = $1
ORDER BY t.int_teilnehmerid
```

**Bestehende Zuweisungen löschen**:
```sql
UPDATE tfx_wertungen w SET var_riege = NULL
FROM tfx_wettkaempfe wk
WHERE w.int_wettkaempfeid = wk.int_wettkaempfeid
  AND wk.int_veranstaltungenid = $1
```

**Riege zuweisen**:
```sql
UPDATE tfx_wertungen w SET var_riege = $1
FROM tfx_wettkaempfe wk
WHERE w.int_wettkaempfeid = wk.int_wettkaempfeid
  AND wk.int_veranstaltungenid = $2
  AND w.int_teilnehmerid = ANY($3::int[])
```

---

## Bekannte Einschränkungen

1. **Maximale Namenslänge**: 5 Zeichen (Datenbankfeld `var_riege VarChar(5)`) — alle Namenschemata sind darauf optimiert
2. **Keine persistente Vorschlagsspeicherung**: Vorschläge existieren nur während der Dialog-Session
3. **Bin-Packing nicht optimal**: First-Fit Decreasing ist eine Heuristik, keine perfekte Lösung — mehrere Vorschläge kompensieren dies
4. **Geschlecht „other"**: Wird der Mixed-Gruppe zugeordnet
5. **Fehlendes Geburtsdatum**: Teilnehmer ohne Geburtsdatum erhalten Alterskategorie `"unknown"`

---

## Verwandte Dokumentation

- [PHASE1_SQUAD_MANAGEMENT_REFACTORING.md](PHASE1_SQUAD_MANAGEMENT_REFACTORING.md) — SoC-Refactoring der Riegeneinteilung
- [PHASE2_UNIFIED_ASSIGNMENT_EXTRACTION.md](PHASE2_UNIFIED_ASSIGNMENT_EXTRACTION.md) — Generische Zuweisungskomponenten
- [PHASE3_SQUADMANAGEMENT_MIGRATION.md](PHASE3_SQUADMANAGEMENT_MIGRATION.md) — Migration auf UnifiedAssignmentModal
