/**
 * @turnfix/shared — barrel export
 *
 * Re-exports every public symbol from the shared utilities.
 *
 * NOTE: scoreFormatter is NOT barrel-exported because its `formatScore`
 * collides with the one in formulaUtils. Use a subpath import instead:
 *   import { ... } from '@turnfix/shared/dist/scoreFormatter'
 */

export * from './ageCheckUtils';
export * from './formulaUtils';
export * from './builtInFormulaHelper';
export * from './genderHelpers';
export * from './iconUtils';
export * from './rankingUtils';
export * from './socketConfig';
export * from './eventDateUtils';
export * from './scoringInputMode';

// React components (separate export to avoid bundler issues)
export { BuiltInFormulaInput, type BuiltInFormulaInputProps } from './components/BuiltInFormulaInput';
