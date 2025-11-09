import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';
import { UsersIcon } from '@heroicons/react/24/outline';
import TeamFormModal from '@/components/TeamFormModal';
import TeamPenaltiesModal from '@/components/TeamPenaltiesModal';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface Competition {
  id: number;
  name: string;
}

interface Team {
  int_mannschaftenid: number;
  int_vereineid: number;
  int_wettkaempfeid: number;
  int_nummer: number;
  var_riege: string | null;
  int_startnummer: number | null;
  tfx_vereine: {
    var_name: string;
  };
  tfx_wettkaempfe: {
    var_name: string;
  };
}

const TeamsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('all');
  const [sortField, setSortField] = useState<'club' | 'competition' | 'number' | 'startNumber'>('club');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPenaltiesModalOpen, setIsPenaltiesModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeamForPenalties, setSelectedTeamForPenalties] = useState<Team | null>(null);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '1000' });
      if (selectedClub !== 'all') params.append('clubId', selectedClub);
      if (selectedCompetition !== 'all') params.append('eventId', selectedCompetition);
      
      const response = await fetch(`/api/teams?${params}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClub, selectedCompetition]);

  // Fetch clubs
  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch('/api/clubs?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  }, []);

  // Fetch competitions
  const fetchCompetitions = useCallback(async () => {
    try {
      const response = await fetch('/api/competitions?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch competitions');
      
      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchClubs();
    fetchCompetitions();
  }, [fetchTeams, fetchClubs, fetchCompetitions]);

  // Handle edit
  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsFormModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (team: Team) => {
    if (!window.confirm(t('teams.messages.confirmDelete'))) return;

    try {
      const response = await fetch(`/api/teams/${team.int_mannschaftenid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }

      await fetchTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert(t('teams.messages.deleteError'));
    }
  };

  // Handle penalties
  const handleManagePenalties = (team: Team) => {
    setSelectedTeamForPenalties(team);
    setIsPenaltiesModalOpen(true);
  };

  // Handle form modal close
  const handleFormModalClose = (saved: boolean) => {
    setIsFormModalOpen(false);
    setEditingTeam(null);
    if (saved) fetchTeams();
  };

  // Handle penalties modal close
  const handlePenaltiesModalClose = () => {
    setIsPenaltiesModalOpen(false);
    setSelectedTeamForPenalties(null);
  };

  // Filter and sort teams
  const filteredAndSortedTeams = teams
    .filter((team) => {
      const matchesSearch = searchTerm === '' || 
        team.tfx_vereine.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.tfx_wettkaempfe.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.var_riege && team.var_riege.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'club':
          comparison = a.tfx_vereine.var_name.localeCompare(b.tfx_vereine.var_name);
          break;
        case 'competition':
          comparison = a.tfx_wettkaempfe.var_name.localeCompare(b.tfx_wettkaempfe.var_name);
          break;
        case 'number':
          comparison = (a.int_nummer || 0) - (b.int_nummer || 0);
          break;
        case 'startNumber':
          comparison = (a.int_startnummer || 0) - (b.int_startnummer || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Handle sort
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader
        title={t('teams.title')}
        subtitle={t('teams.subtitle')}
        icon={UsersIcon}
        onAdd={() => {
          setEditingTeam(null);
          setIsFormModalOpen(true);
        }}
        addLabel={t('teams.addTeam')}
        showAdd={true}
      />

      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4 items-center">
          <Input
            placeholder={t('teams.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('teams.filters.allClubs')}</option>
            {clubs.map((club) => (
              <option key={club.int_vereineid} value={club.int_vereineid.toString()}>
                {club.var_name}
              </option>
            ))}
          </select>

          <select
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('teams.filters.allCompetitions')}</option>
            {competitions.map((comp) => (
              <option key={comp.id} value={comp.id.toString()}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Teams Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('teams.loadingTeams')}</p>
        </div>
      ) : filteredAndSortedTeams.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">{t('teams.noTeams')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('club')}
                >
                  {t('teams.table.club')}
                  {sortField === 'club' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('competition')}
                >
                  {t('teams.table.competition')}
                  {sortField === 'competition' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('number')}
                >
                  {t('teams.table.number')}
                  {sortField === 'number' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('teams.table.squad')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('startNumber')}
                >
                  {t('teams.table.startNumber')}
                  {sortField === 'startNumber' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('teams.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedTeams.map((team) => (
                <tr key={team.int_mannschaftenid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.tfx_vereine.var_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.tfx_wettkaempfe.var_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.int_nummer || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.var_riege || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {team.int_startnummer || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManagePenalties(team)}
                        title={t('teams.managePenalties')}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(team)}
                        title={t('teams.editTeam')}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(team)}
                        title={t('teams.deleteTeam')}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {isFormModalOpen && (
        <TeamFormModal
          team={editingTeam}
          clubs={clubs}
          competitions={competitions}
          onClose={handleFormModalClose}
        />
      )}

      {isPenaltiesModalOpen && selectedTeamForPenalties && (
        <TeamPenaltiesModal
          team={selectedTeamForPenalties}
          onClose={handlePenaltiesModalClose}
        />
      )}
    </div>
  );
};

export default TeamsUnified;
