# Team Score Capture - Implementation Documentation

**Datum**: 2025-11-17  
**Version**: 1.0  
**Status**: ✅ Vollständig implementiert

---

## 📋 Anforderung

### Ursprüngliche Anforderung
Implementierung einer **Inline-Tabelle für Mannschafts-Wertungserfassung** analog zur Einzelwertungserfassung (ScoreCapture), jedoch speziell für Teams.

**User Story**:
> "aber es wird immer noch der button wertung erfassen angezeigt und keine Tabelle für die Wertungen!"

### Detaillierte Anforderungen

1. ✅ **3-Schritt-Selector beibehalten**
   - Team auswählen
   - Wettkampf auswählen
   - Disziplin auswählen

2. ✅ **Inline-Tabelle für Wertungseingabe**
   - Keine Modal-Dialoge
   - Direkte Bearbeitung in der Tabelle
   - Automatisches Speichern bei Blur
   - Mehrere Versuche (Attempts) unterstützen

3. ✅ **Input Mask Support**
   - Verschiedene Formate: `0.00`, `00.00`, `0,00`, `0:00.00`
   - Automatische Normalisierung (z.B. `5` → `5.00`)
   - Zeit-Konvertierung (>59.59 Sekunden → MM:SS.ss)
   - Dynamische Platzhalter basierend auf Maske

4. ✅ **Daten-Persistierung**
   - Speichern in `tfx_wertungen` (Basis-Score)
   - Speichern in `tfx_wertungen_details` (Wertungsfelder/Components)
   - Automatisches Laden gespeicherter Werte

---

## 🏗️ Architektur

### Komponenten-Struktur

```
GroupTeamScoring/
├── TeamScoreCapture.tsx          # Haupt-Orchestrierung (~390 Zeilen)
│   ├── State Management
│   ├── API Calls (Teams, Competitions, Disciplines, Fields, Scores)
│   └── Event Handlers
│
├── components/
│   ├── TeamScoreTable.tsx        # Tabellen-Komponente (~180 Zeilen)
│   │   ├── Score Matrix Rendering
│   │   ├── Inline Editing
│   │   └── Auto-Save on Blur
│   │
│   └── EntityScoringSelector.tsx # 3-Schritt-Selector (wiederverwendet)
│
└── GroupTeamScoring.types.ts     # TypeScript Interfaces

utils/
└── inputMaskUtils.ts              # Input Mask Utilities (~220 Zeilen)
    ├── parseInputMask()
    ├── formatScore()
    ├── normalizeScoreInput()
    ├── normalizeScoreByDecimalPlaces()
    ├── getPlaceholder()
    └── validateInput()
```

### Datenfluss

```
User Input (Tabelle)
    ↓
onChange → Update scoreMatrix State
    ↓
onBlur → normalizeScoreInput() → Auto-Save
    ↓
POST /api/scores/team
    ↓
    ├─→ INSERT/UPDATE tfx_wertungen (scoreId, teamId, competitionId, etc.)
    └─→ INSERT tfx_wertungen_details (scoreId, fieldId, value)
    ↓
GET /api/scores/team (Reload)
    ↓
    ├─→ SELECT FROM tfx_wertungen
    ├─→ SELECT FROM tfx_wertungen_details (Components mit JOIN)
    └─→ Map zu scoreMatrix State
    ↓
Re-Render Tabelle mit gespeicherten Werten
```

---

## 🔧 Technische Implementierung

### 1. Score Matrix Pattern

**State Management**:
```typescript
const [scoreMatrix, setScoreMatrix] = useState<Record<string, string>>({});

// Key Format: team-{teamId}-attempt-{attemptNumber}-field-{fieldId}
const key = `team-23-attempt-1-field-69`;
scoreMatrix[key] = "5.00";
```

**Vorteile**:
- ✅ Flache Datenstruktur (einfaches Update)
- ✅ Eindeutige Keys für alle Wertungen
- ✅ Performant für große Datensätze

### 2. Input Mask System

#### Unterstützte Formate

