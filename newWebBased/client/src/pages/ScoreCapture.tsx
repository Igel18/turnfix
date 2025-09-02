import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  InformationCircleIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useEvent } from '../contexts/EventContext'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { apiGet, apiPost } from '../utils/api'

// Interfaces
interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female';
  age: number | null;
  birthYear: number | null;
  assignedCompetitions: number[];
  isInEvent: boolean;
  registrationDate: string;
  squad_name?: string; // Added by squad lookup
  int_statusid?: number; // Current status ID
}

interface Discipline {
  int_disziplinid: number;
  var_name: string;
  var_shortname?: string;
  apparatus?: string;
  attempts: number;
  inputMask?: string;
}

interface Squad {
  name: string;
  participant_count: number;
}

interface Score {
  id?: number;
  participantId: number;
  disciplineId: number;
  competitionId: number;
  score: number;
  attempt: number;
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
}

interface Status {
  int_statusid: number;
  var_name: string;
  ary_colorcode: string;
  bol_bogen: boolean;
  bol_karte: boolean;
}

interface Competition {
  id: number;
  name: string;
  var_name?: string;
  event_id: number;
  disciplines?: Discipline[];
}

export function ScoreCapture() {
  const [searchParams] = useSearchParams()
  const { 
    selectedEvent, 
    selectedCompetition, 
    selectedSquad: contextSquad, 
    selectedDiscipline: contextDiscipline,
    setSelectedSquad,
    setSelectedDiscipline
  } = useEvent()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlCompetitionId = searchParams.get('competitionId') 
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId
  const squadName = contextSquad?.squad_name || urlSquadName

  // State
  const [participants, setParticipants] = useState<Participant[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [squads, setSquads] = useState<Squad[]>([])
  const [scores] = useState<Score[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [scoreMatrix, setScoreMatrix] = useState<{[key: string]: string}>({}) // Changed to string only
  const [squadStatus, setSquadStatus] = useState<number | null>(null) // Squad-level status for current squad and discipline
  const [squadDisciplineStatuses, setSquadDisciplineStatuses] = useState<{ [key: string]: number }>({}) // All squad-discipline status combinations
  
  // Selection state - initialized from context
  const [activeSquad, setActiveSquad] = useState<string>(contextSquad?.squad_name || '')
  const [activeDiscipline, setActiveDiscipline] = useState<number | string | ''>(
    contextDiscipline ? (contextDiscipline.int_disziplinid || contextDiscipline.var_name) : ''
  )

  // Load initial data when eventId is available
  useEffect(() => {
    if (eventId && !loading && !isInitializing) {
      loadInitialData()
    }
  }, [eventId])

  // Sync context squad with local state
  useEffect(() => {
    if (contextSquad?.squad_name && contextSquad.squad_name !== activeSquad) {
      setActiveSquad(contextSquad.squad_name)
    }
  }, [contextSquad?.squad_name, activeSquad])

  // Sync URL squad with local state
  useEffect(() => {
    if (urlSquadName && !contextSquad?.squad_name && urlSquadName !== activeSquad) {
      setActiveSquad(urlSquadName)
    }
  }, [urlSquadName, contextSquad?.squad_name, activeSquad])

  // Sync context discipline with local state
  useEffect(() => {
    if (contextDiscipline) {
      const disciplineValue = contextDiscipline.int_disziplinid || contextDiscipline.var_name
      if (disciplineValue !== activeDiscipline) {
        setActiveDiscipline(disciplineValue)
      }
    }
  }, [contextDiscipline?.int_disziplinid, contextDiscipline?.var_name, activeDiscipline])

  // Update squad status when squad or discipline selection changes
  useEffect(() => {
    if (activeSquad && activeDiscipline && squadDisciplineStatuses) {
      const key = `${activeSquad}-${activeDiscipline}`
      const currentStatus = squadDisciplineStatuses[key] || null
      setSquadStatus(currentStatus)
    } else {
      setSquadStatus(null)
    }
  }, [activeSquad, activeDiscipline, squadDisciplineStatuses])

  // Helper function to add delay between API calls
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const loadInitialData = async () => {
    if (isInitializing) return // Prevent duplicate calls
    
    console.log('Loading initial data for eventId:', eventId)
    setLoading(true)
    setIsInitializing(true)
    try {
      // Load all participants for the event
      const participantsResponse = await apiGet(`/event-participants?eventId=${eventId}`)
      await delay(100) // Small delay between requests
      
      // Extract the participants array from the response object
      const participantsData = participantsResponse?.participants || []
      setParticipants(participantsData)
      
      // Load squads for the event (all squads, not competition-specific)
      const squadsData = await apiGet(`/squad-management?eventId=${eventId}`)
      await delay(100)
      console.log('Loaded squads:', squadsData)
      setSquads(squadsData.squads || [])
      
      // Load all disciplines/competitions for the event
      const competitionsData = await apiGet(`/competitions?eventId=${eventId}`)
      await delay(100)
      console.log('Loaded competitions:', competitionsData)
      setCompetitions(competitionsData || [])
      
      // Load all disciplines from all competitions and track their competition associations
      let allDisciplines: Discipline[] = []
      const disciplineToCompetitionMap = new Map<number | string, number>()
      
      for (const competition of competitionsData || []) {
        try {
          await delay(50) // Delay between each competition request
          const disciplinesData = await apiGet(`/competitions/${competition.id}/disciplines`)
          const competitionDisciplines = disciplinesData.disciplines || []
          
          // Track which competition each discipline belongs to
          competitionDisciplines.forEach((discipline: Discipline) => {
            const disciplineKey = discipline.int_disziplinid || discipline.var_name
            disciplineToCompetitionMap.set(disciplineKey, competition.id)
          })
          
          allDisciplines = [...allDisciplines, ...competitionDisciplines]
        } catch (error) {
          console.error(`Error loading disciplines for competition ${competition.id}:`, error)
        }
      }
      
      // Remove duplicate disciplines based on int_disziplinid and var_name
      const uniqueDisciplines = allDisciplines.reduce((acc: Discipline[], current: Discipline) => {
        const existingIndex = acc.findIndex(d => 
          (d.int_disziplinid && current.int_disziplinid && d.int_disziplinid === current.int_disziplinid) ||
          (d.var_name === current.var_name && d.int_disziplinid === current.int_disziplinid)
        )
        if (existingIndex === -1) {
          acc.push(current)
        }
        return acc
      }, [])
      
      setDisciplines(uniqueDisciplines)
      console.log('All loaded disciplines (before dedup):', allDisciplines)
      console.log('Unique disciplines (after dedup):', uniqueDisciplines)
      
      // Load existing scores for the event (load ALL scores, not just first 100)
      let existingScores: Score[] = []
      try {
        console.log('Fetching ALL scores with URL:', `/scores?eventId=${eventId}&limit=1000`)
        const scoresData = await apiGet(`/scores?eventId=${eventId}&limit=1000`)
        console.log('Raw scores response:', scoresData)
        existingScores = scoresData?.results || []
        console.log('Loaded existing scores:', existingScores)
        console.log('Number of existing scores:', existingScores.length)
        if (existingScores.length > 0) {
          console.log('Sample score object:', existingScores[0])
        }
      } catch (error) {
        console.error('Error loading existing scores:', error)
        // Continue without scores if there's an error
      }
      
      // Initialize score matrix with existing scores
      initializeScoreMatrix(participantsData || [], uniqueDisciplines || [], existingScores)
      
      // Load available statuses
      try {
        const statusesData = await apiGet('/statuses?limit=100')
        await delay(100)
        console.log('Loaded statuses:', statusesData)
        setStatuses(statusesData.statuses || [])
      } catch (error) {
        console.error('Error loading statuses:', error)
        // Continue without statuses if there's an error
      }

      // Load current squad status from database
      try {
        if (eventId) {
          const squadDisciplinesData = await apiGet(`/squad-disciplines?eventId=${eventId}`)
          console.log('Loaded squad disciplines:', squadDisciplinesData)
          
          // Create a map of squad-discipline combinations to their statuses
          const statusMap: { [key: string]: number } = {}
          squadDisciplinesData.squadDisciplines?.forEach((sd: any) => {
            const key = `${sd.squadName}-${sd.disciplineId}`
            statusMap[key] = sd.statusId
          })
          setSquadDisciplineStatuses(statusMap)
          
          // Set current squad status if we have a selected squad and discipline
          if (activeSquad && activeDiscipline) {
            const currentKey = `${activeSquad}-${activeDiscipline}`
            setSquadStatus(statusMap[currentKey] || null)
          }
        }
      } catch (error) {
        console.error('Error loading squad statuses:', error)
        // Graceful fallback - continue without status data
        setSquadDisciplineStatuses({})
        setSquadStatus(null)
      }
      
    } catch (error: any) {
      console.error('Error loading initial data:', error)
      
      // Handle rate limiting gracefully
      if (error.message?.includes('429')) {
        console.warn('Rate limited while loading initial data, API will handle retry automatically');
        // Don't show error to user for rate limiting
      } else {
        // Show error for other types of failures
        alert('Failed to load initial data. Please refresh the page.');
      }
    } finally {
      setLoading(false)
      setIsInitializing(false)
    }
  }

  const initializeScoreMatrix = (participants: Participant[], disciplines: Discipline[], existingScores: Score[]) => {
    console.log('initializeScoreMatrix called with:')
    console.log('participants:', participants, 'type:', typeof participants, 'isArray:', Array.isArray(participants))
    console.log('disciplines:', disciplines, 'type:', typeof disciplines, 'isArray:', Array.isArray(disciplines))
    console.log('existingScores:', existingScores, 'type:', typeof existingScores, 'isArray:', Array.isArray(existingScores))
    
    // Debug the first few score objects to see their actual properties
    if (existingScores.length > 0) {
      console.log('First score object properties:', Object.keys(existingScores[0]))
      console.log('First score object full:', existingScores[0])
      console.log('participantId field:', existingScores[0].participantId)
      console.log('disciplineId field:', existingScores[0].disciplineId)
    }
    
    const matrix: {[key: string]: string} = {} // Changed to string only
    
    const safeParticipants = Array.isArray(participants) ? participants : []
    const safeDisciplines = Array.isArray(disciplines) ? disciplines : []
    
    console.log(`Processing ${safeParticipants.length} participants:`)
    safeParticipants.forEach(p => {
      console.log(`Participant ${p.id}: ${p.firstname} ${p.lastname}, Squad: ${p.squad_name}`)
    })
    const safeExistingScores = Array.isArray(existingScores) ? existingScores : []
    
    console.log('Processing matrix for:', safeParticipants.length, 'participants and', safeDisciplines.length, 'disciplines')
    console.log('With', safeExistingScores.length, 'existing scores')
    
    safeParticipants.forEach(participant => {
      safeDisciplines.forEach((discipline, index) => {
        const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
        const key = `${participant.id}-${disciplineId}`
        
        // Debug: Log the search criteria
        console.log(`Looking for score: participantId=${participant.id}, disciplineId=${discipline.int_disziplinid || disciplineId}`)
        console.log(`Available scores for participant ${participant.id}:`, safeExistingScores.filter(s => s.participantId === participant.id))
        
        const existingScore = safeExistingScores.find(s => {
          const matchesParticipant = s.participantId === participant.id
          const matchesDiscipline = s.disciplineId === discipline.int_disziplinid || s.disciplineId === disciplineId
          
          console.log(`Score ${s.id}: participantId=${s.participantId}, disciplineId=${s.disciplineId}, matches participant=${matchesParticipant}, matches discipline=${matchesDiscipline}`)
          
          return matchesParticipant && matchesDiscipline
        })
        
        if (existingScore) {
          console.log(`✓ Found existing score for key ${key}:`, existingScore)
        } else {
          console.log(`✗ No score found for key ${key}`)
        }
        
        matrix[key] = existingScore ? existingScore.score.toString() : '' // Convert to string
      })
    })
    
    console.log('Final score matrix:', matrix)
    setScoreMatrix(matrix)
  }

  const handleScoreChange = (participantId: number, disciplineId: number | string, value: string) => {
    const key = `${participantId}-${disciplineId}`
    setScoreMatrix(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveScore = async (participantId: number, disciplineId: number | string) => {
    // For now, we'll use the original competitionId from URL params or context
    // In a more advanced implementation, we'd need to determine which competition
    // the selected discipline belongs to
    if (!competitionId && !disciplineId) return
    
    const key = `${participantId}-${disciplineId}`
    const scoreValue = scoreMatrix[key]
    
    if (scoreValue === '' || scoreValue === null || scoreValue === undefined) return
    
    // Only save if we have a valid numeric discipline ID
    // If disciplineId is a string (fallback ID), we need to find the actual discipline
    let numericDisciplineId: number | null = null
    
    if (typeof disciplineId === 'number') {
      numericDisciplineId = disciplineId
    } else if (typeof disciplineId === 'string') {
      // Try to find the discipline by name or fallback pattern
      const discipline = disciplines.find(d => {
        return d.var_name && disciplineId.includes(d.var_name)
      })
      if (discipline && discipline.int_disziplinid) {
        numericDisciplineId = discipline.int_disziplinid
      } else {
        console.log('Cannot save score: invalid discipline ID:', disciplineId)
        return // Skip saving if we can't resolve to a numeric ID
      }
    }
    
    if (!numericDisciplineId) {
      console.log('Cannot save score: no valid numeric discipline ID found')
      return
    }
    
    try {
      const scoreData = {
        competitionId: competitionId ? parseInt(competitionId) : 1, // fallback to competition 1
        participantId: participantId,
        disciplineId: numericDisciplineId,
        score: typeof scoreValue === 'string' ? parseFloat(scoreValue) : scoreValue
      }
      
      console.log('Saving score:', scoreData)
      
      // Use the new save-value endpoint
      const response = await apiPost('/scores/save-value', scoreData)
      
      if (response.success) {
        console.log('Score saved successfully:', response)
        
        // Auto-set status to "Leistung erfasst" (ID: 9) when score is saved
        // DISABLED: Status management not available until database schema is updated
        // const leistungErfasstStatus = statuses.find(s => s.var_name === 'Leistungen erfasst')
        // if (leistungErfasstStatus && !participantStatuses[participantId]) {
        //   saveParticipantStatus(participantId, leistungErfasstStatus.int_statusid)
        // }
        
        // Optionally show success message
        // You could add a toast notification here
      } else {
        console.error('Failed to save score:', response)
        alert('Failed to save score')
      }
      
    } catch (error) {
      console.error('Error saving score:', error)
      alert('Failed to save score')
    }
  }

  // Function to save squad status via API
  const saveSquadStatus = async (statusId: number) => {
    if (!contextSquad || !activeDiscipline || !eventId) {
      console.warn('Cannot save squad status: missing squad, discipline, or event')
      return
    }

    try {
      setSquadStatus(statusId)
      console.log('Saving squad status:', { 
        squadName: contextSquad.squad_name, 
        disciplineId: activeDiscipline, 
        statusId,
        eventId 
      })
      
      // Make API call to update status
      const response = await fetch(`/api/squad-disciplines/${encodeURIComponent(contextSquad.squad_name)}/${activeDiscipline}/status?eventId=${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId: statusId
        }),
      })
      
      if (response.ok) {
        console.log('Squad status saved successfully')
        
        // Update local state
        const key = `${contextSquad.squad_name}-${activeDiscipline}`
        setSquadDisciplineStatuses(prev => ({
          ...prev,
          [key]: statusId
        }))
      } else {
        const errorData = await response.json()
        console.error('Failed to save squad status:', errorData)
        alert(`Failed to save squad status: ${errorData.error || 'Unknown error'}`)
        
        // Revert local state on error
        const key = `${contextSquad.squad_name}-${activeDiscipline}`
        const originalStatus = squadDisciplineStatuses[key] || null
        setSquadStatus(originalStatus)
      }
      
    } catch (error) {
      console.error('Error saving squad status:', error)
      alert('Failed to save squad status due to network error')
      
      // Revert local state on error
      const key = `${contextSquad.squad_name}-${activeDiscipline}`
      const originalStatus = squadDisciplineStatuses[key] || null
      setSquadStatus(originalStatus)
    }
  }

  // Function to handle squad status change
  const handleSquadStatusChange = (statusId: string) => {
    const numericStatusId = parseInt(statusId)
    if (!isNaN(numericStatusId)) {
      saveSquadStatus(numericStatusId)
    }
  }

  // Function to get status color style
  const getStatusColor = (statusId: number): string => {
    const status = statuses.find(s => s.int_statusid === statusId)
    if (!status || !status.ary_colorcode) {
      return 'bg-gray-100 text-gray-800'
    }
    
    // Parse color code (assuming format like "rgb(255,0,0)" or "#ff0000")
    const colorCode = status.ary_colorcode
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return 'bg-red-100 text-red-800'
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return 'bg-green-100 text-green-800'
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return 'bg-yellow-100 text-yellow-800'
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return 'bg-blue-100 text-blue-800'
    }
    
    return 'bg-gray-100 text-gray-800'
  }

  // Helper function to get competition names for a participant
  const getParticipantCompetitions = (participant: Participant): string[] => {
    if (!participant.assignedCompetitions || participant.assignedCompetitions.length === 0) {
      return []
    }
    
    return participant.assignedCompetitions
      .map(competitionId => {
        const competition = competitions.find(c => c.id === competitionId)
        return competition?.name || competition?.var_name || `Competition ${competitionId}`
      })
      .filter(name => name) // Remove any undefined/empty names
  }

  // Helper function to display gender properly
  const formatGender = (gender: any): string => {
    if (!gender) {
      return 'Unknown'
    }
    
    const genderStr = String(gender).toLowerCase().trim()
    
    // Map various possible gender values to display names
    switch (genderStr) {
      case 'male':
      case 'm':
      case 'männlich':
      case 'maennlich':
        return 'Male'
      case 'female':
      case 'f':
      case 'weiblich':
        return 'Female'
      case 'other':
      case 'o':
      case 'diverse':
      case 'othe': // Handle truncated "other"
        return 'Other'
      default:
        // If it's an unexpected value, show the original but capitalize first letter
        return genderStr.charAt(0).toUpperCase() + genderStr.slice(1)
    }
  }

  const filteredParticipants = Array.isArray(participants) ? participants.filter(participant => {
    const matchesSearch = 
      participant.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSquad = !activeSquad || participant.squad_name === activeSquad

    return matchesSearch && matchesSquad
  }) : []

  // Filter disciplines to show only selected one, or all if none selected
  const displayDisciplines = activeDiscipline 
    ? Array.isArray(disciplines) ? disciplines.filter(d => 
        d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline
      ) : []
    : Array.isArray(disciplines) ? disciplines : []

  const getScoreCaptureStateInfo = (): StateInfo[] => {
    const totalScores = (Array.isArray(participants) ? participants.length : 0) * (Array.isArray(disciplines) ? disciplines.length : 0)
    const completedScores = Array.isArray(scores) ? scores.filter(s => s.status === 'completed').length : 0
    const reviewedScores = Array.isArray(scores) ? scores.filter(s => s.status === 'reviewed').length : 0
    const pendingScores = totalScores - completedScores - reviewedScores

    return [
      {
        value: 'pending',
        label: 'Pending Scores',
        count: pendingScores,
        color: 'bg-yellow-100 text-yellow-800'
      },
      {
        value: 'completed',
        label: 'Completed',
        count: completedScores,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'reviewed',
        label: 'Reviewed',
        count: reviewedScores,
        color: 'bg-blue-100 text-blue-800'
      }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Status',
      value: 'status',
      options: [
        { value: '', label: 'All Statuses' },
        { value: 'pending', label: 'Pending' },
        { value: 'completed', label: 'Completed' },
        { value: 'reviewed', label: 'Reviewed' }
      ],
      selectedValue: selectedStatus,
      onChange: setSelectedStatus
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
  }

  const handleExportCSV = () => {
    // CSV export functionality for score data
    const csvData = Array.isArray(participants) ? participants.map(participant => {
      const row: any = {
        'Participant': `${participant.firstname} ${participant.lastname}`,
        'Club': participant.club,
        'Gender': participant.gender,
        'Age': participant.age
      }
      
      if (Array.isArray(disciplines)) {
        disciplines.forEach((discipline: Discipline, index: number) => {
          const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${index}` || index;
          const key = `${participant.id}-${disciplineId}`
          row[discipline.var_name] = scoreMatrix[key] || ''
        })
      }
      
      return row
    }) : []
    
    console.log('Export score data as CSV', csvData)
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Event Selected</h3>
          <p className="text-gray-500">Please select an event from the dashboard to capture scores.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Score Capture"
        description="Enter and manage competition scores and results"
        icon={ClipboardDocumentListIcon}
        stateInfo={getScoreCaptureStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Refresh Data',
          icon: PlusIcon,
          onClick: loadInitialData
        }}
        totalCount={(participants || []).length}
      />

      {/* Event Selection Context */}
      {(eventId || competitionId || squadName) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Selected Context:</strong>
              {eventId && ` Event: ${selectedEvent?.var_eventname || `Event ID ${eventId}`}`}
              {competitionId && ` • Competition ID: ${competitionId}`}
              {squadName && ` • Squad: ${squadName}`}
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Score capture is focused on your selection from the dashboard.
          </p>
        </div>
      )}
      
      {/* Squad and Device Selection */}
      {!loading && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Squad Selection */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Squad
            </label>
            <select
              value={activeSquad}
              onChange={(e) => {
                const squadName = e.target.value
                setActiveSquad(squadName)
                
                // Store in context
                if (squadName) {
                  const selectedSquadData = squads.find(s => s.name === squadName)
                  if (selectedSquadData) {
                    setSelectedSquad({
                      squad_name: selectedSquadData.name,
                      participant_count: selectedSquadData.participant_count,
                      individual_count: 0, // These might not be available in the current data
                      group_count: 0,
                      team_count: 0
                    })
                  }
                } else {
                  setSelectedSquad(null)
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a squad...</option>
              {squads.map((squad) => (
                <option key={squad.name} value={squad.name}>
                  {squad.name} ({squad.participant_count} participants)
                </option>
              ))}
            </select>
            {activeSquad && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Squad "{activeSquad}" selected
              </p>
            )}
            
            {/* Squad Status Selection */}
            {activeSquad && activeDiscipline && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Squad Status for {typeof activeDiscipline === 'number' ? 
                    disciplines.find(d => d.int_disziplinid === activeDiscipline)?.var_shortname || 'Selected Discipline' :
                    activeDiscipline
                  }
                </label>
                <select
                  value={squadStatus || ''}
                  onChange={(e) => handleSquadStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Status</option>
                  {statuses.map(status => (
                    <option key={status.int_statusid} value={status.int_statusid}>
                      {status.var_name}
                    </option>
                  ))}
                </select>
                
                <p className="mt-1 text-xs text-gray-500">
                  Status applies to the selected squad and discipline combination
                </p>
                
                {/* Status Color Indicator */}
                {squadStatus && (
                  <div className={`inline-block px-3 py-1 mt-2 text-sm rounded-full ${getStatusColor(squadStatus)}`}>
                    {statuses.find(s => s.int_statusid === squadStatus)?.var_name || 'Unknown Status'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device/Discipline Selection */}
          <div className="bg-white rounded-lg border p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Device/Apparatus
            </label>
            <select
              value={activeDiscipline === '' ? '' : String(activeDiscipline)}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setActiveDiscipline('');
                  setSelectedDiscipline(null);
                } else {
                  // Try to parse as number first, if it fails use the string value
                  const numValue = parseInt(value);
                  const disciplineValue = isNaN(numValue) ? value : numValue;
                  setActiveDiscipline(disciplineValue);
                  
                  // Store in context
                  const selectedDisciplineData = disciplines.find(d => 
                    d.int_disziplinid === disciplineValue || d.var_name === disciplineValue
                  )
                  if (selectedDisciplineData) {
                    setSelectedDiscipline(selectedDisciplineData)
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a device...</option>
              {(disciplines || []).map((discipline, index) => (
                <option key={`discipline-${discipline.int_disziplinid || index}-${discipline.var_name}`} value={discipline.int_disziplinid || discipline.var_name}>
                  {discipline.var_name} {discipline.apparatus && `(${discipline.apparatus})`}
                </option>
              ))}
            </select>
            {activeDiscipline && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Device "{(disciplines || []).find(d => 
                  d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline
                )?.var_name}" selected
              </p>
            )}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading participants and disciplines...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border">
          {!activeSquad || !activeDiscipline ? (
            <div className="p-8 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Score Capture</h3>
              <div className="text-gray-500 space-y-1">
                {!activeSquad && <p>• Please select a squad to score</p>}
                {!activeDiscipline && <p>• Please select a device/apparatus to score</p>}
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Once both selections are made, the scoring interface will appear with participants from the selected squad.
              </p>
            </div>
          ) : (participants || []).length === 0 ? (
            <div className="p-6 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Participants Found</h3>
              <p className="text-gray-500 mb-4">No participants are registered for this competition in the selected squad.</p>
            </div>
          ) : (
            <>
              {/* Score Capture Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Club
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Age/Gender
                      </th>
                      {displayDisciplines.map((discipline, index) => (
                        <th key={`header-${discipline.int_disziplinid || `${discipline.var_name}-${index}` || index}`} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {discipline.var_shortname || discipline.var_name}
                          {discipline.apparatus && (
                            <div className="text-xs text-gray-400 normal-case">{discipline.apparatus}</div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.map(participant => {
                      return (
                        <tr key={participant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="text-sm font-medium text-gray-900">
                              {participant.firstname} {participant.lastname}
                            </div>
                            {getParticipantCompetitions(participant).length > 0 ? (
                              <div className="text-xs text-gray-500">
                                {getParticipantCompetitions(participant).length === 1 ? 
                                  `Competition: ${getParticipantCompetitions(participant)[0]}` :
                                  `Competitions: ${getParticipantCompetitions(participant).join(', ')}`
                                }
                              </div>
                            ) : (
                              <div className="text-xs text-red-500">
                                No competition assigned
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.club}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {participant.age} • {formatGender(participant.gender)}
                          </td>
                          {displayDisciplines.map((discipline, disciplineIndex) => {
                            const disciplineId = discipline.int_disziplinid || `${discipline.var_name}-${disciplineIndex}` || disciplineIndex;
                            const key = `${participant.id}-${disciplineId}`
                            const score = scoreMatrix[key] ?? '' // Use nullish coalescing to ensure always string
                            
                            return (
                              <td key={`cell-${participant.id}-${disciplineId}`} className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={score}
                                  onChange={(e) => handleScoreChange(participant.id, disciplineId, e.target.value)}
                                  onBlur={() => saveScore(participant.id, disciplineId)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="0.00"
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ScoreCapture