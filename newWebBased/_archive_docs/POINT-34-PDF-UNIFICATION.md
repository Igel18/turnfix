# Point 34: PDF-Export Vereinheitlichung

## Ziel
Alle Druck- und Export-Funktionen sollen einen einheitlichen, professionellen Look haben.

## Betroffene PDFs:
1. **Meldematrix** (`Meldematrix.tsx`) - ✅ Migriert (getUnifiedTableStyles + addPDFHeaderFooter)
2. **Ergebnisliste** (`Results.tsx`) - ✅ **Migriert** (Alle 3 Export-Funktionen migriert)
3. **Medallienspiegel** (`Medallienspiegel.tsx`) - ✅ Migriert (getUnifiedTableStyles + addSectionTitle + Medal-Farben)
4. **Riegenliste** (Squad Management) - ⏳ Noch zu migrieren
5. **Event Participants List** (`EventParticipants.tsx`) - ✅ Migriert (didDrawPage)
6. **Event Management List** (`EventManagement.tsx`) - ✅ Migriert (checkPageBreak)

## Anforderungen:

### A) Einheitliches Design
- ✅ Gleiche Schriftart und -größen für identische Elemente
- ✅ Einheitliche Kopf- und Fußzeilen (gleiche Höhe)
- ✅ Gleicher Inhalt in Kopf- und Fußzeile

### B) Professionelle Darstellung
- ✅ Hervorhebungen für bessere Lesbarkeit
- ✅ Klare Abtrennungen
- ✅ Konsistente Abstände und Margins

### C) Lokalisierung
- ✅ Alle Texte lokalisiert (DE/EN)
- ✅ Datumsformate lokalisiert

## Implementierung:

### 1. Erweiterte `pdfUtils.ts`

Neue einheitliche PDF-Konfiguration:

```typescript
// Einheitliche PDF-Konfiguration
export const PDF_CONFIG = {
  fonts: {
    title: { size: 16, style: 'bold' as const },
    subtitle: { size: 14, style: 'bold' as const },
    header: { size: 12, style: 'bold' as const },
    body: { size: 10, style: 'normal' as const },
    small: { size: 8, style: 'normal' as const }
  },
  colors: {
    primary: [0, 102, 204] as [number, number, number],      // Blau
    secondary: [100, 100, 100] as [number, number, number],  // Grau
    success: [76, 175, 80] as [number, number, number],      // Grün
    warning: [255, 152, 0] as [number, number, number],      // Orange
    error: [244, 67, 54] as [number, number, number],        // Rot
    text: [0, 0, 0] as [number, number, number],             // Schwarz
    background: [245, 245, 245] as [number, number, number]  // Hellgrau
  },
  margins: {
    page: 10,
    header: 32,
    footer: 25,
    table: 5
  },
  spacing: {
    line: 5,
    section: 10,
    paragraph: 7
  }
}
```

### 2. Einheitliche Header/Footer-Funktion

Bereits vorhanden in `pdfUtils.ts`:
- `addPDFHeaderFooter()` - Fügt Header/Footer hinzu
- `setupPDFWithHeaderFooter()` - Setup für mehrseitige PDFs
- `getContentArea()` - Berechnet verfügbaren Inhaltsbereich

**Header-Inhalt** (Links):
- Event-Name
- Datum (Datumsbereich)
- Ort

**Header-Inhalt** (Rechts):
- Dokumenttitel (z.B. "Meldematrix", "Ergebnisliste")

**Footer-Inhalt** (Links):
- "created with TurnFix"
- GitHub-URL

**Footer-Inhalt** (Mitte):
- Seitenzahl (z.B. "1 / 3")

**Footer-Inhalt** (Rechts):
- Aktuelles Datum/Uhrzeit
- "GNU GPL v3"

### 3. Einheitliche Table-Styles

```typescript
export const getUnifiedTableStyles = () => ({
  headStyles: {
    fillColor: PDF_CONFIG.colors.primary,
    textColor: [255, 255, 255],
    fontSize: PDF_CONFIG.fonts.header.size,
    fontStyle: 'bold',
    halign: 'center',
    valign: 'middle',
    cellPadding: 3
  },
  bodyStyles: {
    fontSize: PDF_CONFIG.fonts.body.size,
    cellPadding: 2,
    minCellHeight: 8
  },
  alternateRowStyles: {
    fillColor: PDF_CONFIG.colors.background
  },
  margin: { top: PDF_CONFIG.margins.header },
  styles: {
    overflow: 'linebreak',
    cellWidth: 'wrap'
  }
})
```

### 4. Migration Plan

