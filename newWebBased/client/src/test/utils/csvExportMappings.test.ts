/**
 * CSV Export Mapping Tests
 * Tests for the new CSV data mapping functions:
 * - getSquadStatusCSVData
 * - getCompetitionStatusCSVData
 * - getScoreCaptureCSVData
 */

import { describe, it, expect } from 'vitest';
import {
  getSquadStatusCSVData,
  getCompetitionStatusCSVData,
  getScoreCaptureCSVData,
} from '../../utils/csvExport';

// ────────────────────────────────────────────────────────────
// getSquadStatusCSVData Tests
// ────────────────────────────────────────────────────────────
describe('getSquadStatusCSVData', () => {
  it('should return correct filename', () => {
    const result = getSquadStatusCSVData([]);
    expect(result.filename).toBe('riegen_status');
  });

  it('should have the correct headers', () => {
    const result = getSquadStatusCSVData([]);
    expect(result.headers).toEqual(['squadName', 'disciplineName', 'status', 'round']);
  });

  it('should map squad discipline data correctly', () => {
    const input = [
      {
        id: 1,
        eventId: 59,
        squadName: 'Riege A',
        disciplineId: 74,
        disciplineName: 'Boden',
        disciplineShort: 'Bo',
        statusId: 1,
        status: { id: 1, name: 'Offen', colorCode: '{200,200,200}' },
        round: 1,
        isFirstApparatus: true,
      },
      {
        id: 2,
        eventId: 59,
        squadName: 'Riege B',
        disciplineId: 71,
        disciplineName: 'Sprung',
        disciplineShort: 'Sp',
        statusId: 9,
        status: { id: 9, name: 'Abgeschlossen', colorCode: '{4,172,39}' },
        round: 2,
        isFirstApparatus: false,
      },
    ];

    const result = getSquadStatusCSVData(input);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      squadName: 'Riege A',
      disciplineName: 'Boden',
      status: 'Offen',
      round: 1,
    });
    expect(result.data[1]).toEqual({
      squadName: 'Riege B',
      disciplineName: 'Sprung',
      status: 'Abgeschlossen',
      round: 2,
    });
  });

  it('should handle missing status object gracefully', () => {
    const input = [
      {
        squadName: 'Riege C',
        disciplineName: 'Reck',
        status: undefined,
        round: null,
      },
    ];

    const result = getSquadStatusCSVData(input as any);
    expect(result.data[0]).toEqual({
      squadName: 'Riege C',
      disciplineName: 'Reck',
      status: '',
      round: '',
    });
  });

  it('should handle empty input array', () => {
    const result = getSquadStatusCSVData([]);
    expect(result.data).toHaveLength(0);
    expect(result.headers).toHaveLength(4);
  });

  it('should include round in numberFields', () => {
    const result = getSquadStatusCSVData([]);
    expect(result.numberFields).toContain('round');
  });
});

// ────────────────────────────────────────────────────────────
// getCompetitionStatusCSVData Tests
// ────────────────────────────────────────────────────────────
describe('getCompetitionStatusCSVData', () => {
  it('should return correct filename', () => {
    const result = getCompetitionStatusCSVData([]);
    expect(result.filename).toBe('wettkampf_status');
  });

  it('should have all expected headers', () => {
    const result = getCompetitionStatusCSVData([]);
    expect(result.headers).toEqual([
      'name', 'number', 'gender', 'ageFrom', 'ageTo',
      'participantCount', 'totalSquadDisciplines', 'completedSquadDisciplines',
      'inProgressSquadDisciplines', 'notStartedSquadDisciplines', 'overallStatus',
    ]);
  });

  it('should map competition status data correctly', () => {
    const input = [
      {
        id: 1,
        name: 'AK 7/8 weiblich',
        number: 'WK01',
        gender: 'weiblich',
        ageFrom: 7,
        ageTo: 8,
        participantCount: 24,
        totalSquadDisciplines: 16,
        completedSquadDisciplines: 12,
        inProgressSquadDisciplines: 3,
        notStartedSquadDisciplines: 1,
        overallStatus: 'in_progress',
        round: 1,
        eventId: 59,
        disciplines: [74, 71, 73, 68],
        statusDistribution: [],
        disciplines_detail: [],
      },
    ];

    const result = getCompetitionStatusCSVData(input);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      name: 'AK 7/8 weiblich',
      number: 'WK01',
      gender: 'weiblich',
      ageFrom: 7,
      ageTo: 8,
      participantCount: 24,
      totalSquadDisciplines: 16,
      completedSquadDisciplines: 12,
      inProgressSquadDisciplines: 3,
      notStartedSquadDisciplines: 1,
      overallStatus: 'in_progress',
    });
  });

  it('should handle missing fields with defaults', () => {
    const input = [{ id: 99 }]; // Minimal data

    const result = getCompetitionStatusCSVData(input as any);
    expect(result.data[0]).toEqual({
      name: '',
      number: '',
      gender: '',
      ageFrom: '',
      ageTo: '',
      participantCount: 0,
      totalSquadDisciplines: 0,
      completedSquadDisciplines: 0,
      inProgressSquadDisciplines: 0,
      notStartedSquadDisciplines: 0,
      overallStatus: '',
    });
  });

  it('should handle empty input array', () => {
    const result = getCompetitionStatusCSVData([]);
    expect(result.data).toHaveLength(0);
  });

  it('should include numeric fields in numberFields', () => {
    const result = getCompetitionStatusCSVData([]);
    expect(result.numberFields).toContain('participantCount');
    expect(result.numberFields).toContain('totalSquadDisciplines');
    expect(result.numberFields).toContain('completedSquadDisciplines');
    expect(result.numberFields).toContain('inProgressSquadDisciplines');
    expect(result.numberFields).toContain('notStartedSquadDisciplines');
    expect(result.numberFields).toContain('ageFrom');
    expect(result.numberFields).toContain('ageTo');
  });
});

