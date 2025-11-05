/**
 * TimePlanning Page - Refactored Version
 * Point 124: Separation of Concerns - Modular Architecture
 * 
 * Reduced from 1,232 lines → ~500 lines (orchestration)
 * Components extracted: SessionsView, GanttView, TimeSettingsModal, HelpPanels
 * Hooks extracted: useDragDrop, useTimeCalculation
 * Complex logic kept inline: calculateDeviceSchedule, groupCompetitionsBySessions, loadData
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Context & Utils
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiPut, invalidateCache } from '@/utils/api';

// Templates & Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import UnifiedModal from '@/components/UnifiedModal';
import TimePlanningRotation, { TimePlanningRotationRef } from '../TimePlanningRotation';

// Local Components & Hooks
import { SessionsView, GanttView, TimeSettingsModal, HelpPanels } from './components';
import SquadStartDeviceEditor from './components/SquadStartDeviceEditor';
import { useDragDrop, useTimeCalculation } from './hooks';
import type { TimeSettings, Competition, Squad, DeviceSchedule, SessionGroup } from './TimePlanning.types';
import { DEFAULT_TIME_SETTINGS } from './TimePlanning.types';

export default function TimePlanning() {
  const { t } = useTranslation();
  const { selectedEvent } = useEvent();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString();

  // ====== STATE ======
  const [loading, setLoading] = useState(true);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [squadDisciplines, setSquadDisciplines] = useState<any[]>([]);
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(DEFAULT_TIME_SETTINGS);
  
  // Cache for competitionId -> disciplines (useRef to persist across renders)
  const disciplineCache = useRef<{ [competitionId: number]: any[] }>({});
  
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([]);
  const [extraRounds, setExtraRounds] = useState<number[]>([]);
  const [deviceSchedule, setDeviceSchedule] = useState<DeviceSchedule[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'sessions' | 'gantt' | 'timeline' | 'rotation'>('sessions');
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingStartDevices, setEditingStartDevices] = useState<{ 
    competitionId: number; 
    competitionName: string; 
    round: number 
  } | null>(null);
  
  // Ref to TimePlanningRotation child component (Point 121: call addBahn from parent)
  const rotationRef = useRef<TimePlanningRotationRef>(null);

  // Gantt chart time range
  const [ganttStartTime, setGanttStartTime] = useState('07:00');
  const [ganttEndTime, setGanttEndTime] = useState('18:00');

  // ====== HOOKS ======
  const { addMinutesToTime, generateTimeSlots } = useTimeCalculation();
  
  const { handleDragStart, handleDragOver, handleDrop } = useDragDrop({
    onDrop: async (compId: number, newRound: number) => {
      await apiPut(`/time-planning/competition/${compId}/round`, { round: newRound });
      invalidateCache('/api/time-planning');
      refetch();
    }
  });

  // ====== DATA LOADING ======
  const refetch = () => {
    loadData();
  };

  useEffect(() => {
    if (eventId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Load competitions for the event
      const competitionsData = await apiGet(`/time-planning?eventId=${eventId}`);
      const loadedCompetitions = competitionsData.competitions || [];
      const loadedSquads = competitionsData.squads || [];
      const loadedSquadDisciplines = competitionsData.squadDisciplines || [];

      setCompetitions(loadedCompetitions);
      setSquads(loadedSquads);
      setSquadDisciplines(loadedSquadDisciplines);

      // Debug: Check if competitionIds are present
      if (typeof window !== 'undefined' && (window as any).DEBUG) {
        console.log('[TimePlanning] Loaded squads:', loadedSquads);
        console.log('[TimePlanning] First squad competitionIds:', loadedSquads[0]?.competitionIds);
      }

      // Preload discipline lists for all competitions (for fallback)
      for (const comp of loadedCompetitions) {
        if (!disciplineCache.current[comp.id]) {
          try {
            const disciplines = await apiGet(`/competitions/${comp.id}/disciplines`);
            disciplineCache.current[comp.id] = Array.isArray(disciplines) ? disciplines : (disciplines.disciplines || []);
          } catch (e) {
            // ignore error, fallback will be generic
          }
        }
      }

      // Remove extraRounds that now exist in backend data
      const backendRounds = new Set(loadedCompetitions.map((c: Competition) => c.round));
      setExtraRounds(prev => {
        const filtered = prev.filter(r => !backendRounds.has(r));
        // Only update if changed
        if (filtered.length !== prev.length) {
          groupCompetitionsBySessions(loadedCompetitions, loadedSquads, filtered);
          return filtered;
        } else {
          groupCompetitionsBySessions(loadedCompetitions, loadedSquads, prev);
          return prev;
        }
      });
    } catch (error) {
      console.error('Error loading time planning data:', error);
      // Fallback: try old API endpoints
      try {
        const competitionsData = await apiGet(`/competitions?event_id=${eventId}`);
        const squadsData = await apiGet(`/squad-management?eventId=${eventId}`);
        
        const fallbackCompetitions = competitionsData.competitions || [];
        const fallbackSquads = squadsData.squads || [];
        
        setCompetitions(fallbackCompetitions);
        setSquads(fallbackSquads);
        groupCompetitionsBySessions(fallbackCompetitions, fallbackSquads);
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== COMPLEX LOGIC (Kept Inline) ======
  
  // Group competitions by sessions and add squads
  const groupCompetitionsBySessions = (comps: Competition[], squads: Squad[], extraRoundsArg?: number[]) => {
    const sessionMap = new Map<number, Competition[]>();
    comps.forEach(comp => {
      const session = comp.round || 1;
      if (!sessionMap.has(session)) {
        sessionMap.set(session, []);
      }
      sessionMap.get(session)!.push(comp);
    });

    // Add extra empty rounds
    if (extraRoundsArg && extraRoundsArg.length > 0) {
      for (const round of extraRoundsArg) {
        if (!sessionMap.has(round)) {
          sessionMap.set(round, []);
        }
      }
    }

    const groups: SessionGroup[] = Array.from(sessionMap.entries()).map(([session, competitions]) => {
      // Find earliest start time for this session
      const startTimes = competitions
        .map(c => c.startTime)
        .filter(t => t !== null)
        .sort();
      
      // Find earliest start date for this session
      const startDates = competitions
        .map(c => c.startDate)
        .filter(d => d !== null)
        .sort();
      
      return {
        session,
        competitions,
        startTime: startTimes.length > 0 ? startTimes[0] : null,
        startDate: startDates.length > 0 ? startDates[0] : null,
        squads: squads.filter(squad => {
          const hasIds = squad.competitionIds && competitions.some(comp => 
            squad.competitionIds!.includes(comp.id)
          );
          // ALWAYS log for debugging (temporarily)
          console.log(`[TimePlanning] Session ${session}, Squad "${squad.name}":`, {
            competitionIds: squad.competitionIds,
            sessionCompetitionIds: competitions.map(c => c.id),
            included: hasIds
          });
          return hasIds;
        })
      };
    }).sort((a, b) => a.session - b.session);

    setSessionGroups(groups);
  };

  // Calculate device schedule for a session
  const calculateDeviceSchedule = (sessionGroup: SessionGroup): DeviceSchedule[] => {
    const schedule: DeviceSchedule[] = [];
    if (!sessionGroup.startTime) return schedule;

    // Track device occupancy by time slot
    const deviceTimeMap = new Map<string, string>(); // key: deviceName+startTime, value: squadName
    const squadTimeMap = new Map<string, string>(); // key: squadName+startTime, value: deviceName

    sessionGroup.competitions.forEach(competition => {
      const compStartTime = competition.startTime || sessionGroup.startTime!;
      const compWarmupTime = competition.warmupTime;

      // Try squadDisciplines first, then fallback to disciplineCache, then generic
      let disciplineObjs: { name: string, isFirst: boolean, order: number }[] = [];
      let debugSource = '';
      const filtered = squadDisciplines.filter(sd => sd.tfx_disziplinen && sd.tfx_wettkaempfeid === competition.id);
      if (filtered.length > 0) {
        disciplineObjs = filtered.map(sd => ({
          name: sd.tfx_disziplinen.var_name,
          isFirst: !!sd.bol_erstes_geraet,
          order: typeof sd.tfx_disziplinen.var_reihenfolge === 'number' ? sd.tfx_disziplinen.var_reihenfolge : 9999
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        debugSource = 'squadDisciplines';
      } else if (disciplineCache.current[competition.id] && disciplineCache.current[competition.id].length > 0) {
        // Use disciplineCache fallback (from /competitions/:id/disciplines)
        if (typeof window !== 'undefined' && (window as any).DEBUG) {
          // eslint-disable-next-line no-console
          console.log(`[TimePlanning][DEBUG] Full disciplineCache for competition ${competition.id} (${competition.name}):`, disciplineCache.current[competition.id]);
          // Print the first discipline object in detail for inspection
          if (disciplineCache.current[competition.id][0]) {
            // eslint-disable-next-line no-console
            console.log(`[TimePlanning][DEBUG] First discipline object for competition ${competition.id}:`, disciplineCache.current[competition.id][0]);
          }
        }
        disciplineObjs = disciplineCache.current[competition.id].map((d: any, idx: number) => ({
          name: d.var_name || d.var_disziplinname || d.name || `Device ${idx + 1}`,
          isFirst: idx === 0, // Mark first as first device (if info missing)
          order: typeof d.var_reihenfolge === 'number' ? d.var_reihenfolge : idx + 1
        }))
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        debugSource = 'disciplineCache';
      } else {
        // Fallback to generic if none found
        disciplineObjs = Array.from({ length: competition.disciplineCount }, (_, i) => ({ name: `Device ${i + 1}`, isFirst: false, order: i + 1 }));
        debugSource = 'generic';
      }
      if (typeof window !== 'undefined' && (window as any).DEBUG) {
        // eslint-disable-next-line no-console
        console.log(`[TimePlanning] Competition ${competition.id} (${competition.name}) devices from ${debugSource}:`, disciplineObjs.map(d => d.name));
      }

      sessionGroup.squads.forEach((squad, squadIndex) => {
        // Check if squad is assigned to this competition (use IDs for accuracy)
        const isAssigned = squad.competitionIds && squad.competitionIds.includes(competition.id);
        console.log(`[calculateDeviceSchedule] Competition "${competition.name}" (${competition.id}), Squad "${squad.name}":`, {
          competitionId: competition.id,
          squadCompetitionIds: squad.competitionIds,
          isAssigned,
          startTime: compStartTime,
          disciplines: disciplineObjs.length
        });
        if (!isAssigned) return;

        let currentTime = compStartTime;

        // Add warm-up phase if specified
        if (compWarmupTime) {
          const warmupKey = `${squad.name}__Warm-up Area__${compWarmupTime}`;
          if (!squadTimeMap.has(warmupKey)) {
            schedule.push({
              squadName: squad.name,
              deviceName: 'Warm-up Area',
              startTime: compWarmupTime,
              endTime: addMinutesToTime(compWarmupTime, timeSettings.warmupDurationMinutes),
              competition: competition.name,
              isWarmup: true
            });
            squadTimeMap.set(warmupKey, 'Warm-up Area');
          }
        }

        // Find starting device (where isFirst = true), or distribute squads across devices
        const startDeviceIndex = disciplineObjs.findIndex(d => d.isFirst);
        // If no start device is defined, automatically distribute squads across available devices
        // This ensures squads start at different devices and don't block each other
        const effectiveStartIndex = startDeviceIndex >= 0 ? startDeviceIndex : (squadIndex % disciplineObjs.length);
        
        console.log(`[calculateDeviceSchedule] Squad "${squad.name}" (index ${squadIndex}) starts at device index ${effectiveStartIndex} (${disciplineObjs[effectiveStartIndex]?.name})`);

        // Schedule each device rotation, starting from the squad's start device
        for (let i = 0; i < disciplineObjs.length; i++) {
          // Rotate through devices starting from the squad's start device
          const deviceIndex = (effectiveStartIndex + i) % disciplineObjs.length;
          const device = disciplineObjs[deviceIndex];
          const startTime = currentTime;
          // Calculate duration: participantCount * exerciseDurationMinutes
          const squadDuration = (squad.participantCount || 1) * timeSettings.exerciseDurationMinutes;
          const endTime = addMinutesToTime(startTime, squadDuration);
          const deviceKey = `${device.name}__${startTime}`;
          const squadKey = `${squad.name}__${startTime}`;
          
          const deviceOccupied = deviceTimeMap.has(deviceKey);
          const squadOccupied = squadTimeMap.has(squadKey);
          
          // Only schedule if device and squad are both free at this time
          if (!deviceOccupied && !squadOccupied) {
            schedule.push({
              squadName: squad.name,
              deviceName: device.name,
              startTime,
              endTime,
              competition: competition.name,
              isWarmup: false,
              isFirstDevice: device.isFirst
            });
            deviceTimeMap.set(deviceKey, squad.name);
            squadTimeMap.set(squadKey, device.name);
          } else {
            console.log(`[calculateDeviceSchedule] SKIPPED: Squad "${squad.name}" on "${device.name}" at ${startTime}`, {
              deviceOccupied,
              squadOccupied,
              deviceOccupiedBy: deviceOccupied ? deviceTimeMap.get(deviceKey) : null,
              squadOccupiedOn: squadOccupied ? squadTimeMap.get(squadKey) : null
            });
          }
          // Move to next rotation time (squadDuration + break)
          currentTime = addMinutesToTime(currentTime, squadDuration + timeSettings.breakBetweenDevicesMinutes);
        }
      });
    });

    console.log(`[calculateDeviceSchedule] Generated ${schedule.length} schedule entries:`, schedule.map(s => ({
      squad: s.squadName,
      device: s.deviceName,
      competition: s.competition,
      time: `${s.startTime}-${s.endTime}`
    })));

    return schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // ====== EVENT HANDLERS ======
  
  const saveTimeSettings = async () => {
    try {
      await apiPut(`/events/${eventId}/time-settings`, timeSettings);
      setShowTimeSettings(false);
    } catch (error) {
      console.error('Error saving time settings:', error);
    }
  };

  const generateAutomaticSchedule = () => {
    sessionGroups.forEach(group => {
      if (group.startTime) {
        const schedule = calculateDeviceSchedule(group);
        setDeviceSchedule(prevSchedule => [...prevSchedule, ...schedule]);
      }
    });
  };

  const exportTimeplan = async () => {
    if (!selectedEvent || !eventId) {
      alert(t('timePlanning.selectEventFirst'));
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { setupPDFWithHeaderFooter, addPDFHeaderFooter, getUnifiedTableStyles } = await import('../../utils/pdfUtils');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Setup PDF with header/footer
      setupPDFWithHeaderFooter(doc, selectedEvent, t('timePlanning.title'));

      let startY = 40;

      // Group by sessions (Durchgänge)
      sessionGroups.forEach((sessionGroup) => {
        // Check if we need a new page
        if (startY > 160) {
          doc.addPage();
          startY = 20;
        }

        // Session header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${t('timePlanning.round')} ${sessionGroup.session}` +
          (sessionGroup.startTime ? ` - ${t('timePlanning.startTime')}: ${sessionGroup.startTime}` : ''),
          14,
          startY
        );
        startY += 8;

        // Prepare table data
        const tableData = sessionGroup.competitions.map((comp) => {
          // Find squads for this competition
          const compSquads = squads.filter((s: any) => 
            s.competitionIds && s.competitionIds.includes(comp.id)
          );
          
          const squadNames = compSquads.map((s: any) => s.name).join(', ') || '-';
          const participantCount = compSquads.reduce((sum: number, s: any) => sum + (s.participantCount || 0), 0);

          return [
            comp.number || '-',
            comp.name,
            comp.int_bahn?.toString() || '-',
            squadNames,
            participantCount.toString(),
            comp.warmupTime || '-',
            comp.startTime || '-',
          ];
        });

        autoTable(doc, {
          head: [[
            t('timePlanning.number'),
            t('common.competition'),
            'Bahn',
            t('timePlanning.squads'),
            t('timePlanning.participants'),
            t('timePlanning.warmupTime'),
            t('timePlanning.startTime'),
          ]],
          body: tableData,
          ...getUnifiedTableStyles(),
          startY,
          margin: { left: 14, right: 14 },
        });

        startY = (doc as any).lastAutoTable.finalY + 12;
      });

      // Add header and footer
      addPDFHeaderFooter({ doc, event: selectedEvent, documentTitle: t('timePlanning.title') });
      
      // Save PDF
      doc.save(`zeitplan-${eventId}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting timeplan:', error);
      alert(t('common.error') + ': ' + (error as Error).message);
    }
  };

  const handleAddRound = async () => {
    if (!eventId) return;
    const resp = await apiPost('/time-planning/round', { eventId });
    if (resp && resp.round) {
      invalidateCache('/api/time-planning');
      setExtraRounds(prev => prev.includes(resp.round) ? prev : [...prev, resp.round]);
      groupCompetitionsBySessions(competitions, squads, [...extraRounds, resp.round]);
    }
  };

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setShowEditModal(true);
  };

  const handleSaveCompetitionTimes = async () => {
    if (!editingCompetition) return;
    
    const payload = {
      startTime: editingCompetition.startTime,
      warmupTime: editingCompetition.warmupTime
    };
    
    try {
      await apiPut(`/competitions/${editingCompetition.id}`, payload);
      invalidateCache('/competitions');
      invalidateCache('/time-planning');
      await refetch();
      setShowEditModal(false);
      setEditingCompetition(null);
    } catch (error) {
      console.error('Failed to update competition times:', error);
    }
  };

  // ====== EARLY RETURNS ======
  
  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('timePlanning.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('timePlanning.selectEventToManageTime')}</p>
        </div>
      </div>
    );
  }

  // ====== MAIN RENDER ======
  
  return (
    <EventManagementTemplate
      title={t('timePlanning.title')}
      subtitle={t('timePlanning.subtitle')}
      icon={ClockIcon}
      showEventContext={true}
      showViewToggle={false}
      showAddButton={false}
      loading={loading}
      customBelowActions={
        // Point 124a: "Durchgang hinzufügen" and "Neue Bahn" side by side
        <div className="flex space-x-2">
          <button
            onClick={handleAddRound}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <span className="text-xl mr-2">+</span>
            {t('timePlanning.addRound', 'Durchgang hinzufügen')}
          </button>
          
          {/* "Neue Bahn" Button - Only visible in rotation view */}
          {viewMode === 'rotation' && (
            <button
              onClick={() => rotationRef.current?.addBahn()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <span className="text-xl mr-2">+</span>
              {t('timePlanning.addBahn', 'Neue Bahn')}
            </button>
          )}
        </div>
      }
      customActions={[
        // View Mode Toggle - standardized like other pages
        <div key="view-toggle" className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setViewMode('sessions')}
            className={`px-3 py-2 text-sm font-medium border ${
              viewMode === 'sessions'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } rounded-l-md`}
          >
            {t('timePlanning.viewMode.sessions')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-2 text-sm font-medium border-t border-b ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } -ml-px`}
          >
            {t('timePlanning.viewMode.timeline')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('gantt')}
            className={`px-3 py-2 text-sm font-medium border-t border-b ${
              viewMode === 'gantt'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } -ml-px`}
          >
            {t('timePlanning.viewMode.gantt')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('rotation')}
            className={`px-3 py-2 text-sm font-medium border ${
              viewMode === 'rotation'
                ? 'bg-blue-600 text-white border-blue-600 z-10'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } rounded-r-md -ml-px`}
          >
            {t('timePlanning.viewMode.rotation') || 'Rotation'}
          </button>
        </div>,
        
        <button
          key="settings"
          onClick={() => setShowTimeSettings(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <Cog6ToothIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.settings')}
        </button>,
        
        <button
          key="generate"
          onClick={generateAutomaticSchedule}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.generateSchedule')}
        </button>,
        
        <button
          key="help"
          onClick={() => setShowHelp(!showHelp)}
          className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-lg ${
            showHelp
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <InformationCircleIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.help', 'Hilfe')}
        </button>,

        <button
          key="export"
          onClick={exportTimeplan}
          className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
        >
          <DocumentChartBarIcon className="h-4 w-4 mr-2" />
          {t('timePlanning.exportPDF')}
        </button>
      ]}
    >
      {/* Help Panels - Point 118: Toggleable via Help button */}
      {showHelp && <HelpPanels />}

      {/* Content based on loading state and view mode */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">{t('timePlanning.loading')}</p>
        </div>
      ) : competitions.length === 0 && squads.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('timePlanning.noData')}</h3>
          <p className="text-sm text-gray-600">{t('timePlanning.noDataDescription')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'sessions' && (
            <SessionsView
              sessionGroups={sessionGroups}
              selectedSession={selectedSession}
              setSelectedSession={setSelectedSession}
              timeSettings={timeSettings}
              handleEditCompetition={handleEditCompetition}
              handleEditStartDevices={(comp) => {
                setEditingStartDevices({
                  competitionId: comp.id,
                  competitionName: comp.name,
                  round: comp.round
                });
              }}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              calculateDeviceSchedule={calculateDeviceSchedule}
              setDeviceSchedule={setDeviceSchedule}
              setViewMode={(mode: string) => setViewMode(mode as 'sessions' | 'gantt' | 'timeline' | 'rotation')}
            />
          )}
          
          {viewMode === 'gantt' && (() => {
            // Auto-calculate device schedule if empty
            if (deviceSchedule.length === 0) {
              const allSchedules: DeviceSchedule[] = [];
              sessionGroups.forEach(group => {
                if (group.startTime) {
                  const schedule = calculateDeviceSchedule(group);
                  allSchedules.push(...schedule);
                }
              });
              if (allSchedules.length > 0) {
                setDeviceSchedule(allSchedules);
              }
            }
            
            return (
              <GanttView
                deviceSchedule={deviceSchedule}
                competitions={competitions}
                ganttStartTime={ganttStartTime}
                ganttEndTime={ganttEndTime}
                setGanttStartTime={setGanttStartTime}
                setGanttEndTime={setGanttEndTime}
                generateTimeSlots={() => generateTimeSlots(ganttStartTime, ganttEndTime)}
              />
            );
          })()}
          
          {viewMode === 'timeline' && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('timePlanning.timeline')}</h3>
              <p className="text-gray-600">{t('timePlanning.timelineComingSoon')}</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Loaded: {competitions.length} competitions, {squads.length} squads</p>
              </div>
            </div>
          )}
          
          {viewMode === 'rotation' && (
            <div className="bg-white border rounded-lg p-6">
              <TimePlanningRotation
                ref={rotationRef}
                eventId={eventId || ''}
                onDataChange={refetch}
                squads={squads.map(s => {
                  let competitionId = -1;
                  
                  // Try to get competitionId from competitionIds array (preferred)
                  if (Array.isArray((s as any).competitionIds) && (s as any).competitionIds.length > 0) {
                    competitionId = (s as any).competitionIds[0];
                    console.log('✅ Squad mapped via competitionIds:', s.name, '→', competitionId);
                  }
                  // Fallback: try to find by name
                  else if (Array.isArray(s.competitions) && s.competitions.length > 0) {
                    const compObj = competitions.find(c => c.name === s.competitions[0]);
                    if (compObj) {
                      competitionId = compObj.id;
                      console.log('✅ Squad mapped via name:', s.name, '→', competitionId);
                    } else {
                      console.warn('⚠️ Competition not found for squad:', s.name, 'competition name:', s.competitions[0]);
                    }
                  } else {
                    console.warn('⚠️ Squad has no competitions:', s.name);
                  }
                  
                  return {
                    name: s.name,
                    participantCount: s.participantCount,
                    competitionId
                  };
                })}
                devices={(() => {
                  if (sessionGroups.length > 0 && sessionGroups[0].competitions.length > 0) {
                    const comp = sessionGroups[0].competitions[0];
                    let disciplineObjs: { name: string }[] = [];
                    const filtered = squadDisciplines.filter(sd => sd.tfx_disziplinen && sd.tfx_wettkaempfeid === comp.id);
                    if (filtered.length > 0) {
                      disciplineObjs = filtered.map(sd => ({ name: sd.tfx_disziplinen.var_name }));
                    } else if (disciplineCache.current[comp.id] && disciplineCache.current[comp.id].length > 0) {
                      disciplineObjs = disciplineCache.current[comp.id].map((d: any, idx: number) => ({ name: d.var_name || d.var_disziplinname || d.name || `Device ${idx + 1}` }));
                    } else if (comp.disciplineCount && comp.disciplineCount > 0) {
                      disciplineObjs = Array.from({ length: comp.disciplineCount }, (_, i) => ({ name: `Device ${i + 1}` }));
                    }
                    return disciplineObjs;
                  }
                  return [];
                })()}
                competitions={competitions}
              />
            </div>
          )}
        </>
      )}

      {/* Time Settings Modal */}
      <UnifiedModal
        isOpen={showTimeSettings}
        onClose={() => setShowTimeSettings(false)}
        title="Time Settings"
        size="2xl"
        showFooter={false}
      >
        <TimeSettingsModal
          timeSettings={timeSettings}
          setTimeSettings={setTimeSettings}
          setShowTimeSettings={setShowTimeSettings}
          saveTimeSettings={saveTimeSettings}
        />
      </UnifiedModal>

      {/* Edit Competition Times Modal */}
      <UnifiedModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCompetition(null);
        }}
        title={t('timePlanning.editTimes', 'Zeiten bearbeiten')}
        size="md"
        showFooter={true}
        onSave={handleSaveCompetitionTimes}
        saveLabel={t('common.save', 'Speichern')}
        showCancel={true}
        cancelLabel={t('common.cancel', 'Abbrechen')}
      >
        {editingCompetition && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{editingCompetition.name}</h4>
              <p className="text-sm text-gray-600">Nr. {editingCompetition.number}</p>
            </div>
            
            {/* Event Date (read-only, shown once at top) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">
                  📅 {t('timePlanning.eventDate', 'Veranstaltungsdatum')}:
                </span>
                <span className="text-sm text-blue-700">
                  {selectedEvent?.dat_eventstartdate 
                    ? new Date(selectedEvent.dat_eventstartdate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : '-'}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {t('timePlanning.dateInfo', 'Das Datum wird vom Veranstaltungsdatum übernommen. Nur die Uhrzeit kann individuell eingestellt werden.')}
              </p>
            </div>
            
            {/* Warmup Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('timePlanning.warmupTime', 'Einturnzeit')}
              </label>
              <input
                type="time"
                value={editingCompetition.warmupTime || ''}
                onChange={(e) => setEditingCompetition({
                  ...editingCompetition,
                  warmupTime: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('timePlanning.startTime', 'Startzeit')}
              </label>
              <input
                type="time"
                value={editingCompetition.startTime || ''}
                onChange={(e) => setEditingCompetition({
                  ...editingCompetition,
                  startTime: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </UnifiedModal>

      {/* Squad Start Device Editor Dialog */}
      {editingStartDevices && eventId && (
        <SquadStartDeviceEditor
          eventId={Number(eventId)}
          competitionId={editingStartDevices.competitionId}
          competitionName={editingStartDevices.competitionName}
          round={editingStartDevices.round}
          onClose={() => setEditingStartDevices(null)}
          onSave={() => {
            refetch();
            setDeviceSchedule([]); // Clear device schedule to force recalculation
          }}
        />
      )}
    </EventManagementTemplate>
  );
}
