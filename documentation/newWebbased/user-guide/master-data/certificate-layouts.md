# Urkundenlayouts verwalten

## Übersicht

Urkundenlayouts definieren das Design und die Feldplatzierung für gedruckte Urkunden. Sie können für verschiedene Wettkampftypen angepasst werden.

## Zugriff

**Navigation**: Stammdaten → Urkundenlayouts

**URL**: `http://localhost:5173/certificate-layouts`

## Funktionen

### Layout erstellen

1. Klicke auf **"Layout hinzufügen"**
2. Fülle Basisinformationen aus:
   - **Name**: Layout-Bezeichnung
   - **Typ**: Urkunden-Art (Platzierung, Teilnahme, etc.)
3. Platziere Datenfelder:
   - Ziehe Felder auf die Vorlage
   - Positioniere (X/Y Koordinaten)
   - Definiere Schriftart, Größe, Farbe

### Verfügbare Datenfelder

**Teilnehmer**:
- Name (Vorname, Nachname)
- Geburtsdatum / Alter
- Verein
- Startnummer

**Wettkampf**:
- Event-Name
- Wettkampf-Name
- Disziplin
- Datum

**Ergebnis**:
- Platzierung (1., 2., 3., etc.)
- Note / Punktzahl
- Rang innerhalb Altersklasse

**Sonstiges**:
- Datum (aktuell)
- Ort
- Unterschrift-Felder

## Layout-Editor

**Funktionen**:
- **Vorschau**: Live-Ansicht mit Beispieldaten
- **Raster**: Hilfslinien für Ausrichtung
- **Feldliste**: Alle verfügbaren Felder
- **Eigenschaften**: Schrift, Farbe, Ausrichtung

**Bedienung**:
1. Feld aus Liste auswählen
2. Auf Vorlage klicken
3. Eigenschaften anpassen
4. Speichern

## Papierformat

- **Standard**: A4 Querformat (297 x 210 mm)
- **Alternative**: A5, A4 Hochformat
- Benutzerdefinierte Größen möglich

## Export & Druck

Layouts werden beim **PDF-Export** verwendet:
1. Gehe zu Ergebnisse → Urkunden drucken
2. Wähle Layout
3. Exportiere PDF
4. Drucke aus PDF

## Best Practices

✅ **Empfohlen**:
- Verwende Raster für Ausrichtung
- Teste mit Beispieldaten
- Separate Layouts für verschiedene Platzierungen
- Schriftgröße mind. 12pt für Lesbarkeit

❌ **Vermeiden**:
- Überlappende Felder
- Zu kleine Schriften
- Zu viele Informationen auf einer Urkunde

## Vorlagen

**Vordefinierte Layouts**:
- Standard-Platzierung (1.-3. Platz)
- Teilnahmeurkunde
- Mehrkampf-Urkunde
- Mannschafts-Urkunde

## Technische Details

**Datenbank-Tabelle**: `tfx_urkundenlayouts`

**API**: `/api/certificate-layouts`

**PDF-Generierung**: Server-seitig mit PDFKit

## Siehe auch

- [Urkunden drucken](../certificate-creation.md)
- [PDF-Export](../results/pdf-export.md)