#### Phase 0: Basis-Fixes (✅ KOMPLETT)
- [x] pdfUtils.ts: Separator-Linien Farben einheitlich (schwarz)
- [x] pdfUtils.ts: Header-Bereich bereinigen (white background)
- [x] pdfUtils.ts: Footer-Bereich bereinigen (white background)
- [x] pdfUtils.ts: Konsistente Farb-Resets nach Header/Footer
- [x] pdfUtils.ts: Helper-Funktionen für Überschriften & Text
  - addBodyText() - Fließtext mit automatischem Umbruch
  - addLabeledValue() - Beschriftete Werte (Label: Value)
  - resetPDFStyles() - Zurücksetzen aller Styles
- [x] EventParticipants.tsx: didDrawPage für mehrseitige PDFs
- [x] EventParticipants.tsx: getUnifiedTableStyles() für konsistente Tabellen
- [x] EventManagement.tsx: checkPageBreak für automatische Seitenumbrüche
- [x] EventManagement.tsx: Helper-Funktionen für alle Überschriften/Texte

#### Phase 1: Meldematrix ✅ KOMPLETT
- [x] Eigene Header/Footer-Implementierung entfernen
- [x] `addPDFHeaderFooter()` mit didDrawPage verwenden
- [x] `getUnifiedTableStyles()` verwenden
- [x] Vorher: fillColor [240,240,240] grau, fontSize 9
- [x] Nachher: fillColor [0,102,204] primary blau, fontSize 10

#### Phase 2: Medallienspiegel ✅ KOMPLETT
- [x] `addSectionTitle()` für Titel verwenden
- [x] `getUnifiedTableStyles()` verwenden
- [x] Medal-Farben beibehalten (Gold/Silber/Bronze in columnStyles)
- [x] Vorher: fillColor [69,90,100] dunkelgrau, fontSize 11
- [x] Nachher: fillColor [0,102,204] primary blau, fontSize 10 + Medal-Farben

#### Phase 3: Ergebnisliste
- [ ] 3 PDF-Export-Funktionen identifizieren
- [ ] `addPDFHeaderFooter()` einbinden
- [ ] Einheitliche Table-Styles
- [ ] Lokalisierung

#### Phase 4: Riegenliste
- [ ] Manuelle doc.text() Aufrufe durch Helper ersetzen
- [ ] Einheitliches Template

#### Phase 2: Ergebnisliste
- [ ] PDF-Export-Funktionen identifizieren (3 Vorkommen)
- [ ] `setupPDFWithHeaderFooter()` einbinden
- [ ] Einheitliche Table-Styles
- [ ] Lokalisierung

#### Phase 3: Medallienspiegel
- [ ] Existing PDF-Export refactoren
- [ ] Einheitliches Template
- [ ] Farb-Kodierung für Medaillen beibehalten

#### Phase 4: Riegenliste
- [ ] PDF-Export implementieren (falls noch nicht vorhanden)
- [ ] Einheitliches Template

## Testing Checklist:

### Event Participants List ✅
- [x] Header/Footer auf allen Seiten (didDrawPage)
- [x] Tabelle vollständig
- [x] Mehrseitige PDFs funktionieren
- [x] Build erfolgreich

### Event Management List ✅
- [x] Header/Footer auf allen Seiten (checkPageBreak)
- [x] Automatische Seitenumbrüche bei langen Listen
- [x] Event-Details vollständig
- [x] Statistiken lesbar
- [x] Vereine-Breakdown
- [x] Build erfolgreich

### Meldematrix
- [ ] Header zeigt korrekte Event-Daten
- [ ] Footer zeigt Seitenzahl korrekt
- [ ] Tabelle ist vollständig sichtbar
- [ ] Mehrseitige PDFs funktionieren
- [ ] Lokalisierung DE/EN

### Ergebnisliste
- [ ] Header zeigt korrekte Event-Daten
- [ ] Alle Ergebnisse vollständig
- [ ] Platzierungen korrekt
- [ ] Punkte lesbar
- [ ] Lokalisierung DE/EN

### Medallienspiegel
- [ ] Medaillen-Farben (Gold/Silber/Bronze)
- [ ] Sortierung korrekt
- [ ] Vereine vollständig
- [ ] Lokalisierung DE/EN

### Riegenliste
- [ ] Riegen-Zuordnungen korrekt
- [ ] Startnummern lesbar
- [ ] Geräte-Zuordnungen
- [ ] Zeitplan (falls vorhanden)

## Lokalisierung

Neue Translation Keys benötigt:

```typescript
{
  "pdf": {
    "common": {
      "createdWith": "created with TurnFix",
      "page": "Seite",
      "of": "von",
      "license": "GNU GPL v3"
    },
    "meldematrix": {
      "title": "Meldematrix",
      "club": "Verein",
      "competition": "Wk.",
      "total": "Ges."
    },
    "results": {
      "title": "Ergebnisliste",
      "rank": "Platz",
      "participant": "Teilnehmer",
      "score": "Punkte",
      "outOfCompetition": "AK"
    },
    "medals": {
      "title": "Medallienspiegel",
      "club": "Verein",
      "gold": "Gold",
      "silver": "Silber",
      "bronze": "Bronze",
      "total": "Gesamt"
    },
    "squads": {
      "title": "Riegenliste",
      "squad": "Riege",
      "participant": "Teilnehmer",
      "startNumber": "St.Nr.",
      "apparatus": "Gerät"
    }
  }
}
```

