# Konzept: Vereinheitlichung der Zuweisungs-UIs (Assignment UIs)

**Datum:** 2025-11-10  
**Punkt:** 146  
**Status:** Konzept/Planung

---

## 📋 Übersicht

Aktuell gibt es verschiedene UIs für die Zuweisung von Datensätzen zueinander. Diese sollen vereinheitlicht werden, um:
- Konsistente Benutzererfahrung zu schaffen
- Code-Wiederverwendung zu maximieren
- Wartbarkeit zu verbessern
- Entwicklungszeit für neue Zuweisungstypen zu reduzieren

---

## 🎯 Betroffene Zuweisungstypen

### Identifizierte Zuweisungen

| # | Zuweisung | Aktueller Ort | Status | UI-Pattern |
|---|-----------|---------------|--------|------------|
| 1 | **Wettkämpfe ↔ Disziplinen** | `CompetitionFormModal.tsx` | ✅ Vorhanden | Inline-Checkboxen in Modal |
| 2 | **Teilnehmer ↔ Wettkämpfe** | `EventParticipants` (inline) | ✅ Vorhanden | Inline-Auswahl |
| 3 | **Riegen ↔ Teilnehmer** | `SquadManagement.tsx` | ✅ Vorhanden | Drag & Drop + Listen |
| 4 | **Mannschaften ↔ Teilnehmer** | `TeamPenaltiesModal.tsx` (Abzüge)<br>`components/` (fehlend) | ⚠️ Teilweise | Modal |
| 5 | **Gruppen ↔ Teilnehmer** | `GroupMembersModal.tsx` | ✅ Vorhanden | Modal mit Dropdown |
| 6 | **Teilnehmer ↔ Veranstaltung** | `AddParticipantModal.tsx` | ✅ Vorhanden | Modal mit Suche |

### Weitere identifizierte Zuweisungen

| # | Zuweisung | Potenzieller Bedarf | Priorität |
|---|-----------|---------------------|-----------|
| 7 | **Wettkämpfe ↔ Durchgänge** | TimePlanning | Niedrig (bereits integriert) |
| 8 | **Riegen ↔ Wettkämpfe** | SquadManagement | Mittel |
| 9 | **Kampfrichter ↔ Wettkämpfe** | Jury Portal | Hoch (separates System) |
| 10 | **Mannschaften ↔ Wettkämpfe** | Teams Page | Hoch (aktuell fehlend?) |

---

## 🔍 Analyse der bestehenden Implementierungen

### 1. Wettkämpfe ↔ Disziplinen
**Datei:** `client/src/components/CompetitionFormModal.tsx` (905 Zeilen)

**Pattern:**
- Checkboxen-Grid innerhalb des Competition-Formulars
- Disziplinen gefiltert nach Geschlecht
- Gruppierung nach Disziplinen-Gruppen
- Inline max-score Eingabe pro Disziplin

**Eigenschaften:**
```typescript
// Daten-Struktur
disciplines: { disciplineId: number; maxScore: number }[]

// UI-Features
- Gender-basierte Filterung
- Disziplinen-Gruppen Dropdown
- Bulk-Actions (alle setzen)
- Inline validation
- Visuelles Feedback (bereits zugewiesen)
```

**Stärken:**
- ✅ Übersichtlich bei wenigen Disziplinen
- ✅ Schnelle Mehrfachauswahl
- ✅ Zusätzliche Parameter (maxScore) direkt sichtbar

**Schwächen:**
- ❌ Nicht skalierbar bei vielen Disziplinen
- ❌ Keine Suchfunktion
- ❌ Modal bereits sehr groß (905 Zeilen - needs SoC!)

---

### 2. Teilnehmer ↔ Wettkämpfe
**Datei:** `client/src/pages/EventParticipants/` (verschiedene Komponenten)

**Pattern:**
- Inline-Auswahl in Teilnehmer-Tabelle
- Bulk-Assignment möglich
- Status-Anzeige (Anzahl zugewiesener Wettkämpfe)

**Eigenschaften:**
```typescript
// UI-Features
- Multi-select für Teilnehmer
- Dropdown für Wettkampf-Auswahl
- Bulk-Zuweisung
- Status-Badge mit Count
```

**Stärken:**
- ✅ Schnelle Bulk-Operationen
- ✅ Übersichtliche Status-Anzeige
- ✅ Direkt in der Hauptansicht

**Schwächen:**
- ❌ Keine Detail-Ansicht der Zuweisungen
- ❌ Schwer, individuelle Zuweisungen zu prüfen

---

### 3. Riegen ↔ Teilnehmer
**Datei:** `client/src/pages/SquadManagement.tsx` (1070 Zeilen - CRITICAL SoC needed!)

**Pattern:**
- **Drei-Spalten-Layout** (Master-Detail Pattern)
  - **Spalte 1:** Riegen-Liste (Master) mit Auswahl
  - **Spalte 2:** Verfügbare Teilnehmer
  - **Spalte 3:** Details der ausgewählten Riege (Detail)
- Drag & Drop Unterstützung (geplant, aktuell Click-to-assign)
- Virtuelle Riegen ("Nicht zugeordnet")
- Detaillierte Filterung

**Eigenschaften:**
```typescript
// UI-Features
- Master-List: Riegen-Auswahl (links)
- Available List: Teilnehmer zum Zuweisen (mitte)
- Detail Pane: Zugewiesene Teilnehmer + Riegen-Info (rechts)
- Click-to-assign (Pfeil-Button)
- Umfangreiche Filter (gender, club, competition)
- Virtuelle "Nicht zugeordnet" Riege
- Competition-basiertes Highlighting
- PDF Export
- 3-Spalten Grid Layout: lg:grid-cols-3
```

