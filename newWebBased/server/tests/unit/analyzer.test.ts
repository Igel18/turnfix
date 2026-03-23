/**
 * Unit Tests – Event Analyzer Route
 *
 * Tests the exported check functions using a mock Prisma client
 * (no real database connection required).
 *
 * Covers:
 *   1. checkMissingStartNumbers     – ok / warning
 *   2. checkCompetitionsWithoutDisciplines – ok / error
 *   3. checkDisciplinesWithoutMaxScore     – ok / warning
 *   4. checkGenderAgeMismatch       – ok / error
 *   5. checkParticipantsWithoutSquad – ok / warning
 *   6. checkMissingScoreDetails     – ok / info
 *   7. checkSquadCombination        – ok / warning variants
 *   8. checkDuplicateTopPlacements  – ok / info
 *   9. HTTP endpoint structure & 400 on invalid eventId
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import express from 'express'
import request from 'supertest'

// ============================================================================
// Mock prisma lib before any import that transitively loads it
// ============================================================================

const mockQueryRawUnsafe = jest.fn<() => Promise<any[]>>()

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRawUnsafe: mockQueryRawUnsafe,
  },
}))

jest.mock('../../src/utils/debug', () => ({
  isDebug: () => false,
}))

// Import AFTER mocks are registered
import {
  checkMissingStartNumbers,
  checkCompetitionsWithoutDisciplines,
  checkDisciplinesWithoutMaxScore,
  checkGenderAgeMismatch,
  checkParticipantsWithoutSquad,
  checkMissingScoreDetails,
  checkSquadCombination,
  checkDuplicateTopPlacements,
} from '../../src/routes/analyzer'

// Also import the router so we can test the HTTP layer
import analyzerRouter from '../../src/routes/analyzer'

// ============================================================================
// Helpers
// ============================================================================

/** Return a mock that yields rows in sequence (used for multi-query checks) */
function mockSequential(...results: any[][]) {
  results.forEach(rows => mockQueryRawUnsafe.mockResolvedValueOnce(rows))
}

// ============================================================================
// Tests – checkMissingStartNumbers
// ============================================================================

describe('checkMissingStartNumbers', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when count = 0', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkMissingStartNumbers(1)
    expect(result.id).toBe('missing_start_numbers')
    expect(result.status).toBe('ok')
    expect(result.affectedCount).toBe(0)
  })

  it('returns warning with affected count when participants lack start numbers', async () => {
    mockSequential(
      [{ c: 3 }],
      [
        { id: 10, label: 'Max Mustermann' },
        { id: 11, label: 'Anna Schmidt' },
      ],
    )
    const result = await checkMissingStartNumbers(1)
    expect(result.status).toBe('warning')
    expect(result.affectedCount).toBe(3)
    expect(result.details).toHaveLength(2)
    expect(result.details[0].label).toBe('Max Mustermann')
  })

  it('includes quickActionId', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkMissingStartNumbers(1)
    expect(result.quickActionId).toBe('generate_start_numbers')
  })

  it('targets /event-participants action route', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkMissingStartNumbers(1)
    expect(result.actionRoute).toBe('/event-participants')
  })
})

// ============================================================================
// Tests – checkCompetitionsWithoutDisciplines
// ============================================================================

describe('checkCompetitionsWithoutDisciplines', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when all competitions have disciplines', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([])
    const result = await checkCompetitionsWithoutDisciplines(1)
    expect(result.status).toBe('ok')
    expect(result.affectedCount).toBe(0)
  })

  it('returns error when competitions lack disciplines', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([
      { id: 5, label: 'Gerätvierkampf männlich' },
    ])
    const result = await checkCompetitionsWithoutDisciplines(1)
    expect(result.status).toBe('error')
    expect(result.affectedCount).toBe(1)
    expect(result.severity).toBe('error')
    expect(result.details[0].label).toBe('Gerätvierkampf männlich')
  })
})

// ============================================================================
// Tests – checkDisciplinesWithoutMaxScore
// ============================================================================

describe('checkDisciplinesWithoutMaxScore', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when all disciplines have max score', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([])
    const result = await checkDisciplinesWithoutMaxScore(1)
    expect(result.status).toBe('ok')
  })

  it('returns warning when disciplines miss max score', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([
      { id: 1, label: 'Boden (WK1)' },
      { id: 2, label: 'Reck (WK1)' },
    ])
    const result = await checkDisciplinesWithoutMaxScore(1)
    expect(result.status).toBe('warning')
    expect(result.affectedCount).toBe(2)
    expect(result.severity).toBe('warning')
  })
})

// ============================================================================
// Tests – checkGenderAgeMismatch
// ============================================================================

