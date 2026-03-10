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

  /**
   * BUG REGRESSION TEST: participantId vs wertungenId mismatch
   * 
   * Root cause: ScoreInputCell passed wertungenId (score record ID) instead of
   * participantId (real int_teilnehmerid) to onFieldSave.
   * The /save-field-score endpoint expects participantId and derives wertungenId itself.
   * 
   * Example: Emilia Bartos has participantId=5, wertungenId=3.
   * With the bug, the code sent participantId=3 → server looked up int_teilnehmerid=3
   * → found "Ida Von Preislinger" → saved under wrong person's wertungenId.
   * 
   * This test uses DISTINCT values for participantId (5) and wertungenId (3)
   * to ensure the correct ID is forwarded.
   */
  it('BUG: onFieldSave must receive participantId, NOT wertungenId', async () => {
    const onFieldSave = vi.fn(async () => {})

    // CRITICAL: participantId (5) and wertungenId (3) are DIFFERENT
    // If the code accidentally passes wertungenId, onFieldSave receives 3 instead of 5
    const PARTICIPANT_ID = 5  // Emilia Bartos - real int_teilnehmerid
    const WERTUNGEN_ID = 3   // Score record ID (different from participantId!)

    render(
      <ScoreInputCell
        participantId={PARTICIPANT_ID}
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
        wertungenId={WERTUNGEN_ID}
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
      // First argument MUST be participantId (5), NOT wertungenId (3)
      expect(onFieldSave).toHaveBeenCalledWith(
        PARTICIPANT_ID,  // 5 - the real participant ID
        expect.objectContaining({ id: 101, name: 'Wertung' }),
        '4,50'
      )
    })

    // Extra explicit check: ensure wertungenId was NOT passed as first arg
    const firstCallFirstArg = onFieldSave.mock.calls[0][0]
    expect(firstCallFirstArg).toBe(PARTICIPANT_ID)
    expect(firstCallFirstArg).not.toBe(WERTUNGEN_ID)
  })
})
