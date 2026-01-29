<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# 🚨 CRITICAL: Database Query Rules

## MANDATORY WORKFLOW for ALL Database Queries

**BEFORE writing ANY SQL query, Prisma query, or database operation:**

### Step 1: READ THE SCHEMA FIRST
```
✅ ALWAYS read server/prisma/schema.prisma FIRST
✅ Find the exact model you need
✅ Copy table/column names EXACTLY as written
✅ Never proceed without verification
```

### Step 2: USE EXACT NAMES
```
✅ Table names: Use EXACT name from schema (e.g., tfx_wertungen_details)
✅ Column names: Use EXACT name from schema (e.g., int_sortierung, not int_reihenfolge)
✅ Copy-paste names from schema to avoid typos
```

### Step 3: NEVER DO THIS
```
❌ NEVER assume column names without checking
❌ NEVER use similar names from other tables
❌ NEVER copy SQL from other files without verifying
❌ NEVER invent new names
❌ NEVER guess "it's probably called var_kurz"
```

### Example - WRONG vs RIGHT:

**❌ WRONG (assumed/guessed names):**
```sql
SELECT df.var_kurz, df.int_reihenfolge 
FROM tfx_disziplinenfelder df  -- Missing underscores!
```

**✅ RIGHT (verified in schema first):**
1. Read schema.prisma → Find `model tfx_disziplinen_felder`
2. See columns: `var_name`, `int_sortierung`
3. Write SQL:
```sql
SELECT df.var_name, df.int_sortierung
FROM tfx_disziplinen_felder df  -- Correct underscores!
```

## Common Mistakes to Avoid
- `tfx_wertungendetails` → ❌ WRONG, it's `tfx_wertungen_details` (with underscores)
- `int_reihenfolge` → ❌ WRONG, it's `int_sortierung`
- `var_kurz` → ❌ WRONG, it's `var_name` (in most tables)
- `flo_startwert` → ❌ WRONG, column doesn't exist in many tables

## If Schema is Unclear
1. Use `grep_search` to find existing queries for that table
2. Check multiple files to see consistent naming
3. When in doubt, ASK the user instead of guessing

---

# Project Setup Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
	<!-- Modern full-stack gymnastics management system with Node.js/Express backend, React frontend, PostgreSQL, JWT auth, TypeScript -->

- [x] Scaffold the Project
	<!-- Created complete project structure with backend (Express/Prisma/JWT) and frontend (React/TypeScript/Tailwind) -->

- [x] Customize the Project
	<!-- Added modern authentication system, database models for gymnastics management, and comprehensive API routes -->

- [x] Install Required Extensions
	<!-- No specific extensions required for this project type -->

- [x] Compile the Project
	<!-- Successfully installed dependencies and compiled both server and client projects -->

- [x] Create and Run Task
	<!-- Created development task running both server and client concurrently - servers running on ports 3001 and 5173 -->

- [x] Launch the Project
	<!-- Project launched successfully - frontend at http://localhost:5173, backend API at http://localhost:3001/api -->

- [x] Ensure Documentation is Complete
	<!-- Created comprehensive README.md, GETTING_STARTED.md with setup instructions, database seeding, and project overview completed -->
