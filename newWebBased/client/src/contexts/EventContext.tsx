import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

interface Discipline {
  int_disziplinid: number
  var_name: string
  var_shortname?: string
  apparatus?: string
  attempts: number
  inputMask?: string
}

interface EventContextType {
  selectedEvent: Event | null
  selectedCompetition: Competition | null
  selectedSquad: Squad | null
  selectedDiscipline: Discipline | null
  setSelectedEvent: (event: Event | null) => void
  setSelectedCompetition: (competition: Competition | null) => void
  setSelectedSquad: (squad: Squad | null) => void
  setSelectedDiscipline: (discipline: Discipline | null) => void
  clearSelection: () => void
  refreshEvents: () => void
  eventUpdateTrigger: number
}

const EventContext = createContext<EventContextType | undefined>(undefined)

interface EventProviderProps {
  children: ReactNode
}

export function EventProvider({ children }: EventProviderProps) {
  const [selectedEvent, setSelectedEventState] = useState<Event | null>(null)
  const [selectedCompetition, setSelectedCompetitionState] = useState<Competition | null>(null)
  const [selectedSquad, setSelectedSquadState] = useState<Squad | null>(null)
  const [selectedDiscipline, setSelectedDisciplineState] = useState<Discipline | null>(null)
  const [eventUpdateTrigger, setEventUpdateTrigger] = useState<number>(0)

  // Load persisted selection from localStorage on mount
  useEffect(() => {
    try {
      const savedEvent = localStorage.getItem('turnfix-selected-event')
      const savedCompetition = localStorage.getItem('turnfix-selected-competition')
      const savedSquad = localStorage.getItem('turnfix-selected-squad')
      const savedDiscipline = localStorage.getItem('turnfix-selected-discipline')

      if (savedEvent) {
        setSelectedEventState(JSON.parse(savedEvent))
      }
      if (savedCompetition) {
        setSelectedCompetitionState(JSON.parse(savedCompetition))
      }
      if (savedSquad) {
        setSelectedSquadState(JSON.parse(savedSquad))
      }
      if (savedDiscipline) {
        setSelectedDisciplineState(JSON.parse(savedDiscipline))
      }
    } catch (error) {
      console.error('Error loading persisted event selection:', error)
      // Clear invalid data
      localStorage.removeItem('turnfix-selected-event')
      localStorage.removeItem('turnfix-selected-competition')
      localStorage.removeItem('turnfix-selected-squad')
      localStorage.removeItem('turnfix-selected-discipline')
    }
  }, [])

  // Persist event selection to localStorage
  const setSelectedEvent = (event: Event | null) => {
    console.log('🔄 EventContext: Setting selected event:', event?.var_eventname);
    setSelectedEventState(event)
    if (event) {
      localStorage.setItem('turnfix-selected-event', JSON.stringify(event))
    } else {
      localStorage.removeItem('turnfix-selected-event')
    }
    // Clear dependent selections when event changes
    if (!event) {
      setSelectedCompetition(null)
      setSelectedSquad(null)
      setSelectedDiscipline(null)
    }
  }

  // Persist competition selection to localStorage
  const setSelectedCompetition = (competition: Competition | null) => {
    setSelectedCompetitionState(competition)
    if (competition) {
      localStorage.setItem('turnfix-selected-competition', JSON.stringify(competition))
    } else {
      localStorage.removeItem('turnfix-selected-competition')
    }
    // Clear dependent selections when competition changes
    if (!competition) {
      setSelectedSquad(null)
    }
  }

  // Persist squad selection to localStorage
  const setSelectedSquad = (squad: Squad | null) => {
    setSelectedSquadState(squad)
    if (squad) {
      localStorage.setItem('turnfix-selected-squad', JSON.stringify(squad))
    } else {
      localStorage.removeItem('turnfix-selected-squad')
    }
  }

  // Persist discipline selection to localStorage
  const setSelectedDiscipline = (discipline: Discipline | null) => {
    setSelectedDisciplineState(discipline)
    if (discipline) {
      localStorage.setItem('turnfix-selected-discipline', JSON.stringify(discipline))
    } else {
      localStorage.removeItem('turnfix-selected-discipline')
    }
  }

  // Clear all selections
  const clearSelection = () => {
    setSelectedEventState(null)
    setSelectedCompetitionState(null)
    setSelectedSquadState(null)
    setSelectedDisciplineState(null)
    localStorage.removeItem('turnfix-selected-event')
    localStorage.removeItem('turnfix-selected-competition')
    localStorage.removeItem('turnfix-selected-squad')
    localStorage.removeItem('turnfix-selected-discipline')
  }

  // Trigger refresh of events (for components listening to event updates)
  const refreshEvents = () => {
    setEventUpdateTrigger(prev => prev + 1)
  }

  return (
    <EventContext.Provider
      value={{
        selectedEvent,
        selectedCompetition,
        selectedSquad,
        selectedDiscipline,
        setSelectedEvent,
        setSelectedCompetition,
        setSelectedSquad,
        setSelectedDiscipline,
        clearSelection,
        refreshEvents,
        eventUpdateTrigger,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}

export function useEvent() {
  const context = useContext(EventContext)
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider')
  }
  return context
}

// Optional version that returns null if provider is not available
export function useOptionalEvent() {
  const context = useContext(EventContext)
  return context ?? null
}

export default EventContext
