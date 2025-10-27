# Archived Index File Variants

**Archive Date:** 2025-10-27  
**Reason:** Code Cleanup - Point 29a) in Instructions.md  
**Total Files Archived:** 4 index variants

## Overview
This folder contains alternative/backup versions of the main `index.ts` file that were created during development but are no longer needed.

## Archived Files

### Index File Variants (4 files)
- `index_backup.ts` (3,799 bytes) - Backup version from August 25, 2025
- `index_clean.ts` (4,183 bytes) - Cleaned up version
- `index_new.ts` (4,013 bytes) - Alternative implementation (referenced archived routes)
- `index-minimal.ts` (2,692 bytes) - Minimal version

**Active File:** `../index.ts` (14,004 bytes) - Current production version with all 34 active routes

## Why These Were Archived
- `index_new.ts` - Referenced routes that no longer exist (events_debug, participants_simple)
- `index_backup.ts` - Old backup from development
- `index_clean.ts` - Experimental clean version
- `index-minimal.ts` - Minimal test version

## Active Routes in Production index.ts
The current `src/index.ts` imports and uses 34 route files:
- disciplines, disciplineFields, associations, regions, clubs, events
- areas, sports, formulas, disciplineGroups, statuses, countries
- teams, venues, persons, participants, eventParticipants
- results, competitions, squadManagement, squad-disciplines
- competition-status, scores, admin, layouts, images
- meldematrix, medals, juryResults, wertungenDetails
- configuration, timePlanning, firewall, appSettings

---

**Part of:** Point 29a - Code Cleanup & Refactoring  
**Related:** See also `routes/_archive/README.md` for route file archives
