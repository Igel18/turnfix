import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScoreInputCell } from '@/pages/ScoreCapture/components/ScoreInputCell'

vi.mock('@turnfix/shared', () => ({
  resolveScoringInputMode: vi.fn(() => 'linkedFormula'),
  BuiltInFormulaInput: () => null,
}))

vi.mock('@/components/FormulaInput', () => ({
  FormulaInput: ({ onFieldChange }: any) => (
    <button
      type="button"
      data-testid="mock-field-change"
      onClick={() => onFieldChange(101, '4,50')}
    >
      Change Field
    </button>
  )
}))

describe('ScoreInputCell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/api/jury-results?')) {
        return {
          ok: true,
          json: async () => ({ results: [] })
        } as Response
      }
      return {
        ok: true,
        json: async () => ({})
      } as Response
    }))
  })

  it('TDD: forwards linked-formula field input value to onFieldSave for persistence', async () => {
    const onFieldSave = vi.fn(async () => {})

    render(
      <ScoreInputCell
        participantId={3}
        discipline={{
          int_disziplinid: 1,
          var_name: 'Stufenbarren',
          int_berechnung: 2,
          var_formel: '(10 + A) - B',
        } as any}
        disciplineFields={[
          {
            id: 101,
            disciplineId: 1,
            name: 'Wertung',
            enabled: true,
            sortOrder: 1,
            isFinalScore: false,
            isStartingScore: false,
          } as any,
        ]}
        scoreValue=""
        wertungenId={3}
        onScoreChange={vi.fn()}
        onSave={vi.fn(async () => {})}
        onFieldSave={onFieldSave}
        normalizeScoreInput={(value: string) => value}
        getScorePlaceholder={() => '0.00'}
        validation={{ isValid: true }}
        showJuryScores={true}
      />
    )

    const fieldChangeButton = await screen.findByTestId('mock-field-change')
    fireEvent.click(fieldChangeButton)

    await waitFor(() => {
      expect(onFieldSave).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ id: 101, name: 'Wertung' }),
        '4,50'
      )
    })
  })
})
