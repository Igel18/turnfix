/**
 * Tests for useSquadDisciplineStatus Hook
 * Bug #104: Riegen Status wird nicht angezeigt
 *
 * Covers:
 * - squadStatus derivation from external squadDisciplineStatuses (Bug #104 fix)
 * - handleSquadStatusChange calls PUT /:squad/:discipline/status (Bug #104 fix)
 * - onSquadDisciplineStatusChange callback called after save
 * - Guard conditions (empty squad, empty discipline, null eventId)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../msw/server';
import { useSquadDisciplineStatus } from '@/pages/ScoreCapture/hooks/useSquadDisciplineStatus';

const defaultProps = {
  eventId: '1',
  activeSquad: 'Riege A',
  activeDiscipline: 42 as number | string | '',
  squadDisciplineStatuses: {} as { [key: string]: number },
};

describe('useSquadDisciplineStatus – Bug #104 fixes', () => {
  let capturedRequests: string[] = [];

  beforeEach(() => {
    capturedRequests = [];
    server.use(
      http.put('/api/squad-disciplines/:squadName/:disciplineId/status', ({ request }) => {
        capturedRequests.push(request.url);
        return HttpResponse.json({ success: true });
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  // Bug #104: display fix
  it('derives squadStatus from passed-in squadDisciplineStatuses (Bug #104)', () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({
        ...defaultProps,
        squadDisciplineStatuses: { 'Riege A-42': 3 },
      })
    );
    expect(result.current.squadStatus).toBe(3);
  });

  it('returns null when key is not in squadDisciplineStatuses', () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, squadDisciplineStatuses: {} })
    );
    expect(result.current.squadStatus).toBeNull();
  });

  it('updates squadStatus when squadDisciplineStatuses prop changes', () => {
    const { result, rerender } = renderHook(
      (props: { statuses: { [key: string]: number } }) =>
        useSquadDisciplineStatus({ ...defaultProps, squadDisciplineStatuses: props.statuses }),
      { initialProps: { statuses: {} } }
    );
    expect(result.current.squadStatus).toBeNull();
    rerender({ statuses: { 'Riege A-42': 5 } });
    expect(result.current.squadStatus).toBe(5);
  });

  it('resets to null when selection changes to an unknown key', () => {
    const { result, rerender } = renderHook(
      (props: { squad: string; discipline: number | string | '' }) =>
        useSquadDisciplineStatus({
          ...defaultProps,
          activeSquad: props.squad,
          activeDiscipline: props.discipline,
          squadDisciplineStatuses: { 'Riege A-42': 3 },
        }),
      { initialProps: { squad: 'Riege A', discipline: 42 as number | string | '' } }
    );
    expect(result.current.squadStatus).toBe(3);
    rerender({ squad: 'Riege B', discipline: 99 as number | string | '' });
    expect(result.current.squadStatus).toBeNull();
  });

  // Bug #104: save fix (PUT endpoint)
  it('calls PUT /api/squad-disciplines/:squad/:discipline/status on save (Bug #104)', async () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, onSquadDisciplineStatusChange: onStatusChange })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(result.current.squadStatus).toBe(3);
    expect(onStatusChange).toHaveBeenCalledWith('Riege A-42', 3);
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]).toContain('/api/squad-disciplines/Riege%20A/42/status');
    expect(capturedRequests[0]).toContain('eventId=1');
  });

  it('calls onSquadDisciplineStatusChange callback with correct key and statusId', async () => {
    const onStatusChange = vi.fn();
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, onSquadDisciplineStatusChange: onStatusChange })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('7');
    });

    expect(onStatusChange).toHaveBeenCalledWith('Riege A-42', 7);
  });

  // Guard conditions
  it('does nothing when activeSquad is empty', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, activeSquad: '' })
    );
    await act(async () => { await result.current.handleSquadStatusChange('3'); });
    expect(capturedRequests).toHaveLength(0);
  });

  it('does nothing when activeDiscipline is empty string', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, activeDiscipline: '' })
    );
    await act(async () => { await result.current.handleSquadStatusChange('3'); });
    expect(capturedRequests).toHaveLength(0);
  });

  it('does nothing when eventId is null', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, eventId: null })
    );
    await act(async () => { await result.current.handleSquadStatusChange('3'); });
    expect(capturedRequests).toHaveLength(0);
  });

  it('does nothing when statusId is NaN', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps })
    );
    await act(async () => { await result.current.handleSquadStatusChange('invalid'); });
    expect(capturedRequests).toHaveLength(0);
  });

  it('does nothing when activeDiscipline is a string (not a numeric id)', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ ...defaultProps, activeDiscipline: 'Boden' })
    );
    await act(async () => { await result.current.handleSquadStatusChange('3'); });
    expect(capturedRequests).toHaveLength(0);
  });

  it('initializes with null status when no squad/discipline selected', () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({
        ...defaultProps,
        activeSquad: '',
        activeDiscipline: '',
        squadDisciplineStatuses: { 'Riege A-42': 5 },
      })
    );
    expect(result.current.squadStatus).toBeNull();
  });
});