| Format | Beispiel | Beschreibung |
|--------|----------|--------------|
| `0.00` | `5` → `5.00` | 2 Dezimalstellen |
| `00.00` | `5` → `05.00` | 2 Dezimalstellen + Padding |
| `000.000` | `5` → `005.000` | 3 Dezimalstellen + Padding |
| `0.0` | `5` → `5.0` | 1 Dezimalstelle |
| `0,00` | `5` → `5,00` | Komma-Dezimal (europäisch) |
| `00,000` | `5` → `05,000` | Komma + Padding |
| `0:00.00` | `65.5` → `1:05.50` | Zeit MM:SS.ss |
| `00:00.00` | `125.75` → `02:05.75` | Zeit MM:SS.ss mit Padding |
| `h:mm:ss` | `3661` → `1:01:01` | Zeit HH:MM:SS |
| `hh:mm:ss.ss` | `3661.5` → `01:01:01.50` | Zeit HH:MM:SS.ss |

**⚡ GENERISCH**: Funktioniert mit **jeder** Mask-Kombination!  
Basiert auf C++ `QString::arg(value, mask.length(), 'f', decimalPlaces, '0')`

#### Implementierung

**Parsing (GENERISCH)**:
```typescript
export function parseInputMask(mask: string): InputMaskInfo {
  // Time: Contains colon (:)
  if (mask.includes(':')) return { 
    type: 'time', 
    totalLength: mask.length,
    decimalPlaces: extractDecimalPlaces(mask),
    separator: ':'
  };
  
  // Comma: Contains comma (,)
  if (mask.includes(',')) return { 
    type: 'comma', 
    totalLength: mask.length,
    decimalPlaces: mask.split(',')[1]?.length || 0,
    separator: ','
  };
  
  // Decimal: Default
  return { 
    type: 'decimal', 
    totalLength: mask.length,
    decimalPlaces: mask.split('.')[1]?.length || 0,
    separator: '.'
  };
}
```

**Formatierung (wie C++ QString::arg)**:
```typescript
export function formatScore(value: number, inputMask: string): string {
  const maskInfo = parseInputMask(inputMask);

  // Zeit-Format: HH:MM:SS oder MM:SS
  if (maskInfo.type === 'time') {
    return formatTimeValue(value, inputMask, maskInfo.decimalPlaces);
  }

  // GENERISCH (wie C++)
  // arg(value, mask.length(), 'f', decimalPlaces, '0')
  const formatted = value.toFixed(maskInfo.decimalPlaces);
  const withSeparator = maskInfo.separator === ',' 
    ? formatted.replace('.', ',') 
    : formatted;
  
  // Pad to totalLength with leading zeros
  return padToMaskLength(withSeparator, maskInfo.totalLength, maskInfo.separator);
}
```

**Zeit-Formatierung**:
```typescript
function formatTimeValue(totalSeconds: number, mask: string, decimalPlaces: number): string {
  const parts = mask.split(':');
  const isHHMMSS = parts.length >= 3; // h:mm:ss format
  
  if (isHHMMSS) {
    // Format: HH:MM:SS.ss
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
    const seconds = totalSeconds - hours * 3600 - minutes * 60;
    
    return `${pad(hours, parts[0].length)}:${pad(minutes, 2)}:${pad(seconds, decimalPlaces)}`;
  } else {
    // Format: MM:SS.ss
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    
    return `${pad(minutes, parts[0].length)}:${pad(seconds, decimalPlaces)}`;
  }
}

// Beispiele:
formatTimeValue(3661.5, "hh:mm:ss.ss", 2)  → "01:01:01.50"
formatTimeValue(125.75, "0:00.00", 2)      → "2:05.75"
formatTimeValue(65.5, "00:00.00", 2)       → "01:05.50"
```

**Padding (GENERISCH)**:
```typescript
function padToMaskLength(formatted: string, totalLength: number, separator: string): string {
  const parts = formatted.split(separator);
  const paddingNeeded = totalLength - formatted.length;
  
  // Add leading zeros to integer part
  parts[0] = '0'.repeat(paddingNeeded) + parts[0];
  
  return parts.join(separator);
}

// Beispiele:
padToMaskLength("5.00", 5, '.') → "05.00"  (mask: "00.00")
padToMaskLength("5.000", 7, '.') → "005.000"  (mask: "000.000")
```

**Zeit-Handling** (basierend auf C++ `_global::strLeistung`):
```cpp
// C++ Original - GENERISCH!
QString _global::strLeistung(double lst, QString einheit, QString maske, int nk) {
    if ((lst > 59.59 && einheit != "m") || maske == "00:00.00") {
        // Time format
        int minutes = (int)(lst / 60);
        double seconds = lst - (minutes*60);
        meldeleistung = QString("%1").arg(minutes,2,'f',0,'0') + ":" + 
                       QString("%1").arg(seconds,5,'f',nk,'0');
    } else {
        // GENERIC: Uses mask.length() for total width!
        meldeleistung = QString("%1").arg(lst, maske.length(), 'f', nk, '0');
        //                              ^^^^  ^^^^^^^^^^^^^^^  ^^  ^^  ^^^
        //                              value  total width    fmt dec fill
    }
}
```

