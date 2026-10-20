/**
 * Custom hook for all data fetching in the Jury Portal.
 * 
 * Extracted from JuryPortal.tsx for Separation of Concerns.
 * Handles: events, squads, devices/disciplines, participants, discipline fields, jury results.
 */

import { useState, useEffect, useMemo } from 'react';
import { getDisciplineIcon } from '../../../utils/iconUtils';
import { isEventOnDate } from '../../../utils/eventUtils';
import { normalizeScoreInput } from '../../../utils/scoreFormatter';
import { getScoreForParticipant, shouldClearJuryResults } from '../../../utils/navigationHelper';
import { getBuiltInFormulaInitialValues } from '@turnfix/shared';
import { computeEffectiveParticipantScore } from '../../../utils/effectiveParticipantScore';
import { computeEffectiveJuryResults } from '../../../utils/effectiveJuryResults';
import { excludeNonStartingParticipants } from '../../../utils/participantVisibility';
import type { Participant, Squad, Device, DisciplineField, Competition, JuryStatus } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseJuryDataReturn {
  // Data
  events: any[];
  filteredEvents: any[];
  squads: Squad[];
  devices: Device[];
  participants: Participant[];
  competitions: Competition[];
  disciplineFields: DisciplineField[];
  loadedJuryResults: Record<string, number>;
  formulaFieldValues: Record<string, number>;
  currentParticipant: Participant | undefined;
  statuses: JuryStatus[];

  // State
  selectedEvent: number | null;
  selectedSquad: Squad | null;
  selectedDevice: Device | null;
  currentParticipantIndex: number;
  score: string;
  loading: boolean;
  filterToday: boolean;

  // Setters
  setSelectedEvent: (id: number | null) => void;
  setSelectedSquad: (squad: Squad | null) => void;
  setSelectedDevice: (device: Device | null) => void;
  setCurrentParticipantIndex: (index: number) => void;
  setScore: (score: string) => void;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setLoading: (loading: boolean) => void;
  setFilterToday: (filter: boolean) => void;
  setFormulaFieldValues: (values: Record<string, number>) => void;
  setLoadedJuryResults: (results: Record<string, number>) => void;
}

