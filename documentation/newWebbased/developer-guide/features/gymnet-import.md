# GymNet XML-Import

## Übersicht

Der GymNet-Import ermöglicht es, Meldedaten aus dem DTB GymNet-System als XML-Datei in TurnFix zu importieren. Dabei werden Veranstaltungen, Wettkämpfe, Teilnehmer, Mannschaften und Disziplin-Zuordnungen automatisch übernommen.

### Quelldateien

| Datei | Beschreibung |
|---|---|
| `server/src/routes/events.ts` | Import-Endpoint (POST `/api/events/import/gymnet`) |
| `server/src/utils/gymnetMapping.ts` | wedDisNr → TurnFix-Disziplin-ID Mapping |
| `server/src/utils/gymnetDisciplineIds.ts` | Zentrale ID-Konstanten (78 Disziplinen) |
| `server/src/utils/gymnetPreset.ts` | DB-Wizard: Erstellt Geräte mit festen IDs |
| `server/tests/unit/wedDisNrMapping.test.ts` | 87 Tests für das Mapping |

---

## Disziplin-Zuordnung (wedDisNr → TurnFix)

### Prinzip

Jede Disziplin in der GymNet-XML hat ein `wedDisNr`-Attribut, das Gerät **und** Leistungsklasse kodiert. TurnFix nutzt **feste Disziplin-IDs**, die vom DB-Wizard beim Erstellen einer neuen Datenbank vergeben werden.

### wedDisNr-Kodierung

```
wedDisNr = [Zehner][Einer]

Zehner (Gerät):
  10 = Boden (m)       16 = Sprung (w)
  11 = Pauschenpferd    17 = Stufenbarren
  12 = Ringe            18 = Schwebebalken
  13 = Sprung (m)       19 = Boden (w)
  14 = Barren
  15 = Reck

Einer (Leistungsklasse):
  0 = Kür
  1 = LK1
  2 = LK2
  3 = LK3

Sondercodes:
  x09 (209-299) = P-Übung (P1-P9)
  630 = Minitrampolin
  915 = Gerätebahn A
  916 = Gerätebahn B
```

### Vollständige Zuordnungstabelle

#### Männlich – Kür (wedDisNr x0)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 100 | Boden m. Kür | 21 | Boden m. Kür |
| 110 | P.-Pferd Kür | 22 | P.-Pferd Kür |
| 120 | Ringe m. | 23 | Ringe m. |
| 130 | Sprung m. Kür | 24 | Sprung m. Kür |
| 140 | Par.-Barren Kür | 25 | Par.-Barren Kür |
| 150 | Reck m. Kür | 26 | Reck m. Kür |

#### Weiblich – Kür (wedDisNr x0)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 160 | Sprung w. Kür | 28 | Sprung w. Kür |
| 170 | Stufenbarren | 8 | Stufenbarren |
| 180 | Schwebebalken | 9 | Schwebebalken |
| 190 | Boden w. Kür | 27 | Boden w. Kür |

#### Männlich – LK1 (wedDisNr x1)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 101 | Boden m. LK1 | 31 | Boden m. LK1 |
| 111 | P.-Pferd LK1 | 32 | P.-Pferd LK1 |
| 121 | Ringe LK1 | 33 | Ringe LK1 |
| 131 | Sprung m. LK1 | 34 | Sprung m. LK1 |
| 141 | Par.-Barren LK1 | 35 | Par.-Barren LK1 |
| 151 | Reck m. LK1 | 36 | Reck m. LK1 |

#### Weiblich – LK1 (wedDisNr x1)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 161 | Sprung w. LK1 | 37 | Sprung w. LK1 |
| 171 | Stufenbarren LK1 | 38 | Stufenbarren LK1 |
| 181 | Schwebebalken LK1 | 39 | Schwebebalken LK1 |
| 191 | Boden w. LK1 | 40 | Boden w. LK1 |

#### Männlich – LK2 (wedDisNr x2)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 102 | Boden m. LK2 | 41 | Boden m. LK2 |
| 112 | P.-Pferd LK2 | 42 | P.-Pferd LK2 |
| 122 | Ringe LK2 | 43 | Ringe LK2 |
| 132 | Sprung m. LK2 | 44 | Sprung m. LK2 |
| 142 | Par.-Barren LK2 | 45 | Par.-Barren LK2 |
| 152 | Reck m. LK2 | 46 | Reck m. LK2 |

#### Weiblich – LK2 (wedDisNr x2)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 162 | Sprung w. LK2 | 47 | Sprung w. LK2 |
| 172 | Stufenbarren LK2 | 48 | Stufenbarren LK2 |
| 182 | Schwebebalken LK2 | 49 | Schwebebalken LK2 |
| 192 | Boden w. LK2 | 50 | Boden w. LK2 |

