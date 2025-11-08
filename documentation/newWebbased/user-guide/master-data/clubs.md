# Vereine verwalten

## Übersicht

Vereine (Clubs) sind die Organisationen, die Athleten zu Wettkämpfen entsenden. Vereine können Regionen und Verbänden zugeordnet werden.

## Zugriff

**Navigation**: Stammdaten → Vereine

**URL**: `http://localhost:5173/clubs`

## Funktionen

### Verein erstellen

1. Klicke auf **"Verein hinzufügen"**
2. Fülle das Formular aus:
   - **Name**: Vollständiger Vereinsname
   - **Kürzel**: Abkürzung (z.B. "TSV")
   - **Region**: Zugeordnete Region (optional)
   - **Verband**: Zugeordneter Verband (optional)
3. Klicke **"Speichern"**

### Ansichten

- **Tabellenansicht**: Liste aller Vereine
- **Kartenansicht**: Kacheln mit Vereinsdetails
- Wechsel über Button oben rechts

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Vollständiger Vereinsname |
| **Kürzel** | Abkürzung |
| **Region** | Zugeordnete Region |
| **Verband** | Zugeordneter Verband |
| **Aktionen** | Bearbeiten, Löschen |

## Filter & Suche

- **Suchfeld**: Filtert nach Name oder Kürzel
- **Region-Filter**: Nur Vereine einer Region
- **Verband-Filter**: Nur Vereine eines Verbands

## CSV-Export

Exportiert alle Vereinsdaten inkl. Zuordnungen.

## Best Practices

✅ **Empfohlen**:
- Vollständige Vereinsnamen verwenden
- Eindeutige Kürzel (3-5 Zeichen)
- Korrekte Regional-Zuordnung

## Technische Details

**Datenbank-Tabelle**: `tfx_vereine`

**API-Endpunkte**:
- `GET /api/clubs` - Alle Vereine
- `POST /api/clubs` - Verein erstellen
- `PUT /api/clubs/:id` - Aktualisieren
- `DELETE /api/clubs/:id` - Löschen

## Siehe auch

- [Athleten verwalten](athletes.md)
- [Regionen verwalten](regions.md)