describe('checkGenderAgeMismatch', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when no mismatches', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkGenderAgeMismatch(1)
    expect(result.status).toBe('ok')
    expect(result.id).toBe('gender_age_mismatch')
  })

  it('returns error and details when mismatches found', async () => {
    mockSequential(
      [{ c: 2 }],
      [
        { id: 20, label: 'Max Müller → WK Damen' },
        { id: 21, label: 'Lisa Lang → WK Herren' },
      ],
    )
    const result = await checkGenderAgeMismatch(1)
    expect(result.status).toBe('error')
    expect(result.affectedCount).toBe(2)
    expect(result.severity).toBe('error')
    expect(result.details).toHaveLength(2)
  })
})

// ============================================================================
// Tests – checkParticipantsWithoutSquad
// ============================================================================

describe('checkParticipantsWithoutSquad', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when all participants have a squad', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkParticipantsWithoutSquad(1)
    expect(result.status).toBe('ok')
    expect(result.category).toBe('squads')
  })

  it('returns warning when participants lack squads', async () => {
    mockSequential([{ c: 5 }], [{ id: 30, label: 'Paul Braun' }])
    const result = await checkParticipantsWithoutSquad(1)
    expect(result.status).toBe('warning')
    expect(result.affectedCount).toBe(5)
    expect(result.actionRoute).toBe('/squads')
  })
})

// ============================================================================
// Tests – checkMissingScoreDetails
// ============================================================================

describe('checkMissingScoreDetails', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when all scores are captured', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ c: 0 }])
    const result = await checkMissingScoreDetails(1)
    expect(result.status).toBe('ok')
    expect(result.category).toBe('capture')
  })

  it('returns info severity when scores are missing', async () => {
    mockSequential([{ c: 7 }], [{ id: 40, label: 'Jana Vogt' }])
    const result = await checkMissingScoreDetails(1)
    expect(result.status).toBe('info')
    expect(result.severity).toBe('info')
    expect(result.affectedCount).toBe(7)
  })
})

// ============================================================================
// Tests – checkSquadCombination
// ============================================================================

describe('checkSquadCombination', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when no squads defined (nothing to generate)', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([{ squad_count: 0 }])
    const result = await checkSquadCombination(1)
    expect(result.status).toBe('ok')
    expect(result.quickActionId).toBe('generate_squad_combination')
  })

  it('returns ok when squads exist and combinations are generated', async () => {
    mockSequential(
      [{ squad_count: 3 }],
      [{ c: 9 }], // 9 combination rows exist
    )
    const result = await checkSquadCombination(1)
    expect(result.status).toBe('ok')
    expect(result.affectedCount).toBe(0)
  })

  it('returns warning when squads exist but combinations not generated', async () => {
    mockSequential(
      [{ squad_count: 3 }],
      [{ c: 0 }], // no combination rows
    )
    const result = await checkSquadCombination(1)
    expect(result.status).toBe('warning')
    expect(result.affectedCount).toBe(3)
  })
})

// ============================================================================
// Tests – checkDuplicateTopPlacements
// ============================================================================

describe('checkDuplicateTopPlacements', () => {
  beforeEach(() => { mockQueryRawUnsafe.mockReset() })

  it('returns ok when no tied top-3 placements', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([])
    const result = await checkDuplicateTopPlacements(1)
    expect(result.status).toBe('ok')
    expect(result.category).toBe('results')
  })

  it('returns info when tied placements exist', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([
      { id: 50, label: 'WK Herren – Platz 1' },
    ])
    const result = await checkDuplicateTopPlacements(1)
    expect(result.status).toBe('info')
    expect(result.severity).toBe('info')
    expect(result.affectedCount).toBe(1)
    expect(result.actionRoute).toBe('/results')
  })
})

// ============================================================================
// Tests – HTTP endpoint
// ============================================================================

describe('GET /event/:eventId (HTTP layer)', () => {
  let app: express.Application

  beforeEach(() => {
    mockQueryRawUnsafe.mockReset()
    app = express()
    app.use(express.json())
    app.use('/analyzer', analyzerRouter)
  })

  it('returns 400 for non-numeric eventId', async () => {
    const res = await request(app).get('/analyzer/event/abc')
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns response with checks array and summary object', async () => {
    // 8 checks × 1-2 queries each – return empty array for all
    // (arrays use .length for count; c-based checks use [0]?.c ?? 0 = 0)
    mockQueryRawUnsafe.mockResolvedValue([])

    const res = await request(app).get('/analyzer/event/1')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.checks)).toBe(true)
    expect(res.body.checks).toHaveLength(8)
    expect(typeof res.body.summary).toBe('object')
    expect(typeof res.body.summary.total).toBe('number')
    expect(res.body.summary.total).toBe(8)
  })

  it('summary correctly sums ok/warning/error/info from checks', async () => {
    // Return empty arrays → all 8 checks should be ok
    mockQueryRawUnsafe.mockResolvedValue([])

    const res = await request(app).get('/analyzer/event/1')
    expect(res.status).toBe(200)
    const { summary } = res.body
    expect(summary.ok).toBe(summary.total)
    expect(summary.errors).toBe(0)
    expect(summary.warnings).toBe(0)
    expect(summary.infos).toBe(0)
  })
})