#### Männlich – LK3 (wedDisNr x3)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 103 | Boden m. LK3 | 51 | Boden m. LK3 |
| 113 | P.-Pferd LK3 | 52 | P.-Pferd LK3 |
| 123 | Ringe LK3 | 53 | Ringe LK3 |
| 133 | Sprung m. LK3 | 54 | Sprung m. LK3 |
| 143 | Par.-Barren LK3 | 55 | Par.-Barren LK3 |
| 153 | Reck m. LK3 | 56 | Reck m. LK3 |

#### Weiblich – LK3 (wedDisNr x3)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 163 | Sprung w. LK3 | 57 | Sprung w. LK3 |
| 173 | Stufenbarren LK3 | 58 | Stufenbarren LK3 |
| 183 | Schwebebalken LK3 | 59 | Schwebebalken LK3 |
| 193 | Boden w. LK3 | 60 | Boden w. LK3 |

#### P-Übung (wedDisNr x09)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 209 | Boden m. P1-P9 | 61 | Boden m. P1-P9 |
| 219 | Pauschenpferd P1-P9 | 62 | Pauschenpferd P1-P9 |
| 229 | Ringe P1-P9 | 63 | Ringe P1-P9 |
| 239 | Sprung m. P1-P9 | 64 | Sprung m. P1-P9 |
| 249 | Par.-Barren P1-P9 | 65 | Par.-Barren P1-P9 |
| 259 | Reck m. P1-P9 | 66 | Reck m. P1-P9 |
| 269 | Sprung w. P1-P9 | 67 | Sprung w. P1-P9 |
| 279 | Reck/StuBa. P1-P9 | 68 | Reck/StuBa. P1-P9 |
| 289 | Schwebebalken P1-P9 | 69 | Schwebebalken P1-P9 |
| 299 | Boden w. P1-P9 | 70 | Boden w. P1-P9 |

#### Basis-DTB-Codes (Rückwärtskompatibilität)

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 200 | Boden | 1 | Boden |
| 210 | Pauschenpferd | 2 | Pauschenpferd |
| 220 | Ringe | 3 | Ringe |
| 230 | Sprung | 4 | Sprung |
| 240 | Barren | 5 | Barren |
| 250 | Reck | 6 | Reck |
| 260 | Sprung w | 7 | Sprung w |
| 270 | Stufenbarren | 8 | Stufenbarren |
| 280 | Schwebebalken | 9 | Schwebebalken |
| 290 | Boden w | 10 | Boden w |

#### Sondergeräte

| wedDisNr | Gerät | TurnFix-ID | TurnFix-Name |
|---|---|---|---|
| 630 | Minitrampolin | 11 | Minitrampolin |
| 915 | Gerätebahn A | 12 | Gerätebahn A |
| 916 | Gerätebahn B | 13 | Gerätebahn B |

---

## Feste Disziplin-IDs (DB-Wizard)

Der DB-Wizard (`gymnetPreset.ts`) erstellt alle 78 Disziplinen mit **festen IDs**. Da der Wizard immer in eine leere Datenbank importiert, sind die IDs deterministisch.

### ID-Schema

| Bereich | IDs | Beschreibung |
|---|---|---|
| Basis-Geräte | 1–13 | Generische Geräte (Boden, Reck, ...) |
| Kategorien | 14–20 | LK1, LK2, LK3, AK, KM, KM2, KM3 |
| Kür männlich | 21–26 | Boden m. Kür, P.-Pferd Kür, ... |
| Kür weiblich | 27–28 | Boden w. Kür, Sprung w. Kür |
| LK1 männlich | 31–36 | Boden m. LK1, P.-Pferd LK1, ... |
| LK1 weiblich | 37–40 | Sprung w. LK1, Stufenbarren LK1, ... |
| LK2 männlich | 41–46 | Boden m. LK2, P.-Pferd LK2, ... |
| LK2 weiblich | 47–50 | Sprung w. LK2, Stufenbarren LK2, ... |
| LK3 männlich | 51–56 | Boden m. LK3, P.-Pferd LK3, ... |
| LK3 weiblich | 57–60 | Sprung w. LK3, Stufenbarren LK3, ... |
| P-Übung | 61–70 | Boden m. P1-P9, Pauschenpferd P1-P9, ... |
| Turn10 | 71–77 | Turn10 (Kategorie), Boden Turn10®, ... |
| AK | 78 | Boden AK |

Die zentrale Definitionsdatei ist `server/src/utils/gymnetDisciplineIds.ts`.

Nach dem Einfügen aller Geräte wird die PostgreSQL-Sequence automatisch auf 78 zurückgesetzt, damit weitere manuell erstellte Geräte ab ID 79 beginnen.

---

## Import-Ablauf

### 1. XML einlesen
Die GymNet-XML wird geparst. Folgende Knoten werden ausgewertet:
- `<veranstaltung>` → Veranstaltung (Event)
- `<wettkampf>` → Wettkampf (Competition)
- `<disziplin wedDisNr="...">` → Geräte-Zuordnung
- `<person>` / `<mannschaft>` → Teilnehmer / Mannschaften

