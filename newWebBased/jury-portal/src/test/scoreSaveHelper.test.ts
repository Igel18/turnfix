import { describe, it, expect } from 'vitest';
import { getCreateWertungRequest, extractWertungenId } from '../utils/scoreSaveHelper';

describe('Score Save Helper — Prevents duplicate 0.00 entries in live-scores', () => {

  describe('getCreateWertungRequest', () => {
    it('should use /scores/create-wertung endpoint (NOT save-value)', () => {
      const result = getCreateWertungRequest('http://localhost:3001/api', 1, 42, 74);
      
      // CRITICAL: Must use create-wertung to avoid emitting score-updated with score=0
      expect(result.url).toBe('http://localhost:3001/api/scores/create-wertung');
      expect(result.url).not.toContain('save-value');
    });

    it('should NOT include a score field in the request body', () => {
      const result = getCreateWertungRequest('http://localhost:3001/api', 1, 42, 74);
      
      // create-wertung does not accept a score field — it just creates the DB record
      expect(result.body).not.toHaveProperty('score');
    });

    it('should include competitionId, participantId, disciplineId', () => {
      const result = getCreateWertungRequest('http://localhost:3001/api', 5, 100, 74);
      
      expect(result.body.competitionId).toBe(5);
      expect(result.body.participantId).toBe(100);
      expect(result.body.disciplineId).toBe(74);
    });

    it('should work with different API base URLs', () => {
      const result = getCreateWertungRequest('https://example.com/api', 1, 2, 3);
      expect(result.url).toBe('https://example.com/api/scores/create-wertung');
    });
  });

  describe('extractWertungenId', () => {
    it('should extract wertungenId from successful create-wertung response', () => {
      const response = { success: true, wertungenId: 456, message: 'Created' };
      expect(extractWertungenId(response)).toBe(456);
    });

    it('should return undefined for empty response', () => {
      expect(extractWertungenId(null)).toBeUndefined();
      expect(extractWertungenId(undefined)).toBeUndefined();
    });

    it('should return undefined when wertungenId is missing', () => {
      expect(extractWertungenId({ success: true })).toBeUndefined();
    });

    it('should return undefined when wertungenId is 0 (falsy but valid DB value should not happen)', () => {
      // 0 is not a valid wertungenId in PostgreSQL serial columns
      expect(extractWertungenId({ wertungenId: 0 })).toBeUndefined();
    });
  });
});
