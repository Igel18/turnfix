import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import type { Participant, CompetitionGroup } from '@/pages/Results/Results.types'

const juryDisplaySpy = vi.fn(() => <div data-testid="jury-results-display" />)

vi.mock('@/pages/Results/components/JuryResultsDisplay', () => ({
  JuryResultsDisplay: (props: any) => juryDisplaySpy(props),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { ResultsTable } from '@/pages/Results/components/ResultsTable'

const baseParticipant: Participant = {
  id: 1,
  name: 'Anna Test',
  club: 'TV Test',
  startNumber: 1,
  age: 10,
  gender: 'weiblich',
  scores: {
    'Boden w': 5,
    'Stufenbarren': 15,
  },
  juryResults: {
    'Boden w': [
      {
        id: 1,
        disciplineFieldId: 10,
        performance: 5,
        attempt: 1,
        kp: 0,
        fieldName: 'A',
        fieldShortName: 'A',
        isFinalScore: false,
        isStartingScore: false,
      },
    ],
    Stufenbarren: [
      {
        id: 2,
        disciplineFieldId: 11,
        performance: 5,
        attempt: 1,
        kp: 0,
        fieldName: 'Wertung',
        fieldShortName: 'x',
        isFinalScore: false,
        isStartingScore: false,
      },
    ],
  },
  formulas: {
    'Boden w': 'A+B',
    Stufenbarren: '1*x',
  },
  totalScore: 20,
  rank: 1,
}

describe('ResultsTable formula propagation', () => {
  beforeEach(() => {
    juryDisplaySpy.mockClear()
  })

  it('passes competition discipline formula to JuryResultsDisplay in grouped view', () => {
    const group: CompetitionGroup = {
      competitionId: 1,
      competitionName: 'Comp 1',
      participants: [baseParticipant],
      disciplines: ['Boden w', 'Stufenbarren'],
      disciplineInfo: [
        {
          name: 'Boden w',
          icon: 'icon-boden',
          fullData: { var_formel: '1*x' },
        },
        {
          name: 'Stufenbarren',
          icon: 'icon-stuba',
          fullData: { var_formel: '(10 + A) - B' },
        },
      ],
    }

    render(
      <ResultsTable
        isLoading={false}
        selectedCompetition={null}
        filteredRanking={[]}
        filteredCompetitionGroups={[group]}
        disciplines={[]}
        disciplineFormulas={{}}
        showDisciplineScores={true}
        formatScore={(score) => score.toFixed(2)}
        getMedalColor={() => 'bg-gray-100 text-gray-900'}
        getMedalEmoji={(rank) => String(rank)}
      />
    )

    const formulas = juryDisplaySpy.mock.calls.map(call => call[0]?.formula)
    expect(formulas).toContain('1*x')
    expect(formulas).toContain('(10 + A) - B')
  })

  it('passes selected competition formula map to JuryResultsDisplay in single competition view', () => {
    render(
      <ResultsTable
        isLoading={false}
        selectedCompetition={'1'}
        filteredRanking={[baseParticipant]}
        filteredCompetitionGroups={[]}
        disciplines={['Boden w', 'Stufenbarren']}
        disciplineFormulas={{
          'Boden w': '1*x',
          Stufenbarren: '(10 + A) - B',
        }}
        showDisciplineScores={true}
        formatScore={(score) => score.toFixed(2)}
        getMedalColor={() => 'bg-gray-100 text-gray-900'}
        getMedalEmoji={(rank) => String(rank)}
      />
    )

    const formulas = juryDisplaySpy.mock.calls.map(call => call[0]?.formula)
    expect(formulas).toContain('1*x')
    expect(formulas).toContain('(10 + A) - B')
  })
})