// ────────────────────────────────────────────────────────────
// getScoreCaptureCSVData Tests
// ────────────────────────────────────────────────────────────
describe('getScoreCaptureCSVData', () => {
  const sampleParticipants = [
    { id: 1, startNumber: 101, firstname: 'Anna', lastname: 'Müller', club: 'TV Beispiel', gender: 'weiblich', age: 8 },
    { id: 2, startNumber: 102, firstname: 'Lena', lastname: 'Schmidt', club: 'TSV Turnstadt', gender: 'weiblich', age: 9 },
  ];

  const sampleDisciplines = [
    { int_disziplinid: 74, var_name: 'Boden' },
    { int_disziplinid: 71, var_name: 'Sprung' },
    { int_disziplinid: 73, var_name: 'Schwebebalken' },
  ];

  const sampleScoreMatrix: {[key: string]: string} = {
    '1-74': '12.50',
    '1-71': '13.00',
    '1-73': '11.75',
    '2-74': '14.00',
    '2-71': '',
    '2-73': '12.25',
  };

  it('should return correct filename', () => {
    const result = getScoreCaptureCSVData([], [], {});
    expect(result.filename).toBe('wertungen');
  });

  it('should include base headers plus discipline names', () => {
    const result = getScoreCaptureCSVData(sampleParticipants, sampleDisciplines, sampleScoreMatrix);
    expect(result.headers).toEqual([
      'startNumber', 'participant', 'club', 'gender', 'age',
      'Boden', 'Sprung', 'Schwebebalken',
    ]);
  });

  it('should map participant data with scores correctly', () => {
    const result = getScoreCaptureCSVData(sampleParticipants, sampleDisciplines, sampleScoreMatrix);

    expect(result.data).toHaveLength(2);

    // First participant
    expect(result.data[0].startNumber).toBe(101);
    expect(result.data[0].participant).toBe('Anna Müller');
    expect(result.data[0].club).toBe('TV Beispiel');
    expect(result.data[0].gender).toBe('weiblich');
    expect(result.data[0].age).toBe(8);
    expect(result.data[0]['Boden']).toBe('12.50');
    expect(result.data[0]['Sprung']).toBe('13.00');
    expect(result.data[0]['Schwebebalken']).toBe('11.75');

    // Second participant
    expect(result.data[1].participant).toBe('Lena Schmidt');
    expect(result.data[1]['Boden']).toBe('14.00');
    expect(result.data[1]['Sprung']).toBe(''); // Empty score
    expect(result.data[1]['Schwebebalken']).toBe('12.25');
  });

  it('should handle empty participants', () => {
    const result = getScoreCaptureCSVData([], sampleDisciplines, sampleScoreMatrix);
    expect(result.data).toHaveLength(0);
    expect(result.headers).toContain('Boden');
  });

  it('should handle empty disciplines', () => {
    const result = getScoreCaptureCSVData(sampleParticipants, [], {});
    expect(result.headers).toEqual(['startNumber', 'participant', 'club', 'gender', 'age']);
    expect(result.data).toHaveLength(2);
  });

  it('should handle empty score matrix', () => {
    const result = getScoreCaptureCSVData(sampleParticipants, sampleDisciplines, {});
    expect(result.data[0]['Boden']).toBe('');
    expect(result.data[0]['Sprung']).toBe('');
  });

  it('should handle missing participant fields gracefully', () => {
    const minimalParticipants = [
      { id: 5 }, // Minimal data
    ];

    const result = getScoreCaptureCSVData(minimalParticipants as any, sampleDisciplines, {});
    expect(result.data[0].startNumber).toBe('');
    expect(result.data[0].participant).toBe('');
    expect(result.data[0].club).toBe('');
  });

  it('should use discipline var_name as column headers', () => {
    const disciplines = [
      { int_disziplinid: 1, var_name: 'Reck' },
      { int_disziplinid: 2, var_name: 'Barren' },
    ];

    const result = getScoreCaptureCSVData([], disciplines, {});
    expect(result.headers).toContain('Reck');
    expect(result.headers).toContain('Barren');
  });

  it('should fallback to name or placeholder for discipline headers', () => {
    const disciplines = [
      { int_disziplinid: 1, name: 'FallbackName' },
      { int_disziplinid: 2 },
    ];

    const result = getScoreCaptureCSVData([], disciplines as any, {});
    expect(result.headers).toContain('FallbackName');
    expect(result.headers).toContain('Discipline 2');
  });

  it('should include discipline headers in numberFields', () => {
    const result = getScoreCaptureCSVData(sampleParticipants, sampleDisciplines, sampleScoreMatrix);
    expect(result.numberFields).toContain('startNumber');
    expect(result.numberFields).toContain('age');
    expect(result.numberFields).toContain('Boden');
    expect(result.numberFields).toContain('Sprung');
    expect(result.numberFields).toContain('Schwebebalken');
  });

  it('should handle participant with only firstname', () => {
    const participants = [
      { id: 1, firstname: 'Max', lastname: undefined },
    ];

    const result = getScoreCaptureCSVData(participants as any, [], {});
    expect(result.data[0].participant).toBe('Max');
  });

  it('should handle participant with only lastname', () => {
    const participants = [
      { id: 1, firstname: undefined, lastname: 'Muster' },
    ];

    const result = getScoreCaptureCSVData(participants as any, [], {});
    expect(result.data[0].participant).toBe('Muster');
  });
});
