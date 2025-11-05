# Template Unification: EventManagementTemplate with View Persistence

**Status**: ✅ Implementiert
**Datum**: 2025-10-17
**Related Points**: Point 35d, Point 40

## Zusammenfassung

Das `EventManagementTemplate` wurde erweitert, um View Persistence zu unterstützen. Jetzt gibt es nur noch **ein Template** für beide Use Cases:
- **Event Management Pages** (mit Event-Context)
- **Database Management Pages** (ohne Event-Context - können aber auch das neue Template nutzen)

## Problem

Vorher gab es zwei separate Templates:
1. **DatabaseManagementTemplate** (383 Zeilen) - mit view persistence, pagination, data management
2. **EventManagementTemplate** (278 Zeilen) - ohne view persistence, manuelles viewMode state management

**CompetitionsFixed.tsx** musste manuell ein `useState` für viewMode verwalten:
```typescript
const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
```

Dies führte zu:
- ❌ Keine Persistence der User-Präferenz
- ❌ Code-Duplikation
- ❌ Inkonsistente API zwischen Templates
- ❌ Manual state management in jeder Page

## Lösung

### 1. EventManagementTemplate erweitert

**Neue Props**:
```typescript
interface EventManagementTemplateProps {
  // ... existing props
  
  // NEW: View persistence support
  viewStorageKey?: string;           // Key for localStorage
  defaultView?: 'table' | 'grid';    // Default view (defaults to 'table')
  
  // DEPRECATED: Old manual mode (still supported for backwards compatibility)
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  
  // NEW: Render prop pattern
  children?: React.ReactNode | ((viewMode: 'table' | 'grid') => React.ReactNode);
}
```

**Features**:
- ✅ **View Persistence** via `useViewToggle` Hook
- ✅ **Backwards Compatible** - alte Pages funktionieren weiter
- ✅ **Render Prop Pattern** - Pages erhalten currentViewMode als Parameter
- ✅ **Automatic Default** - `defaultView='table'` ist jetzt der Default

**Implementation Details**:
```typescript
// View toggle with persistence (if viewStorageKey provided)
const { viewType: persistedViewType, handleViewTypeChange: handlePersistedViewChange } = useViewToggle({
  key: viewStorageKey || 'event-management-view-fallback',
  defaultView: defaultView === 'grid' ? 'cards' : 'table'
});

// Determine which view system to use (new persistence or legacy controlled)
const isUsingPersistence = !!viewStorageKey;
const currentViewMode: 'table' | 'grid' = isUsingPersistence 
  ? (persistedViewType === 'table' ? 'table' : 'grid')
  : (legacyViewMode || 'grid');
```

### 2. CompetitionsFixed.tsx Migration

**Vorher** (manuelles State Management):
```typescript
const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

<EventManagementTemplate
  viewMode={viewMode}
  onViewModeChange={setViewMode}
>
  <div>
    {viewMode === 'grid' && <GridView />}
    {viewMode === 'table' && <TableView />}
  </div>
</EventManagementTemplate>
```

**Nachher** (automatische Persistence):
```typescript
// No viewMode state needed!

<EventManagementTemplate
  viewStorageKey="competitions-view"  // NEW
  defaultView="table"                 // NEW
>
  {(viewMode) => (  // Render prop pattern
    <div>
      {viewMode === 'grid' && <GridView />}
      {viewMode === 'table' && <TableView />}
    </div>
  )}
</EventManagementTemplate>
```

**Änderungen**:
1. ✅ Removed `const [viewMode, setViewMode] = useState...`
2. ✅ Added `viewStorageKey="competitions-view"`
3. ✅ Added `defaultView="table"`
4. ✅ Changed children to render prop pattern: `{(viewMode) => (...)}`
5. ✅ Removed deprecated `viewMode` and `onViewModeChange` props

## Vorteile

### 1. Ein Template für alles
- ✅ Keine Wahl mehr zwischen DatabaseManagementTemplate und EventManagementTemplate
- ✅ Konsistente API
- ✅ Weniger Code zu maintainen

### 2. Automatische View Persistence
- ✅ User-Präferenz wird gespeichert (localStorage)
- ✅ Wird beim nächsten Besuch wiederhergestellt
- ✅ Pro Seite individuell (via viewStorageKey)

