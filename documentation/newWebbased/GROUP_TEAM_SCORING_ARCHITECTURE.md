# Group/Team Scoring System Architecture

**Version**: 1.0  
**Date**: 2025-11-12  
**Status**: In Development

---

## 📋 Overview

This document describes the architecture for scoring Groups and Teams in TurnFix v2.0, supporting competition formats like **TGM (TeamGym männlich)** where groups/teams compete as units rather than individuals.

### Key Features

- ✅ **Generic Design**: Works for any group/team-based competition format
- ✅ **C++ Compatible**: Uses existing database structure, fully compatible with legacy Qt/C++ application
- ✅ **Component-based Scoring**: Support for D-Note, E-Note, A-Note, penalties, etc.
- ✅ **Formula-driven**: Automatic calculation of final scores based on configurable formulas
- ✅ **Multiple Attempts**: Configurable per competition

---

## 🗄️ Database Structure

### Existing Tables (No Schema Changes Required!)

#### `tfx_wertungen` (Scores)

```sql
CREATE TABLE tfx_wertungen (
  int_wertungenid SERIAL PRIMARY KEY,
  int_wettkaempfeid INTEGER NOT NULL,      -- Competition ID
  int_teilnehmerid INTEGER,                 -- Participant (NULL for groups/teams)
  int_gruppenid INTEGER,                    -- Group ID (NULL for individuals/teams)
  int_mannschaftenid INTEGER,               -- Team ID (NULL for individuals/groups)
  int_statusid INTEGER NOT NULL,            -- Status (pending, completed, etc.)
  int_runde SMALLINT DEFAULT 1,             -- Round number
  int_startnummer INTEGER,                  -- Start number (from group/team)
  bol_ak BOOLEAN DEFAULT false,             -- Out of competition
  bol_startet_nicht BOOLEAN DEFAULT false,  -- DNS (Did Not Start)
  var_riege VARCHAR(5),                     -- Squad name
  var_comment VARCHAR(150)                  -- Comments
);
```

**Scoring Level Detection:**
- `int_teilnehmerid IS NOT NULL` → Individual scoring
- `int_gruppenid IS NOT NULL` → Group scoring
- `int_mannschaftenid IS NOT NULL` → Team scoring

#### `tfx_wertungen_details` (Score Components)

```sql
CREATE TABLE tfx_wertungen_details (
  int_wertungen_detailsid SERIAL PRIMARY KEY,
  int_wertungenid INTEGER NOT NULL,         -- FK to tfx_wertungen
  int_disziplinenid INTEGER NOT NULL,       -- Discipline ID (Boden, Sprung, etc.)
  int_versuch SMALLINT,                     -- Attempt number (1, 2, 3, ...)
  rel_leistung REAL,                        -- Score value (D/E/A component)
  int_kp SMALLINT DEFAULT 0                 -- Component ID (Field ID)
);
```

**`int_kp` Usage:**
- References `tfx_disziplinen_felder.int_disziplinen_felderid`
- Identifies which component: D-Note (ID=1), E-Note (ID=2), A-Note (ID=3), etc.
- Used in C++ code for:
  - Grouping components in queries (`GROUP BY ... int_kp`)
  - Joining with jury results (`JOIN tfx_jury_results ON ... int_kp`)
  - Starting order management

#### `tfx_disziplinen_felder` (Discipline Fields Configuration)

```sql
CREATE TABLE tfx_disziplinen_felder (
  int_disziplinen_felderid SERIAL PRIMARY KEY,
  int_disziplinenid INTEGER NOT NULL,       -- Discipline ID
  var_name VARCHAR(50),                     -- Field name (e.g., "D-Note")
  var_kurzname VARCHAR(10),                 -- Short name (e.g., "D")
  int_reihenfolge INTEGER,                  -- Sort order
  bol_endwert BOOLEAN DEFAULT false,        -- Is final score field
  bol_ausgangswert BOOLEAN DEFAULT false,   -- Is starting score field
  int_gruppe INTEGER,                       -- Group number (for UI layout)
  bol_enabled BOOLEAN DEFAULT true          -- Enabled/disabled
);
```

---

## 🔄 Data Flow

### 1. Score Creation (Group/Team)

```typescript
// Web App creates score for group
const score = await prisma.tfx_wertungen.create({
  data: {
    int_wettkaempfeid: competitionId,
    int_gruppenid: groupId,              // Group ID (or int_mannschaftenid for teams)
    int_teilnehmerid: null,              // NULL for groups/teams
    int_statusid: 1,                     // Status: "Pending"
    int_runde: 1,
    int_startnummer: group.startNumber,  // From group/team entity
    var_riege: squadName
  }
});
```

