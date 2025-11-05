# Point 33: Sortable Table Headers Implementation Guide

## Overview
Add click-to-sort functionality to all table headers across all UIs with visual indicators (arrows) for ascending/descending sort order.

## Created Components

### 1. SortableTableHeader Component
**Location:** `client/src/components/SortableTableHeader.tsx`

**Features:**
- Click-to-sort functionality
- Visual indicators (↑ ↓) for sort direction
- Hover state showing sort availability
- Blue color for active sort column
- Gray hover icons for sortable but inactive columns

**Props:**
- `label`: Header text to display
- `sortKey`: Key to use for sorting data
- `currentSortKey`: Currently active sort key
- `currentSortDirection`: Current direction ('asc' | 'desc')
- `onSort`: Callback when header is clicked
- `className`: Additional CSS classes
- `sortable`: Whether header is sortable (default: true)

### 2. useTableSort Hook
**Location:** `client/src/components/SortableTableHeader.tsx`

**Features:**
- Manages sort state (key and direction)
- Toggle direction when clicking same column
- Switch to new column with ascending default
- `sortData()` function for sorting arrays

**API:**
```typescript
const { sortKey, sortDirection, handleSort, sortData } = useTableSort();
```

**sortData() Features:**
- Handles null/undefined values
- Case-insensitive string comparison
- Number comparison
- Date comparison
- Locale-aware sorting
- Custom value extraction via `getValueFn`

## Implementation Example

### Basic Usage (DisciplinesUnified.tsx)

```typescript
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';

function DisciplinesUnified() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort();
  
  // Apply sorting to data before filtering/pagination
  const sortedDisciplines = sortData(disciplines);
  
  // Then apply search filter
  const filteredDisciplines = sortedDisciplines.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label={t('disciplines.table.name')}
        sortKey="name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('disciplines.table.shortName')}
        sortKey="short_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('disciplines.table.sport')}
        sortKey="sport_id"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      {/* Non-sortable header */}
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  );
}
```

### Advanced Usage with Custom Value Extraction

```typescript
// For nested properties or computed values
const sortedData = sortData(data, (item, key) => {
  if (key === 'sport') {
    return item.sport?.var_name || '';
  }
  if (key === 'age') {
    return calculateAge(item.birthdate);
  }
  return item[key];
});
```

## Pages to Update

### High Priority (Core Data Management)
1. ✅ **DisciplinesUnified** - Name, Short Name, Sport, Gender, Formula
2. **ParticipantsUnified** - Name, Age, Gender, Club, Region
3. **ClubsUnified** - Club Name, Region, Contact, Athletes Count
4. **EventsUnified** - Event Name, Dates, Location, Participants
5. **CertificateLayouts** - Layout Name, Comment, Fields Count, Status

### Medium Priority (Event Management)
6. **EventParticipants** - Name, Squad, Start Number, Age, Club
7. **FormulasUnified** - Formula Name, Type, Code, Usage Count
8. **DisciplineFieldsUnified** - Field Name, Discipline, Sort Order, Group
9. **StatusManagement** - Status Name, Color, Usage

### Low Priority (Supporting Data)
10. **Associations** - Name, Abbreviation, Country
11. **Regions** - Name, Abbreviation, Association
12. **Persons** - Name, Email, City, Role
13. **Sports** - Name, Disciplines Count
14. **Locations** - Name, City, Address

## Implementation Checklist

For each page:

- [ ] Import `SortableTableHeader` and `useTableSort`
- [ ] Add `useTableSort()` hook call
- [ ] Apply `sortData()` to data BEFORE filtering/searching
- [ ] Replace `<th>` elements with `<SortableTableHeader>`
- [ ] Keep non-sortable columns (like Actions) as regular `<th>`
- [ ] Test sorting with:
  - [ ] Strings (case-insensitive)
  - [ ] Numbers
  - [ ] Dates
  - [ ] Null/undefined values
  - [ ] Different locales (German ü, ö, ä, ß)

## Best Practices

1. **Sort Before Filter/Search:**
   ```typescript
   const sorted = sortData(rawData);
   const filtered = sorted.filter(...);
   const paginated = getPaginated(filtered);
   ```

2. **Non-Sortable Columns:**
   - Actions columns
   - Complex computed fields
   - Image previews
   - Multi-value fields

3. **Default Sort:**
   ```typescript
   const { sortKey, sortDirection, handleSort, sortData } = useTableSort('name', 'asc');
   ```

4. **Persisted Sort (Optional):**
   ```typescript
   const [sortKey, setSortKey] = useState(
     localStorage.getItem('tableName_sortKey') || 'name'
   );
   ```

## Testing Scenarios

1. **Click header once** → Ascending sort
2. **Click same header again** → Descending sort  
3. **Click different header** → New column ascending
4. **Hover over sortable header** → Show gray arrows
5. **Active column** → Blue arrows
6. **German characters** → Proper locale sorting (ä, ö, ü, ß)
7. **Null values** → Moved to end
8. **Numbers** → Numeric sort (not string)
9. **Dates** → Chronological order

## Translation Keys

Add to `de.json` and `en.json`:

```json
{
  "common": {
    "table": {
      "sortAscending": "Sort ascending",
      "sortDescending": "Sort descending",
      "sortBy": "Sort by {{column}}"
    }
  }
}
```

## Migration from Static Headers

**Before:**
```tsx
<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
  {t('disciplines.table.name')}
</th>
```

**After:**
```tsx
<SortableTableHeader
  label={t('disciplines.table.name')}
  sortKey="name"
  currentSortKey={sortKey}
  currentSortDirection={sortDirection}
  onSort={handleSort}
/>
```

## Performance Considerations

- ✅ Sorting happens client-side (suitable for <1000 items)
- ✅ For larger datasets, consider server-side sorting
- ✅ Use React.memo() for table rows if performance issues
- ✅ sortData() creates new array (doesn't mutate original)

## Accessibility

- ✅ Keyboard support (Enter/Space to activate sort)
- ✅ Screen reader announcements for sort state
- ✅ Visual indicators (icons) for sort direction
- ✅ Title attribute on hover explaining sort functionality

## Status

- ✅ Component created: `SortableTableHeader.tsx`
- ✅ Hook created: `useTableSort()`
- ✅ Documentation created
- ⏳ Waiting to implement on pages (to be done next)

## Next Steps

1. Start with DisciplinesUnified as pilot implementation
2. Test thoroughly with German locale and special characters
3. Roll out to ParticipantsUnified
4. Continue with remaining pages
5. Add unit tests for sortData() function
6. Consider server-side sorting for large datasets (>1000 items)
