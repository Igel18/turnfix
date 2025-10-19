# Point 38: GymNet Import Age Groups Fix

## Problem Analysis

**User Report**: "Kann es sein, dass jeder Wettkampf der mittel GymNet importiert wird die Altersgruppe 6-18 Jahre bekommt?"

### Root Cause Identified

In `server/src/routes/events.ts` line 1931-1932, the GymNet import uses **hardcoded fallback values**:

```typescript
const ageFrom = competition.ageInfo?.min || 2000;  // ❌ WRONG! Should not default to 2000
const ageTo = competition.ageInfo?.max || 2030;    // ❌ WRONG! Should not default to 2030
```

**Why this happens**:
- When `competition.ageInfo.min` or `competition.ageInfo.max` is `0` (falsy), it falls back to 2000/2030
- The values `2000` and `2030` are interpreted as **birth years** in the database field `yer_von`/`yer_bis`
- Birth year 2000 = Age 25 (in 2025)
- Birth year 2030 = Age -5 (in 2025) → This is wrong!

**However**, the user reports seeing "6-18 Jahre" not "25 to -5 Jahre", which suggests:
- Either there's a display calculation elsewhere that limits ages to 6-18
- OR the values are being clamped somewhere in the UI
- OR there's another default being applied

### GymNet XML Structure

GymNet exports use these fields for age ranges:

```xml
<Wettkampf waNr="WK01" waGeschlecht="1" waAlterMin="11" waAlterMax="12">
  <var_name>Test Competition 1</var_name>
</Wettkampf>
```

- `waAlterMin`: Minimum age (e.g., 11)
- `waAlterMax`: Maximum age (e.g., 12)
- These are **actual ages**, not birth years

### Database Schema

Table: `tfx_wettkaempfe`
- `yer_von`: Birth year FROM (e.g., 2013 for 12-year-olds in 2025)
- `yer_bis`: Birth year TO (e.g., 2014 for 11-year-olds in 2025)

**Important**: The database stores **birth years**, not ages!

### Extraction Logic (Currently Working)

In `server/src/routes/events.ts` lines 845-851, the extraction correctly reads `waAlterMin` and `waAlterMax`:

```typescript
// Extract age range from waAlterMin/waAlterMax attributes (DTB standard)
if (key === 'waAlterMin') {
  if (!competition.ageInfo) competition.ageInfo = {};
  competition.ageInfo.min = parseInt(item[key]) || 0;  // ✅ Reads age from XML
}
if (key === 'waAlterMax') {
  if (!competition.ageInfo) competition.ageInfo = {};
  competition.ageInfo.max = parseInt(item[key]) || 0;  // ✅ Reads age from XML
}
```

**Problem**: When `waAlterMin` or `waAlterMax` is missing or `0`, the fallback defaults to 2000/2030.

## Solution

### Fix 1: Use NULL instead of hardcoded defaults

Change the fallback logic to use `null` when no age information is available:

```typescript
// OLD (WRONG):
const ageFrom = competition.ageInfo?.min || 2000;
const ageTo = competition.ageInfo?.max || 2030;

// NEW (CORRECT):
const ageFrom = competition.ageInfo?.min ?? null;
const ageTo = competition.ageInfo?.max ?? null;
```

### Fix 2: Handle NULL in database insertion

Update the SQL queries to accept NULL values:

```typescript
// Update query
await prisma.$queryRawUnsafe(`
  UPDATE tfx_wettkaempfe 
  SET var_name = $1, yer_von = $2, yer_bis = $3, int_bereicheid = $4, var_nummer = $5
  WHERE int_wettkaempfeid = $6
`, competition.name.trim(), ageFrom, ageTo, bereichId, competition.waNr || null, competitionId);

// Insert query
await prisma.$queryRawUnsafe(`
  INSERT INTO tfx_wettkaempfe (int_veranstaltungenid, int_bereicheid, var_name, yer_von, yer_bis, var_nummer)
  VALUES ($1, $2, $3, $4, $5, $6)
`, eventId, bereichId, competition.name.trim(), ageFrom, ageTo, competition.waNr || null);
```

