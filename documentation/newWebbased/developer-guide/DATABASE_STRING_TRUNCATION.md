# Database String Truncation Guards

**Date**: 2026-02-13  
**Related**: Instructions2.md Item 2  
**Status**: ✅ Implemented

## Problem

During the Database Setup Wizard, the steps **"Produktions-Disziplinen importieren"** and **"GymNet-Voreinstellungen"** failed with:

```
Invalid `prisma.tfx_disziplinen.create()` invocation:
The provided value for the column is too long for the column's type. Column: (not available)
```

### Root Cause

Several discipline names (especially Turn10® Basis variants) exceeded the database column length limits. For example:

| Discipline Name | `anzeigename` (→ `var_kurz2`) | Length | DB Limit |
|---|---|---|---|
| Turn10® Basis Boden | Turn10® Basis Boden | 25 chars | VarChar(20) |
| Turn10® Basis Sprung | Turn10® Basis Sprung | 26 chars | VarChar(20) |
| Turn10® Basis Barren | Turn10® Basis Barren | 26 chars | VarChar(20) |
| Turn10® Basis Reck | Turn10® Basis Reck | 24 chars | VarChar(20) |

Prisma does not name the column in the error message (`Column: (not available)`), making debugging harder.

## Solution

Added defensive `.substring()` truncation to **all string columns** in both import utilities, matching the exact database constraints from `schema.prisma`.

### Affected Files

1. **`server/src/utils/productionDisciplinesImport.ts`** — Imports ~139 production disciplines from JSON
2. **`server/src/utils/gymnetPreset.ts`** — Imports 60+ GymNet devices, formulas, and fields

### Truncation Map

#### Table: `tfx_disziplinen`

| Column | DB Type | Truncation | Purpose |
|---|---|---|---|
| `var_name` | VarChar(100) | `.substring(0, 100)` | Full discipline name |
| `var_kurz1` | VarChar(6) | `.substring(0, 6)` | Short abbreviation |
| `var_kurz2` | VarChar(20) | `.substring(0, 20)` | Display name |
| `var_maske` | VarChar(10) | `.substring(0, 10)` | Input mask |
| `var_einheit` | VarChar(5) | `.substring(0, 5)` | Unit |
| `var_icon` | VarChar(50) | `.substring(0, 50)` | Icon identifier |
| `var_kuerzel` | VarChar(50) | `.substring(0, 50)` | Abbreviation/code |

#### Table: `tfx_disziplinen_felder`

| Column | DB Type | Truncation | Purpose |
|---|---|---|---|
| `var_name` | VarChar(15) | `.substring(0, 15)` | Field name |

### Code Pattern

```typescript
// ✅ CORRECT: Always truncate to DB column width
var_name: disc.name?.substring(0, 100),           // DB: VarChar(100)
var_kurz1: disc.kurzname?.substring(0, 6),         // DB: VarChar(6)
var_kurz2: disc.anzeigename?.substring(0, 20),     // DB: VarChar(20)

// ❌ WRONG: No truncation — may fail on long values
var_name: disc.name,
var_kurz1: disc.kurzname,
var_kurz2: disc.anzeigename,
```

## Best Practice

When inserting data into the database via Prisma, **always apply `.substring()` truncation** for `VarChar` columns where the source data length is not guaranteed. This is especially important for:

- User-entered data
- External data sources (GymNet XML, JSON presets)
- Computed/concatenated strings

### How to Find Column Limits

1. Open `server/prisma/schema.prisma`
2. Find the model (e.g., `model tfx_disziplinen`)
3. Check `@db.VarChar(N)` annotations for the exact limit
4. Apply `.substring(0, N)` before insertion

## Important Note

After changing server source files, you **must rebuild and restart**:

```powershell
cd server
npm run build        # Compile TS → dist/
npx pm2 restart all  # Restart with new code
```

The server runs from the compiled `dist/` folder, **not** from source. Source-only changes have no effect until rebuilt.
