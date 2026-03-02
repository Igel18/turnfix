# Formula System Documentation

**Version**: 2.1  
**Last Updated**: 2026-02-07  
**Author**: TurnFix Development Team

---

## 📋 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Formel-Typen](#formel-typen)
3. [InputMask System](#inputmask-system)
4. [Architektur & Komponenten](#architektur--komponenten)
5. [Verwendung](#verwendung)
6. [Beispiele](#beispiele)
7. [Technische Details](#technische-details)

---

## Überblick

Das TurnFix Formula System ermöglicht die **dynamische Berechnung von Endwerten** basierend auf konfigurierbaren Formeln und Eingabefeldern. Es unterstützt zwei verschiedene Formel-Typen und arbeitet eng mit dem InputMask-System zusammen, um verschiedene Eingabeformate (Dezimalzahlen, Zeit, etc.) zu verarbeiten.

### Hauptmerkmale

- ✅ **Zwei Formel-Typen**: Letter-based (A+B-C) und Variable-based (x/y/z)
- ✅ **InputMask Integration**: Zeit-Format (MM:SS.ms), Dezimal (0.00), etc.
- ✅ **Dynamische Felderstellung**: Fehlende Felder werden automatisch generiert
- ✅ **CSP-Safe**: Keine Verwendung von `eval()` oder `Function()`
- ✅ **Echtzeit-Berechnung**: Automatische Aktualisierung bei Wertänderungen
- ✅ **Type-Safe**: Vollständige TypeScript-Unterstützung

---

## Formel-Typen

### 1. Letter-based Formulas (A, B, C, D, E, ...)

**Verwendung**: Vordefinierte Formeln aus der Datenbank  
**Feld-Zuordnung**: Basiert auf `int_sortierung` in `tfx_disziplinen_felder`

```typescript
// Beispiel: Formel "A+B-C"
// A = Feld mit int_sortierung = 0 (z.B. "D/A-Note")
// B = Feld mit int_sortierung = 1 (z.B. "E/B-Note")
// C = Feld mit int_sortierung = 2 (z.B. "Abzug")
```

**Datenbank-Schema**:
```sql
-- tfx_disziplinen
int_formelid → Referenz zu tfx_formeln
var_formel   → Falls int_formelid = NULL (benutzerdefiniert)

-- tfx_disziplinen_felder
int_sortierung → Bestimmt A, B, C, ... Position
var_name       → Feldname (z.B. "D/A-Note")
bol_endwert    → TRUE für Endwert-Feld
```

**Feldladen**:
1. API-Call: `/api/discipline-fields?disciplineId=X`
2. Sortierung nach `int_sortierung` (aufsteigend)
3. Mapping: Position 0 = A, Position 1 = B, Position 2 = C, etc.

**Dynamische Felderstellung**:
```typescript
// Formel: A+B+C+D+E (benötigt 5 Felder)
// DB hat nur: D/A-Note (A), E/B-Note (B), Ausgangswert (C)
// System erstellt automatisch: "Field D", "Field E"
```

**Beispiel-Formeln**:
- `A+B-C` - Typische Turner-Wertung (D-Note + E-Note - Abzug)
- `A+B+C` - Summe dreier Werte
- `A*B/C` - Multiplikation und Division
- `(A+B)/2` - Durchschnitt mit Klammern

---

### 2. Variable-based Formulas (x, y, z, a, b, c)

**Verwendung**: Benutzerdefinierte Formeln (z.B. Zielwurf, spezielle Berechnungen)  
**Feld-Zuordnung**: Variablen werden aus der Formel extrahiert

```typescript
// Beispiel: Formel "(((1000/x)-2,158)/0,006)/49"
// x = Einziges Eingabefeld "X"
// Ergebnis = Automatisch berechnet
// ⚠️ Deutsche Dezimalkommas (2,158 statt 2.158) werden automatisch normalisiert
```

**Variable Map**:
```typescript
const variableMap = ['x', 'y', 'z', 'a', 'b', 'c']; // Max. 6 Felder
```

**Feldgenerierung**:
1. Regex-Suche nach Variablen: `/\b[a-z]\b/`
2. Für jede gefundene Variable → Input-Feld erstellen
3. Felder erhalten generische Namen: "X", "Y", "Z"
4. Endwert-Feld wird automatisch hinzugefügt

**Beispiel-Formeln**:
- `1*x` - Einfache Multiplikation
- `(((1000/x)-2,158)/0,006)/49` - 1000m-Lauf (mit deutschen Dezimalkommas)
- `12*(((100/(1,2*(15*x-16,5)))-0,3))` - 10m Streckentauchen
- `x+y*z` - Mehrere Variablen
- `(x+y)/2` - Durchschnitt

---

## InputMask System

### Übersicht

InputMasks definieren das **Format und die Validierung** von Eingabewerten. Sie werden in `tfx_disziplinen.var_eingabemaske` gespeichert.

### Unterstützte Mask-Typen

#### 1. Dezimal-Format (`0.00`, `00.00`)

**Format**: `0` = Ziffer, `.` = Dezimalpunkt  
**Beispiele**:
- `0.00` → `5.50`, `12.75`
- `00.00` → `05.50`, `12.75`

**Besonderheit**: 
- Akzeptiert **Komma UND Punkt** als Eingabe
- Normalisiert zu Komma-Darstellung für Anzeige
- Konvertiert zu Punkt für Berechnung

```typescript
// Eingabe: "5,5"
// Normalisiert zu: "5.50" (bei Mask 0.00)
// Für Berechnung: 5.5 (parseFloat)
```

#### 2. Zeit-Format (`00:00.00`)

**Format**: MM:SS.ms (Minuten:Sekunden.Hundertstel)  
**Beispiel**: `00:05.55` = 5 Sekunden, 55 Hundertstel

**Konvertierung für Berechnung**:
```typescript
parseTimeToSeconds("00:05.55") 
// → 5.55 Sekunden (5*1 + 0.55)

parseTimeToSeconds("01:30.25") 
// → 90.25 Sekunden (60*1 + 30 + 0.25)
```

**Verwendung**: Häufig bei Lauf- oder Zeit-basierten Disziplinen

#### 3. Weitere Formate

- Integer: `000`, `0000`
- Custom Patterns: Definierbar über `parseInputMask()`

### Normalisierung

**Ablauf bei Eingabe**:

1. **onChange**: Rohwert wird gespeichert, keine Validierung
2. **onBlur**: Normalisierung mit `normalizeScoreInput()`
   - Zeit-Format → Prüfung und Formatierung
   - Dezimal → Komma→Punkt, dann Formatierung
   - Ganzzahl → Padding mit Nullen
3. **Anzeige**: Normalisierter Wert im Input-Feld
4. **Berechnung**: Konvertierung zu Number

```typescript
// Beispiel: InputMask "0.00"
handleFieldChange(id, "5,5")    // Roh-Eingabe
→ handleFieldBlur(id)            // Trigger Normalisierung
→ normalizeScoreInput("5.5", "0.00")  // Komma→Punkt intern
→ Display: "5.50"                // Formatiert mit 2 Dezimalstellen
→ Calculation: 5.5               // parseFloat für Formel
```

---

## Architektur & Komponenten

### Datei-Struktur

```
client/src/
├── utils/
│   ├── formulaCalculator.ts    # Client Engine: 13 Core Functions (CSP-safe)
│   └── inputMaskUtils.ts       # InputMask Parsing & Normalisierung
├── hooks/
│   ├── useFormulaFields.ts     # State Management Hook (nutzt formulaCalculator)
│   └── useFormulaCalculation.ts # Display/Evaluation (nutzt shared Engine)
└── components/
    ├── FormulaInput.tsx         # Wiederverwendbare UI (Management)
    └── DisciplineConfigTester.tsx  # Legacy Wrapper

shared/src/
└── formulaUtils.ts             # Shared Engine: calculateFormula, formatFormula (expr-eval)

jury-portal/src/components/
└── FormulaInput.tsx             # Jury-Portal FormulaInput (nutzt shared Engine)
```

### 1. `formulaCalculator.ts` (Core Utils)

#### Hauptfunktionen:

| Funktion | Beschreibung |
|----------|--------------|
| `parseTimeToSeconds()` | Zeit-Format → Sekunden (00:05.55 → 5.55) |
| `normalizeValueForCalculation()` | Komma→Punkt, Zeit→Sekunden |
| `detectFormulaType()` | Erkennt 'letter' oder 'variable' |
| `extractVariables()` | Holt alle Variablen aus Formel |
| `getMaxLetterIndex()` | Höchster Buchstabe (E → 4) |
| `getFieldLetter()` | Index→Buchstabe (0→A, 1→B) |
| `getOperatorAfterField()` | Operator nach Feld (A **+** B) |
| `replaceVariablesInFormula()` | A,B,C → Werte ersetzen |
| `evaluateArithmetic()` | **CSP-safe Parser** (kein eval!) |
| `calculateFormulaResult()` | Komplette Berechnung mit Error-Handling |

#### CSP-Safe Parser (evaluateArithmetic)

**Problem**: `eval()` ist unsicher (Code Injection)  
**Lösung**: Recursive Descent Parser

```typescript
// Operator-Precedence:
parseExpression()  // +, - (niedrigste Priorität)
  → parseTerm()    // *, / (höhere Priorität)
    → parseFactor() // Zahlen, Klammern, Negation

// Beispiel: "5+3*2"
// 1. parseExpression → 5 + parseTerm()
// 2. parseTerm → 3 * 2 = 6
// 3. Result → 5 + 6 = 11 ✓ (korrekte Operator-Precedence)
```

**Validierung**:
```typescript
// Nur erlaubte Zeichen: Ziffern, Punkt, Operatoren, Klammern
/^[\d\.\+\-\*\/\(\)]+$/.test(formula)

// Fehler bei:
// - Buchstaben übrig: "1+5+D" ❌
// - Ungültige Zeichen: "5&3" ❌
// - Division durch 0: "5/0" ❌
```

---

### 2. `useFormulaFields.ts` (Hook)

**State Management** für Formel-Felder

#### Interface:
```typescript
interface UseFormulaFieldsOptions {
  formula?: string;              // Direkte Formel
  formulaId?: number | null;     // Formel aus DB
  disciplineId?: number;         // Für Field-Loading
  inputMask?: string;            // Format (0.00, 00:00.00)
  onFieldsLoaded?: (fields) => void;
  onCalculationComplete?: (result) => void;
}

interface UseFormulaFieldsResult {
  fields: FormulaField[];        // Alle Felder inkl. Werte
  calculatedResult: number | null;
  formulaError: string | null;
  loadingFormula: boolean;
  effectiveFormula: string;
  updateFieldValue: (id, value) => void;
  normalizeFieldValue: (id) => void;
  getFieldOperator: (index) => string;
  getFieldLetterLabel: (index) => string;
}
```

#### Lifecycle:

```
1. Mount
   ↓
2. Load Formula (wenn formulaId gesetzt)
   ↓
3. Detect Formula Type (letter vs variable)
   ↓
4. Load Fields
   ├─ Letter: API /discipline-fields
   │  └─ Check missing fields → create
   └─ Variable: Extract variables → create
   ↓
5. User Input (updateFieldValue)
   ↓
6. Blur (normalizeFieldValue)
   ↓
7. Auto-Calculate (wenn alle Felder gefüllt)
   ↓
8. onCalculationComplete Callback
```

#### Dynamische Felderstellung:

```typescript
// Formel: A+B+C+D+E
// DB-Felder: 3 (A, B, C)
// Fehlende: 2 (D, E)

const maxLetterIndex = getMaxLetterIndex("A+B+C+D+E"); // → 4 (E)
const missingCount = (4 + 1) - 3; // → 2

for (let i = 3; i <= 4; i++) {
  fields.push({
    id: 1000 + i,
    name: `Field ${getFieldLetter(i)}`, // "Field D", "Field E"
    value: '',
    isFinalScore: false
  });
}
```

---

### 3. `FormulaInput.tsx` (UI Component)

**Wiederverwendbare Komponente** für Formel-Darstellung

#### Props:
```typescript
interface FormulaInputProps {
  inputMask?: string;
  formula?: string;
  formulaId?: number | null;
  calculationType?: number;      // 2 = 2 Dezimalen, 3 = 3 Dezimalen
  unit?: string;                 // "Pkt.", "Sek."
  disciplineId?: number;
  showTitle?: boolean;           // "Formula Calculation Test" Header
  className?: string;
  onFieldsLoaded?: (fields) => void;
  onCalculationComplete?: (result) => void;
}
```

#### UI-Struktur:

```
┌─────────────────────────────────────────────┐
│ 🧪 Formula Calculation Test                │ (optional)
├─────────────────────────────────────────────┤
│  (A)        (B)        (C)        = (EW)    │
│ D/A-Note  E/B-Note  Ausgangswert  Endwert   │
│ [5.00]  + [5.00]  + [7.00]      = [ ? ]     │
│                                   (grün)     │
│                               Pkt.           │
└─────────────────────────────────────────────┘
```

**Features**:
- ✅ Letter-Labels (A), (B), (C), (EW)
- ✅ Operator-Darstellung (+ - × ÷)
- ✅ InputMask-Integration
- ✅ Echtzeit-Berechnung
- ✅ Error-Anzeige
- ✅ Unit-Display

---

## Verwendung

### Szenario 1: Disziplin-Konfiguration (Tester)

```typescript
import DisciplineConfigTester from '../components/DisciplineConfigTester';

<DisciplineConfigTester
  inputMask="0.00"
  formula="A+B-C"
  formulaId={3}
  calculationType={3}
  unit="Pkt."
  disciplineId={74}
/>
```

### Szenario 2: Wertungserfassung (ScoreCapture)

```typescript
import { FormulaInput } from '../components/FormulaInput';

<FormulaInput
  formula="A+B-C"
  disciplineId={74}
  inputMask="0.00"
  calculationType={3}
  unit="Pkt."
  showTitle={false}  // Kein Header
  onCalculationComplete={(result) => {
    // Speichere Ergebnis direkt
    saveScoreToDatabase(result);
  }}
/>
```

### Szenario 3: Custom Hook (Team-Wertung)

```typescript
import { useFormulaFields } from '../hooks/useFormulaFields';

const TeamScore = () => {
  const {
    fields,
    updateFieldValue,
    normalizeFieldValue,
    calculatedResult
  } = useFormulaFields({
    formula: "A+B+C",
    disciplineId: 31,
    inputMask: "0.00",
    onCalculationComplete: (result) => {
      console.log('Team Score:', result);
    }
  });

  return (
    <div>
      {fields.filter(f => !f.isFinalScore).map(field => (
        <input
          key={field.id}
          value={field.value}
          onChange={(e) => updateFieldValue(field.id, e.target.value)}
          onBlur={() => normalizeFieldValue(field.id)}
        />
      ))}
      <div>Ergebnis: {calculatedResult}</div>
    </div>
  );
};
```

### Szenario 4: Nur Calculation Utils

```typescript
import { calculateFormulaResult } from '../utils/formulaCalculator';

const { result, error } = calculateFormulaResult(
  "A+B-C",
  ["5.00", "5.00", "0.30"], // Feldwerte
  "letter"                  // Formel-Typ
);

console.log(result); // 9.7
```

---

## Beispiele

### Beispiel 1: Turner-Wertung (Reck)

**Disziplin**: Reck (Männlich)  
**Formel**: `A+B-C` (aus tfx_formeln)  
**InputMask**: `0.00`

**Felder** (aus tfx_disziplinen_felder):
| int_sortierung | var_name | Mapping |
|----------------|----------|---------|
| 0 | D/A-Note | A |
| 1 | E/B-Note | B |
| 2 | Abzug | C |
| 3 | Endwert | (Ergebnis) |

**Berechnung**:
```
Eingabe: D/A-Note = 5.00, E/B-Note = 8.50, Abzug = 0.30
Formel:  A + B - C
       = 5.00 + 8.50 - 0.30
       = 13.20
```

---

### Beispiel 2: Zielwurf (Variable Formula)

**Disziplin**: Zielwurf  
**Formel**: `(((1000/x)-2.158)/0.006)/49` (benutzerdefiniert)  
**InputMask**: `00:00.00` (Zeit)

**Felder** (automatisch generiert):
| Variable | var_name | Eingabe-Format |
|----------|----------|----------------|
| x | X | 00:05.55 |
| - | Endwert | (berechnet) |

**Berechnung**:
```
Eingabe: x = "00:05.55"
Konvertierung: 00:05.55 → 5.55 Sekunden
Formel:  (((1000/x)-2.158)/0.006)/49
       = (((1000/5.55)-2.158)/0.006)/49
       = (((180.18)-2.158)/0.006)/49
       = ((178.022)/0.006)/49
       = (29670.33)/49
       = 605.52
```

---

### Beispiel 3: Fehlende Felder (A+B+C+D+E)

**Disziplin**: Zielwurf Summe  
**Formel**: `A+B+C+D+E`  
**DB-Felder**: 3 (D/A-Note, E/B-Note, Ausgangswert)

**Automatische Felderstellung**:
```typescript
// System erkennt: Formel braucht 5 Felder (A bis E)
// DB hat nur: 3 Felder
// System erstellt: "Field D", "Field E"

Felder:
(A) D/A-Note     → DB
(B) E/B-Note     → DB
(C) Ausgangswert → DB
(D) Field D      → Auto-generiert
(E) Field E      → Auto-generiert
(EW) Endwert     → Ergebnis
```

**Berechnung**:
```
Eingabe: A=1, B=5, C=5, D=3, E=2
Formel:  A + B + C + D + E
       = 1 + 5 + 5 + 3 + 2
       = 16
```

---

## Technische Details

### Fehlerbehandlung

```typescript
// 1. Division durch Null
evaluateArithmetic("5/0") 
// → Error: "Division by zero"

// 2. Ungültige Zeichen
evaluateArithmetic("1+5+D") 
// → Error: "Invalid characters in expression: 1+5+D"

// 3. Ungültiger Wert
calculateFormulaResult("A+B", ["5", "abc"], "letter")
// → { result: null, error: "Invalid value: abc" }

// 4. Unvollständige Eingabe
// → calculatedResult bleibt null (keine Error)
```

### Performance

**Optimierungen**:
- ✅ Berechnung nur bei vollständigen Eingaben
- ✅ Normalisierung nur bei Blur (nicht bei jedem Keystroke)
- ✅ Memoization in useEffect Dependencies
- ✅ Keine unnötigen Re-Renders

**Typische Ausführungszeiten**:
- Field Loading: ~50-100ms (API Call)
- Formula Parsing: <1ms
- Calculation: <1ms
- Total (User Input → Result): <5ms

### Browser-Kompatibilität

**Getestet auf**:
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Edge 120+
- ✅ Safari 17+

**Polyfills benötigt**: Keine (verwendet nur ES2020 Features)

### Sicherheit

**Content Security Policy (CSP)**:
- ✅ **Kein `eval()`** - Verwendet Recursive Descent Parser
- ✅ **Kein `Function()`** - Pure arithmetic operations
- ✅ **Input Validation** - Regex-Filter vor Parsing
- ✅ **XSS Protection** - Alle Werte escaped (React)

**Injection-Schutz**:
```typescript
// ❌ UNSICHER (alte Methode):
const result = eval(formula.replace('A', '5'));

// ✅ SICHER (aktuelle Methode):
const result = evaluateArithmetic(
  replaceVariablesInFormula(formula, [5], 'letter')
);
// → Nur Zahlen und Operatoren erlaubt
```

---

## Migration & Legacy

### Von altem DisciplineConfigTester

**Alt** (657 Zeilen):
```typescript
// Alles in einer Komponente
// - Formula Loading
// - Field Management
// - Calculation
// - UI Rendering
```

**Neu** (3 Module):
```typescript
// 1. Utils (formulaCalculator.ts) - 13 Funktionen
// 2. Hook (useFormulaFields.ts) - State Management
// 3. Component (FormulaInput.tsx) - UI Only
// 4. Wrapper (DisciplineConfigTester.tsx) - 42 Zeilen
```

**Migration**:
```typescript
// Alte Verwendung (funktioniert weiterhin):
<DisciplineConfigTester {...props} />

// Neue Verwendung (empfohlen):
<FormulaInput {...props} />

// Oder direkt Hook:
const { fields, calculatedResult } = useFormulaFields(options);
```

---

## Troubleshooting

### Problem: Felder werden nicht angezeigt

**Ursache**: `effectiveFormula` nicht in useEffect Dependencies  
**Lösung**: Dependency Array prüfen

```typescript
useEffect(() => {
  // ...
}, [disciplineId, effectiveFormula]); // ← effectiveFormula hinzufügen
```

### Problem: Komma wird zu 55.00 statt 5.50

**Ursache**: Normalisierung vor Komma→Punkt Konvertierung  
**Lösung**: Pre-Convert bei Decimal Masks

```typescript
if (maskInfo.type === 'decimal' && value.includes(',')) {
  value = value.replace(',', '.'); // ← VOR normalizeScoreInput
}
```

### Problem: Zeit-Format wird nicht erkannt

**Ursache**: Regex-Pattern stimmt nicht  
**Lösung**: Pattern prüfen

```typescript
const timeMatch = value.match(/^(\d+):(\d+)[.,](\d+)$/);
//                                ^^    ^^     ^^    ^^
//                                MM    SS    .oder,  ms
```

### Problem: Division durch Null nicht abgefangen

**Ursache**: Parser-Fehler  
**Lösung**: Bereits implementiert in `parseTerm()`

```typescript
if (op === '/') {
  if (right === 0) throw new Error('Division by zero');
  result /= right;
}
```

---

## Weiterführende Dokumentation

- **InputMask Utils**: `client/src/utils/inputMaskUtils.ts`
- **Database Schema**: `server/prisma/schema.prisma`
  - `tfx_disziplinen` (Disziplinen & Formeln)
  - `tfx_disziplinen_felder` (Felder & Sortierung)
  - `tfx_formeln` (Vordefinierte Formeln)
- **API Routes**: 
  - `/api/discipline-fields` - Field Loading
  - `/api/formulas/:id` - Formula Loading

---

## Dual-Engine Architektur & Bugfix-Dokumentation

### Überblick: Zwei Formel-Engines

TurnFix verwendet **zwei unterschiedliche Formel-Engines**, die in verschiedenen Kontexten eingesetzt werden:

| Engine | Datei | Verwendet von | Parser | Komma-Handling |
|--------|-------|---------------|--------|----------------|
| **Client Engine** | `client/src/utils/formulaCalculator.ts` | Management-App (FormulaInput, Score Capture) | Recursive Descent (CSP-safe) | Aggressiv: `formula.replace(/,/g, '.')` |
| **Shared Engine** | `shared/src/formulaUtils.ts` | Jury-Portal, Server, Client (Display) | `expr-eval` Library | Präzise: `formula.replace(/(\d),(\d)/g, '$1.$2')` |

#### Client Engine (`formulaCalculator.ts`)
- **Einsatz**: `useFormulaFields` Hook → Management-App FormulaInput
- **Stärken**: CSP-safe (kein `eval()`), kein `startValue`-Konzept
- **Komma-Handling**: Globale Ersetzung aller Kommas → funktioniert immer
- **Kein `startValue`**: Verwendet Formel wie geschrieben (kein Ersetzen der führenden Zahl)

#### Shared Engine (`shared/src/formulaUtils.ts`)
- **Einsatz**: Jury-Portal `FormulaInput`, Server-seitige Berechnung, Client `useFormulaCalculation` Hook
- **Stärken**: Zentraler Code für alle drei Projekte (shared package)
- **`startValue`-Konzept**: Kann die führende Zahl einer Formel durch `maxScore` ersetzen (z.B. `10 + A - B` → `15 + A - B`)

---

### Bugfix: German Decimal Commas + startValue (2026-02)

#### Problem 1: Deutsche Dezimalkommas in Formeln

**Symptom**: Jury-Portal zeigte Formel-Variablen korrekt an, berechnet nach Eingabe aber kein Ergebnis.

**Ursache**: Produktionsformeln verwenden **deutsches Dezimalkomma**:
```
(((1000/x)-2,158)/0,006)/49          ← 1000m-Lauf
12*(((100/(1,2*(15*x-16,5)))-0,3))   ← 10m Streckentauchen
```

Die `calculateFormula()` in der Shared Engine validierte mit Regex:
```typescript
// ALT: Komma nicht erlaubt → Formel wird abgelehnt → return null
if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) return null;
```

**Fix in `shared/src/formulaUtils.ts`**:
```typescript
// Deutsche Dezimalkommas normalisieren BEVOR Validierung
// Nur zwischen Ziffern ersetzen (z.B. "2,158" → "2.158")
evalFormula = evalFormula.replace(/(\d),(\d)/g, '$1.$2');

// Validierung erfolgt danach mit normalisierten Punkten
if (!/^[0-9+\-*/.() ]+$/.test(evalFormula)) return null;
```

**Warum `(\d),(\d)` statt `/,/g`?**
- Präziser: Ersetzt nur Kommas zwischen Ziffern
- Vermeidet Probleme mit Kommas in anderen Kontexten
- Behandelt korrekt: `2,158` → `2.158`  aber nicht `,5` oder `5,`

#### Problem 2: startValue überschreibt Formel-Konstanten

**Symptom**: Formel `1*x` mit `x=5` ergab `0` statt `5`.

**Ursache**: `startValue` (= `maxScore` der Disziplin, oft `0`) ersetzte die führende `1`:
```typescript
// ALT: Immer ersetzen
evalFormula = evalFormula.replace(/^(\d+(\.\d+)?)/, startValue.toString());
// "1*x" mit startValue=0 → "0*x" → 0 ❌
```

**Fix**: Erkennung von Custom-Formeln (lowercase Variables):
```typescript
// Custom-Formeln (lowercase vars: x, y, z) → kein startValue ersetzen
const hasLowercaseVars = /\b[a-z]\b/.test(formula);

if (startValue !== undefined && !hasLowercaseVars) {
  evalFormula = evalFormula.replace(/^(\d+(\.\d+)?)/, startValue.toString());
}
// "1*x" → bleibt "1*x" → mit x=5 → "1*5" → 5 ✓
// "10+A-B" mit startValue=15 → "15+A-B" ✓ (letter-based, kein lowercase var)
```

**Gleiche Logik in `formatFormulaWithValues()`**:
```typescript
const hasLowercaseVars = /\b[a-z]\b/.test(formula);
if (replaceStartValue && startValue !== undefined && !hasLowercaseVars) {
  displayFormula = displayFormula.replace(/^(\d+(\.\d+)?)/, startValue.toString());
}
```

#### Problem 3: Infinite Re-Render im Jury-Portal FormulaInput

**Symptom**: Potentieller Infinite-Loop in Jury-Portal `FormulaInput.tsx`.

**Ursache**: `onScoreChange` (inline arrow function) war in der `useEffect`-Dependency-Array:
```tsx
// ALT: Inline arrow erstellt neue Referenz bei jedem Render
useEffect(() => {
  onScoreChange(result, fieldValues);
}, [fieldValues, formula, startValue, onScoreChange]); // ← neue Referenz → re-render → neue Ref → ...
```

**Fix mit `useRef`**:
```tsx
const onScoreChangeRef = useRef(onScoreChange);
onScoreChangeRef.current = onScoreChange;

useEffect(() => {
  const result = calculateFormula(formula, fieldValues, startValue);
  setCalculatedScore(result);
  onScoreChangeRef.current(result, fieldValues);
}, [fieldValues, formula, startValue]); // ← stabile Referenz, kein Loop
```

---

### Verifikation

#### Manuelle Tests
```
Test 1: 1*x mit x=5             → 5   ✓ (war 0 vor Fix)
Test 2: (((1000/x)-2,158)/0,006)/49 mit x=300 → 3.998 ✓ (war null vor Fix)
Test 3: (10+A)-B mit {A:6, B:3.5}             → 12.5  ✓ (unverändert)
```

#### Unit Tests

| Test-Suite | Datei | Tests | Status |
|------------|-------|-------|--------|
| Shared formulaUtils | `client/src/test/utils/formulaUtils.test.ts` | 65 (9 neu) | ✅ Pass |
| Server formulaUtils | `server/src/test/utils/formulaUtils.test.ts` | 51 | ✅ Pass |
| Client formulaCalculator | `client/src/test/utils/formulaCalculator.test.ts` | 66 (5 neu) | ✅ Pass |

**Neue Tests (formulaUtils.test.ts)**:
- Deutsche Dezimalkommas: 3 Tests
  - `(((1000/x)-2,158)/0,006)/49` mit x=300
  - `x * 1,5` mit x=4
  - Schwimm-Formel mit komplexen Kommas
- startValue-Schutz: 4 Tests
  - `1*x` wird nicht durch `startValue=0` zerstört
  - Letter-Formeln verwenden weiterhin `startValue`
- formatFormulaWithValues: 2 Tests
  - Variable-Formeln: kein startValue in Display
  - Letter-Formeln: startValue korrekt in Display

**Neue Tests (formulaCalculator.test.ts)**:
- `1*x` mit Variable-Typ → 5
- `(((1000/x)-2,158)/0,006)/49` mit x=300 → ≈3.998
- Schwimm-Formel mit Kommas
- `x * 1,5` mit x=4 → 6
- Kombination: Komma in Eingabe UND Formel

#### Management ScoreCapture: Kein Bugfix nötig

Die Management-App verwendet die **Client Engine** (`formulaCalculator.ts`), die:
- ✅ Kommas bereits aggressiv ersetzt (`/,/g`)
- ✅ Kein `startValue`-Konzept hat
- ✅ Custom-Formeln korrekt berechnet

→ **Kein Bugfix erforderlich** für Management ScoreCapture.

---

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `shared/src/formulaUtils.ts` | Komma-Normalisierung + startValue-Schutz |
| `jury-portal/src/components/FormulaInput.tsx` | useRef für onScoreChange |
| `client/src/test/utils/formulaUtils.test.ts` | 9 neue Tests |
| `client/src/test/utils/formulaCalculator.test.ts` | 5 neue Tests |

---

**Ende der Dokumentation**
