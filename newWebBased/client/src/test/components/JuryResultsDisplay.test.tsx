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

  it('keeps finalScore for variable formulas when jury fields do not map to x', () => {
    render(
      <JuryResultsDisplay
        formula="1*x"
        finalScore={10}
        juryResults={[
          {
            id: 1,
            disciplineFieldId: 19,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Schwierigkeit',
            fieldShortName: 'Schwierigkeit',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 2,
            disciplineFieldId: 303,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'Wertung',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 3,
            disciplineFieldId: 20,
            performance: 1,
            attempt: 1,
            kp: 0,
            fieldName: 'Abzüge',
            fieldShortName: 'Abzüge',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 4,
            disciplineFieldId: 304,
            performance: 10,
            attempt: 1,
            kp: 0,
            fieldName: 'Endwert',
            fieldShortName: 'Endwert',
            isFinalScore: true,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.getAllByText('10.00').length).toBeGreaterThan(0)
  })

  it('anonymized regression: Boden w with 1*x keeps displayed 10.00 from Endwert case', () => {
    render(
      <JuryResultsDisplay
        formula="1*x"
        finalScore={10}
        juryResults={[
          {
            id: 11,
            disciplineFieldId: 101,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Schwierigkeit',
            fieldShortName: 'Schwierigkeit',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 12,
            disciplineFieldId: 102,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'Wertung',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 13,
            disciplineFieldId: 103,
            performance: 1,
            attempt: 1,
            kp: 0,
            fieldName: 'Abzüge',
            fieldShortName: 'Abzüge',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 14,
            disciplineFieldId: 104,
            performance: 10,
            attempt: 1,
            kp: 0,
            fieldName: 'Endwert',
            fieldShortName: 'Endwert',
            isFinalScore: true,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.getAllByText('10.00').length).toBeGreaterThan(0)
  })

  it('TDD regression: shows x-field value for 1*x when x is missing but finalScore exists', () => {
    render(
      <JuryResultsDisplay
        formula="1*x"
        finalScore={10}
        juryResults={[
          {
            id: 21,
            disciplineFieldId: 201,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Schwierigkeit',
            fieldShortName: 'Schwierigkeit',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 22,
            disciplineFieldId: 202,
            performance: null,
            attempt: 1,
            kp: 0,
            fieldName: 'Wertung',
            fieldShortName: 'Wertung',
            isFinalScore: false,
            isStartingScore: false,
          },
          {
            id: 23,
            disciplineFieldId: 203,
            performance: 10,
            attempt: 1,
            kp: 0,
            fieldName: 'Endwert',
            fieldShortName: 'Endwert',
            isFinalScore: true,
            isStartingScore: false,
          },
        ]}
      />
    )

    expect(screen.getByText(/\(x\)\s*x/i)).toBeInTheDocument()
    expect(screen.getAllByText('10.00').length).toBeGreaterThanOrEqual(2)
  })
})
