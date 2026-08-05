import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventsData } from '@/pages/Events/hooks/useEventsData';

const apiGetMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'de' },
  }),
}));

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({
    eventUpdateTrigger: 0,
    selectedEvent: null,
    setSelectedEvent: vi.fn(),
  }),
}));

vi.mock('@/components/SortableTableHeader', () => ({
  useTableSort: () => ({
    sortKey: 'var_eventname',
    sortDirection: 'asc',
    handleSort: vi.fn(),
    sortData: (items: unknown[]) => items,
  }),
}));

vi.mock('@/hooks', () => ({
  useFilterPanel: () => ({
    showFilters: false,
    toggleFilters: vi.fn(),
  }),
}));

vi.mock('@/utils/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock('@/utils/debug', () => ({
  debugLog: vi.fn(),
}));

describe('useEventsData import modal loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens import modal only after venues are loaded', async () => {
    let resolveVenues: ((value: unknown) => void) | null = null;
    const venuesPromise = new Promise((resolve) => {
      resolveVenues = resolve;
    });

    apiGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/events?')) {
        return Promise.resolve({ events: [] });
      }
      if (path.startsWith('/venues?')) {
        return venuesPromise;
      }
      return Promise.resolve({});
    });

    const { result } = renderHook(() => useEventsData());

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(expect.stringMatching(/^\/events\?/));
    });

    expect(result.current.isImportModalOpen).toBe(false);

    act(() => {
      void result.current.openImportModal();
    });

    // Modal should stay closed while venues are still loading.
    expect(result.current.isImportModalOpen).toBe(false);

    act(() => {
      resolveVenues?.({
        venues: [
          {
            int_wettkampforteid: 5,
            var_name: 'Turnhalle Nord',
            var_ort: 'Berlin',
          },
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.isImportModalOpen).toBe(true);
      expect(result.current.venues).toHaveLength(1);
    });
  });
});
