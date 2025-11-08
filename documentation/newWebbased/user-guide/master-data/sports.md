# Sportarten verwalten

## Übersicht

Sportarten (Sports) sind übergeordnete Kategorien wie "Gerätturnen", "Trampolinturnen" oder "Rhythmische Sportgymnastik". Disziplinen werden Sportarten zugeordnet.

## Zugriff

**Navigation**: Stammdaten → Sportarten

**URL**: `http://localhost:5173/sports`

## Funktionen

### Sportart erstellen

**Felder**:
- **Name**: Bezeichnung der Sportart
- **Kürzel**: Abkürzung
- **Beschreibung**: Optional

### Sportart bearbeiten/löschen

Standard CRUD-Operationen verfügbar.

## Beispiele

- **Gerätturnen** (GT)
- **Trampolinturnen** (TRA)
- **Rhythmische Sportgymnastik** (RSG)
- **Rope Skipping** (RS)

## Hierarchie

```
Sportart (Sport)
└── Disziplin (Discipline)
    └── Disziplinfeld (Discipline Field)
```

## Technische Details

**Datenbank-Tabelle**: `tfx_sportarten`

**API**: `/api/sports`

## Siehe auch

- [Disziplinen verwalten](disciplines.md)
