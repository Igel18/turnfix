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

// All 4 components
import {
  ScoreFilters,
  ScoreTable,
  SquadStatusSelector,
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
    if (participants.length > 0 && disciplines.length > 0 && !isInitializing) {
      initializeScoreMatrix(participants, disciplines, existingScores);
    }
  }, [participants.length, disciplines.length, existingScores.length, showJuryScores]);

  // Helper: Get discipline fields (filtered by showJuryScores)
  const getDisciplineFields = (disciplineId: number | string) => {
    const allFields = disciplineFields
      .filter(field => field.disciplineId === disciplineId && field.enabled)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return showJuryScores ? allFields : allFields.filter(field => field.isFinalScore === true);
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
      icon={ClipboardDocumentListIcon}
      showFilters={true}
      filterSection={
        <div className="space-y-4">
          <SquadStatusSelector
            activeSquad={activeSquad}
            activeDiscipline={activeDiscipline}
            statuses={statuses}
            squadStatus={squadStatus}
            onStatusChange={handleSquadStatusChange}
            getStatusColor={() => 'gray'}
          />
          <ScoreFilters
            squads={squads}
            activeSquad={activeSquad}
            onSquadChange={(squad: string) => {
              setActiveSquad(squad);
              handleSquadChange(squad);
            }}
            disciplines={disciplines}
            activeDiscipline={activeDiscipline}
            onDisciplineChange={(discipline: number | string) => {
              setActiveDiscipline(discipline);
              handleDisciplineChange(discipline);
            }}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showJuryScores={showJuryScores}
            onShowJuryScoresChange={(checked) => {
              setShowJuryScores(checked);
              handleShowJuryScoresChange(checked);
            }}
          />
        </div>
      }
      showHelpPanel={showHelpPanel}
      onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
      helpContent={<HelpPanel showJuryScores={showJuryScores} />}
      onExportCSV={handleExportCSV}
      showExportCSV={true}
    >
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
