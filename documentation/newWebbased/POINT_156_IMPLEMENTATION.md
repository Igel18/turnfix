# Point 156 - Gruppen Filter-Buttons Implementation

**Status**: ✅ Abgeschlossen  
**Datum**: 13.11.2025, 14:30  
**Git Hash**: b4ab6bf8  
**Branch**: WebInterface

## 📋 Zusammenfassung

Implementierung der Filter-Buttons für die Gruppen-Verwaltung gemäß PARTICIPANT_MANAGEMENT_REQUIREMENTS.md Point 156.

### Implementierte Features

1. **Filter "Verplante ausblenden"** ✅
   - Blendet Teilnehmer aus, die bereits einer Gruppe zugewiesen sind
   - Server-seitige Filterung via Subquery auf `tfx_wertungen`
   - Nur aktiv wenn Toggle eingeschaltet

2. **Filter "Andere Vereine ausblenden"** ✅
   - Zeigt nur Teilnehmer des gleichen Vereins wie die Gruppe
   - Server-seitige Filterung via `WHERE int_vereineid = clubId`
   - Nur aktiv wenn Toggle eingeschaltet

3. **UI-Komponenten** ✅
   - Neue Komponente: `GroupMemberFilters.tsx`
   - Filter-Buttons mit visueller Aktiv-Anzeige (blau = aktiv)
   - Reset-Button erscheint nur wenn Filter aktiv
   - Dark Mode Support
   - i18n Unterstützung (de/en)

## 🏗️ Architektur

### Component Hierarchy

```
Groups/index.tsx
  └─ useGroupMembers (Hook mit Filter-State)
  └─ createGroupConfig (empfängt Filter-Props)
      └─ groupAssignmentConfig.tsx
          └─ renderDetailPane
              └─ GroupMemberFilters (UI-Komponente)
```

### State Management

**Hook-basiertes Filtering**:
```typescript
// useGroupMembers.ts
const [filters, setFilters] = useState<GroupFilters>({
  hidePlanned: false,
  hideOtherClubs: false
});

const setHidePlanned = (value: boolean) => {
  setFilters(prev => ({ ...prev, hidePlanned: value }));
};

const setHideOtherClubs = (value: boolean) => {
  setFilters(prev => ({ ...prev, hideOtherClubs: value }));
};

const resetFilters = () => {
  setFilters({ hidePlanned: false, hideOtherClobs: false });
};
```

**Dependency-Triggered Refetch**:
```typescript
useEffect(() => {
  if (selectedGroup && eventId) {
    fetchAvailableParticipants();
  }
}, [selectedGroup?.id, eventId, filters]); // ← filters als Dependency
```

### Server-Side Filtering

**Endpoint**: `GET /api/groups/available-participants`

**Query Parameters**:
- `eventId` (number, required)
- `clubId` (number, required)
- `groupId` (number, required)
- `hidePlanned` (boolean, optional, default: false)
- `hideOtherClubs` (boolean, optional, default: false)

**Filter-Logik**:

```typescript
// 1. Club-Filter (hideOtherClubs)
const whereClause: any = hideOtherClubs ? {
  int_vereineid: clubId  // Nur gleicher Verein
} : {};  // Alle Vereine

// 2. Verplante ausblenden (hidePlanned)
let assignedParticipantIds = new Set<number>();
if (hidePlanned) {
  // Subquery: Finde Teilnehmer in tfx_wertungen für dieses Event
  const assignedScores = await prisma.$queryRawUnsafe<any[]>(`
    SELECT DISTINCT int_teilnehmerid
    FROM tfx_wertungen
    WHERE int_teilnehmerid IN (
      SELECT int_teilnehmerid FROM tfx_teilnehmer WHERE int_eventid = $1
    )
  `, eventId);
  
  assignedParticipantIds = new Set(assignedScores.map(s => s.int_teilnehmerid));
}

// 3. Participants abfragen
const participants = await prisma.tfx_teilnehmer.findMany({
  where: {
    int_eventid: eventId,
    var_typ: 'Gruppe',
    ...whereClause
  }
});

// 4. Filtern wenn hidePlanned aktiv
const filtered = participants.filter(p => {
  if (hidePlanned && assignedParticipantIds.has(p.int_teilnehmerid)) {
    return false; // Ausblenden wenn bereits verplant
  }
  return true;
});
```

## 📁 Geänderte Dateien

### 1. **client/src/pages/Groups/components/GroupMemberFilters.tsx** (NEU)

**Zeilen**: 80  
**Zweck**: Wiederverwendbare Filter-Buttons-Komponente

**Props**:
```typescript
interface GroupMemberFiltersProps {
  hidePlanned: boolean;
  hideOtherClubs: boolean;
  onToggleHidePlanned: (value: boolean) => void;
  onToggleHideOtherClubs: (value: boolean) => void;
  onResetFilters: () => void;
  disabled?: boolean;
}
```

**Features**:
- Toggle-Buttons mit visueller Aktiv-Anzeige
- Reset-Button (nur sichtbar wenn Filter aktiv)
- Dark Mode Support
- Vollständige i18n-Unterstützung