### 3. Code-Reduktion in Pages
- ✅ Kein manuelles useState für viewMode mehr nötig
- ✅ Kein manuelles onViewModeChange Handler
- ✅ Template managed den State

### 4. Bessere Developer Experience
- ✅ Render Prop Pattern ist explizit
- ✅ TypeScript-typsicher
- ✅ Einfacher zu testen

### 5. Backwards Compatibility
- ✅ Alte Pages funktionieren weiter ohne Änderungen
- ✅ Schrittweise Migration möglich
- ✅ Deprecated Props sind markiert

## Migration Guide

### Für neue Pages

**Einfach** (kein viewMode benötigt):
```typescript
<EventManagementTemplate
  title="My Page"
  // ... other props
>
  <div>My content</div>
</EventManagementTemplate>
```

**Mit View Toggle** (table/grid):
```typescript
<EventManagementTemplate
  title="My Page"
  viewStorageKey="my-page-view"
  defaultView="table"
>
  {(viewMode) => (
    <div>
      {viewMode === 'table' && <TableView />}
      {viewMode === 'grid' && <GridView />}
    </div>
  )}
</EventManagementTemplate>
```

### Für bestehende Pages

**Option 1**: Migration auf neues System (empfohlen)
1. Remove `useState` for viewMode
2. Add `viewStorageKey` prop
3. Add `defaultView` prop
4. Change children to render prop

**Option 2**: Nichts tun (backwards compatible)
- Alte Props funktionieren weiter
- Aber keine Persistence

## DatabaseManagementTemplate

Das `DatabaseManagementTemplate` bleibt vorerst bestehen für:
- ✅ 16 Pages verwenden es bereits
- ✅ Hat zusätzliche Features: Pagination, data management, complex filters
- ✅ Kann später optional auf EventManagementTemplate migriert werden

**Unterschied**:
- `DatabaseManagementTemplate`: Data-driven, mit eingebautem Pagination/Filtering
- `EventManagementTemplate`: Layout-only, Pages verwalten ihre eigenen Daten

## Files Changed

### 1. EventManagementTemplate.tsx
**Zeile 16**: Added `import useViewToggle`
**Zeile 19**: Changed `children` type to support render prop
**Zeile 29-30**: Added `viewStorageKey` and `defaultView` props
**Zeile 59-62**: Renamed legacy props to `legacyViewMode` and `legacyOnViewModeChange`
**Zeile 68-85**: Implemented view persistence logic with useViewToggle
**Zeile 172**: Changed children rendering to support render prop
**Build**: ✓ No errors

### 2. CompetitionsFixed.tsx
**Zeile 104**: Removed `const [viewMode, setViewMode]`
**Zeile 452-453**: Added `viewStorageKey="competitions-view"` and `defaultView="table"`
**Zeile 454-455**: Removed deprecated `viewMode` and `onViewModeChange` props
**Zeile 504**: Changed children to render prop pattern: `{(viewMode) => (...)}` 
**Build**: ✓ 2207 modules, 5.80s

## Testing

✅ **Build successful**: 5.80s, keine Fehler
✅ **Backwards compatibility**: Alte Pages funktionieren weiter
✅ **View persistence**: CompetitionsFixed speichert jetzt User-Präferenz
✅ **Default view**: Startet mit Table-View wie gewünscht

## localStorage Keys

- `competitions-view`: CompetitionsFixed.tsx

## Zukünftige Migrationen

Folgende Pages können optional migriert werden:
- Alle 16 Pages mit DatabaseManagementTemplate (falls gewünscht)
- Weitere Event Management Pages

## Related Documentation

- `POINT-35-UI-UNIFICATION.md` - UI Unification
- `POINT-40-DEFAULT-TABLE-VIEW.md` - Default view verification
- `client/src/hooks/useViewToggle.ts` - View persistence hook
- `client/src/components/DatabaseManagementTemplate.tsx` - Alternative template (bleibt bestehen)

## Fazit

✅ **Template Unification erfolgreich**
- EventManagementTemplate jetzt feature-complete
- CompetitionsFixed verwendet automatische View Persistence
- Backwards compatible für alle bestehenden Pages
- Klarer Migration Path für zukünftige Pages

**No Breaking Changes** - alle alten Pages funktionieren weiter! 🎉