**Stärken:**
- ✅ Sehr intuitiv (Master-Detail Navigation)
- ✅ Visuell ansprechend
- ✅ Umfangreiche Filteroptionen
- ✅ Gute Übersicht über alle Riegen
- ✅ Gleichzeitige Anzeige: Riegen, Verfügbar, Zugewiesen
- ✅ Competition-Highlighting (zeigt relevante Teilnehmer)

**Schwächen:**
- ❌ Datei zu groß (1070 Zeilen - urgent refactoring!)
- ❌ Komplex in der Wartung
- ❌ Nicht generisch wiederverwendbar
- ❌ Kein echtes Drag & Drop (nur Buttons)
- ❌ Layout nur für Full-Screen optimiert

**Besonderheit:**
Dies ist das **einzige UI mit Master-Detail Pattern** - zeigt mehrere "Container" (Riegen) gleichzeitig und erlaubt Navigation zwischen ihnen.

---

### 4. Gruppen ↔ Teilnehmer
**Datei:** `client/src/components/GroupMembersModal.tsx` (263 Zeilen)

**Pattern:**
- Modal mit zwei Bereichen (zugewiesen | hinzufügen)
- Dropdown-Auswahl für verfügbare Teilnehmer
- Liste der zugewiesenen Mitglieder
- Club-basierte Filterung automatisch

**Eigenschaften:**
```typescript
// UI-Features
- Dropdown mit verfügbaren Teilnehmern
- Liste der aktuellen Mitglieder
- Add/Remove Buttons
- Automatische Filterung (gleicher Verein)
- Keine Duplikate möglich
```

**Stärken:**
- ✅ Einfaches, klares Pattern
- ✅ Verhindert automatisch Duplikate
- ✅ Kompakt und wartbar
- ✅ Gute Code-Qualität (263 Zeilen)

**Schwächen:**
- ❌ Dropdown nicht ideal bei vielen Teilnehmern
- ❌ Keine Bulk-Operationen
- ❌ Keine Suchfunktion

---

### 5. Mannschaften ↔ Teilnehmer (Abzüge)
**Datei:** `client/src/components/TeamPenaltiesModal.tsx` (239 Zeilen)

**Hinweis:** Dies ist eigentlich "Mannschaften ↔ Abzugstypen", nicht Teilnehmer!

**Pattern:**
- Modal mit Dropdown für verfügbare Abzugstypen
- Liste der zugewiesenen Abzüge
- Add/Remove Pattern

**Eigenschaften:**
```typescript
// UI-Features
- Dropdown mit verfügbaren Penalty-Types
- Liste mit zugewiesenen Penalties
- Automatische Duplikat-Vermeidung
- Sofortige Punktzahl-Anzeige
```

**Stärken:**
- ✅ Sehr ähnlich zu GroupMembersModal (gutes Pattern!)
- ✅ Kompakt und wartbar
- ✅ Klare Trennung

**Schwächen:**
- ❌ Name irreführend ("Penalties" nicht "Members")
- ❌ Eigentlich kein Teilnehmer-Assignment

**Fehlend:** Echte Mannschaften ↔ Teilnehmer Zuweisung!

---

### 6. Teilnehmer ↔ Veranstaltung
**Datei:** `client/src/pages/EventParticipants/components/AddParticipantModal.tsx` (172 Zeilen)

**Pattern:**
- Modal mit Suche und Tabelle
- Einzelne Zuweisung per Klick
- Filterung durch Suchbegriff

**Eigenschaften:**
```typescript
// UI-Features
- Suchfeld für Teilnehmer
- Tabelle mit allen verfügbaren Teilnehmern
- Gender-Badge Anzeige
- Club-Anzeige
- Add-Button pro Zeile
```

**Stärken:**
- ✅ Suchfunktion vorhanden
- ✅ Übersichtliche Tabelle
- ✅ Guter Code (172 Zeilen)
- ✅ Klare Struktur

**Schwächen:**
- ❌ Keine Bulk-Operationen
- ❌ Keine Sortierung
- ❌ Keine erweiterten Filter

---

## 🎨 Unified Assignment Component - Design Konzept

### Ziel
Eine wiederverwendbare `UnifiedAssignmentModal` Komponente, die alle Zuweisungstypen abdecken kann.

### Core Features