### Fix 3: Improved logging

Add better logging to track age extraction:

```typescript
console.log(`  🔍 Processing: ${competition.name}`);
console.log(`     - Raw ageInfo:`, competition.ageInfo);
console.log(`     - ageFrom: ${ageFrom ?? 'NULL'}, ageTo: ${ageTo ?? 'NULL'}`);
console.log(`     - Gender: ${gender}`);
```

## Edge Cases to Handle

1. **Missing age fields in XML** → Store NULL in database
2. **Age = 0 in XML** → Store NULL (0 is invalid age)
3. **Only min or max specified** → Store the available value, NULL for missing
4. **Invalid age values** → Log warning, store NULL

## Testing Scenarios

1. ✅ **Valid age range** (waAlterMin="11", waAlterMax="12") → Should store as birth years
2. ✅ **Missing age fields** → Should store NULL, not 2000/2030
3. ✅ **Age = 0** → Should store NULL
4. ✅ **Partial age info** (only min or max) → Should store available value + NULL

## Implementation Notes

- Use **nullish coalescing operator** (`??`) instead of logical OR (`||`) to properly handle `0` values
- NULL values in database are acceptable for age fields
- The UI should display "No age limit" or similar when NULL
- Do not convert ages to birth years in the import logic (that should happen in the database or UI layer)

## Database Field Interpretation

**IMPORTANT**: The field names `yer_von` and `yer_bis` suggest they store **birth years**, not ages!

If the database stores birth years:
- Age 11-12 in 2025 → Birth years 2014-2013 (2025 - 11 = 2014, 2025 - 12 = 2013)
- Need to convert ages from XML to birth years based on event date

**Current implementation** in lines 1931-1932 does NOT do this conversion!

### Potential Additional Fix: Age → Birth Year Conversion

If the database indeed stores birth years, we need:

```typescript
// Get event year for conversion
const eventYear = createdEvent.dat_von 
  ? new Date(createdEvent.dat_von).getFullYear() 
  : new Date().getFullYear();

// Convert ages to birth years (if ages are provided)
const ageFrom = competition.ageInfo?.min 
  ? eventYear - competition.ageInfo.min 
  : null;
const ageTo = competition.ageInfo?.max 
  ? eventYear - competition.ageInfo.max 
  : null;
```

**Note**: Birth year FROM is the older age (smaller age number, larger birth year)
- Age 11 → Birth year 2014 (in 2025)
- Age 12 → Birth year 2013 (in 2025)
- So `yer_von` = 2013 (age 12), `yer_bis` = 2014 (age 11)

**WAIT!** This seems backwards. Let me check the legacy code...

## ✅ VERIFIED: Database Field Meanings

From `server/src/routes/competitions.ts` lines 103-111:

```typescript
// yer_von and yer_bis contain birth years - convert to ages based on event date
const birthYearFrom = comp.yer_von;
const birthYearTo = comp.yer_bis;

// Convert birth years to ages based on event year, with fallbacks
const ageFrom = birthYearFrom ? eventYear - birthYearFrom : 6;  // ❌ Default 6!
const ageTo = birthYearTo ? eventYear - birthYearTo : (birthYearFrom ? eventYear - birthYearFrom + 10 : 18);  // ❌ Default 18!
```

**CONFIRMED**: 
- `yer_von` = Birth year FROM (stores year like 2013)
- `yer_bis` = Birth year TO (stores year like 2014)
- Ages are calculated: `eventYear - birthYear`
- **Default fallbacks are 6 and 18** → This is where "6-18 Jahre" comes from!

### Schema Confirmation

From `server/prisma/schema.prisma`:
```prisma
model tfx_wettkaempfe {
  yer_von  Int   @db.SmallInt  // Birth year FROM (required)
  yer_bis  Int?  @db.SmallInt  // Birth year TO (optional, nullable)
}
```

## Root Cause: TWO Separate Issues

