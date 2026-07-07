import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';

import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { BlueInfoBox } from '@/components/InfoBoxes';
import EntityScoringSelector, { type ScoringEntity, type ScoringCompetition, type ScoringDiscipline } from '@/components/EntityScoringSelector';
import { useFormulaCalculation } from '@/pages/ScoreCapture/hooks';
import { TeamScoreTable } from './components/TeamScoreTable';

import type {
  Team,
  Discipline,
  DisciplineField,
  Competition,
  ScoreData
} from './GroupTeamScoring.types';

export default function TeamScoreCapture() {
  const { t } = useTranslation();
  const { calculateFinalScoreFromFieldMap } = useFormulaCalculation();
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
  const [scoreMatrix, setScoreMatrix] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(
    competitionId ? parseInt(competitionId) : null
  );
  const [selectedStatusId] = useState<number>(1); // Default status

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

  useEffect(() => {
    if (selectedTeamId && selectedCompetitionId && selectedDisciplineId) {
      loadExistingScores();
    } else {
      setScoreMatrix({});
    }
  }, [selectedTeamId, selectedCompetitionId, selectedDisciplineId]);

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
        // API returns array directly, not wrapped in results
        const allFields = Array.isArray(data) ? data : (data.results || []);
        
        // Filter fields for the selected discipline (API doesn't filter by disciplineId)
        const fields = allFields.filter((f: any) => f.disciplineId === disciplineId);
        
        console.log('📋 Loaded discipline fields for discipline', disciplineId, ':', fields.length, 'fields (filtered from', allFields.length, 'total)');
        setDisciplineFields(fields);
      }
    } catch (error) {
      console.error('Error loading discipline fields:', error);
    }
  };

  const loadExistingScores = async () => {
    if (!selectedTeamId || !selectedCompetitionId || !selectedDisciplineId) return;
    
    setLoadingScores(true);
    try {
      const res = await fetch(
        `/api/scores/team?teamId=${selectedTeamId}&competitionId=${selectedCompetitionId}&disciplineId=${selectedDisciplineId}&limit=100`
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Existing team scores:', data);
        
        // Populate scoreMatrix with existing scores
        const matrix: Record<string, string> = {};
        (data.results || []).forEach((score: any) => {
          if (score.components && Array.isArray(score.components)) {
            score.components.forEach((component: any) => {
              const key = `team-${selectedTeamId}-attempt-${score.attempt}-field-${component.fieldId}`;
              matrix[key] = component.value?.toString() || '';
            });
          }
        });
        setScoreMatrix(matrix);
      }
    } catch (error) {
      console.error('Error loading existing scores:', error);
    } finally {
      setLoadingScores(false);
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

  const handleScoreChange = (attempt: number, fieldId: number, value: string) => {
    const key = `team-${selectedTeamId}-attempt-${attempt}-field-${fieldId}`;
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getAttemptFieldValueMap = (attempt: number): Record<number, string | number | null> => {
    return disciplineFields.reduce<Record<number, string | number | null>>((acc, field) => {
      const key = `team-${selectedTeamId}-attempt-${attempt}-field-${field.id}`;
      acc[field.id] = scoreMatrix[key] || null;
      return acc;
    }, {});
  };

  const calculateAttemptFinalScore = (attempt: number): number | null => {
    return calculateFinalScoreFromFieldMap(
      selectedDiscipline?.formula || null,
      disciplineFields,
      getAttemptFieldValueMap(attempt)
    );
  };

  const handleSaveScore = async (attempt: number) => {
    if (!selectedTeamId || !selectedDisciplineId || !selectedCompetitionId) {
      return;
    }

    // Get non-final score fields
    const scoreFields = disciplineFields.filter(f => !f.isFinalScore);

    // Get score components for this attempt
    const components = scoreFields
      .map((field: DisciplineField) => {
        const key = `team-${selectedTeamId}-attempt-${attempt}-field-${field.id}`;
        const value = parseFloat(scoreMatrix[key] || '0');
        return {
          fieldId: field.id,
          fieldName: field.name,
          value: value > 0 ? value : null
        };
      })
      .filter((c: any) => c.value !== null);

    if (components.length === 0) {
      return; // Nothing to save
    }

    const finalScore = calculateAttemptFinalScore(attempt);

    const scoreData: ScoreData = {
      teamId: selectedTeamId,
      competitionId: selectedCompetitionId,
      disciplineId: selectedDisciplineId,
      statusId: selectedStatusId,
      attempt: attempt,
      components: components.map((c: any) => ({ fieldId: c.fieldId, fieldName: c.fieldName, value: c.value! })),
      finalScore
    };

    console.log('💾 Saving team score:', scoreData);

    try {
      const res = await fetch('/api/scores/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
      });

      console.log('💾 Save response status:', res.status);
      
      if (res.ok) {
        const result = await res.json();
        console.log('💾 Save successful:', result);
        await loadExistingScores();
      } else {
        const error = await res.json();
        console.error('❌ Error saving score:', error);
      }
    } catch (error) {
      console.error('❌ Error saving score:', error);
    }
  };

  return (
    <>
      <EventManagementTemplate
        title={t('groupTeamScoring.teamScoring')}
        icon={UsersIcon}
        loading={loading}
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

          {/* Score Table - Show when Team, Competition, and Discipline are selected */}
          {selectedTeamId && selectedCompetitionId && selectedDisciplineId && selectedDiscipline && selectedTeam && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('groupTeamScoring.scoreEntry')}
                </h3>
              </div>
              
              <TeamScoreTable
                team={selectedTeam}
                disciplineFields={disciplineFields}
                formula={selectedDiscipline.formula || null}
                maxAttempts={selectedDiscipline.attempts}
                inputMask={selectedDiscipline.inputMask || '0.000'}
                loading={loadingScores}
                onScoreChange={handleScoreChange}
                onSaveScore={handleSaveScore}
                scoreMatrix={scoreMatrix}
                calculateFinalScore={calculateAttemptFinalScore}
              />
            </div>
          )}
        </div>
      </EventManagementTemplate>
    </>
  );
}