#### 1. Generische Daten-Schnittstelle
```typescript
interface AssignmentItem {
  id: number;
  displayName: string;
  secondaryInfo?: string;
  metadata?: Record<string, any>;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'error';
  };
}

// NEW: Container für Master-Detail Pattern (z.B. Riegen)
interface AssignmentContainer {
  id: number | string;
  name: string;
  displayName: string;
  itemCount: number;
  metadata?: Record<string, any>;
  isVirtual?: boolean;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'error';
  };
}

interface AssignmentConfig<TItem extends AssignmentItem = AssignmentItem> {
  // Titles & Labels
  title: string;
  availableLabel: string;
  assignedLabel: string;
  searchPlaceholder: string;
  emptyAvailableMessage: string;
  emptyAssignedMessage: string;
  
  // Data
  availableItems: TItem[];
  assignedItems: TItem[];
  
  // Master-Detail Pattern (NEW - optional, for 3-column layout)
  containers?: AssignmentContainer[];
  selectedContainer?: AssignmentContainer | null;
  onContainerSelect?: (container: AssignmentContainer) => void;
  onContainerCreate?: () => void;
  onContainerDelete?: (containerId: number | string) => void;
  containerLabel?: string; // e.g. "Riegen", "Teams"
  
  // Actions
  onAssign: (item: TItem, containerId?: number | string) => Promise<void>;
  onUnassign: (item: TItem, containerId?: number | string) => Promise<void>;
  onBulkAssign?: (items: TItem[], containerId?: number | string) => Promise<void>;
  onBulkUnassign?: (items: TItem[], containerId?: number | string) => Promise<void>;
  
  // Features
  enableSearch?: boolean;
  enableBulkActions?: boolean;
  enableDragDrop?: boolean;
  enableFilters?: boolean;
  filters?: AssignmentFilter[];
  
  // Display
  displayMode?: 'two-column' | 'three-column' | 'single-column' | 'checkbox-grid';
  columns?: AssignmentColumn[];
  
  // Additional data per assignment
  additionalFields?: AssignmentField[];
  
  // Validation
  validateAssignment?: (item: TItem, containerId?: number | string) => string | null;
  
  // Custom renderers
  renderItem?: (item: TItem) => React.ReactNode;
  renderBadge?: (item: TItem) => React.ReactNode;
  renderContainer?: (container: AssignmentContainer) => React.ReactNode; // NEW
  renderDetailPane?: (container: AssignmentContainer, items: TItem[]) => React.ReactNode; // NEW
}

interface AssignmentFilter {
  id: string;
  label: string;
  type: 'select' | 'text' | 'checkbox';
  options?: { value: string; label: string }[];
  filterFn: (item: AssignmentItem, value: any) => boolean;
}

interface AssignmentColumn {
  id: string;
  label: string;
  width?: string;
  render: (item: AssignmentItem) => React.ReactNode;
  sortable?: boolean;
}

interface AssignmentField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'select';
  required?: boolean;
  defaultValue?: any;
  options?: { value: any; label: string }[];
  validate?: (value: any) => string | null;
}
```

#### 2. UI Layouts

**Layout 1: Two-Column (Simple Assignment)**
```
┌─────────────────────────────────────────────────────┐
│  Modal Title                              [X]       │
├─────────────────────────────────────────────────────┤
│  [Search] [Filter ▼] [Filter ▼]                   │
├──────────────────────┬──────────────────────────────┤
│  Verfügbar (50)      │  Zugewiesen (12)            │
│  ┌────────────────┐  │  ┌────────────────┐         │
│  │ ☐ Item 1   [→] │  │  │ ☑ Item A   [X] │         │
│  │ ☐ Item 2   [→] │  │  │ ☑ Item B   [X] │         │
│  │ ☐ Item 3   [→] │  │  │ ☑ Item C   [X] │         │
│  │   ...          │  │  │   ...          │         │
│  └────────────────┘  │  └────────────────┘         │
│  [Assign Selected]   │  [Remove Selected]          │
└──────────────────────┴──────────────────────────────┘
```

**Layout 1b: Three-Column (Master-Detail Pattern für SquadManagement)**
```
┌───────────────────────────────────────────────────────────────┐
│  Squad Management                                    [X]      │
├───────────────────────────────────────────────────────────────┤
│  [Search] [Filter ▼] [Filter ▼] [Filter ▼]                  │
├──────────────┬─────────────────────┬──────────────────────────┤
│  Riegen (5)  │  Verfügbar (50)     │  Riege "A" Details      │
│  ┌────────┐  │  ┌──────────────┐   │  ┌──────────────────┐   │
│  │▶ Riege A│  │  │☐ Person 1 [→]│   │  │☑ Person X    [←] │   │
│  │  Riege B│  │  │☐ Person 2 [→]│   │  │☑ Person Y    [←] │   │
│  │  Riege C│  │  │☐ Person 3 [→]│   │  │☑ Person Z    [←] │   │
│  │  + Neu  │  │  │   ...        │   │  │   ...            │   │
│  └────────┘  │  └──────────────┘   │  └──────────────────┘   │
│              │                     │                          │
│              │  [Assign Selected]  │  Competitions:           │
│              │                     │  • Competition 1         │
│              │                     │  • Competition 2         │
│              │                     │                          │
│              │                     │  [Delete Squad]          │
└──────────────┴─────────────────────┴──────────────────────────┘
```
**Use Case:** Wenn mehrere "Ziel-Container" existieren (z.B. Riegen)  
**Features:** 
- Master-List (Spalte 1): Auswahl des Ziel-Containers
- Available (Spalte 2): Items zum Zuweisen
- Detail (Spalte 3): Zugewiesene Items + Container-Details

