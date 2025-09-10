# Dashboard Statistics Fix

## Issue
The Dashboard was showing incorrect athlete count because it was using the count of loaded participants (`participants.participants?.length`) instead of the total count from the database.

## Root Cause
The `/api/participants` endpoint uses pagination and returns:
```json
{
  "participants": [...], // Array of loaded participants (limited by pagination)
  "pagination": {
    "total": 1234,      // Actual total count from database
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

The Dashboard was incorrectly using `participants.participants?.length` (showing only loaded count) instead of `participants.pagination?.total` (actual total).

## Solution
Updated Dashboard.tsx to use the correct total counts from all APIs:

### Before:
```tsx
setStatistics({
  activeEvents: events.events?.length || 0,        // ❌ Only loaded events
  registeredClubs: clubs.clubs?.length || 0,      // ❌ Only loaded clubs  
  totalAthletes: participants.participants?.length || 0, // ❌ Only loaded athletes
  loading: false
})
```

### After:
```tsx
setStatistics({
  activeEvents: (events as any).pagination?.total || 0,      // ✅ Total events in database
  registeredClubs: (clubs as any).pagination?.total || 0,    // ✅ Total clubs in database
  totalAthletes: (participants as any).pagination?.total || 0, // ✅ Total athletes in database
  loading: false
})
```

## API Consistency
All three APIs (`/api/events`, `/api/clubs`, `/api/participants`) follow the same pagination pattern:

```typescript
{
  [entityName]: [...],  // Array of loaded entities
  pagination: {
    total: number,      // Total count from database
    limit: number,
    offset: number, 
    hasMore: boolean
  }
}
```

## Result
- ✅ Dashboard now shows accurate total counts for all entities
- ✅ Performance is maintained (no additional database queries needed)
- ✅ Consistent with existing API design patterns

## Testing
Test the fix by:
1. Navigate to http://localhost:5173/dashboard
2. Verify the athlete count shows the total database count (not just loaded count)
3. Compare with actual database: `SELECT COUNT(*) FROM tfx_teilnehmer;`