### 2. Score Components Storage

```typescript
// Store individual components (D, E, A)
const components = [
  { field: 'D-Note', fieldId: 1, value: 8.5 },
  { field: 'E-Note', fieldId: 2, value: 9.2 },
  { field: 'A-Note', fieldId: 3, value: 8.8 }
];

for (const component of components) {
  await prisma.tfx_wertungen_details.create({
    data: {
      int_wertungenid: score.int_wertungenid,
      int_disziplinenid: disciplineId,
      int_versuch: attemptNumber,
      rel_leistung: component.value,
      int_kp: component.fieldId      // References tfx_disziplinen_felder
    }
  });
}

// Store calculated final score
await prisma.tfx_wertungen_details.create({
  data: {
    int_wertungenid: score.int_wertungenid,
    int_disziplinenid: disciplineId,
    int_versuch: attemptNumber,
    rel_leistung: 26.5,              // D + E + A = 8.5 + 9.2 + 8.8
    int_kp: finalScoreFieldId        // Field marked with bol_endwert=true
  }
});
```

### 3. Score Retrieval

```typescript
// Get group scores with components
const scores = await prisma.tfx_wertungen.findMany({
  where: {
    int_wettkaempfeid: competitionId,
    int_gruppenid: { not: null }     // Groups only
  },
  include: {
    tfx_wertungen_details: {
      include: {
        tfx_disziplinen: true        // Discipline info
      }
    },
    tfx_gruppen: true,               // Group info
    tfx_status: true                 // Status info
  }
});

// Group components by attempt
const scoresByAttempt = groupBy(scores.tfx_wertungen_details, 'int_versuch');
```

---

## 🎯 TGM Example Configuration

### Competition: TGM Männlich Level 1

**Disciplines:**
1. **Boden (Floor)** - Group performance
2. **Sprung (Vault)** - Group performance  
3. **Minitrampolin (Mini-Trampoline)** - Group performance

**Boden Discipline Fields:**

| Field ID | Name | Short | Type | Enabled | Final Score | Sort |
|----------|------|-------|------|---------|-------------|------|
| 1 | Schwierigkeit | D | difficulty | ✅ | ❌ | 1 |
| 2 | Ausführung | E | execution | ✅ | ❌ | 2 |
| 3 | Artistik | A | artistry | ✅ | ❌ | 3 |
| 4 | Endwert | Total | calculated | ✅ | ✅ | 4 |

**Formula Configuration:**
```javascript
// Stored in tfx_disziplinen.var_formel
"D + E + A"  // Simple addition

// Or more complex:
"D + E + A - P"  // With penalties (P)
```

### Score Entry Example

**Group: "TSV München 1" - Boden (Floor)**

```
┌─────────────────────────────────────────┐
│  Gruppe: TSV München 1                  │
│  Disziplin: Boden                       │
│  Versuch: 1                             │
├─────────────────────────────────────────┤
│  D-Note (Schwierigkeit)    [ 8.50 ]    │
│  E-Note (Ausführung)       [ 9.20 ]    │
│  A-Note (Artistik)         [ 8.80 ]    │
├─────────────────────────────────────────┤
│  Endwert (berechnet):      26.50       │
└─────────────────────────────────────────┘
```

**Database Storage:**

```sql
-- Main score record
INSERT INTO tfx_wertungen (
  int_wettkaempfeid, int_gruppenid, int_statusid, 
  int_runde, int_startnummer, var_riege
) VALUES (
  59,  -- Competition ID
  12,  -- Group ID "TSV München 1"
  9,   -- Status "Leistung erfasst" (Score captured)
  1,   -- Round 1
  101, -- Group's start number
  'R1' -- Squad name
);
-- Returns int_wertungenid = 501

-- D-Note component
INSERT INTO tfx_wertungen_details (
  int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp
) VALUES (501, 74, 1, 8.50, 1);  -- int_kp=1 references D-Note field

-- E-Note component
INSERT INTO tfx_wertungen_details (
  int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp
) VALUES (501, 74, 1, 9.20, 2);  -- int_kp=2 references E-Note field

-- A-Note component
INSERT INTO tfx_wertungen_details (
  int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp
) VALUES (501, 74, 1, 8.80, 3);  -- int_kp=3 references A-Note field

-- Final score (calculated)
INSERT INTO tfx_wertungen_details (
  int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp
) VALUES (501, 74, 1, 26.50, 4);  -- int_kp=4 references Endwert field
```

---

## 🔌 API Endpoints

### Group Scoring

#### `POST /api/scores/group`

Create or update group score with components.

