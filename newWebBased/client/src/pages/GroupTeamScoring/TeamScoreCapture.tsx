import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import UnifiedModal from '@/components/UnifiedModal';
import { BlueInfoBox } from '@/components/InfoBoxes';
import EntityScoringSelector, { type ScoringEntity, type ScoringCompetition, type ScoringDiscipline } from '@/components/EntityScoringSelector';
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
        console.log('🏆 DEBUG: Teams API response:', data);
        // Teams API returns paginated data with teams array or direct array
        const teams = Array.isArray(data) ? data : (data.teams || data.results || []);
        setTeams(teams);
      }

      if (competitionsRes.ok) {
        const data = await competitionsRes.json();
        console.log('🎯 DEBUG: Competitions API response:', data);
        // Competitions API returns array directly
        const allCompetitions = Array.isArray(data) ? data : (data.competitions || []);
        // Filter for team competitions (competitionType === 1)
        const teamCompetitions = allCompetitions.filter(
          (comp: any) => comp.competitionType === 1
        );
        setCompetitions(teamCompetitions);
      }

      if (disciplinesRes.ok) {
        const data = await disciplinesRes.json();
        console.log('📚 DEBUG: Disciplines API response:', data);
        // Disciplines API returns direct array, not wrapped in results/disciplines
        const disciplines = Array.isArray(data) ? data : (data.results || data.disciplines || []);
        setDisciplines(disciplines);
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

  // Transform data for EntityScoringSelector
  const scoringTeams: ScoringEntity[] = useMemo(
    () => teams.map(team => ({
      id: team.id,
      name: team.clubName || 'Unknown Club',
      displayName: team.clubName || 'Unknown Club',
      metadata: {
        clubName: team.clubName,
        riege: team.riege,
        startNumber: team.startNumber,
        competitionId: team.competitionId
      }
    })),
    [teams]
  );

  const scoringCompetitions: ScoringCompetition[] = useMemo(
    () => competitions.map(comp => ({
      id: comp.id,
      name: comp.name,
      eventId: comp.eventId,
      gender: comp.gender,
      competitionType: 1 // Team competitions
    })),
    [competitions]
  );

  const scoringDisciplines: ScoringDiscipline[] = useMemo(
    () => disciplines.map(disc => ({
      id: disc.id,
      name: disc.name,
      shortName: disc.shortName,
      icon: disc.icon, // Icon-Feld hinzufügen!
      attempts: disc.attempts,
      maleAllowed: disc.maleAllowed,
      femaleAllowed: disc.femaleAllowed
    })),
    [disciplines]
  );

  // Filter disciplines based on selected team's competition
  const getFilteredDisciplines = (): ScoringDiscipline[] => {
    // If no competition selected, don't show any disciplines
    if (!selectedCompetitionId) {
      console.log('🔍 TeamScoring: No competition selected');
      return [];
    }
    
    console.log('🔍 TeamScoring: Selected competition ID:', selectedCompetitionId);
    
    // Find the selected competition
    const selectedComp = competitions.find(c => c.id === selectedCompetitionId);
    if (!selectedComp) {
      console.log('🔍 TeamScoring: Competition not found');
      return scoringDisciplines;
    }
    
    console.log('🔍 TeamScoring: Selected competition:', selectedComp);
    
    // Get disciplines assigned to this competition
    // Competitions have a 'disciplines' array with discipline IDs
    if (selectedComp.disciplines && Array.isArray(selectedComp.disciplines)) {
      const competitionDisciplineIds = new Set<number>();
      selectedComp.disciplines.forEach((disc: any) => {
        const discId = disc.disciplineId || disc.int_disziplinid || disc.id;
        if (discId) {
          competitionDisciplineIds.add(discId);
        }
      });
      
      console.log('🔍 TeamScoring: Competition discipline IDs:', Array.from(competitionDisciplineIds));
      
      const filtered = scoringDisciplines.filter(d => competitionDisciplineIds.has(d.id as number));
      console.log('🔍 TeamScoring: Filtered disciplines:', filtered.map(d => ({ id: d.id, name: d.name })));
      
      return filtered;
    }
    
    // If no disciplines property, return all disciplines
    console.log('🔍 TeamScoring: No disciplines property on competition, returning all');
    return scoringDisciplines;
  };

  // Handler functions for EntityScoringSelector
  const handleTeamChange = (entityId: number | string | null) => {
    setSelectedTeamId(typeof entityId === 'string' ? parseInt(entityId) : entityId);
  };

  const handleCompetitionChange = (competitionId: number | null) => {
    setSelectedCompetitionId(competitionId);
  };

  const handleDisciplineChange = (disciplineId: number | string | null) => {
    setSelectedDisciplineId(typeof disciplineId === 'string' ? parseInt(disciplineId) : disciplineId);
  };

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

          {/* Team Scoring Selection Steps */}
          <EntityScoringSelector
            entities={scoringTeams}
            selectedEntityId={selectedTeamId}
            onEntityChange={handleTeamChange}
            entityType="team"
            competitions={scoringCompetitions}
            selectedCompetitionId={selectedCompetitionId}
            onCompetitionChange={handleCompetitionChange}
            disciplines={scoringDisciplines}
            selectedDisciplineId={selectedDisciplineId}
            onDisciplineChange={handleDisciplineChange}
            getFilteredDisciplines={getFilteredDisciplines}
            loading={loading}
            translationPrefix="groupTeamScoring"
          />

          {/* Additional Options */}
          {selectedTeamId && selectedCompetitionId && selectedDisciplineId && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('groupTeamScoring.additionalOptions')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {selectedTeam && selectedTeam.startNumber && (
                  <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      ℹ️ {t('groupTeamScoring.autoStartNumber')}: <strong>{selectedTeam.startNumber}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
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
