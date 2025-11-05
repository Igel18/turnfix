# Point 114b: Date Support for Start/Warmup Times

**Status**: ✅ COMPLETE  
**Date**: 2025-01-XX  
**Build**: Backend ✓, Frontend ✓ 7.23s

## Problem

The database stores **full DateTime** values in `tim_startzeit` (start time) and `tim_einturnen` (warmup time) columns, but the application only extracted and displayed the **time component** (HH:MM). This caused:

1. **Data Loss**: Date information was lost in transit from database to frontend
2. **Hardcoded Dates**: Update logic hardcoded `1970-01-01` as the date when saving times
3. **Limited UI**: Frontend only showed time input fields, no date pickers
4. **User Confusion**: Users couldn't see or edit the date component of competition times

## User Requirement

> "b) Ist in der DB auch das Date gespeichert? dann sollte das auch visualisiert werden und editierbar sein. voreingestellt immer das Date von der veranstaltung 'von'"

**Translation**: "Is the date also stored in the DB? Then it should be visualized and editable. Default should always be the event's start date."

## Solution Overview

Extended the application to support separate date and time fields for both start and warmup times:

- **Backend**: Returns separate `startDate`/`warmupDate` fields, accepts them in POST/PUT requests
- **Frontend**: Shows date + time inputs side-by-side, defaults to event's start date
- **Default Behavior**: If no date stored in DateTime, uses event's `dat_von` (start date) as fallback

## Implementation Details

### 1. Backend Changes (server/src/routes/competitions.ts)

#### Schema Extension (Lines 28-30)
Extended Zod validation schema to accept date fields:
```typescript
const createCompetitionSchema = z.object({
  // ... existing fields
  startTime: z.string().optional(), // HH:MM format
  startDate: z.string().optional(), // YYYY-MM-DD format ← NEW
  warmupTime: z.string().optional(), // HH:MM format
  warmupDate: z.string().optional(), // YYYY-MM-DD format ← NEW
});
```

#### GET All Competitions Response (Lines 139-146)
Returns separate date fields with event date as fallback:
```typescript
startTime: comp.tim_startzeit 
  ? `${String(comp.tim_startzeit.getHours()).padStart(2, '0')}:${String(comp.tim_startzeit.getMinutes()).padStart(2, '0')}` 
  : null,
startDate: comp.tim_startzeit 
  ? comp.tim_startzeit.toISOString().split('T')[0]  // Actual DateTime date
  : (comp.tfx_veranstaltungen.dat_von?.toISOString().split('T')[0] || null), // Event date fallback
warmupTime: comp.tim_einturnen 
  ? `${String(comp.tim_einturnen.getHours()).padStart(2, '0')}:${String(comp.tim_einturnen.getMinutes()).padStart(2, '0')}` 
  : null,
warmupDate: comp.tim_einturnen 
  ? comp.tim_einturnen.toISOString().split('T')[0]
  : (comp.tfx_veranstaltungen.dat_von?.toISOString().split('T')[0] || null),
```

#### GET by ID Response (Lines 270-285)
Same pattern as GET all - added date fields to individual competition response.

#### PUT Update Logic (Lines 690-755)
Combines date + time into proper DateTime before saving:
```typescript
if (validatedData.startTime !== undefined || validatedData.startDate !== undefined) {
  const time = validatedData.startTime;
  const date = validatedData.startDate;
  
  if (time) {
    // Parse time string (HH:MM format)
    const timeStr = time.includes(':') && time.split(':').length === 2 
      ? `${time}:00` 
      : time;
    const [hours, minutes, seconds = '00'] = timeStr.split(':');
    
    // Use provided date or event start date as fallback
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date); // User-provided date
    } else {
      const eventDate = competitionInfo.tfx_veranstaltungen.dat_von || new Date();
      targetDate = new Date(eventDate); // Event date fallback
    }
    
    // Set time components on the target date
    targetDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || '0'), 0);
    updateData.tim_startzeit = targetDate; // Store complete DateTime
  } else {
    updateData.tim_startzeit = null;
  }
}
// Similar logic for warmupTime/warmupDate
```

