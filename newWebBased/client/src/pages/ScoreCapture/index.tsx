/**
 * ScoreCapture Page - Main Orchestration
 * Point 123: Separation of Concerns - FINAL VERSION
 * 
 * Refactored from 1,987-line monolith into ultra-clean modular architecture:
 * - 8 hooks (1,383 lines): Data, Matrix, Formula, Validation, Actions, LiveUpdates, Status, Handlers
 * - 4 components (503 lines): ScoreFilters, ScoreTable, SquadStatusSelector, HelpPanel
 * - Main orchestration (280 lines): Ultra-lean state management and composition
 * 
 * Pattern: Similar to TimePlanning (Point 124) but even cleaner
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ClipboardDocumentListIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { BlueInfoBox } from '@/components/InfoBoxes';
import { SquadDisciplineSelector } from '@/components/scoreCapture/SquadDisciplineSelector';

// All 8 hooks
import {
  useScoreData,
  useScoreMatrix,
  useFormulaCalculation,
  useScoreValidation,
  useScoreActions,
  useScoreLiveUpdates,
  useSquadDisciplineStatus,
  useScoreHandlers
} from './hooks';

// All 4 components (ScoreFilters not used - replaced by SquadDisciplineSelector)
import {
  ScoreTable,
  HelpPanel
} from './components';

export default function ScoreCapture() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { selectedEvent, selectedCompetition, selectedSquad: contextSquad, selectedDiscipline: contextDiscipline } = useEvent();

  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId');
  const urlCompetitionId = searchParams.get('competitionId');
  const urlSquadName = searchParams.get('squadName');

  // Use context values or URL parameters
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId;

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showJuryScores, setShowJuryScores] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [activeSquad, setActiveSquad] = useState<string>(contextSquad?.squad_name || urlSquadName || '');
  const [activeDiscipline, setActiveDiscipline] = useState<number | string | ''>(
    contextDiscipline ? (contextDiscipline.int_disziplinid || contextDiscipline.var_name) : ''
  );

  // Hook 1: Data Loading
  const {
    participants,
    disciplines,
    disciplineFields,
    squads,
    competitions,
    statuses,
    existingScores,
    setExistingScores,
    loading,
    isInitializing,
    loadInitialData
  } = useScoreData({ eventId });

  // Hook 2: Score Matrix
  const {
    scoreMatrix,
    setScoreMatrix,
    pendingEndwerts,
    setPendingEndwerts,
    initializeScoreMatrix
  } = useScoreMatrix({
    eventId,
    activeSquad,
    activeDiscipline,
    participants,
    disciplines,
    disciplineFields,
    existingScores,
    getDisciplineFields: (disciplineId) => {
      const allFields = disciplineFields
        .filter(field => field.disciplineId === disciplineId && field.enabled)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return showJuryScores ? allFields : allFields.filter(field => field.isFinalScore === true);
    },
    getFilteredDisciplines: () => {
      return activeDiscipline
        ? disciplines.filter(d => d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline)
        : disciplines;
    }
  });

  // Hook 3: Formula Calculation
  const { parseFormulaDisplay, evaluateFormula } = useFormulaCalculation();

  // Hook 4: Validation
  const { getScoreValidation, getParticipantCompetitions, filteredParticipants } = useScoreValidation({
    disciplines,
    competitions,
    statuses,
    participants,
    activeSquad,
    activeDiscipline,
    searchTerm
  });

  // Debug logging (moved here after filteredParticipants is defined)
  useEffect(() => {
    console.log('🔍 ScoreCapture DEBUG:', {
      eventId,
      participants: participants.length,
      disciplines: disciplines.length,
      squads: squads.length,
      competitions: competitions.length,
      activeSquad,
      activeDiscipline,
      filteredParticipants: filteredParticipants.length,
      loading,
      isInitializing
    });
  }, [eventId, participants.length, disciplines.length, squads.length, competitions.length, activeSquad, activeDiscipline, filteredParticipants.length, loading, isInitializing]);

  // Hook 5: Actions (Save/Update)
  const { saveScore, saveFieldScore } = useScoreActions({
    competitionId: competitionId || undefined,
    competitions,
    participants,
    disciplines,
    displayDisciplines: activeDiscipline
      ? disciplines.filter(d => d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline)
      : disciplines,
    scoreMatrix,
    selectedEvent,
    selectedCompetition,
    evaluateFormula
  });

  // Hook 6: Live Updates (Socket.IO)
  useScoreLiveUpdates({ eventId: eventId || undefined, setExistingScores });

  // Hook 7: Squad-Discipline Status
  const { squadStatus, handleSquadStatusChange } = useSquadDisciplineStatus({
    eventId,
    activeSquad,
    activeDiscipline
  });

  // Hook 8: Event Handlers
  const {
    handleScoreChange,
    handleFieldScoreChange,
    handleSquadChange,
    handleDisciplineChange,
    handleShowJuryScoresChange,
    handleExportCSV
  } = useScoreHandlers({
    eventId,
    competitionId,
    scoreMatrix,
    setScoreMatrix,
    disciplineFields,
    saveFieldScore,
    participants,
    disciplines,
    squads,
    activeDiscipline,
    setActiveDiscipline,
    selectedEvent
  });

  // Load showJuryScores setting from API on mount
  useEffect(() => {
    const loadJuryScoresSetting = async () => {
      try {
        const response = await fetch('/api/app-settings/scoreCapture');
        const data = await response.json();
        setShowJuryScores(data.showJuryScores || false);
      } catch (error) {
        console.error('Failed to load jury scores setting:', error);
        setShowJuryScores(false);
      }
    };
    loadJuryScoresSetting();
  }, []);

  // Load initial data when eventId is available
  useEffect(() => {
    if (eventId && !loading && !isInitializing) {
      loadInitialData();
    }
  }, [eventId]);

  // Sync context squad with local state
  useEffect(() => {
    if (contextSquad?.squad_name && contextSquad.squad_name !== activeSquad) {
      setActiveSquad(contextSquad.squad_name);
    }
  }, [contextSquad?.squad_name]);

  // Sync context discipline with local state
  useEffect(() => {
    if (contextDiscipline) {
      const disciplineValue = contextDiscipline.int_disziplinid || contextDiscipline.var_name;
      if (disciplineValue !== activeDiscipline) {
        setActiveDiscipline(disciplineValue);
      }
    }
  }, [contextDiscipline?.int_disziplinid, contextDiscipline?.var_name]);

  // Initialize score matrix when data is ready
  useEffect(() => {
    if (participants.length > 0 && disciplines.length > 0 && existingScores.length > 0 && !isInitializing) {
      console.log('🎯 Triggering initializeScoreMatrix with:', {
        participants: participants.length,
        disciplines: disciplines.length,
        existingScores: existingScores.length,
        isInitializing
      });
      initializeScoreMatrix(participants, disciplines, existingScores);
    }
  }, [participants.length, disciplines.length, existingScores.length, isInitializing, showJuryScores]);

  // Helper: Get discipline fields (filtered by showJuryScores)
  const getDisciplineFields = (disciplineId: number | string) => {
    const allFields = disciplineFields
      .filter(field => field.disciplineId === disciplineId && field.enabled)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return showJuryScores ? allFields : allFields.filter(field => field.isFinalScore === true);
  };

  // Helper: Get filtered squads (all available squads)
  const getFilteredSquads = () => {
    return squads || [];
  };

  // Helper: Get filtered disciplines (only show disciplines for selected squad)
  const getFilteredDisciplines = () => {
    if (!activeSquad) {
      console.log('🔍 getFilteredDisciplines: No active squad selected');
      return []; // Don't show any disciplines until squad is selected
    }
    
    console.log('🔍 getFilteredDisciplines: Active squad:', activeSquad);
    console.log('🔍 getFilteredDisciplines: All participants:', participants.length);
    
    // Get participants in the selected squad
    const squadParticipants = participants.filter(p => p.squad_name === activeSquad);
    
    console.log('🔍 getFilteredDisciplines: Squad participants:', squadParticipants.length);
    console.log('🔍 getFilteredDisciplines: First participant:', squadParticipants[0]);
    
    if (squadParticipants.length === 0) {
      console.log('🔍 getFilteredDisciplines: No participants in squad');
      return []; // No participants in squad
    }
    
    // Get all competition IDs from squad participants
    const participantCompetitionIds = new Set<number>();
    squadParticipants.forEach(participant => {
      if (participant.assignedCompetitions && Array.isArray(participant.assignedCompetitions)) {
        participant.assignedCompetitions.forEach((competitionId: number) => {
          participantCompetitionIds.add(competitionId);
        });
      }
    });
    
    console.log('🔍 getFilteredDisciplines: Competition IDs from participants:', Array.from(participantCompetitionIds));
    console.log('🔍 getFilteredDisciplines: Available competitions:', competitions.length);
    
    // Get all disciplines from those competitions
    const availableDisciplines = new Set<number>();
    competitions
      .filter(comp => participantCompetitionIds.has(comp.id))
      .forEach(comp => {
        console.log('🔍 getFilteredDisciplines: Processing competition:', comp.id, comp.name, 'disciplines:', comp.disciplines?.length);
        if (comp.disciplines && Array.isArray(comp.disciplines)) {
          comp.disciplines.forEach((disc: any) => {
            // Competition disciplines have 'disciplineId' property, not 'int_disziplinid'
            const discId = disc.disciplineId || disc.int_disziplinid;
            console.log('🔍 getFilteredDisciplines: Adding discipline:', discId, disc.name || disc.var_name);
            if (discId) {
              availableDisciplines.add(discId);
            }
          });
        }
      });
    
    console.log('🔍 getFilteredDisciplines: Available discipline IDs:', Array.from(availableDisciplines));
    console.log('🔍 getFilteredDisciplines: All disciplines:', disciplines.map(d => ({ id: d.int_disziplinid, name: d.var_name })));
    
    // Filter disciplines by available ones
    const filtered = disciplines.filter(d => availableDisciplines.has(d.int_disziplinid));
    console.log('🔍 getFilteredDisciplines: Filtered result:', filtered.map(d => ({ id: d.int_disziplinid, name: d.var_name })));
    
    return filtered;
  };

  // Helper: Get status color based on status ID
  const getStatusColor = (statusId: number): string => {
    const status = statuses.find(s => s.int_statusid === statusId);
    if (!status || !status.ary_colorcode) {
      return 'bg-gray-100 text-gray-800';
    }
    
    const colorCode = status.ary_colorcode;
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return 'bg-red-100 text-red-800';
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return 'bg-green-100 text-green-800';
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return 'bg-blue-100 text-blue-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  // Helper: Get filtered disciplines (by activeDiscipline)
  const displayDisciplines = activeDiscipline
    ? disciplines.filter(d => d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline)
    : disciplines;

  // Early return: No event selected
  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{t('scoreCapture.noEventSelected')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Early return: Loading state
  if (loading || isInitializing) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Render
  return (
    <EventManagementTemplate
      title={t('scoreCapture.title')}
      subtitle={t('scoreCapture.subtitle')}
      icon={ClipboardDocumentListIcon}
      showFilters={false}
      showHelpPanel={showHelpPanel}
      onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
      helpContent={<HelpPanel showJuryScores={showJuryScores} />}
      onExportCSV={handleExportCSV}
      showExportCSV={true}
    >
      {/* Squad and Discipline Selector with visual icons */}
      <SquadDisciplineSelector
        squads={squads}
        activeSquad={activeSquad}
        onSquadChange={handleSquadChange}
        getFilteredSquads={getFilteredSquads}
        disciplines={disciplines}
        activeDiscipline={activeDiscipline}
        onDisciplineChange={handleDisciplineChange}
        getFilteredDisciplines={getFilteredDisciplines}
        statuses={statuses}
        squadStatus={squadStatus}
        onSquadStatusChange={handleSquadStatusChange}
        getStatusColor={getStatusColor}
        loading={loading}
      />

      {/* Search and Jury Scores Toggle */}
      <div className="bg-white p-4 rounded-lg border mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('scoreCapture.filters.search')}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('scoreCapture.filters.searchPlaceholder')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Show Jury Scores Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showJuryScores"
              checked={showJuryScores}
              onChange={(e) => {
                setShowJuryScores(e.target.checked);
                handleShowJuryScoresChange(e.target.checked);
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showJuryScores" className="text-sm font-medium text-gray-700">
              {t('scoreCapture.filters.showJuryScores')}
            </label>
          </div>
        </div>
      </div>

      {participants.length === 0 ? (
        <BlueInfoBox>
          <p>{t('scoreCapture.noParticipants')}</p>
        </BlueInfoBox>
      ) : (
        <ScoreTable
          filteredParticipants={filteredParticipants}
          displayDisciplines={displayDisciplines}
          disciplineFields={disciplineFields}
          scoreMatrix={scoreMatrix}
          showJuryScores={showJuryScores}
          existingScores={existingScores}
          pendingEndwerts={pendingEndwerts}
          setPendingEndwerts={setPendingEndwerts}
          setExistingScores={setExistingScores}
          getDisciplineFields={getDisciplineFields}
          getScoreValidation={getScoreValidation}
          getParticipantCompetitions={getParticipantCompetitions}
          handleScoreChange={handleScoreChange}
          handleFieldScoreChange={handleFieldScoreChange}
          saveScore={saveScore}
          saveFieldScore={saveFieldScore}
          parseFormulaDisplay={parseFormulaDisplay}
          normalizeScoreInput={(value: string, _decimalPlaces: number) => value}
          getScorePlaceholder={(_decimalPlaces: number) => '0.00'}
          setScoreMatrix={setScoreMatrix}
          disciplines={disciplines}
          competitionId={competitionId || undefined}
        />
      )}
    </EventManagementTemplate>
  );
}
