import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResultsData } from '@/pages/Results/hooks/useResultsData'

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn(),
}))

describe('useResultsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps competition-specific jury fields and scores separated for participants in multiple competitions', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Anna',
              lastname: 'Mehrkampf',
              club: 'TV Test',
              startNumber: 7,
              age: 10,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [1, 2],
            },
            {
              id: 2,
              firstname: 'Berta',
              lastname: 'NurComp2',
              club: 'TV Test',
              startNumber: 8,
              age: 11,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [2],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 1,
              competitionId: 1,
              disciplineName: 'Boden w',
              score: 0,
              formula: '(10 + A) - B',
              juryResults: [
                { fieldName: 'A', fieldShortName: 'A', performance: 6, isFinalScore: false, isStartingScore: false },
                { fieldName: 'B', fieldShortName: 'B', performance: 3, isFinalScore: false, isStartingScore: false },
              ],
            },
            {
              participantId: 1,
              competitionId: 2,
              disciplineName: 'Boden w',
              score: 5,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 5, isFinalScore: false, isStartingScore: false },
              ],
            },
            {
              participantId: 2,
              competitionId: 2,
              disciplineName: 'Boden w',
              score: 4,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 4, isFinalScore: false, isStartingScore: false },
              ],
            },
          ],
        }
      }

      if (url === '/disciplines') {
        return [{ id: 10, name: 'Boden w' }]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '(10 + A) - B', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      if (url === '/competitions/2/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', null, ''))

    await act(async () => {
      await result.current.fetchEventRanking([
        { id: 1, name: 'Comp 1', number: '0001' },
        { id: 2, name: 'Comp 2', number: '0002' },
      ])
    })

    const groups = result.current.competitionGroups
    expect(groups.length).toBeGreaterThanOrEqual(2)

    const group1 = groups.find(g => g.competitionId === 1)
    const group2 = groups.find(g => g.competitionId === 2)

    expect(group1).toBeTruthy()
    expect(group2).toBeTruthy()

    const annaInGroup1 = group1!.participants.find(p => p.id === 1)
    const annaInGroup2 = group2!.participants.find(p => p.id === 1)

    expect(annaInGroup1).toBeTruthy()
    expect(annaInGroup2).toBeTruthy()

    expect(annaInGroup1!.juryResults?.['Boden w']?.[0]?.fieldName).toBe('A')
    expect(annaInGroup2!.juryResults?.['Boden w']?.[0]?.fieldName).toBe('Wertung')

    expect(annaInGroup1!.totalScore).toBeCloseTo(13, 2)
    expect(annaInGroup2!.totalScore).toBeCloseTo(5, 2)
  })

  it('keeps multi-discipline scores isolated per competition and calculates totals per competition discipline set', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Anna',
              lastname: 'Mehrkampf',
              club: 'TV Test',
              startNumber: 7,
              age: 10,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [1, 2],
            },
            {
              id: 2,
              firstname: 'Berta',
              lastname: 'Comp2',
              club: 'TV Test',
              startNumber: 8,
              age: 11,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [2],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 1,
              competitionId: 1,
              disciplineName: 'Boden w',
              score: 9,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 9, isFinalScore: false, isStartingScore: false },
              ],
            },
            {
              participantId: 1,
              competitionId: 1,
              disciplineName: 'Sprung w',
              score: 8,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 8, isFinalScore: false, isStartingScore: false },
              ],
            },
            {
              participantId: 1,
              competitionId: 2,
              disciplineName: 'Boden w',
              score: 5,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 5, isFinalScore: false, isStartingScore: false },
              ],
            },
            {
              participantId: 2,
              competitionId: 2,
              disciplineName: 'Boden w',
              score: 6,
              formula: '1*x',
              juryResults: [
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 6, isFinalScore: false, isStartingScore: false },
              ],
            },
          ],
        }
      }

      if (url === '/disciplines') {
        return [
          { id: 10, name: 'Boden w' },
          { id: 11, name: 'Sprung w' },
        ]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
            { var_name: 'Sprung w', var_formel: '1*x', var_kurz1: 'SPR', var_icon: ':/icons/sprung.png' },
          ],
        }
      }

      if (url === '/competitions/2/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', null, ''))

    await act(async () => {
      await result.current.fetchEventRanking([
        { id: 1, name: 'Comp 1', number: '0001' },
        { id: 2, name: 'Comp 2', number: '0002' },
      ])
    })

    const group1 = result.current.competitionGroups.find(g => g.competitionId === 1)
    const group2 = result.current.competitionGroups.find(g => g.competitionId === 2)

    expect(group1).toBeTruthy()
    expect(group2).toBeTruthy()

    const annaInGroup1 = group1!.participants.find(p => p.id === 1)
    const annaInGroup2 = group2!.participants.find(p => p.id === 1)

    expect(annaInGroup1).toBeTruthy()
    expect(annaInGroup2).toBeTruthy()

    expect(annaInGroup1!.scores['Boden w']).toBe(9)
    expect(annaInGroup1!.scores['Sprung w']).toBe(8)
    expect(annaInGroup2!.scores['Boden w']).toBe(5)
    expect(annaInGroup2!.scores['Sprung w']).toBeUndefined()

    expect(group1!.disciplines).toEqual(['Boden w', 'Sprung w'])
    expect(group2!.disciplines).toEqual(['Boden w'])

    expect(annaInGroup1!.totalScore).toBeCloseTo(17, 2)
    expect(annaInGroup2!.totalScore).toBeCloseTo(5, 2)
  })

  it('calculates totals using current competition discipline formula after formula switch', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Emilia',
              lastname: 'SwitchCase',
              club: 'TV Test',
              startNumber: 3,
              age: 6,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 1,
              competitionId: 1,
              disciplineName: 'Boden w',
              score: 8,
              // stale linked formula persisted in old score row
              formula: 'A+B',
              juryResults: [
                { fieldName: 'Schwierigkeit', fieldShortName: 'A', performance: 2, isFinalScore: false, isStartingScore: false },
                { fieldName: 'Wertung', fieldShortName: 'x', performance: 8, isFinalScore: false, isStartingScore: false },
              ],
            },
          ],
        }
      }

      if (url === '/disciplines') {
        return [{ id: 10, name: 'Boden w' }]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            // current formula configured on discipline and shown in Results header
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', null, ''))

    await act(async () => {
      await result.current.fetchEventRanking([
        { id: 1, name: 'Comp 1', number: '0001' },
      ])
    })

    const group = result.current.competitionGroups.find(g => g.competitionId === 1)
    expect(group).toBeTruthy()

    const participant = group!.participants.find(p => p.id === 1)
    expect(participant).toBeTruthy()

    // Must follow current discipline formula 1*x (=> 8), not stale stored A+B (=> 10)
    expect(participant!.scores['Boden w']).toBeCloseTo(8, 2)
    expect(participant!.totalScore).toBeCloseTo(8, 2)
  })

  it('maps API juryResults to participant.juryResults for selected competition results', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 11,
              firstname: 'Ida',
              lastname: 'Von Preislinger',
              club: 'TV Memmingen 1859',
              startNumber: 1,
              age: 5,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 11,
              competitionId: 1,
              disciplineName: 'Boden w',
              score: 10,
              formula: '1*x',
              juryResults: [
                { id: 1, fieldName: 'Wertung', fieldShortName: 'x', performance: 10, isFinalScore: false, isStartingScore: false, attempt: 1, kp: 0 },
                { id: 2, fieldName: 'Endwert', fieldShortName: 'E', performance: 10, isFinalScore: true, isStartingScore: false, attempt: 1, kp: 0 },
              ],
            },
          ],
        }
      }

      if (url === '/disciplines') {
        return [{ id: 10, name: 'Boden w' }]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', null, '1'))

    await act(async () => {
      await result.current.fetchEventRanking([
        { id: 1, name: 'Comp 1', number: '0001' },
      ])
    })

    expect(result.current.ranking).toHaveLength(1)

    const participant = result.current.ranking[0]
    const disciplineJuryResults = participant.juryResults?.['Boden w']

    expect(disciplineJuryResults).toBeDefined()
    expect(disciplineJuryResults).toHaveLength(2)
    expect(disciplineJuryResults?.[0].fieldName).toBe('Wertung')
    expect(disciplineJuryResults?.[0].performance).toBe(10)
    expect(disciplineJuryResults?.[1].isFinalScore).toBe(true)
  })

  it('anonymized regression: keeps Boden w score 10.0 for variable formula 1*x with Endwert jury data', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 21,
              firstname: 'Athletin',
              lastname: 'A',
              club: 'Verein A',
              startNumber: 3,
              age: 6,
              gender: 'weiblich',
              startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 21,
              competitionId: 1,
              disciplineName: 'Boden w',
              score: 10,
              formula: null,
              disciplineFormula: '1*x',
              juryResults: [
                { id: 1, fieldName: 'Schwierigkeit', fieldShortName: 'Schwierigkeit', performance: null, isFinalScore: false, isStartingScore: false, attempt: 1, kp: 0 },
                { id: 2, fieldName: 'Wertung', fieldShortName: 'Wertung', performance: null, isFinalScore: false, isStartingScore: false, attempt: 1, kp: 0 },
                { id: 3, fieldName: 'Abzüge', fieldShortName: 'Abzüge', performance: 1, isFinalScore: false, isStartingScore: false, attempt: 1, kp: 0 },
                { id: 4, fieldName: 'Endwert', fieldShortName: 'Endwert', performance: 10, isFinalScore: true, isStartingScore: false, attempt: 1, kp: 0 },
              ],
            },
          ],
        }
      }

      if (url === '/disciplines') {
        return [{ id: 10, name: 'Boden w' }]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', null, '1'))

    await act(async () => {
      await result.current.fetchEventRanking([
        { id: 1, name: 'Comp 1', number: '0001' },
      ])
    })

    expect(result.current.ranking).toHaveLength(1)
    const participant = result.current.ranking[0]

    expect(participant.name).toBe('Athletin A')
    expect(participant.scores['Boden w']).toBeCloseTo(10, 2)
    expect(participant.totalScore).toBeCloseTo(10, 2)
    expect(participant.juryResults?.['Boden w']?.length).toBe(4)
  })

  // ─── Item 90: squadName URL filter must NOT restrict Results scores ───────

  it('squadName in URL does NOT filter scores: all participants show their scores regardless of squad', async () => {
    /**
     * Bug: when ?squadName=X is in the URL, useResultsData passes squadName to
     * the scores API → server filters WHERE var_riege = X → participants in other
     * squads lose their scores.  The Results page must always fetch ALL event
     * scores, ignoring the squad context.
     *
     * Test proof: pass squadName='wGlb' to useResultsData; the mock captures
     * every URL used to call apiGet.  Assert that NO scores call contains
     * 'squadName=' in its query string.
     */
    const { apiGet } = await import('@/utils/api')
    const capturedUrls: string[] = []

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      capturedUrls.push(url)

      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1, firstname: 'Anna', lastname: 'Squad1', club: 'TV A',
              startNumber: 1, age: 10, gender: 'weiblich', startet_nicht: false,
              assignedCompetitions: [1],
            },
            {
              id: 2, firstname: 'Berta', lastname: 'Squad2', club: 'TV B',
              startNumber: 2, age: 11, gender: 'weiblich', startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        return {
          results: [
            {
              participantId: 1, competitionId: 1, disciplineName: 'Boden w',
              score: 9, formula: '1*x',
              juryResults: [{ fieldName: 'Wertung', fieldShortName: 'x', performance: 9, isFinalScore: false, isStartingScore: false }],
            },
            {
              participantId: 2, competitionId: 1, disciplineName: 'Boden w',
              score: 7, formula: '1*x',
              juryResults: [{ fieldName: 'Wertung', fieldShortName: 'x', performance: 7, isFinalScore: false, isStartingScore: false }],
            },
          ],
        }
      }

      if (url === '/disciplines') return [{ id: 10, name: 'Boden w' }]

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: ':/icons/boden.png' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    // Pass squadName='wGlb' (as would happen when navigating from squad page)
    const { result } = renderHook(() => useResultsData('1', 'wGlb', ''))

    await act(async () => {
      await result.current.fetchEventRanking([{ id: 1, name: 'Wettkampf 1', number: '0001' }])
    })

    // ❶ The scores API must NOT have been called with squadName in the query
    const scoresUrls = capturedUrls.filter(u => u.startsWith('/scores?'))
    expect(scoresUrls.length).toBeGreaterThan(0) // sanity check
    for (const url of scoresUrls) {
      expect(url).not.toContain('squadName=')
    }

    // ❷ Both participants (regardless of squad) must have their scores
    const group = result.current.competitionGroups.find(g => g.competitionId === 1)
    expect(group).toBeTruthy()

    const anna = group!.participants.find(p => p.id === 1)
    const berta = group!.participants.find(p => p.id === 2)

    expect(anna).toBeTruthy()
    expect(berta).toBeTruthy()
    expect(anna!.scores['Boden w']).toBeCloseTo(9, 2)
    expect(berta!.scores['Boden w']).toBeCloseTo(7, 2)
  })
})