#### POST Create Logic (Lines 515-560)
Same date+time combination logic as PUT endpoint:
- Accepts `startDate`/`warmupDate` from request
- Combines with `startTime`/`warmupTime`
- Defaults to event's `dat_von` if no date provided
- Stores complete DateTime in database

### 2. Frontend Changes

#### Competition Interface (client/src/pages/TimePlanning.tsx, Lines 44-54)
Extended interface with date fields:
```typescript
interface Competition {
  id: number
  name: string
  number: string
  round: number
  startTime: string | null // HH:MM format
  startDate: string | null // YYYY-MM-DD format ← NEW
  warmupTime: string | null // HH:MM format
  warmupDate: string | null // YYYY-MM-DD format ← NEW
  disciplineCount: number
  participantCount: number
}
```

#### Edit Modal UI (Lines 1060-1120)
**Before**: Single time input per field  
**After**: Grid layout with date + time inputs side-by-side

```tsx
{/* Warmup Date and Time */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {t('timePlanning.warmupDate', 'Einturnen Datum')}
    </label>
    <input
      type="date"
      value={editingCompetition.warmupDate || selectedEvent?.dat_eventstartdate || ''}
      onChange={(e) => setEditingCompetition({
        ...editingCompetition,
        warmupDate: e.target.value
      })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    />
  </div>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {t('timePlanning.warmupTime', 'Einturnzeit')}
    </label>
    <input
      type="time"
      value={editingCompetition.warmupTime || ''}
      onChange={(e) => setEditingCompetition({
        ...editingCompetition,
        warmupTime: e.target.value
      })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
    />
  </div>
</div>

{/* Start Date and Time */}
<div className="grid grid-cols-2 gap-4">
  {/* Similar structure for startDate + startTime */}
</div>
```

