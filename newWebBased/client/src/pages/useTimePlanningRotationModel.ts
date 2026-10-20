import { useEffect, useMemo, useState } from "react";
import { apiPut, invalidateCache } from "../utils/api";
import { squadBelongsToRound, squadMatchesCompetition } from "./TimePlanning/rotationUtils";
import type {
  Bahn,
  Competition,
  CompetitionWithSquads,
  Device,
  RotationEntry,
  Squad,
  TimePlanningRotationProps,
} from "./TimePlanningRotation.types";

export function generateRoundRobinSchedule(
  squads: Squad[],
  devices: Device[],
): RotationEntry[][] {
  if (!squads || !Array.isArray(squads) || squads.length === 0) {
    console.warn("[generateRoundRobinSchedule] Invalid squads:", squads);
    return [];
  }
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    console.warn("[generateRoundRobinSchedule] Invalid devices:", devices);
    return [];
  }

  const numSquads = squads.length;
  const numDevices = devices.length;
  const schedule: RotationEntry[][] = [];

  for (let rotation = 0; rotation < numDevices; rotation++) {
    const round: RotationEntry[] = [];
    for (let squadIdx = 0; squadIdx < numSquads; squadIdx++) {
      const deviceIdx = (squadIdx + rotation) % numDevices;
      round.push({
        squad: squads[squadIdx].name,
        device: devices[deviceIdx].name,
        rotation: rotation + 1,
      });
    }
    schedule.push(round);
  }

  return schedule;
}

export function buildBahnenForRound(
  competitions: Competition[],
  squads: Squad[],
  round: number,
  manualBahnen: number[] = [],
): Bahn[] {
  const currentRoundCompetitions = competitions.filter((comp) => (comp.round || 1) === round);
  const compIds = new Set(currentRoundCompetitions.map((c) => c.id));
  const currentRoundSquads = squads.filter((s) => squadBelongsToRound(s, compIds));

  const bahnMap = new Map<number, CompetitionWithSquads[]>();

  currentRoundCompetitions.forEach((comp) => {
    const bahn = comp.int_bahn;
    if (!bahn || bahn <= 0) {
      return;
    }

    const squadsForComp = currentRoundSquads.filter((s) => squadMatchesCompetition(s, comp.id));
    const competitionWithSquads: CompetitionWithSquads = {
      competition: comp,
      squads: squadsForComp,
    };

    if (!bahnMap.has(bahn)) {
      bahnMap.set(bahn, []);
    }
    bahnMap.get(bahn)!.push(competitionWithSquads);
  });

  const laneNumbers = new Set<number>([...Array.from(bahnMap.keys()), ...manualBahnen]);
  if (laneNumbers.size === 0) {
    laneNumbers.add(1);
  }

  return Array.from(laneNumbers)
    .map((bahnNumber) => ({
      bahnNumber,
      competitions: bahnMap.get(bahnNumber) || [],
    }))
    .sort((a, b) => a.bahnNumber - b.bahnNumber);
}