**Request:**
```json
{
  "groupId": 12,
  "competitionId": 59,
  "disciplineId": 74,
  "attemptNumber": 1,
  "squadName": "R1",
  "components": [
    { "fieldId": 1, "value": 8.5 },   // D-Note
    { "fieldId": 2, "value": 9.2 },   // E-Note
    { "fieldId": 3, "value": 8.8 }    // A-Note
  ],
  "finalScore": 26.5,
  "statusId": 9
}
```

**Response:**
```json
{
  "success": true,
  "scoreId": 501,
  "components": [
    { "id": 1001, "fieldId": 1, "value": 8.5 },
    { "id": 1002, "fieldId": 2, "value": 9.2 },
    { "id": 1003, "fieldId": 3, "value": 8.8 },
    { "id": 1004, "fieldId": 4, "value": 26.5 }
  ]
}
```

#### `GET /api/scores/group/:groupId`

Retrieve all scores for a group.

**Query Parameters:**
- `competitionId` (optional): Filter by competition
- `disciplineId` (optional): Filter by discipline
- `includeComponents` (default: true): Include component breakdown

**Response:**
```json
{
  "success": true,
  "group": {
    "id": 12,
    "name": "TSV München 1",
    "startNumber": 101
  },
  "scores": [
    {
      "id": 501,
      "competitionId": 59,
      "disciplineId": 74,
      "disciplineName": "Boden",
      "attemptNumber": 1,
      "finalScore": 26.5,
      "statusId": 9,
      "components": [
        { "fieldId": 1, "fieldName": "D-Note", "value": 8.5 },
        { "fieldId": 2, "fieldName": "E-Note", "value": 9.2 },
        { "fieldId": 3, "fieldName": "A-Note", "value": 8.8 }
      ]
    }
  ]
}
```

### Team Scoring

Same structure as Group scoring, but uses:
- `POST /api/scores/team`
- `GET /api/scores/team/:teamId`
- `int_mannschaftenid` instead of `int_gruppenid`

---

## 🎨 UI Components

### ScoreCaptureGroup Component

**Location:** `client/src/pages/ScoreCaptureGroup/index.tsx`

**Features:**
- Select Group → Discipline → Attempt
- Dynamic field rendering based on `tfx_disziplinen_felder`
- Real-time formula calculation
- Validation (min/max values per field)
- Auto-save on input
- Display final score prominently

**Component Structure:**
```tsx
<EventManagementTemplate title="Group Scoring">
  <GroupSelector 
    onSelect={setSelectedGroup}
    groups={groups}
  />
  
  <DisciplineSelector
    onSelect={setSelectedDiscipline}
    disciplines={availableDisciplines}
  />
  
  <ScoreInputGrid
    fields={disciplineFields}
    values={scoreValues}
    onChange={handleFieldChange}
    formula={discipline.formula}
    finalScore={calculatedFinalScore}
  />
  
  <ActionButtons
    onSave={handleSave}
    onReset={handleReset}
  />
</EventManagementTemplate>
```

### ScoreInputField Component

**Reusable input component for D/E/A fields:**

```tsx
<ScoreInputField
  field={{
    id: 1,
    name: "D-Note",
    shortName: "D",
    minValue: 0.0,
    maxValue: 10.0,
    decimalPlaces: 2
  }}
  value={8.5}
  onChange={(value) => handleChange(1, value)}
  disabled={saving}
/>
```

---

## 🔧 Configuration Guide

### Setting up a TGM Competition

#### 1. Create Discipline Fields

```sql
-- For Boden (Floor) - Discipline ID: 74
INSERT INTO tfx_disziplinen_felder (
  int_disziplinenid, var_name, var_kurzname, 
  int_reihenfolge, bol_endwert, int_gruppe, bol_enabled
) VALUES
  (74, 'Schwierigkeit', 'D', 1, false, 0, true),
  (74, 'Ausführung', 'E', 2, false, 0, true),
  (74, 'Artistik', 'A', 3, false, 0, true),
  (74, 'Endwert', 'Total', 4, true, 0, true);
```

#### 2. Set Formula in Discipline

```sql
UPDATE tfx_disziplinen 
SET var_formel = 'D + E + A'
WHERE int_disziplinenid = 74;
```

#### 3. Configure Competition

```sql
UPDATE tfx_wettkaempfe
SET 
  bol_gruppe = true,           -- Enable group scoring
  int_versuche = 1             -- 1 attempt per discipline
WHERE int_wettkaempfeid = 59;
```

#### 4. Assign Groups to Competition

```sql
-- Use existing group assignment logic
-- Groups created in Groups Management page
```

---

## 🔄 C++ Compatibility

