# EW (Endwert) / AW (Ausgangswert) — Architektur-Dokumentation

**Version**: 1.0  
**Erstellt**: 2026-03-10  
**Status**: Implementiert & getestet

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Datenbank-Schema](#datenbank-schema)
3. [Architektur-Konzept](#architektur-konzept)
4. [Naming-Konventionen](#naming-konventionen)
5. [Zwei-Stufen-Formelsystem](#zwei-stufen-formelsystem)
6. [Implementierungsstatus](#implementierungsstatus)
7. [Bekannte Bugs & Fixes](#bekannte-bugs--fixes)
8. [Test-Abdeckung](#test-abdeckung)

---

## Überblick

In TurnFix hat jede Disziplin eine Reihe von **Disziplinfeldern** (`tfx_disziplinen_felder`), die als Eingabe- oder Ausgabewerte für die Formelberechnung dienen. Zwei boolesche Flags bestimmen die Rolle eines Felds:

| Flag | Deutsch | Rolle |
|------|---------|-------|
| `bol_endwert` = `true` | **Endwert (EW)** | **Ausgabe-Ziel** — hier wird das Formelergebnis gespeichert |
| `bol_ausgangswert` = `true` | **Ausgangswert (AW)** | **Startwert/Schwierigkeit** — wird angezeigt, aber NICHT in der Formel verwendet |
| Beide `false` | Eingabefeld | **Formelvariable** — wird als A, B, C... in die Formel eingesetzt |

### Kernregel

> **EW ist IMMER das Ziel der Berechnung (= Zuweisung), NIE eine Eingabevariable.**
>
> Die Formelzeichenkette (z.B. `"A+B-C"`) enthält NIE "EW".
> Conceptually: `EW = A + B - C`

---

## Datenbank-Schema

```sql
-- tfx_disziplinen_felder
int_disziplinen_felderid  INT PRIMARY KEY
int_disziplinenid         INT           -- FK → tfx_disziplinen
var_name                  VARCHAR(15)   -- Feldbezeichnung (z.B. "D-Note", "Endwert")
int_sortierung            SMALLINT      -- Reihenfolge für Variable-Zuweisung
bol_endwert               BOOLEAN DEFAULT TRUE   -- ⚠️ EW-Flag
bol_ausgangswert          BOOLEAN DEFAULT TRUE   -- ⚠️ AW-Flag
int_gruppe                SMALLINT DEFAULT 1
bol_enabled               BOOLEAN DEFAULT TRUE

-- tfx_formeln (verknüpfte Formel)
int_formelid    INT PRIMARY KEY
var_name        VARCHAR(100)  -- z.B. "DTB Standard"
var_formel      VARCHAR(200)  -- z.B. "A+B-C"
int_typ         SMALLINT DEFAULT 0

-- tfx_disziplinen (eingebaute Formel)
int_disziplinenid  INT PRIMARY KEY
var_formel         VARCHAR(200)  -- z.B. "1*x", "20-x" (var_formel auf Disziplin-Ebene)
int_formelid       INT           -- FK → tfx_formeln (verknüpfte Formel)
```

### ⚠️ Warnung: Defaults

Neue Felder haben standardmäßig `bol_endwert = true` UND `bol_ausgangswert = true`. Das bedeutet: **neue Felder werden automatisch aus der Formelberechnung ausgeschlossen**, bis ein Benutzer die Flags korrekt konfiguriert.

---

## Architektur-Konzept

### Formelberechnung — Ablauf

```
Disziplinfelder (tfx_disziplinen_felder):
┌──────────────────┬──────────────┬─────────┬─────────┬───────────────┐
│ var_name         │ int_sortierung│ bol_endwert │ bol_ausgangswert │ Rolle    │
├──────────────────┼──────────────┼─────────┼─────────┼───────────────┤
│ Ausgangswert     │ 0            │ false   │ TRUE    │ AW (anzeigen) │
│ D-Note           │ 1            │ false   │ false   │ → Variable A  │
│ E-Note           │ 2            │ false   │ false   │ → Variable B  │
│ Abzug            │ 3            │ false   │ false   │ → Variable C  │
│ Endwert          │ 4            │ TRUE    │ false   │ ← EW (Ergebnis)│
└──────────────────┴──────────────┴─────────┴─────────┴───────────────┘

Formel (tfx_formeln.var_formel): "A + B - C"

Variable-Zuweisung:
  1. Filtere Felder: !bol_endwert && !bol_ausgangswert
  2. Sortiere nach int_sortierung ASC
  3. Weise zu: A=D-Note, B=E-Note, C=Abzug

Berechnung:
  EW = A + B - C
  EW = 5.2 + 7.8 - 1.0
  EW = 12.0

Ergebnis → Schreibe 12.0 in Endwert-Feld (tfx_jury_results + tfx_wertungen_details)
```

### AW (Ausgangswert) — Anzeige

Der Ausgangswert wird NICHT in der Formel verwendet, sondern:
- In Klammern neben dem Ergebnis angezeigt: `"12.00 (5.20)"`
- Optional im Ergebnisblatt gedruckt (Checkbox: "Ausgangswert zusätzlich abdrucken")
- Als Schwierigkeitsgrad auf dem Wertungsdisplay angezeigt

---

## Naming-Konventionen

### Über alle Schichten

| Schicht | Endwert (EW) | Ausgangswert (AW) |
|---------|-------------|-------------------|
| **Datenbank** | `bol_endwert` | `bol_ausgangswert` |
| **Server API** | `isFinalScore` | `isStartingScore` |
| **Client** (types) | `isFinalScore` | `isStartingScore` |
| **Jury Portal** (types) | `isEndValue` (gemappt) | `isStartValue` (gemappt) |
| **Shared** (formulaUtils) | `isFinalScore` | `isStartingScore` |

### Mapping-Kette

```
DB: bol_endwert → Server SQL: AS "isFinalScore" → API JSON → Client: isFinalScore
                                                            → Jury Portal: isEndValue
```

---

## Zwei-Stufen-Formelsystem

### Stufe 1: Jury-Formel (verknüpfte Formel)

**Quelle**: `tfx_formeln.var_formel` (via `int_formelid`)  
**Variablen**: Großbuchstaben A, B, C, ...  
**Zweck**: Berechnet Endwert aus Jury-Feldwerten

```
Beispiel: "A + B - C"
A = D-Note (5.2), B = E-Note (7.8), C = Abzug (1.0)
→ Endwert = 12.0
```

### Stufe 2: Eingebaute Formel (var_formel auf Disziplin)

**Quelle**: `tfx_disziplinen.var_formel`  
**Variable**: Kleinbuchstabe `x` (= Endwert aus Stufe 1)  
**Zweck**: Transformiert den Rohwert für Ranglistenerstellung

```
Beispiele:
  "1*x"      → Identität (häufigster Fall)
  "20-x"     → Zeitbasiert: niedrigere Zeit = höhere Punktzahl
  "x/2,5"    → Skalierung (mit deutschem Dezimalkomma)
  "(((2000/x)-1,784)/0,006)/49" → Komplexe Zeitumrechnung
```

### Vollständiger Datenfluss

```
Jury-Eingabe → Stufe 1 (Jury-Formel) → Endwert → Stufe 2 (var_formel) → Ranking-Score
                 A+B-C                  12.0         1*x                   12.0
```

---

## Implementierungsstatus

### ✅ Korrekt implementiert

| Komponente | Datei | EW-Ausschluss | AW-Ausschluss |
|------------|-------|------------|--------------|
| **Shared: buildFieldSymbolsMap** | `shared/src/formulaUtils.ts` | ✅ `!jr.isFinalScore` | ✅ `!jr.isStartingScore` |
| **Client: useFormulaCalculation** | `client/src/pages/ScoreCapture/hooks/useFormulaCalculation.ts` | ✅ `!f.isFinalScore` | ⚠️ Nur EW geprüft |
| **Client: useScoreActions** | `client/src/pages/ScoreCapture/hooks/useScoreActions.ts` | ✅ `!field.isFinalScore` | ⚠️ Nur EW geprüft |
| **Client: TeamScoreTable** | `client/src/pages/GroupTeamScoring/components/TeamScoreTable.tsx` | ✅ `!f.isFinalScore` | ⚠️ Nur EW geprüft |
| **Client: GroupScoreCapture** | `client/src/pages/GroupTeamScoring/GroupScoreCapture.tsx` | ✅ `!f.isFinalScore` | ⚠️ Nur EW geprüft |
| **Client: TeamScoreCapture** | `client/src/pages/GroupTeamScoring/TeamScoreCapture.tsx` | ✅ `!f.isFinalScore` | ⚠️ Nur EW geprüft |
| **Server: scores.ts** | `server/src/routes/scores.ts` | ✅ `!jr.isFinalScore` | ✅ via `buildFieldSymbolsMap` |
| **Server: scoresScoring.ts** | `server/src/routes/scoresScoring.ts` | ✅ `bol_endwert = false` (SQL) | ✅ SQL-Filter |
| **Server: juryResultsScoring.ts** | `server/src/routes/juryResultsScoring.ts` | ✅ EW-Erkennung + separate Speicherung | ✅ |
| **Jury Portal: useScoreSave** | `jury-portal/src/components/JuryPortal/hooks/useScoreSave.ts` | ✅ `!f.isEndValue` | ✅ `!f.isStartValue` |
| **Client: DisciplinesUnified** | `client/src/pages/DisciplinesUnified.tsx` | ✅ Badges anzeigen | ✅ |
| **Client: DisciplineFieldsUnified** | `client/src/pages/DisciplineFieldsUnified.tsx` | ✅ CRUD UI | ✅ |

### ⚠️ Offene Punkte

| Punkt | Beschreibung | Risiko |
|-------|-------------|--------|
| Client-Hooks prüfen nur `!isFinalScore`, nicht `!isStartingScore` | Wenn AW-Felder vorkommen, könnten sie in die Formelvariablen gelangen | **Niedrig** — in der Praxis nutzen die meisten Berechnungspfade `buildFieldSymbolsMap()` aus shared, das beide prüft |
| Formel-Anzeige zeigt nicht explizit "= EW" | Formeln werden als "A+B-C" angezeigt, nicht als "Endwert = A+B-C" | **Kosmetisch** — Funktion `parseFormulaDisplay` fügt den Endwert-Feldnamen bereits als Prefix hinzu |
| DB-Defaults: `bol_endwert=true, bol_ausgangswert=true` | Neue Felder werden automatisch aus der Berechnung ausgeschlossen | **Dokumentiert** — UI muss Benutzer darauf hinweisen |

---

## Bekannte Bugs & Fixes

### Bug 1: A/B Werte-Vertauschung (Jury Portal)
**Status**: ✅ Behoben

**Problem**: Server gab Jury-Ergebnisse mit `ORDER BY int_juryresultsid DESC` als Tiebreaker zurück. Da A zuerst gespeichert wurde (niedrigere jrid), wurden beim Laden die Werte vertauscht.

**Fix**: Mapping der geladenen Ergebnisse über `disciplineFieldId` statt positionellem Index.

### Bug 2: Naming-Mismatch (Jury Portal)
**Status**: ✅ Behoben

**Problem**: `useJuryData.ts` las `f.isEndValue`/`f.isStartValue`, aber die API gab `isFinalScore`/`isStartingScore` zurück → beide immer `false` → Endwert wurde nicht aus der Filterung ausgeschlossen.

**Fix**: Korrektes Mapping `isFinalScore → isEndValue` in der Client-Mapping-Funktion.

### Bug 3: Positionelles Index-Mapping (Jury Portal)
**Status**: ✅ Behoben

**Problem**: `loadJuryResults` mappte Ergebnisse per positionellem Index → Symbol, statt über `disciplineFieldId`. Jede Sortierungs-Abweichung führte zu falschem Mapping.

**Fix**: Mapping über `disciplineFieldId` → Feldposition in der geordneten Eingabefeldliste.

---

## Test-Abdeckung

### Shared Tests

**Datei**: `shared/src/__tests__/endwertAusgangswert.test.ts`  
**44 Tests** in 10 Kategorien:

| Kategorie | Tests | Beschreibung |
|-----------|-------|-------------|
| EW Exclusion | 5 | EW wird nie als Formelvariable zugewiesen |
| AW Exclusion | 4 | AW wird nie als Formelvariable zugewiesen |
| EW als Zuweisung | 5 | Formelergebnis = EW-Feld |
| Zwei-Stufen-System | 5 | Jury-Formel + Built-in-Formel Pipeline |
| Sortierung | 3 | Variable-Zuweisung nach int_sortierung |
| Edge Cases | 6 | Fehlkonfigurationen, null-Werte, beide Flags |
| Formel-Anzeige | 3 | EW nie in Formelstring |
| Realistische Szenarien | 5 | Boden, Sprung, Minitrampolin, Zeitdisziplin |
| Naming-Konventionen | 3 | isFinalScore vs isEndValue Mapping |
| Datenfluss-Verträge | 5 | End-to-End Contract Tests |

### Jury Portal Tests

**Datei**: `jury-portal/src/test/formulaFieldSwapBug.test.ts` (13 Tests)
- Bug-Reproduktionen (Naming-Mismatch, positionelles Mapping, Werte-Vertauschung)
- Fix-Verifizierungen (korrektes Mapping, Roundtrip-Tests)

**Datei**: `jury-portal/src/test/formulaFieldSaveFlow.test.ts` (9 Tests)
- `hasFormula`-Erkennung (var_formel vs int_formelid)
- Symbol-zu-Feld-Mapping beim Speichern

### Bestehende Shared Tests

**Datei**: `shared/src/__tests__/formulaUtils.test.ts` (vorhandene buildFieldSymbolsMap-Tests)
- Grundlegendes Mapping mit EW/AW-Ausschluss
- fieldShortName-Matching für lowercase Formeln
- Placeholder für fehlende Symbole

---

## C++ Legacy-Referenz

### Relevante Dateien

| Datei | Zweck |
|-------|-------|
| `capture/resultssheetdialog.cpp` | Jury-Formelberechnung: `calc()` Methode |
| `src/windows/win_eingabe.cpp` | Alternative Jury-Formelberechnung |
| `src/global/result_calc.cpp` | Ergebnisberechnung mit var_formel (Step 2) |
| `masterdata/disciplinefieldmodel.cpp` | EW/AW Tabellenspalten in Disziplinfeldverwaltung |
| `masterdata/disciplinedialog.ui` | UI-Erklärung der Formelzuordnung |

### C++ Kernlogik (resultssheetdialog.cpp)

```cpp
void ResultsSheetDialog::calc() {
    // 1. Formel laden
    auto pFormula = pDiscipline->formula();
    const QString sFormula = pFormula->formula();

    // 2. Variablen extrahieren: "A+B-C" → "A,B,C"
    auto sVars = QString(sFormula)
        .replace(QRegExp("[^A-Z]"), " ")
        .simplified().split(" ").join(",");

    // 3. Werte aus ALLEN Spalten AUSSER der letzten (EW) lesen
    QVector<double> dVars;
    for (int i = 4; i < pe_model->columnCount() - 1; ++i) {
        dVars.append(pe_model->data(...).toDouble());
    }

    // 4. Formel auswerten
    FunctionParser fparser;
    fparser.Parse(sFormula.toStdString(), sVars.toStdString());
    double res = fparser.Eval(dVars.data());

    // 5. Ergebnis in die LETZTE Spalte (EW) schreiben
    pe_model->setData(idx_letzteSpalte, formattedValue);
}
```

### C++ SQL-Filter

```sql
-- Nur Eingabefelder laden (kein EW)
SELECT var_name, rel_leistung
FROM tfx_disziplinen_felder
  LEFT JOIN tfx_jury_results ON ...
WHERE int_disziplinenid = ? 
  AND bol_endwert = 'false' 
  AND bol_enabled = 'true'
ORDER BY int_sortierung
```

---

## Zusammenfassung

```
┌─────────────────────────────────────────────────────────────────┐
│                    Formelberechnung                              │
│                                                                  │
│  Eingabefelder          Formel              Ausgabe              │
│  (bol_endwert=false     "A + B - C"         (bol_endwert=true)  │
│   bol_ausgangswert=false)                                        │
│                                                                  │
│  ┌─────────┐                                                     │
│  │ D-Note  │──→ A ─┐                                            │
│  │ (5.2)   │       │                                            │
│  └─────────┘       │    ┌──────────┐    ┌──────────┐            │
│  ┌─────────┐       ├──→ │  A+B-C   │──→ │ Endwert  │            │
│  │ E-Note  │──→ B ─┤    │  = 12.0  │    │  (EW)    │            │
│  │ (7.8)   │       │    └──────────┘    └──────────┘            │
│  └─────────┘       │                                             │
│  ┌─────────┐       │                                             │
│  │ Abzug   │──→ C ─┘                                            │
│  │ (1.0)   │                                                     │
│  └─────────┘                                                     │
│                                                                  │
│  ┌───────────────┐                                               │
│  │ Ausgangswert  │ ← NICHT in Formel! Nur Anzeige: "(4.5)"     │
│  │ (AW) (4.5)   │                                               │
│  └───────────────┘                                               │
└──────────────────────────────────────────────────────────────────┘
```