**Layout 2: Single Column (GroupMembers Pattern)**
```
┌─────────────────────────────────────────────────────┐
│  Modal Title                              [X]       │
├─────────────────────────────────────────────────────┤
│  Zugewiesen (5)                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ ● Item A                           [Remove] │   │
│  │ ● Item B                           [Remove] │   │
│  │ ● Item C                           [Remove] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Verfügbar hinzufügen                              │
│  [Dropdown: Select item...        ▼] [Add]        │
│  oder                                              │
│  [Search: Type to search...]                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ ○ Item 1                          [Add]     │   │
│  │ ○ Item 2                          [Add]     │   │
│  │ ○ Item 3                          [Add]     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Layout 3: Inline Checkboxes (CompetitionForm Pattern)**
```
┌─────────────────────────────────────────────────────┐
│  Select Disciplines                                │
│  [Filter by group: All ▼]                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ ☑ Boden      [Max Score: 10.0]            │   │
│  │ ☐ Sprung     [Max Score: 10.0]            │   │
│  │ ☑ Barren     [Max Score: 10.0]            │   │
│  │ ☐ Reck       [Max Score: 10.0]            │   │
│  └─────────────────────────────────────────────┘   │
│  [Set all to: 10.0] [Apply]                       │
└─────────────────────────────────────────────────────┘
```

#### 3. Varianten-Matrix

| Feature | Two-Column | Three-Column (Master-Detail) | Single-Column | Inline-Checkboxes |
|---------|-----------|------------------------------|---------------|-------------------|
| Drag & Drop | ✅ Ja | ✅ Ja | ❌ Nein | ❌ Nein |
| Bulk-Actions | ✅ Ja | ✅ Ja | ⚠️ Optional | ✅ Ja |
| Search | ✅ Ja | ✅ Ja | ✅ Ja | ⚠️ Optional |
| Filters | ✅ Ja | ✅✅ Advanced | ⚠️ Limited | ✅ Ja |
| Additional Fields | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional | ✅ Ja |
| Multiple Containers | ❌ Nein | ✅✅ Ja (Master-List) | ❌ Nein | ❌ Nein |
| Container Details | ❌ Nein | ✅ Ja (Detail-Pane) | ❌ Nein | ❌ Nein |
| Best for | Simple 1:N | Complex M:N (Riegen) | Few items | Medium items |
| Complexity | Mittel | Hoch | Niedrig | Mittel |
| Use Case | Groups→Members | Squads→Participants | Event→Participant | Competition→Disciplines |

---

## 🏗️ Implementierungs-Roadmap

### Phase 1: Foundation (Woche 1-2)
**Ziel:** Core UnifiedAssignmentModal Component erstellen

**Tasks:**
1. ✅ Analyse der bestehenden Patterns (✅ DONE - dieses Dokument)
2. Create base `UnifiedAssignmentModal.tsx` component
3. Implement basic two-column layout
4. **Implement three-column layout (Master-Detail pattern for SquadManagement)**
5. Implement basic single-column layout
6. Add search functionality
7. Add basic filter support
8. Write comprehensive tests
9. Create Storybook stories

**Dateien:**
- `client/src/components/assignments/UnifiedAssignmentModal.tsx`
- `client/src/components/assignments/layouts/TwoColumnLayout.tsx`
- `client/src/components/assignments/layouts/ThreeColumnLayout.tsx` **(NEW!)**
- `client/src/components/assignments/layouts/SingleColumnLayout.tsx`
- `client/src/components/assignments/AssignmentList.tsx`
- `client/src/components/assignments/AssignmentItem.tsx`
- `client/src/components/assignments/AssignmentFilters.tsx`
- `client/src/components/assignments/MasterList.tsx` **(NEW - for 3-column)**
- `client/src/components/assignments/DetailPane.tsx` **(NEW - for 3-column)**
- `client/src/components/assignments/types.ts`

---

### Phase 2: Advanced Features (Woche 3-4)
**Ziel:** Erweiterte Funktionen implementieren

**Tasks:**
1. Implement drag & drop (react-dnd or dnd-kit)
2. Add bulk actions
3. Implement additional fields support
4. Add validation framework
5. Implement inline-checkboxes layout
6. Add custom renderers
7. Performance optimization (virtualization for large lists)

**Dateien:**
- `client/src/components/assignments/DragDropAssignment.tsx`
- `client/src/components/assignments/BulkActions.tsx`
- `client/src/components/assignments/AdditionalFields.tsx`

---

### Phase 3: Migration (Woche 5-8)
**Ziel:** Bestehende UIs auf neues System migrieren

**Priority Order:**

#### 3.1 Gruppen ↔ Teilnehmer (EINFACH - Start here!)
- ✅ Ähnlich zu bestehendem Pattern
- ✅ Kleine Komponente (263 Zeilen)
- ✅ Wenig Business-Logik
- **Effort:** ~2 Tage
- **Files:** `GroupMembersModal.tsx`

#### 3.2 Teilnehmer ↔ Veranstaltung (EINFACH)
- ✅ Klare Anforderungen
- ✅ Gute Code-Basis (172 Zeilen)
- **Effort:** ~2 Tage
- **Files:** `AddParticipantModal.tsx`

#### 3.3 Wettkämpfe ↔ Disziplinen (MITTEL)
- ⚠️ Zusätzliche Felder (maxScore)
- ⚠️ Komplexe Filterung
- ⚠️ Teil eines großen Modals (905 Zeilen - needs SoC anyway!)
- **Effort:** ~1 Woche
- **Files:** `CompetitionFormModal.tsx` (extract discipline assignment)

#### 3.4 Mannschaften ↔ Teilnehmer (NEU!)
- ⚠️ Komponente fehlt komplett
- ⚠️ Benötigt Backend-Route
- **Effort:** ~1 Woche
- **Files:** `components/TeamMembersModal.tsx` (NEW)

#### 3.5 Riegen ↔ Teilnehmer (KOMPLEX - Last!)
- ❌ Sehr große Datei (1070 Zeilen - CRITICAL SoC!)
- ❌ Viel Business-Logik
- ❌ Drag & Drop erforderlich
- ❌ Virtuelle Riegen-Konzept
- **Effort:** ~2 Wochen
- **Files:** `SquadManagement.tsx` (major refactoring)

---

### Phase 4: Documentation & Polish (Woche 9)
**Ziel:** Dokumentation und Feinschliff

**Tasks:**
1. Write comprehensive documentation
2. Create usage examples
3. Update developer guidelines
4. Create migration guide
5. Performance audit
6. Accessibility audit
7. Localization completion
8. User acceptance testing

---

## 📐 Technical Specifications

### Component Architecture

```
UnifiedAssignmentModal (Container)
├── AssignmentHeader
│   ├── Title
│   ├── SearchBar
│   └── FilterBar
├── AssignmentContent (Layout-specific)
│   ├── TwoColumnLayout
│   │   ├── AvailableList
│   │   │   ├── AssignmentItem[]
│   │   │   └── BulkActions
│   │   └── AssignedList
│   │       ├── AssignmentItem[]
│   │       └── BulkActions
│   ├── ThreeColumnLayout (NEW - Master-Detail)
│   │   ├── MasterList (Container Selection)
│   │   │   ├── ContainerItem[]
│   │   │   └── CreateButton
│   │   ├── AvailableList
│   │   │   ├── AssignmentItem[]
│   │   │   └── BulkActions
│   │   └── DetailPane (Selected Container)
│   │       ├── ContainerInfo
│   │       ├── AssignedList
│   │       │   └── AssignmentItem[]
│   │       └── ContainerActions
│   ├── SingleColumnLayout
│   │   ├── AssignedList
│   │   ├── DropdownSelector
│   │   └── AvailableList
│   └── InlineCheckboxLayout
│       ├── FilterRow
│       └── CheckboxGrid
└── AssignmentFooter
    ├── Stats
    └── Actions (Save/Cancel)
