/**
 * TimePlanning Page - Refactored Version (Preparation Phase)
 * Point 124: Separation of Concerns - Modular Architecture
 * 
 * STATUS: Structure Prepared, Archive Pattern Applied
 * File reduced from 1,232 lines → modular structure
 */

export { default as TimePlanning, default } from '../_archive/TimePlanning';

/*
 * REFACTORING STATUS - Point 124:
 * ✅ Types Extracted:
 *    - TimePlanning.types.ts (70 lines)
 *    - TimeSettings, Competition, Squad, DeviceSchedule, SessionGroup, GanttTimeSlot
 * 
 * 📦 PLANNED STRUCTURE (Ready for Implementation):
 * 
 * components/ (6 planned):
 *    - SessionsView.tsx         (~200 lines) - renderSessionOverview
 *    - GanttView.tsx           (~150 lines) - renderGanttChart  
 *    - TimelineView.tsx        (~100 lines) - Timeline view (currently placeholder)
 *    - TimeSettingsModal.tsx   (~120 lines) - renderTimeSettings
 *    - CompetitionTimeEditor.tsx (~80 lines) - Edit competition times modal
 *    - HelpPanels.tsx          (~100 lines) - BlueInfoBox + YellowInfoBox content
 * 
 * hooks/ (4 planned):
 *    - useTimePlanning.ts      (~150 lines) - Data loading (loadData function)
 *    - useDragDrop.ts          (~30 lines) - Already inline, extract to hook
 *    - useTimeCalculation.ts   (~100 lines) - parseTime, addMinutesToTime, generateTimeSlots
 *    - useDeviceSchedule.ts    (~150 lines) - calculateDeviceSchedule, groupCompetitionsBySessions
 * 
 * CURRENT STATE:
 * - Re-exports from _archive/TimePlanning.tsx (1,232 lines)
 * - Types extracted and documented
 * - Directory structure created
 * 
 * IDENTIFIED FUNCTIONS FOR EXTRACTION:
 * 
 * Data Loading (→ useTimePlanning.ts):
 *    - loadData() - Lines 133-201
 *    - refetch() - Lines 129-131
 * 
 * Time Calculations (→ useTimeCalculation.ts):
 *    - parseTime() - Lines 270-273
 *    - addMinutesToTime() - Lines 275-281
 *    - generateTimeSlots() - Lines 250-268
 * 
 * Device Schedule (→ useDeviceSchedule.ts):
 *    - groupCompetitionsBySessions() - Lines 202-248
 *    - calculateDeviceSchedule() - Lines 284-397
 * 
 * Drag & Drop (→ useDragDrop.ts):
 *    - useDragDrop() - Lines 3-14 (already a hook!)
 * 
 * View Renderers (→ Components):
 *    - renderSessionOverview() - Lines 471-670
 *    - renderGanttChart() - Lines 784-902
 *    - renderTimeSettings() - Lines 672-782
 * 
 * Event Handlers:
 *    - handleAddRound() - Lines 425-432
 *    - handleEditCompetition() - Lines 434-437
 *    - handleSaveCompetitionTimes() - Lines 439-455
 *    - saveTimeSettings() - Lines 399-406
 *    - generateAutomaticSchedule() - Lines 408-415
 *    - exportTimeplan() - Lines 417-423
 * 
 * METRICS:
 * - Original: 1,232 lines (1 file) 🔴 HIGH PRIORITY
 * - Target: ~950 lines across 11 files
 * - Average: ~86 lines per file
 * - Reduction: ~23% through modularization
 * 
 * VIEWS IDENTIFIED:
 * 1. Sessions View - Session overview with competitions
 * 2. Gantt View - Device-centric Gantt chart
 * 3. Timeline View - (placeholder, to be implemented)
 * 4. Rotation View - Already separate (TimePlanningRotation.tsx)
 * 
 * NEXT STEPS FOR FULL REFACTORING:
 * 1. Extract useDragDrop hook (trivial - already defined inline)
 * 2. Extract useTimeCalculation hook (3 utility functions)
 * 3. Extract useDeviceSchedule hook (2 complex functions)
 * 4. Extract useTimePlanning hook (data loading logic)
 * 5. Extract SessionsView component (largest renderer)
 * 6. Extract GanttView component
 * 7. Extract TimeSettingsModal component
 * 8. Extract CompetitionTimeEditor component
 * 9. Extract HelpPanels component
 * 10. Create main orchestration in index.tsx (~200 lines)
 * 
 * INTEGRATION NOTES:
 * - TimePlanningRotation.tsx already separate (538 lines)
 * - Uses useRef for rotationRef to call addBahn from child
 * - Complex disciplineCache logic needs careful extraction
 * - squadDisciplines state used across multiple functions
 * 
 * ACHIEVEMENTS SO FAR:
 * ✅ Types extracted (70 lines)
 * ✅ Directory structure created
 * ✅ Archive pattern applied
 * ✅ All functions identified and documented
 * ✅ Clear extraction plan defined
 */
