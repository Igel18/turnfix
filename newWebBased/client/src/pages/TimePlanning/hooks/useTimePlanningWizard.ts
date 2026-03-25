/**
 * useTimePlanningWizard
 *
 * All state and business logic for the 6-step Time-Planning Wizard.
 * The component (TimePlanningWizard.tsx) is kept as a pure presenter.
 */

import { useState, useCallback, useEffect } from 'react';
import { apiGet, apiPost, apiPut, invalidateCache } from '@/utils/api';
import type { Competition, TimeSettings } from '../TimePlanning.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WizardStep = 'startTime' | 'timing' | 'rounds' | 'lanes' | 'generate' | 'schedule';

export interface DurchgangData {
  durchgang: number;
  squads: string[];
  disciplines: Array<{ id: number; name: string; shortName: string }>;
}

export interface GenerationResult {
  success: boolean;
  totalCells: number;
  durchgaengeCount: number;
  message: string;
}

const WIZARD_STEP_ORDER: WizardStep[] = [
  'startTime',
  'timing',
  'rounds',
  'lanes',
  'generate',
  'schedule',
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseTimePlanningWizardProps {
  eventId: string;
  competitions: Competition[];
  timeSettings: TimeSettings;
  setTimeSettings: (s: TimeSettings) => void;
  onRefetch: () => void;
  onClose: () => void;
}

export function useTimePlanningWizard({
  eventId,
  competitions,
  timeSettings,
  setTimeSettings,
  onRefetch,
  onClose,
}: UseTimePlanningWizardProps) {
  // ── Step navigation ──────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<WizardStep>('startTime');

  const goNext = useCallback(() => {
    const idx = WIZARD_STEP_ORDER.indexOf(currentStep);
    if (idx < WIZARD_STEP_ORDER.length - 1) setCurrentStep(WIZARD_STEP_ORDER[idx + 1]);
  }, [currentStep]);

  const goBack = useCallback(() => {
    const idx = WIZARD_STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(WIZARD_STEP_ORDER[idx - 1]);
  }, [currentStep]);

  const isFirstStep = currentStep === WIZARD_STEP_ORDER[0];
  const isLastStep = currentStep === WIZARD_STEP_ORDER[WIZARD_STEP_ORDER.length - 1];

  // ── Step 1: Per-Durchgang start times ────────────────────────────────────
  // durchgangStartTimes[1] = start time for Durchgang 1, etc.
  // These are saved to tfx_wettkaempfe.tim_startzeit during the generate step.
  const [durchgangStartTimes, setDurchgangStartTimesState] = useState<Record<number, string>>({ 1: '08:00' });

  const setDurchgangStartTime = useCallback((round: number, time: string) => {
    setDurchgangStartTimesState(prev => ({ ...prev, [round]: time }));
  }, []);

  // ── Step 2: Timing ───────────────────────────────────────────────────────
  // Synced with timeSettings — changes are applied immediately via setTimeSettings.

  // ── Steps 3 & 4: Pending round / bahn assignments ────────────────────────
  const [pendingRounds, setPendingRounds] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const c of competitions) m[c.id] = c.round;
    return m;
  });
  const [pendingBahnen, setPendingBahnen] = useState<Record<number, number>>(() => {
    const m: Record<number, number> = {};
    for (const c of competitions) m[c.id] = c.int_bahn ?? 1;
    return m;
  });

  // Re-initialise pending assignments when competitions prop changes
  useEffect(() => {
    setPendingRounds(prev => {
      const m: Record<number, number> = {};
      for (const c of competitions) m[c.id] = prev[c.id] ?? c.round;
      return m;
    });
    setPendingBahnen(prev => {
      const m: Record<number, number> = {};
      for (const c of competitions) m[c.id] = prev[c.id] ?? (c.int_bahn ?? 1);
      return m;
    });
  }, [competitions]);

  // Derived max round — also tracks Durchgänge the user added manually
  const [minMaxRound, setMinMaxRound] = useState<number>(1);
  const derivedMaxRound = Object.values(pendingRounds).length > 0
    ? Math.max(...Object.values(pendingRounds))
    : 1;
  const maxRound = Math.max(minMaxRound, derivedMaxRound, 1);

  const addDurchgang = useCallback(() => {
    const newMax = maxRound + 1;
    setMinMaxRound(newMax);
    // Pre-fill a start time for the new Durchgang (empty — user must fill it)
    setDurchgangStartTimesState(prev => prev[newMax] !== undefined ? prev : { ...prev, [newMax]: '' });
  }, [maxRound]);

  const setCompetitionRound = useCallback((compId: number, round: number) => {
    setPendingRounds(prev => ({ ...prev, [compId]: round }));
  }, []);

  const setCompetitionBahn = useCallback((compId: number, bahn: number) => {
    setPendingBahnen(prev => ({ ...prev, [compId]: bahn }));
  }, []);

  // ── Step 3 → DB save ─────────────────────────────────────────────────────
  const [savingRounds, setSavingRounds] = useState(false);

  const saveRoundsToDb = useCallback(async () => {
    setSavingRounds(true);
    try {
      const promises = competitions.map(c => {
        const round = pendingRounds[c.id] ?? c.round;
        if (round !== c.round) {
          return apiPut(`/time-planning/competition/${c.id}/round`, { round });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      invalidateCache('/api/time-planning');
      onRefetch();
    } finally {
      setSavingRounds(false);
    }
  }, [competitions, pendingRounds, onRefetch]);

  // ── Step 4 → DB save ─────────────────────────────────────────────────────
  const [savingBahnen, setSavingBahnen] = useState(false);

  const saveBahnenToDb = useCallback(async () => {
    setSavingBahnen(true);
    try {
      const promises = competitions.map(c => {
        const bahn = pendingBahnen[c.id] ?? c.int_bahn ?? 1;
        if (bahn !== c.int_bahn) {
          return apiPut(`/time-planning/competition/${c.id}/bahn`, { bahn });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      invalidateCache('/api/time-planning');
      onRefetch();
    } finally {
      setSavingBahnen(false);
    }
  }, [competitions, pendingBahnen, onRefetch]);

  // ── Step 5: Durchgang data & start assignments ───────────────────────────
  const [durchgangData, setDurchgangData] = useState<DurchgangData[]>([]);
  const [loadingDurchgangData, setLoadingDurchgangData] = useState(false);
  // startAssignments: durchgang → { squadName → disciplineId }
  const [startAssignments, setStartAssignments] = useState<
    Record<number, Record<string, number>>
  >({});

  const loadDurchgangData = useCallback(async () => {
    if (!eventId) return;
    setLoadingDurchgangData(true);
    try {
      const data = await apiGet(`/time-planning/wizard/durchgang-data?eventId=${eventId}`);
      const items: DurchgangData[] = data?.durchgaenge ?? [];
      setDurchgangData(items);
      // Auto-assign default starting positions
      const defaultAssignments: Record<number, Record<string, number>> = {};
      for (const d of items) {
        const discIds = d.disciplines.map(disc => disc.id);
        const m: Record<string, number> = {};
        d.squads.forEach((s, i) => {
          m[s] = discIds[i % discIds.length];
        });
        defaultAssignments[d.durchgang] = m;
      }
      setStartAssignments(prev => {
        // Merge: keep existing manual assignments but add any new ones
        const merged: Record<number, Record<string, number>> = { ...defaultAssignments };
        for (const [dStr, assignments] of Object.entries(prev)) {
          const d = Number(dStr);
          if (merged[d]) {
            merged[d] = { ...merged[d], ...assignments };
          }
        }
        return merged;
      });
    } finally {
      setLoadingDurchgangData(false);
    }
  }, [eventId]);

  const setStartAssignment = useCallback(
    (durchgang: number, squadName: string, disciplineId: number) => {
      setStartAssignments(prev => ({
        ...prev,
        [durchgang]: { ...(prev[durchgang] ?? {}), [squadName]: disciplineId },
      }));
    },
    [],
  );

  const autoAssignStartPositions = useCallback(() => {
    const newAssignments: Record<number, Record<string, number>> = {};
    for (const d of durchgangData) {
      const discIds = d.disciplines.map(disc => disc.id);
      const m: Record<string, number> = {};
      d.squads.forEach((s, i) => {
        m[s] = discIds[i % discIds.length];
      });
      newAssignments[d.durchgang] = m;
    }
    setStartAssignments(newAssignments);
  }, [durchgangData]);

  // ── Step 5: Generation ───────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const generateRoundRobin = useCallback(async () => {
    setGenerating(true);
    setGenerationError(null);
    try {
      const roundsPayload = durchgangData.map(d => ({
        durchgang: d.durchgang,
        startAssignments: startAssignments[d.durchgang] ?? {},
      }));
      const result = await apiPost('/time-planning/wizard/generate', {
        eventId: Number(eventId),
        rounds: roundsPayload,
        durchgangStartTimes,
      });
      setGenerationResult(result as GenerationResult);
      invalidateCache('/api/time-planning');
      onRefetch();
      // Advance to the summary step
      setCurrentStep('schedule');
    } catch (err: any) {
      setGenerationError(err?.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }, [eventId, durchgangData, startAssignments, durchgangStartTimes, onRefetch]);

  // ── Step navigation with side-effects ────────────────────────────────────

  const handleNext = useCallback(async () => {
    if (currentStep === 'rounds') {
      await saveRoundsToDb();
    }
    if (currentStep === 'lanes') {
      await saveBahnenToDb();
    }
    if (currentStep === 'timing') {
      // Save time settings to localStorage (already done via setTimeSettings)
    }
    if (currentStep === 'generate' && !generationResult) {
      // Don't advance — user must click "Generate" first
      return;
    }
    goNext();
  }, [currentStep, saveRoundsToDb, saveBahnenToDb, generationResult, goNext]);

  // Load Durchgang data when arriving at step 'generate'
  useEffect(() => {
    if (currentStep === 'generate' && durchgangData.length === 0) {
      loadDurchgangData();
    }
  }, [currentStep, durchgangData.length, loadDurchgangData]);

  // Reset wizard state when re-opened
  const reset = useCallback(() => {
    setCurrentStep('startTime');
    setGenerationResult(null);
    setGenerationError(null);
    setDurchgangData([]);
    setStartAssignments({});
    setSavingRounds(false);
    setSavingBahnen(false);
    setMinMaxRound(1);
  }, []);

  return {
    // Navigation
    currentStep,
    setCurrentStep,
    goNext: handleNext,
    goBack,
    isFirstStep,
    isLastStep,
    reset,

    // Step 1 — per-Durchgang start times (saved to DB in generate step)
    durchgangStartTimes,
    setDurchgangStartTime,

    // Step 2 (timeSettings handled by parent via props)
    timeSettings,
    setTimeSettings,

    // Step 3
    pendingRounds,
    setCompetitionRound,
    maxRound,
    addDurchgang,
    savingRounds,

    // Step 4
    pendingBahnen,
    setCompetitionBahn,
    savingBahnen,

    // Step 5
    durchgangData,
    loadingDurchgangData,
    startAssignments,
    setStartAssignment,
    autoAssignStartPositions,
    generating,
    generateRoundRobin,
    generationError,

    // Step 6
    generationResult,

    onClose,
  };
}
