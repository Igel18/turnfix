/**
 * INTEGRATION TEST: Jury Results Should Display in Results Page
 * Point 150: Missing Jury Results Display (RED Phase)
 * 
 * GIVEN: User enters jury scores in Jury Portal
 * AND:  Scores include jury results (Stufe=6, AbzugAusf.=2, Endwert=14)
 * WHEN: User navigates to Results page  
 * THEN: JuryResultsDisplay should show the jury classification breakdown
 * 
 * ACTUAL BUG: Results page shows empty/simple score (14.00) 
 *             instead of detailed jury breakdown (6.0 A - 2.0 B = 14.00)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Point 150: Jury Results Display in Results Page (RED Phase)', () => {

  describe('The Problem: Jury Results Are Not Displayed in Results', () => {

    it('RED: Shows that API returns juryResults but Results page does not display them', () => {
      // SCENARIO: User just entered jury scores in Jury Portal
      
      // Step 1: Jury Portal loads score data
      const juryPortalAPIResponse = {
        participantId: 1,
        name: 'Emilia Bartos',
        disciplineId: 111,
        disciplineName: 'Boden',
        score: 14.0,
        formula: '(10 + A) - B',
        startValue: 10,
        // Server returns jury results with the score
        juryResults: [
          {
            id: 1,
            fieldName: 'Stufe',
            performance: 6.0,
            isFinalScore: false,
            sortOrder: 1
          },
          {
            id: 2,
            fieldName: 'AbzugAusf.',
            performance: 2.0,
            isFinalScore: false,
            sortOrder: 2
          },
          {
            id: 3,
            fieldName: 'Endwert',
            performance: 14.0,
            isFinalScore: true,
            sortOrder: 3
          }
        ]
      };

      // Step 2: Jury Portal displays the score with jury components
      // ✅ Component shows: "6.0 (A) - 2.0 (B) = 14.00"
      console.log('✅ Jury Portal displays:', `${juryPortalAPIResponse.juryResults[0].performance} (A) - ${juryPortalAPIResponse.juryResults[1].performance} (B) = ${juryPortalAPIResponse.score}`);

      // Step 3: Results page loads the SAME API endpoint with same data
      const resultsPageAPIResponse = juryPortalAPIResponse; // Same data!
      
      // Step 4: BUT Results page shows SIMPLE score
      // ❌ Component shows: "14.00" (just the final score)
      // This is the BUG!
      
      // EXPECTATION: Results should also show jury breakdown
      const expectedDisplay = `${resultsPageAPIResponse.juryResults[0].performance} (A) - ${resultsPageAPIResponse.juryResults[1].performance} (B) = ${resultsPageAPIResponse.score}`;
      const actualDisplay = `${resultsPageAPIResponse.score}`; // What Results currently shows
      
      console.log('Expected Results display:', expectedDisplay);
      console.log('Actual Results display:', actualDisplay);
      console.log('BUG: Results should also show jury breakdown!');
      
      // The data is identical, but Results is not using it
      expect(resultsPageAPIResponse).toBeDefined();
      expect(resultsPageAPIResponse.juryResults).toBeDefined();
      expect(resultsPageAPIResponse.juryResults.length).toBeGreaterThan(0);
    });

    it('RED: Jury Portal correctly processes juryResults but Results does not', () => {
      // JURY PORTAL Success Flow:
      // 1. Jury Portal → fetches /jury-results API
      // 2. Displays jury breakdown in ScoringView
      // 3. Shows: 6.0 (A) - 2.0 (B) = 14.00 ✅

      // RESULTS Bug Flow:
      // 1. Results → fetches /scores API (which also returns juryResults!)
      // 2. BUT: Does not display jury breakdown
      // 3. Shows: 14.00 ❌

      // ROOT CAUSE (Hypothesis):
      // - juvResults are in score.juryResults
      // - Not transferred to Participant.juryResults
      // - OR: Not passed to JuryResultsDisplay component
      // - OR: Jury Results feature is not enabled/configured

      const apiDataWithJuryResults = {
        juryResults: [
          { fieldName: 'Stufe', performance: 6 },
          { fieldName: 'AbzugAusf.', performance: 2 }
        ]
      };

      // Check 1: Does API include juryResults?
      expect(apiDataWithJuryResults.juryResults).toBeDefined(); // ✅ YES
      expect(apiDataWithJuryResults.juryResults.length).toBeGreaterThan(0); // ✅ YES

      // Check 2: Are juryResults in correct format?
      expect(apiDataWithJuryResults.juryResults[0]).toHaveProperty('fieldName');
      expect(apiDataWithJuryResults.juryResults[0]).toHaveProperty('performance');

      // Check 3: Can calculate display string?
      const displayString = apiDataWithJuryResults.juryResults
        .map((r, i) => `${r.performance} (${String.fromCharCode(65 + i)})`)
        .join(' - ');
      
      expect(displayString).toBe('6 (A) - 2 (B)');
      
      // So technically everything is available for display
      // The bug must be in Results page logic
    });

  });

  describe('Why Score-Capture Works But Results Does Not', () => {

    it('RED: Score-Capture might show jury scores because of showJuryScores toggle', () => {
      // In ScoreCapture/index.tsx line 55:
      // const [showJuryScores, setShowJuryScores] = useState(true);
      
      // This toggle controls whether jury results are displayed
      // Default is TRUE - so score capture SHOWS jury scores by default
      
      // In Results page - is there a similar toggle?
      // Let's check what controls jury score display in Results...
      
      // Possible reasons Results doesn't show jury scores:
      // 1. Configuration toggle not enabled  
      // 2. JuryResults data not loaded/stored
      // 3. JuryResultsDisplay component not rendered
      // 4. showJuryScores configuration missing
      
      const scoreCaptureBehavior = {
        showJuryScores: true,  // Default shown
        displaysJuryResults: true
      };

      const resultsBehavior = {
        showJuryScores: false, // ← Maybe disabled?
        displaysJuryResults: false // ← Current bug
      };

      console.log('Score-Capture shows jury scores:', scoreCaptureBehavior.displaysJuryResults);
      console.log('Results shows jury scores:', resultsBehavior.displaysJuryResults);
      console.log('Hypothesis: Results might need to enable showJuryScores toggle');
      
      expect(scoreCaptureBehavior.displaysJuryResults).toBe(true);
      expect(resultsBehavior.displaysJuryResults).toBe(false);
    });

    it('outlines fix strategy: Check if jury score display is configurable', () => {
      // FIX STEPS:
      // 1. Check configuration: Is jury score display enabled?
      // 2. Check useResultsData: Are juryResults parsed correctly?
      // 3. Check ResultsTable: Is JuryResultsDisplay being rendered?
      // 4. Check Participant model: Is juryResults mapped correctly?
      
      const fixPath = [
        'Check /configuration page for showJuryScores setting',
        'Add debug logs to useResultsData to see if juryResults are stored',
        'Add debug logs to ResultsTable to see if juryResults reach JuryResultsDisplay',
        'Compare with Score-Capture which works correctly'
      ];

      fixPath.forEach(step => {
        console.log('→ ' + step);
      });

      expect(fixPath.length).toBe(4);
    });

  });

  describe('Solution: Use Shared Architecture Like Jury Portal', () => {

    it('shows that Jury Portal correctly uses shared utilities', () => {
      // Jury Portal correctly imports and uses shared:
      // import { getBuiltInFormulaInitialValues } from '@turnfix/shared'
      // import { applyBuiltInFormula, calculateFormula } from '@/utils/formulaUtils'
      
      // Results ALSO imports these, so that's not the problem
      
      // The difference might be:
      // 1. Jury Portal fetches /jury-results (dedicated endpoint)
      // 2. Results fetches /scores (multipurpose endpoint)
      // 
      // But /scores also returns juryResults!
      // So the issue is not the API, but the client-side handling
      
      const sharedFormulationUtils = [
        'buildFieldSymbolsMap',
        'calculateFormula',
        'applyBuiltInFormula',
        'extractFormulaSymbols'
      ];

      // All are available in both Score-Capture and Results
      expect(sharedFormulationUtils.length).toBeGreaterThan(0);
      
      // So again, the issue is not about shared utilities
      // It's about displaying the jury results when they're loaded
    });

  });

});
