/**
 * ScoreCapture Page - Transitional Index
 * Point 123: Separation of Concerns - IN PROGRESS
 * 
 * STATUS: Partial Refactoring Complete
 * ✅ Created: Hooks (useScoreData, useScoreMatrix, useFormulaCalculation, useScoreValidation)
 * ✅ Created: HelpPanel component
 * 🚧 TODO: Extract remaining components (ScoreTable, ParticipantRow, ScoreFilters, SquadStatusSelector)
 * 🚧 TODO: Create main orchestration component using extracted hooks
 * 
 * For now, we re-export the original implementation while we continue refactoring.
 * The hooks are ready to use when components are extracted.
 */

// Temporary: Re-export original implementation
export { ScoreCapture, ScoreCapture as default } from '../ScoreCapture';

// Ready to use when refactoring is complete:
// export { useScoreData, useScoreMatrix, useFormulaCalculation, useScoreValidation } from './hooks';
// export { HelpPanel } from './components/HelpPanel';
