import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLiveScoreUpdates } from '../components/JuryPortal/hooks/useLiveScoreUpdates';
import type { Participant } from '../components/JuryPortal/JuryPortal.types';

const socket = vi.hoisted(() => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }));
vi.mock('../utils/socket', () => ({ default: () => socket }));

describe('jury live evaluation updates', () => {
  it('only updates the evaluation identified by the socket message', () => {
    let participants = [
      { participantId: 1, wertungenId: 44, currentScore: 3 },
      { participantId: 1, wertungenId: 55, currentScore: 8 }
    ] as Participant[];
    const setParticipants = vi.fn(update => { participants = update(participants); });
    renderHook(() => useLiveScoreUpdates({
      selectedEvent: 1,
      selectedDevice: { id: 10, disciplineId: 10, name: 'Boden', icon: '' },
      setParticipants
    }));
    const listener = socket.on.mock.calls.find(call => call[0] === 'score-updated')?.[1];
    act(() => listener({ eventId: 1, disciplineId: 10, participantId: 1, scoreId: 55, score: 9 }));
    expect(participants.map(participant => participant.currentScore)).toEqual([3, 9]);
  });
});
