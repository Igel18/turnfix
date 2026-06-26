import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Results from '@/pages/Results';

const exportResultsGymNetXMLMock = vi.fn().mockResolvedValue(undefined);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('eventId=1')]
}));

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ selectedEvent: { int_eventid: 1 } })
}));

vi.mock('@/contexts/CertificateLayoutContext', () => ({
  useCertificateLayout: () => ({ selectedLayout: null, setSelectedLayout: vi.fn() })
}));

vi.mock('@/hooks', () => ({
  useFilterPanel: () => ({ showFilters: false, toggleFilters: vi.fn() })
}));

vi.mock('@/utils/socket', () => ({
  default: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  })
}));

vi.mock('@/components/LiveUpdateIndicator', () => ({
  default: () => <div data-testid="live-update-indicator" />
}));

vi.mock('@/components/templates/EventManagementTemplate', () => ({
  EventManagementTemplate: ({ customActions, children }: any) => (
    <div>
      <div data-testid="custom-actions">{customActions}</div>
      {children()}
    </div>
  )
}));

vi.mock('@/pages/Results/hooks', () => ({
  useResultsData: () => ({
    ranking: [],
    competitionGroups: [],
    competitions: [],
    disciplines: [],
    disciplineFormulas: {},
    selectedCompetitionDisciplineInfo: [],
    eventName: 'Test Event',
    isLoading: false,
    fetchCompetitions: vi.fn().mockResolvedValue([]),
    fetchEventRanking: vi.fn()
  }),
  useResultsHelpers: () => ({
    formatScore: (score: number) => score.toFixed(3),
    getMedalColor: vi.fn(),
    getMedalEmoji: vi.fn()
  }),
  useCertificates: () => ({
    certificateLayouts: [],
    isPrintingCertificates: false,
    fetchCertificateLayouts: vi.fn(),
    generateCertificates: vi.fn().mockResolvedValue(undefined),
    PAPER_FORMATS: []
  }),
  useExport: () => ({
    exportResultsCSV: vi.fn(),
    exportResultsPDF: vi.fn(),
    exportResultsGymNetXML: exportResultsGymNetXMLMock
  })
}));

vi.mock('@/pages/Results/components', () => ({
  ResultsTable: () => <div data-testid="results-table" />,
  ResultsFilters: () => <div data-testid="results-filters" />,
  CertificateDialog: () => null
}));

describe('Results XML export action', () => {
  it('renders XML export button and triggers GymNet XML export handler', () => {
    render(<Results />);

    const xmlButton = screen.getByRole('button', { name: 'XML Export' });
    expect(xmlButton).toBeInTheDocument();

    fireEvent.click(xmlButton);
    expect(exportResultsGymNetXMLMock).toHaveBeenCalledTimes(1);
  });
});
