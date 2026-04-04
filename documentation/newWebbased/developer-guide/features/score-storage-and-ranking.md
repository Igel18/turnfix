# Score Storage & Ranking — Altes vs. neues System

> **Zielgruppe:** Entwickler, die verstehen wollen wie Wertungen gespeichert, berechnet und für die Platzierung genutzt werden.  
> **Stand:** April 2026 (nach Fix #89)

---

## 1. Vergleich Alt vs. Neu (Übersicht)

| Schritt | Altes System (Qt/C++) | Neues Web-System |
|---------|----------------------|------------------|
| **Score eingeben** | `ResultsSheetDialog` — Felder + Endwert in einer Tabelle | Score Capture Seite — einfaches Feld ODER Jury-Felder (D-Note, E1, …) |
| **Einzelwertungen speichern** | `JuryScoreRepository` → `tfx_jury_results` | `POST /jury-results/save-field-score` → `tfx_jury_results` |
| **Endwert berechnen** | Manuell durch Benutzer eingetippt (oder Qt-Logik) | Automatisch via Formel nach jedem Feld-Save |
| **Endwert speichern** | `ScoreDetailsRepository` → `tfx_wertungen_details.rel_leistung` | `ScoreSynchronizer.updateWertungsDetailsScore()` → `tfx_wertungen_details.rel_leistung` |
| **Was bestimmt den Rang?** | `tfx_wertungen_details.rel_leistung` (Summe aller Disziplinen) | Dieselbe Spalte — Legacy-kompatibel |
| **Built-in-Formel anwenden** | In `result_calc.cpp` bei Ausgabe (`applyBuiltInFormula`) | Beim Laden des Ergebnisses in der UI (`applyBuiltInFormula`) |
| **Rang persistent gespeichert?** | Nein — immer on-the-fly berechnet | Nein — immer on-the-fly berechnet |
| **Live-Updates** | Nicht vorhanden | Socket.IO Event `score-updated` nach jedem Final-Score-Save |
| **Einzelwertungen sichtbar in Ergebnissen?** | Nein — nur in "Leistung erfassen" | Nein — nur in Score Capture |
| **Fehlerfall ohne `wertungen_details`-Zeile** | JOIN liefert NULL → kein Ergebnis | `ensureWertungsDetailsEntry()` erstellt vorab NULL-Placeholder |

---

## 2. Datenbankstruktur (gemeinsam — Legacy-Schema bleibt unverändert)

```
tfx_wertungen              ← Kopf-Datensatz: 1 Zeile pro Teilnehmer × Wettkampf
  int_wertungenid          (PK)
  int_wettkaempfeid        → tfx_wettkaempfe  (Wettkampf)
  int_teilnehmerid         → tfx_teilnehmer   (Teilnehmer)
  int_statusid, var_riege, int_startnummer, int_runde, …

tfx_wertungen_details      ← Ergebnis-Score: 1 Zeile pro Wertung × Disziplin × Versuch × KP
  int_wertungen_detailsid  (PK)
  int_wertungenid          → tfx_wertungen
  int_disziplinenid        → tfx_disziplinen
  rel_leistung             ← FINALSCORE (dieser Wert ALLEIN bestimmt Platzierung!)
  int_versuch              (Versuch-Nr., Standard 1)
  int_kp                   (0=Pflicht, 1=Kür)

tfx_jury_results           ← Einzelwertungen der Kampfrichter (NEU in Web-System)
  int_juryresultsid        (PK)
  int_wertungenid          → tfx_wertungen
  int_disziplinen_felderid → tfx_disziplinen_felder  (Felddef: D-Note, E-Note, …)
  rel_leistung             ← Wert dieses einen Feldes
  int_versuch, int_kp

tfx_disziplinen_felder     ← Felddefinitionen pro Disziplin
  bol_endwert              = true  → dieses Feld IST der Finalwert (muss in wertungen_details)
  bol_ausgangswert         = true  → Ausgangspunkt (z.B. D-Note beim Turnen)
  bol_enabled              = true/false
  int_sortierung           ← Anzeigereihenfolge

tfx_disziplinen            ← Disziplinkonfiguration
  var_formel               ← Built-in-Formel (wird zur ANZEIGE-/RANKINGZEIT angewendet, nicht beim Speichern)
  int_formelid             → tfx_formeln  (verknüpfte Formelvorlage für Berechnungen beim Speichern)

tfx_formeln                ← Formelvorlagen
  var_formel               ← Formel-Ausdruck, z.B. "A+B-C" oder "1*x"
```

---

## 3. Die Formel — eine pro Disziplin, konsequent überall

> **Kurze Antwort auf die wichtigste Frage:** Eine Disziplin hat ENTWEDER eine Built-in-Formel ODER eine Berechnungsformel. Welche aktiv ist, erkennst du daran ob Jury-Felder (`tfx_disziplinen_felder`) vorhanden sind. Diese eine aktive Formel wird IMMER und ÜBERALL verwendet — beim Speichern, bei der Anzeige und beim Ranking.

### Typ 1: Built-in-Formel (`tfx_disziplinen.var_formel`, Kleinbuchstaben-Variable)

**Erkennungszeichen:** Formel enthält Kleinbuchstaben-Variable (`x`), z.B. `1*x`, `20-x`, `x/2,5`. **Keine** Jury-Felder in `tfx_disziplinen_felder`.

```
Benutzer gibt einen einzigen Wert ein (z.B. Zeit in Sekunden): x = 12,5
→ Gespeichert in tfx_wertungen_details.rel_leistung = 12,5   (der ROHWERT)
→ Formel "20-x" wird beim Laden/Anzeigen angewendet: 20 - 12,5 = 7,5
→ Ranking basiert auf dem angezeigten Wert 7,5 (nicht dem gespeicherten 12,5)
```

**Warum den Rohwert speichern?** Weil die Formel retroaktiv geändert werden kann (z.B. Zeitdisziplin mit neuem Maximalwert). Der gespeicherte Rohwert bleibt korrekt, nur die Anzeigeformel ändert sich.

### Typ 2: Berechnungsformel (verknüpft über `int_formelid` → `tfx_formeln`, Großbuchstaben-Variablen)

**Erkennungszeichen:** Disziplin hat Jury-Felder (`tfx_disziplinen_felder`). Formel enthält Großbuchstaben-Variablen (`A`, `B`, `D`, `E1`). `int_formelid` zeigt auf `tfx_formeln`.

```
Benutzer gibt mehrere Felder ein:
  D = 5,0   E1 = 8,2   E2 = 8,0   Abzug = 0,3
→ Jedes Feld wird in tfx_jury_results gespeichert
→ Nach jedem Feld wird die Formel ausgewertet (wenn alle Felder vorhanden):
  "D + (E1+E2)/2 - Abzug" = 5,0 + 8,1 - 0,3 = 12,8
→ Gespeichert in tfx_wertungen_details.rel_leistung = 12,8  (das ERGEBNIS)
→ var_formel ist bei solchen Disziplinen typischerweise "1*x" (keine weitere Transformation)
→ Ranking basiert auf dem gespeicherten Wert 12,8
```

### Entscheidungsregel im Code

```typescript
// jury-portal: builtInFormulaHelper.ts
function isBuiltInFormula(formula, disciplineFieldCount) {
  if (disciplineFieldCount > 0) return false;  // Jury-Felder vorhanden → Typ 2
  return /[a-z]/.test(formula);                // Kleinbuchstabe → Typ 1
}

// Was wird in rel_leistung gespeichert?
function getScoreToSave(calculatedScore, fieldValues, formula, fieldCount) {
  if (isBuiltInFormula(formula, fieldCount)) {
    return fieldValues['x'];     // Typ 1: Rohwert speichern
  }
  return calculatedScore;         // Typ 2: Berechnetes Ergebnis speichern
}
```

### Zusammenfassung: Wann welche Formel aktiv ist

| | Typ 1: Built-in | Typ 2: Berechnung |
|---|---|---|
| **Formel-Quelle** | `tfx_disziplinen.var_formel` | `tfx_formeln.var_formel` (via `int_formelid`) |
| **Variablen** | Kleinbuchstaben (`x`) | Großbuchstaben (`A`, `B`, `D`, `E1`) |
| **Jury-Felder** | Keine | Ja (`tfx_disziplinen_felder`) |
| **Was wird gespeichert** | Rohwert (Eingabe direkt) | Formel-Ergebnis |
| **Wann angewendet** | Beim Anzeigen/Ranking | Beim Speichern (nach jedem Feld-Save) |
| **Typische Disziplinen** | Zeitdisziplinen, Geräteturnen (einfach) | Geräteturnen mit D/E-Note, Trampolinturnen |

> **Wichtig für neue Endpunkte:** Wenn du einen neuen Score-Endpunkt schreibst, prüfe immer `isBuiltInFormula()`. Für Typ 1: speichere den Rohwert. Für Typ 2: werte die Formel aus und speichere das Ergebnis. Beide Typen müssen dann in `tfx_wertungen_details.rel_leistung` landen — das ist der einzige Wert der für das Ranking zählt.

---

## 4. Altes System (Qt/C++) — Score-Flow

### Schritt 1: Wertung erfassen (`ResultsSheetDialog` / `ResultsSheetTableModel`)

```
Benutzer gibt ein:
  ┌─────────────────────────────────────────────────────────────┐
  │  Spalten 1..n  = Einzelwertungen (D-Note, E1, E2, Abzug)  │
  │  Letzte Spalte = Endwert (manuell berechnet / eingetragen)  │
  └─────────────────────────────────────────────────────────────┘

Speichern:
  Einzelwertungen  → tfx_jury_results       (via JuryScoreRepository)
  Endwert          → tfx_wertungen_details  (via ScoreDetailsRepository)
                     └─ rel_leistung = manuell eingegebener/berechneter Gesamtwert
```

### Schritt 2: Ergebnisse anzeigen (`ResultsWidget` → `Result_Calc::resultArrayNew()`)

```sql
-- Kernabfrage in result_calc.cpp:
SELECT
  tfx_wertungen.int_wertungenid,
  tfx_wettkaempfe_x_disziplinen.int_disziplinenid,
  max(tfx_wertungen_details.rel_leistung),   -- ← aggregierter Score pro Disziplin
  max(jr.rel_leistung),                       -- ← Ausgangswert (optional in Klammern angezeigt)
  tfx_wertungen_details.int_kp
FROM tfx_wertungen
  INNER JOIN ...
  LEFT JOIN tfx_wertungen_details ON int_wertungenid = ...
  LEFT JOIN tfx_jury_results jr ON ... bol_ausgangswert='true' ...
WHERE int_wettkaempfeid = ? AND int_runde = ?
GROUP BY ... ORDER BY ...
```

**Ergebniszeile pro Teilnehmer (resultArrayNew-Output):**

Das Ergebnis ist eine `QStringList` pro Teilnehmer. Die Berechnung in `result_calc.cpp` iteriert über alle Disziplinen und fügt für jede Disziplin eine eigene Spalte hinzu:

```cpp
for (int i = 0; i < disrows.size(); i++) {
    double dres = wertungen[wertungId][disziplinId][kp];  // ← tfx_wertungen_details.rel_leistung
    // Built-in-Formel anwenden: var_formel mit Variable "x"
    fparser.Parse(var_formel, "x");
    double calc = fparser.Eval({dres});  // z.B. 20 - 12.5 = 7.5
    QString resString = QString::number(calc, 'f', precision);
    if (printAW) {
        // Optional: Ausgangswert in Klammern anhängen (z.B. "7.5 (12.5)")
        // Ausgangswert = das Jury-Feld mit bol_ausgangswert='true'
        resString += " (" + QString::number(ausgang, 'f', precision) + ")";
    }
    tnlist << resString;   // ← JE EINE SPALTE PRO DISZIPLIN
}
tnlist << QString::number(sum, 'f', 3);   // ← Gesamtergebnis (letzte Spalte)
```

Das bedeutet: **Jede Disziplin hat ihre eigene Spalte in der Ergebnisansicht.** Ein 6-Gerät-Wettkampf hat 6 Einzelwertungsspalten + 1 Gesamtspalte.

`ResultsTableModel` kennt zwei Modi:
- `details = true` → zeigt alle Spalten (Platz, Name, Verein, Jg., **Disziplin 1, Disziplin 2, ...,** Gesamt)
- `details = false` → zeigt nur 4–5 Spalten (Platz, Name, Verein, Jg./Team, Gesamt)

> **Hinweis zum Ausgangswert:** Der optionale Wert in Klammern (`printAW=true`) kommt aus `tfx_jury_results WHERE bol_ausgangswert='true'` — das ist *ein einzelnes* designiertes Jury-Feld pro Disziplin (z.B. die D-Note als Referenzpunkt), nicht alle Einzelfelder. Die übrigen Jury-Felder (E1, E2, Abzug) sind in dieser Ansicht nicht sichtbar — sie stecken bereits im aggregierten `rel_leistung`-Wert.

**Platzierungsberechnung (altes System):**
- Pro Teilnehmer wird `var_formel(rel_leistung)` je Disziplin berechnet und summiert
- Optional werden die niedrigsten Scores als Streichwertung abgezogen (`bol_streichwertung=true`)
- Sortierung: absteigend (höherer Score = bessere Platzierung), außer bei Zeitdisziplinen (`bol_sortasc=true`)
- Die Platzierung wird **NICHT** persistent gespeichert — sie wird bei jeder Anzeige neu berechnet

---

## 5. Neues System (Web) — Score-Flow

### Pfad A: Einfache Wertungserfassung (kein Jury-Modus)

```
POST /api/scores/save-value
  { participantId, disciplineId, score }

→ ScoreSynchronizer.updateWertungsDetailsScore()
    → INSERT/UPDATE tfx_wertungen_details  (rel_leistung = übergebener score)
    → kein Eintrag in tfx_jury_results
```

### Pfad B: Jury-Wertungserfassung (mit Einzelfeldern)

```
POST /api/jury-results/save-field-score  (z.B. D-Note, E-Note einzeln)
  { participantId, disciplineFieldId, performance, eventId, competitionId }

Schritt 1: ScoreSynchronizer.ensureWertungsDetailsEntry()
    → stellt sicher dass Eintrag in tfx_wertungen_details existiert (NULL-Placeholder)

Schritt 2: INSERT/UPDATE tfx_jury_results
    → rel_leistung = Wert für dieses eine Feld

Schritt 3: Formelberechnung (FIX #89)
    a) Falls Feld ist bol_endwert=true:
       → updateWertungsDetailsScore(wertungenId, disciplineId, performance)
    b) Falls Feld ist ein Eingabefeld:
       → Formel aus tfx_formeln (via int_formelid) laden
       → Alle bereits gespeicherten jury_results für diese Kombination laden
       → Formel auswerten (z.B. "D + (E1+E2+E3-Δ)/3")
       → Falls Ergebnis vollständig (alle Felder vorhanden):
          updateWertungsDetailsScore(wertungenId, disciplineId, calculatedScore)
       → Falls Felder noch unvollständig: tfx_wertungen_details bleibt vorerst NULL

Schritt 4: Socket.IO emit 'score-updated' (nur beim finalen Wert)
```

### Pfad C: Jury-Portal (eigenständige App auf Port 3002)

```
POST /api/jury-results  (direkt, ohne save-field-score)
  → gleiche Logik wie Pfad B, Schritt 2–4

PUT  /api/jury-results/:id
  → Update eines bestehenden jury_results-Eintrags
  → Falls Feld bol_endwert=true:
     ScoreSynchronizer.updateWertungsDetailsScore()  (FIX #89: statt plain UPDATE)
```

### Pfad D: Gruppen-Scores

```
PUT /api/group-scores/:id
  → DELETE + INSERT in tfx_wertungen_details (kein Jury-Feld-System)
  → direkt rel_leistung setzen
```

---

## 6. Was bestimmt die Platzierung?

```
tfx_wertungen_details.rel_leistung  (je Disziplin)
         ↓  (summiert über alle Disziplinen des Wettkampfs)
    Rohsumme
         ↓  (optional: Built-in-Formel var_formel angewendet)
    Anzeigewert / Sortierwert
         ↓  (absteigend sortiert, bei gleichen Werten: ties)
    Platzierung (wird NICHT gespeichert, immer on-the-fly berechnet)
```

**Neue Platzierungsabfrage (Web-System):**

```sql
-- aus analyzer.ts (Referenzimplementierung)
SELECT w.int_wertungenid, SUM(wd.rel_leistung) as total
FROM tfx_wertungen w
LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
WHERE w.int_wettkaempfeid = ?
GROUP BY w.int_wertungenid
ORDER BY SUM(wd.rel_leistung) DESC
```

---

## 7. ScoreSynchronizer (Kompatibilitäts-Brücke)

Der `ScoreSynchronizer` (`server/src/utils/scoreSynchronizer.ts`) ist die zentrale Klasse für die Rückwärtskompatibilität:

| Methode | Zweck |
|---------|-------|
| `ensureWertungsDetailsEntry(wertungenId, disciplineId, attempt, kp)` | Erstellt einen NULL-Platzhalter in `tfx_wertungen_details` falls noch keiner existiert. Notwendig damit JOIN-Abfragen des alten Systems keine leere Menge zurückgeben. |
| `updateWertungsDetailsScore(wertungenId, disciplineId, score, attempt, kp)` | UPSERT: Insert falls kein Eintrag, Update falls vorhanden. Bereinigt doppelte Einträge. Wird immer dann aufgerufen wenn ein Finalwert bekannt ist. |

Beide Methoden nutzen `pg_advisory_xact_lock` um Race Conditions bei gleichzeitigen Jury-Eingaben zu vermeiden.

---

## 8. Warum zeigte das alte System keine Ergebnisse? (Bug #89)

**Ursache:**
- `POST /save-field-score` rief nur `ensureWertungsDetailsEntry` auf → `rel_leistung = NULL`
- Die Formelergebnis-Berechnung und das anschließende `updateWertungsDetailsScore()` fehlten
- Das alte Qt-System liest `tfx_wertungen_details.rel_leistung` für Ergebnisse → sah immer NULL
- In "Leistung erfassen" waren die Werte *sichtbar* (weil das alte System dort `tfx_jury_results` direkt liest), aber in den Ergebnis-Tabellen fehlten sie

**Fix:**
- Nach dem Speichern jedes Jury-Feldes wird nun die Formel ausgewertet und `rel_leistung` geschrieben
- Gleiches UPSERT-Schema in allen drei Score-Endpunkten (`save-field-score`, `PUT /jury-results/:id`, `save-value`)

---

## 9. Vollständiger Pfad — Beispiel Geräteturnen (D-Note + E1 + E2 + Abzug)

```
Disziplin: Boden
Formelvorlage (tfx_formeln.var_formel): "D + (E1+E2)/2 - Abzug"
Built-in (tfx_disziplinen.var_formel):  "1*x"  (keine Transformation)

Benutzer gibt ein:
  D-Note = 5.0  → POST /save-field-score  → tfx_jury_results (D)
                   Formel noch unvollständig → rel_leistung bleibt NULL
  E1     = 8.2  → POST /save-field-score  → tfx_jury_results (E1)
                   Formel noch unvollständig → rel_leistung bleibt NULL
  E2     = 8.0  → POST /save-field-score  → tfx_jury_results (E2)
                   Formel noch unvollständig → rel_leistung bleibt NULL
  Abzug  = 0.3  → POST /save-field-score  → tfx_jury_results (Abzug)
                   Alle Felder vorhanden!
                   Berechnung: 5.0 + (8.2+8.0)/2 - 0.3 = 12.8
                   → updateWertungsDetailsScore(wertungenId, disciplineId, 12.8)
                   → tfx_wertungen_details.rel_leistung = 12.8  ✅

Platzierungsabfrage:
  SELECT SUM(wd.rel_leistung) ...  → 12.8
  Built-in 1*x → 12.8
  Rang: sortiert nach Gesamtsumme aller Disziplinen
```

---

## 10. Referenzdateien

| Datei | Inhalt |
|-------|--------|
| `server/src/utils/scoreSynchronizer.ts` | UPSERT-Logik für tfx_wertungen_details |
| `server/src/routes/juryResultsScoring.ts` | `POST /` und `POST /save-field-score` |
| `server/src/routes/juryResults.ts` | `PUT /:id` Jury-Result Update |
| `server/src/routes/scoresScoring.ts` | `POST /save-value` (einfacher Score) |
| `server/src/utils/formulaUtils.ts` | `calculateFormula`, `buildFieldSymbolsMap` |
| `server/src/routes/results.ts` | Rankings-Endpunkt (Web) |
| `src/global/src/result_calc.cpp` | Ranking-Berechnung altes Qt-System |
| `capture/resultssheettablemodel.cpp` | Score-Erfassung altes Qt-System |
| `server/tests/unit/scoreSynchronizer.test.ts` | Unit-Tests für ScoreSynchronizer |
| `client/src/test/hooks/useScoreActions.test.ts` | Unit-Tests für Score-Speicherpfade |
