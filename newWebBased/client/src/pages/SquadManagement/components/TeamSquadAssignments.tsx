import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Team {
  id: number;
  number: number | null;
  club: string;
  competition: string;
  competitionNumber: string | null;
  squadName: string | null;
  needsSync: boolean;
  members: { id: number; firstname: string; lastname: string }[];
}

interface Props {
  eventId: string;
  squads: { name: string }[];
  onChanged: () => Promise<void>;
}

export function TeamSquadAssignments({ eventId, squads, onChanged }: Props) {
  const { t } = useTranslation();
  const headingId = useId();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const loadTeams = useCallback(async () => {
    const response = await fetch(`/api/squad-management/teams?eventId=${encodeURIComponent(eventId)}`);
    if (!response.ok) throw new Error('Failed to load team assignments');
    const data: { teams: Team[] } = await response.json();
    setTeams(data.teams);
  }, [eventId]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    loadTeams().catch(err => {
      console.error('Error loading team assignments:', err);
      setError(true);
    }).finally(() => setLoading(false));
  }, [loadTeams, squads]);

  const assign = async (teamId: number, squadName: string) => {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch('/api/squad-management/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: Number(eventId), teamId, squadName: squadName || null })
      });
      if (!response.ok) throw new Error('Failed to update team assignment');
      await loadTeams();
      await onChanged();
    } catch (err) {
      console.error('Error updating team assignment:', err);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!loading && !error && teams.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 mt-6" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-lg font-semibold text-gray-900">{t('squadManagement.teams.title')}</h3>
      <p className="text-sm text-gray-600 mb-3">{t('squadManagement.teams.description')}</p>
      {error && <p role="alert" className="text-sm text-red-700">{t('squadManagement.teams.error')}</p>}
      {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
      <div className="space-y-2">
        {teams.map(team => (
          <div key={team.id} className="rounded-lg border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">{team.club} – {t('teams.teamLabel')} {team.number}</div>
              <div className="text-sm text-gray-600">{team.competitionNumber} {team.competition}</div>
              <div className="text-sm text-gray-500">
                {[...new Map(team.members.map(member => [member.id, member])).values()].map(member => (
                  <span key={member.id} className="inline-block mr-2">{member.firstname} {member.lastname}</span>
                ))}
              </div>
            </div>
            <label className="text-sm">
              <span className="sr-only">{t('squadManagement.teams.selectSquad')} {team.club} {team.number}</span>
              <select value={team.squadName || ''} disabled={busy} onChange={event => assign(team.id, event.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white">
                <option value="">{t('squadManagement.teams.unassigned')}</option>
                {squads.map(squad => <option key={squad.name} value={squad.name}>{squad.name}</option>)}
              </select>
            </label>
            {team.needsSync && (
              <button type="button" disabled={busy} onClick={() => assign(team.id, team.squadName || '')}
                className="text-sm text-blue-700 underline disabled:opacity-50">
                {t('squadManagement.teams.synchronize')}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