### Issue 1: GymNet Import (events.ts line 1931-1932)
```typescript
const ageFrom = competition.ageInfo?.min || 2000;  // Stores 2000 as birth year
const ageTo = competition.ageInfo?.max || 2030;    // Stores 2030 as birth year
```
- When no age info: Stores 2000 and 2030 as birth years
- These are **future years**, resulting in negative ages

### Issue 2: Display Fallback (competitions.ts line 110-111)
```typescript
const ageFrom = birthYearFrom ? eventYear - birthYearFrom : 6;   // Fallback: 6
const ageTo = birthYearTo ? eventYear - birthYearTo : (...) : 18;  // Fallback: 18
```
- When reading competitions: If birth years are missing/invalid → Show ages 6-18
- This is why user sees "6-18 Jahre" instead of negative ages

## Complete Fix Required

### Fix in events.ts (GymNet Import)

**CRITICAL**: Must convert ages from XML to birth years before storing!

```typescript
// Get event year for conversion
const eventYear = createdEvent.dat_von 
  ? new Date(createdEvent.dat_von).getFullYear() 
  : new Date().getFullYear();

// Convert ages from XML to birth years for database storage
let birthYearFrom: number | null = null;
let birthYearTo: number | null = null;

if (competition.ageInfo?.min && competition.ageInfo.min > 0) {
  birthYearFrom = eventYear - competition.ageInfo.min;
}
if (competition.ageInfo?.max && competition.ageInfo.max > 0) {
  birthYearTo = eventYear - competition.ageInfo.max;
}

// Log for debugging
console.log(`  🔍 Processing: ${competition.name}`);
console.log(`     - Event year: ${eventYear}`);
console.log(`     - Ages from XML: ${competition.ageInfo?.min ?? 'none'} - ${competition.ageInfo?.max ?? 'none'}`);
console.log(`     - Birth years calculated: ${birthYearFrom ?? 'NULL'} - ${birthYearTo ?? 'NULL'}`);
console.log(`     - Gender: ${gender}`);

// Use the converted birth years in database operations
const ageFrom = birthYearFrom;  // Now a birth year or null
const ageTo = birthYearTo;      // Now a birth year or null
```

### Important: Birth Year Logic

- Age 11 in 2025 → Born in 2014
- Age 12 in 2025 → Born in 2013
- For age range 11-12: `yer_von = 2013`, `yer_bis = 2014`
- Smaller age number = larger birth year number
- **yer_von is the younger age's birth year** (confusing name!)

### Database NULL Handling

The schema shows `yer_bis` is nullable but `yer_von` is required:
```prisma
yer_von  Int   @db.SmallInt  // NOT NULL
yer_bis  Int?  @db.SmallInt  // NULLABLE
```

**Solution**: If no age info available, skip the competition or use sensible defaults:
```typescript
// If no age information at all, use a sensible default birth year range
if (!birthYearFrom) {
  console.log(`  ⚠️ No age information for competition "${competition.name}" - using default range`);
  birthYearFrom = eventYear - 18;  // Default max age: 18
  birthYearTo = eventYear - 6;     // Default min age: 6
  // This gives age range 6-18, matching the display fallback
}
```

### Why This Happens

1. GymNet XML has `waAlterMin="11"` and `waAlterMax="12"` (ages)
2. Import extracts these correctly into `competition.ageInfo.min/max`
3. **BUT**: Import stores them directly as 11 and 12 in database (wrong!)
4. Database expects birth years (2014, 2013), not ages (11, 12)
5. When displaying, competition.ts calculates: `2025 - 11 = 2014` (treated as birth year → age 11)
6. Result: Age displayed is correct by accident (double-conversion cancels out)
7. **UNTIL**: Ages are 0 or missing, then fallback to 2000/2030 → Display shows 6-18

## Final Implementation

**CORRECT approach**:
1. Extract ages from XML ✅ (already working)
2. **Convert ages to birth years** using event year (NEW!)
3. Store birth years in database (yer_von, yer_bis)
4. Display code already converts back to ages ✅ (already working)

**Edge cases**:
- Missing age info → Use default age range 6-18 (convert to birth years)
- Age = 0 → Use default age range 6-18
- Only one age specified → Use that age for both from/to
- Invalid event date → Use current year for conversion
