# Disziplinfelder verwalten

## Übersicht

Disziplinfelder definieren die Wertungskomponenten einer Disziplin (z.B. E-Note, D-Note, Abzüge). Sie bestimmen, welche Noten erfasst werden müssen.

## Zugriff

**URL**: `http://localhost:5173/discipline-fields`

## Funktionen

### Feld erstellen

**Formular**:
- **Name**: Feldbezeichnung (z.B. "E-Note", "D-Note")
- **Disziplin**: Zugeordnete Disziplin
- **Typ**: Eingabetyp (Dezimalzahl, Ganzzahl, etc.)
- **Min/Max**: Wertebereich
- **Formel**: Berechnungsformel (optional)

## Beispiele

**Gerätturnen (E/D-System)**:
- E-Note (Execution): 0.0 - 10.0
- D-Note (Difficulty): 0.0 - unbegrenzt
- Abzüge: 0.0 - 10.0
- **Gesamtnote** = E + D - Abzüge

**Gerätturnen (Gesamtnote)**:
- Gesamtnote: 0.0 - 20.0 (direkte Eingabe)

## Feldtypen

- **Dezimalzahl**: Für Noten (0.0 - 20.0)
- **Ganzzahl**: Für Punkte
- **Berechnet**: Aus anderen Feldern

## Formeln

Felder können über Formeln automatisch berechnet werden:
```
E_NOTE + D_NOTE - ABZUEGE
```

Siehe [Formeln verwalten](formulas.md).

## Technische Details

**Datenbank-Tabelle**: `tfx_disziplinfelder`

**API**: `/api/discipline-fields`

## Siehe auch

- [Disziplinen verwalten](disciplines.md)
- [Formeln verwalten](formulas.md)
- [Score Capture](../score-capture.md)
