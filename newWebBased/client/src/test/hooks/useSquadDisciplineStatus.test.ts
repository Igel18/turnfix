/**
 * Tests for useSquadDisciplineStatus Hook
 * Covers: handleSquadStatusChange, squadStatus derivation, and API calls
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSquadDisciplineStatus } from '@/pages/ScoreCapture/hooks/useSquadDisciplineStatus';

// Mock api
vi.mock('@/utils/api', () => ({
  apiPost: vi.fn().mockResolvedValue({ success: true }),
}));

describe('useSquadDisciplineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with null squad status', () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: '', activeDiscipline: '' })
    );
    expect(result.current.squadStatus).toBeNull();
    expect(result.current.squadDisciplineStatuses).toEqual({});
  });

  it('saves squad status via API on handleSquadStatusChange', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: 'Riege A', activeDiscipline: 42 })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(apiPost).toHaveBeenCalledWith('/squad-disciplines', {
      eventId: 1,
      squadName: 'Riege A',
      disciplineId: 42,
      statusId: 3,
    });
    expect(result.current.squadStatus).toBe(3);
  });

  it('does nothing when activeSquad is empty', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: '', activeDiscipline: 42 })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('does nothing when activeDiscipline is empty', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: 'Riege A', activeDiscipline: '' })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('does nothing when eventId is null', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: null, activeSquad: 'Riege A', activeDiscipline: 42 })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('does nothing when statusId is NaN', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: 'Riege A', activeDiscipline: 42 })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('invalid');
    });

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('updates squadDisciplineStatuses map on status change', async () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: 'Riege A', activeDiscipline: 42 })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('5');
    });

    expect(result.current.squadDisciplineStatuses).toEqual({
      'Riege A-42': 5,
    });
  });

  it('passes null as disciplineId when activeDiscipline is a string', async () => {
    const { apiPost } = await import('@/utils/api');
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: 'Riege A', activeDiscipline: 'Boden' })
    );

    await act(async () => {
      await result.current.handleSquadStatusChange('3');
    });

    expect(apiPost).toHaveBeenCalledWith('/squad-disciplines', {
      eventId: 1,
      squadName: 'Riege A',
      disciplineId: null,
      statusId: 3,
    });
  });

  it('setSquadStatus allows external status update', () => {
    const { result } = renderHook(() =>
      useSquadDisciplineStatus({ eventId: '1', activeSquad: '', activeDiscipline: '' })
    );

    act(() => {
      result.current.setSquadStatus(7);
    });

    expect(result.current.squadStatus).toBe(7);
  });
});
