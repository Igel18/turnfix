/**
 * @turnfix/shared — barrel export
 *
 * Re-exports every public symbol from the shared utilities.
 *
 * NOTE: scoreFormatter is NOT barrel-exported because its `formatScore`
 * collides with the one in formulaUtils. Use a subpath import instead:
 *   import { ... } from '@turnfix/shared/dist/scoreFormatter'
 */

export * from './formulaUtils';
export * from './genderHelpers';
export * from './iconUtils';
export * from './socketConfig';
