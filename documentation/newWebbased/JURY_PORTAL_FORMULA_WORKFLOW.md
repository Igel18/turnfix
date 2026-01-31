# Jury Portal - Formula-Based Scoring Workflow

**Version**: 1.0 | **Date**: 2026-01-31

## 📋 Overview

Formula-based scoring allows jury members to input individual field values (A, B, C...) which are automatically calculated to produce a final score using a formula like `(10 + A) - B`.

---

## 🔄 Complete Workflow

### 1️⃣ **PAGE LOAD** - Initial Data Loading

#### Step 1.1: Load Participants with Scores
**What happens:**
- API Call: `GET /api/scores?eventId={eventId}&limit=1000`
- Server performs JOIN across multiple tables:
  ```sql
  SELECT 
    w.int_wertungenid as id,           -- wertungenId
    t.int_teilnehmerid as participantId,
    t.var_vorname as firstName,
    t.var_nachname as lastName,
    t.var_startnummer as startNumber,
    v.var_name as clubName,
    wd.rel_leistung as score,          -- Final score
    wd.int_disziplinenid as disciplineId,
    wk.int_veranstaltungenid as eventId
  FROM tfx_wertungen w
  LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
  LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
  LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
  LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
  WHERE wk.int_veranstaltungenid = {eventId}
  ```

- For each score record, extract:
  - `id` → **wertungenId** (int_wertungenid from tfx_wertungen)
  - `participantId` → int_teilnehmerid from tfx_teilnehmer
  - `score` → rel_leistung from tfx_wertungen_details
  - `firstName`, `lastName` → from tfx_teilnehmer
  - `clubName` → from tfx_vereine
  - `startNumber` → from tfx_teilnehmer
  - `disciplineId` → from tfx_wertungen_details

**UI Fields:**
- Participant list (left panel)
- Shows: Name, Club, Start Number, Current Score (if exists), Status Icon

**Database Tables Involved:**
- `tfx_wertungen` - Main score entry (links teilnehmer to wettkaempf, provides wertungenId)
- `tfx_wertungen_details` - Stores final score per discipline (`rel_leistung`)
- `tfx_teilnehmer` - Participant details (name, start number)
- `tfx_vereine` - Club/association details
- `tfx_wettkaempfe` - Competition details (links to event)

**Expected State After:**
```javascript
participants = [
  {
    id: 100,              // participantId (int_teilnehmerid)
    participantId: 100,   // Same as id
    wertungenId: 116,     // int_wertungenid from tfx_wertungen (via score.id)
    name: "Luis Bader",   // Concatenated from firstName + lastName
    firstName: "Luis",    // tfx_teilnehmer.var_vorname
    lastName: "Bader",    // tfx_teilnehmer.var_nachname
    club: "TSV Markt Wald", // tfx_vereine.var_name
    clubName: "TSV Markt Wald",
    startNumber: 1,       // tfx_teilnehmer.var_startnummer
    currentScore: 11.90,  // tfx_wertungen_details.rel_leistung
    status: 'completed'   // Calculated: 'completed' if score exists, else 'pending'
  }
]
currentParticipantIndex = 0
```

**Important Notes:**
- **wertungenId** (116) is the PRIMARY KEY we use for ALL subsequent jury-results queries
- **participantId** (100) is only used for display/identification
- If a participant has no score yet, `wertungenId` will be `null` and must be created in Step 3.1

---

#### Step 1.2: Load Discipline Fields
**What happens:**
- API Call: `GET /api/discipline-fields`
- Filter by `disciplineId` and `enabled = true`
- Sort by `sortOrder`

**UI Fields:**
- Formula input fields (A, B, C...)
- Field labels (e.g., "A: Stufe", "B: AbzugAusf.")

**Database Tables:**
- `tfx_disziplinen_felder`
  - `int_disziplinen_felderid` - Field ID
  - `var_name` - Field name (e.g., "Stufe")
  - `int_sortierung` - Sort order (determines A=0, B=1, C=2...)
  - `bol_endwert` - Is final score field? (true/false)
  - `bol_ausgangswert` - Is starting value? (true/false)

**Expected State After:**
```javascript
disciplineFields = [
  { id: 41, name: "Stufe", sortOrder: 0, isFinalScore: false },        // → A
  { id: 42, name: "AbzugAusf.", sortOrder: 1, isFinalScore: false },   // → B
  { id: 43, name: "Endnote", sortOrder: 2, isFinalScore: true }        // → Final
]
```

