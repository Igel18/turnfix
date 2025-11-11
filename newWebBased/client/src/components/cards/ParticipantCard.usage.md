# ParticipantCard Component - Usage Guide

## Overview

`ParticipantCard` is a standardized, reusable component for displaying participant information across the application. It ensures consistent layout and appearance for all participant cards.

## Design Pattern: Separation of Concerns (SoC)

**Problem**: Multiple pages (Groups, Squads, EventParticipants, Participants) were rendering participant information with inconsistent layouts and duplicate code.

**Solution**: Centralized `ParticipantCard` component with:
- ✅ Consistent Name/Age/Gender layout
- ✅ Localized gender badge
- ✅ Optional action button slot
- ✅ Highlight and compact modes
- ✅ Flexible data transformation

## Standard Layout

```
┌────────────────────────────────────────┐
│ Max Mustermann              [Action]   │
│ 14 J. • ♂                              │
│ TV Beispiel (optional)                 │
└────────────────────────────────────────┘
```

**Elements**:
1. **Name** (large, bold) - First + Last name or fallback
2. **Age • Gender Badge** - Age in years + localized gender icon
3. **Additional Info** - Optional club name or custom text
4. **Action Button** - Optional slot for assign/remove buttons

## Usage

### Basic Usage

```tsx
import { ParticipantCard, toParticipantCardData } from '@/components/cards';

// Simple participant card
<ParticipantCard
  participant={{
    id: 1,
    firstName: 'Max',
    lastName: 'Mustermann',
    age: 14,
    gender: 1, // 1=male, 2=female
    clubName: 'TV Beispiel'
  }}
/>
```

### With Action Button

```tsx
import { ArrowRight } from 'lucide-react';

<ParticipantCard
  participant={participant}
  actionButton={
    <button
      onClick={() => handleAssign(participant.id)}
      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
    >
      <ArrowRight className="w-4 h-4" />
    </button>
  }
/>
```

### Highlighted & Compact Modes

```tsx
// Highlighted (e.g., selected or featured)
<ParticipantCard
  participant={participant}
  isHighlighted={true}
/>

// Compact (smaller padding/text)
<ParticipantCard
  participant={participant}
  compact={true}
/>
```

### Data Transformation

The `toParticipantCardData()` utility handles various data formats:

```tsx
import { toParticipantCardData } from '@/components/cards';

// From Groups data
const groupMember = {
  id: 1,
  firstName: 'Max',
  lastName: 'Mustermann',
  age: 14,
  gender: 1,
  clubName: 'TV Beispiel'
};
const cardData = toParticipantCardData(groupMember);

// From Participants API (snake_case)
const participant = {
  int_teilnehmerid: 1,
  var_vorname: 'Max',
  var_nachname: 'Mustermann',
  int_geschlecht: 1,
  verein_name: 'TV Beispiel'
};
const cardData = toParticipantCardData(participant);

// From EventParticipants (mixed format)
const eventParticipant = {
  id: 1,
  firstname: 'Max',
  lastname: 'Mustermann',
  age: 14,
  gender: 1
};
const cardData = toParticipantCardData(eventParticipant);
```

## Integration Points

### 1. Groups - Available Participants List

**File**: `client/src/pages/Groups/index.tsx`  
**Location**: UnifiedAssignmentModal → AvailableList

Used in Groups page to display available participants for assignment to groups.

```tsx
// AvailableList automatically detects participant items
// and renders ParticipantCard with assign button
<UnifiedAssignmentModal
  availableItems={availableParticipants}
  // ...
/>
```

### 2. Squads - Available Participants List

**File**: `client/src/pages/SquadManagement/index.tsx`  
**Location**: UnifiedAssignmentModal → AvailableList

Currently shows competitions (not participants), but ready for future participant support.

### 3. EventParticipants - Available Athletes

**File**: `client/src/pages/EventParticipants/index.tsx`  
**Location**: Custom rendering (can be migrated)

