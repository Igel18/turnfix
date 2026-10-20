import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleAssignmentTable } from '../components/ScheduleAssignmentTable'
import type { MatrixData } from '../TimePlanning.types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key === 'timePlanning.round' ? 'Durchgang' : key,
  }),
}))

const matrixData = {
  disciplines: [{ id: 1, name: 'Boden', shortName: 'BO' }],
  availableDisciplines: [],
  assignments: [],
  squads: ['Riege A', 'Riege B'],
  sessionDisciplineIds: { '1': [1], '2': [1] },
  maxRound: 3,
} as unknown as MatrixData

describe('ScheduleAssignmentTable grouped layout', () => {
  it('renders each Durchgang in its own rounded table block with independent round rows', () => {
    render(
      <ScheduleAssignmentTable
        matrixData={matrixData}
        localColumns={[{ kind: 'discipline', id: 1, name: 'Boden', shortName: 'BO' }]}
        activeColumns={[{ kind: 'discipline', id: 1, name: 'Boden', shortName: 'BO' }]}
        roundRows={[
          { round: 1, roundTime: '09:00', sessionInfo: { session: 1, startTime: '09:00' } },
          { round: 2, roundTime: '09:20', sessionInfo: { session: 1, startTime: '09:00' } },
          { round: 3, roundTime: '10:00', sessionInfo: { session: 2, startTime: '10:00' } },
        ]}
        selectedSession={null}
        sessionGroups={[
          { session: 1, competitions: [], startTime: '09:00', startDate: null, squads: [{ name: 'Riege A' } as any] },
          { session: 2, competitions: [], startTime: '10:00', startDate: null, squads: [{ name: 'Riege B' } as any] },
        ]}
        squadNames={['Riege A', 'Riege B']}
        dragColKey={null}
        dragOverColKey={null}
        onColumnDragStart={vi.fn()}
        onColumnDragOver={vi.fn()}
        onColumnDrop={vi.fn()}
        onColumnDragEnd={vi.fn()}
        getLaneLabel={() => null}
        isDisciplineRemovable={() => false}
        onRemoveDiscipline={vi.fn()}
        onRemovePause={vi.fn()}
        savingCell={null}
        conflictCells={new Set()}
        getCellValue={() => ''}
        onCellChange={vi.fn()}
      />,
    )

    const groups = screen.getAllByTestId('schedule-session-group')
    expect(groups).toHaveLength(2)
    expect(groups[0].className).toContain('rounded-lg')
    expect(within(groups[0]).getByRole('heading', { name: 'Durchgang 1' })).toBeInTheDocument()
    expect(within(groups[0]).getByText('09:00')).toBeInTheDocument()
    expect(within(groups[0]).getByText('09:20')).toBeInTheDocument()
    expect(within(groups[1]).getByRole('heading', { name: 'Durchgang 2' })).toBeInTheDocument()
    expect(within(groups[1]).getByText('10:00')).toBeInTheDocument()
    expect(groups[0].querySelector('table')).not.toBe(groups[1].querySelector('table'))
  })
})