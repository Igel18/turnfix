# Dynamisches Feld-Mapping für Formeln

## Problem
Die ursprüngliche Implementierung verwendete **hardcodierte Feldnamen** für die Zuordnung zu Formelvariablen:

```typescript
// ALTE IMPLEMENTIERUNG (hardcoded)
if (fieldValues['D/A-Note'] !== undefined) variableMap['A'] = fieldValues['D/A-Note'];
if (fieldValues['E/B-Note'] !== undefined) variableMap['B'] = fieldValues['E/B-Note'];
if (fieldValues['Neutrale Abzüge'] !== undefined) variableMap['C'] = fieldValues['Neutrale Abzüge'];
if (fieldValues['Ausgangswert'] !== undefined) variableMap['D'] = fieldValues['Ausgangswert'];
```

**Konsequenz**: Das System war nicht flexibel. Wenn eine Disziplin andere Feldnamen oder eine andere Reihenfolge hatte, funktionierte die Berechnung nicht korrekt.

## Lösung
Die neue Implementierung verwendet **dynamisches Mapping basierend auf `sortOrder`** aus der Datenbank-Konfiguration:

```typescript
// NEUE IMPLEMENTIERUNG (dynamisch)
if (fields && fields.length > 0) {
  // Sort fields by sortOrder (this determines A, B, C, etc.)
  const sortedFields = [...fields]
    .filter(f => !f.isFinalScore) // Exclude final score field (Endwert)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  
  // Map each field to its corresponding variable (A, B, C, etc.) based on sort order
  sortedFields.forEach((field, index) => {
    if (index < variables.length && fieldValues[field.name] !== undefined) {
      variableMap[variables[index]] = fieldValues[field.name];
    }
  });
}
```

## Datenbank-Konfiguration
Die Felder kommen aus der Tabelle `tfx_disziplinen_felder`:

- **`int_sortierung`**: Bestimmt die Reihenfolge (1 → A, 2 → B, 3 → C, etc.)
- **`var_name`**: Der Name des Feldes (z.B. "D/A-Note", "E/B-Note")
- **`bol_endwert`**: Ob es das Endwert-Feld ist (wird von der Variablen-Zuordnung ausgeschlossen)
- **`bol_enabled`**: Ob das Feld aktiviert ist

## Vorteile

### 1. Flexibilität
Jede Disziplin kann beliebige Feldnamen und beliebige Reihenfolgen haben.

**Beispiel 1 - Männer Boden:**
- Feld 1 (sortOrder=1): "D/A-Note" → Variable A
- Feld 2 (sortOrder=2): "E/B-Note" → Variable B
- Feld 3 (sortOrder=3): "Neutrale Abzüge" → Variable C
- Feld 4 (sortOrder=4, isFinalScore=true): "Endwert"

**Beispiel 2 - Frauen Sprung:**
- Feld 1 (sortOrder=1): "Schwierigkeitswert" → Variable A
- Feld 2 (sortOrder=2): "Ausführung" → Variable B
- Feld 3 (sortOrder=3, isFinalScore=true): "Endwert"

### 2. Konfigurierbarkeit
- Keine Code-Änderungen erforderlich für neue Disziplinen
- Alle Konfigurationen in der Datenbank
- Einfache Verwaltung über das UI (http://localhost:3001/disciplines)

### 3. Konsistenz
- `evaluateFormula()`: Verwendet sortOrder für Berechnungen
- `parseFormulaDisplay()`: Verwendet sortOrder für Anzeige
- Beide Funktionen arbeiten mit der gleichen Logik

## Verwendung

### 1. Formel-Auswertung
```typescript
const calculatedScore = evaluateFormula(formula, fieldValues, fields);
```

### 2. Formel-Anzeige
```typescript
const parsedFormula = parseFormulaDisplay(formula, enabledFields, finalFieldName);
// Beispiel-Output: "Endwert = D/A-Note + E/B-Note - Neutrale Abzüge"
```

## Debugging
Wenn `DEBUG=true` gesetzt ist, zeigt das System detaillierte Mappings:
```
  A = D/A-Note (sortOrder: 1) = 6.5
  B = E/B-Note (sortOrder: 2) = 8.0
  C = Neutrale Abzüge (sortOrder: 3) = 0.3
```

## Betroffene Dateien
- **client/src/pages/ScoreCapture.tsx**:
  - `evaluateFormula()`: Zeilen 261-310 (refactored)
  - `parseFormulaDisplay()`: Zeilen 224-258 (refactored)
  - `calculateDisciplineScores()`: Zeile 1068 (updated call)
  - Formula display in UI: Zeile 1650 (updated call)

## Migration
Keine Migration erforderlich! Das System funktioniert mit der bestehenden Datenbank-Konfiguration:
- ✅ Bestehende Disziplinen funktionieren weiterhin
- ✅ Neue Disziplinen können beliebige Felder haben
- ✅ Fallback-Logik für Disziplinen ohne Feld-Konfiguration

## Datum
2025-01-15 - Implementiert als Teil der dynamischen Feld-Architektur
