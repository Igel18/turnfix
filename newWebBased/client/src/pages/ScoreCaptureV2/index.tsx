/**
 * ScoreCaptureV2 – Jury-style split-view score capture for the competition office.
 *
 * Architecture:
 *  - Uses the same data hooks as ScoreCapture (no code duplication)
 *  - Visual layout: EventManagementTemplate header (no filter) → SquadDisciplineSelector
 *    → horizontal split view (left: ParticipantList, right: ScoringPanel)
 *  - On save: sets participant status to "Wertung erfasst" automatically
 *
 * Point 125: New page (old ScoreCapture stays intact).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ClipboardDocumentCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { BlueInfoBox } from '@/components/InfoBoxes';
import { SquadDisciplineSelector } from '@/components/scoreCapture/SquadDisciplineSelector';
import { apiGet, apiRequest } from '@/utils/api';

// Hooks from ScoreCapture
import {
  useScoreData,
  useScoreMatrix,
  useFormulaCalculation,
  useScoreValidation,
  useScoreActions,
  useScoreLiveUpdates,
  useSquadDisciplineStatus,
  useScoreHandlers,
} from '@/pages/ScoreCapture/hooks';

// Components
import { ParticipantList, ScoringPanel } from './components';
import type { ParticipantListItem, ParticipantStatusRecord } from './ScoreCaptureV2.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_NAME_MATCH = ['wertung erfasst', 'leistungen erfasst', 'leistung erfasst'];

function normalizeStatusName(name: string) {
  return name.toLowerCase().trim();
}

function findScoreStatus(statuses: { int_statusid: number; var_name: string }[]): number | null {
  const s = statuses.find(st => STATUS_NAME_MATCH.includes(normalizeStatusName(st.var_name)));
  return s?.int_statusid ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScoreCaptureV2() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const {
    selectedEvent,
    selectedCompetition,
    selectedSquad: contextSquad,
    selectedDiscipline: contextDiscipline,
  } = useEvent();

  const urlEventId = searchParams.get('eventId');
  const urlCompetitionId = searchParams.get('competitionId');

  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId;

  // ── Local state ──────────────────────────────────────────────────────────────
  const [activeSquad, setActiveSquad] = useState<string>(contextSquad?.squad_name || '');
  const [activeDiscipline, setActiveDiscipline] = useState<number | string | ''>(
    contextDiscipline ? (contextDiscipline.int_disziplinid || contextDiscipline.var_name) : ''
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /** Status records per participantId, loaded from /api/participant-status */
  const [participantStatuses, setParticipantStatuses] = useState<
    Record<number, ParticipantStatusRecord>
  >({});

  // ── Data hooks ───────────────────────────────────────────────────────────────
  const {
    participants,
    disciplines,
    disciplineFields,
    squads,
    competitions,
    statuses,
    existingScores,
    setExistingScores,
    squadDisciplineStatuses,
    setSquadDisciplineStatuses,
    loading,
    isInitializing,
    loadInitialData,
  } = useScoreData({ eventId });

  const {
    scoreMatrix,
    setScoreMatrix,
    pendingEndwerts: _pendingEndwerts,
    setPendingEndwerts: _setPendingEndwerts,
    initializeScoreMatrix,
  } = useScoreMatrix({
    eventId,
    activeSquad,
    activeDiscipline,
    participants,
    disciplines,
    disciplineFields,
    existingScores,
    getDisciplineFields: (disciplineId) =>
      disciplineFields
        .filter(f => f.disciplineId === disciplineId && f.enabled)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    getFilteredDisciplines: () =>
      activeDiscipline
        ? disciplines.filter(d => d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline)
        : disciplines,
  });

  const { evaluateFormula } = useFormulaCalculation();

  const displayDisciplines = activeDiscipline
    ? disciplines.filter(d => d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline)
    : disciplines;

  const selectedDiscipline = displayDisciplines.length === 1 ? displayDisciplines[0] : null;

  const { getScoreValidation, filteredParticipants } = useScoreValidation({
    disciplines,
    competitions,
    statuses,
    participants,
    activeSquad,
    activeDiscipline,
    searchTerm: '', // no search in V2
  });

  const { saveScore, saveFieldScore } = useScoreActions({
    competitionId: competitionId || undefined,
    competitions,
    participants,
    disciplines,
    displayDisciplines,
    scoreMatrix,
    selectedEvent,
    selectedCompetition,
    evaluateFormula,
  });

  useScoreLiveUpdates({ eventId: eventId || undefined, setExistingScores });

  const { squadStatus, handleSquadStatusChange } = useSquadDisciplineStatus({
    eventId,
    activeSquad,
    activeDiscipline,
    squadDisciplineStatuses,
    onSquadDisciplineStatusChange: (key, statusId) => {
      setSquadDisciplineStatuses(prev => ({ ...prev, [key]: statusId }));
    },
  });

  const {
    handleScoreChange: _handleScoreChange,
    handleFieldScoreChange,
    handleSquadChange,
    handleDisciplineChange,
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
    selectedEvent,
  });

  // ── Status helpers ────────────────────────────────────────────────────────────

  const getStatusColor = (statusId: number): string => {
    const status = statuses.find(s => s.int_statusid === statusId);
    if (!status?.ary_colorcode) return 'bg-gray-100 text-gray-800';
    const c = status.ary_colorcode;
    if (c.includes('255,0,0') || c.includes('#ff0000')) return 'bg-red-100 text-red-800';
    if (c.includes('0,255,0') || c.includes('#00ff00')) return 'bg-green-100 text-green-800';
    if (c.includes('255,255,0') || c.includes('#ffff00')) return 'bg-yellow-100 text-yellow-800';
    if (c.includes('0,0,255') || c.includes('#0000ff')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getFilteredSquads = () => squads || [];
  const getFilteredDisciplines = () => {
    if (!activeSquad) return [];
    const squadParticipants = participants.filter(p => p.squad_name === activeSquad);
    if (squadParticipants.length === 0) return [];
    const participantCompetitionIds = new Set<number>();
    squadParticipants.forEach(p => {
      (p.assignedCompetitions || []).forEach(cid => participantCompetitionIds.add(cid));
    });
    const available = new Set<number>();
    competitions
      .filter(c => participantCompetitionIds.has(c.id))
      .forEach(c => {
        (c.disciplines || []).forEach((d: any) => {
          const id = d.disciplineId || d.int_disziplinid;
          if (id) available.add(id);
        });
      });
    return disciplines.filter(d => available.has(d.int_disziplinid));
  };

  const getDisciplineFields = (disciplineId: number | string) =>
    disciplineFields
      .filter(f => f.disciplineId === disciplineId && f.enabled)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // ── Load participant statuses ────────────────────────────────────────────────

  const loadParticipantStatuses = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await apiGet(`/participant-status?eventId=${eventId}&_cb=${Date.now()}`);
      const records: Record<number, ParticipantStatusRecord> = {};
      (data.participants || []).forEach((p: any) => {
        records[p.participantId] = {
          wertungenId: p.wertungenId,
          participantId: p.participantId,
          competitionId: p.competitionId,
          statusId: p.statusId,
          statusName: p.statusName,
          statusColor: p.statusColor,
        };
      });
      setParticipantStatuses(records);
    } catch (err) {
      console.error('Failed to load participant statuses:', err);
    }
  }, [eventId]);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (eventId && !loading && !isInitializing) {
      loadInitialData();
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) loadParticipantStatuses();
  }, [loadParticipantStatuses]);

  useEffect(() => {
    if (contextSquad?.squad_name && contextSquad.squad_name !== activeSquad) {
      setActiveSquad(contextSquad.squad_name);
    }
  }, [contextSquad?.squad_name]);

  useEffect(() => {
    if (contextDiscipline) {
      const val = contextDiscipline.int_disziplinid || contextDiscipline.var_name;
      if (val !== activeDiscipline) setActiveDiscipline(val);
    }
  }, [contextDiscipline?.int_disziplinid, contextDiscipline?.var_name]);

  useEffect(() => {
    if (participants.length > 0 && disciplines.length > 0 && !isInitializing) {
      initializeScoreMatrix(participants, disciplines, existingScores);
    }
  }, [participants.length, disciplines.length, existingScores.length, isInitializing, activeSquad, activeDiscipline]);

  // Reset index when squad/discipline changes
  useEffect(() => {
    setCurrentIndex(0);
    setScore('');
  }, [activeSquad, activeDiscipline]);

  // Sync score input from scoreMatrix when participant or discipline changes
  const prevIndexRef = useRef(currentIndex);
  useEffect(() => {
    if (!selectedDiscipline || !filteredParticipants[currentIndex]) return;
    const p = filteredParticipants[currentIndex];
    const key = `${p.id}-${selectedDiscipline.int_disziplinid || selectedDiscipline.var_name}`;
    const existing = scoreMatrix[key];
    setScore(existing != null ? String(existing) : '');
    prevIndexRef.current = currentIndex;
  }, [currentIndex, selectedDiscipline?.int_disziplinid, filteredParticipants.length]);

  // ── Score save ─────────────────────────────────────────────────────────────

  const handleSave = async (scoreOverride?: string | number) => {
    if (!selectedDiscipline) return;
    const participant = filteredParticipants[currentIndex];
    if (!participant) return;

    setIsSaving(true);
    try {
      const disciplineId = selectedDiscipline.int_disziplinid || selectedDiscipline.var_name;
      const scoreToSave = scoreOverride !== undefined ? scoreOverride : score;
      const wertungenId = await saveScore(participant.id, disciplineId, scoreToSave);

      if (wertungenId !== null) {
        // Update status to "Wertung erfasst"
        const statusId = findScoreStatus(statuses);
        if (statusId !== null) {
          try {
            await apiRequest(`/participant-status/${wertungenId}`, {
              method: 'PATCH',
              body: JSON.stringify({ statusId }),
            });
            // Update local state
            const statusOption = statuses.find(s => s.int_statusid === statusId);
            setParticipantStatuses(prev => ({
              ...prev,
              [participant.id]: {
                wertungenId,
                participantId: participant.id,
                competitionId: competitions[0]?.id ?? 0,
                statusId,
                statusName: statusOption?.var_name ?? null,
                statusColor: statusOption?.ary_colorcode ?? null,
              },
            }));
          } catch (err) {
            console.warn('Could not update participant status:', err);
          }
        }

        // Move to next participant
        if (currentIndex < filteredParticipants.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (wertungenId: number, statusId: number) => {
    try {
      await apiRequest(`/participant-status/${wertungenId}`, {
        method: 'PATCH',
        body: JSON.stringify({ statusId }),
      });
      const statusOption = statuses.find(s => s.int_statusid === statusId);
      setParticipantStatuses(prev => {
        const entry = Object.entries(prev).find(([, r]) => r.wertungenId === wertungenId);
        if (!entry) return prev;
        const [key, record] = entry;
        return {
          ...prev,
          [key]: {
            ...record,
            statusId,
            statusName: statusOption?.var_name ?? null,
            statusColor: statusOption?.ary_colorcode ?? null,
          },
        };
      });
    } catch (err) {
      console.error('Failed to update participant status:', err);
    }
  };

  const handleFieldChange = (fieldId: number, value: string) => {
    if (!filteredParticipants[currentIndex]) return;
    handleFieldScoreChange(filteredParticipants[currentIndex].id, fieldId, value);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < filteredParticipants.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // ── Build participant list items ──────────────────────────────────────────────

  const participantListItems: ParticipantListItem[] = filteredParticipants.map(p => {
    const disciplineId = selectedDiscipline
      ? (selectedDiscipline.int_disziplinid || selectedDiscipline.var_name)
      : '';
    const scoreKey = `${p.id}-${disciplineId}`;
    const rawScore = scoreMatrix[scoreKey];
    const currentScore = rawScore != null && rawScore !== '' ? parseFloat(String(rawScore)) : null;
    const statusRecord = participantStatuses[p.id];
    return {
      id: p.id,
      name: `${p.firstname ?? ''} ${p.lastname ?? ''}`.trim(),
      startNumber: p.startNumber ?? null,
      clubName: p.club ?? '',
      currentScore: isNaN(currentScore as number) ? null : currentScore,
      wertungenId: statusRecord?.wertungenId ?? null,
      statusId: statusRecord?.statusId ?? null,
      statusName: statusRecord?.statusName ?? null,
      statusColor: statusRecord?.statusColor ?? null,
    };
  });

  const currentParticipant = participantListItems[currentIndex];
  const currentOriginalParticipant = filteredParticipants[currentIndex];
  const wertungenIdForPanel = currentOriginalParticipant
    ? participantStatuses[currentOriginalParticipant.id]?.wertungenId
    : undefined;

  // ── No event selected ─────────────────────────────────────────────────────────

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-700">{t('scoreCaptureV2.noEventSelected')}</p>
        </div>
      </div>
    );
  }

  if (loading || isInitializing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <EventManagementTemplate
      title={t('scoreCaptureV2.title')}
      subtitle={t('scoreCaptureV2.subtitle')}
      icon={ClipboardDocumentCheckIcon}
      showFilters={false}
      showAddButton={false}
      showImportButton={false}
      showExportCSV={false}
      showViewToggle={false}
    >
      {/* Squad & Discipline selection */}
      <SquadDisciplineSelector
        squads={squads}
        activeSquad={activeSquad}
        onSquadChange={(name) => {
          setActiveSquad(name);
          handleSquadChange(name);
        }}
        getFilteredSquads={getFilteredSquads}
        disciplines={disciplines}
        activeDiscipline={activeDiscipline}
        onDisciplineChange={(val) => {
          setActiveDiscipline(val);
          handleDisciplineChange(val);
        }}
        getFilteredDisciplines={getFilteredDisciplines}
        statuses={statuses}
        squadStatus={squadStatus}
        onSquadStatusChange={handleSquadStatusChange}
        getStatusColor={getStatusColor}
        loading={loading}
      />

      {/* Main split-view area */}
      {activeSquad && activeDiscipline ? (
        filteredParticipants.length === 0 ? (
          <BlueInfoBox>
            <p>{t('scoreCaptureV2.noParticipants')}</p>
          </BlueInfoBox>
        ) : (
          <div
            className="flex flex-col sm:flex-row border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm"
            style={{ minHeight: '480px' }}
            data-testid="scoring-split-view"
          >
            <ParticipantList
              participants={participantListItems}
              currentIndex={currentIndex}
              onSelect={(idx) => {
                setCurrentIndex(idx);
                setScore('');
              }}
              disciplineName={selectedDiscipline?.var_name}
              squadName={activeSquad}
            />
            <ScoringPanel
              participant={currentParticipant}
              discipline={selectedDiscipline}
              disciplineFields={getDisciplineFields(
                selectedDiscipline?.int_disziplinid || selectedDiscipline?.var_name || ''
              )}
              score={score}
              wertungenId={wertungenIdForPanel}
              participantCount={filteredParticipants.length}
              currentIndex={currentIndex}
              loading={isSaving}
              onScoreChange={setScore}
              onFieldChange={handleFieldChange}
              onSave={handleSave}
              onNavigate={handleNavigate}
              statuses={statuses}
              onStatusChange={handleStatusChange}
              getScoreValidation={(v) => {
                const disciplineId = selectedDiscipline?.int_disziplinid || selectedDiscipline?.var_name || '';
                const result = getScoreValidation(disciplineId, v);
                return { isValid: result.isValid, message: result.message ?? '' };
              }}
            />
          </div>
        )
      ) : (
        <BlueInfoBox>
          <p>
            {!activeSquad
              ? t('scoreCapture.pleaseSelectSquad')
              : t('scoreCapture.pleaseSelectDevice')}
          </p>
        </BlueInfoBox>
      )}
    </EventManagementTemplate>
  );
}
