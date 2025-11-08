# Status verwalten

## Übersicht

Status-Einträge definieren die verschiedenen Zustände von Wettkämpfen, Teilnehmern oder Wertungen (z.B. "Aktiv", "Abgeschlossen", "Disqualifiziert").

## Zugriff

**URL**: `http://localhost:5173/status`

## Funktionen

### Status erstellen

**Formular**:
- **Name**: Statusbezeichnung
- **Typ**: Anwendungsbereich (Wettkampf, Teilnehmer, Wertung)
- **Farbe**: Farbcode für UI (optional)
- **Icon**: Symbol (optional)

## Beispiele

**Wettkampf-Status**:
- Geplant
- Läuft
- Abgeschlossen
- Abgebrochen

**Teilnehmer-Status**:
- Gemeldet
- Gestartet
- Beendet
- Disqualifiziert
- Nicht erschienen (DNS)

**Wertungs-Status**:
- Ausstehend
- Erfasst
- Bestätigt
- Korrigiert

## Verwendung

Status werden automatisch in verschiedenen Bereichen verwendet:
- **Competition Status Management**: Wettkampf-Fortschritt
- **Squad Status Management**: Riegen-Status
- **Score Capture**: Wertungs-Status

## Technische Details

**Datenbank-Tabelle**: `tfx_status`

**API**: `/api/status`

## Siehe auch

- [Wettkampfstatus verwalten](../results/competition-status.md)
- [Riegen verwalten](../event-management/squads.md)
