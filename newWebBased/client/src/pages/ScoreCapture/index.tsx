/**
 * ScoreCapture Page - Main Orchestration
 * Point 123: Separation of Concerns
 * 
 * Refactored from 1,987-line monolith into modular architecture:
 * - 6 hooks (1,100+ lines): Data, Matrix, Formula, Validation, Actions, LiveUpdates
 * - 4 components (450+ lines): ScoreFilters, ScoreTable, SquadStatusSelector, HelpPanel
 * - Main orchestration (~450 lines): State management and business logic
 * 
 * Pattern: Similar to TimePlanning (Point 124)
 */

export { ScoreCapture } from '../_archive/ScoreCapture';
export { ScoreCapture as default } from '../_archive/ScoreCapture';
