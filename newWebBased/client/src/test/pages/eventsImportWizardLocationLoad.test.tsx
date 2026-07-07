import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Events from '@/pages/Events';

const openImportModalMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/pages/Events/hooks/useEventsData', () => ({
  useEventsData: () => ({
    events: [],
    venues: [],
    isLoading: false,
    errorMessage: '',
    editingEvent: null,
    isModalOpen: false,
    isImportModalOpen: false,
    openEditModal: vi.fn(),
    openCreateModal: vi.fn(),
    openImportModal: openImportModalMock,
    closeModal: vi.fn(),
    closeImportModal: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    fetchEvents: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    showFilters: false,
    toggleFilters: vi.fn(),
    getFilterConfig: () => [],
    handleClearAllFilters: vi.fn(),
    sortKey: 'var_eventname',
    sortDirection: 'asc',
    handleSort: vi.fn(),
    sortData: (data: unknown[]) => data,
    getSortValue: () => '',
  }),
}));

vi.mock('@/components/DatabaseManagementTemplate', () => ({
  DatabaseManagementTemplate: ({ additionalContent }: { additionalContent?: React.ReactNode }) => (
    <div>
      <div>mock-template</div>
      {additionalContent}
    </div>
  ),
}));

vi.mock('@/components/SortableTableHeader', () => ({
  SortableTableHeader: () => <th>mock-sort</th>,
}));

vi.mock('@/components/UnifiedModal', () => ({
  UnifiedConfirmModal: () => null,
}));

vi.mock('@/pages/Events/components/EventFormModal', () => ({
  default: () => null,
}));

vi.mock('@/pages/Events/components/EventImportWizard', () => ({
  default: () => null,
}));

vi.mock('@/pages/Events/components/EventCard', () => ({
  default: () => null,
}));

vi.mock('@/pages/Events/components/EventTableRow', () => ({
  default: () => null,
}));

describe('Events import wizard wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls openImportModal when clicking the import wizard button', async () => {
    const user = userEvent.setup();

    render(<Events />);

    await user.click(screen.getByRole('button', { name: 'events.importWizard.openButton' }));

    expect(openImportModalMock).toHaveBeenCalledTimes(1);
  });
});
