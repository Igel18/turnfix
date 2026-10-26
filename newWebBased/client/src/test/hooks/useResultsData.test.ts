import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResultsData } from '../../pages/Results/hooks/useResultsData'

vi.mock('../../utils/api', () => ({
  apiGet: vi.fn(),
}))

describe('useResultsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps competition-specific jury fields and scores separated for participants in multiple competitions', async () => {
    const { apiGet } = await import('../../utils/api')

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

    const { result } = renderHook(() => useResultsData('1', ''))

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

  it('uses the latest loaded competitions when fetchEventRanking is called without arguments (stale closure)', async () => {
    const { apiGet } = await import('../../utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/competitions?')) return [{ id: 781, name: 'Kürwettkampf', number: '12' }]
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            { id: 1, firstname: 'A', lastname: 'B', club: 'C', startNumber: 1, age: 9, gender: 'weiblich', assignedCompetitions: [781] },
          ],
        }
      }
      if (url.startsWith('/scores?')) return { results: [] }
      if (url === '/disciplines') return []
      return { disciplines: [] }
    })

    const { result } = renderHook(() => useResultsData('1', ''))
    // Simulates a socket handler captured before competitions were loaded
    const staleFetch = result.current.fetchEventRanking

    await act(async () => {
      await result.current.fetchCompetitions()
    })
    await act(async () => {
      await staleFetch()
    })

    expect(result.current.competitionGroups[0].competitionName).toBe('Kürwettkampf (Nr. 12)')
  })

  it('ignores outdated responses when the competition filter changes quickly', async () => {
    const { apiGet } = await import('../../utils/api')
    let releaseFirst: () => void = () => {}
    const gate = new Promise<void>(r => { releaseFirst = r })

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        const isFirst = !url.includes('competitionId=2')
        if (isFirst) await gate
        return {
          participants: [
            { id: isFirst ? 1 : 2, firstname: isFirst ? 'Old' : 'New', lastname: 'X', club: 'C', startNumber: 1, age: 9, gender: 'weiblich', assignedCompetitions: [1, 2] },
          ],
        }
      }
      if (url.startsWith('/scores?')) return { results: [] }
      if (url === '/disciplines') return []
      return { disciplines: [] }
    })

    const { result, rerender } = renderHook(({ sel }) => useResultsData('1', sel), { initialProps: { sel: '' } })
    const comps = [{ id: 1, name: 'C1' }, { id: 2, name: 'C2' }]

    let first!: Promise<void>
    act(() => { first = result.current.fetchEventRanking(comps) })
    rerender({ sel: '2' })
    await act(async () => { await result.current.fetchEventRanking(comps) })
    await act(async () => { releaseFirst(); await first })

    expect(result.current.ranking.map(p => p.name)).toEqual(['New X'])
    expect(result.current.competitionGroups).toEqual([])
  })

  it('keeps the selected event name instead of falling back to the event id when no participants are loaded', async () => {
    const { apiGet } = await import('../../utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return { participants: [] }
      }

      return []
    })

    const { result } = renderHook(() => useResultsData('77', '', 'Fruehjahrs-Cup 2026'))

    await act(async () => {
      await result.current.fetchEventRanking([])
    })

    expect(result.current.eventName).toBe('Fruehjahrs-Cup 2026')
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

    const { result } = renderHook(() => useResultsData('1', ''))

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

    const { result } = renderHook(() => useResultsData('1', ''))

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

    const { result } = renderHook(() => useResultsData('1', '1'))

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

    const { result } = renderHook(() => useResultsData('1', '1'))

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
     * Fix: squadName URL parameter has been removed from useResultsData entirely.
     * The hook no longer accepts or forwards squadName. The Results page must
     * always fetch ALL event scores, ignoring any squad context.
     *
     * This test verifies structurally that NO scores call ever contains
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
    const { result } = renderHook(() => useResultsData('1', ''))

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

  it('Bug #106: when competition filter is set, disciplines without scores are still shown in disciplines list', async () => {
    // Regression test: previously setDisciplines() only contained disciplines that had scores.
    // When a competition filter is active, ALL configured disciplines for that competition
    // must appear, even if no participant has a score for them yet.
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Max',
              lastname: 'Muster',
              club: 'TV Test',
              startNumber: 1,
              age: 10,
              gender: 'männlich',
              startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }
      if (url.startsWith('/scores?')) {
        // Only Boden has a score — Reck and Barren have no scores yet
        return {
          results: [
            {
              participantId: 1,
              competitionId: 1,
              disciplineName: 'Boden m',
              score: 8.5,
              formula: '1*x',
              juryResults: [],
            },
          ],
        }
      }
      if (url === '/disciplines') {
        return [
          { id: 10, name: 'Boden m' },
          { id: 11, name: 'Reck m' },
          { id: 12, name: 'Barren m' },
        ]
      }
      if (url === '/competitions/1/disciplines') {
        // Competition has 3 disciplines configured — all should appear in the results
        return {
          disciplines: [
            { var_name: 'Boden m', var_formel: '1*x', var_kurz1: 'BOD', var_icon: '' },
            { var_name: 'Reck m', var_formel: '1*x', var_kurz1: 'REC', var_icon: '' },
            { var_name: 'Barren m', var_formel: '1*x', var_kurz1: 'BAR', var_icon: '' },
          ],
        }
      }
      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    // selectedCompetition = '1' (active filter); _squadName is the 2nd param (unused)
    const { result } = renderHook(() => useResultsData('1', '1'))

    await act(async () => {
      await result.current.fetchEventRanking([{ id: 1, name: 'Wettkampf 1', number: '0001' }])
    })

    // ALL 3 disciplines must be present in the disciplines list, not just 'Boden m'
    expect(result.current.disciplines).toContain('Boden m')
    expect(result.current.disciplines).toContain('Reck m')
    expect(result.current.disciplines).toContain('Barren m')
    expect(result.current.disciplines.length).toBe(3)
  })

  it('Bug #106: without competition filter (all competitions view), disciplines list is union of all scored disciplines', async () => {
    // When no competition filter is active, disciplines are built from actual scores (existing correct behaviour).
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Anna',
              lastname: 'Test',
              club: 'TV Test',
              startNumber: 1,
              age: 10,
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
              score: 7,
              formula: '1*x',
              juryResults: [],
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
            { var_name: 'Boden w', var_formel: '1*x', var_kurz1: 'BOD', var_icon: '' },
            { var_name: 'Sprung w', var_formel: '1*x', var_kurz1: 'SPR', var_icon: '' },
          ],
        }
      }
      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    // No competition filter (selectedCompetition = null)
    const { result } = renderHook(() => useResultsData('1', ''))

    await act(async () => {
      await result.current.fetchEventRanking([{ id: 1, name: 'Wettkampf 1', number: '0001' }])
    })

    // In no-filter mode the table-level disciplines list comes from scores only.
    // The per-competition group uses the API disciplines (Sprung w appears there).
    // Verify the per-group disciplines include the API disciplines
    const group = result.current.competitionGroups.find(g => g.competitionId === 1)
    expect(group).toBeTruthy()
    expect(group!.disciplines).toContain('Boden w')
    expect(group!.disciplines).toContain('Sprung w')
  })

  it('fetchCompetitions returns competitions sorted ascending by number (point 103)', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockResolvedValueOnce([
      { id: 3, name: 'Wettkampf 3', number: '3' },
      { id: 1, name: 'Wettkampf 1', number: '1' },
      { id: 2, name: 'Wettkampf 2', number: '2' },
    ])

    const { result } = renderHook(() => useResultsData('1', ''))

    let competitions: any[] = []
    await act(async () => {
      competitions = await result.current.fetchCompetitions()
    })

    expect(competitions.map(c => c.number)).toEqual(['1', '2', '3'])
    expect(result.current.competitions.map(c => c.number)).toEqual(['1', '2', '3'])
  })

  it('fetchCompetitions sorts competitions numerically (not lexicographically)', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockResolvedValueOnce([
      { id: 10, name: 'Wettkampf 10', number: '10' },
      { id: 2, name: 'Wettkampf 2', number: '2' },
      { id: 9, name: 'Wettkampf 9', number: '9' },
    ])

    const { result } = renderHook(() => useResultsData('1', ''))

    let competitions: any[] = []
    await act(async () => {
      competitions = await result.current.fetchCompetitions()
    })

    // Numeric sort: 2, 9, 10 — not lexicographic: 10, 2, 9
    expect(competitions.map(c => c.number)).toEqual(['2', '9', '10'])
  })

  it('Bug #162: loads all score pages when event has more than 1000 score rows', async () => {
    const { apiGet } = await import('@/utils/api')

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) {
        return {
          participants: [
            {
              id: 1,
              firstname: 'Max',
              lastname: 'ManyScores',
              club: 'TV Test',
              startNumber: 1,
              age: 12,
              gender: 'männlich',
              startet_nicht: false,
              assignedCompetitions: [1],
            },
          ],
        }
      }

      if (url.startsWith('/scores?')) {
        const parsed = new URL(`http://localhost${url}`)
        const limit = Number(parsed.searchParams.get('limit') || '1000')
        const offset = Number(parsed.searchParams.get('offset') || '0')

        // Simulate 1001 total rows, with one relevant score for participant 1
        // on page 2 (offset 1000). Without pagination this score is lost.
        if (offset === 0) {
          const filler = Array.from({ length: limit }, (_, i) => ({
            participantId: 9999,
            competitionId: 1,
            disciplineName: 'Boden m',
            score: 5,
            formula: '1*x',
            juryResults: [],
            _row: i,
          }))

          return {
            results: filler,
            pagination: {
              total: 1001,
              limit,
              offset,
              hasMore: true,
            },
          }
        }

        if (offset === 1000) {
          return {
            results: [
              {
                participantId: 1,
                competitionId: 1,
                disciplineName: 'Boden m',
                score: 9.5,
                formula: '1*x',
                juryResults: [
                  { fieldName: 'Wertung', fieldShortName: 'x', performance: 9.5, isFinalScore: false, isStartingScore: false },
                ],
              },
            ],
            pagination: {
              total: 1001,
              limit,
              offset,
              hasMore: false,
            },
          }
        }

        return { results: [], pagination: { total: 1001, limit, offset, hasMore: false } }
      }

      if (url === '/disciplines') {
        return [{ id: 10, name: 'Boden m' }]
      }

      if (url === '/competitions/1/disciplines') {
        return {
          disciplines: [
            { var_name: 'Boden m', var_formel: '1*x', var_kurz1: 'BOD', var_icon: '' },
          ],
        }
      }

      throw new Error(`Unhandled apiGet URL in test: ${url}`)
    })

    const { result } = renderHook(() => useResultsData('1', ''))

    await act(async () => {
      await result.current.fetchEventRanking([{ id: 1, name: 'WK 1', number: '0001' }])
    })

    expect(result.current.competitionGroups).toHaveLength(1)
    const group = result.current.competitionGroups[0]
    expect(group.participants).toHaveLength(1)
    expect(group.participants[0].scores['Boden m']).toBeCloseTo(9.5, 2)
    expect(group.participants[0].totalScore).toBeCloseTo(9.5, 2)
  })

  describe('placements through the shared score calculation', () => {
    type Entry = { id: number; name: string; scores: Record<string, number>; disciplineFormula?: string; formula?: string | null; juryResults?: any[] }

    const mockEvent = async (entries: Entry[], disciplineNames: string[]) => {
      const { apiGet } = await import('@/utils/api')
      vi.mocked(apiGet).mockImplementation(async (url: string) => {
        if (url.startsWith('/event-participants?')) {
          return {
            participants: entries.map(entry => ({
              id: entry.id, firstname: entry.name, lastname: 'T', club: 'TV', startNumber: entry.id,
              age: 10, gender: 'weiblich', startet_nicht: false, assignedCompetitions: [1],
            })),
          }
        }
        if (url.startsWith('/scores?')) {
          return {
            results: entries.flatMap(entry => Object.entries(entry.scores).map(([discipline, score]) => ({
              participantId: entry.id,
              competitionId: 1,
              disciplineName: discipline,
              score,
              formula: entry.formula ?? null,
              disciplineFormula: entry.disciplineFormula ?? null,
              juryResults: entry.juryResults ?? [],
            }))),
          }
        }
        if (url === '/disciplines') return disciplineNames.map((name, index) => ({ id: index + 1, name }))
        if (url === '/competitions/1/disciplines') {
          return { disciplines: disciplineNames.map(name => ({ var_name: name, var_kurz1: name.slice(0, 3) })) }
        }
        throw new Error(`Unhandled apiGet URL in test: ${url}`)
      })
    }

    const rankSingle = async (competition: object) => {
      const { result } = renderHook(() => useResultsData('1', '1'))
      await act(async () => {
        await result.current.fetchEventRanking([{ id: 1, name: 'WK', number: '0001', ...competition }])
      })
      return result.current.ranking
    }

    const rankGrouped = async (competition: object) => {
      const { result } = renderHook(() => useResultsData('1', ''))
      await act(async () => {
        await result.current.fetchEventRanking([{ id: 1, name: 'WK', number: '0001', ...competition }])
      })
      return result.current.competitionGroups[0].participants
    }

    const apparatus = ['Boden', 'Sprung', 'Balken', 'Reck']
    const first = (p: { name: string }) => p.name.split(' ')[0]
    const named = (id: number, name: string, values: number[], extra: Partial<Entry> = {}): Entry => ({
      id, name, scores: Object.fromEntries(values.map((value, index) => [apparatus[index], value])), ...extra,
    })

    it('gives equal totals the same place despite floating-point summation order (single competition)', async () => {
      await mockEvent([
        named(11, 'Anna', [13.35, 14.15, 12.1, 12.6]),
        named(12, 'Berta', [14.3, 10.5, 14, 13.4]),
        named(13, 'Clara', [5, 5, 5, 5]),
      ], apparatus)

      const ranking = await rankSingle({})
      expect(Object.fromEntries(ranking.map(p => [first(p), p.rank]))).toEqual({ Anna: 1, Berta: 1, Clara: 3 })
    })

    it('gives equal totals the same place in the grouped view as well', async () => {
      await mockEvent([
        named(11, 'Anna', [13.35, 14.15, 12.1, 12.6]),
        named(12, 'Berta', [14.3, 10.5, 14, 13.4]),
      ], apparatus)

      const participants = await rankGrouped({})
      expect(participants.map(p => p.rank)).toEqual([1, 1])
    })

    it('applies the built-in formula var_formel before ranking', async () => {
      await mockEvent([
        named(1, 'Schnell', [6], { disciplineFormula: '20-x' }),
        named(2, 'Langsam', [9], { disciplineFormula: '20-x' }),
      ], ['Boden'])

      const ranking = await rankSingle({})
      expect(ranking.map(p => [first(p), p.totalScore, p.rank])).toEqual([['Schnell', 14, 1], ['Langsam', 11, 2]])
    })

    it('recalculates a linked formula from the jury fields before ranking', async () => {
      const jury = (a: number, b: number) => [
        { fieldName: 'A', fieldShortName: 'A', performance: a, isFinalScore: false, isStartingScore: false },
        { fieldName: 'B', fieldShortName: 'B', performance: b, isFinalScore: false, isStartingScore: false },
      ]
      await mockEvent([
        named(1, 'Alt', [1], { formula: 'A+B', juryResults: jury(5, 3) }),
        named(2, 'Neu', [1], { formula: 'A+B', juryResults: jury(6, 4) }),
      ], ['Boden'])

      const ranking = await rankSingle({})
      expect(ranking.map(p => [first(p), p.totalScore])).toEqual([['Neu', 10], ['Alt', 8]])
    })

    it('ranks ascending and applies the Streichwertung of the competition', async () => {
      await mockEvent([
        named(1, 'Anna', [10, 10, 1]),
        named(2, 'Berta', [9, 9, 9]),
      ], apparatus.slice(0, 3))

      const ascending = await rankSingle({ sortAscending: true })
      expect(ascending.map(first)).toEqual(['Anna', 'Berta'])

      const dropping = await rankSingle({ dropWorstScore: true, dropCount: 1 })
      expect(dropping.map(p => [first(p), p.totalScore, p.rank])).toEqual([['Anna', 20, 1], ['Berta', 18, 2]])
    })
  })
})
