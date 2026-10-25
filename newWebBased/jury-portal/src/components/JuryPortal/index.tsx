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
import type { Durchgang, JuryStep } from './JuryPortal.types';
import { formatScore } from '../../utils/scoreFormatter';
import { getScoreToSave, resolveScoringInputMode } from '@turnfix/shared';
import {
  filterSquadForDurchgang,
  filterSquadsByDurchgang,
  needsDurchgangSelection,
  getSelectableDurchgaenge,
} from '../../utils/durchgangHelpers';
import { useJuryData } from './hooks/useJuryData';
import { useScoreSave } from './hooks/useScoreSave';
import { useLiveScoreUpdates } from './hooks/useLiveScoreUpdates';
import { useActiveSquads } from './hooks/useActiveSquads';
import { useDurchgaenge } from './hooks/useDurchgaenge';
import { useBahnen } from './hooks/useBahnen';
import { useSquadRotation } from './hooks/useSquadRotation';
import { buildBahnOptions, needsBahnSelection } from '../../utils/bahnHelpers';
import { getNextDevice } from '../../utils/rotationHelpers';
import EventSelection from './components/EventSelection';
import DurchgangSelection from './components/DurchgangSelection';
import SquadSelection from './components/SquadSelection';
import DeviceSelection from './components/DeviceSelection';
import BahnSelection from './components/BahnSelection';
import ScoringView from './components/ScoringView';