```

### State Management

```typescript
// Internal state
interface AssignmentState {
  // Data
  availableItems: AssignmentItem[];
  assignedItems: AssignmentItem[];
  
  // UI State
  searchTerm: string;
  filters: Record<string, any>;
  selectedAvailable: Set<number>;
  selectedAssigned: Set<number>;
  
  // Operation State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  // Drag & Drop (if enabled)
  draggedItem: AssignmentItem | null;
}

// Actions
type AssignmentAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER'; payload: { key: string; value: any } }
  | { type: 'SELECT_AVAILABLE'; payload: number[] }
  | { type: 'SELECT_ASSIGNED'; payload: number[] }
  | { type: 'ASSIGN_ITEMS'; payload: AssignmentItem[] }
  | { type: 'UNASSIGN_ITEMS'; payload: AssignmentItem[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
```

### API Contract

```typescript
// Backend-Seite standardisieren
interface AssignmentEndpoints {
  // Get available items (not yet assigned)
  getAvailable: (entityId: number, params?: Record<string, any>) => Promise<TItem[]>;
  
  // Get assigned items
  getAssigned: (entityId: number) => Promise<TItem[]>;
  
  // Assign single item
  assign: (entityId: number, itemId: number, data?: Record<string, any>) => Promise<void>;
  
  // Unassign single item
  unassign: (entityId: number, itemId: number) => Promise<void>;
  
  // Bulk assign (optional)
  bulkAssign?: (entityId: number, itemIds: number[], data?: Record<string, any>) => Promise<void>;
  
  // Bulk unassign (optional)
  bulkUnassign?: (entityId: number, itemIds: number[]) => Promise<void>;
}
```

---

## 🎯 Anwendungsbeispiele

### Beispiel 1: Gruppen ↔ Teilnehmer (Single-Column)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('groups.members.title', { name: group.name }),
    availableLabel: t('groups.members.available'),
    assignedLabel: t('groups.members.assigned'),
    searchPlaceholder: t('groups.members.searchPlaceholder'),
    
    displayMode: 'list',
    enableSearch: true,
    enableBulkActions: false,
    
    availableItems: availableParticipants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      badge: { text: p.gender, variant: 'info' }
    })),
    
    assignedItems: members.map(m => ({
      id: m.id,
      displayName: `${m.firstname} ${m.lastname}`,
      secondaryInfo: m.club
    })),
    
    onAssign: async (item) => {
      await apiPost(`/groups/${group.id}/members`, {
        participantId: item.id
      });
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/groups/${group.id}/members/${item.id}`);
    },
    
    filters: [
      {
        id: 'club',
        label: t('common.club'),
        type: 'select',
        options: clubOptions,
        filterFn: (item, value) => item.metadata?.clubId === value
      }
    ]
  }}
