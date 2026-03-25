/**
 * Tests for useEventImportWizard hook
 *
 * Covers:
 *  - Initial state (starts at fileDetails step)
 *  - canGoNext: false without file or eventName; true with both
 *  - goNext: advances to 'importing' and triggers file upload
 *  - Auto-advance: 'importing' → 'results' when importState becomes 'completed'
 *  - Auto-advance: 'importing' → 'results' when importState becomes 'error'
 *  - resetAndClose: invalidates cache & calls onImportComplete on success
 *  - resetAndClose: does NOT invalidate cache on error
 *  - retry: resets state and goes back to fileDetails
 *  - handleAcceptHint: POSTs to /api/events/accept-discipline-suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { useEventImportWizard } from '@/pages/Events/components/EventImportWizard/useEventImportWizard';
import type { Venue } from '@/pages/Events/Events.types';
import type { DisciplineHint } from '@/pages/Events/Events.types';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: unknown) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return key;
    },
  }),
}));

vi.mock('@/utils/debug', () => ({
  debugLog: vi.fn(),
}));

vi.mock('@/utils/api', () => ({
  invalidateCache: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const venue: Venue = {
  int_wettkampforteid: 1,
  var_name: 'Sporthalle',
  var_ort: 'Musterstadt',
};

const baseProps = {
  isOpen: false,
  venues: [venue],
  onImportComplete: vi.fn(),
  onClose: vi.fn(),
};

const successImportResponse = {
  success: true,
  message: 'OK',
  createdEvent: { id: 99, name: 'Test Event', startDate: '2025-01-01', endDate: '2025-01-02' },
  insertionResults: {
    clubs: { inserted: 2, updated: 0, errors: 0 },
    participants: { inserted: 10, updated: 0, errors: 0 },
    competitions: { inserted: 3, updated: 0, errors: 0 },
    devices: { inserted: 5, updated: 0, errors: 0 },
    teams: { inserted: 0, members: 0, errors: 0 },
  },
  warnings: [],
  hints: [],
  extractedData: {
    clubs: [], competitions: [], participants: [], devices: [], teams: [],
    summary: {
      clubsCount: 2,
      competitionsCount: 3,
      participantsCount: 10,
      devicesCount: 5,
      teamsCount: 0,
    },
  },
};

const makeFile = (name = 'test.xml') =>
  new File(['<data>test</data>'], name, { type: 'text/xml' });

// ── Initial state ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – initial state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts at fileDetails step', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.step).toBe('fileDetails');
  });

  it('importState is idle initially', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.importState).toBe('idle');
  });

  it('no file selected initially', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.importFile).toBeNull();
  });
});

// ── Reset on open ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – reset on open', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets to fileDetails and clears import state on re-open', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useEventImportWizard({ ...baseProps, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.step).toBe('fileDetails');
    expect(result.current.importFile).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });
});

// ── canGoNext ─────────────────────────────────────────────────────────────────

describe('useEventImportWizard – canGoNext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('false when no file selected', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() =>
      result.current.setImportEventData(d => ({ ...d, eventName: 'Test Event' })),
    );
    expect(result.current.canGoNext).toBe(false);
  });

  it('false when file selected but no eventName', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: '   ' }));
    });
    expect(result.current.canGoNext).toBe(false);
  });

  it('true when file selected AND eventName is filled', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'Test Event' }));
    });
    expect(result.current.canGoNext).toBe(true);
  });
});

// ── goNext ────────────────────────────────────────────────────────────────────

describe('useEventImportWizard – goNext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('advances to importing step when canGoNext is true', async () => {
    // Intercept the fetch call so it stays in uploading state
    server.use(
      http.post('/api/events/import-gymnet', async () => {
        await new Promise(() => {}); // never resolves
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'Test' }));
    });

    act(() => result.current.goNext());

    expect(result.current.step).toBe('importing');
  });

  it('does nothing when canGoNext is false (no file)', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => result.current.goNext());
    expect(result.current.step).toBe('fileDetails');
  });
});

// ── Auto-advance to results ───────────────────────────────────────────────────

describe('useEventImportWizard – auto-advance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('auto-advances from importing to results on successful import', async () => {
    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json(successImportResponse),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });

    await act(async () => {
      result.current.goNext();
      // Wait for fetch + state updates
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');
    expect(result.current.importState).toBe('completed');
  });

  it('auto-advances to results on import error', async () => {
    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json({ success: false, message: 'Parse error' }, { status: 400 }),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });

    await act(async () => {
      result.current.goNext();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');
    expect(result.current.importState).toBe('error');
  });
});

// ── resetAndClose ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – resetAndClose', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls invalidateCache and onImportComplete on successful import', async () => {
    const { invalidateCache } = await import('@/utils/api');
    const onImportComplete = vi.fn();
    const onClose = vi.fn();

    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json(successImportResponse),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({
        ...baseProps,
        isOpen: true,
        onImportComplete,
        onClose,
      }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });

    await act(async () => {
      result.current.goNext();
      await new Promise(r => setTimeout(r, 50));
    });

    act(() => result.current.resetAndClose());

    expect(invalidateCache).toHaveBeenCalledWith('/events');
    expect(onImportComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call invalidateCache or onImportComplete on error import', async () => {
    const { invalidateCache } = await import('@/utils/api');
    const onImportComplete = vi.fn();
    const onClose = vi.fn();

    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json({ success: false, message: 'error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({
        ...baseProps,
        isOpen: true,
        onImportComplete,
        onClose,
      }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });

    await act(async () => {
      result.current.goNext();
      await new Promise(r => setTimeout(r, 50));
    });

    act(() => result.current.resetAndClose());

    expect(invalidateCache).not.toHaveBeenCalled();
    expect(onImportComplete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

// ── retry ─────────────────────────────────────────────────────────────────────

describe('useEventImportWizard – retry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets importState to idle and goes back to fileDetails', async () => {
    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json({ success: false, message: 'error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    act(() => {
      result.current.setImportFile(makeFile());
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });

    await act(async () => {
      result.current.goNext();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');

    act(() => result.current.retry());

    expect(result.current.step).toBe('fileDetails');
    expect(result.current.importState).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });
});

// ── handleAcceptHint ──────────────────────────────────────────────────────────

describe('useEventImportWizard – handleAcceptHint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs to /api/events/accept-discipline-suggestions', async () => {
    let captured: unknown = null;
    server.use(
      http.post('/api/events/accept-discipline-suggestions', async ({ request }) => {
        captured = await request.json();
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    const hint: DisciplineHint = {
      competition: 'AK 10',
      competitionId: 42,
      type: 'suggestion',
      disciplines: [{ id: 1, name: 'Boden' }],
      message: '',
    };

    await act(async () => {
      await result.current.handleAcceptHint(hint);
    });

    expect(captured).toMatchObject({
      competitionId: 42,
      disciplines: [{ id: 1, name: 'Boden' }],
    });
    expect(result.current.acceptedHints.has(42)).toBe(true);
  });

  it('does nothing for hints with no disciplines', async () => {
    let called = false;
    server.use(
      http.post('/api/events/accept-discipline-suggestions', () => {
        called = true;
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    const hint: DisciplineHint = {
      competition: 'AK 10',
      competitionId: 42,
      type: 'suggestion',
      disciplines: [], // empty
      message: '',
    };

    await act(async () => {
      await result.current.handleAcceptHint(hint);
    });

    expect(called).toBe(false);
  });

  it('does nothing for already-accepted hints', async () => {
    let callCount = 0;
    server.use(
      http.post('/api/events/accept-discipline-suggestions', () => {
        callCount++;
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    const hint: DisciplineHint = {
      competition: 'AK 10',
      competitionId: 99,
      type: 'suggestion',
      disciplines: [{ id: 5, name: 'Reck' }],
      message: '',
    };

    // First call — should go through
    await act(async () => { await result.current.handleAcceptHint(hint); });
    expect(callCount).toBe(1);

    // Second call on same hint — should be skipped (already accepted)
    await act(async () => { await result.current.handleAcceptHint(hint); });
    expect(callCount).toBe(1);
  });
});