export function useTimePlanningRotationModel({
  competitions,
  onDataChange,
  onSelectedRoundChange,
  selectedRound,
  squads,
}: TimePlanningRotationProps) {
  const [bahnen, setBahnen] = useState<Bahn[]>([]);
  const [manualBahnenByRound, setManualBahnenByRound] = useState<Record<number, number[]>>({});
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [draggedCompetition, setDraggedCompetition] = useState<{
    competitionWithSquads: CompetitionWithSquads;
    fromBahn: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalSelectedRound, setInternalSelectedRound] = useState<number>(1);

  const activeSelectedRound = selectedRound ?? internalSelectedRound;

  const setActiveSelectedRound = (round: number) => {
    if (onSelectedRoundChange) {
      onSelectedRoundChange(round);
      return;
    }
    setInternalSelectedRound(round);
  };

  const competitionsByRound = useMemo(() => {
    const grouped = new Map<number, TimePlanningRotationProps["competitions"]>();
    competitions.forEach((comp) => {
      const round = comp.round || 1;
      if (!grouped.has(round)) {
        grouped.set(round, []);
      }
      grouped.get(round)!.push(comp);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, comps]) => ({ round, competitions: comps }));
  }, [competitions]);

  useEffect(() => {
    if (competitionsByRound.length === 0) {
      return;
    }

    const hasActiveRound = competitionsByRound.some(({ round }) => round === activeSelectedRound);
    if (hasActiveRound) {
      return;
    }

    setActiveSelectedRound(competitionsByRound[0].round);
  }, [competitionsByRound, activeSelectedRound]);

  const currentRoundCompetitions = useMemo(
    () => competitions.filter((comp) => (comp.round || 1) === activeSelectedRound),
    [competitions, activeSelectedRound],
  );

  const currentRoundUnassignedCompetitions = useMemo(
    () => currentRoundCompetitions.filter((comp) => !comp.int_bahn || comp.int_bahn <= 0),
    [currentRoundCompetitions],
  );

  const currentRoundSquads = useMemo(() => {
    const compIds = new Set(currentRoundCompetitions.map((c) => c.id));
    return squads.filter((s) => squadBelongsToRound(s, compIds));
  }, [squads, currentRoundCompetitions]);

  useEffect(() => {
    if (!currentRoundCompetitions.length) {
      setBahnen([]);
      return;
    }
    const manualBahnen = manualBahnenByRound[activeSelectedRound] || [];
    const nextBahnen = buildBahnenForRound(
      competitions,
      squads,
      activeSelectedRound,
      manualBahnen,
    );
    setBahnen(nextBahnen);
  }, [currentRoundCompetitions, currentRoundSquads, manualBahnenByRound, activeSelectedRound, competitions, squads]);

  useEffect(() => {
    if (bahnen.length === 0) {
      setSelectedLane(null);
      return;
    }

    if (selectedLane === null || !bahnen.some((b) => b.bahnNumber === selectedLane)) {
      setSelectedLane(bahnen[0].bahnNumber);
    }
  }, [bahnen, selectedLane]);

  const handleAddBahn = () => {
    const currentMaxBahn = bahnen.length > 0 ? Math.max(...bahnen.map((b) => b.bahnNumber)) : 1;
    const nextBahn = currentMaxBahn + 1;

    setManualBahnenByRound((prev) => {
      const roundLanes = prev[activeSelectedRound] || [];
      if (roundLanes.includes(nextBahn)) {
        return prev;
      }
      return {
        ...prev,
        [activeSelectedRound]: [...roundLanes, nextBahn],
      };
    });
    setSelectedLane(nextBahn);
  };

  const handleDragStart = (competitionWithSquads: CompetitionWithSquads, fromBahn: number | null) => {
    setDraggedCompetition({ competitionWithSquads, fromBahn });
  };

  const handleDrop = async (toBahn: number | null) => {
    if (!draggedCompetition) {
      return;
    }

    const roundBeforeDrop = activeSelectedRound;

    setLoading(true);
    try {
      const comp = draggedCompetition.competitionWithSquads.competition;
      const currentLane = comp.int_bahn ?? null;

      if (currentLane === toBahn) {
        setDraggedCompetition(null);
        return;
      }

      await apiPut(`/time-planning/competition/${comp.id}/bahn`, {
        bahn: toBahn,
      });

      invalidateCache("/time-planning");

      if (onDataChange) {
        await onDataChange();
        setActiveSelectedRound(roundBeforeDrop);
      }
    } catch (e) {
      console.error("[Bahn-Assignment] Error during API call:", e);
      alert("Fehler beim Speichern der Bahn-Zuordnung!");
    } finally {
      setDraggedCompetition(null);
      setLoading(false);
    }
  };

  const selectedLaneData = selectedLane
    ? bahnen.find((b) => b.bahnNumber === selectedLane) || null
    : null;

  return {
    activeSelectedRound,
    bahnen,
    competitionsByRound,
    currentRoundSquads,
    currentRoundUnassignedCompetitions,
    handleAddBahn,
    handleDragStart,
    handleDrop,
    loading,
    selectedLane,
    selectedLaneData,
    setActiveSelectedRound,
    setSelectedLane,
  };
}