import { useState, useEffect } from 'react'
import { ChevronDownIcon, CalendarDaysIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useEvent } from '../contexts/EventContext'
import { apiGet } from '../utils/api'
import { useTranslation } from 'react-i18next'

interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  status: 'upcoming' | 'active' | 'completed'
}

interface Competition {
  id: number
  name: string
  number: string
  round: number
  event_id: number
  participant_count: number
  discipline_count: number
}

interface Squad {
  squad_name: string
  participant_count: number
  individual_count: number
  group_count: number
  team_count: number
}

interface EventSelectorProps {
  onSelectionChange?: (eventId: number | null, competitionId: number | null, squadName: string | null) => void
  showCompetitions?: boolean
  showSquads?: boolean
  className?: string
}

export function EventSelector({ 
  onSelectionChange, 
  showCompetitions = false, // Changed default to false
  showSquads = false, // Changed default to false 
  className = "" 
}: EventSelectorProps) {
  const { t } = useTranslation()
  
  // Use context if available, otherwise fall back to callback mode
  const eventContext = useEvent()
  
  const [events, setEvents] = useState<Event[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  
  const [localSelectedEvent, setLocalSelectedEvent] = useState<Event | null>(null)
  const [localSelectedCompetition, setLocalSelectedCompetition] = useState<Competition | null>(null)
  const [localSelectedSquad, setLocalSelectedSquad] = useState<Squad | null>(null)
  
  const [loading, setLoading] = useState({
    events: false,
    competitions: false,
    squads: false
  })

  // Determine which state to use - context or local
  const selectedEvent = eventContext?.selectedEvent || localSelectedEvent
  const selectedCompetition = eventContext?.selectedCompetition || localSelectedCompetition
  const selectedSquad = eventContext?.selectedSquad || localSelectedSquad

  // Fetch events
  const fetchEvents = async () => {
    setLoading(prev => ({ ...prev, events: true }))
    try {
      const data = await apiGet('/events?limit=50')
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(prev => ({ ...prev, events: false }))
    }
  }

  // Fetch competitions for selected event
  const fetchCompetitions = async (eventId: number) => {
    if (!showCompetitions) return
    
    setLoading(prev => ({ ...prev, competitions: true }))
    try {
      const data = await apiGet(`/competitions?event_id=${eventId}`)
      setCompetitions(data.competitions || [])
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setLoading(prev => ({ ...prev, competitions: false }))
    }
  }

  // Fetch squads for selected competition
  const fetchSquads = async (competitionId: number) => {
    if (!showSquads) return
    
    setLoading(prev => ({ ...prev, squads: true }))
    try {
      const data = await apiGet(`/squads?competition_id=${competitionId}`)
      setSquads(data.squads || [])
    } catch (error) {
      console.error('Error fetching squads:', error)
    } finally {
      setLoading(prev => ({ ...prev, squads: false }))
    }
  }

  // Handle event selection
  const handleEventSelect = (event: Event | null) => {
    if (eventContext) {
      // Use context
      eventContext.setSelectedEvent(event)
      if (!event) {
        eventContext.setSelectedCompetition(null)
        eventContext.setSelectedSquad(null)
      }
    } else {
      // Use local state
      setLocalSelectedEvent(event)
      setLocalSelectedCompetition(null)
      setLocalSelectedSquad(null)
    }
    
    // Clear competitions and squads
    setCompetitions([])
    setSquads([])
    
    // Callback for legacy support
    onSelectionChange?.(event?.int_eventid || null, null, null)
    
    // Fetch competitions if event selected
    if (event && showCompetitions) {
      fetchCompetitions(event.int_eventid)
    }
  }

  // Handle competition selection
  const handleCompetitionSelect = (competition: Competition | null) => {
    if (eventContext) {
      eventContext.setSelectedCompetition(competition)
      if (!competition) {
        eventContext.setSelectedSquad(null)
      }
    } else {
      setLocalSelectedCompetition(competition)
      setLocalSelectedSquad(null)
    }
    
    // Clear squads
    setSquads([])
    
    // Callback for legacy support
    onSelectionChange?.(selectedEvent?.int_eventid || null, competition?.id || null, null)
    
    // Fetch squads if competition selected
    if (competition && showSquads) {
      fetchSquads(competition.id)
    }
  }

  // Handle squad selection
  const handleSquadSelect = (squad: Squad | null) => {
    if (eventContext) {
      eventContext.setSelectedSquad(squad)
    } else {
      setLocalSelectedSquad(squad)
    }
    
    // Callback for legacy support
    onSelectionChange?.(
      selectedEvent?.int_eventid || null, 
      selectedCompetition?.id || null, 
      squad?.squad_name || null
    )
  }

  // Load events on mount
  useEffect(() => {
    fetchEvents()
  }, [])

  // Load competitions when event changes
  useEffect(() => {
    if (selectedEvent && showCompetitions) {
      fetchCompetitions(selectedEvent.int_eventid)
    } else {
      setCompetitions([])
    }
  }, [selectedEvent, showCompetitions])

  // Load squads when competition changes
  useEffect(() => {
    if (selectedCompetition && showSquads) {
      fetchSquads(selectedCompetition.id)
    } else {
      setSquads([])
    }
  }, [selectedCompetition, showSquads])

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Event Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
          {t('eventManagement.selectEvent')}
        </label>
        <div className="relative">
          <select
            value={selectedEvent?.int_eventid || ''}
            onChange={(e) => {
              const eventId = e.target.value ? parseInt(e.target.value) : null
              const event = eventId ? events.find(e => e.int_eventid === eventId) || null : null
              handleEventSelect(event)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
            disabled={loading.events}
          >
            <option value="">
              {loading.events ? 'Loading events...' : 'Select an event'}
            </option>
            {events.map((event) => (
              <option key={event.int_eventid} value={event.int_eventid}>
                {event.var_eventname} ({formatDate(event.dat_eventstartdate)})
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Competition Selection */}
      {showCompetitions && selectedEvent && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <TrophyIcon className="h-4 w-4 inline mr-1" />
            Select Competition
          </label>
          <div className="relative">
            <select
              value={selectedCompetition?.id || ''}
              onChange={(e) => {
                const competitionId = e.target.value ? parseInt(e.target.value) : null
                const competition = competitionId ? competitions.find(c => c.id === competitionId) || null : null
                handleCompetitionSelect(competition)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              disabled={loading.competitions || competitions.length === 0}
            >
              <option value="">
                {loading.competitions ? 'Loading competitions...' : 
                 competitions.length === 0 ? 'No competitions available' : 'Select a competition'}
              </option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Squad Selection */}
      {showSquads && selectedCompetition && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserGroupIcon className="h-4 w-4 inline mr-1" />
            Select Squad
          </label>
          <div className="relative">
            <select
              value={selectedSquad?.squad_name || ''}
              onChange={(e) => {
                const squadName = e.target.value || null
                const squad = squadName ? squads.find(s => s.squad_name === squadName) || null : null
                handleSquadSelect(squad)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
              disabled={loading.squads || squads.length === 0}
            >
              <option value="">
                {loading.squads ? 'Loading squads...' : 
                 squads.length === 0 ? 'No squads available' : 'Select a squad'}
              </option>
              {squads.map((squad) => (
                <option key={squad.squad_name} value={squad.squad_name}>
                  {squad.squad_name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Selection Summary - Removed this section */}
    </div>
  )
}

export default EventSelector
