/**
 * Tests for useEventImportWizard hook
 *
 * Covers:
 *  - Initial state (starts at eventDetails step)
 *  - canGoNextEventDetails / canGoNextFileSelection
 *  - goNextFromEventDetails / goNextFromFileSelection
 *  - Auto-advance: importing → results on completed/error
 *  - resetAndClose: calls onImportComplete on success
 *  - resetAndClose: does NOT call onImportComplete on error
 *  - retry: resets state and goes back to fileSelection
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
    summary: { clubsCount: 2, competitionsCount: 3, participantsCount: 10, devicesCount: 5, teamsCount: 0 },
  },
};

const makeFile = (name = 'test.xml') =>
  new File(['<data>test</data>'], name, { type: 'text/xml' });

/** Helper: advance hook from eventDetails → fileSelection */
function setEventName(result: ReturnType<typeof renderHook<ReturnType<typeof useEventImportWizard>, unknown>>['result'], name = 'Test Event') {
  act(() => {
    result.current.setImportEventData(d => ({ ...d, eventName: name }));
  });
  act(() => {
    result.current.goNextFromEventDetails();
  });
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – initial state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts at eventDetails step', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.step).toBe('eventDetails');
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
    expect(result.current.importFiles).toHaveLength(0);
  });
});

// ── Reset on open ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – reset on open', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets to eventDetails and clears import state on re-open', async () => {
    const { result, rerender } = renderHook(
      (props: { isOpen: boolean }) =>
        useEventImportWizard({ ...baseProps, ...props }),
      { initialProps: { isOpen: false } },
    );
    rerender({ isOpen: true });
    await act(async () => {});
    expect(result.current.step).toBe('eventDetails');
    expect(result.current.importFiles).toHaveLength(0);
    expect(result.current.errorMessage).toBeNull();
  });
});

// ── canGoNext (step-specific) ─────────────────────────────────────────────────

describe('useEventImportWizard – canGoNextEventDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('false when eventName is empty', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.canGoNextEventDetails).toBe(false);
  });

  it('false when eventName is whitespace only', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportEventData(d => ({ ...d, eventName: '   ' }));
    });
    expect(result.current.canGoNextEventDetails).toBe(false);
  });

  it('true when eventName is filled', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportEventData(d => ({ ...d, eventName: 'WK 2025' }));
    });
    expect(result.current.canGoNextEventDetails).toBe(true);
  });
});

describe('useEventImportWizard – canGoNextFileSelection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('false when no file selected', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    expect(result.current.canGoNextFileSelection).toBe(false);
  });

  it('true when file is selected', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportFiles([makeFile()]);
    });
    expect(result.current.canGoNextFileSelection).toBe(true);
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('useEventImportWizard – navigation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('goNextFromEventDetails advances to fileSelection when name is set', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.setImportEventData(d => ({ ...d, eventName: 'Test' }));
    });
    act(() => {
      result.current.goNextFromEventDetails();
    });
    expect(result.current.step).toBe('fileSelection');
  });

  it('goNextFromEventDetails does nothing when name is empty', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    act(() => {
      result.current.goNextFromEventDetails();
    });
    expect(result.current.step).toBe('eventDetails');
  });

  it('goNextFromFileSelection starts import when file is set', async () => {
    server.use(
      http.post('/api/events/import-gymnet', async () => {
        await new Promise(() => {}); // never resolves
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    setEventName(result);

    act(() => {
      result.current.setImportFiles([makeFile()]);
    });
    act(() => {
      result.current.goNextFromFileSelection();
    });

    expect(result.current.step).toBe('importing');
  });

  it('goBackFromFileSelection returns to eventDetails', () => {
    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );
    setEventName(result);
    expect(result.current.step).toBe('fileSelection');
    act(() => {
      result.current.goBackFromFileSelection();
    });
    expect(result.current.step).toBe('eventDetails');
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

    setEventName(result);

    act(() => {
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');
    expect(result.current.importState).toBe('completed');
  });

  it('sends selected scoringMode in import form data', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(successImportResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response,
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    setEventName(result);

    act(() => {
      result.current.setImportEventData(d => ({ ...d, scoringMode: 'final_only' }));
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(fetchSpy).toHaveBeenCalled();
    const [, init] = fetchSpy.mock.calls[0] || [];
    const body = init?.body as FormData;
    expect(body.get('scoringMode')).toBe('final_only');
    fetchSpy.mockRestore();
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

    setEventName(result);

    act(() => {
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');
    expect(result.current.importState).toBe('error');
  });
});

// ── resetAndClose ─────────────────────────────────────────────────────────────

describe('useEventImportWizard – resetAndClose', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onImportComplete and onClose on successful import', async () => {
    const onImportComplete = vi.fn();
    const onClose = vi.fn();

    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json(successImportResponse),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true, onImportComplete, onClose }),
    );

    setEventName(result);
    act(() => {
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    act(() => result.current.resetAndClose());

    expect(onImportComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call onImportComplete on error import', async () => {
    const onImportComplete = vi.fn();
    const onClose = vi.fn();

    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json({ success: false, message: 'error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true, onImportComplete, onClose }),
    );

    setEventName(result);
    act(() => {
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    act(() => result.current.resetAndClose());

    expect(onImportComplete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

// ── retry ─────────────────────────────────────────────────────────────────────

describe('useEventImportWizard – retry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resets importState to idle and goes back to fileSelection', async () => {
    server.use(
      http.post('/api/events/import-gymnet', () =>
        HttpResponse.json({ success: false, message: 'error' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    setEventName(result);
    act(() => {
      result.current.setImportFiles([makeFile()]);
    });

    await act(async () => {
      result.current.goNextFromFileSelection();
      await new Promise(r => setTimeout(r, 50));
    });

    expect(result.current.step).toBe('results');

    act(() => result.current.retry());

    expect(result.current.step).toBe('fileSelection');
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
      disciplines: [],
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

    await act(async () => { await result.current.handleAcceptHint(hint); });
    expect(callCount).toBe(1);

    await act(async () => { await result.current.handleAcceptHint(hint); });
    expect(callCount).toBe(1);
  });

  it('accumulates multiple accepted hints instead of overwriting earlier ones', async () => {
    let callCount = 0;
    server.use(
      http.post('/api/events/accept-discipline-suggestions', async () => {
        callCount++;
        return HttpResponse.json({ success: true });
      }),
    );

    const { result } = renderHook(() =>
      useEventImportWizard({ ...baseProps, isOpen: true }),
    );

    const firstHint: DisciplineHint = {
      competition: 'AK 10',
      competitionId: 101,
      type: 'suggestion',
      disciplines: [{ id: 5, name: 'Reck' }],
      message: '',
    };

    const secondHint: DisciplineHint = {
      competition: 'AK 11',
      competitionId: 102,
      type: 'suggestion',
      disciplines: [{ id: 6, name: 'Sprung' }],
      message: '',
    };

    await act(async () => {
      await result.current.handleAcceptHint(firstHint);
      await result.current.handleAcceptHint(secondHint);
    });

    expect(callCount).toBe(2);
    expect(result.current.acceptedHints.has(101)).toBe(true);
    expect(result.current.acceptedHints.has(102)).toBe(true);
  });
});