---

#### Step 1.3: Load Saved Jury Results (Pre-fill Fields)
**What happens:**
- **Trigger**: When `currentParticipant`, `selectedDevice`, and `disciplineFields` are all available
- API Call: `GET /api/jury-results?participantId={wertungenId}&disciplineId={disciplineId}`
  - **IMPORTANT**: Use `wertungenId` (not teilnehmerid) as `participantId` parameter
- **Load ALL saved fields** from `tfx_jury_results`:
  - Non-final fields (A, B, C...) → for input pre-fill
  - Final field (if exists) → for verification/consistency check
- Map to symbols: A=first non-final field, B=second non-final field, etc.

**UI Fields:**
- Pre-fill input fields A, B, C... with saved values
- Display calculated result (should match saved final score)

**Database Tables:**
- `tfx_jury_results`
  - `int_wertungenid` - Links to wertungen (score entry)
  - `int_disziplinen_felderid` - Which field (A, B, or final)
  - `rel_leistung` - The value (e.g., 6.10, 3.05, or 13.10)
  - `int_versuch` - Attempt number
  - `int_kp` - Type (0=Pflicht, 1=Kür)

**Query Returns ALL Fields:**
```javascript
// Raw API response
results: [
  { fieldId: 41, performance: 6.10, isFinalScore: false, sortOrder: 0 },  // Field A
  { fieldId: 42, performance: 3.05, isFinalScore: false, sortOrder: 1 },  // Field B
  { fieldId: 43, performance: 13.05, isFinalScore: true, sortOrder: 2 }   // Final (for verification)
]
```

**Expected State After (Non-Final Fields Only):**
```javascript
// Only map non-final fields to input symbols
loadedJuryResults = {
  A: 6.10,   // From jury_results for field 41 (bol_endwert = false)
  B: 3.05    // From jury_results for field 42 (bol_endwert = false)
}
// Final field (13.05) is NOT mapped to input, but can be used for consistency check
```

**Data Flow:**
1. Load ALL jury_results (including final field)
2. Filter non-final fields → Map to A, B, C for input pre-fill
3. Filter final field → Use for verification (should match currentScore from Step 1.1)
4. If mismatch: Log warning (optional: show user notification)

**UI Display:**
```
A: Stufe          [6.10]
B: AbzugAusf.     [3.05]
Berechnetes Ergebnis: 13.05
```

---

### 2️⃣ **USER INPUT** - Entering/Editing Values

#### Step 2.1: User Types in Fields
**What happens:**
- User changes value in field A or B
- `onScoreChange` handler fires
- Formula is calculated **client-side**: `(10 + 6.15) - 3.05 = 13.10`
- Display updates in real-time

**UI Fields:**
- Input fields A, B
- Calculated result display (green box)

**Database Tables:**
- None (not saved yet)

**Expected State After Input:**
```javascript
fieldInputs = {
  A: "6.15",   // String for editing (allows typing "6.")
  B: "3.05"
}
fieldValues = {
  A: 6.15,     // Number for calculation
  B: 3.05
}
calculatedScore = 13.10   // From formula
score = "13.10"           // Formatted string
```

**UI Display:**
```
A: Stufe          [6.15]
B: AbzugAusf.     [3.05]
Berechnetes Ergebnis: 13.10
```

---

### 3️⃣ **SAVE** - Persisting to Database

#### Step 3.1: Ensure wertungenId Exists
**What happens:**
- Check if `currentParticipant.wertungenId` exists
- If not, create score entry first:
  - API Call: `POST /api/scores/save-value`
  - Body: `{ competitionId, participantId, disciplineId, score: 0 }`
  - Response contains `wertungenId`

**Database Tables:**
- `tfx_wertungen` - Creates entry linking teilnehmerid → wertungenid
- `tfx_wertungen_details` - Creates entry for discipline score

---

#### Step 3.2: Save Individual Field Values
**What happens:**
- For each field (A, B), save to jury_results:
  - API Call: `POST /api/jury-results`
  - Body: `{ participantId: wertungenId, disciplineFieldId, performance, attempt: 1, type: 0 }`
  - **IMPORTANT**: Use `wertungenId` as `participantId` (server interprets it correctly)

