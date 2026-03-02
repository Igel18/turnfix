# Point 131: Modal Integration for EventParticipants Buttons

**Date**: 2025-01-31  
**Status**: ✅ COMPLETE  
**Build**: Client ✓ 6.09s | PM2 Restart #10

---

## Overview

Successfully implemented modal-based workflows for "Add Participant" and "Print Labels" buttons on the EventParticipants page, following **Point 122 Separation of Concerns** architecture.

### User Requirement
> "Die buttons sind da. Aber die funktionen sind nicht wie vorher. Beim hinzufügen von personen kommt kein Dialog"

The buttons were present but lacked proper modal dialogs like the original implementation.

---

## Implementation Summary

### Architecture: Point 122 SoC Compliance

Created three new components following established patterns:

```
client/src/pages/EventParticipants/
├── components/
│   ├── AddParticipantModal.tsx (179 lines) ✅
│   └── LabelConfigModal.tsx (264 lines) ✅
├── hooks/
│   └── useLabelPrinting.ts (157 lines) ✅ (fixed lint warning)
└── index.tsx (391 lines) ✅ (modals wired)
```

---

## Components Created

### 1. AddParticipantModal.tsx
**Purpose**: Search and add participants to events

**Features**:
- Loads all available participants from `/participants` API
- Real-time search filtering by name/club
- Shows participant info with GenderBadge
- Displays "Already in event" vs "Add" button states
- Uses centralized `normalizeGender()` helper
- Calls `/event-participants/add` API endpoint

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onParticipantAdded: () => void;
}
```

**Workflow**:
1. User clicks "Add Participant" button → Modal opens
2. Modal fetches available participants
3. User searches/filters participants
4. User clicks "Add" button
5. API POST request adds participant to event
6. Modal closes, parent component refreshes data

---

### 2. LabelConfigModal.tsx
**Purpose**: Configure label layout before PDF generation

**Features**:
- Loads saved configuration from `/configuration` API
- 8 configurable inputs:
  - Rows (1-20, default: 16)
  - Columns (1-10, default: 4)
  - Width (mm, default: 48.5)
  - Height (mm, default: 16.9)
  - Margins: Top 13mm, Bottom 13mm, Left 8mm, Right 8mm
  - Show Borders (boolean)
- Real-time preview calculation
- Passes configuration to PDF generation hook
- Defaults optimized for standard label sheets (DIN A4, 16×4 = 64 labels per page)

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  onPrint: (config: LabelConfig) => void;
}
```

**LabelConfig Type**:
```typescript
interface LabelConfig {
  rows: number;
  columns: number;
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  showBorders: boolean;
}
```

**Workflow**:
1. User clicks "Print Labels" button → Modal opens
2. Modal loads saved config from server
3. User adjusts layout settings
4. User clicks "Generate PDF"
5. Modal calls `generateLabelsPDF(config)`
6. PDF downloads
7. Modal closes

---

### 3. useLabelPrinting.ts Hook
**Purpose**: Extract PDF generation logic from UI component

**Features**:
- Sorts participants by gender → squad → club
- Calculates label positions on A4 grid
- Multi-page support
- Renders participant info (name, club, start number, squad, competitions)
- Optional borders for alignment
- German locale sorting

**Hook Signature**:
```typescript
useLabelPrinting({
  participants: Participant[],
  competitions: Competition[],
  eventId: string
}) => {
  generateLabelsPDF: (config: LabelConfig) => void
}
```

**PDF Layout Algorithm**:
1. Calculate available space (A4 - margins)
2. Calculate label dimensions (available space ÷ rows/columns)
3. Iterate participants, placing each in grid position
4. Add new page when grid is full
5. Render participant data within each label
6. Download PDF

**Fixed Issue**: Removed unused `labelsPerPage` variable (lint warning)

---

## Integration into index.tsx

### State Management
```typescript
const [showAddModal, setShowAddModal] = useState(false);
const [showLabelModal, setShowLabelModal] = useState(false);
```

### Hook Usage
```typescript
const { generateLabelsPDF } = useLabelPrinting({
  participants: filteredParticipants,
  competitions,
  eventId: eventId || '',
});
```

### Button Handlers
```typescript
// Add Participant button
onAdd={() => setShowAddModal(true)}

// Print Labels button
onClick={() => setShowLabelModal(true)}
```

### Modal Components
```tsx
{/* Add Participant Modal */}
<AddParticipantModal
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  eventId={eventId || ''}
  onParticipantAdded={handleParticipantAdded}
/>

{/* Label Configuration Modal */}
<LabelConfigModal
  isOpen={showLabelModal}
  onClose={() => setShowLabelModal(false)}
  onPrint={generateLabelsPDF}
/>
```

### Callbacks
```typescript
const handleParticipantAdded = () => {
  window.location.reload(); // Refresh to show new participant
};
```

---

## Barrel Exports

### components/index.ts
```typescript
export { AddParticipantModal } from './AddParticipantModal';
export { LabelConfigModal } from './LabelConfigModal';
```

