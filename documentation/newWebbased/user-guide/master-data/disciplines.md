# Disziplinen verwalten

## Übersicht

Disziplinen sind die einzelnen Wettkampfgeräte oder Übungsformen (z.B. Boden, Reck, Sprung). Sie werden Sportarten zugeordnet und definieren, welche Übungen geturnt werden können.

## Zugriff

**Navigation**: Stammdaten → Disziplinen

**URL**: `http://localhost:5173/disciplines`

## Funktionen

### Disziplin erstellen

**Formular**:
- **Name**: Bezeichnung (z.B. "Boden", "Reck")
- **Sportart**: Übergeordnete Sportart
- **Geschlecht**: Für welches Geschlecht verfügbar
  - Nur männlich
  - Nur weiblich  
  - Beide
- **Icon**: Optionales Symbol
- **Reihenfolge**: Sortierung

### Disziplin bearbeiten

1. Klicke auf **Bearbeiten**
2. Ändere Felder (Name, Geschlecht, Icon, etc.)
3. Speichere

### Geschlechterzuordnung

Wichtig für GymNet-Import und Wettkampf-Zuordnung:
- **Männlich**: Nur für männliche Turner
- **Weiblich**: Nur für weibliche Turnerinnen
- **Beide**: Gemischte Disziplinen (z.B. Minitrampolin)

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Disziplinname |
| **Sportart** | Zugeordnete Sportart |
| **Geschlecht** | m/w/beide |
| **Icon** | Symbol (falls vorhanden) |
| **Aktionen** | Bearbeiten, Löschen |

## Filter

- Nach Sportart
- Nach Geschlecht
- Suchfeld

## Beispiele

**Gerätturnen Männer**:
- Boden
- Pferd
- Ringe
- Sprung
- Barren
- Reck

**Gerätturnen Frauen**:
- Sprung
- Stufenbarren
- Schwebebalken
- Boden

## GymNet Mapping

Bei GymNet-Import werden Disziplinen über `int_gymnetid` gemappt:
- 200 = Boden (m)
- 210 = Pferd (m)
- 290 = Boden (w)
- etc.

Siehe [GymNet Import](../event-competition-management.md#gymnet-xml-import) für Details.

## Technische Details

**Datenbank-Tabelle**: `tfx_disziplinen`

**API**: `/api/disciplines`

**Wichtige Felder**:
- `int_disziplinenid` - Primärschlüssel
- `var_name` - Name
- `bol_m` - Männlich erlaubt
- `bol_w` - Weiblich erlaubt
- `int_gymnetid` - GymNet Mapping

## Siehe auch

- [Disziplinfelder verwalten](discipline-fields.md)
- [Wettkämpfe konfigurieren](../event-management/competitions.md)
