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

const LS_LABELS_KEY = (eventId: string) => `time-planning-wizard-labels-${eventId}`;

interface StoredLabels {
  sessionLabels: Record<number, string>;
  bahnLabels: Record<number, string>;
}

function loadLabels(eventId: string): StoredLabels {
  try {
    const raw = localStorage.getItem(LS_LABELS_KEY(eventId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sessionLabels: {}, bahnLabels: {} };
}

function saveLabels(eventId: string, labels: StoredLabels) {
  try {
    localStorage.setItem(LS_LABELS_KEY(eventId), JSON.stringify(labels));
  } catch { /* ignore */ }
}

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

  // ── Step 1: Start time ───────────────────────────────────────────────────
  const [startTime, setStartTime] = useState<string>('08:00');

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
    for (const c of competitions) if (c.int_bahn != null) m[c.id] = c.int_bahn;
    return m;
  });

  const [sessionLabels, setSessionLabels] = useState<Record<number, string>>({});
  const [bahnLabels, setBahnLabels] = useState<Record<number, string>>({});

  useEffect(() => {
    const { sessionLabels: sl, bahnLabels: bl } = loadLabels(eventId);
    setSessionLabels(sl);
    setBahnLabels(bl);
  }, [eventId]);

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

  // Derived max round
  const maxRound = Math.max(1, ...Object.values(pendingRounds));

  const setCompetitionRound = useCallback((compId: number, round: number) => {
    setPendingRounds(prev => ({ ...prev, [compId]: round }));
  }, []);

  const setCompetitionBahn = useCallback((compId: number, bahn: number) => {
    setPendingBahnen(prev => ({ ...prev, [compId]: bahn }));
  }, []);

  const setSessionLabel = useCallback((session: number, label: string) => {
    setSessionLabels(prev => {
      const next = { ...prev, [session]: label };
      saveLabels(eventId, { sessionLabels: next, bahnLabels });
      return next;
    });
  }, [eventId, bahnLabels]);

  const setBahnLabel = useCallback((bahn: number, label: string) => {
    setBahnLabels(prev => {
      const next = { ...prev, [bahn]: label };
      saveLabels(eventId, { sessionLabels, bahnLabels: next });
      return next;
    });
  }, [eventId, sessionLabels]);

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
  }, [eventId, durchgangData, startAssignments, onRefetch]);

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

    // Step 1
    startTime,
    setStartTime,

    // Step 2 (timeSettings handled by parent via props)
    timeSettings,
    setTimeSettings,

    // Step 3
    pendingRounds,
    setCompetitionRound,
    maxRound,
    sessionLabels,
    setSessionLabel,
    savingRounds,

    // Step 4
    pendingBahnen,
    setCompetitionBahn,
    bahnLabels,
    setBahnLabel,
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
