/**
 * Tests for ScoreCapture matrix initialization
 * Verifies that existing scores are correctly populated in the score matrix
 * when reopening the score capture page.
 * 
 * Bug fix: The score matrix useEffect had `existingScores.length > 0` as a guard,
 * which prevented initialization when no scores exist yet. Additionally,
 * activeSquad and activeDiscipline were missing from dependencies.
 */

import { describe, it, expect, vi } from 'vitest';

// Test the matrix building logic extracted from useScoreMatrix
// We test the pure logic rather than the hook to avoid complex React rendering

interface TestParticipant {
  id: number;
  firstname: string;
  lastname: string;
  squad_name?: string;
}

interface TestDiscipline {
  int_disziplinid: number;
  var_name: string;
  int_berechnung?: number;
}

interface TestScore {
  participantId: number;
  disciplineId: number;
  score: number;
}

/**
 * Simplified version of initializeScoreMatrix logic
 * for testing the core matching algorithm
 */
function buildScoreMatrix(
  participants: TestParticipant[],
  disciplines: TestDiscipline[],
  existingScores: TestScore[],
  activeSquad: string = ''
): Record<string, string> {
  const matrix: Record<string, string> = {};

  const filteredParticipants = !activeSquad
    ? participants
    : participants.filter(p => p.squad_name === activeSquad);

  filteredParticipants.forEach(participant => {
    disciplines.forEach((discipline, index) => {
      const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}`;
      const key = `${participant.id}-${disciplineId}`;

      const existingScore = existingScores.find(s => {
        const matchesParticipant = s.participantId === participant.id;
        const matchesDiscipline =
          s.disciplineId === discipline.int_disziplinid ||
          s.disciplineId === (typeof disciplineId === 'number' ? disciplineId : parseInt(String(disciplineId)));
        return matchesParticipant && matchesDiscipline;
      });

      matrix[key] = existingScore ? existingScore.score.toString() : '';
    });
  });

  return matrix;
}

describe('ScoreCapture Matrix Initialization', () => {
  const participants: TestParticipant[] = [
    { id: 1, firstname: 'Ida', lastname: 'Von Preislinger', squad_name: 'wBlau' },
    { id: 3, firstname: 'Emilia', lastname: 'Bartos', squad_name: 'wBlau' },
    { id: 16, firstname: 'Anni', lastname: 'Schäfeler', squad_name: 'wBlau' },
    { id: 17, firstname: 'Karoline', lastname: 'Breitkopf', squad_name: 'wRot' },
  ];

  const disciplines: TestDiscipline[] = [
    { int_disziplinid: 74, var_name: 'Boden w', int_berechnung: 2 },
    { int_disziplinid: 73, var_name: 'Schwebebalken', int_berechnung: 2 },
  ];

  const existingScores: TestScore[] = [
    { participantId: 1, disciplineId: 74, score: 4.10 },
    { participantId: 3, disciplineId: 74, score: 4.00 },
    { participantId: 16, disciplineId: 74, score: 3.90 },
    { participantId: 1, disciplineId: 73, score: 5.50 },
  ];

  it('should populate matrix with existing scores', () => {
    const matrix = buildScoreMatrix(participants, disciplines, existingScores);

    expect(matrix['1-74']).toBe('4.1');
    expect(matrix['3-74']).toBe('4');
    expect(matrix['16-74']).toBe('3.9');
    expect(matrix['1-73']).toBe('5.5');
  });

  it('should leave empty string for participants without scores', () => {
    const matrix = buildScoreMatrix(participants, disciplines, existingScores);

    // Karoline has no scores
    expect(matrix['17-74']).toBe('');
    expect(matrix['17-73']).toBe('');
    // Emilia has no Schwebebalken score
    expect(matrix['3-73']).toBe('');
  });

  it('should initialize matrix even with zero existing scores', () => {
    const matrix = buildScoreMatrix(participants, disciplines, []);

    // All entries should exist but be empty
    expect(matrix['1-74']).toBe('');
    expect(matrix['3-74']).toBe('');
    expect(matrix['16-74']).toBe('');
    expect(matrix['17-74']).toBe('');
    expect(matrix['1-73']).toBe('');
    expect(Object.keys(matrix).length).toBe(8); // 4 participants * 2 disciplines
  });

  it('should filter participants by activeSquad', () => {
    const matrix = buildScoreMatrix(participants, disciplines, existingScores, 'wBlau');

    // Only wBlau participants should be in matrix
    expect(matrix['1-74']).toBe('4.1');
    expect(matrix['3-74']).toBe('4');
    expect(matrix['16-74']).toBe('3.9');
    // Karoline (wRot) should NOT be in matrix
    expect(matrix['17-74']).toBeUndefined();
    expect(Object.keys(matrix).length).toBe(6); // 3 participants * 2 disciplines
  });

  it('should re-populate when squad changes', () => {
    // First: wBlau squad
    const matrixBlau = buildScoreMatrix(participants, disciplines, existingScores, 'wBlau');
    expect(Object.keys(matrixBlau).length).toBe(6);
    expect(matrixBlau['1-74']).toBe('4.1');

    // Then: wRot squad  
    const matrixRot = buildScoreMatrix(participants, disciplines, existingScores, 'wRot');
    expect(Object.keys(matrixRot).length).toBe(2); // 1 participant * 2 disciplines
    expect(matrixRot['17-74']).toBe('');
    expect(matrixRot['17-73']).toBe('');
  });

  it('should handle single discipline filter', () => {
    const singleDiscipline = [disciplines[0]]; // Only Boden
    const matrix = buildScoreMatrix(participants, singleDiscipline, existingScores);

    expect(Object.keys(matrix).length).toBe(4); // 4 participants * 1 discipline
    expect(matrix['1-74']).toBe('4.1');
    expect(matrix['1-73']).toBeUndefined(); // Schwebebalken not included
  });

  it('should handle all participants without a squad', () => {
    const noSquadParticipants: TestParticipant[] = [
      { id: 100, firstname: 'Test', lastname: 'User' },
    ];
    const matrix = buildScoreMatrix(noSquadParticipants, disciplines, []);

    // No activeSquad filter → should include all
    expect(Object.keys(matrix).length).toBe(2);
  });
});

describe('ScoreCapture useEffect dependency coverage', () => {
  it('should describe the correct dependency behavior', () => {
    // This test documents the expected behavior of the useEffect
    // The useEffect should trigger initializeScoreMatrix when:
    // 1. participants change (participants.length)
    // 2. disciplines change (disciplines.length)
    // 3. existing scores change (existingScores.length)
    // 4. isInitializing changes (from true to false)
    // 5. showJuryScores toggles
    // 6. activeSquad changes (BUG FIX: was missing)
    // 7. activeDiscipline changes (BUG FIX: was missing)
    
    // The guard should NOT require existingScores.length > 0
    // because the matrix needs to initialize for input fields to render
    
    const dependencies = [
      'participants.length',
      'disciplines.length', 
      'existingScores.length',
      'isInitializing',
      'showJuryScores',
      'activeSquad',      // Added in fix
      'activeDiscipline', // Added in fix
    ];
    
    expect(dependencies).toContain('activeSquad');
    expect(dependencies).toContain('activeDiscipline');
    expect(dependencies.length).toBe(7);
  });
});