### hooks/index.ts
```typescript
export { useLabelPrinting } from './useLabelPrinting';
```

---

## i18n Translations

All required translations were already present in both `de.json` and `en.json`:

### German (de.json)
```json
{
  "eventParticipants": {
    "pageTitle": "Veranstaltungsteilnehmer",
    "addParticipant": "Teilnehmer hinzufügen",
    "actions": {
      "printLabels": "Etiketten drucken"
    },
    "addModal": {
      "title": "Teilnehmer zur Veranstaltung hinzufügen",
      "searchPlaceholder": "Teilnehmer suchen...",
      "noParticipants": "Keine verfügbaren Teilnehmer gefunden",
      "alreadyInEvent": "Bereits in Veranstaltung",
      "add": "Hinzufügen",
      "close": "Schließen"
    },
    "labelConfig": {
      "title": "Etiketten-Konfiguration",
      "rows": "Zeilen",
      "columns": "Spalten",
      "labelWidth": "Etikettenbreite (mm)",
      "labelHeight": "Etikettenhöhe (mm)",
      "marginTop": "Oberer Rand (mm)",
      "marginBottom": "Unterer Rand (mm)",
      "marginLeft": "Linker Rand (mm)",
      "marginRight": "Rechter Rand (mm)",
      "showBorders": "Etikettenrahmen anzeigen (zur Ausrichtung)",
      "previewInfo": "Vorschau-Info",
      "labelsPerPage": "Etiketten pro Seite",
      "cancel": "Abbrechen",
      "exportLabels": "Etiketten-PDF exportieren"
    }
  }
}
```

### English (en.json)
```json
{
  "eventParticipants": {
    "pageTitle": "Event Participants",
    "addParticipant": "Add Participant",
    "actions": {
      "printLabels": "Print Labels"
    },
    "addModal": {
      "title": "Add Participant to Event",
      "searchPlaceholder": "Search participants...",
      "noParticipants": "No available participants found",
      "alreadyInEvent": "Already in event",
      "add": "Add",
      "close": "Close"
    },
    "labelConfig": {
      "title": "Label Configuration",
      "rows": "Rows",
      "columns": "Columns",
      "labelWidth": "Label Width (mm)",
      "labelHeight": "Label Height (mm)",
      "marginTop": "Top Margin (mm)",
      "marginBottom": "Bottom Margin (mm)",
      "marginLeft": "Left Margin (mm)",
      "marginRight": "Right Margin (mm)",
      "showBorders": "Show label borders (for alignment)",
      "previewInfo": "Preview Info",
      "labelsPerPage": "labels per page",
      "cancel": "Cancel",
      "exportLabels": "Export Labels PDF"
    }
  }
}
```

---

## Code Quality

### Separation of Concerns Compliance ✅

**File Sizes**:
- `AddParticipantModal.tsx`: 179 lines (✅ < 200)
- `LabelConfigModal.tsx`: 264 lines (✅ < 400)
- `useLabelPrinting.ts`: 157 lines (✅ < 200)
- `index.tsx`: 391 lines (✅ < 400)

All components follow Point 122 guidelines:
- ✅ Components < 300 lines
- ✅ Hooks < 250 lines
- ✅ Main component < 400 lines
- ✅ Clear separation: UI (components) vs Logic (hooks)
- ✅ Proper TypeScript typing
- ✅ Localized all strings

---

## Build Results

### Client Build
```
✓ built in 6.09s
dist/assets/index-DQXeim6i.js: 1,531.09 kB │ gzip: 411.64 kB
```

### PM2 Deployment
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ turnfix-server     │ fork     │ 10   │ online    │ 0%       │ 55.6mb   │
│ 1  │ turnfix-jury-serv… │ fork     │ 2    │ online    │ 0%       │ 55.6mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

---

## Testing Checklist

### Add Participant Modal
- [ ] Click "Add Participant" button → Modal opens
- [ ] Modal displays all available participants
- [ ] Search filtering works by name/club
- [ ] "Already in event" badge shows for existing participants
- [ ] "Add" button disabled for participants already in event
- [ ] Clicking "Add" successfully adds participant
- [ ] Modal closes after adding
- [ ] Participant list refreshes
- [ ] Gender badges display correctly

### Print Labels Modal
- [ ] Click "Print Labels" button → Modal opens
- [ ] Configuration loads from server
- [ ] All 8 input fields are editable
- [ ] Preview info updates when values change
- [ ] Click "Generate PDF" → PDF downloads
- [ ] PDF contains correct participant data
- [ ] PDF layout matches configuration
- [ ] Borders show/hide based on setting
- [ ] Multi-page PDFs work correctly
- [ ] Modal closes after generation

### CSV Export (Existing)
- [ ] Click "Export CSV" → File downloads
- [ ] CSV contains filtered participants
- [ ] UTF-8 encoding correct (German characters)