**Database Tables:**
- `tfx_jury_results`
  - INSERT or UPDATE based on (int_wertungenid, int_disziplinen_felderid, int_versuch)
  
**Example Records:**
```sql
-- Field A (Stufe)
INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
VALUES (116, 41, 6.15, 1, 0);

-- Field B (AbzugAusf.)
INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
VALUES (116, 42, 3.05, 1, 0);
```

---

#### Step 3.3: Save Final Calculated Score
**What happens:**
- Calculate final score **client-side** (already in `score` state)
- Save final score:
  - API Call: `POST /api/scores/save-value`
  - Body: `{ competitionId, participantId: wertungenId, disciplineId, score: 13.10 }`
  - Server updates BOTH tables:
    - `tfx_wertungen_details.rel_leistung = 13.10` (legacy compatibility)
    - `tfx_jury_results` with final score field (bol_endwert = true)

**Database Tables:**
- `tfx_wertungen_details`
  - UPDATE `rel_leistung = 13.10` WHERE `int_wertungenid = 116` AND `int_disziplinenid = 111`
- `tfx_jury_results`
  - INSERT/UPDATE for final score field (int_disziplinen_felderid = 43)

**Example SQL:**
```sql
-- Update final score in wertungen_details (main score table)
UPDATE tfx_wertungen_details 
SET rel_leistung = 13.10 
WHERE int_wertungenid = 116 AND int_disziplinenid = 111;

-- Also save to jury_results for final field (optional, for consistency)
INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
VALUES (116, 43, 13.10, 1, 0);
```

---

#### Step 3.4: Update UI
**What happens:**
- Update participant list: `currentScore = 13.10`, `status = 'completed'`
- Show success toast
- Emit Socket.IO event for live updates

**UI Fields:**
- Participant list shows ✓ checkmark and score "13.10"

---

### 4️⃣ **RELOAD PAGE** - Verify Persistence

#### Step 4.1: Load Participants (with Scores)
**Same as Step 1.1**
- Should load: `currentScore: 13.10`, `wertungenId: 116`

#### Step 4.2: Load Discipline Fields
**Same as Step 1.2**

#### Step 4.3: Load Saved Jury Results
**Same as Step 1.3**
- Should load: `{ A: 6.15, B: 3.05 }`
- FormulaInput pre-fills fields with these values
- Recalculates: `(10 + 6.15) - 3.05 = 13.10`

**Expected UI After Reload:**
```
Teilnehmerliste:
  Luis Bader - TSV Markt Wald - 13.10 ✓

Eingabefelder:
  A: Stufe          [6.15]   ← Loaded from tfx_jury_results
  B: AbzugAusf.     [3.05]   ← Loaded from tfx_jury_results
  Berechnetes Ergebnis: 13.10 ← Recalculated client-side
```

---

## 🔑 Critical Implementation Points

### 1. **wertungenId vs participantId**
- ✅ **Client**: Calls API with `participantId: wertungenId`
- ✅ **Server**: Interprets `participantId` as `int_wertungenid` in SQL queries
- ❌ **NEVER** use `int_teilnehmerid` for jury-results queries

### 2. **Client-Side Calculation**
- ✅ Formula evaluated in browser using `calculateFormula()`
- ✅ No `/scores/calculate-final` endpoint needed
- ✅ Matches ScoreCapture implementation

### 3. **Loading Jury Results**
- ✅ Only load when ALL conditions met:
  - `currentParticipant !== null`
  - `currentParticipant.wertungenId !== null`
  - `selectedDevice !== null`
  - `disciplineFields.length > 0`
- ✅ Filter out final score field (`bol_endwert = false`)
- ✅ Map by `sortOrder` to symbols (A, B, C...)

### 4. **useEffect Dependencies**
```typescript
useEffect(() => {
  loadJuryResults();
}, [currentParticipant, selectedDevice, disciplineFields, participants, currentParticipantIndex]);
```
Must include `participants` and `currentParticipantIndex` to trigger when participants load!

---

## 🐛 Common Issues & Fixes

### Issue 1: Fields Empty After Reload
**Symptom**: `A` and `B` fields are empty, only `10` shows
**Cause**: Jury results not loaded
**Fix**: Check useEffect runs with `hasCurrentParticipant: true` and `wertungenId` defined