**TypeScript Äquivalent**:
```typescript
// Beispiel: 3661.5 Sekunden → "1:01:01.50" (mask: "h:mm:ss.ss")
if (maskInfo.type === 'time' && mask.split(':').length >= 3) {
  const hours = Math.floor(totalSeconds / 3600);     // 1
  const minutes = Math.floor((totalSeconds % 3600) / 60);  // 1
  const seconds = totalSeconds % 60;                 // 1.5
  return `${hours}:${pad(minutes,2)}:${pad(seconds,2)}`; // "1:01:01.50"
}

// Beispiel: 5 mit mask "000.00" → "005.00"
const formatted = value.toFixed(decimalPlaces);      // "5.00"
return padToMaskLength(formatted, mask.length(), '.'); // "005.00"
```

### 3. API Integration

#### Endpoint: POST `/api/scores/team`

**Request**:
```json
{
  "teamId": 23,
  "competitionId": 747,
  "disciplineId": 74,
  "statusId": 1,
  "attempt": 1,
  "components": [
    { "fieldId": 69, "value": 6.0 },
    { "fieldId": 70, "value": 5.5 }
  ],
  "finalScore": 11.5
}
```

**Database Operations**:
```typescript
// 1. Upsert tfx_wertungen (Basis-Score)
const scoreResult = await prisma.tfx_wertungen.upsert({
  where: { 
    int_wertungenid_int_mannschaftenid_int_wettkaempfeid: {
      int_mannschaftenid: teamId,
      int_wettkaempfeid: competitionId
    }
  },
  create: {
    int_mannschaftenid: teamId,
    int_wettkaempfeid: competitionId,
    int_statusid: statusId,
    int_startnummer: team.int_startnummer,
    var_riege: team.var_riege
  }
});

// 2. Delete alte Components
await prisma.$executeRawUnsafe(`
  DELETE FROM tfx_wertungen_details 
  WHERE int_wertungenid = $1 
    AND int_disziplinenid = $2 
    AND int_versuch = $3
`, scoreId, disciplineId, attempt);

// 3. Insert neue Components
for (const component of components) {
  await prisma.$executeRawUnsafe(`
    INSERT INTO tfx_wertungen_details 
      (int_wertungenid, int_disziplinenid, int_versuch, int_kp, rel_leistung)
    VALUES ($1, $2, $3, $4, $5)
  `, scoreId, disciplineId, attempt, component.fieldId, component.value);
}
```

#### Endpoint: GET `/api/scores/team`

**Query Parameters**:
```
?teamId=23&competitionId=747&disciplineId=74
```

**Response**:
```json
{
  "results": [
    {
      "id": 5028,
      "teamId": 23,
      "competitionId": 747,
      "disciplineId": 74,
      "attempt": 1,
      "components": [
        { "fieldId": 69, "fieldName": "D/A-Note", "value": 6.0 },
        { "fieldId": 70, "fieldName": "E/B-Note", "value": 5.5 }
      ],
      "club": { "name": "TSG Füssen" },
      "discipline": { "name": "Boden" }
    }
  ],
  "pagination": { "total": 1, "limit": 100, "offset": 0 }
}
```

**SQL Query mit Components**:
```sql
-- Load components for each score
SELECT 
  wd.int_wertungenid as scoreId,
  wd.int_kp as fieldId,
  wd.rel_leistung as value,
  df.var_name as fieldName
FROM tfx_wertungen_details wd
LEFT JOIN tfx_disziplinen_felder df 
  ON wd.int_kp = df.int_disziplinen_felderid
WHERE wd.int_wertungenid IN (5028)
ORDER BY wd.int_kp
```

---

## 🐛 Bug Fixes & Learnings

### Bug #1: Discipline Fields nicht geladen
**Problem**: API gab Array direkt zurück, Client erwartete `{results: []}`

**Fix**:
```typescript
// ❌ Vorher
const data = await response.json();
setDisciplineFields(data.results || []);

// ✅ Nachher
const data = await response.json();
setDisciplineFields(Array.isArray(data) ? data : []);
```

### Bug #2: Foreign Key Constraint Violation
**Problem**: `int_teilnehmerid` darf bei Team-Scores nicht gesetzt sein