### Reading Scores (C++ ↔ Web)

**C++ Code** can read group scores created by web app:

```cpp
// result_calc.cpp - Existing query works!
QSqlQuery res;
res.prepare(
  "SELECT tfx_wertungen.int_wertungenid, "
  "       tfx_wertungen_details.int_disziplinenid, "
  "       max(tfx_wertungen_details.rel_leistung), "
  "       tfx_wertungen_details.int_kp "
  "FROM tfx_wertungen "
  "LEFT JOIN tfx_wertungen_details USING (int_wertungenid) "
  "WHERE int_wettkaempfeid = ? "
  "  AND int_gruppenid IS NOT NULL "  // Groups only
  "GROUP BY int_wertungenid, int_disziplinenid, int_kp"
);
```

**No changes required** - existing C++ logic handles groups automatically!

### Writing Scores (C++ → Web)

**Web App** can read group scores created by C++ app:

```typescript
// API automatically detects scoring level
const scores = await prisma.tfx_wertungen.findMany({
  where: { int_wettkaempfeid: competitionId }
});

scores.forEach(score => {
  const level = score.int_gruppenid ? 'group' 
              : score.int_mannschaftenid ? 'team' 
              : 'individual';
  console.log(`Score level: ${level}`);
});
```

### Key Compatibility Points

✅ **Database Schema**: Unchanged - both use same tables  
✅ **Field IDs**: `int_kp` used consistently for component identification  
✅ **Queries**: C++ GROUP BY int_kp works with web-created data  
✅ **Formulas**: Web app respects `var_formel` from database  
✅ **Status**: Both use `tfx_status` table  
✅ **Jury Results**: `tfx_jury_results.int_kp` compatible  

---

## 📊 Future Enhancements

### Phase 2 (Optional - Later)

1. **Multi-Judge Support**
   - Store individual judge scores in `tfx_jury_results`
   - Calculate median/average
   - Show judge panel breakdown

2. **Component Display in Results**
   - Toggle to show D/E/A breakdown
   - Export components to PDF
   - Historical component analysis

3. **Advanced Formulas**
   - Support for: `MAX()`, `MIN()`, `AVG()`
   - Conditional logic: `IF(D > 5, D + E, D * 0.5)`
   - Penalty deductions: `D + E - P1 - P2`

4. **Live Scoring Display**
   - Real-time component updates
   - Leaderboard with component breakdown
   - Jury Portal: component entry by judges

---

## 🐛 Troubleshooting

### Issue: Components not saving

**Check:**
1. `int_kp` references valid field ID in `tfx_disziplinen_felder`
2. `int_disziplinenid` matches discipline
3. `bol_enabled = true` for field

### Issue: Formula not calculating

**Check:**
1. `var_formel` is set in `tfx_disziplinen`
2. All variable names (D, E, A) match field short names
3. Formula syntax is valid JavaScript expression

### Issue: C++ app not showing web scores

**Check:**
1. `int_kp` is set correctly (not NULL)
2. Final score has `bol_endwert = true` field
3. Status ID is valid in `tfx_status`

---

## 📚 Related Documentation

- [API_ROUTE_MISMATCHES.md](../../_archive_root_docs/API_ROUTE_MISMATCHES.md) - Field mapping patterns
- [PRIORITY_FIXES_LOG.md](../../_archive_root_docs/PRIORITY_FIXES_LOG.md) - Implementation history
- [Instructions.md](../../newWebBased/Instructions.md) - Detailed feature tracking

---

## ✅ Implementation Checklist

### Phase 1: API & Data Model
- [ ] Create `/api/scores/group` POST endpoint
- [ ] Create `/api/scores/group/:groupId` GET endpoint
- [ ] Create `/api/scores/team` POST endpoint  
- [ ] Create `/api/scores/team/:teamId` GET endpoint
- [ ] Implement formula evaluation engine
- [ ] Add validation for component values
- [ ] Write API tests

### Phase 2: UI Components
- [ ] Create `ScoreCaptureGroup/index.tsx`
- [ ] Create `ScoreCaptureTeam/index.tsx`
- [ ] Create `ScoreInputField.tsx` component
- [ ] Create `FormulaDisplay.tsx` component
- [ ] Add to EventManagementTemplate navigation
- [ ] Implement real-time calculation
- [ ] Add i18n translations (de/en)

### Phase 3: Testing
- [ ] Test with TGM competition format
- [ ] Verify C++ compatibility (read/write)
- [ ] Test multiple attempts
- [ ] Test formula calculations
- [ ] Integration test with Jury Portal

---

**End of Group/Team Scoring Architecture Documentation**
