# Archived Route Files

**Archive Date:** 2025-10-27  
**Reason:** Code Cleanup - Point 29a) in Instructions.md  
**Total Files Archived:** 24 route files + 4 index variants = **28 files total**

## Overview
This folder contains route files that were not imported/used in `server/src/index.ts`. These files were likely created during development iterations, experiments, or as backups, but are no longer needed in the active codebase.

**Note:** Additional index file variants were also archived in `src/_archive/` (index_backup.ts, index_clean.ts, index_new.ts, index-minimal.ts)

## Archived Files by Category

### 🏅 Medals Routes (6 files)
- `medals_old.ts` (10,339 bytes) - Old implementation
- `medals_simple.ts` (5,812 bytes) - Simplified version
- `medals_ultra_simple.ts` (4,298 bytes) - Ultra simplified version
- `medals_broken.ts` (6,048 bytes) - Broken/experimental version
- `medals_new.ts` (10,386 bytes) - Alternative new implementation
- `medals-simple.ts` (1,802 bytes) - Another simple variant

**Active File:** `medals.ts` (11,178 bytes) - Latest working version with ranking fix (Gold → Silver → Bronze)

---

### 🎯 Events Routes (7 files)
- `events_backup.ts` (55,953 bytes) - Large backup file
- `events_debug.ts` (6,500 bytes) - Debug version
- `events_new.ts` (10,562 bytes) - Alternative implementation
- `events-clean.ts` (7,911 bytes) - Cleaned up version
- `events-new.ts` (7,299 bytes) - Another new variant
- `events-simple.ts` (0 bytes) - Empty file
- `events.test.ts` (1,704 bytes) - Test file (should be in __tests__)

**Active File:** `events.ts` (124,767 bytes) - Current production version

---

### 🏢 Clubs Routes (4 files)
- `clubs_new.ts` (12,587 bytes) - Alternative implementation
- `clubs_temp.ts` (1,166 bytes) - Temporary file
- `clubsNew.ts` (18 bytes) - Nearly empty file

**Active File:** `clubs.ts` (12,869 bytes) - Current production version

---

### 🤸 Participants Routes (1 file)
- `participants_simple.ts` (5,113 bytes) - Simplified version

**Active File:** `participants.ts` - Current production version

---

### 📋 Activities Routes (2 files)
- `activities.ts` (8,051 bytes) - Main file (never imported)
- `activities_backup.ts` (8,051 bytes) - Backup

**Note:** No activities route is currently active in the system

---

### 🔐 Authentication & User Management (4 files)
These were likely planned for future use but never integrated:

- `auth.ts` (6,645 bytes) - Authentication routes (login, register, refresh tokens)
- `users.ts` (9,830 bytes) - User management routes (CRUD for tfx_personen)
- `auditLogs.ts` (10,347 bytes) - Audit logging routes
- `refreshTokens.ts` (6,045 bytes) - Refresh token management

**Note:** The system currently uses `authBypass` middleware instead of real authentication. These files may be useful if implementing proper auth in the future.

---

### 🎪 Competition Entries (1 file)
- `competitionEntries.ts` (11,142 bytes) - Competition entry management

**Note:** Functionality might be covered by existing competition routes

---

## Analysis Summary

### Duplicates Found
- **Medals:** 6 duplicate/experimental versions
- **Events:** 7 duplicate/backup versions  
- **Clubs:** 4 duplicate/temp versions
- **Total Duplicates:** 17 files

### Never Implemented (7 files)
Files that were created but never imported in `index.ts`:
- Authentication system (auth.ts, users.ts, refreshTokens.ts, auditLogs.ts)
- Activities management (activities.ts, activities_backup.ts)
- Competition entries (competitionEntries.ts)

## Recovery Instructions

If you need to restore any of these files:

```powershell
# From server/src/routes directory
Move-Item "_archive/filename.ts" "." -Force
```

Then add the import and route in `server/src/index.ts`.

## Recommendations

### Safe to Delete Permanently
- All `*_broken.ts` files - explicitly marked as broken
- All empty files (`events-simple.ts`)
- Obvious duplicates with "backup" suffix
- Files with very old modification dates (Aug 2025)

### Keep in Archive
- `auth.ts`, `users.ts`, `auditLogs.ts`, `refreshTokens.ts` - May be needed for future authentication implementation
- `events_backup.ts` - Large backup file (55KB) might contain useful logic
- `competitionEntries.ts` - Could be useful feature

### Consider Reviewing
- `users.ts` - Contains tfx_personen CRUD operations that might be useful
- `auth.ts` - Complete auth implementation with JWT, bcrypt, etc.

## Active Routes (Reference)

Current active routes in `server/src/index.ts`:
```
disciplines, disciplineFields, associations, regions, clubs, events, 
areas, sports, formulas, disciplineGroups, statuses, countries, teams, 
venues, persons, participants, eventParticipants, results, competitions, 
squadManagement, squad-disciplines, competition-status, scores, admin, 
layouts, images, meldematrix, medals, juryResults, wertungenDetails, 
configuration, timePlanning, firewall, appSettings
```

**Total Active Routes:** 34

---

**Archived by:** GitHub Copilot  
**Part of:** Point 29a - Code Cleanup & Refactoring  
**Status:** ✅ Complete