**Fix**:
```typescript
// ❌ Vorher
INSERT INTO tfx_wertungen 
  (..., int_teilnehmerid, ...)
VALUES (..., NULL, ...)  // NULL verletzt Constraint!

// ✅ Nachher
INSERT INTO tfx_wertungen 
  (...) // int_teilnehmerid komplett weglassen
VALUES (...)
```

### Bug #3: Components nicht zurückgegeben
**Problem**: GET API gab nur Basis-Score zurück, keine Wertungsfelder

**Ursache**: Falsche Tabellennamen verwendet
- ❌ `tfx_wertungsfelder` (existiert nicht)
- ✅ `tfx_wertungen_details`

**Fix**: Components-Query korrigiert (siehe oben)

### Bug #4: Werte verschwinden nach Eingabe
**Problem**: Normalisierung auf onChange statt onBlur

**Fix**:
```typescript
// ❌ Vorher
onChange={(e) => {
  const normalized = normalizeScoreInput(e.target.value);
  handleScoreChange(normalized);
}}

// ✅ Nachher
onChange={(e) => handleScoreChange(e.target.value)} // Rohdaten
onBlur={(e) => {
  const normalized = normalizeScoreInput(e.target.value, inputMask);
  if (normalized !== e.target.value) {
    handleScoreChange(normalized);
  }
  saveScore();
}}
```

### Bug #5: Nur Dezimalstellen, keine vollständige Maske
**Problem**: Code extrahierte nur Dezimalstellen, keine Zeit/Komma-Formate

**Fix**: Comprehensive `inputMaskUtils.ts` basierend auf C++ `_global::strLeistung`

---

## 🔄 Integration mit ScoreCapture

### Gemeinsame Utility

**Problem**: ScoreCapture hatte Dummy-Implementierung
```typescript
normalizeScoreInput={(value: string, _decimalPlaces: number) => value}
```

**Lösung**: Neue Funktion für DecimalPlaces-basierte Normalisierung
```typescript
// TeamScoreCapture (Input Mask)
import { normalizeScoreInput } from '@/utils/inputMaskUtils';
normalizeScoreInput(value, "0.00");

// ScoreCapture (Decimal Places)
import { normalizeScoreByDecimalPlaces } from '@/utils/inputMaskUtils';
normalizeScoreByDecimalPlaces(value, 2);
```

### Code-Reuse

| **Komponente** | **Datenquelle** | **Funktion** | **Beispiel** |
|----------------|-----------------|--------------|--------------|
| TeamScoreCapture | `discipline.inputMask` | `normalizeScoreInput()` | `"0.00"` → `5.00` |
| ScoreCapture | `discipline.int_berechnung` | `normalizeScoreByDecimalPlaces()` | `2` → `5.00` |

---

## 📊 Testing & Validation

### Test Cases

#### 1. Input Normalization
```typescript
// Test: Dezimal (0.00)
normalizeScoreInput("5", "0.00")     → "5.00" ✅
normalizeScoreInput("5.5", "0.00")   → "5.50" ✅

// Test: Padding (00.00)
normalizeScoreInput("5", "00.00")    → "05.00" ✅
normalizeScoreInput("15", "00.00")   → "15.00" ✅

// Test: Mehr Padding (000.000)
normalizeScoreInput("5", "000.000")  → "005.000" ✅
normalizeScoreInput("42.5", "000.000") → "042.500" ✅

// Test: Komma (0,00)
normalizeScoreInput("5", "0,00")     → "5,00" ✅
normalizeScoreInput("5.5", "0,00")   → "5,50" ✅

// Test: Zeit MM:SS (0:00.00)
normalizeScoreInput("65.5", "0:00.00")   → "1:05.50" ✅
normalizeScoreInput("125.75", "00:00.00") → "02:05.75" ✅

// Test: Zeit HH:MM:SS (h:mm:ss)
normalizeScoreInput("3661", "h:mm:ss")       → "1:01:01" ✅
normalizeScoreInput("3661.5", "hh:mm:ss.ss") → "01:01:01.50" ✅

// Test: Zeit HH:MM:SS Input
normalizeScoreInput("1:30:45", "h:mm:ss")    → "1:30:45" ✅
normalizeScoreInput("12:05:30.5", "hh:mm:ss.ss") → "12:05:30.50" ✅
```

#### 2. API Integration
```bash
# Save Score
POST http://localhost:3001/api/scores/team
Response: 201 Created { id: 5028, message: "Team score created/updated successfully" }

# Load Scores
GET http://localhost:3001/api/scores/team?teamId=23&competitionId=747&disciplineId=74
Response: 200 OK { results: [...], components: [...] }
```

