import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JuryResultsDisplay } from '@/pages/Results/components/JuryResultsDisplay'

describe('JuryResultsDisplay', () => {
  it('shows only formula-relevant symbol fields for variable formula 1*x', () => {
    render(
      <JuryResultsDisplay
        formula="1*x"
        finalScore={5}
        juryResults={[
          {
            id: 1,
            disciplineFieldId: 1,
            performance: 2,
            attempt: 1,
            kp: 0,
            fieldName: 'Schwierigkeit',
            fieldShortName: 'A',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 2,
            disciplineFieldId: 2,
            performance: 5,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'x',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 3,
            disciplineFieldId: 3,
            performance: 1,
            attempt: 1,
            kp: 0,
            fieldName: 'Abzüge',
            fieldShortName: 'C',
            isFinalScore: false,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.getByText(/\(x\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/\(A\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(B\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\(C\)/)).not.toBeInTheDocument()
  })

  it('shows missing formula symbols as placeholders for letter formula', () => {
    render(
      <JuryResultsDisplay
        formula="(10 + A) - B"
        finalScore={15}
        juryResults={[
          {
            id: 1,
            disciplineFieldId: 1,
            performance: 5,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'x',
            isFinalScore: false,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.getByText(/\(A\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(B\)/)).toBeInTheDocument()
  })

  it('does not render formula expression text in participant row display', () => {
    render(
      <JuryResultsDisplay
        formula="1*x"
        finalScore={5}
        juryResults={[
          {
            id: 1,
            disciplineFieldId: 1,
            performance: 5,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'x',
            isFinalScore: false,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.queryByText(/1\*/)).not.toBeInTheDocument()
    expect(screen.queryByText(/=/)).not.toBeInTheDocument()
    expect(screen.getAllByText('5.00').length).toBeGreaterThan(0)
  })
})