/>
```

### Beispiel 2: Riegen ↔ Teilnehmer (Three-Column Master-Detail)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('squadManagement.title'),
    availableLabel: t('squadManagement.available'),
    assignedLabel: t('squadManagement.assigned'),
    containerLabel: t('squadManagement.squads.label'),
    
    displayMode: 'three-column',
    enableSearch: true,
    enableBulkActions: true,
    enableDragDrop: true, // Future: drag from available to detail pane
    enableFilters: true,
    
    // Master List (Riegen)
    containers: squads.map(s => ({
      id: s.id,
      name: s.name,
      displayName: s.name,
      itemCount: s.participantCount,
      isVirtual: s.isVirtual,
      metadata: {
        competitions: s.competitions,
        hints: s.hints
      },
      badge: s.isVirtual ? {
        text: t('squadManagement.squads.virtual'),
        variant: 'warning'
      } : undefined
    })),
    
    selectedContainer: selectedSquad ? {
      id: selectedSquad.id,
      name: selectedSquad.name,
      displayName: selectedSquad.name,
      itemCount: selectedSquad.participantCount,
      metadata: selectedSquad
    } : null,
    
    onContainerSelect: (container) => {
      const squad = squads.find(s => s.id === container.id);
      setSelectedSquad(squad);
    },
    
    onContainerCreate: () => {
      setIsCreateModalOpen(true);
    },
    
    onContainerDelete: async (containerId) => {
      if (!window.confirm(t('squadManagement.confirmDelete'))) return;
      await apiDelete(`/squads/${containerId}`);
      await loadSquads();
    },
    
    // Available Items
    availableItems: filteredParticipants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      metadata: {
        firstname: p.firstname,
        lastname: p.lastname,
        gender: p.gender,
        birthYear: p.birthYear,
        competitions: p.competitions,
        competitionCount: p.competitionCount
      },
      badge: {
        text: p.gender,
        variant: 'info'
      }
    })),
    
    // Assigned Items (from selected container)
    assignedItems: selectedSquad?.participants.map(p => ({
      id: p.id,
      displayName: `${p.firstname} ${p.lastname}`,
      secondaryInfo: p.club,
      metadata: {
        competitions: p.competitions,
        gender: p.gender
      }
    })) || [],
    
    // Table columns for available/assigned lists
    columns: [
      {
        id: 'name',
        label: t('common.name'),
        render: (item) => item.displayName,
        sortable: true
      },
      {
        id: 'club',
        label: t('common.club'),
        render: (item) => item.secondaryInfo,
        sortable: true
      },
      {
        id: 'age',
        label: t('common.age'),
        render: (item) => {
          const age = new Date().getFullYear() - item.metadata.birthYear;
          return age;
        },
        sortable: true
      },
      {
        id: 'competitions',
        label: t('common.competitions'),
        render: (item) => (
          <span className="text-xs">
            {item.metadata.competitionCount || 0} {t('common.competitions')}
          </span>
        )
      }
    ],
    
    // Actions
    onAssign: async (item, containerId) => {
      if (!containerId) {
        alert(t('squadManagement.messages.selectSquadFirst'));
        return;
      }
      await apiPost('/squad-management/assign', {
        squadId: containerId,
        participantId: item.id,
        eventId: eventId
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/squad-management/unassign`, {
        params: { 
          participantId: item.id, 
          eventId: eventId 
        }
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    onBulkAssign: async (items, containerId) => {
      if (!containerId) {
        alert(t('squadManagement.messages.selectSquadFirst'));
        return;
      }
      await apiPost('/squad-management/bulk-assign', {
        squadId: containerId,
        participantIds: items.map(i => i.id),
        eventId: eventId
      });
      await forceLoadSquads();
      await loadAvailableParticipants();
    },
    
    // Filters
    filters: [
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          { value: 'male', label: t('gender.male') },
          { value: 'female', label: t('gender.female') }
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.metadata.gender === value;
        }
      },
      {
        id: 'competition',
        label: t('common.competition'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          ...allCompetitions.map(c => ({
            value: c.id.toString(),
            label: `${c.name} (Nr. ${c.number})`
          }))
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.metadata.competitions?.some(
            c => c.id.toString() === value
          );
        }
      },
      {
        id: 'club',
        label: t('common.club'),
        type: 'select',
        options: [
          { value: '', label: t('common.all') },
          ...allClubs.map(club => ({ value: club, label: club }))
        ],
        filterFn: (item, value) => {
          if (!value) return true;
          return item.secondaryInfo === value;
        }
      }
    ],
    
    // Custom render for container item (in master list)
    renderContainer: (container) => (
      <div className={`p-4 rounded-lg border cursor-pointer transition-colors ${
        selectedSquad?.id === container.id 
          ? 'border-blue-500 bg-blue-50' 
          : 'hover:border-gray-300'
      } ${container.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900">{container.displayName}</h4>
          {container.badge && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {container.badge.text}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {container.itemCount} {t('squadManagement.squads.participants')}
        </p>
        {container.metadata?.hints?.storage && (
          <p className="text-xs text-orange-600 mt-1">
            💾 {container.metadata.hints.storage}
          </p>
        )}
        {container.metadata?.competitions && (
          <div className="mt-2 flex flex-wrap gap-1">
            {container.metadata.competitions.slice(0, 2).map((comp, idx) => (
              <span 
                key={idx} 
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {comp.name} (Nr. {comp.number})
              </span>
            ))}
            {container.metadata.competitions.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                +{container.metadata.competitions.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    ),
    
    // Custom render for detail pane
    renderDetailPane: (container, items) => (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {t('squadManagement.squadDetails.info')}
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('common.name')}:</dt>
              <dd className="font-medium">{container.displayName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">{t('squadManagement.squads.participants')}:</dt>
              <dd className="font-medium">{items.length}</dd>
            </div>
            {container.metadata?.competitions && (
              <div>
                <dt className="text-gray-500 mb-1">{t('common.competitions')}:</dt>
                <dd className="space-y-1">
                  {container.metadata.competitions.map((comp, idx) => (
                    <div key={idx} className="text-xs bg-blue-50 px-2 py-1 rounded">
                      {comp.name} (Nr. {comp.number})
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
        
        {container.isVirtual && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-800">
              <strong>{t('squadManagement.virtualInfo.title')}</strong><br />
              {t('squadManagement.virtualInfo.description')}
            </p>
          </div>
        )}
      </div>
    ),
    
    validateAssignment: (item, containerId) => {
      if (!containerId) {
        return t('squadManagement.messages.selectSquadFirst');
      }
      // Add custom validation logic here
      return null;
    }
  }}
/>
```

**Key Features des Three-Column Layouts:**
- Master-List zeigt alle Container (Riegen) mit Metadaten
- Auswahl eines Containers lädt dessen zugewiesene Items in Detail-Pane
- Available-List zeigt filterbare Items zum Zuweisen
- Detail-Pane zeigt Container-Info + zugewiesene Items
- Bulk-Assignment an ausgewählten Container
- Custom Renderer für Container und Detail-Pane
- Unterstützt virtuelle Container (z.B. "Nicht zugeordnet")

---

### Beispiel 2b: Riegen ↔ Teilnehmer (Two-Column Simplified - Alternative)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('squadManagement.title'),
    availableLabel: t('squadManagement.available'),
    assignedLabel: t('squadManagement.assigned', { name: squad.name }),
    
    displayMode: 'table',
    enableSearch: true,
    enableBulkActions: true,
    enableDragDrop: true,
    enableFilters: true,
    
    columns: [
      {
        id: 'name',
        label: t('common.name'),
        render: (item) => `${item.metadata.firstname} ${item.metadata.lastname}`,
        sortable: true
      },
      {
        id: 'club',
        label: t('common.club'),
        render: (item) => item.secondaryInfo,
        sortable: true
      },
      {
        id: 'competitions',
        label: t('common.competitions'),
        render: (item) => (
          <span className="text-xs">
            {item.metadata.competitions?.join(', ')}
          </span>
        )
      }
    ],
    
    availableItems: availableParticipants,
    assignedItems: squadParticipants,
    
    onAssign: async (item) => {
      await apiPost('/squad-management/assign', {
        squadId: squad.id,
        participantId: item.id,
        eventId: eventId
      });
    },
    
    onUnassign: async (item) => {
      await apiDelete(`/squad-management/unassign`, {
        params: { participantId: item.id, eventId: eventId }
      });
    },
    
    onBulkAssign: async (items) => {
      await apiPost('/squad-management/bulk-assign', {
        squadId: squad.id,
        participantIds: items.map(i => i.id),
        eventId: eventId
      });
    },
    
    filters: [
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'select',
        options: [
          { value: 'männlich', label: t('gender.male') },
          { value: 'weiblich', label: t('gender.female') }
        ],
        filterFn: (item, value) => item.metadata.gender === value
      },
      {
        id: 'competition',
        label: t('common.competition'),
        type: 'select',
        options: competitionOptions,
        filterFn: (item, value) => 
          item.metadata.competitions?.includes(value)
      }
    ]
  }}
