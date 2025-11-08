# Athleten verwalten

## Übersicht

Athleten (Persons) sind die Turner/innen, die an Wettkämpfen teilnehmen. Sie werden Vereinen zugeordnet und können als Teilnehmer zu Events hinzugefügt werden.

## Zugriff

**Navigation**: Stammdaten → Athleten

**URL**: `http://localhost:5173/persons`

## Funktionen

### Athlet erstellen

**Formular**:
- Vorname
- Nachname
- Geburtsdatum
- Geschlecht (männlich/weiblich)
- Verein
- Lizenznummer (optional)

### Ansichten

- **Tabellenansicht**: Übersichtsliste
- **Kartenansicht**: Detailkarten

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Vor- und Nachname |
| **Geburtsdatum** | Geburtsdatum (Alter wird berechnet) |
| **Geschlecht** | männlich/weiblich |
| **Verein** | Zugeordneter Verein |
| **Lizenz** | Lizenznummer (falls vorhanden) |

## Filter

- Nach Verein
- Nach Geschlecht
- Nach Altersklasse
- Suchfeld: Name

## GymNet Import

Athleten können über **GymNet XML-Import** importiert werden:
- Geht zu Events → GymNet Import
- Athleten werden automatisch angelegt

## Best Practices

✅ **Empfohlen**:
- Korrekte Geburtsdaten (wichtig für Altersklassen)
- Vereinszuordnung immer pflegen
- Eindeutige Lizenznummern

❌ **Vermeiden**:
- Doppelte Athleten (vor Import prüfen)
- Fehlende Geburtsdaten

## Technische Details

**Datenbank-Tabelle**: `tfx_personen`

**API**: `/api/persons`

## Siehe auch

- [Teilnehmer verwalten](../participant-management.md)
- [GymNet Import](../workflows/gymnet-import.md)