export function useJuryData(): UseJuryDataReturn {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(0);
  const [score, setScore] = useState<string>('');

  // Real data states
  const [events, setEvents] = useState<any[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);

  // Formula-related states
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [formulaFieldValues, setFormulaFieldValues] = useState<Record<string, number>>({});
  const [loadedJuryResults, setLoadedJuryResults] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<JuryStatus[]>([]);

  // Auto-filter settings - persist in localStorage
  const [filterToday, setFilterToday] = useState<boolean>(() => {
    const saved = localStorage.getItem('juryPortal_filterToday');
    return saved !== null ? saved === 'true' : true; // Default: enabled
  });

  // Fetch available status options once on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/statuses?limit=100`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data?.statuses) ? data.statuses : (Array.isArray(data) ? data : []);
        const mapped = list
          .filter((s: any) => s && (s.id || s.int_statusid))
          .map((s: any) => ({
            id: Number(s.id ?? s.int_statusid),
            name: String(s.name ?? s.var_name ?? ''),
            colorCode: String(s.colorCode ?? s.ary_colorcode ?? '{128,128,128}')
          }));
        setStatuses(mapped);
      })
      .catch(() => {});
  }, []);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/events?limit=10000`);
        const data = await response.json();

        let eventsArray: any[] = [];
        if (Array.isArray(data)) {
          eventsArray = data;
        } else if (data && Array.isArray(data.events)) {
          eventsArray = data.events;
        } else if (data && data.data && Array.isArray(data.data)) {
          eventsArray = data.data;
        }

        console.log('Events API response:', data);
        console.log('Processed events array:', eventsArray);
        setEvents(eventsArray);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on today filter setting
  const filteredEvents = filterToday
    ? events.filter(event => isEventOnDate(event))
    : events;

  // Save filter preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('juryPortal_filterToday', filterToday.toString());
  }, [filterToday]);

  // Fetch squads when event is selected
  useEffect(() => {
    const fetchSquads = async () => {
      if (!selectedEvent) return;

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/squad-management?eventId=${selectedEvent}`);
        const data = await response.json();

        console.log('Squad Management API response:', data);

        const formattedSquads = (data?.squads || [])
          .filter((squad: any) => squad.participantCount > 0)
          .map((squad: any) => ({
            id: squad.id,
            name: squad.name,
            participants: squad.participants || []
          }));

        console.log('Processed squads:', formattedSquads);
        setSquads(formattedSquads);
      } catch (error) {
        console.error('Error fetching squads:', error);
        setSquads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSquads();
  }, [selectedEvent]);

  // Fetch devices (disciplines) when squad is selected
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedEvent || !selectedSquad) return;

      try {
        setLoading(true);
        console.log('🔍 JURY: Loading disciplines for event:', selectedEvent, 'squad:', selectedSquad.name);

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Load all competitions for the event
        const competitionsData = await fetch(`${API_BASE_URL}/competitions?eventId=${selectedEvent}`);
        const competitionsResponse = await competitionsData.json();
        await delay(100);
        console.log('🔍 JURY: Loaded competitions:', competitionsResponse);

        // Load all disciplines from all competitions
        let allDisciplines: any[] = [];
        const disciplineToCompetitionMap = new Map<number | string, number>();

        console.log('🔍 JURY DEBUG: Starting discipline loading for competitions:', competitionsResponse?.map((c: any) => ({ id: c.id, name: c.name })));

        for (const competition of competitionsResponse || []) {
          try {
            await delay(50);
            console.log(`🔍 JURY: Loading disciplines for competition ${competition.id} (${competition.name})`);
            const disciplinesResponse = await fetch(`${API_BASE_URL}/competitions/${competition.id}/disciplines`);
            const disciplinesData = await disciplinesResponse.json();
            const competitionDisciplines = disciplinesData.disciplines || [];

            console.log(`🔍 JURY: Competition ${competition.id} returned ${competitionDisciplines.length} disciplines:`,
              competitionDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })));

            competitionDisciplines.forEach((discipline: any) => {
              const disciplineKey = discipline.int_disziplinid || discipline.var_name;
              disciplineToCompetitionMap.set(disciplineKey, competition.id);
              console.log(`🔍 JURY: Mapped discipline "${discipline.var_name}" (ID: ${discipline.int_disziplinid}) to competition ${competition.id}`);
            });

            allDisciplines = [...allDisciplines, ...competitionDisciplines];
          } catch (error) {
            console.error(`❌ JURY: Error loading disciplines for competition ${competition.id}:`, error);
          }
        }

        console.log('🔍 JURY: Final discipline-to-competition mapping:', Array.from(disciplineToCompetitionMap.entries()));

        // Remove duplicate disciplines
        const uniqueDisciplines = allDisciplines.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(d =>
            (d.int_disziplinid && current.int_disziplinid && d.int_disziplinid === current.int_disziplinid) ||
            (d.var_name === current.var_name && d.int_disziplinid === current.int_disziplinid)
          );
          if (existingIndex === -1) {
            acc.push(current);
          }
          return acc;
        }, []);

        console.log('🔍 JURY: All loaded disciplines (before dedup):', allDisciplines);
        console.log('🔍 JURY: Unique disciplines (after dedup):', uniqueDisciplines);

        // Filter disciplines by the squad's assigned competitions
        const squadParticipants = selectedSquad.participants || [];
        console.log('🔍 JURY: Squad participants for filtering:', squadParticipants.length);

        if (squadParticipants.length === 0) {
          console.log('🔍 JURY: No participants in squad, showing no devices');
          setDevices([]);
          return;
        }

        const participantCompetitionIds = new Set<number>();
        squadParticipants.forEach((participant: any) => {
          if (participant.competitions && Array.isArray(participant.competitions)) {
            participant.competitions.forEach((comp: any) => {
              if (comp.id) {
                participantCompetitionIds.add(comp.id);
              }
            });
          }
        });

        console.log('🔍 JURY: Competitions from squad participants:', Array.from(participantCompetitionIds));

        const availableDisciplineIds = new Set<number>();
        competitionsResponse.forEach((competition: any) => {
          if (participantCompetitionIds.has(competition.id)) {
            console.log('🔍 JURY: Found matching competition:', competition.id, competition.name);
            if (competition.disciplines && Array.isArray(competition.disciplines)) {
              competition.disciplines.forEach((discipline: any) => {
                const disciplineId = discipline.int_disziplinid || discipline.disciplineId;
                if (disciplineId) {
                  availableDisciplineIds.add(disciplineId);
                  console.log('🔍 JURY: Added discipline ID:', disciplineId);
                }
              });
            }
          }
        });

        console.log('🔍 JURY: Available discipline IDs for squad:', Array.from(availableDisciplineIds));

        // Filter disciplines
        const filteredDisciplines = uniqueDisciplines.filter((discipline: any) => {
          return availableDisciplineIds.has(discipline.int_disziplinid);
        });

        console.log('🔍 JURY: Filtered disciplines:', filteredDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })));

        // Transform to Device format
        const mapDisciplineToDevice = (discipline: any): Device => {
          const iconUrl = getDisciplineIcon(discipline.var_name, discipline.var_icon);
          return {
            id: discipline.int_disziplinid,
            name: discipline.var_name,
            disciplineId: discipline.int_disziplinid,
            icon: '',
            iconPath: iconUrl,
            maxScore: discipline.maxScore || 0,
            int_berechnung: discipline.int_berechnung,
            var_maske: discipline.var_maske,
            var_formel: discipline.var_formel,
            int_formelid: discipline.int_formelid
          };
        };

        const devicesList = filteredDisciplines.map(mapDisciplineToDevice);
        console.log('🔍 JURY: Final devices list:', devicesList);

        // Fallback: if no disciplines found, show all unique disciplines
        if (devicesList.length === 0) {
          console.log('🔍 JURY: No filtered disciplines found, using fallback to all unique disciplines');
          const fallbackDevices = uniqueDisciplines.map(mapDisciplineToDevice);
          setDevices(fallbackDevices);
          if (!selectedDevice && fallbackDevices.length > 0) {
            console.log('🔵 JURY: Auto-selecting first device (fallback):', fallbackDevices[0].name);
            setSelectedDevice(fallbackDevices[0]);
          }
        } else {
          setDevices(devicesList);
          if (!selectedDevice && devicesList.length > 0) {
            console.log('🔵 JURY: Auto-selecting first device:', devicesList[0].name);
            setSelectedDevice(devicesList[0]);
          }
        }

        setCompetitions(competitionsResponse || []);
      } catch (error) {
        console.error('❌ JURY: Error fetching devices:', error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [selectedEvent, selectedSquad]);

  // Fetch participants when squad and device are selected
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!selectedEvent || !selectedSquad || !selectedDevice) return;

      try {
        setLoading(true);
        const rawSquadParticipants = excludeNonStartingParticipants(selectedSquad.participants || []);
        console.log('Raw squad participants (may contain duplicates):', rawSquadParticipants.length);

        // Deduplicate based on participant ID
        const uniqueSquadParticipants = rawSquadParticipants.reduce((acc: any[], current: any) => {
          const exists = acc.find((p: any) => p.id === current.id);
          if (!exists) {
            acc.push(current);
          } else {
            console.log(`⚠️ JURY: Skipping duplicate participant from squad: ${current.firstname} ${current.lastname} (ID: ${current.id})`);
          }
          return acc;
        }, []);

        console.log('Unique squad participants (after dedup):', uniqueSquadParticipants.length);

        let scores: any[] = [];
        try {
          const scoresResponse = await fetch(`${API_BASE_URL}/scores?eventId=${selectedEvent}&limit=1000`);
          if (scoresResponse.ok) {
            const scoresData = await scoresResponse.json();
            scores = scoresData?.results || [];
          }
        } catch (error) {
          console.warn('⚠️ JURY: Could not fetch existing scores:', error);
        }

        // Format participants for scoring and fetch existing scores
        const formattedParticipantsPromises = uniqueSquadParticipants.map(async (participant: any, index: number) => {
          let existingScore: number | undefined = undefined;
          let wertungenId = null;
          try {
            console.log(`🔍 JURY: Checking existing scores for participant ${participant.id} and discipline ${selectedDevice?.disciplineId}`);
            const existingScoreRecord = scores.find((s: any) => {
              return s.participantId === participant.id && s.disciplineId === selectedDevice?.disciplineId;
            });
            if (existingScoreRecord) {
                const effectiveScore = computeEffectiveParticipantScore(existingScoreRecord);
                existingScore = effectiveScore === null ? undefined : effectiveScore;
              wertungenId = existingScoreRecord.id;
              console.log(`✅ JURY: Found existing score for participant ${participant.id}:`, existingScore, 'wertungenId:', wertungenId);
            }
          } catch (error) {
            console.warn('⚠️ JURY: Could not fetch existing scores for participant:', participant.id, error);
          }

          return {
            id: participant.id,
            participantId: participant.id,
            name: participant.firstname && participant.lastname
              ? `${participant.firstname} ${participant.lastname}`
              : participant.firstName && participant.lastName
                ? `${participant.firstName} ${participant.lastName}`
                : participant.name || 'Unknown Participant',
            firstName: participant.firstname || participant.firstName || '',
            lastName: participant.lastname || participant.lastName || '',
            club: participant.clubName || participant.club || 'Unknown Club',
            clubName: participant.clubName || participant.club || 'Unknown Club',
            startNumber: participant.startNumber || (index + 1),
            status: (existingScore !== null && existingScore !== undefined) ? 'completed' : (index === 0 ? 'current' : 'pending') as 'completed' | 'current' | 'pending',
            currentScore: existingScore,
            wertungenId: wertungenId,
            statusId: null as number | null,
            statusName: null as string | null,
            statusColor: null as string | null,
            // Preserve competition assignments from squad data so findCompetitionId()
            // can correctly pick the participant's own competition (Priority 1)
            assignedCompetitions: (participant.competitions || [])
              .map((c: any) => typeof c === 'object' ? Number(c.id) : Number(c))
              .filter((id: number) => id > 0),
          };
        });

        const formattedParticipants = await Promise.all(formattedParticipantsPromises);

        // Merge participant status data
        try {
          const statusRes = await fetch(`${API_BASE_URL}/participant-status?eventId=${selectedEvent}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            const statusMap: Record<number, { statusId: number | null; statusName: string | null; statusColor: string | null }> = {};
            (statusData.participants || []).forEach((s: any) => {
              statusMap[s.participantId] = {
                statusId: s.statusId ?? null,
                statusName: s.statusName ?? null,
                statusColor: s.statusColor ?? null,
              };
            });
            formattedParticipants.forEach(p => {
              const rec = statusMap[p.participantId];
              if (rec) {
                p.statusId = rec.statusId;
                p.statusName = rec.statusName;
                p.statusColor = rec.statusColor;
              }
            });
          }
        } catch {/* status load failure is non-fatal */}

        console.log('🟢 JURY: Formatted participants for scoring with scores:', formattedParticipants);
        setParticipants(formattedParticipants);

        // Set current participant to first uncompleted
        const firstUncompletedIndex = formattedParticipants.findIndex(
          p => p.currentScore === null || p.currentScore === undefined
        );
        const selectedIndex = firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0;
        console.log('🔵 JURY: Setting currentParticipantIndex to', selectedIndex);
        setCurrentParticipantIndex(selectedIndex);
      } catch (error) {
        console.error('Error processing participants:', error);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [selectedEvent, selectedSquad, selectedDevice]);

  // Load discipline fields when device is selected
  useEffect(() => {
    const loadDisciplineFields = async () => {
      if (!selectedDevice) {
        setDisciplineFields([]);
        return;
      }

      try {
        console.log('🔵 JURY: Loading discipline fields for discipline', selectedDevice.disciplineId);
        const response = await fetch(`${API_BASE_URL}/discipline-fields`);
        const allFields = await response.json();

        console.log('🔵 JURY: Total fields loaded:', allFields.length);

        const relevantFields = allFields.filter((f: any) =>
          f.disciplineId === selectedDevice.disciplineId && f.enabled
        );

        const fields: DisciplineField[] = relevantFields.map((f: any) => ({
          id: f.id,
          disciplineId: f.disciplineId,
          name: f.name,
          sortOrder: f.sortOrder,
          enabled: f.enabled,
          // FIX: API returns isFinalScore/isStartingScore, NOT isEndValue/isStartValue
          isEndValue: f.isFinalScore || false,
          isStartValue: f.isStartingScore || false
        }));

        fields.sort((a, b) => a.sortOrder - b.sortOrder);
        setDisciplineFields(fields);
        console.log('🔵 JURY: Loaded', fields.length, 'discipline fields');
      } catch (error) {
        console.error('❌ JURY: Error loading discipline fields:', error);
        setDisciplineFields([]);
      }
    };

    loadDisciplineFields();
  }, [selectedDevice]);

  // Memoize currentParticipant
  const currentParticipant = useMemo(() => {
    return participants[currentParticipantIndex];
  }, [participants, currentParticipantIndex]);

  // Synchronous built-in formula values — avoids race condition where FormulaInput
  // mounts with initialValues={} before the async loadJuryResults effect has run.
  // Uses the TDD-tested pure function computeEffectiveJuryResults.
  // KEY FIX: Built-in formulas ("1*x") must use currentScore even when
  // disciplineFields exist (e.g. Boden has Wert/Abzug/Endwert fields).
  const effectiveLoadedJuryResults = useMemo(() => {
    return computeEffectiveJuryResults(
      currentParticipant,
      selectedDevice?.var_formel || null,
      disciplineFields.length,
      loadedJuryResults
    );
  }, [selectedDevice?.var_formel, disciplineFields.length, currentParticipant, loadedJuryResults]);

  // Load jury results when participant changes
  useEffect(() => {
    const loadJuryResults = async () => {
      console.log('🔵 JURY: loadJuryResults useEffect triggered', {
        hasCurrentParticipant: !!currentParticipant,
        currentParticipantId: currentParticipant?.participantId,
        hasSelectedDevice: !!selectedDevice,
        selectedDeviceId: selectedDevice?.disciplineId,
        disciplineFieldsLength: disciplineFields.length,
        wertungenId: currentParticipant?.wertungenId,
        disciplineFieldsDetails: disciplineFields.map(f => ({ id: f.id, name: f.name, sortOrder: f.sortOrder })),
        participantsLength: participants.length,
        currentParticipantIndex
      });

      if (!currentParticipant || !selectedDevice || disciplineFields.length === 0) {
        console.log('🔵 JURY: Skipping jury results load - missing prerequisites');

        // For built-in formula disciplines (e.g., "1*x", "20-x") there are no
        // discipline fields, but we still need to map the stored raw score back
        // to the formula variable so FormulaInput can display it.
        if (currentParticipant && selectedDevice?.var_formel && disciplineFields.length === 0) {
          const builtInValues = getBuiltInFormulaInitialValues(
            selectedDevice.var_formel,
            currentParticipant.currentScore,
            disciplineFields.length
          );
          if (Object.keys(builtInValues).length > 0) {
            console.log('🔵 JURY: Built-in formula mapping:', builtInValues);
            setLoadedJuryResults(builtInValues);
            setFormulaFieldValues(builtInValues);
            return;
          }
        }

        setLoadedJuryResults({});
        setFormulaFieldValues({});
        return;
      }

      if (!currentParticipant.wertungenId) {
        console.log('🔵 JURY: No wertungenId for participant, clearing jury results');
        setLoadedJuryResults({});
        setFormulaFieldValues({});
        return;
      }

      try {
        console.log('🔵 JURY: Loading jury results for wertungenId', currentParticipant.wertungenId, 'discipline', selectedDevice.disciplineId);
        const response = await fetch(
          `${API_BASE_URL}/jury-results?participantId=${currentParticipant.wertungenId}&disciplineId=${selectedDevice.disciplineId}`
        );
        const data = await response.json();

        console.log('🔵 JURY: Loaded jury results:', data);

        if (data.results && Array.isArray(data.results)) {
          const resultsMap: Record<string, number> = {};

          // FIX: Map results by disciplineFieldId instead of fragile positional index.
          // Build the same input-field list used by saveFormulaFields (excludes Endwert/StartValue).
          const inputFields = disciplineFields
            .filter(f => !f.isEndValue && !f.isStartValue)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const nonFinalResults = data.results.filter((r: any) => r.isFinalScore === false);

          console.log('🔵 JURY: Filtered results (non-final only):', nonFinalResults);
          console.log('🔵 JURY: Input fields for symbol mapping:', inputFields.map(f => ({ id: f.id, name: f.name })));

          for (const result of nonFinalResults) {
            // Find this result's discipline field in the ordered input fields
            const fieldIndex = inputFields.findIndex(f => f.id === result.disciplineFieldId);
            if (fieldIndex === -1) continue; // Result for a non-input field — skip

            const symbol = String.fromCharCode(65 + fieldIndex);
            if (result.performance !== null && result.performance !== undefined) {
              resultsMap[symbol] = result.performance;
              console.log(`🔵 JURY: Mapping ${symbol} = ${result.performance} (fieldId=${result.disciplineFieldId}, ${result.fieldName})`);
            }
          }

          console.log('🔵 JURY: Mapped jury results to symbols:', resultsMap);
          setLoadedJuryResults(resultsMap);
        }
      } catch (error) {
        console.error('❌ JURY: Error loading jury results:', error);
      }
    };

    loadJuryResults();
  }, [selectedDevice, disciplineFields, participants, currentParticipantIndex]);

  // Update score input when current participant changes
  useEffect(() => {
    const existingScore = getScoreForParticipant(currentParticipant);
    if (existingScore !== '') {
      const normalized = normalizeScoreInput(
        existingScore,
        selectedDevice?.int_berechnung || 2
      );
      setScore(normalized);
    } else {
      setScore('');
    }

    // Clear formula state when navigating to a participant without saved results
    if (shouldClearJuryResults(currentParticipant)) {
      setLoadedJuryResults({});
      setFormulaFieldValues({});
    }
  }, [currentParticipantIndex, selectedDevice?.int_berechnung, participants]);

  return {
    events,
    filteredEvents,
    squads,
    devices,
    participants,
    competitions,
    disciplineFields,
    loadedJuryResults: effectiveLoadedJuryResults,
    formulaFieldValues,
    currentParticipant,
    statuses,

    selectedEvent,
    selectedSquad,
    selectedDevice,
    currentParticipantIndex,
    score,
    loading,
    filterToday,

    setSelectedEvent,
    setSelectedSquad,
    setSelectedDevice,
    setCurrentParticipantIndex,
    setScore,
    setParticipants,
    setLoading,
    setFilterToday,
    setFormulaFieldValues,
    setLoadedJuryResults,
  };
}