### 2. **client/src/pages/Groups/hooks/useGroupMembers.ts** (MODIFIZIERT)

**Änderungen**: ~30 Zeilen

**Hinzugefügt**:
- `GroupFilters` Interface
- Filter-State mit `useState`
- Setter-Funktionen: `setHidePlanned`, `setHideOtherClubs`, `resetFilters`
- Filter als Dependency in `useEffect`
- Filter-Parameter in API-Call

**Return-Typ erweitert**:
```typescript
return {
  // ... existing returns
  filters,
  setHidePlanned,
  setHideOtherClubs,
  resetFilters
};
```

### 3. **client/src/pages/Groups/groupAssignmentConfig.tsx** (MODIFIZIERT)

**Änderungen**: ~45 Zeilen

**Hinzugefügt**:
- `GroupFilters` Interface Import
- `CreateGroupConfigParams` erweitert mit Filter-Props
- `GroupMemberFilters` Component Import
- Filter-Section in `renderDetailPane` (conditional rendering)
- Dark Mode Classes zu bestehenden Elementen

**Filter-Section Platzierung**:
```tsx
// Zwischen Group Info und Members List
{filters && onToggleHidePlanned && ... && (
  <div className="mb-4">
    <GroupMemberFilters
      hidePlanned={filters.hidePlanned}
      hideOtherClubs={filters.hideOtherClubs}
      onToggleHidePlanned={onToggleHidePlanned}
      onToggleHideOtherClubs={onToggleHideOtherClubs}
      onResetFilters={onResetFilters}
      disabled={isSaving}
    />
  </div>
)}
```

### 4. **client/src/pages/Groups/index.tsx** (MODIFIZIERT)

**Änderungen**: ~5 Zeilen

**Hinzugefügt**:
- Destrukturierung der Filter-Funktionen aus `useGroupMembers`
- Filter-Props an `createGroupConfig` übergeben

```typescript
const {
  // ... existing
  filters,
  setHidePlanned,
  setHideOtherClubs,
  resetFilters
} = useGroupMembers(...);

const config = createGroupConfig({
  t,
  onRemoveMember: removeMember,
  filters,
  onToggleHidePlanned: setHidePlanned,
  onToggleHideOtherClubs: setHideOtherClubs,
  onResetFilters: resetFilters
});
```

### 5. **server/src/routes/groups.ts** (MODIFIZIERT)

**Änderungen**: ~40 Zeilen

**Endpoint**: `GET /available-participants`

**Hinzugefügt**:
- Query-Parameter Parsing: `hidePlanned`, `hideOtherClubs`
- Conditional WHERE Clause basierend auf `hideOtherClubs`
- Conditional Subquery basierend auf `hidePlanned`
- Debug-Logging für Filter-State

**Filter-Logik**:
```typescript
// Club-Filter
const whereClause: any = hideOtherClubs ? {
  int_vereineid: clubId
} : {};

// Verplante ausblenden
let assignedParticipantIds = new Set<number>();
if (hidePlanned) {
  const assignedScores = await prisma.$queryRawUnsafe<any[]>(`...`);
  assignedParticipantIds = new Set(assignedScores.map(...));
}

// Filtern
const filtered = participants.filter(p => {
  if (hidePlanned && assignedParticipantIds.has(p.int_teilnehmerid)) {
    return false;
  }
  return true;
});
```

### 6. **client/src/i18n/locales/de.json & en.json** (MODIFIZIERT)

**Hinzugefügt**:
```json
{
  "hidePlanned": "Verplante ausblenden",    // de
  "hideOtherClubs": "Andere Vereine ausblenden",  // de
  "hidePlanned": "Hide Planned",             // en
  "hideOtherClubs": "Hide Other Clubs"       // en
}
```

### 7. **client/src/pages/Groups/components/index.ts** (MODIFIZIERT)

**Hinzugefügt**:
```typescript
export { GroupMemberFilters } from './GroupMemberFilters';
```

## 🧪 Testing

### Test-URL
```
http://localhost:5173/groups?eventId=59
```

### Test-Schritte

1. **Basis-Funktionalität**:
   - [ ] Seite lädt ohne Fehler
   - [ ] Gruppen-Liste wird angezeigt
   - [ ] Filter-Buttons sind sichtbar (initial beide inaktiv)

2. **Filter "Verplante ausblenden"**:
   - [ ] Button togglen → blauer Hintergrund wenn aktiv
   - [ ] Teilnehmer-Liste aktualisiert sich
   - [ ] Bereits verplante Teilnehmer verschwinden
   - [ ] Reset-Button erscheint

3. **Filter "Andere Vereine ausblenden"**:
   - [ ] Button togglen → blauer Hintergrund wenn aktiv
   - [ ] Nur Teilnehmer des Gruppen-Vereins sichtbar
   - [ ] Reset-Button erscheint

4. **Kombinierte Filter**:
   - [ ] Beide Filter aktiv → nur nicht-verplante vom gleichen Verein
   - [ ] Reset-Button setzt beide Filter zurück
   - [ ] UI-State korrekt (beide Buttons wieder weiß)

