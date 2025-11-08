# Verbände verwalten

## Übersicht

Verbände (Associations) sind übergeordnete Organisationen, die Regionen und Vereine zusammenfassen. Sie bilden die oberste Ebene der organisatorischen Hierarchie.

## Zugriff

**Navigation**: Stammdaten → Verbände

**URL**: `http://localhost:5173/associations`

## Funktionen

### Verband erstellen

1. Klicke auf **"Verband hinzufügen"**
2. Fülle das Formular aus:
   - **Name**: Vollständiger Name (z.B. "Badischer Turner-Bund")
   - **Kürzel**: Abkürzung (z.B. "BTB")
   - **Land**: Zugeordnetes Land
3. Klicke **"Speichern"**

### Verband bearbeiten

1. Klicke auf das **Bearbeiten-Symbol** (Stift)
2. Ändere die gewünschten Felder
3. Klicke **"Speichern"**

### Verband löschen

1. Klicke auf das **Löschen-Symbol** (Mülleimer)
2. Bestätige die Sicherheitsabfrage

⚠️ **Hinweis**: Verbände mit zugeordneten Regionen oder Vereinen können nicht gelöscht werden.

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Vollständiger Name des Verbands |
| **Kürzel** | Abkürzung (max. 10 Zeichen) |
| **Land** | Zugeordnetes Land |
| **Aktionen** | Bearbeiten, Löschen |

## Filter & Suche

- **Suchfeld**: Filtert nach Name oder Kürzel
- **Land-Filter**: Zeigt nur Verbände eines bestimmten Landes
- **Sortierung**: Klick auf Spaltenkopf zum Sortieren

## CSV-Export

Klicke auf **"CSV Export"** um alle Verbände zu exportieren.

## Hierarchie

```
Land (Country)
└── Verband (Association)
    ├── Region (Gau)
    └── Verein (Club)
```

## Beispiele deutscher Verbände

- **BTB** - Badischer Turner-Bund
- **STB** - Schwäbischer Turnerbund
- **DTB** - Deutscher Turner-Bund

## Technische Details

**Datenbank-Tabelle**: `tfx_verbaende`

**API-Endpunkte**:
- `GET /api/associations` - Alle Verbände abrufen
- `POST /api/associations` - Neuen Verband erstellen
- `PUT /api/associations/:id` - Verband aktualisieren
- `DELETE /api/associations/:id` - Verband löschen

## Siehe auch

- [Regionen verwalten](regions.md)
- [Vereine verwalten](clubs.md)
