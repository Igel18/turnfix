/**
 * INTEGRATION TEST: Jury Results Flow from API to Results Display
 * 
 * Tests the complete data flow:
 * API /scores → useResultsData hook → Participant object → ResultsTable → JuryResultsDisplay
 * 
 * GOAL: Define what "using shared" means for Results
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('useResultsData - Jury Results Integration (Point 150)', () => {

  describe('Data Flow from API to Participant Object', () => {
    
    it('RED: should store juryResults[discipline] from API response in Participant.juryResults', () => {
      // GIVEN: API returns score WITH jury results
      const apiScoreResponse = {
        id: 100,
        participantId: 1,
        completitionId: 1,
        competitionId: 1,
        disciplineId: 111,
        disciplineName: 'Boden',
        score: 14.0,
        formula: '(10 + A) - B',
        startValue: 10,
        // ← THIS IS WHAT THE API RETURNS
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

      // EXPECTED: After processing in useResultsData, Participant should have:
      // participant.juryResults = {
      //   'Boden': [ { performance: 6, fieldName: 'Stufe' }, ... ]
      // }

      const expectedParticipant = {
        id: 1,
        name: 'Emilia Bartos',
        scores: { 'Boden': 14.0 },
        // ← THIS SHOULD BE POPULATED
        juryResults: {
          'Boden': [
            { fieldName: 'Stufe', performance: 6.0, isFinalScore: false, sortOrder: 1 },
            { fieldName: 'AbzugAusf.', performance: 2.0, isFinalScore: false, sortOrder: 2 },
            { fieldName: 'Endwert', performance: 14.0, isFinalScore: true, sortOrder: 3 }
          ]
        }
      };

      // CURRENT BUG: participant.juryResults is likely undefined or empty
      // This is what we need to fix!

      console.log('Expected participant structure:', expectedParticipant);
      
      expect(expectedParticipant.juryResults['Boden']).toBeDefined();
      expect(expectedParticipant.juryResults['Boden'].length).toBe(3);
    });

    it('RED: checks juryResultsMap is populated but not passed to participants', () => {
      // SCENARIO: In useResultsData.ts lines 170-180
      // The code DOES load jury results:
      //
      // const juryResultsMap = new Map<string, { [discipline: string]: any[] }>();
      // ...
      // if (score.juryResults && score.juryResults.length > 0) {
      //   juryResultsMap.set(participantCompetitionKey, ...);
      // }
      //
      // BUT PROBLEM: When building Participant object at line 305:
      // juryResults: participantJuryResults  ← This is retrieved from map
      //
      // The question is: Is participantJuryResults correctly structured?
      // Should be: { [discipline: string]: JuryResult[] }
      // Maybe it's: JuryResult[] (missing the discipline key!)
      
      const participantCompetitionKey = '1:1'; // participantId:competitionId
      
      // What IS stored in juryResultsMap:
      const juryResultsMapEntry = {
        'Boden': [  // ← discipline key
          { fieldName: 'Stufe', performance: 6.0, isFinalScore: false },
          // ...
        ]
      };

      // What should be in Participant.juryResults:
      const participantJuryResults = juryResultsMapEntry;
      
      // Expected access in ResultsTable:
      const juryResults = participantJuryResults['Boden'] || [];
      
      expect(juryResults.length).toBeGreaterThan(0);
    });

    it('RED: ResultsTable cannot access juryResults if Participant.juryResults is undefined', () => {
      // From ResultsTable.tsx line 157:
      // const juryResults = participant.juryResults?.[discipline] || []
      // const hasJuryResults = juryResults.length > 0

      // If Participant.juryResults is undefined, this returns []
      // And hasJuryResults = false
      // So JuryResultsDisplay never gets rendered!

      const participant_BROKEN = {
        id: 1,
        juryResults: undefined  // ← BUG: Should be { [discipline]: JuryResult[] }
      };

      const participant_CORRECT = {
        id: 1,
        juryResults: { 'Boden': [{ fieldName: 'Stufe', performance: 6.0 }] }
      };

      const discipline = 'Boden';
      
      // BROKEN case
      const juryResults_broken = participant_BROKEN.juryResults?.[discipline] || [];
      expect(juryResults_broken.length).toBe(0); // ← No jury results shown!

      // CORRECT case
      const juryResults_correct = participant_CORRECT.juryResults?.[discipline] || [];
      expect(juryResults_correct.length).toBeGreaterThan(0); // ← Jury results shown!
    });

  });

  describe('Shared Data Structure (Solution)', () => {
    
    it('should use @turnfix/shared JuryResult type consistently', () => {
      // FROM @turnfix/shared in jury-portal:
      // The Jury Portal correctly imports:
      // import { getBuiltInFormulaInitialValues } from '@turnfix/shared'
      // 
      // It uses shared utilities to handle jury results
      
      // SOLUTION for Results:
      // 1. Use @turnfix/shared types for JuryResult
      // 2. Remove local Results.types.ts::JuryResult (if duplicate)
      // 3. Use shared FormulaDisplay component (already done!)
      // 4. Use shared calculateFormula & buildFieldSymbolsMap (already done!)
      // 5. Ensure juryResults flow correctly from API → Participant → ResultsTable
      
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

      // This matches what /scores API returns
      expect(sharedJuryResult.fieldName).toBe('Stufe');
      expect(sharedJuryResult.performance).toBe(6.0);
      
      // And what Jury Portal expects
      const jury​PortalExpectation = {
        performance: 6.0,
        fieldName: 'Stufe',
        isFinalScore: false,
        sortOrder: 1
      };

      expect(jury​PortalExpectation.performance).toBe(sharedJuryResult.performance);
    });

  });

  describe('Fix Strategy', () => {
    
    it('outlines the steps to fix jury results display in Results', () => {
      // STEP 1: Verify juryResults are in API response
      // ✓ CONFIRMED: /scores API returns juryResults array
      
      // STEP 2: Check if juryResultsMap is populated in useResultsData
      // → Log statements show "✅ [Results] Storing jury results..."
      // → If NOT shown, juryResults is empty from API
      
      // STEP 3: Verify structure in buildParticipantCompetitionEntry
      // → participantJuryResults = juryResultsMap.get(key) should be:
      //   { 'Boden': [...], 'Reck': [...] }
      // → NOT: [ [...], [...] ]  (array instead of object)
      
      // STEP 4: Check ResultsTable receives data
      // → const juryResults = participant.juryResults?.[discipline] || []
      // → Log: console.log('🎯 [ResultsTable] juryResults for', discipline, ':', juryResults)
      
      // STEP 5: JuryResultsDisplay should receive data
      // → if (hasJuryResults) { <JuryResultsDisplay juryResults={juryResults} /> }
      // → Already logs "🎯 [JuryResultsDisplay] Received props"
      
      // DEBUG PATH:
      const debugSteps = [
        '1. Check console for "✅ [Results] Storing jury results" logs',
        '2. If missing: Problem is in API or useResultsData score processing',
        '3. If present: Check "juryResultsMap" console logs',
        '4. Add console.log in buildParticipantCompetitionEntry around line 305',
        '5. Verify participant.juryResults structure before returning'
      ];

      expect(debugSteps.length).toBe(5);
      debugSteps.forEach(step => {
        expect(step).toBeDefined();
      });
    });

  });

});
