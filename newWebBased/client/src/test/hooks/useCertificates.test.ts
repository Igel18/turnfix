import { describe, it, expect } from 'vitest'
import { mapCertificateFieldValue } from '@/pages/Results/hooks/useCertificates'

describe('mapCertificateFieldValue', () => {
  const participant = {
    id: 1,
    name: 'Max Mustermann',
    club: 'TV Musterstadt',
    startNumber: 12,
    age: 14,
    gender: 'männlich',
    scores: {},
    totalScore: 15.25,
    rank: 2,
    competitionId: 77,
  } as any

  it('uses the event name for database field 0', () => {
    expect(mapCertificateFieldValue('0', participant, 'Frühjahrswettkampf', 'Sporthalle Berlin', 'WK AK 12')).toBe('Frühjahrswettkampf')
  })

  it('uses the event location for database field 2', () => {
    expect(mapCertificateFieldValue('2', participant, 'Frühjahrswettkampf', 'Sporthalle Berlin', 'WK AK 12')).toBe('Sporthalle Berlin')
  })

  it('keeps the competition name for competition-specific fields', () => {
    expect(mapCertificateFieldValue('7', participant, 'Frühjahrswettkampf', 'Sporthalle Berlin', 'WK AK 12')).toBe('WK AK 12')
  })
})