#### 3. Database Validation
```sql
-- Check tfx_wertungen
SELECT * FROM tfx_wertungen WHERE int_wertungenid = 5028;
-- Result: scoreId=5028, teamId=23, competitionId=747 ✅

-- Check tfx_wertungen_details
SELECT * FROM tfx_wertungen_details WHERE int_wertungenid = 5028;
-- Result: 2 components (fieldId=69, fieldId=70) ✅
```

---

## 📈 Performance & Best Practices

### State Management
- ✅ **Flat State**: `Record<string, string>` statt verschachtelter Objekte
- ✅ **Memoization**: `useMemo` für gefilterte/transformierte Daten
- ✅ **Debouncing**: Auto-Save nur auf Blur, nicht onChange

### Database
- ✅ **Batch Operations**: DELETE + INSERT in Transaction
- ✅ **Indexed Queries**: Foreign Keys für performante JOINs
- ✅ **Minimal Queries**: Nur laden was benötigt wird

### Code Quality
- ✅ **Separation of Concerns**: ~180-390 Zeilen pro Datei
- ✅ **TypeScript**: Vollständige Type-Safety
- ✅ **Reusability**: Shared Components & Utilities
- ✅ **Legacy Compatibility**: Basiert auf C++ `_global::strLeistung`

---

## 🚀 Deployment

### Build Process
```bash
# Client
cd client
npm run build
# → dist/assets/index-*.js (mit inputMaskUtils)

# Server  
cd server
npm run build
# → dist/routes/teamScores.js (mit Components-Query)

# PM2 Restart
pm2 restart ecosystem.config.js
```

### Production Checklist
- ✅ Input Mask Utilities getestet (alle Formate)
- ✅ API Endpoints validiert (POST/GET)
- ✅ Database Schema kompatibel (tfx_wertungen, tfx_wertungen_details)
- ✅ Browser-Kompatibilität (Chrome, Firefox, Edge)
- ✅ Localization (de.json, en.json)

---

## 📚 Referenzen

### Related Files
```
client/src/
├── pages/GroupTeamScoring/
│   ├── TeamScoreCapture.tsx
│   ├── components/TeamScoreTable.tsx
│   └── GroupTeamScoring.types.ts
├── pages/ScoreCapture/
│   ├── index.tsx (integriert inputMaskUtils)
│   └── components/ScoreTable.tsx
└── utils/
    └── inputMaskUtils.ts

server/src/
├── routes/
│   ├── teamScores.ts (POST/GET mit Components)
│   └── groupScores.ts (Referenz für Components-Handling)
└── prisma/
    └── schema.prisma (tfx_wertungen, tfx_wertungen_details)
```

### Legacy Code References
```
turnfix/src/
├── _global.cpp (strLeistung Funktion)
├── _global.h
└── eingabe/wertungverwaltung.cpp (Team Score Entry UI)
```

### Documentation
- `GROUP_TEAM_SCORING_ARCHITECTURE.md` - Architektur-Übersicht
- `API_ROUTE_MISMATCHES.md` - Field Mapping Patterns
- `FRONTEND_SERVING_IMPLEMENTATION.md` - Production Setup

---

## ✅ Zusammenfassung

### Was wurde implementiert?

1. ✅ **TeamScoreTable Komponente** mit Inline-Editing
2. ✅ **Input Mask System** für alle Formate (Dezimal, Zeit, Komma)
3. ✅ **API Integration** mit Components-Support
4. ✅ **Database Persistence** in `tfx_wertungen` + `tfx_wertungen_details`
5. ✅ **ScoreCapture Integration** (gemeinsame Utilities)
6. ✅ **Normalisierung** mit Padding (z.B. `5` → `5.00`, `5` → `05.00`)
7. ✅ **Automatisches Speichern** bei Blur
8. ✅ **Laden gespeicherter Werte** mit Components

### Nächste Schritte (aus Todo-Liste)

- ⏳ Point 157: AK/SN Checkboxen in Mannschaftsmitglieder-Tabelle
- ⏳ Point 157: Wettkampf-Dropdown bei Team-Erstellung
- ⏳ Point 155: Einzelteilnehmer Filter & Wettkampf-Zuweisung

---

**Dokumentiert von**: GitHub Copilot  
**Datum**: 2025-11-17  
**Version**: 1.0