### 2. Geräte zuordnen
Für jede `<disziplin>` wird `wedDisNrToTurnFixId(wedDisNr)` aufgerufen:
```typescript
import { wedDisNrToTurnFixId } from '../utils/gymnetMapping';

const turnfixId = wedDisNrToTurnFixId(161);  // → 37 (Sprung w. LK1)
```

Die Funktion nutzt eine **explizite Lookup-Tabelle** – kein Formel-basiertes Mapping.

### 3. Fallback (kein wedDisNr)
Wenn die XML kein `wedDisNr` enthält (ältere Exporte), greift `getDisciplinesForCompetition()`, das anhand des Wettkampfnamens passende Geräte aus der DB sucht.

### 4. Mannschaften
Enthält ein `<mannschaft>`-Knoten mehrere `<person>`-Einträge, wird eine Mannschaft in `tfx_mannschaften` angelegt und die Teilnehmer dort zugeordnet.

---

## Altersgruppen-Mapping (Point 38)

### Problem
Altersangaben aus der XML wurden früher nicht korrekt in Geburtsjahre umgerechnet.

### Lösung
```
Age → Geburtsjahr: birthYear = eventYear - age
Geburtsjahr → Age: age = eventYear - birthYear

Beispiel (Event 2025, Alter 11-12):
  waAlterMin = 11 → birthYearFrom = 2025 - 11 = 2014
  waAlterMax = 12 → birthYearTo   = 2025 - 12 = 2013
```

### Edge Cases
- Keine Age-Info → Default 6–18 Jahre
- Age = 0 → als fehlend behandelt
- Nur Min oder Max → intelligente Defaults
- Kein Event-Datum → aktuelles Jahr

---

## Geschlecht-Mapping

```xml
<!-- Wettkampf -->
<waGeschlecht>1</waGeschlecht>  →  männlich
<waGeschlecht>2</waGeschlecht>  →  weiblich

<!-- Teilnehmer -->
<perGeschlecht>1</perGeschlecht>  →  männlich
<perGeschlecht>2</perGeschlecht>  →  weiblich
```

---

## Tests

**Datei**: `server/tests/unit/wedDisNrMapping.test.ts` (87 Tests)

| Testgruppe | Anzahl | Beschreibung |
|---|---|---|
| Männlich Kür | 6 | wedDisNr 100–150 → IDs 21–26 |
| Männlich LK1 | 6 | wedDisNr 101–151 → IDs 31–36 |
| Männlich LK2 | 6 | wedDisNr 102–152 → IDs 41–46 |
| Männlich LK3 | 6 | wedDisNr 103–153 → IDs 51–56 |
| Weiblich Kür | 4 | wedDisNr 160–190 → IDs 8, 9, 27, 28 |
| Weiblich LK1 | 4 | wedDisNr 161–191 → IDs 37–40 |
| Weiblich LK2 | 4 | wedDisNr 162–192 → IDs 47–50 |
| Weiblich LK3 | 4 | wedDisNr 163–193 → IDs 57–60 |
| P-Übung | 10 | wedDisNr 209–299 → IDs 61–70 |
| Basis-DTB | 10 | wedDisNr 200–290 → IDs 1–10 |
| Sondergeräte | 3 | wedDisNr 630, 915, 916 → IDs 11–13 |
| String-Input | 3 | String-Parameter akzeptiert |
| Ungültige Codes | 7 | null für unbekannte Codes |
| XML-Fixture | 5 | Reale Werte aus Test-XML |
| Level-Differenzierung | 3 | Gleiches Gerät, verschiedene Level → verschiedene IDs |
| Feste ID-Werte | 4 | Verifikation der ID-Bereiche |
| wedDisNrToName | 2 | Name-Lookup für Debugging |

```bash
# Tests ausführen
cd newWebBased/server
npx jest tests/unit/wedDisNrMapping.test.ts
```
4. **Bestehende Competitions**: Diese behalten alte (falsche) Werte! 
   - Lösung: Competitions löschen und neu importieren
   - ODER: Migrations-Script schreiben (falls viele Daten)

### Verbesserungsvorschläge (für später)

1. **DB Migration**: Bestehende Competitions korrigieren
2. **Validation**: Age Range überprüfen (min < max)
3. **UI Warning**: Anzeigen wenn Default 6-18 verwendet wurde
4. **Import Summary**: Zeigen welche Competitions welche Age-Ranges haben
5. **Age vs Birth Year Clarity**: UI sollte zeigen was gespeichert wird

### Zusammenfassung

✅ **Code implementiert** - Vollständige Age-to-Birth-Year Konvertierung
✅ **Build erfolgreich** - Keine Compile-Fehler
✅ **Logging hinzugefügt** - Detaillierte Debug-Ausgabe
✅ **Test-Dateien erstellt** - Test XML + Dokumentation
✅ **Edge Cases behandelt** - Fehlende Ages, Age=0, nur Min/Max, etc.
⚠️ **NICHT GETESTET** - User muss Import testen und verifizieren
📝 **Dokumentation komplett** - Drei MD-Dateien mit allen Details

**User Action Required**: Import testen und Feedback geben!