const JuryPortal: React.FC = () => {
  const [step, setStep] = useState<JuryStep>('event');
  const [squadStatusId, setSquadStatusId] = useState<number | null>(null);
  const [selectedDurchgang, setSelectedDurchgang] = useState<Durchgang | null>(null);
  // Device the squad just completed: the next one of its rotation is suggested on the device list
  const [completedDeviceId, setCompletedDeviceId] = useState<number | null>(null);

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

  const loadSquadStatus = async () => {
    try {
      const { API_BASE_URL } = await import('./JuryPortal.types');
      if (!data.selectedEvent || !data.selectedSquad || !data.selectedDevice?.disciplineId) {
        setSquadStatusId(null);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/squad-disciplines?eventId=${data.selectedEvent}`);
      if (!response.ok) {
        setSquadStatusId(null);
        return;
      }

      const payload = await response.json();
      const list = Array.isArray(payload?.squadDisciplines) ? payload.squadDisciplines : [];
      const match = list.find((item: any) =>
        item?.squadName === data.selectedSquad?.name &&
        Number(item?.disciplineId) === Number(data.selectedDevice?.disciplineId)
      );

      setSquadStatusId(match?.statusId ?? null);
    } catch (err) {
      console.error('Failed to load squad-discipline status:', err);
      setSquadStatusId(null);
    }
  };

  React.useEffect(() => {
    loadSquadStatus();
  }, [data.selectedEvent, data.selectedSquad?.name, data.selectedDevice?.disciplineId]);

  const handleSquadStatusChange = async (statusId: number) => {
    try {
      const { API_BASE_URL } = await import('./JuryPortal.types');
      if (!data.selectedEvent || !data.selectedSquad?.name || !data.selectedDevice?.disciplineId) return;

      const response = await fetch(
        `${API_BASE_URL}/squad-disciplines/${encodeURIComponent(data.selectedSquad.name)}/${data.selectedDevice.disciplineId}/status?eventId=${data.selectedEvent}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statusId }),
        }
      );

      if (!response.ok) {
        console.error('Failed to update squad-discipline status:', await response.text());
        return;
      }

      setSquadStatusId(statusId);
    } catch (err) {
      console.error('Failed to update squad-discipline status:', err);
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

  // Durchgang (round) selection before the squads — only when there is more than one
  const { durchgaenge, loading: durchgaengeLoading } = useDurchgaenge(data.selectedEvent);
  const durchgangSelectionNeeded = needsDurchgangSelection(durchgaenge);
  // With a single Durchgang nothing is asked, but it is still shown while scoring
  const selectableDurchgaenge = getSelectableDurchgaenge(durchgaenge);
  const displayedDurchgang = selectedDurchgang?.durchgang
    ?? (selectableDurchgaenge.length === 1 ? selectableDurchgaenge[0].durchgang : null);

  React.useEffect(() => {
    if (step === 'durchgang' && !durchgaengeLoading && !durchgangSelectionNeeded) {
      setSelectedDurchgang(null);
      setStep('squad');
    }
  }, [step, durchgaengeLoading, durchgangSelectionNeeded]);

  // Bahn (lane) selection after the discipline — only when the squad has more than one for it
  const { bahnen, loading: bahnenLoading } = useBahnen(data.selectedEvent);

  // Rotation of the chosen squad: shown while scoring and used to suggest the next device
  const { rotation } = useSquadRotation(data.selectedEvent, data.selectedSquad?.name);
  const nextDeviceId = getNextDevice(rotation, completedDeviceId)?.disciplineId ?? null;

  const handleDeviceCompleteAndRemember = async () => {
    setCompletedDeviceId(data.selectedDevice?.disciplineId ?? null);
    await handleDeviceComplete();
  };
  const bahnOptions = data.selectedSquad && data.selectedDevice
    ? buildBahnOptions(bahnen, {
        durchgang: selectedDurchgang,
        squad: data.selectedSquad,
        disciplineId: data.selectedDevice.disciplineId ?? null,
      })
    : [];
  const bahnSelectionNeeded = needsBahnSelection(bahnOptions);

  React.useEffect(() => {
    if (step === 'bahn' && !bahnenLoading && !bahnSelectionNeeded) {
      // A single Bahn is taken over automatically so only its participants are scored
      data.setSelectedBahn(bahnOptions.length === 1 ? bahnOptions[0] : null);
      setStep('scoring');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bahnenLoading, bahnSelectionNeeded]);

  // ─── Step Routing ──────────────────────────────────────────────────────────

  if (step === 'event') {
    return (
      <EventSelection
        events={data.events}
        filteredEvents={data.filteredEvents}
        filterToday={data.filterToday}
        loading={data.loading}
        selectedEvent={data.selectedEvent}
        onEventChange={(eventId) => {
          setSelectedDurchgang(null);
          data.setSelectedEvent(eventId);
        }}
        onFilterTodayChange={data.setFilterToday}
        onNext={() => setStep('durchgang')}
      />
    );
  }

  if (step === 'durchgang') {
    // Nothing to choose: the effect above moves on to the squads
    if (!durchgaengeLoading && !durchgangSelectionNeeded) return null;

    return (
      <DurchgangSelection
        durchgaenge={durchgaenge}
        loading={durchgaengeLoading}
        activeSquadInfos={activeSquadInfos}
        currentTime={currentTime}
        onDurchgangSelect={(durchgang) => {
          setSelectedDurchgang(durchgang);
          setStep('squad');
        }}
        onBack={() => {
          setSelectedDurchgang(null);
          setStep('event');
        }}
      />
    );
  }

  if (step === 'squad') {
    const squadsOfDurchgang = filterSquadsByDurchgang(data.squads, selectedDurchgang)
      .map(squad => filterSquadForDurchgang(squad, selectedDurchgang));

    return (
      <SquadSelection
        squads={squadsOfDurchgang}
        loading={data.loading}
        activeSquadInfos={activeSquadInfos}
        currentTime={currentTime}
        onSquadSelect={(squad) => {
          setCompletedDeviceId(null);
          data.setSelectedSquad(squad);
          setStep('device');
        }}
        onBack={() => {
          refreshActiveSquads();
          setStep(durchgangSelectionNeeded ? 'durchgang' : 'event');
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
        nextDeviceId={nextDeviceId}
        onDeviceSelect={(device) => {
          setCompletedDeviceId(null);
          data.setSelectedBahn(null);
          data.setSelectedDevice(device);
          setStep('bahn');
        }}
        onBack={() => {
          setCompletedDeviceId(null);
          setStep('squad');
        }}
      />
    );
  }

  if (step === 'bahn') {
    // Nothing to choose: the effect above moves on to the scoring
    if (!bahnenLoading && !bahnSelectionNeeded) return null;

    return (
      <BahnSelection
        options={bahnOptions}
        squad={data.selectedSquad}
        deviceName={data.selectedDevice?.name ?? ''}
        loading={bahnenLoading}
        onBahnSelect={(option) => {
          data.setSelectedBahn(option);
          setStep('scoring');
        }}
        onBack={() => setStep('device')}
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
      statuses={data.statuses}
      squadStatusId={squadStatusId}
      durchgangNumber={displayedDurchgang}
      bahnNumber={data.selectedBahn?.bahn ?? null}
      rotation={rotation}
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
      onDeviceComplete={handleDeviceCompleteAndRemember}
      onSquadStatusChange={handleSquadStatusChange}
      onBack={() => setStep(bahnSelectionNeeded ? 'bahn' : 'device')}
      getScoreValidation={getScoreValidation}
    />
  );
};

export default JuryPortal;
