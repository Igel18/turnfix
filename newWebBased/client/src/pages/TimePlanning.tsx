import { useState, useEffect } from 'react'
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
  const [timeSettings, setTimeSettings] = useState<TimeSettings>(DEFAULT_TIME_SETTINGS)
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  // Track extra empty rounds added by the user
  const [extraRounds, setExtraRounds] = useState<number[]>([])
  const [deviceSchedule, setDeviceSchedule] = useState<DeviceSchedule[]>([])
  const [selectedSession, setSelectedSession] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'sessions' | 'gantt' | 'timeline'>('sessions')
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

      setCompetitions(loadedCompetitions)
      setSquads(loadedSquads)

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
    const schedule: DeviceSchedule[] = []
    
    if (!sessionGroup.startTime) return schedule

    sessionGroup.competitions.forEach(competition => {
      const compStartTime = competition.startTime || sessionGroup.startTime!
      const compWarmupTime = competition.warmupTime
      
      // Get disciplines for this competition (approximation based on disciplineCount)
      const deviceNames = Array.from({length: competition.disciplineCount}, (_, i) => `Device ${i + 1}`)
      
      sessionGroup.squads.forEach(squad => {
        // Skip squads not participating in this competition
        if (!squad.competitions.includes(competition.name)) return

        let currentTime = compStartTime
        
        // Add warm-up phase if specified
        if (compWarmupTime) {
          schedule.push({
            squadName: squad.name,
            deviceName: 'Warm-up Area',
            startTime: compWarmupTime,
            endTime: addMinutesToTime(compWarmupTime, timeSettings.warmupDurationMinutes),
            competition: competition.name,
            isWarmup: true
          })
        }

        // Schedule each device rotation
        deviceNames.forEach((deviceName) => {
          const startTime = currentTime
          const endTime = addMinutesToTime(startTime, timeSettings.exerciseDurationMinutes)
          
          schedule.push({
            squadName: squad.name,
            deviceName,
            startTime,
            endTime,
            competition: competition.name,
            isWarmup: false
          })

          // Move to next rotation time (exercise + break)
          currentTime = addMinutesToTime(currentTime, timeSettings.rotationIntervalMinutes)
        })
      })
    })

    return schedule.sort((a, b) => a.startTime.localeCompare(b.startTime))
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

              {/* Squads participating */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('timePlanning.squads')} ({group.squads.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {group.squads.map(squad => (
                    <div key={squad.name} className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <UserGroupIcon className="h-5 w-5 text-green-600" />
                        <h5 className="font-medium text-gray-900">{squad.name}</h5>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {squad.participantCount} {t('timePlanning.participants')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device schedule calculation */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">{t('timePlanning.deviceSchedule')}</h4>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {t('timePlanning.calculatedDuration', { 
                          duration: group.competitions.reduce((acc, comp) => 
                            acc + (comp.disciplineCount * timeSettings.rotationIntervalMinutes), 0
                          )
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

  const renderGanttChart = () => {
    const timeSlots = generateTimeSlots()
    const allSquads = [...new Set(deviceSchedule.map(item => item.squadName))]
    const allDevices = [...new Set(deviceSchedule.map(item => item.deviceName))]

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
        
        {/* Gantt Chart */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Time header */}
            <div className="bg-gray-50 border-b flex">
              <div className="w-48 p-3 font-medium text-gray-900 border-r">
                {t('timePlanning.squadDevice')}
              </div>
              {timeSlots.map(slot => (
                <div key={slot.time} className="w-16 p-2 text-xs text-center text-gray-600 border-r">
                  {slot.time}
                </div>
              ))}
            </div>
            
            {/* Squad rows */}
            {allSquads.map(squadName => (
              <div key={squadName} className="border-b">
                <div className="bg-blue-50 flex">
                  <div className="w-48 p-3 font-medium text-gray-900 border-r">
                    {squadName}
                  </div>
                  <div className="flex-1"></div>
                </div>
                
                {/* Device rows for this squad */}
                {allDevices.map(deviceName => {
                  const squadDeviceActivities = deviceSchedule.filter(
                    item => item.squadName === squadName && item.deviceName === deviceName
                  )
                  
                  return (
                    <div key={`${squadName}-${deviceName}`} className="flex border-t border-gray-100">
                      <div className="w-48 p-2 text-sm text-gray-600 border-r pl-8">
                        {deviceName}
                      </div>
                      
                      {/* Time slots */}
                      <div className="flex-1 relative">
                        {squadDeviceActivities.map((activity, index) => {
                          const startPos = timeSlots.findIndex(slot => slot.time >= activity.startTime)
                          const endPos = timeSlots.findIndex(slot => slot.time >= activity.endTime)
                          const width = Math.max(1, endPos - startPos) * 64 // 64px per slot
                          const left = startPos * 64
                          
                          return (
                            <div
                              key={index}
                              className={`absolute top-1 h-6 rounded text-xs text-white flex items-center justify-center ${
                                activity.isWarmup ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              style={{ left: `${left}px`, width: `${width}px` }}
                              title={`${activity.competition} - ${activity.startTime} to ${activity.endTime}`}
                            >
                              {activity.isWarmup ? 'W' : 'E'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
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
          </>
        )}
      </div>
    </div>
  )
}
