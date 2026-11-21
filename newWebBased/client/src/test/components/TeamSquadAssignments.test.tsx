import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeamSquadAssignments } from '@/pages/SquadManagement/components/TeamSquadAssignments';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

describe('Team squad assignments', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows team members and assigns the team to a selected squad', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, json: async () => ({
          teams: [{ id: 8, number: 1, club: 'Verein', competition: 'Wettkampf', squadName: null, members: [{ id: 1, firstname: 'Anna', lastname: 'Test' }] }]
        })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true, json: async () => ({
          teams: [{ id: 8, number: 1, club: 'Verein', competition: 'Wettkampf', squadName: 'A', members: [{ id: 1, firstname: 'Anna', lastname: 'Test' }] }]
        })
      });
    vi.stubGlobal('fetch', fetchMock);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<TeamSquadAssignments eventId="4" squads={[{ name: 'A' }]} onChanged={onChanged} />);
    expect(await screen.findByText('Anna Test')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'A' } });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(fetchMock.mock.calls[1][0]).toBe('/api/squad-management/team');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ eventId: 4, teamId: 8, squadName: 'A' });
    await waitFor(() => expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('A'));
  });

  it('shows an error when loading teams fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(<TeamSquadAssignments eventId="4" squads={[]} onChanged={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('lets existing teams synchronize missing scores without changing their squad', async () => {
    const team = { id: 8, number: 1, club: 'Verein', competition: 'Wettkampf', squadName: 'A', members: [], needsSync: true };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ teams: [team] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ teams: [{ ...team, needsSync: false }] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<TeamSquadAssignments eventId="4" squads={[{ name: 'A' }]} onChanged={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(await screen.findByRole('button', { name: 'squadManagement.teams.synchronize' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ eventId: 4, teamId: 8, squadName: 'A' });
  });
});
