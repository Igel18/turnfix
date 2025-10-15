import { useState, useEffect, useRef } from 'react'
// Drag & drop helpers
function useDragDrop({ onDrop }: { onDrop: (compId: number, newRound: number) => void }) {
  const [draggedComp, setDraggedComp] = useState<number | null>(null);
  const handleDragStart = (compId: number) => setDraggedComp(compId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (newRound: number) => {
    if (draggedComp !== null) {
      onDrop(draggedComp, newRound);
      setDraggedComp(null);
    }
  };
  return { handleDragStart, handleDragOver, handleDrop };
}
import { useTranslation } from 'react-i18next'
import TimePlanningRotation from './TimePlanningRotation'
import { useSearchParams } from 'react-router-dom'
import { 
  ClockIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  TrophyIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '../components/UnifiedPageHeader'
import { useEvent } from '../contexts/EventContext'
import { apiGet, apiPost, apiPut, invalidateCache } from '../utils/api'

interface TimeSettings {
  exerciseDurationMinutes: number // How long an exercise takes at a device
  breakBetweenDevicesMinutes: number // Break time when moving between devices
  warmupDurationMinutes: number // General warm-up time before competition
  rotationIntervalMinutes: number // Time interval for device rotations
}

interface Competition {
  id: number
  name: string
  number: string
  round: number // session/durchgang
  startTime: string | null // HH:MM format
  warmupTime: string | null // HH:MM format
  disciplineCount: number
  participantCount: number
}

interface Squad {
  name: string
  participantCount: number
  competitions: string[] // Competition names this squad participates in
}

interface DeviceSchedule {
  squadName: string
  deviceName: string
  startTime: string
  endTime: string
  competition: string
  isWarmup: boolean
  isFirstDevice?: boolean // true if this is the first device for the squad
}

interface SessionGroup {
  session: number
  competitions: Competition[]
  startTime: string | null
  squads: Squad[]
}

interface GanttTimeSlot {
  time: string
  hour: number
  minute: number
}

const DEFAULT_TIME_SETTINGS: TimeSettings = {
  exerciseDurationMinutes: 10,
  breakBetweenDevicesMinutes: 5,
  warmupDurationMinutes: 15,
  rotationIntervalMinutes: 20
}

export default function TimePlanning() {
  const { t } = useTranslation()
  const { selectedEvent } = useEvent()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid?.toString()

  // State
  const [loading, setLoading] = useState(true)
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [squadDisciplines, setSquadDisciplines] = useState<any[]>([])
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(DEFAULT_TIME_SETTINGS)
  // Cache for competitionId -> disciplines
  const disciplineCache = useRef<{ [competitionId: number]: any[] }>({});
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  // Track extra empty rounds added by the user
  const [extraRounds, setExtraRounds] = useState<number[]>([])
  const [deviceSchedule, setDeviceSchedule] = useState<DeviceSchedule[]>([])
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'sessions' | 'gantt' | 'timeline' | 'rotation'>('sessions')
  const [showTimeSettings, setShowTimeSettings] = useState(false)

  // Gantt chart time range
  const [ganttStartTime, setGanttStartTime] = useState('07:00')
  const [ganttEndTime, setGanttEndTime] = useState('18:00')


  // Refetch helper
  const refetch = () => {
    loadData();
  };

  useEffect(() => {
    if (eventId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const loadData = async () => {
    if (!eventId) return
    setLoading(true)
    try {
      // Load competitions for the event
      const competitionsData = await apiGet(`/time-planning?eventId=${eventId}`)
      const loadedCompetitions = competitionsData.competitions || []
  // Load squads for the event  
  const loadedSquads = competitionsData.squads || []
  const loadedSquadDisciplines = competitionsData.squadDisciplines || []

  setCompetitions(loadedCompetitions)
  setSquads(loadedSquads)
  setSquadDisciplines(loadedSquadDisciplines)

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
      const backendRounds = new Set(loadedCompetitions.map((c: Competition) => c.round))
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
      console.error('Error loading time planning data:', error)
      // Fallback: try old API endpoints
      try {
        const competitionsData = await apiGet(`/competitions?event_id=${eventId}`)
        const squadsData = await apiGet(`/squad-management?eventId=${eventId}`)
        
        const fallbackCompetitions = competitionsData.competitions || []
        const fallbackSquads = squadsData.squads || []
        
        setCompetitions(fallbackCompetitions)
        setSquads(fallbackSquads)
        groupCompetitionsBySessions(fallbackCompetitions, fallbackSquads)
      } catch (fallbackError) {
        console.error('Error loading fallback data:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  // Accept extraRounds as optional third argument
  const groupCompetitionsBySessions = (comps: Competition[], squads: Squad[], extraRoundsArg?: number[]) => {
    const sessionMap = new Map<number, Competition[]>()
    comps.forEach(comp => {
      const session = comp.round || 1
      if (!sessionMap.has(session)) {
        sessionMap.set(session, [])
      }
      sessionMap.get(session)!.push(comp)
    })

    // Add extra empty rounds
    if (extraRoundsArg && extraRoundsArg.length > 0) {
      for (const round of extraRoundsArg) {
        if (!sessionMap.has(round)) {
          sessionMap.set(round, [])
        }
      }
    }

    const groups: SessionGroup[] = Array.from(sessionMap.entries()).map(([session, competitions]) => {
      // Find earliest start time for this session
      const startTimes = competitions
        .map(c => c.startTime)
        .filter(t => t !== null)
        .sort()
      return {
        session,
        competitions,
        startTime: startTimes.length > 0 ? startTimes[0] : null,
        squads: squads.filter(squad => 
          squad.competitions.some(compName => 
            competitions.some(comp => comp.name === compName)
          )
        )
      }
    }).sort((a, b) => a.session - b.session)

    setSessionGroups(groups)
  }

  const generateTimeSlots = (): GanttTimeSlot[] => {
    const slots: GanttTimeSlot[] = []
    const start = parseTime(ganttStartTime)
    const end = parseTime(ganttEndTime)
    
    let current = start
    while (current <= end) {
      const hour = Math.floor(current)
      const minute = (current % 1) * 60
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        hour,
        minute
      })
      current += 0.5 // 30-minute intervals
    }
    
    return slots
  }

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours + minutes / 60
  }

  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number)
    const totalMinutes = hours * 60 + mins + minutes
    const newHours = Math.floor(totalMinutes / 60)
    const newMins = totalMinutes % 60
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
  }


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

      sessionGroup.squads.forEach(squad => {
        if (!squad.competitions.includes(competition.name)) return;

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

        // Schedule each device rotation, enforcing exclusivity
        for (let i = 0; i < disciplineObjs.length; i++) {
          const device = disciplineObjs[i];
          const startTime = currentTime;
          // Calculate duration: participantCount * exerciseDurationMinutes
          const squadDuration = (squad.participantCount || 1) * timeSettings.exerciseDurationMinutes;
          const endTime = addMinutesToTime(startTime, squadDuration);
          const deviceKey = `${device.name}__${startTime}`;
          const squadKey = `${squad.name}__${startTime}`;
          // Only schedule if device and squad are both free at this time
          if (!deviceTimeMap.has(deviceKey) && !squadTimeMap.has(squadKey)) {
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
          }
          // Move to next rotation time (squadDuration + break)
          currentTime = addMinutesToTime(currentTime, squadDuration + timeSettings.breakBetweenDevicesMinutes);
        }
      });
    });

    return schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }  

  const saveTimeSettings = async () => {
    try {
      // Save time settings to backend (you might want to store these per event)
      await apiPut(`/events/${eventId}/time-settings`, timeSettings)
      setShowTimeSettings(false)
    } catch (error) {
      console.error('Error saving time settings:', error)
    }
  }

  const generateAutomaticSchedule = () => {
    // Automatically generate optimized schedule based on current settings
    sessionGroups.forEach(group => {
      if (group.startTime) {
        const schedule = calculateDeviceSchedule(group)
        setDeviceSchedule(prevSchedule => [...prevSchedule, ...schedule])
      }
    })
  }

  const exportTimeplan = async () => {
    try {
      await apiPost(`/events/${eventId}/export-timeplan`, {
        sessionGroups,
        timeSettings,
        deviceSchedule
      })
    } catch (error) {
      console.error('Error exporting timeplan:', error)
    }
  }

  // Add round handler
  const handleAddRound = async () => {
    if (!eventId) return;
    const resp = await apiPost('/time-planning/round', { eventId });
    if (resp && resp.round) {
      invalidateCache('/api/time-planning');
      setExtraRounds(prev => prev.includes(resp.round) ? prev : [...prev, resp.round]);
      // Update session groups immediately to show the new round
      groupCompetitionsBySessions(competitions, squads, [...extraRounds, resp.round]);
    }
  };

  // Drag & drop logic
  const { handleDragStart, handleDragOver, handleDrop } = useDragDrop({
    onDrop: async (compId, newRound) => {
      await apiPut(`/time-planning/competition/${compId}/round`, { round: newRound });
      invalidateCache('/api/time-planning');
      refetch();
    }
  });

  const renderSessionOverview = () => (
    <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          onClick={handleAddRound}
        >
          {t('timePlanning.addRound', 'Add Round')}
        </button>
      </div>
      {sessionGroups.map(group => (
        <div
          key={group.session}
          className="bg-white border rounded-lg overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(group.session)}
        >
          <button 
            className="w-full bg-blue-50 px-6 py-4 border-b text-left hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setSelectedSession(selectedSession === group.session ? null : group.session)}
            type="button"
          >
            <div className="flex items-center justify-between pointer-events-none">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <TrophyIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('timePlanning.session')} {group.session}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {group.startTime && (
                      <span className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {t('timePlanning.startsAt', { time: group.startTime })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 rounded-lg">
                <span>{selectedSession === group.session ? t('common.collapse') : t('common.expand')}</span>
                {selectedSession === group.session ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </div>
            </div>
          </button>
          
          {selectedSession === group.session && (
            <div className="p-6 space-y-6">
              {/* Competitions in this session */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('timePlanning.competitions')} ({group.competitions.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.competitions.map(comp => (
                    <div
                      key={comp.id}
                      className="bg-gray-50 p-4 rounded-lg"
                      draggable
                      onDragStart={() => handleDragStart(comp.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{comp.name}</h5>
                          <p className="text-sm text-gray-600">Nr. {comp.number}</p>
                          <div className="mt-2 space-y-1">
                            {comp.startTime && (
                              <div className="flex items-center text-sm text-gray-600">
                                <PlayIcon className="h-4 w-4 mr-1" />
                                {t('timePlanning.startTime')}: {comp.startTime}
                              </div>
                            )}
                            {comp.warmupTime && (
                              <div className="flex items-center text-sm text-gray-600">
                                <PauseIcon className="h-4 w-4 mr-1" />
                                {t('timePlanning.warmupTime')}: {comp.warmupTime}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{comp.disciplineCount} {t('timePlanning.devices')}</div>
                          <div className="text-sm text-gray-600">{comp.participantCount} {t('timePlanning.participants')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Squads participating (always visible, even if empty) */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('timePlanning.squads')} ({group.squads.length})
                </h4>
                {group.squads.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {group.squads.map(squad => {
                      const duration = squad.participantCount * timeSettings.exerciseDurationMinutes;
                      return (
                        <div key={squad.name} className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <UserGroupIcon className="h-5 w-5 text-green-600" />
                            <h5 className="font-medium text-gray-900">{squad.name}</h5>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {squad.participantCount} {t('timePlanning.participants')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const label = t('timePlanning.squadDuration', { duration });
                              return label === 'timePlanning.squadDuration'
                                ? `${duration} min total`
                                : label;
                            })()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">{t('timePlanning.noSquads', 'Keine Riegen in diesem Durchgang')}</div>
                )}
              </div>

              {/* Device schedule calculation */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">{t('timePlanning.deviceSchedule')}</h4>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {t('timePlanning.calculatedDuration', { 
                          duration: (() => {
                            // Calculate duration: devices * squad-participants * exercise-duration
                            let total = 0;
                            for (const comp of group.competitions) {
                              const devices = comp.disciplineCount;
                              // For each squad, count participants in this competition
                              let squadParticipants = 0;
                              for (const squad of group.squads) {
                                // If squad is assigned to this competition
                                if (squad.competitions && Array.isArray(squad.competitions)) {
                                  if (squad.competitions.includes(comp.name)) {
                                    squadParticipants += squad.participantCount;
                                  }
                                }
                              }
                              total += devices * squadParticipants * timeSettings.exerciseDurationMinutes;
                            }
                            return total;
                          })()
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('timePlanning.basedOnSettings', {
                          exercise: timeSettings.exerciseDurationMinutes,
                          rotation: timeSettings.rotationIntervalMinutes
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const schedule = calculateDeviceSchedule(group)
                        setDeviceSchedule(schedule)
                        setViewMode('timeline')
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      {t('timePlanning.viewTimeline')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderTimeSettings = () => (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('timePlanning.timeSettings.title')}</h3>
        <button
          onClick={() => setShowTimeSettings(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.exerciseDuration')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="60"
              value={timeSettings.exerciseDurationMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                exerciseDurationMinutes: parseInt(e.target.value) || 10
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.rotationInterval')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="5"
              max="120"
              value={timeSettings.rotationIntervalMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                rotationIntervalMinutes: parseInt(e.target.value) || 20
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.breakBetweenDevices')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="30"
              value={timeSettings.breakBetweenDevicesMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                breakBetweenDevicesMinutes: parseInt(e.target.value) || 5
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.warmupDuration')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="60"
              value={timeSettings.warmupDurationMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                warmupDurationMinutes: parseInt(e.target.value) || 15
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={() => setTimeSettings(DEFAULT_TIME_SETTINGS)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('common.reset')}
        </button>
        <button
          onClick={saveTimeSettings}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  )

  // Device-centric, session-grouped Gantt chart
  const renderGanttChart = () => {
    const timeSlots = generateTimeSlots();
    // Group deviceSchedule by session (competition round)
    const scheduleBySession = new Map<number, DeviceSchedule[]>();
    deviceSchedule.forEach((item: DeviceSchedule) => {
      // Find competition to get round/session
      const comp = competitions.find((c) => c.name === item.competition);
      const session = comp ? comp.round : 1;
      if (!scheduleBySession.has(session)) scheduleBySession.set(session, []);
      scheduleBySession.get(session)!.push(item);
    });

    // For each session, render a device-centric Gantt
    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t('timePlanning.ganttChart')}</h3>
          {/* Time range controls */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">{t('timePlanning.timeRange.from')}:</label>
              <input
                type="time"
                value={ganttStartTime}
                onChange={(e) => setGanttStartTime(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">{t('timePlanning.timeRange.to')}:</label>
              <input
                type="time"
                value={ganttEndTime}
                onChange={(e) => setGanttEndTime(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {[...scheduleBySession.entries()].sort((a, b) => a[0] - b[0]).map(([session, activities]) => {
              // Find all devices in this session
              const devices = [...new Set((activities as DeviceSchedule[]).map((a: DeviceSchedule) => a.deviceName))];
              return (
                <div key={String(session)} className="mb-8">
                  <div className="bg-blue-100 px-4 py-2 font-semibold text-blue-900 border-b flex items-center">
                    {t('timePlanning.session')} {session}
                  </div>
                  {/* Time header */}
                  <div className="bg-gray-50 border-b flex">
                    <div className="w-48 p-3 font-medium text-gray-900 border-r">
                      {t('timePlanning.device', 'Gerät')}
                    </div>
                    {timeSlots.map(slot => (
                      <div key={slot.time} className="w-16 p-2 text-xs text-center text-gray-600 border-r">
                        {slot.time}
                      </div>
                    ))}
                  </div>
                  {/* Device rows */}
                  {devices.map((deviceName) => {
                    // All activities for this device in this session
                    const deviceActivities = (activities as DeviceSchedule[]).filter((a: DeviceSchedule) => a.deviceName === deviceName);
                    // For each time slot, find which squad (if any) is at this device
                    return (
                      <div key={String(deviceName)} className="flex border-b border-gray-100">
                        <div className="w-48 p-2 text-sm border-r flex items-center">
                          <span className={deviceActivities.some((a: DeviceSchedule) => a.isFirstDevice) ? 'font-bold text-green-700' : 'text-gray-700'}>
                            {String(deviceName)}
                          </span>
                          {deviceActivities.some((a: DeviceSchedule) => a.isFirstDevice) && (
                            <span title="First Device for a squad" className="ml-2 text-yellow-500">★</span>
                          )}
                        </div>
                        {/* Time slots */}
                        {timeSlots.map((slot, idx) => {
                          // Find activity that covers this slot
                          const activity = deviceActivities.find((a: DeviceSchedule) => a.startTime <= slot.time && a.endTime > slot.time);
                          if (activity) {
                            return (
                              <div key={idx} className={`w-16 h-8 flex items-center justify-center border-r ${activity.isWarmup ? 'bg-yellow-200' : 'bg-blue-200'} text-xs font-medium`} title={`${activity.squadName} (${activity.competition})`}>
                                {activity.squadName}
                                {activity.isFirstDevice && <span className="ml-1 text-yellow-500">★</span>}
                              </div>
                            );
                          }
                          // If previous slot had an activity, show Wechsel
                          const prevActivity = deviceActivities.find((a: DeviceSchedule) => a.endTime === slot.time);
                          if (prevActivity) {
                            return (
                              <div key={idx} className="w-16 h-8 flex items-center justify-center border-r bg-rose-100 text-rose-700 text-xs italic" title="Wechsel">Wechsel</div>
                            );
                          }
                          // Empty slot
                          return <div key={idx} className="w-16 h-8 border-r" />;
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('timePlanning.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('timePlanning.selectEventToManageTime')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title={t('timePlanning.title')}
        subtitle={t('timePlanning.subtitle')}
        icon={ClockIcon}
        searchTerm=""
        onSearchChange={() => {}}
        showEventContext={true}
        customActions={
          <div className="flex items-center space-x-3">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('sessions')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'sessions'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('timePlanning.viewMode.sessions')}
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('timePlanning.viewMode.timeline')}
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'gantt'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('timePlanning.viewMode.gantt')}
              </button>
              <button
                onClick={() => setViewMode('rotation')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'rotation'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('timePlanning.viewMode.rotation') || 'Rotation'}
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowTimeSettings(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              {t('timePlanning.settings')}
            </button>
            
            <button
              onClick={generateAutomaticSchedule}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              {t('timePlanning.generateSchedule')}
            </button>

            <button
              onClick={exportTimeplan}
              className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <DocumentChartBarIcon className="h-4 w-4 mr-2" />
              {t('timePlanning.export')}
            </button>
          </div>
        }
      />

      {/* Time Settings Modal */}
      {showTimeSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
            {renderTimeSettings()}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="space-y-6">
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
            {viewMode === 'sessions' && renderSessionOverview()}
            {viewMode === 'gantt' && renderGanttChart()}
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
                {/* Use first session group for devices, all squads for squads */}
                <TimePlanningRotation
                  eventId={eventId}
                  squads={squads.map(s => {
                    let competitionId = -1;
                    if (Array.isArray(s.competitions) && s.competitions.length > 0) {
                      // Try to find the competition by name in the competitions array
                      const compObj = competitions.find(c => c.name === s.competitions[0]);
                      if (compObj) competitionId = compObj.id;
                    }
                    return {
                      name: s.name,
                      participantCount: s.participantCount,
                      competitionId
                    };
                  })}
                  devices={(() => {
                    // Try to get devices from the first session's competitions/discipline logic
                    if (sessionGroups.length > 0 && sessionGroups[0].competitions.length > 0) {
                      const comp = sessionGroups[0].competitions[0];
                      // Try squadDisciplines first, then disciplineCache, then fallback
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
      </div>
    </div>
  )
}
