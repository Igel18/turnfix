import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScoreTable } from '../../pages/ScoreCapture/components/ScoreTable'

vi.mock('../../pages/ScoreCapture/components/ScoreInputCell', () => ({
  ScoreInputCell: () => <div data-testid="score-cell">cell</div>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue || _key,
  }),
}))

function makeParticipants(count: number) {
  return Array.from({ length: count }, (_, idx) => ({
    id: idx + 1,
    firstname: `Vorname${idx + 1}`,
    lastname: `Nachname${idx + 1}`,
    club: 'TSV Test',
    age: 12,
    gender: 'männlich',
    startNumber: idx + 100,
    assignedCompetitions: [],
  }))
}

const disciplines = [
  {
    int_disziplinid: 1,
    var_name: 'Boden',
    var_shortname: 'BOD',
    int_berechnung: 2,
  },
]

describe('ScoreTable render load reduction', () => {
  it('renders participants progressively with load-more button', async () => {
    const participants = makeParticipants(100)

    render(
      <ScoreTable
        eventId="1"
        filteredParticipants={participants as any}
        displayDisciplines={disciplines as any}
        disciplineFields={[] as any}
        scoreMatrix={{}}
        existingScores={[]}
        pendingEndwerts={{}}
        setPendingEndwerts={vi.fn()}
        setExistingScores={vi.fn()}
        getDisciplineFields={() => [] as any}
        getScoreValidation={() => ({ isValid: true })}
        getParticipantCompetitions={() => []}
        handleScoreChange={vi.fn()}
        handleFieldScoreChange={vi.fn()}
        saveScore={vi.fn().mockResolvedValue(null)}
        saveFieldScore={vi.fn().mockResolvedValue(undefined)}
        parseFormulaDisplay={vi.fn()}
        normalizeScoreInput={(v: string) => v}
        getScorePlaceholder={() => '0.00'}
        setScoreMatrix={vi.fn()}
      />
    )

    expect(screen.getByText('Vorname1 Nachname1')).toBeInTheDocument()
    expect(screen.getByText('Vorname40 Nachname40')).toBeInTheDocument()
    expect(screen.queryByText('Vorname41 Nachname41')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))

    expect(screen.getByText('Vorname41 Nachname41')).toBeInTheDocument()
    expect(screen.getByText('Vorname80 Nachname80')).toBeInTheDocument()
    expect(screen.queryByText('Vorname81 Nachname81')).not.toBeInTheDocument()
  })
})
