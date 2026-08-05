import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventImportWizard from '@/pages/Events/components/EventImportWizard';

const setImportEventDataMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/WizardModal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/pages/Events/utils/importErrorHints', () => ({
  isDatabaseUnavailableImportError: () => false,
}));

vi.mock('@/pages/Events/components/EventImportWizard/useEventImportWizard', () => ({
  useEventImportWizard: () => ({
    step: 'eventDetails',
    importState: 'idle',
    resetAndClose: vi.fn(),
    title: 'events.importWizard.title',
    wizardSteps: [
      { key: 'eventDetails', label: 'events.importWizard.steps.eventDetails' },
      { key: 'fileSelection', label: 'events.importWizard.steps.fileSelection' },
      { key: 'importing', label: 'events.importWizard.steps.importing' },
      { key: 'results', label: 'events.importWizard.steps.results' },
    ],
    importEventData: {
      eventName: '',
      startDate: '',
      endDate: '',
      locationId: '',
      description: '',
      scoringMode: 'formula_based',
    },
    setImportEventData: setImportEventDataMock,
    errorMessage: null,
    canGoNextEventDetails: false,
    goNextFromEventDetails: vi.fn(),
  }),
}));

describe('EventImportWizard location selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders location options and updates selected venue id', async () => {
    const user = userEvent.setup();

    render(
      <EventImportWizard
        isOpen={true}
        onClose={vi.fn()}
        onImportComplete={vi.fn()}
        venues={[
          { int_wettkampforteid: 7, var_name: 'Turnhalle Nord', var_ort: 'Berlin' },
          { int_wettkampforteid: 11, var_name: 'Sportzentrum Süd', var_ort: 'Leipzig' },
        ]}
      />,
    );

    const berlinOption = screen.getByRole('option', { name: 'Turnhalle Nord (Berlin)' });
    const leipzigOption = screen.getByRole('option', { name: 'Sportzentrum Süd (Leipzig)' });

    expect(berlinOption).toBeInTheDocument();
    expect(leipzigOption).toBeInTheDocument();

    const locationSelect = leipzigOption.closest('select') as HTMLSelectElement;

    await user.selectOptions(locationSelect, '11');

    expect(setImportEventDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: '11',
      }),
    );
  });
});
