# Wettkampforte verwalten

## Übersicht

Wettkampforte (Locations) definieren die Austragungsorte von Veranstaltungen. Jeder Ort kann mehrere Hallen oder Bereiche haben.

## Zugriff

**Navigation**: Stammdaten → Wettkampforte

**URL**: `http://localhost:5173/locations`

## Funktionen

### Wettkampfort erstellen

1. Klicke auf **"Wettkampfort hinzufügen"**
2. Fülle das Formular aus:
   - **Name**: Name der Location (z.B. "Sporthalle Mitte")
   - **Adresse**: Straße und Hausnummer
   - **PLZ**: Postleitzahl
   - **Ort**: Stadt/Gemeinde
   - **Land**: Land (optional)
3. Klicke **"Speichern"**

### Location bearbeiten

1. Klicke auf **Bearbeiten-Symbol**
2. Ändere die Felder
3. Speichere

### Location löschen

1. Klicke auf **Löschen-Symbol**
2. Bestätige

⚠️ **Hinweis**: Locations mit zugeordneten Events können nicht gelöscht werden.

## Tabellenspalten

| Spalte | Beschreibung |
|--------|--------------|
| **Name** | Name der Location |
| **Adresse** | Vollständige Adresse |
| **Ort** | Stadt/Gemeinde |
| **PLZ** | Postleitzahl |
| **Aktionen** | Bearbeiten, Löschen |

## Filter & Suche

- **Suchfeld**: Name, Adresse oder Ort
- **Ort-Filter**: Gruppierung nach Stadt
- **Sortierung**: Nach Name oder Ort

## CSV-Export

Exportiert alle Locations mit vollständigen Adressdaten.

## Best Practices

✅ **Empfohlen**:
- Vollständige Adressen für Navigation
- Eindeutige Namen
- Korrekte PLZ für Zuordnung

## Technische Details

**Datenbank-Tabelle**: `tfx_wettkampforte`

**API-Endpunkte**:
- `GET /api/locations`
- `POST /api/locations`
- `PUT /api/locations/:id`
- `DELETE /api/locations/:id`

## Siehe auch

- [Events erstellen](../event-management/create-event.md)
