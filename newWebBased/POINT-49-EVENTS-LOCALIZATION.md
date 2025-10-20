# Point 49 - Events Page Localization

## Problem
Die Events-Seite (http://localhost:3001/events) hatte mehrere nicht-lokalisierte Elemente:

a) **Filter-Texte**: "Search", "Clear All Filters", "Filters" waren nicht lokalisiert
b) **Import Button**: "Import from Gymnet" war hardcodiert in Englisch
c) **Datumsformat**: Termine wurden immer im amerikanischen Format angezeigt (z.B. "Jan 14, 2025")

## Lösung

### a) Filter-Texte
**Status**: ✅ Bereits lokalisiert - Keine Änderung notwendig

**Analyse**:
- Events.tsx verwendet `DatabaseManagementTemplate` Komponente
- DatabaseManagementTemplate nutzt bereits zentrale Translation Keys:
  * `common.search` → "Suchen" (DE) / "Search" (EN)
  * `common.table.filters` → "Filter" (DE) / "Filters" (EN)
  * Filter-Buttons verwenden Template-Lokalisierung

**Code-Struktur**:
```tsx
<DatabaseManagementTemplate
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder={t('events.searchPlaceholder')}
  showFilters={showFilters}
  onToggleFilters={() => setShowFilters(!showFilters)}
  filterOptions={getFilterConfig()}
  onClearAllFilters={handleClearAllFilters}
  // ... weitere Props
/>
```

**Ergebnis**: Filter-Texte waren bereits vollständig lokalisiert durch Template-System.

### b) Import Button
**Vorher** (hardcodiert):
```tsx
<button onClick={openImportModal}>
  Import from Gymnet
</button>
```

**Nachher** (lokalisiert):
```tsx
<button onClick={openImportModal}>
  {t('events.importButton')}
</button>
```

**Neue Translation Keys**:
- `events.importButton` (DE): "Aus Gymnet importieren"
- `events.importButton` (EN): "Import from Gymnet"

**Datei**: `client/src/pages/Events.tsx` (Zeile 621)

