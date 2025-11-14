import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import UnifiedModal from '@/components/UnifiedModal';
import { BlueInfoBox } from '@/components/InfoBoxes';
import { ScoreInputFields } from './components/ScoreInputFields';

import type {
  Team,
  Discipline,
  DisciplineField,
  Competition,
  ScoreData,
  ScoreComponent
} from './GroupTeamScoring.types';

export default function TeamScoreCapture() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  const urlCompetitionId = searchParams.get('competitionId');

  const { selectedEvent, selectedCompetition } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId;

  const [teams, setTeams] = useState<Team[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(
    competitionId ? parseInt(competitionId) : null
  );
  const [selectedAttempt, setSelectedAttempt] = useState<number>(1);
  const [selectedStatusId] = useState<number>(1); // Default status

  const [scoreComponents, setScoreComponents] = useState<ScoreComponent[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedDisciplineId) {
      loadDisciplineFields(selectedDisciplineId);
    } else {
      setDisciplineFields([]);
    }
  }, [selectedDisciplineId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsRes, competitionsRes, disciplinesRes] = await Promise.all([
        fetch(`/api/teams?eventId=${eventId}&limit=1000`),
        fetch(`/api/competitions?eventId=${eventId}&limit=100`),
        fetch(`/api/disciplines?limit=500`)
      ]);

      if (teamsRes.ok) {
        const data = await teamsRes.json();
        // Teams API returns paginated results with teams array
        setTeams(data.teams || []);
      }

      if (competitionsRes.ok) {
        const data = await competitionsRes.json();
        // Competitions API returns array directly, filtered for team competitions
        const allCompetitions = Array.isArray(data) ? data : (data.competitions || []);
        const teamCompetitions = allCompetitions.filter(
          (comp: any) => comp.competitionType === 1
        );
        setCompetitions(teamCompetitions);
      }

      if (disciplinesRes.ok) {
        const data = await disciplinesRes.json();
        setDisciplines(data.results || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisciplineFields = async (disciplineId: number) => {
    try {
      const res = await fetch(`/api/discipline-fields?disciplineId=${disciplineId}&enabled=true&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const fields = data.results || [];
        setDisciplineFields(fields);
        
        const components = fields.map((f: DisciplineField) => ({
          fieldId: f.id,
          fieldName: f.name,
          value: null
        }));
        setScoreComponents(components);
      }
    } catch (error) {
      console.error('Error loading discipline fields:', error);
    }
  };

  const selectedTeam = useMemo(
    () => teams.find(t => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );

  const selectedDiscipline = useMemo(
    () => disciplines.find(d => d.id === selectedDisciplineId),
    [disciplines, selectedDisciplineId]
  );

  const canOpenScoreEntry = useMemo(
    () => selectedTeamId && selectedDisciplineId && selectedCompetitionId,
    [selectedTeamId, selectedDisciplineId, selectedCompetitionId]
  );

  const handleComponentChange = (fieldId: number, value: number | null) => {
    setScoreComponents(prev =>
      prev.map(c => c.fieldId === fieldId ? { ...c, value } : c)
    );
  };

  const calculateFinalScore = () => {
    const finalField = disciplineFields.find(f => f.isFinalScore);
    if (!finalField) return 0;

    const values = scoreComponents
      .filter(c => !disciplineFields.find(f => f.id === c.fieldId && f.isFinalScore))
      .map(c => c.value || 0);

    return values.reduce((sum, val) => sum + val, 0);
  };

  const handleOpenScoreEntry = () => {
    if (!canOpenScoreEntry) return;
    
    const calculated = calculateFinalScore();
    setFinalScore(calculated);
    setShowModal(true);
  };

  const handleSaveScore = async () => {
    if (!selectedTeamId || !selectedDisciplineId || !selectedCompetitionId) {
      return;
    }

    setSaving(true);
    try {
      const scoreData: ScoreData = {
        teamId: selectedTeamId,
        competitionId: selectedCompetitionId,
        disciplineId: selectedDisciplineId,
        statusId: selectedStatusId,
        attempt: selectedAttempt,
        startNumber: selectedTeam?.startNumber || undefined, // Auto from team entity
        components: scoreComponents.filter(c => c.value !== null),
        finalScore: finalScore || calculateFinalScore(),
        comment: comment || undefined
      };

      const res = await fetch('/api/scores/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
      });

      if (res.ok) {
        setShowModal(false);
        setScoreComponents(prev => prev.map(c => ({ ...c, value: null })));
        setFinalScore(null);
        setComment('');
        alert(t('groupTeamScoring.scoreSaved'));
      } else {
        const error = await res.json();
        alert(t('groupTeamScoring.saveError') + ': ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving score:', error);
      alert(t('groupTeamScoring.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EventManagementTemplate
        title={t('groupTeamScoring.teamScoring')}
        icon={UsersIcon}
        loading={loading}
        onAdd={handleOpenScoreEntry}
        addButtonText={t('groupTeamScoring.enterScore')}
        showAddButton={!!canOpenScoreEntry}
      >
        <div className="space-y-6">
          <BlueInfoBox>
            {t('groupTeamScoring.teamInfo')}
          </BlueInfoBox>

          <div className="bg-white p-6 rounded-lg border space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t('groupTeamScoring.selectionPanel')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectTeam')} *
                </label>
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseTeam')}</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.clubName} - Riege {team.riege}
                      {team.startNumber && ` (${t('groupTeamScoring.startNumber')}: ${team.startNumber})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectCompetition')} *
                </label>
                <select
                  value={selectedCompetitionId || ''}
                  onChange={(e) => setSelectedCompetitionId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseCompetition')}</option>
                  {competitions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectDiscipline')} *
                </label>
                <select
                  value={selectedDisciplineId || ''}
                  onChange={(e) => setSelectedDisciplineId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseDiscipline')}</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.attempt')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedDiscipline?.attempts || 3}
                  value={selectedAttempt}
                  onChange={(e) => setSelectedAttempt(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {selectedTeam && selectedTeam.startNumber && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  ℹ️ {t('groupTeamScoring.autoStartNumber')}: <strong>{selectedTeam.startNumber}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </EventManagementTemplate>

      <UnifiedModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('groupTeamScoring.enterScoreFor') + ': ' + (selectedTeam ? `${selectedTeam.clubName} - Riege ${selectedTeam.riege}` : '')}
        size="4xl"
        showFooter={false}
      >
        <div className="space-y-6">
          {selectedDiscipline && disciplineFields.length > 0 && (
            <ScoreInputFields
              fields={disciplineFields}
              components={scoreComponents}
              onChange={handleComponentChange}
              disabled={saving}
              calculationType={selectedDiscipline.calculationType}
            />
          )}

          {disciplineFields.length === 0 && (
            <BlueInfoBox>
              {t('groupTeamScoring.noDisciplineFields')}
            </BlueInfoBox>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('groupTeamScoring.comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder={t('groupTeamScoring.commentPlaceholder')}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg font-semibold">
              {t('groupTeamScoring.calculatedFinal')}: {calculateFinalScore().toFixed(2)}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveScore}
                disabled={saving || disciplineFields.length === 0}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {t('common.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </UnifiedModal>
    </>
  );
}
