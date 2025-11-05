# Point 38: GymNet Import Age Groups - Test Cases

## Test XML File for Age Conversion

This XML file tests various age scenarios for the GymNet import:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<GymNetExport>
  <Veranstaltung>
    <var_name>Test Event - Age Conversion 2025</var_name>
    <dat_von>2025-09-10</dat_von>
    <dat_bis>2025-09-10</dat_bis>
    <var_veranstalter>Test Organizer</var_veranstalter>
  </Veranstaltung>
  
  <Wettkämpfe>
    <!-- Test Case 1: Normal age range with both min and max -->
    <Wettkampf waNr="TC01" waGeschlecht="1" waAlterMin="11" waAlterMax="12">
      <var_name>Test Case 1: Ages 11-12</var_name>
    </Wettkampf>
    
    <!-- Test Case 2: Wide age range -->
    <Wettkampf waNr="TC02" waGeschlecht="2" waAlterMin="6" waAlterMax="18">
      <var_name>Test Case 2: Ages 6-18</var_name>
    </Wettkampf>
    
    <!-- Test Case 3: Single age (min and max same) -->
    <Wettkampf waNr="TC03" waGeschlecht="1" waAlterMin="10" waAlterMax="10">
      <var_name>Test Case 3: Age 10 only</var_name>
    </Wettkampf>
    
    <!-- Test Case 4: Very young (Kinderturnen) -->
    <Wettkampf waNr="TC04" waGeschlecht="2" waAlterMin="4" waAlterMax="6">
      <var_name>Test Case 4: Ages 4-6 (Kinderturnen)</var_name>
    </Wettkampf>
    
    <!-- Test Case 5: Older athletes -->
    <Wettkampf waNr="TC05" waGeschlecht="1" waAlterMin="18" waAlterMax="25">
      <var_name>Test Case 5: Ages 18-25 (Senior)</var_name>
    </Wettkampf>
    
    <!-- Test Case 6: Missing age info (should use defaults) -->
    <Wettkampf waNr="TC06" waGeschlecht="2">
      <var_name>Test Case 6: No age info (should default to 6-18)</var_name>
    </Wettkampf>
    
    <!-- Test Case 7: Only min age specified -->
    <Wettkampf waNr="TC07" waGeschlecht="1" waAlterMin="15">
      <var_name>Test Case 7: Only min age 15</var_name>
    </Wettkampf>
    
    <!-- Test Case 8: Only max age specified -->
    <Wettkampf waNr="TC08" waGeschlecht="2" waAlterMax="12">
      <var_name>Test Case 8: Only max age 12</var_name>
    </Wettkampf>
    
    <!-- Test Case 9: Age = 0 (invalid, should use defaults) -->
    <Wettkampf waNr="TC09" waGeschlecht="1" waAlterMin="0" waAlterMax="0">
      <var_name>Test Case 9: Age 0 (invalid)</var_name>
    </Wettkampf>
  </Wettkämpfe>
</GymNetExport>
```

## Expected Results (for Event Year 2025)

| Test Case | Ages (XML) | Birth Years (DB) | Display Ages | Notes |
|-----------|------------|------------------|--------------|-------|
| TC01 | 11-12 | 2014-2013 | 11-12 | Normal case ✅ |
| TC02 | 6-18 | 2019-2007 | 6-18 | Wide range ✅ |
| TC03 | 10-10 | 2015-2015 | 10-10 | Single age ✅ |
| TC04 | 4-6 | 2021-2019 | 4-6 | Very young ✅ |
| TC05 | 18-25 | 2007-2000 | 18-25 | Older athletes ✅ |
| TC06 | (none) | 2007-2019 | 6-18 | Default fallback ✅ |
| TC07 | 15-(none) | 2010-2010 | 15-15 | Only min, same for both ✅ |
| TC08 | (none)-12 | 2007-2013 | 6-12 | Only max, min defaults to 18 ✅ |
| TC09 | 0-0 | 2007-2019 | 6-18 | Invalid, use defaults ✅ |

## Calculation Formula

```typescript
// Age to Birth Year conversion
birthYear = eventYear - age

// Birth Year to Age conversion (display)
age = eventYear - birthYear

// Example for TC01 (ages 11-12 in 2025):
birthYearFrom = 2025 - 11 = 2014  (age 11)
birthYearTo = 2025 - 12 = 2013    (age 12)

