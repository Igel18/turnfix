import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TimePlanningRotation from '@/pages/TimePlanningRotation';

vi.mock('@/utils/api', () => ({
  apiPut: vi.fn().mockResolvedValue({ success: true }),
  invalidateCache: vi.fn(),
}));

type TestCompetition = {
  id: number;
  name: string;
  round: number;
  participantCount: number;
  int_bahn?: number | null;
};

const baseCompetitions: TestCompetition[] = [
  { id: 101, name: 'WK Durchgang 1', round: 1, participantCount: 10, int_bahn: 1 },
  { id: 102, name: 'WK Durchgang 2', round: 2, participantCount: 12, int_bahn: 1 },
];

const baseSquads = [
  { name: 'Riege 1', participantCount: 10, competitionId: 101, competitionIds: [101] },
  { name: 'Riege 2', participantCount: 12, competitionId: 102, competitionIds: [102] },
];

const baseDevices = [{ name: 'Boden' }, { name: 'Sprung' }];

function RotationHost({ competitions = baseCompetitions }: { competitions?: TestCompetition[] }) {
  const [selectedRound, setSelectedRound] = useState(1);
  const [visible, setVisible] = useState(true);

  return (
    <div>
      <button onClick={() => setVisible(false)}>hide-rotation</button>
      <button onClick={() => setVisible(true)}>show-rotation</button>

      {visible && (
        <TimePlanningRotation
          eventId="1"
          selectedRound={selectedRound}
          onSelectedRoundChange={setSelectedRound}
          competitions={competitions}
          squads={baseSquads}
          devices={baseDevices}
        />
      )}
    </div>
  );
}

describe('TimePlanningRotation round selection', () => {
  it('keeps the selected round after a remount', async () => {
    render(<RotationHost />);

    const round2Button = screen.getByRole('button', { name: /Durchgang 2/i });
    fireEvent.click(round2Button);

    await waitFor(() => {
      expect(round2Button.className).toContain('bg-blue-600');
    });

    fireEvent.click(screen.getByRole('button', { name: 'hide-rotation' }));
    fireEvent.click(screen.getByRole('button', { name: 'show-rotation' }));

    const round2ButtonAfterRemount = screen.getByRole('button', { name: /Durchgang 2/i });
    expect(round2ButtonAfterRemount.className).toContain('bg-blue-600');
  });

  it('falls back to first available round when selected round no longer exists', async () => {
    const onSelectedRoundChange = vi.fn();

    render(
      <TimePlanningRotation
        eventId="1"
        selectedRound={3}
        onSelectedRoundChange={onSelectedRoundChange}
        competitions={baseCompetitions}
        squads={baseSquads}
        devices={baseDevices}
      />
    );

    await waitFor(() => {
      expect(onSelectedRoundChange).toHaveBeenCalledWith(1);
    });
  });
});
