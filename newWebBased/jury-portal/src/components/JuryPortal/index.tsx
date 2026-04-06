/**
 * JuryPortal — Main orchestrator component.
 * 
 * Refactored from a 1489-line monolith into focused sub-components and hooks.
 * This file only handles step routing and wiring sub-components together.
 * 
 * Structure:
 *   JuryPortal.types.ts           - All TypeScript interfaces
 *   hooks/useJuryData.ts          - Data fetching (events, squads, devices, participants, fields)
 *   hooks/useScoreSave.ts         - Score submission logic (formula + simple)
 *   hooks/useLiveScoreUpdates.ts  - Socket.IO real-time updates
 *   components/EventSelection.tsx - Step 1: Event picker
 *   components/SquadSelection.tsx - Step 2: Squad picker
 *   components/DeviceSelection.tsx - Step 3: Device/discipline picker
 *   components/ScoringView.tsx    - Step 4: Scoring interface
 */

import React, { useState } from 'react';
import type { JuryStep } from './JuryPortal.types';
import { formatScore } from '../../utils/scoreFormatter';
import { getScoreToSave, resolveScoringInputMode } from '@turnfix/shared';
import { useJuryData } from './hooks/useJuryData';
import { useScoreSave } from './hooks/useScoreSave';
import { useLiveScoreUpdates } from './hooks/useLiveScoreUpdates';
import { useActiveSquads } from './hooks/useActiveSquads';
import EventSelection from './components/EventSelection';
import SquadSelection from './components/SquadSelection';
import DeviceSelection from './components/DeviceSelection';
import ScoringView from './components/ScoringView';

const JuryPortal: React.FC = () => {
  const [step, setStep] = useState<JuryStep>('event');

  // All data fetching and state management
  const data = useJuryData();

  // Score saving logic
  const { handleScoreSubmit, handleDeviceComplete, getScoreValidation } = useScoreSave({
    currentParticipant: data.currentParticipant,
    currentParticipantIndex: data.currentParticipantIndex,
    participants: data.participants,
    selectedEvent: data.selectedEvent,
    selectedSquad: data.selectedSquad,
    selectedDevice: data.selectedDevice,
    competitions: data.competitions,
    disciplineFields: data.disciplineFields,
    formulaFieldValues: data.formulaFieldValues,
    score: data.score,
    setLoading: data.setLoading,
    setParticipants: data.setParticipants,
    setStep,
    setCurrentParticipantIndex: data.setCurrentParticipantIndex,
    setScore: data.setScore,
  });

  const handleStatusChange = async (wertungenId: number, statusId: number) => {
    try {
      const { API_BASE_URL } = await import('./JuryPortal.types');
      await fetch(`${API_BASE_URL}/participant-status/${wertungenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusId }),
      });
      const statusOption = data.statuses.find(s => s.int_statusid === statusId);
      data.setParticipants(prev => prev.map(p =>
        p.wertungenId === wertungenId
          ? { ...p, statusId, statusName: statusOption?.var_name ?? null, statusColor: statusOption?.ary_colorcode ?? null }
          : p
      ));
    } catch (err) {
      console.error('Failed to update participant status:', err);
    }
  };

  // Real-time score updates via Socket.IO
  useLiveScoreUpdates({
    selectedEvent: data.selectedEvent,
    selectedDevice: data.selectedDevice,
    setParticipants: data.setParticipants,
  });

  // Time-based squad highlighting (Feature 120)
  const { activeSquadInfos, currentTime, refresh: refreshActiveSquads } = useActiveSquads(
    data.selectedEvent
  );

  // ─── Step Routing ──────────────────────────────────────────────────────────

  if (step === 'event') {
    return (
      <EventSelection
        events={data.events}
        filteredEvents={data.filteredEvents}
        filterToday={data.filterToday}
        loading={data.loading}
        selectedEvent={data.selectedEvent}
        onEventChange={data.setSelectedEvent}
        onFilterTodayChange={data.setFilterToday}
        onNext={() => setStep('squad')}
      />
    );
  }

  if (step === 'squad') {
    return (
      <SquadSelection
        squads={data.squads}
        loading={data.loading}
        activeSquadInfos={activeSquadInfos}
        currentTime={currentTime}
        onSquadSelect={(squad) => {
          data.setSelectedSquad(squad);
          setStep('device');
        }}
        onBack={() => {
          refreshActiveSquads();
          setStep('event');
        }}
      />
    );
  }

  if (step === 'device') {
    return (
      <DeviceSelection
        devices={data.devices}
        selectedSquad={data.selectedSquad}
        loading={data.loading}
        onDeviceSelect={(device) => {
          data.setSelectedDevice(device);
          setStep('scoring');
        }}
        onBack={() => setStep('squad')}
      />
    );
  }

  // step === 'scoring'
  return (
    <ScoringView
      participants={data.participants}
      currentParticipant={data.currentParticipant}
      currentParticipantIndex={data.currentParticipantIndex}
      selectedDevice={data.selectedDevice}
      selectedSquad={data.selectedSquad}
      disciplineFields={data.disciplineFields}
      loadedJuryResults={data.loadedJuryResults}
      score={data.score}
      loading={data.loading}
      onParticipantSelect={(index) => {
        data.setCurrentParticipantIndex(index);
        // Score is set by the useEffect in useJuryData that watches currentParticipantIndex
      }}
      onScoreChange={data.setScore}
      onCalculationComplete={(calculatedScore, fieldValues) => {
        if (calculatedScore !== null && data.selectedDevice) {
          const inputMode = resolveScoringInputMode({
            formula: data.selectedDevice.var_formel || '',
            formulaId: data.selectedDevice.int_formelid || null
          });
          const disciplineFieldCountForSave = inputMode === 'builtInFormula' ? 0 : data.disciplineFields.length;

          // For built-in formulas (lowercase vars like "x", no discipline fields):
          // Store the RAW input value, not the calculated result.
          // The var_formel is applied at ranking time by applyBuiltInFormula().
          const scoreValue = getScoreToSave(
            calculatedScore,
            fieldValues,
            data.selectedDevice.var_formel || '',
            disciplineFieldCountForSave
          );
          const formattedScore = formatScore(scoreValue, data.selectedDevice.int_berechnung);
          data.setScore(formattedScore);
          data.setFormulaFieldValues(fieldValues);
        }
      }}
      onScoreSubmit={handleScoreSubmit}
      onDeviceComplete={handleDeviceComplete}
      onBack={() => setStep('device')}
      getScoreValidation={getScoreValidation}
      statuses={data.statuses}
      onStatusChange={handleStatusChange}
    />
  );
};

export default JuryPortal;
