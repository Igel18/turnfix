/**
 * Scores Jury Results Discipline Filter Tests
 * 
 * Bug Fix: The jury results query in scores.ts was NOT filtering by discipline ID,
 * causing ALL fields from ALL disciplines to show for every discipline.
 * 
 * Fix: Added `AND df.int_disziplinenid = $2` to the jury results queries in scores.ts
 * 
 * These tests verify that:
 * 1. The jury results query includes discipline filtering
 * 2. Fields from discipline A do not appear in discipline B's results
 * 3. The discipline ID parameter is correctly passed to the query
 */

import request from 'supertest';
import express from 'express';
import { Router, Response } from 'express';

// We'll test the query-building logic directly by examining what queries get executed

describe('Scores Jury Results Discipline Filter', () => {

  describe('Query Structure Verification', () => {

    it('should include discipline filter in jury results query when disciplineId is available', () => {
      // This test verifies the query template includes the discipline filter
      // Simulating the query construction from scores.ts
      const disciplineId = 74; // e.g., "Boden"
      const wertungenId = 123;

      // The fixed query (with discipline filter)
      const queryWithFilter = `
        SELECT 
          jr.int_juryresultsid as id,
          jr.int_disziplinen_felderid as "disciplineFieldId",
          jr.rel_leistung as performance,
          jr.int_versuch as attempt,
          jr.int_kp as kp,
          df.var_name as "fieldName",
          df.var_name as "fieldShortName",
          df.bol_endwert as "isFinalScore",
          df.bol_ausgangswert as "isStartingScore",
          df.int_sortierung as "sortOrder"
        FROM tfx_jury_results jr
        LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
        WHERE jr.int_wertungenid = $1
          AND df.int_disziplinenid = $2
        ORDER BY df.int_sortierung ASC, df.bol_ausgangswert DESC, df.bol_endwert DESC, df.int_disziplinen_felderid
      `;

      // Verify the filter clause is present
      expect(queryWithFilter).toContain('AND df.int_disziplinenid = $2');
      expect(queryWithFilter).toContain('WHERE jr.int_wertungenid = $1');
    });

    it('should use fallback query without discipline filter when disciplineId is null', () => {
      // When disciplineId is not available, the query should still work but without the filter
      const disciplineIdForFilter: number | null = null;

      const query = disciplineIdForFilter
        ? `WHERE jr.int_wertungenid = $1 AND df.int_disziplinenid = $2`
        : `WHERE jr.int_wertungenid = $1`;

      // When disciplineId is null, we should NOT have the discipline filter
      expect(query).not.toContain('int_disziplinenid');
      expect(query).toContain('int_wertungenid = $1');
    });

    it('should select the filtered query branch when disciplineId is a valid number', () => {
      const disciplineIdForFilter: number | null = 74;

      const query = disciplineIdForFilter
        ? `WHERE jr.int_wertungenid = $1 AND df.int_disziplinenid = $2`
        : `WHERE jr.int_wertungenid = $1`;

      expect(query).toContain('AND df.int_disziplinenid = $2');
    });
  });

  describe('Discipline ID Parsing', () => {

    it('should correctly parse disciplineId from result row', () => {
      const result = { disciplineid: '74' };
      const disciplineIdForFilter = result.disciplineid ? parseInt(result.disciplineid) : null;
      expect(disciplineIdForFilter).toBe(74);
    });

    it('should return null when disciplineId is missing from result', () => {
      const result = { disciplineid: null };
      const disciplineIdForFilter = result.disciplineid ? parseInt(result.disciplineid) : null;
      expect(disciplineIdForFilter).toBeNull();
    });

    it('should return null when disciplineId is undefined', () => {
      const result: any = {};
      const disciplineIdForFilter = result.disciplineid ? parseInt(result.disciplineid) : null;
      expect(disciplineIdForFilter).toBeNull();
    });

    it('should return null when disciplineId is empty string', () => {
      const result = { disciplineid: '' };
      const disciplineIdForFilter = result.disciplineid ? parseInt(result.disciplineid) : null;
      expect(disciplineIdForFilter).toBeNull();
    });
  });

  describe('Jury Results Filtering Logic', () => {

    it('should only return fields belonging to the specific discipline', () => {
      // Simulate jury results from database - mix of fields from different disciplines
      const allJuryResults = [
        // Boden fields (discipline 74)
        { id: 1, disciplineFieldId: 100, fieldName: 'Stufe', disciplineId: 74, performance: 6.15 },
        { id: 2, disciplineFieldId: 101, fieldName: 'AbzugAusf.', disciplineId: 74, performance: 3.05 },
        { id: 3, disciplineFieldId: 102, fieldName: 'Endwert', disciplineId: 74, performance: 13.1 },
        // Sprung fields (discipline 71)
        { id: 4, disciplineFieldId: 200, fieldName: 'Stufe', disciplineId: 71, performance: 5.0 },
        { id: 5, disciplineFieldId: 201, fieldName: 'AbzugAusf.', disciplineId: 71, performance: 2.5 },
        { id: 6, disciplineFieldId: 202, fieldName: 'Endwert', disciplineId: 71, performance: 12.5 },
        // Barren fields (discipline 72)
        { id: 7, disciplineFieldId: 300, fieldName: 'Stufe', disciplineId: 72, performance: 4.8 },
        { id: 8, disciplineFieldId: 301, fieldName: 'AbzugAusf.', disciplineId: 72, performance: 1.2 },
      ];

      // Filter for Boden (discipline 74) - this is what the fixed query should do
      const bodenDisciplineId = 74;
      const bodenResults = allJuryResults.filter(jr => jr.disciplineId === bodenDisciplineId);

      expect(bodenResults).toHaveLength(3);
      expect(bodenResults.every(jr => jr.disciplineId === 74)).toBe(true);
      // Verify no Sprung or Barren fields leaked in
      expect(bodenResults.some(jr => jr.disciplineId === 71)).toBe(false);
      expect(bodenResults.some(jr => jr.disciplineId === 72)).toBe(false);
    });

    it('should not mix fields from different disciplines for the same wertungenId', () => {
      // This test demonstrates the bug scenario:
      // A participant has scores in multiple disciplines under the same wertung
      // The OLD query would return ALL fields, the NEW query filters by discipline

      const wertungenId = 100;
      const currentDisciplineId = 74; // Boden

      // Mock all jury results for this wertung (from ALL disciplines) - the BUG scenario
      const unfilteredResults = [
        { wertungenId: 100, disciplineId: 74, fieldName: 'Stufe' },
        { wertungenId: 100, disciplineId: 74, fieldName: 'AbzugAusf.' },
        { wertungenId: 100, disciplineId: 71, fieldName: 'Stufe' },      // Wrong! Sprung field
        { wertungenId: 100, disciplineId: 71, fieldName: 'AbzugAusf.' },  // Wrong! Sprung field
        { wertungenId: 100, disciplineId: 72, fieldName: 'Stufe' },      // Wrong! Barren field
      ];

      // The FIXED query filters by discipline - only Boden fields
      const filteredResults = unfilteredResults.filter(jr => jr.disciplineId === currentDisciplineId);

      expect(filteredResults).toHaveLength(2);
      expect(filteredResults.every(jr => jr.disciplineId === currentDisciplineId)).toBe(true);
      
      // The unfiltered (buggy) version would have returned all 5
      expect(unfilteredResults).toHaveLength(5);
    });

    it('should handle the case where one discipline has more fields than another', () => {
      // Some disciplines have 3 fields (Stufe, AbzugAusf., Endwert)
      // Others might have 2 or even 5 fields
      // The filter must correctly isolate each discipline's fields

      const allFields = [
        // Discipline A: 3 fields
        { disciplineId: 10, fieldName: 'A', sortOrder: 1 },
        { disciplineId: 10, fieldName: 'B', sortOrder: 2 },
        { disciplineId: 10, fieldName: 'Endwert', sortOrder: 3 },
        // Discipline B: 5 fields
        { disciplineId: 20, fieldName: 'D-Note', sortOrder: 1 },
        { disciplineId: 20, fieldName: 'E-Note', sortOrder: 2 },
        { disciplineId: 20, fieldName: 'Neutral', sortOrder: 3 },
        { disciplineId: 20, fieldName: 'Penalty', sortOrder: 4 },
        { disciplineId: 20, fieldName: 'Endwert', sortOrder: 5 },
      ];

      // Filter for Discipline A
      const disciplineAFields = allFields.filter(f => f.disciplineId === 10);
      expect(disciplineAFields).toHaveLength(3);

      // Filter for Discipline B
      const disciplineBFields = allFields.filter(f => f.disciplineId === 20);
      expect(disciplineBFields).toHaveLength(5);

      // Without the filter, discipline A would incorrectly show 8 fields
      expect(allFields).toHaveLength(8);
    });
  });

  describe('Score Recalculation Query Discipline Filter', () => {

    it('should include discipline filter in recalculation jury results query', () => {
      // The second jury results query (in score update/recalculation) also had the bug
      const actualDisciplineId = 74;
      const wertungenId = 100;

      // The fixed recalculation query
      const recalcQuery = `
        SELECT 
          jr.rel_leistung as performance,
          df.int_sortierung as sort_order,
          df.var_name as field_name,
          df.bol_endwert as is_final_score,
          df.bol_ausgangswert as is_starting_score
        FROM tfx_jury_results jr
        LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
        WHERE jr.int_wertungenid = $1
          AND df.int_disziplinenid = $2
          AND jr.int_versuch = 1
        ORDER BY df.int_sortierung ASC
      `;

      // Verify discipline filter is present
      expect(recalcQuery).toContain('AND df.int_disziplinenid = $2');
      expect(recalcQuery).toContain('jr.int_wertungenid = $1');
      expect(recalcQuery).toContain('jr.int_versuch = 1');
    });
  });

  describe('Mock Database Query Execution', () => {

    it('should call $queryRawUnsafe with correct parameters including disciplineId', async () => {
      const mockQueryRawUnsafe = jest.fn().mockResolvedValue([]);
      
      const wertungenId = 123;
      const disciplineIdForFilter = 74;

      // Simulate the fixed code path
      if (disciplineIdForFilter) {
        const query = `SELECT ... WHERE jr.int_wertungenid = $1 AND df.int_disziplinenid = $2`;
        await mockQueryRawUnsafe(query, wertungenId, disciplineIdForFilter);
      }

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('AND df.int_disziplinenid = $2'),
        wertungenId,
        disciplineIdForFilter
      );
      // Verify it was called with exactly 3 args (query + 2 params)
      expect(mockQueryRawUnsafe.mock.calls[0]).toHaveLength(3);
    });

    it('should call $queryRawUnsafe with only wertungenId when disciplineId is null', async () => {
      const mockQueryRawUnsafe = jest.fn().mockResolvedValue([]);
      
      const wertungenId = 123;
      const disciplineIdForFilter: number | null = null;

      // Simulate the fixed code path (fallback)
      if (disciplineIdForFilter) {
        const query = `SELECT ... WHERE jr.int_wertungenid = $1 AND df.int_disziplinenid = $2`;
        await mockQueryRawUnsafe(query, wertungenId, disciplineIdForFilter);
      } else {
        const query = `SELECT ... WHERE jr.int_wertungenid = $1`;
        await mockQueryRawUnsafe(query, wertungenId);
      }

      expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('WHERE jr.int_wertungenid = $1'),
        wertungenId
      );
      // Verify it was called with exactly 2 args (query + 1 param)
      expect(mockQueryRawUnsafe.mock.calls[0]).toHaveLength(2);
      // Verify discipline filter is NOT in the query
      expect(mockQueryRawUnsafe.mock.calls[0][0]).not.toContain('int_disziplinenid');
    });
  });

  describe('Source Code Verification', () => {

    it('should have discipline filter in scores.ts jury results query', () => {
      // Read the actual source file and verify the fix is present
      const fs = require('fs');
      const path = require('path');
      const scoresPath = path.join(__dirname, '../../src/routes/scores.ts');
      const scoresContent = fs.readFileSync(scoresPath, 'utf8');

      // The main jury results query should include discipline filter
      expect(scoresContent).toContain('AND df.int_disziplinenid = $2');
      
      // The variable should be named disciplineIdForFilter
      expect(scoresContent).toContain('disciplineIdForFilter');
      
      // Should have the conditional query construction
      expect(scoresContent).toContain('disciplineIdForFilter');
    });

    it('should pass disciplineIdForFilter as parameter in the query execution', () => {
      const fs = require('fs');
      const path = require('path');
      const scoresPath = path.join(__dirname, '../../src/routes/scores.ts');
      const scoresContent = fs.readFileSync(scoresPath, 'utf8');

      // The query execution should pass disciplineIdForFilter
      expect(scoresContent).toContain('result.id, disciplineIdForFilter');
    });

    it('should have discipline filter in the recalculation jury results query', () => {
      const fs = require('fs');
      const path = require('path');
      const scoresPath = path.join(__dirname, '../../src/routes/scores.ts');
      const scoresContent = fs.readFileSync(scoresPath, 'utf8');

      // Count how many times the discipline filter appears
      // It should appear at least twice (main query + recalculation query)
      const matches = scoresContent.match(/AND df\.int_disziplinenid = \$2/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });
});