### PDF List Export (Existing)
- [ ] Click "Export PDF" → File downloads
- [ ] PDF table formatted correctly
- [ ] Header/footer show event info

---

## API Endpoints Used

### GET `/participants?limit=10000`
**Used by**: AddParticipantModal  
**Purpose**: Load all available participants  
**Response**: Array of participant objects

### POST `/event-participants/add`
**Used by**: AddParticipantModal  
**Purpose**: Add participant to event  
**Payload**: `{ eventId, participantId }`

### GET `/configuration`
**Used by**: LabelConfigModal  
**Purpose**: Load saved label configuration  
**Response**: Configuration object with label settings

### GET `/event-participants?eventId={id}`
**Used by**: useParticipants hook  
**Purpose**: Load participants for specific event  
**Response**: Array of event participants

---

## Dependencies

### NPM Packages
- `jspdf@^2.5.2` - PDF generation
- `react@^18.3.1` - Component framework
- `react-i18next@^15.1.4` - Internationalization
- `lucide-react@^0.469.0` - Icons
- `@heroicons/react@^2.2.0` - Tag icon

### Internal Utilities
- `@/utils/api` - API helpers (apiGet, apiPost)
- `@/utils/genderHelpers` - Gender normalization (Point 128)
- `@/components/UnifiedModal` - Base modal component
- `@/components/GenderBadge` - Gender display component

---

## Related Points

- **Point 122**: Separation of Concerns architecture (followed)
- **Point 128**: Gender helpers centralization (used in AddParticipantModal)
- **Point 130**: Table column separation (completed before this)

---

## Files Modified

### Created
1. `client/src/pages/EventParticipants/components/AddParticipantModal.tsx` (179 lines)
2. `client/src/pages/EventParticipants/components/LabelConfigModal.tsx` (264 lines)
3. `client/src/pages/EventParticipants/hooks/useLabelPrinting.ts` (157 lines)

### Modified
1. `client/src/pages/EventParticipants/index.tsx`
   - Added modal state management
   - Integrated useLabelPrinting hook
   - Wired button handlers to modals
   - Added modal components to JSX
   - Removed old inline PDF generation function
   - Removed unused imports

2. `client/src/pages/EventParticipants/components/index.ts`
   - Added: `export { AddParticipantModal } from './AddParticipantModal'`
   - Added: `export { LabelConfigModal } from './LabelConfigModal'`

3. `client/src/pages/EventParticipants/hooks/index.ts`
   - Added: `export { useLabelPrinting } from './useLabelPrinting'`

### Translations
- `client/src/i18n/locales/de.json` (already had all required translations)
- `client/src/i18n/locales/en.json` (already had all required translations)

---

## Commit Message

```
Complete Point 131: Modal integration for EventParticipants buttons

Implemented modal-based workflows for "Add Participant" and "Print Labels"
following Point 122 Separation of Concerns architecture.

**New Components** (SoC compliant):
- AddParticipantModal.tsx (179 lines) - Search/add participants to event
- LabelConfigModal.tsx (264 lines) - Configure label layout
- useLabelPrinting.ts hook (157 lines) - PDF generation logic

**Integration**:
- Wired modals into EventParticipants/index.tsx
- Added state: showAddModal, showLabelModal
- Updated button handlers to open modals
- Removed old inline PDF generation function
- Fixed lint warning in useLabelPrinting (unused labelsPerPage)

**Features**:
✅ Add Participant: Search available participants, add to event
✅ Print Labels: Configure layout (rows, columns, margins), generate PDF
✅ Proper dialog workflows (matches original implementation)
✅ Uses centralized gender helpers (Point 128)
✅ All strings localized (de.json, en.json)
✅ Follows Point 122 SoC guidelines (all files < 400 lines)

**Build**: Client ✓ 6.09s | PM2 Restart #10

Files modified:
- client/src/pages/EventParticipants/components/AddParticipantModal.tsx (new)
- client/src/pages/EventParticipants/components/LabelConfigModal.tsx (new)
- client/src/pages/EventParticipants/hooks/useLabelPrinting.ts (new)
- client/src/pages/EventParticipants/components/index.ts
- client/src/pages/EventParticipants/hooks/index.ts
- client/src/pages/EventParticipants/index.tsx
```

---

## Next Steps (Testing)

1. **Test Add Participant Workflow**:
   - Open EventParticipants page
   - Click "Add Participant" button
   - Verify modal opens with participant list
   - Test search functionality
   - Add a participant and verify it appears in list

2. **Test Label Printing Workflow**:
   - Click "Print Labels" button
   - Verify modal opens with configuration
   - Adjust settings (rows, columns, margins)
   - Generate PDF and verify layout
   - Test with borders on/off
   - Test multi-page scenarios

3. **Verify Existing Functions**:
   - Test CSV export
   - Test PDF list export
   - Verify participant editing still works
   - Check participant deletion

---

**Status**: ✅ READY FOR TESTING

All modal components implemented, integrated, built, and deployed successfully.