5. **Edge Cases**:
   - [ ] Keine Teilnehmer nach Filterung → leere Liste
   - [ ] Filter während Laden → disabled State
   - [ ] Dark Mode → korrekte Farbgebung

### API-Tests

**Test 1: Ohne Filter**
```bash
curl "http://localhost:3001/api/groups/available-participants?eventId=59&clubId=X&groupId=Y"
```
Erwartung: Alle Teilnehmer vom Typ "Gruppe"

**Test 2: hideOtherClubs=true**
```bash
curl "http://localhost:3001/api/groups/available-participants?eventId=59&clubId=X&groupId=Y&hideOtherClubs=true"
```
Erwartung: Nur Teilnehmer mit `int_vereineid = X`

**Test 3: hidePlanned=true**
```bash
curl "http://localhost:3001/api/groups/available-participants?eventId=59&clubId=X&groupId=Y&hidePlanned=true"
```
Erwartung: Teilnehmer OHNE Eintrag in `tfx_wertungen`

**Test 4: Beide Filter**
```bash
curl "http://localhost:3001/api/groups/available-participants?eventId=59&clubId=X&groupId=Y&hidePlanned=true&hideOtherClubs=true"
```
Erwartung: Nur nicht-verplante vom gleichen Verein

## 📊 Performance-Überlegungen

### Optimierungen

1. **Conditional Subquery**: Subquery für "Verplante" nur wenn Filter aktiv
2. **WHERE Clause Optimization**: Club-Filter direkt in Prisma WHERE
3. **Client-side Filtering**: Nur für Mitglieder-Ausschluss (kleine Datenmenge)

### Potenzielle Verbesserungen

1. **Caching**: Assigned-Participants könnte gecacht werden (event-level)
2. **Indexing**: Sicherstellen dass `int_vereineid` und `int_teilnehmerid` indiziert sind
3. **Pagination**: Bei sehr vielen Teilnehmern (> 1000)

## 🔄 Nächste Schritte

### Point 157 - Mannschaften (analog)

Die gleiche Filter-Struktur kann für Mannschaften wiederverwendet werden:

1. **Komponente**: `TeamMemberFilters.tsx` (analog zu `GroupMemberFilters.tsx`)
2. **Hook**: `useTeamMembers` erweitern (analog zu `useGroupMembers`)
3. **Server**: `/api/teams/available-participants` (analog zu `/api/groups/...`)
4. **Config**: `teamAssignmentConfig.tsx` erweitern

**Zusätzlich für Point 157**:
- AK/SN Checkboxen in Mitglieder-Tabelle
- Wettkampf-Dropdown für Mitglieder
- Checkbox-Binding an `bol_ak` und `bol_startet_nicht` in `tfx_wertungen`

### Point 155 - Einzelteilnehmer

Einfacheres Szenario (nur "Verplante ausblenden"):

1. **Komponente**: `IndividualParticipantFilters.tsx` (nur 1 Filter)
2. **Server**: Endpoint-Erweiterung oder separate Route
3. **UI**: Integration in EventParticipants oder neue Seite

## 📚 Lessons Learned

### Erfolgreiche Patterns

1. **Hook-basiertes State Management**: Saubere Trennung von Logik und UI
2. **Config-basiertes Rendering**: Flexibel, wiederverwendbar
3. **Server-side Filtering**: Performance bei großen Datenmengen
4. **Conditional Queries**: Nur teure Queries wenn nötig

### Best Practices

1. **Type Safety**: TypeScript Interfaces für alle Props und States
2. **i18n von Anfang an**: Alle UI-Texte übersetzbar
3. **Dark Mode Support**: Konsistent in allen Komponenten
4. **Separation of Concerns**: Filter-Komponente wiederverwendbar

### Zu vermeiden

1. ❌ Client-side Filtering bei großen Listen (Performance)
2. ❌ Hardcoded Strings (immer i18n verwenden)
3. ❌ Ungenutzter Import in index.tsx (TypeScript Fehler)

## ✅ Checkliste Point 156

- [x] GroupMemberFilters Komponente erstellt
- [x] useGroupMembers Hook erweitert (Filter-State)
- [x] groupAssignmentConfig aktualisiert (Filter-Section)
- [x] Server-Endpoint aktualisiert (Filter-Parameter)
- [x] Translations hinzugefügt (de/en)
- [x] TypeScript kompiliert ohne Fehler
- [x] Client Build erfolgreich
- [x] Server läuft (Port 3001)
- [x] Client läuft (Port 5173)
- [x] Browser-Test vorbereitet (Event 59)
- [ ] Manuelle Tests durchgeführt
- [ ] Edge Cases geprüft
- [ ] Performance verifiziert

## 🎯 Status

**Implementation**: ✅ Abgeschlossen  
**Testing**: ⏳ Bereit für manuelle Tests  
**Documentation**: ✅ Vollständig

---

**Next**: Manuelle Tests durchführen, dann Point 157 (Mannschaften) implementieren
