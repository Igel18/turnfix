# Regionen verwalten

## Übersicht

Regionen (Gaue) sind geografische Bereiche innerhalb von Verbänden. Sie dienen der organisatorischen Struktur und können Vereine zugeordnet werden.

## Zugriff

**Navigation**: Stammdaten → Regionen

**URL**: `http://localhost:5173/regions`

## Funktionen

### Region erstellen

1. Klicke auf **"Region hinzufügen"**
2. Fülle das Formular aus:
   - **Name**: Vollständiger Name der Region (z.B. "Gau Nordbaden")
   - **Kürzel**: Abkürzung (z.B. "NB")
   - **Verband**: Zugeordneter Verband (optional)
3. Klicke **"Speichern"**

### Region bearbeiten

1. Klicke auf das **Bearbeiten-Symbol** (Stift) in der Zeile
2. Ändere die gewünschten Felder
3. Klicke **"Speichern"**

### Region löschen

1. Klicke auf das **Löschen-Symbol** (Mülleimer)
2. Bestätige die Sicherheitsabfrage

⚠️ **Hinweis**: Regionen mit zugeordneten Vereinen können nicht gelöscht werden.

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Vollständiger Name der Region |
| **Kürzel** | Abkürzung (max. 10 Zeichen) |
| **Verband** | Zugeordneter Verband (falls vorhanden) |
| **Aktionen** | Bearbeiten, Löschen |

## Filter & Suche

- **Suchfeld**: Filtert nach Name oder Kürzel
- **Verband-Filter**: Zeigt nur Regionen eines bestimmten Verbands
- **Sortierung**: Klick auf Spaltenkopf zum Sortieren

## CSV-Export

Klicke auf **"CSV Export"** um alle Regionen zu exportieren.

**Exportierte Felder**:
- Region ID (int_gaueid)
- Name (var_name)
- Kürzel (var_kuerzel)
- Verbands-ID (int_verbaendeid)
- Verbandsname (verband_name)

## Hierarchie

```
Verband (Association)
└── Region (Gau)
    └── Verein (Club)
```

## Best Practices

✅ **Empfohlen**:
- Verwende eindeutige, verständliche Namen
- Nutze Kürzel für Platzsparende Anzeigen
- Ordne Regionen dem korrekten Verband zu

❌ **Vermeiden**:
- Doppelte Namen innerhalb eines Verbands
- Zu lange Kürzel (max. 5 Zeichen empfohlen)

## Technische Details

**Datenbank-Tabelle**: `tfx_gaue`

**API-Endpunkte**:
- `GET /api/regions` - Alle Regionen abrufen
- `POST /api/regions` - Neue Region erstellen
- `PUT /api/regions/:id` - Region aktualisieren
- `DELETE /api/regions/:id` - Region löschen

## Siehe auch

- [Verbände verwalten](associations.md)
- [Vereine verwalten](clubs.md)