/>
```

### Beispiel 3: Wettkämpfe ↔ Disziplinen (Inline-Checkboxes)

```typescript
<UnifiedAssignmentModal
  isOpen={isOpen}
  onClose={onClose}
  config={{
    title: t('competitions.selectDisciplines'),
    
    displayMode: 'checkbox-grid',
    enableSearch: false,
    enableFilters: true,
    
    availableItems: disciplines.map(d => ({
      id: d.id,
      displayName: d.name,
      metadata: {
        maleAllowed: d.male_allowed,
        femaleAllowed: d.female_allowed,
        groupId: d.groupId
      }
    })),
    
    assignedItems: formData.disciplines.map(d => ({
      id: d.disciplineId,
      displayName: d.name,
      metadata: { maxScore: d.maxScore }
    })),
    
    additionalFields: [
      {
        id: 'maxScore',
        label: t('competitions.maxScore'),
        type: 'number',
        required: true,
        defaultValue: 10.0,
        validate: (value) => {
          if (value <= 0) return t('competitions.maxScoreMustBePositive');
          if (value > 100) return t('competitions.maxScoreTooHigh');
          return null;
        }
      }
    ],
    
    onAssign: async (item) => {
      // Inline: update formData directly
      setFormData(prev => ({
        ...prev,
        disciplines: [
          ...prev.disciplines,
          { disciplineId: item.id, maxScore: item.metadata.maxScore }
        ]
      }));
    },
    
    onUnassign: async (item) => {
      setFormData(prev => ({
        ...prev,
        disciplines: prev.disciplines.filter(d => d.disciplineId !== item.id)
      }));
    },
    
    filters: [
      {
        id: 'group',
        label: t('disciplines.group'),
        type: 'select',
        options: disciplineGroupOptions,
        filterFn: (item, value) => item.metadata.groupId === value
      },
      {
        id: 'gender',
        label: t('common.gender'),
        type: 'checkbox',
        filterFn: (item, value) => {
          if (value === 'male') return item.metadata.maleAllowed;
          if (value === 'female') return item.metadata.femaleAllowed;
          return true;
        }
      }
    ],
    
    validateAssignment: (item) => {
      // Example: Check gender compatibility
      if (formData.gender === 'männlich' && !item.metadata.maleAllowed) {
        return t('competitions.disciplineNotAllowedForGender');
      }
      return null;
    }
  }}
