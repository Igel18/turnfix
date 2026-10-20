import { describe, expect, it } from 'vitest'

import type { SessionGroup } from '@/pages/TimePlanning/TimePlanning.types'
import {
  getCompetitionParticipantCount,
  getCompetitionSquadNames,
  getEstimatedSessionDurationMinutes,
  getSessionDeviceCount,
  getSessionParticipantCount,
} from '@/pages/TimePlanning/sessionsViewUtils'

const sessionGroup: SessionGroup = {
  session: 2,
  startTime: '10:00',
  startDate: '2026-08-22',
  competitions: [
    {
      id: 101,
      name: 'WK 101',
      number: '101',
      round: 2,
      startTime: '10:00',
      startDate: '2026-08-22',
      warmupTime: '09:45',
      warmupDate: '2026-08-22',
      disciplineCount: 4,
      participantCount: 0,
      int_bahn: 1,
    },
    {
      id: 102,
      name: 'WK 102',
      number: '102',
      round: 2,
      startTime: '10:30',
      startDate: '2026-08-22',
      warmupTime: '10:15',
      warmupDate: '2026-08-22',
      disciplineCount: 3,
      participantCount: 0,
      int_bahn: 2,
    },
  ],
  squads: [
    {
      name: 'Riege A',
      participantCount: 10,
      competitions: ['WK 101'],
      competitionIds: [101],
    },
    {
      name: 'Riege B',
      participantCount: 8,
      competitions: ['WK 101', 'WK 102'],
      competitionIds: [101, 102],
    },
    {
      name: 'Riege C',
      participantCount: 6,
      competitions: ['WK 102'],
      competitionIds: [102],
    },
  ],
}

describe('timePlanning sessionsViewUtils', () => {
  it('counts participants per competition using competitionIds', () => {
    expect(getCompetitionParticipantCount(sessionGroup, 101)).toBe(18)
    expect(getCompetitionParticipantCount(sessionGroup, 102)).toBe(14)
  })

  it('computes aggregate session totals', () => {
    expect(getSessionParticipantCount(sessionGroup)).toBe(24)
    expect(getSessionDeviceCount(sessionGroup)).toBe(7)
  })

  it('computes estimated duration based on disciplines and participants', () => {
    const duration = getEstimatedSessionDurationMinutes(sessionGroup, 3)
    // 101: 4 * 18 * 3 = 216
    // 102: 3 * 14 * 3 = 126
    expect(duration).toBe(342)
  })

  it('returns squad names for a competition', () => {
    expect(getCompetitionSquadNames(sessionGroup, sessionGroup.competitions[0])).toEqual(['Riege A', 'Riege B'])
    expect(getCompetitionSquadNames(sessionGroup, sessionGroup.competitions[1])).toEqual(['Riege B', 'Riege C'])
  })
})