### Issue 2: Wrong Value Saved (e.g., `10` instead of `13.10`)
**Symptom**: `startValue` saved instead of calculated score
**Cause**: `score` state is empty or not updated
**Fix**: Ensure `onScoreChange` handler sets `score` state correctly

### Issue 3: 404 on API Calls
**Symptom**: `/api/scores/calculate-final` returns 404
**Cause**: Using wrong endpoint (doesn't exist in ScoreCapture pattern)
**Fix**: Remove calculate-final call, use client-side calculation + save-value

---

## 📊 Database Schema Reference

### tfx_wertungen
```sql
int_wertungenid    PK   -- Score entry ID (this is the wertungenId!)
int_teilnehmerid        -- Participant ID (links to tfx_teilnehmer)
int_wettkaempfeid       -- Competition ID
```

### tfx_wertungen_details
```sql
int_wertungenid         -- Links to tfx_wertungen
int_disziplinenid       -- Discipline ID
rel_leistung            -- FINAL SCORE (e.g., 13.10)
```

### tfx_jury_results
```sql
int_juryresultsid  PK   -- Jury result ID
int_wertungenid         -- Links to tfx_wertungen (USE THIS!)
int_disziplinen_felderid-- Field ID (41=Stufe, 42=AbzugAusf., 43=Endnote)
rel_leistung            -- Field value (6.15, 3.05, or 13.10 for final)
int_versuch             -- Attempt number (usually 1)
int_kp                  -- Type: 0=Pflicht, 1=Kür
```

### tfx_disziplinen_felder
```sql
int_disziplinen_felderid PK  -- Field ID
int_disziplinenid            -- Discipline ID
var_name                     -- Field name ("Stufe", "AbzugAusf.")
int_sortierung               -- Sort order (0, 1, 2...) → Maps to A, B, C
bol_endwert                  -- Is final score? (true/false)
bol_ausgangswert             -- Is starting value? (true/false)
```

---

## 🔄 Data Consistency & Sync Rules

### **CRITICAL: Source of Truth**

**tfx_wertungen_details.rel_leistung** is the **SOURCE OF TRUTH** for final scores!

When there's a mismatch between tables:
- ✅ **CORRECT**: `tfx_wertungen_details` → overwrites → `tfx_jury_results` (Endwert field)
- ❌ **WRONG**: `tfx_jury_results` → overwrites → `tfx_wertungen_details`

### Sync Implementation

**Location**: `server/src/routes/scores.ts` (GET `/scores` endpoint)

**Logic**:
```typescript
// After loading scores and jury results
if (wertungsDetailsScore !== juryFinalScore) {
  console.log(`⚠️ Score mismatch: wertungen_details=${wertungsDetailsScore}, jury_results=${juryFinalScore}`);
  
  // UPDATE jury_results to match wertungen_details (NOT the other way!)
  await prisma.$executeRawUnsafe(`
    UPDATE tfx_jury_results
    SET rel_leistung = $1
    WHERE int_wertungenid = $2 AND int_disziplinen_felderid = $3
  `, wertungsDetailsScore, wertungenId, endwertFieldId);
}
```

**Why this matters:**
- `tfx_wertungen_details` is updated by `/scores/save-value` (authoritative)
- `tfx_jury_results` Endwert field should mirror this value
- Prevents old jury_results values from overwriting correct scores
- Ensures consistency across both tables on every load

### Save Order (Step 3)

**MUST save in this order:**
1. Save A, B, C fields → `tfx_jury_results` (non-final fields)
2. Save calculated final score → `tfx_jury_results` (Endwert field with bol_endwert=true)
3. Save calculated final score → `tfx_wertungen_details.rel_leistung`

**Both steps 2 and 3 are required** to maintain consistency!

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Page load shows participants with existing scores
- [ ] Selecting participant loads jury results (A, B fields pre-filled)
- [ ] Editing fields updates calculated score in real-time
- [ ] Save button:
  - [ ] Saves individual field values to `tfx_jury_results`
  - [ ] Saves final score to `tfx_wertungen_details.rel_leistung`
  - [ ] Updates participant list with final score
- [ ] Reload page shows:
  - [ ] Participant score in list (13.10)
  - [ ] Fields A, B pre-filled with saved values
  - [ ] Calculated score matches saved score
- [ ] Socket.IO events trigger live updates across clients

---

**End of Workflow Documentation**
