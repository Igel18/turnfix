import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { ScoreInputCell } from '../../pages/ScoreCapture/components/ScoreInputCell'

vi.mock('../../components/FormulaInput', () => ({
  FormulaInput: () => null,
}))

vi.mock('@turnfix/shared', () => ({
  resolveScoringInputMode: () => 'linkedFormula',
  BuiltInFormulaInput: () => null,
}))

describe('ScoreInputCell jury-results loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates API calls for same event+discipline across multiple participants', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        results: [
          { participantId: 101, disciplineFieldId: 1, performance: 9.5 },
          { participantId: 102, disciplineFieldId: 1, performance: 8.7 },
        ],
        pagination: {
          hasMore: false,
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const baseProps = {
      eventId: '1',
      discipline: {
        int_disziplinid: 104,
        var_name: 'Boden',
        int_berechnung: 2,
      } as any,
      disciplineFields: [
        { id: 1, disciplineId: 104, enabled: true, name: 'A' },
      ] as any,
      scoreValue: '',
      onScoreChange: vi.fn(),
      onSave: vi.fn().mockResolvedValue(null),
      onFieldSave: vi.fn().mockResolvedValue(undefined),
      normalizeScoreInput: (v: string) => v,
      getScorePlaceholder: () => '0.00',
      validation: { isValid: true },
    }

    render(
      <>
        <ScoreInputCell
          {...baseProps}
          participantId={1}
          wertungenId={101}
        />
        <ScoreInputCell
          {...baseProps}
          participantId={2}
          wertungenId={102}
        />
      </>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/jury-results?eventId=1&disciplineId=104&limit=500&offset=0')
    })
  })
})
