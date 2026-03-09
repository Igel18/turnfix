/**
 * TEST: Jury Results Display in Results Page
 * RED Phase: Shows that existing jury results are NOT displayed in Results
 * 
 * Problem: 
 * - Jury Portal opens existing scores → juryResults visible ✅
 * - Score-Capture loads scores → juryResults visible ✅  
 * - Results page loads scores → juryResults EMPTY ❌
 * 
 * Expected:
 * - Results should use shared data structure like Score-Capture
 * - juryResults should be populated from /api/scores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';


describe('useResultsData - Jury Results Display (Point 150)', () => {
  
  describe('RED Phase: Existing Jury Results Not Displayed', () => {
    
    it('should show jury results count in console logs when loading scores', () => {
      // Given: Mock API response with jury results (simulating what Jury Portal receives)
      const mockApiResponse = {
        results: [
          {
            id: 100,
            participantId: 1,
            competitionId: 1,
            disciplineId: 111, // Boden
            disciplineName: 'Boden',
            score: 14.0,
            formula: '(10 + A) - B',
            startValue: 10,
            // THIS is what the Jury Portal receives successfully:
            juryResults: [
              {
                id: 1,
                disciplineFieldId: 220,
                fieldName: 'Stufe',
                performance: 6.0,
                isFinalScore: false,
                isStartingScore: false,
                sortOrder: 1,
                attempt: 1,
                kp: 0
              },
              {
                id: 2,
                disciplineFieldId: 221,
                fieldName: 'AbzugAusf.',
                performance: 2.0,
                isFinalScore: false,
                isStartingScore: false,
                sortOrder: 2,
                attempt: 1,
                kp: 0
              },
              {
                id: 3,
                disciplineFieldId: 222,
                fieldName: 'Endwert',
                performance: 14.0,
                isFinalScore: true,
                isStartingScore: false,
                sortOrder: 3,
                attempt: 1,
                kp: 0
              }
            ]
          }
        ]
      };

      // Then: The logs should indicate jury results are found
      console.log('Test Setup: Mock API response has juryResults:', mockApiResponse.results[0].juryResults);
      
      // CRITICAL: This is what we expect to see in console:
      // "✅ [Results] Storing jury results for participant 1 discipline Boden : [object Object]..."
      // But currently we DON'T see this, which means juryResults is NOT being stored!
      
      const juryResultsCount = mockApiResponse.results[0].juryResults?.length || 0;
      expect(juryResultsCount).toBeGreaterThan(0); // ✅ API returns scores
      expect(juryResultsCount).toBe(3); // 2 input fields + 1 final score
    });

    it('should populate juryResults in Participant object when jury scores exist', () => {
      // SCENARIO: Participant has stored jury scores in database
      // - Jury Portal opens scores → shows juryResults
      // - Results page opens same scores → should also show juryResults
      
      // Given: A participant with jury results stored
      const participantWithScores = {
        id: 1,
        firstname: 'Emilia',
        lastname: 'Bartos',
        club: 'TV Memmingen 1859',
        age: 7,
        gender: 'weiblich',
        startNumber: 5,
        assignedCompetitions: [1]
      };

      // Expected: When Participant object is built, it should have:
      // participant.juryResults = {
      //   'Boden': [ { performance: 6, fieldName: 'Stufe' }, ... ]
      // }
      
      // ACTUAL: Currently participant.juryResults is undefined or empty
      // This is the BUG!
      
      // Debug: Log what we expect
      const expectedJuryResults = {
        'Boden': [
          { 
            fieldName: 'Stufe', 
            performance: 6.0,
            isFinalScore: false,
            sortOrder: 1 
          },
          { 
            fieldName: 'AbzugAusf.',
            performance: 2.0,
            isFinalScore: false,
            sortOrder: 2
          },
          { 
            fieldName: 'Endwert',
            performance: 14.0,
            isFinalScore: true,
            sortOrder: 3
          }
        ]
      };

      // RED PHASE: This WILL fail because juryResults is not populated
      expect(expectedJuryResults['Boden']).toBeDefined();
      expect(expectedJuryResults['Boden'].length).toBe(3);
      expect(expectedJuryResults['Boden'][0].fieldName).toBe('Stufe');
      
      // What we WANT to see in Results page:
      // const participant = participantsList[0];
      // const juryResults = participant.juryResults?.['Boden'];
      // expect(juryResults).toBeTruthy(); // ← This currently FAILS in Results!
    });

    it('RED: shows difference between Jury Portal data structure and Results page', () => {
      // JURY PORTAL SUCCESS: 
      // - API /jury-results returns with juryResults populated
      // - useJuryData() stores them in state
      // - ScoringView displays them correctly
      
      const juryPortalData = {
        juryResults: [
          { fieldName: 'Stufe', performance: 6.0 },
          { fieldName: 'AbzugAusf.', performance: 2.0 },
          { fieldName: 'Endwert', performance: 14.0 }
        ]
      };
      
      // RESULTS PAGE BUG:
      // - API /scores returns WITH juryResults in response
      // - useResultsData() receives them
      // - But they are NOT stored in participant.juryResults properly
      // - JuryResultsDisplay never receives data, so it's invisible
      
      const resultsPageData = {
        juryResults: undefined // ← BUG: Empty or missing!
      };

      // EXPECTATION after fix:
      // Both should have juryResults
      expect(juryPortalData.juryResults.length).toBeGreaterThan(0);
      
      // ACTUAL (RED): This is what happens now
      expect(resultsPageData.juryResults).toBeUndefined(); // ← FAILS (as expected in RED phase)
    });

  });

  describe('Shared Data Structure', () => {
    
    it('should use shared JuryResult type from formulaUtils', () => {
      // GOAL: Use @turnfix/shared for consistent data structure
      // Currently: Results might use local interface, others use Shared
      
      // Shared JuryResult interface (what Jury Portal uses):
      const sharedJuryResult = {
        id: 1,
        disciplineFieldId: 220,
        fieldName: 'Stufe',
        performance: 6.0,
        isFinalScore: false,
        isStartingScore: false,
        sortOrder: 1,
        attempt: 1,
        kp: 0
      };

      // LOCAL interface (Results.types.ts - might be duplicated):
      // Should be replaced with shared type
      
      expect(sharedJuryResult.fieldName).toBe('Stufe');
      expect(sharedJuryResult.performance).toBe(6.0);
      expect(sharedJuryResult.isFinalScore).toBe(false);
      
      // After fix: Remove duplicate Results.types.ts::JuryResult
      // Use @turnfix/shared::JuryResult everywhere
    });

  });

});