### c) Datumsformat
**Vorher** (nur Englisch):
```typescript
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

**Nachher** (Locale-abhängig):
```typescript
const formatDate = (dateString: string) => {
  const locale = t('common.locale') === 'de' ? 'de-DE' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

**Neue Translation Keys**:
- `common.locale` (DE): "de"
- `common.locale` (EN): "en"

**Ausgabe-Beispiele**:

| Original Date | Deutsch (de-DE) | Englisch (en-US) |
|---------------|-----------------|------------------|
| 2025-01-14 | 14. Jan. 2025 | Jan 14, 2025 |
| 2025-12-31 | 31. Dez. 2025 | Dec 31, 2025 |
| 2025-03-05 | 5. März 2025 | Mar 5, 2025 |

**Verwendung in UI**:
```tsx
<div>{formatDate(event.dat_eventstartdate)}</div>
{event.dat_eventstartdate !== event.dat_eventenddate && (
  <div className="text-gray-500">
    {t('events.table.to')} {formatDate(event.dat_eventenddate)}
  </div>
)}
```

**Beispiel-Output**:
- Deutsch: "14. Jan. 2025" bis "21. Jan. 2025"
- Englisch: "Jan 14, 2025" to "Jan 21, 2025"

## Geänderte Dateien

### client/src/pages/Events.tsx
**Änderung 1** - formatDate Funktion (Zeile 121-127):
```typescript
// OLD:
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// NEW:
const formatDate = (dateString: string) => {
  const locale = t('common.locale') === 'de' ? 'de-DE' : 'en-US';
  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
```

**Änderung 2** - Import Button (Zeile 616-624):
```tsx
// OLD:
<button onClick={openImportModal}>
  Import from Gymnet
</button>

// NEW:
<button onClick={openImportModal}>
  {t('events.importButton')}
</button>
```

### client/src/i18n/locales/de.json
**Änderung 1** - common.locale hinzugefügt (Zeile 543-545):
```json
"common": {
  "locale": "de",
  "loading": "Lädt...",
  // ...
}
```

**Änderung 2** - events.importButton hinzugefügt (Zeile 658):
```json
"export": {
  "csv": "Als CSV exportieren",
  "filename": "veranstaltungen"
},
"importButton": "Aus Gymnet importieren",
"import": {
  // ...
}
```

### client/src/i18n/locales/en.json
**Änderung 1** - common.locale hinzugefügt (Zeile 543-545):
```json
"common": {
  "locale": "en",
  "loading": "Loading...",
  // ...
}
```

**Änderung 2** - events.importButton hinzugefügt (Zeile 661):
```json
"export": {
  "csv": "Export to CSV",
  "filename": "events"
},
"importButton": "Import from Gymnet",
"import": {
  // ...
}
```

## Testing

### Manuelles Testing

**Test 1 - Import Button Lokalisierung**:
1. Open Events page: http://localhost:5173/events
2. Verify button text:
   - Deutsch: "Aus Gymnet importieren"
   - Englisch: "Import from Gymnet"
3. Switch language and verify button updates

**Test 2 - Datumsformat**:
1. Open Events page: http://localhost:5173/events
2. Check date column "Termine":
   - Deutsch: "14. Jan. 2025" (Punkt nach Tag, deutscher Monatsname)
   - Englisch: "Jan 14, 2025" (Monat zuerst, englischer Monatsname)
3. Check multi-day events:
   - Deutsch: "14. Jan. 2025" bis "21. Jan. 2025"
   - Englisch: "Jan 14, 2025" to "Jan 21, 2025"

**Test 3 - Filter-Texte**:
1. Open Events page: http://localhost:5173/events
2. Click on filter icon/button
3. Verify all filter texts are localized:
   - Deutsch: "Suchen", "Filter", "Alle Filter löschen"
   - Englisch: "Search", "Filters", "Clear All Filters"

**Test 4 - Language Switching**:
1. Start with German (default)
2. Verify button and dates in German
3. Switch to English via language selector
4. Verify button and dates update to English
5. Import a Gymnet file
6. Verify import dialog is in selected language

## Vorteile

1. **Konsistente Lokalisierung**: Alle UI-Elemente auf Events-Seite nun lokalisiert
2. **Template-Wiederverwendung**: Filter-Texte nutzen bereits existierende Template-Lokalisierung
3. **Kulturgerechte Datumsanzeige**: Deutsche Nutzer sehen deutsche Datumsformate
4. **Zentrale Locale-Verwaltung**: `common.locale` kann für andere Komponenten wiederverwendet werden
5. **Wartbarkeit**: Änderungen an Texten nur in JSON-Dateien nötig

## Zusätzliche Verbesserungsmöglichkeiten

### Weitere Locale-Nutzung
Der neue `common.locale` Key kann für weitere Lokalisierungen verwendet werden:

```typescript
// Beispiel: Zahlenformatierung
const formatNumber = (num: number) => {
  const locale = t('common.locale') === 'de' ? 'de-DE' : 'en-US';
  return num.toLocaleString(locale);
}

// Beispiel: Währungsformatierung
const formatCurrency = (amount: number) => {
  const locale = t('common.locale') === 'de' ? 'de-DE' : 'en-US';
  const currency = t('common.locale') === 'de' ? 'EUR' : 'USD';
  return new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency 
  }).format(amount);
}

// Beispiel: Relative Zeit
const formatRelativeTime = (date: Date) => {
  const locale = t('common.locale') === 'de' ? 'de-DE' : 'en-US';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  // ... calculation logic
}
```

### Best Practice Pattern
Dieses Pattern kann auf andere Seiten übertragen werden:

1. **Zentrale Locale-Variable**: Immer `t('common.locale')` verwenden
2. **Ternary Operator**: Einfache Locale-Bestimmung mit `locale === 'de' ? 'de-DE' : 'en-US'`
3. **toLocaleDateString()**: Native JavaScript-Lokalisierung nutzen
4. **Template-Komponenten**: Filter und gemeinsame UI-Elemente über Templates lokalisieren

## Ergebnis

✅ **Vollständig lokalisiert**:
- Import Button (1 neuer Translation Key)
- Datumsformat (locale-abhängig mit common.locale)
- Filter-Texte (bereits durch Template lokalisiert)

✅ **Build Status**: 
- Client kompiliert ohne Fehler
- Keine TypeScript-Fehler
- Build-Zeit: 5.11s

✅ **Translation Coverage**:
- 2 neue Translation Keys hinzugefügt
- Alle Keys in DE und EN vorhanden
- Datumsformatierung kulturgerecht

✅ **Konsistenz**:
- Einheitliches Datumsformat über die gesamte Events-Seite
- Button-Text passt zur Spracheinstellung
- Filter-System nutzt zentrale Template-Lokalisierung