## Status

- [x] `pdfUtils.ts` erweitert mit `PDF_CONFIG`
- [x] Einheitliche Table-Styles definiert
- [x] Helper-Funktionen für Überschriften, Text, Beschriftungen
- [x] **Phase 0**: Basis-Fixes (Separator-Farben, Header/Footer-Bereinigung)
- [x] **Event Participants List** migriert (didDrawPage + getUnifiedTableStyles)
- [x] **Event Management List** migriert (checkPageBreak + Helper-Funktionen)
- [ ] Meldematrix migriert
- [ ] Ergebnisliste migriert
- [ ] Medallienspiegel migriert
- [ ] Riegenliste implementiert
- [ ] Testing durchgeführt
- [ ] Dokumentation aktualisiert

## Verwendung der Helper-Funktionen

### Beispiel: EventManagement.tsx

```typescript
// 1. Import der Helper
import { 
  addPDFHeaderFooter, 
  getContentArea,
  PDF_CONFIG,
  addSectionTitle,
  addLabeledValue,
  resetPDFStyles
} from '../utils/pdfUtils';

// 2. Überschriften einheitlich
yPosition = addSectionTitle(doc, 'Event Details', yPosition)
// oder mit Optionen:
yPosition = addSectionTitle(doc, 'Statistik', yPosition, { 
  fontSize: PDF_CONFIG.fonts.header.size 
})

// 3. Beschriftete Werte
yPosition = addLabeledValue(doc, 'Name', eventDetails.name, x, yPosition)
yPosition = addLabeledValue(doc, 'Ort', eventDetails.location, x, yPosition)

// 4. Spacing nutzen
yPosition += PDF_CONFIG.spacing.section

// 5. Styles zurücksetzen
resetPDFStyles(doc)
```

### Beispiel: EventParticipants.tsx (Tabelle)

```typescript
// 1. Import der Helper
import { getUnifiedTableStyles } from '../utils/pdfUtils';

// 2. Unified Table Styles holen
const unifiedStyles = getUnifiedTableStyles()

// 3. In autoTable verwenden
autoTable(doc, {
  head: [[...]],
  body: tableData,
  ...unifiedStyles,  // Einheitliche Styles
  columnStyles: {
    0: { halign: 'center', cellWidth: 10 }  // Custom per Spalte
  }
})
```

## Technische Details

### Zwei Ansätze für mehrseitige PDFs

#### 1. **didDrawPage Callback** (für autoTable)
```typescript
autoTable(doc, {
  // ... table config ...
  didDrawPage: () => {
    addPDFHeaderFooter({
      doc,
      event: selectedEvent,
      documentTitle: 'Document Title',
      pageWidth: 210,
      pageHeight: 297
    })
  }
})
```
- **Verwendet in**: EventParticipants.tsx
- **Vorteil**: Automatisch auf allen Seiten, die autoTable erzeugt
- **Nachteil**: Nur für autoTable-basierte PDFs

#### 2. **checkPageBreak Helper** (für manuelles Content-Rendering)
```typescript
const checkPageBreak = (currentY: number, requiredSpace: number = 20) => {
  if (currentY + requiredSpace > contentArea.endY) {
    doc.addPage();
    addPDFHeaderFooter({
      doc,
      event: eventForPDF,
      documentTitle: t('eventManagement.title'),
      pageWidth,
      pageHeight
    });
    return contentArea.startY;
  }
  return currentY;
};

// Verwendung vor jedem Content-Block
yPosition = checkPageBreak(yPosition, 30);
doc.text('Some content', x, yPosition);
```
- **Verwendet in**: EventManagement.tsx
- **Vorteil**: Volle Kontrolle über Seitenumbrüche
- **Nachteil**: Muss manuell vor jedem Content-Block aufgerufen werden

## Related Files

- `client/src/utils/pdfUtils.ts` - Zentrale PDF-Utilities
- `client/src/pages/Meldematrix.tsx` - Meldematrix mit PDF-Export
- `client/src/pages/Results.tsx` - Ergebnisliste mit PDF-Export
- `client/src/pages/Medallienspiegel.tsx` - Medallienspiegel mit PDF-Export
- `client/src/pages/SquadManagement.tsx` - Riegenverwaltung
- `client/src/i18n/locales/de.json` - Deutsche Übersetzungen
- `client/src/i18n/locales/en.json` - Englische Übersetzungen
