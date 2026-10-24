import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Results from '@/pages/Results';

const { useExportSpy } = vi.hoisted(() => ({ useExportSpy: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react-router-dom', () => ({ useSearchParams: () => [new URLSearchParams('eventId=1')] }));
vi.mock('@/contexts/EventContext', () => ({ useEvent: () => ({ selectedEvent: { int_eventid: 1 } }) }));
vi.mock('@/contexts/CertificateLayoutContext', () => ({
  useCertificateLayout: () => ({ selectedLayout: null, setSelectedLayout: vi.fn() })
}));
vi.mock('@/hooks', () => ({ useFilterPanel: () => ({ showFilters: true, toggleFilters: vi.fn() }) }));
vi.mock('@/utils/socket', () => ({ default: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }) }));
vi.mock('@/components/LiveUpdateIndicator', () => ({ default: () => null }));
vi.mock('@/components/templates/EventManagementTemplate', () => ({
  EventManagementTemplate: ({ filterSection, children }: any) => (
    <div>
      {filterSection}
      {children()}
    </div>
  )
}));

const person = (id: number, name: string, gender: string, competitionId: number) => ({
  id, name, club: 'TV', gender, startNumber: id, competitionId, scores: {}, totalScore: 0, rank: 1
});

vi.mock('@/pages/Results/hooks', () => ({
  useResultsData: () => ({
    ranking: [],
    competitionGroups: [
      { competitionId: 1, competitionName: 'C1', disciplines: [], disciplineInfo: [], participants: [person(1, 'Anna', 'weiblich', 1), person(2, 'Max', 'männlich', 1)] },
      { competitionId: 2, competitionName: 'C2', disciplines: [], disciplineInfo: [], participants: [person(3, 'Max Zwei', 'männlich', 2)] }
    ],
    competitions: [],
    disciplines: [],
    disciplineFormulas: {},
    selectedCompetitionDisciplineInfo: [],
    eventName: 'Test Event',
    isLoading: false,
    fetchCompetitions: vi.fn().mockResolvedValue([]),
    fetchEventRanking: vi.fn()
  }),
  useResultsHelpers: () => ({ formatScore: String, getMedalColor: vi.fn(), getMedalEmoji: vi.fn() }),
  useCertificates: () => ({
    certificateLayouts: [], isPrintingCertificates: false, fetchCertificateLayouts: vi.fn(),
    generateCertificates: vi.fn(), PAPER_FORMATS: []
  }),
  useExport: (props: any) => {
    useExportSpy(props);
    return { exportResultsCSV: vi.fn(), exportResultsPDF: vi.fn(), exportResultsGymNetXML: vi.fn() };
  }
}));

vi.mock('@/pages/Results/components', () => ({
  ResultsTable: () => null,
  ResultsFilters: ({ onSearchChange, onGenderChange }: any) => (
    <div>
      <button onClick={() => onSearchChange('anna')}>search</button>
      <button onClick={() => onGenderChange('männlich')}>gender</button>
    </div>
  ),
  CertificateDialog: () => null,
  ResultsGymNetExportWizard: () => null
}));

const lastGroups = () => useExportSpy.mock.calls.at(-1)![0].competitionGroups;

describe('Results export respects active filters', () => {
  it('passes only filtered groups/participants to the export', () => {
    render(<Results />);
    expect(lastGroups().map((g: any) => g.competitionId)).toEqual([1, 2]);

    fireEvent.click(screen.getByText('search'));
    expect(lastGroups().map((g: any) => g.competitionId)).toEqual([1]);
    expect(lastGroups()[0].participants.map((p: any) => p.name)).toEqual(['Anna']);
  });

  it('drops competitions without matching participants for the gender filter', () => {
    render(<Results />);
    fireEvent.click(screen.getByText('gender'));
    expect(lastGroups().map((g: any) => g.competitionId)).toEqual([1, 2]);
    expect(lastGroups()[0].participants.map((p: any) => p.name)).toEqual(['Max']);
  });
});