Can be migrated to use ParticipantCard for consistent display.

### 4. Participants - Grid View (Future)

**File**: `client/src/pages/ParticipantsUnified.tsx`  
**Location**: DatabaseManagementTemplate → renderCard

Can replace custom card rendering with ParticipantCard:

```tsx
const renderCard = (participant: Participant) => {
  return (
    <ParticipantCard
      participant={toParticipantCardData(participant)}
      actionButton={
        <UnifiedActionButtons
          onEdit={() => handleEdit(participant)}
          onDelete={() => handleDelete(participant.int_teilnehmerid)}
        />
      }
    />
  );
};
```

## Auto-Detection in AvailableList

`AvailableList` automatically detects participant items and renders `ParticipantCard`:

```tsx
function isParticipantItem(item: any): boolean {
  return !!(
    (item.firstName || item.firstname || item.var_vorname) ||
    (item.lastName || item.lastname || item.var_nachname) ||
    item.age !== undefined ||
    (item.gender !== undefined || item.int_geschlecht !== undefined)
  );
}

// In AvailableList render:
if (isParticipantItem(item)) {
  return <ParticipantCard participant={toParticipantCardData(item)} />;
}
// Otherwise: render generic card
```

## Props Interface

```typescript
interface ParticipantCardData {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;        // Fallback if firstName/lastName not available
  age?: number;
  gender?: number;      // int_geschlecht format (1=male, 2=female)
  clubName?: string;
  additionalInfo?: string; // Optional additional line
}

interface ParticipantCardProps {
  participant: ParticipantCardData;
  actionButton?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  isHighlighted?: boolean;
  compact?: boolean;
}
```

## Styling

**Highlighted State**:
- Blue border (2px)
- Blue background (blue-50)
- Shadow + ring
- Blue text

**Hover State** (non-highlighted):
- Border color changes (gray-300)
- Subtle shadow

**Compact Mode**:
- Smaller padding (p-2 instead of p-3)
- Smaller text (text-sm/text-xs instead of text-base/text-sm)

## Gender Badge Integration

Uses existing `GenderBadge` component:
- ♂ (male) - Blue badge
- ♀ (female) - Pink badge
- Localized via i18n

## Benefits

✅ **Consistency**: Same layout across all pages  
✅ **Maintainability**: One component to update  
✅ **Flexibility**: Supports multiple data formats  
✅ **Type-safe**: TypeScript interfaces  
✅ **Reusable**: Action button slot for any purpose  
✅ **Accessible**: Semantic HTML, proper ARIA attributes  
✅ **Performance**: Lightweight, no unnecessary re-renders

## Future Enhancements

- [ ] Add photo/avatar support
- [ ] Add badge for special roles (e.g., team captain)
- [ ] Add tooltip with full participant details
- [ ] Add keyboard navigation support
- [ ] Add drag-and-drop support for reordering

## Example: Groups Page

**Before** (custom rendering in config):
```tsx
getAvailableMetadata: (participant) => {
  const parts = [];
  if (participant.clubName) parts.push(participant.clubName);
  if (participant.gender) parts.push(t(`common.gender.${participant.gender}`));
  if (participant.age) parts.push(t('common.years', { count: participant.age }));
  return { subtitle: parts.join(' • '), tags: [] };
}
```

**After** (automatic with ParticipantCard):
```tsx
// No config needed! AvailableList auto-detects and renders ParticipantCard
// with Name, Age badge, Gender badge in consistent layout
```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { ParticipantCard } from '@/components/cards';

test('renders participant name and age', () => {
  render(
    <ParticipantCard
      participant={{
        id: 1,
        firstName: 'Max',
        lastName: 'Mustermann',
        age: 14,
        gender: 1
      }}
    />
  );
  
  expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
  expect(screen.getByText('14 J.')).toBeInTheDocument();
});
```

---

**Created**: 2025-11-11  
**Version**: 1.0  
**Component**: `client/src/components/cards/ParticipantCard.tsx`