// When displaying:
displayAgeFrom = 2025 - 2014 = 11 ✅
displayAgeTo = 2025 - 2013 = 12 ✅
```

## Birth Year Field Logic

**IMPORTANT**: The field names are confusing!
- `yer_von` = "from year" = Birth year of the OLDER age (smaller age number)
- `yer_bis` = "to year" = Birth year of the YOUNGER age (larger age number)

Example: Age range 11-12
- Age 11 (older) → Born 2014 → `yer_von = 2014`
- Age 12 (younger) → Born 2013 → `yer_bis = 2013`

Wait, that doesn't make sense either! Let me check the actual display code...

From `competitions.ts` line 122:
```typescript
ageFrom: Math.min(ageFrom, ageTo),  // Smaller age
ageTo: Math.max(ageFrom, ageTo),    // Larger age
```

This suggests:
- `ageFrom` should be the SMALLER age (younger number like 11)
- `ageTo` should be the LARGER age (older number like 12)

So for ages 11-12:
- Min age = 11 → Birth year = 2025 - 11 = 2014
- Max age = 12 → Birth year = 2025 - 12 = 2013
- Store as: `yer_von = 2014`, `yer_bis = 2013`

Actually, let me recalculate properly with the `Math.min/max` logic...

## CORRECT Calculation (After Analysis)

From the display code, we need:
- `ageFrom` = Math.min(calculated ages) = **smaller age number**
- `ageTo` = Math.max(calculated ages) = **larger age number**

For XML: `waAlterMin="11"` and `waAlterMax="12"`
- waAlterMin = 11 = minimum age → younger age
- waAlterMax = 12 = maximum age → older age

Birth year calculation:
- Age 11 → 2025 - 11 = 2014 (younger participants born 2014)
- Age 12 → 2025 - 12 = 2013 (older participants born 2013)

Database storage:
- `yer_von = 2014` (birth year of age 11, min age)
- `yer_bis = 2013` (birth year of age 12, max age)

Display calculation:
- `ageFrom = 2025 - 2014 = 11` → Math.min(11, 12) = **11** ✅
- `ageTo = 2025 - 2013 = 12` → Math.max(11, 12) = **12** ✅

## Console Log Output Examples

When importing the test XML, you should see:

```
🏆 Processing competitions...
  🔍 Processing: Test Case 1: Ages 11-12
     - Event year: 2025
     - Ages from XML: 11 - 12
     - Birth years (DB): 2014 - 2013
     - Display ages: 11 - 12
     - Gender: männlich
  ✅ Inserted: Test Case 1: Ages 11-12 (Birth years: 2014-2013, Ages: 11-12, Number: TC01)

  🔍 Processing: Test Case 6: No age info (should default to 6-18)
  ⚠️ No age information for competition "Test Case 6: No age info (should default to 6-18)" - using default range (age 6-18)
     - Event year: 2025
     - Ages from XML: none - none
     - Birth years (DB): 2007 - 2019
     - Display ages: 18 - 6
     - Gender: weiblich
  ✅ Inserted: Test Case 6: No age info (should default to 6-18) (Birth years: 2007-2019, Ages: 18-6, Number: TC06)
```

## Manual Testing Steps

1. Save the test XML above as `test-age-conversion.xml`
2. Go to Events page: http://localhost:5173/events
3. Click "Import from Gymnet"
4. Select the `test-age-conversion.xml` file
5. Fill in event details and click Import
6. Check the console logs on the server
7. Go to Competitions page for the imported event
8. Verify all age ranges display correctly

## Verification Queries

After import, run these SQL queries to verify correct storage:

```sql
-- Check all competitions from the test event
SELECT 
  int_wettkaempfeid,
  var_nummer AS "Nr",
  var_name AS "Name",
  yer_von AS "Birth Year From",
  yer_bis AS "Birth Year To",
  (2025 - yer_von) AS "Age From",
  (2025 - COALESCE(yer_bis, yer_von)) AS "Age To"
FROM tfx_wettkaempfe
WHERE int_veranstaltungenid = (
  SELECT int_veranstaltungenid 
  FROM tfx_veranstaltungen 
  WHERE var_name LIKE '%Age Conversion%'
  LIMIT 1
)
ORDER BY var_nummer;
```

Expected output should match the "Expected Results" table above.

## Edge Case Handling

✅ **Missing both ages**: Uses default 6-18 (birth years 2019-2007)
✅ **Age = 0**: Treated as missing, uses default 6-18
✅ **Only min age**: Uses min age for both from and to
✅ **Only max age**: Uses default for min (18), max from XML
✅ **Invalid event date**: Uses current year for calculation
✅ **Negative calculated ages**: Should not occur with proper event year

## Rollback Plan

If this fix causes issues, revert to old behavior:
```typescript
const ageFrom = competition.ageInfo?.min || 6;
const ageTo = competition.ageInfo?.max || 18;
```

But this would still be wrong - it stores ages instead of birth years!
The correct rollback is the OLD (broken) code:
```typescript
const ageFrom = competition.ageInfo?.min || 2000;
const ageTo = competition.ageInfo?.max || 2030;
```