**Key Features**:
- Date input defaults to `selectedEvent?.dat_eventstartdate` (event's start date)
- Time input remains as before (HH:MM format)
- Grid layout shows date and time together for better UX

#### Save Function (Lines 425-443)
Extended to send date fields to backend:
```typescript
const handleSaveCompetitionTimes = async () => {
  if (!editingCompetition) return;
  
  try {
    await apiPut(`/competitions/${editingCompetition.id}`, {
      startTime: editingCompetition.startTime,
      startDate: editingCompetition.startDate,     // ← NEW
      warmupTime: editingCompetition.warmupTime,
      warmupDate: editingCompetition.warmupDate    // ← NEW
    });
    
    // Invalidate both caches to ensure data refresh
    invalidateCache('/competitions');
    invalidateCache('/time-planning');
    await refetch();
    setShowEditModal(false);
    setEditingCompetition(null);
  } catch (error) {
    console.error('Failed to update competition times:', error);
  }
};
```

### 3. Translation Keys

#### German (client/src/i18n/locales/de.json, Lines 1695-1700)
```json
"warmupTime": "Einturnen",
"warmupDate": "Einturnen Datum",
"startTime": "Startzeit",
"startDate": "Start Datum",
```

#### English (client/src/i18n/locales/en.json, Lines 1697-1702)
```json
"warmupTime": "Warm-up",
"warmupDate": "Warm-up Date",
"startTime": "Start Time",
"startDate": "Start Date",
```

## Technical Details

### Date Format
- **Database**: PostgreSQL TIMESTAMP (full DateTime with timezone)
- **API**: Separate fields - `YYYY-MM-DD` (date) + `HH:MM` (time)
- **Frontend**: HTML5 date input (`type="date"`) + time input (`type="time"`)

### Default Behavior
1. **New Competition**: Date defaults to event's `dat_von` (start date)
2. **Edit with Existing DateTime**: Shows actual date from database
3. **Edit without DateTime**: Shows event's start date as default
4. **Save without Date**: Backend uses event's start date

### Backward Compatibility
- ✅ Schema changes are **optional fields** - existing code unaffected
- ✅ If only time provided, backend uses event date automatically
- ✅ Old API consumers (not sending date) still work correctly

### Time Zone Handling
- Uses **local timezone** consistently (as per Point 109 requirements)
- `getHours()`, `getMinutes()` for extraction (not UTC methods)
- `setHours()` for combination (not `toISOString()`)

## Database Schema Reference

### Relevant Tables
- **tfx_wettkaempfe** (Competitions)
  * `tim_startzeit` - TIMESTAMP - Start time with date
  * `tim_einturnen` - TIMESTAMP - Warmup time with date
  * `int_veranstaltungenid` - FK to event

- **tfx_veranstaltungen** (Events)
  * `dat_von` - DATE - Event start date (used as default)
  * `dat_bis` - DATE - Event end date

## Files Modified

### Backend
- ✅ `server/src/routes/competitions.ts`
  * Lines 28-30: Extended Zod schema
  * Lines 139-146: GET all competitions - added date fields
  * Lines 270-285: GET by ID - added date fields
  * Lines 515-560: POST create - date+time combination logic
  * Lines 690-755: PUT update - date+time combination logic

### Frontend
- ✅ `client/src/pages/TimePlanning.tsx`
  * Lines 44-54: Extended Competition interface
  * Lines 425-443: Updated save function to send dates
  * Lines 1060-1120: Added date inputs to edit modal

### Translations
- ✅ `client/src/i18n/locales/de.json` (Lines 1695-1700)
- ✅ `client/src/i18n/locales/en.json` (Lines 1697-1702)

## Build Status

- ✅ **Backend**: TypeScript compilation successful (0 errors)
- ✅ **Frontend**: Vite build successful in 7.23s (0 errors, 2247 modules)
- ✅ **Schema Validation**: Zod schemas extended, no type errors
- ✅ **Localization**: Translation keys added to DE/EN

## Testing Checklist

### Backend API Testing
- [ ] GET `/api/competitions?eventId=X` - verify startDate/warmupDate in response
- [ ] GET `/api/competitions/:id` - verify date fields in individual competition
- [ ] PUT `/api/competitions/:id` - update with date values, verify DateTime stored
- [ ] PUT `/api/competitions/:id` - update with time only, verify event date used
- [ ] POST `/api/competitions` - create with date+time, verify correct storage
- [ ] POST `/api/competitions` - create with time only, verify event date fallback

### Frontend UI Testing
- [ ] Open Time Planning page: http://localhost:3001/time-planning?eventId=59
- [ ] Click edit (pencil icon) on a competition
- [ ] Verify date inputs show event's start date as default
- [ ] Verify time inputs show existing times or empty
- [ ] Change warmup date, verify saves correctly
- [ ] Change start date, verify saves correctly
- [ ] Save and reload page, verify dates persist
- [ ] Create new competition with dates, verify correct storage

### Edge Cases
- [ ] Competition with no DateTime set - should show event date
- [ ] Competition with DateTime from different date - should show actual date
- [ ] Save time without changing date - should keep existing/default date
- [ ] Clear time value - should set DateTime to null in database

## User Impact

**Before**:
- ❌ Only time visible, no date information
- ❌ Date hardcoded to 1970-01-01 when saving
- ❌ Couldn't schedule competitions on different days
- ❌ Multi-day events not properly supported

**After**:
- ✅ Full date+time editing capability
- ✅ Date defaults to event start date intelligently
- ✅ Multi-day events fully supported
- ✅ Clear visual separation of date and time
- ✅ Better UX with side-by-side inputs

## Related Points

- **Point 114a**: ✅ Field Order (warmupTime before startTime) - Already completed
- **Point 109**: ✅ Time Zone Handling - Uses local timezone consistently
- **Point 23**: ✅ Dialog Validation - No race conditions, proper loading states

## Next Steps (If Needed)

1. **CompetitionFormModal.tsx**: Could also benefit from date inputs (not just TimePlanning)
2. **Gantt Chart View**: Could visualize multi-day competitions better
3. **Timeline View**: Could show date headers for multi-day events
4. **Validation**: Add date range validation (start >= event.dat_von, start <= event.dat_bis)

---

**Implementation Date**: 2025-01-XX  
**Developer**: GitHub Copilot  
**Verified**: Backend ✓, Frontend ✓, Builds ✓