/>
```

---

## 🚀 Benefits der Vereinheitlichung

### Für Entwickler
- ✅ **Code Reuse:** ~70% weniger Code für neue Zuweisungen
- ✅ **Consistency:** Einheitliches Pattern für alle Zuweisungen
- ✅ **Maintainability:** Eine Komponente statt 6+ verschiedene
- ✅ **Type Safety:** Generische TypeScript Interfaces
- ✅ **Testing:** Einmal testen, überall nutzen
- ✅ **SoC:** Separation of Concerns - kleine, fokussierte Komponenten

### Für Benutzer
- ✅ **Consistency:** Gleiche Bedienung überall
- ✅ **Lernkurve:** Einmal lernen, überall anwenden
- ✅ **Features:** Alle Zuweisungen erhalten gleiche Features (Search, Filter, etc.)
- ✅ **Performance:** Optimiert und virtualisiert
- ✅ **Accessibility:** Einheitliche A11y-Standards

### Für Projekt
- ✅ **Velocity:** Schnellere Entwicklung neuer Features
- ✅ **Quality:** Höhere Code-Qualität durch Wiederverwendung
- ✅ **Maintenance:** Einfachere Wartung
- ✅ **Scalability:** Leicht erweiterbar für neue Zuweisungstypen

---

## ⚠️ Risiken & Herausforderungen

### Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Zu generisch → schwer verwendbar | Mittel | Hoch | Iteratives Design, User Testing |
| Performance bei vielen Items | Mittel | Mittel | Virtualisierung (react-window) |
| Drag & Drop Kompatibilität | Niedrig | Mittel | Bewährte Libraries (dnd-kit) |
| Rückwärts-Kompatibilität | Niedrig | Niedrig | Schrittweise Migration |
| Over-Engineering | Mittel | Mittel | Start simple, add features as needed |

### Organisatorische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|---------|------------|
| Zu lange Entwicklungszeit | Mittel | Hoch | Phased Approach, MVP first |
| User Acceptance | Niedrig | Hoch | Early User Testing, Beta-Phase |
| Breaking Changes | Niedrig | Mittel | Feature Flags, Parallel Running |

---

## 📊 Effort Estimation

### Development Effort (Person-Days)

| Phase | Tasks | Effort | Priority |
|-------|-------|--------|----------|
| **Phase 1: Foundation** | Base Component + 3 Layouts | 12 Tage | 🔴 Critical |
| **Phase 2: Advanced** | Drag & Drop, Bulk, Fields | 10 Tage | 🟡 High |
| **Phase 3.1: Gruppen** | Migration | 2 Tage | 🟡 High |
| **Phase 3.2: Event** | Migration | 2 Tage | 🟡 High |
| **Phase 3.3: Competitions** | Migration + SoC | 5 Tage | 🟢 Medium |
| **Phase 3.4: Teams** | New Component | 5 Tage | 🟢 Medium |
| **Phase 3.5: Squads** | Migration + Heavy SoC (3-col layout!) | 12 Tage | 🔵 Low |
| **Phase 4: Polish** | Documentation, Testing | 5 Tage | 🟡 High |
| **TOTAL** | | **53 Tage** | |

**Estimated Timeline:** ~11 Wochen (bei 1 Entwickler, full-time)

**Note:** Phase 3.5 (Squads) benötigt mehr Zeit aufgrund des komplexen 3-Spalten Master-Detail Patterns.

---

## 🎯 Success Criteria

### Must-Have (MVP)
- [ ] UnifiedAssignmentModal base component funktioniert
- [ ] Two-Column Layout implementiert
- [ ] Single-Column Layout implementiert
- [ ] Search funktioniert
- [ ] Basic filtering funktioniert
- [ ] Mindestens 2 Zuweisungen migriert (Gruppen + Event)
- [ ] Tests geschrieben (>80% coverage)
- [ ] Dokumentation vorhanden

### Should-Have
- [ ] Drag & Drop funktioniert
- [ ] Bulk actions funktioniert
- [ ] Inline-Checkboxes Layout
- [ ] Additional fields support
- [ ] 4 von 6 Zuweisungen migriert
- [ ] Performance optimiert (virtualization)
- [ ] Accessibility audit passed

### Nice-to-Have
- [ ] Alle 6 Zuweisungen migriert
- [ ] Custom renderers support
- [ ] Advanced validation
- [ ] Keyboard shortcuts
- [ ] Undo/Redo functionality
- [ ] Export/Import functionality

---

## 📝 Next Steps

### Immediate Actions (Diese Woche)

1. **Review & Approval** 
   - Review dieses Konzept
   - Feedback einholen
   - Prioritäten validieren

2. **Technical Spike**
   - Prototyp einer einfachen UnifiedAssignmentModal
   - Test mit GroupMembersModal-Daten
   - Performance-Tests mit großen Datenmengen

3. **Team Alignment**
   - Entwickler informieren
   - Code Review Guidelines anpassen
   - Migration Plan kommunizieren

### Short-Term (Nächste 2 Wochen)

1. Start Phase 1 Development
2. Create base component structure
3. Implement first layout (Single-Column)
4. Write initial tests
5. Create Storybook stories

### Mid-Term (Nächste 4 Wochen)

1. Complete Phase 1 & 2
2. Start Phase 3 migrations (Gruppen, Event)
3. Gather user feedback
4. Iterate on design

### Long-Term (Nächste 8 Wochen)

1. Complete all migrations
2. Full documentation
3. Performance optimization
4. Production deployment
5. Legacy code cleanup

---

## 📚 Related Documents

- `API_ROUTE_MISMATCHES.md` - Field mapping conventions
- `FRONTEND_SERVING_IMPLEMENTATION.md` - Deployment patterns
- `PRIORITY_FIXES_LOG.md` - Historical fixes
- `.github/copilot-instructions.md` - Development guidelines
- `client/src/components/templates/EventManagementTemplate.tsx` - Template pattern

---

## ✅ Conclusion

Die Vereinheitlichung der Zuweisungs-UIs ist ein wichtiger Schritt zur Verbesserung der Code-Qualität und Benutzererfahrung. Mit einem klaren, phasenweisen Ansatz können wir:

1. **Reduktion der Code-Duplikation** um ~70%
2. **Konsistente UX** für alle Zuweisungen
3. **Schnellere Entwicklung** neuer Features
4. **Bessere Wartbarkeit** durch SoC

**Empfehlung:** Start mit Phase 1 (Foundation) und Phase 3.1 (Gruppen-Migration) als Proof of Concept.

---

**Autor:** GitHub Copilot  
**Datum:** 2025-11-10  
**Version:** 1.0  
**Status:** ✅ Ready for Review
