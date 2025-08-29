import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  ChartBarIcon,
  TrophyIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { apiGet } from '../utils/api'

interface Participant {
  id: number
  name: string
  club: string
  startNumber: number
  age: number
  scores: { [discipline: string]: number }
  totalScore: number
  rank: number
}

const Results = () => {
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters - ALWAYS filter by event
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const squadName = urlSquadName
  
  const [ranking, setRanking] = useState<Participant[]>([])
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [competitions, setCompetitions] = useState<any[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')

  // Helper functions for unified header
  const getResultsStateInfo = (): StateInfo[] => {
    const totalParticipants = ranking.length
    const totalDisciplines = disciplines.length
    const completedScores = ranking.reduce((sum, p) => sum + Object.keys(p.scores).length, 0)

    return [
      {
        value: 'participants',
        label: 'Participants',
        count: totalParticipants,
        color: 'text-blue-600'
      },
      {
        value: 'disciplines',
        label: 'Disciplines',
        count: totalDisciplines,
        color: 'text-green-600'
      },
      {
        value: 'scores',
        label: 'Scores',
        count: completedScores,
        color: 'text-purple-600'
      }
    ]
  }

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedCompetition('')
  }

  // Format score with 3 decimal places
  const formatScore = (score: number) => {
    return score.toFixed(3)
  }

  // Get medal color for rankings
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-100'
      case 2: return 'text-gray-600 bg-gray-100'
      case 3: return 'text-amber-600 bg-amber-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  // Get medal emoji
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return rank.toString()
    }
  }

  // Fetch available competitions for the event
  const fetchCompetitions = async () => {
    if (!eventId) return

    try {
      const data = await apiGet(`/competitions?eventId=${eventId}`)
      // The API returns competitions directly as an array, not wrapped in { competitions: [] }
      setCompetitions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching competitions:', error)
      setCompetitions([])
    }
  }

  // Fetch ranking data for the specific event
  const fetchEventRanking = async () => {
    if (!eventId) return
    
    setIsLoading(true)
    try {
      // First, fetch participants for the event/competition
      const participantsParams = new URLSearchParams({ 
        eventId: eventId
      })
      if (selectedCompetition) {
        participantsParams.append('competitionId', selectedCompetition)
      }

      const participantsData = await apiGet(`/event-participants?${participantsParams}`)
      const participants = participantsData.participants || []

      if (participants.length === 0) {
        setRanking([])
        setDisciplines([])
        setEventName(`Event ${eventId}`)
        return
      }

      // Then fetch scores for the specific event
      const scoresParams = new URLSearchParams({ 
        limit: '1000',
        eventId: eventId
      })
      if (squadName) scoresParams.append('squadName', squadName)
      if (selectedCompetition) scoresParams.append('competitionId', selectedCompetition)

      const scoresData = await apiGet(`/scores?${scoresParams}`)
      const scores = scoresData.results || []

      console.log('Fetched scores data:', scoresData)
      console.log('Scores array:', scores)
      console.log('First score:', scores[0])

      // Create a map of participant scores
      const scoresMap = new Map<number, { [discipline: string]: number }>()
      const disciplineSet = new Set<string>()

      scores.forEach((score: any) => {
        const participantId = score.participantId
        const discipline = score.discipline?.name || score.disciplineName
        const scoreValue = score.score || 0
        
        console.log('Processing score:', { participantId, discipline, scoreValue })
        
        if (!participantId || !discipline || scoreValue === null) {
          console.log('Skipping invalid score:', { participantId, discipline, scoreValue })
          return // Skip invalid scores
        }
        
        disciplineSet.add(discipline)

        if (!scoresMap.has(participantId)) {
          scoresMap.set(participantId, {})
        }
        scoresMap.get(participantId)![discipline] = scoreValue
      })

      console.log('Disciplines found:', Array.from(disciplineSet))
      console.log('Scores map:', scoresMap)

      // Build ranking list from participants with their scores
      const participantsList: Participant[] = participants.map((participant: any) => {
        const participantScores = scoresMap.get(participant.id) || {}
        const totalScore = Object.values(participantScores).reduce((sum: number, score: number) => sum + score, 0)

        return {
          id: participant.id,
          name: `${participant.firstname} ${participant.lastname}`,
          club: participant.club || 'Unknown Club',
          startNumber: participant.startNumber || 0,
          age: participant.age || 0,
          scores: participantScores,
          totalScore,
          rank: 0
        }
      })

      // Sort by total score and assign ranks
      participantsList.sort((a, b) => b.totalScore - a.totalScore)
      participantsList.forEach((participant, index) => {
        participant.rank = index + 1
      })

      setRanking(participantsList)
      setDisciplines(Array.from(disciplineSet).sort())
      setEventName(scores[0]?.event_name || scores[0]?.eventName || `Event ${eventId}`)
    } catch (error) {
      console.error('Error fetching event ranking:', error)
      setRanking([])
      setDisciplines([])
    } finally {
      setIsLoading(false)
    }
  }

  // Export results to CSV
  const exportResults = () => {
    if (ranking.length === 0) return

    const headers = ['Platz', 'Name', 'Verein', 'Jg', ...disciplines, 'Gesamt']
    const csvData = ranking.map(participant => [
      participant.rank,
      participant.name,
      participant.club,
      participant.age,
      ...disciplines.map(discipline => formatScore(participant.scores[discipline] || 0)),
      formatScore(participant.totalScore)
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results_${eventName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Filter participants based on search term
  const filteredRanking = ranking.filter(participant =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.club.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (eventId) {
      fetchCompetitions()
      fetchEventRanking()
    }
  }, [eventId, squadName, selectedCompetition])

  // Show message if no event is selected
  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Event Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an event to view competition results.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Competition Results"
        description={`Rankings for ${eventName}${squadName ? ` - Squad ${squadName}` : ''}`}
        icon={ChartBarIcon}
        stateInfo={getResultsStateInfo()}
        selectedState=""
        onStateChange={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants, clubs..."
        filterOptions={[
          {
            label: 'Competition',
            value: 'competition',
            options: [
              { value: '', label: 'All Competitions' },
              ...competitions.map(comp => ({
                value: comp.id?.toString() || '',
                label: comp.name || 'Unknown Competition',
                count: undefined
              }))
            ],
            selectedValue: selectedCompetition,
            onChange: setSelectedCompetition
          }
        ]}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={exportResults}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={filteredRanking.length}
      />

      {/* Event Selection Context */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 mx-6">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div className="text-sm text-blue-800">
            <strong>Event:</strong> {eventName}
            {squadName && (
              <>
                <span className="mx-2">•</span>
                <strong>Squad:</strong> {squadName}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-lg shadow-sm border mx-6">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading results...</p>
          </div>
        ) : filteredRanking.length === 0 ? (
          <div className="p-6 text-center">
            <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No results found for this event</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platz
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verein
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jg
                  </th>
                  {disciplines.map(discipline => (
                    <th key={discipline} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      <div className="flex flex-col">
                        <span className="font-semibold">{discipline}</span>
                        <span className="text-[10px] text-gray-400 font-normal">Device</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-700">Gesamt</span>
                      <span className="text-[10px] text-blue-500 font-normal">Total Score</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRanking.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(participant.rank)}`}>
                        {getMedalEmoji(participant.rank)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {participant.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                      {participant.club}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-gray-600">
                      {participant.age}
                    </td>
                    {disciplines.map(discipline => (
                      <td key={discipline} className="px-4 py-4 whitespace-nowrap text-center border-l border-gray-100">
                        <div className="flex flex-col items-center">
                          {participant.scores[discipline] ? (
                            <span className="text-lg font-bold text-gray-900">
                              {formatScore(participant.scores[discipline])}
                            </span>
                          ) : (
                            <span className="text-lg font-medium text-gray-400">-</span>
                          )}
                          <span className="text-xs text-gray-500 mt-1">
                            {discipline}
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="px-4 py-4 whitespace-nowrap text-center bg-blue-50 border-l-2 border-blue-200">
                      <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-blue-900">
                          {formatScore(participant.totalScore)}
                        </span>
                        <span className="text-xs text-blue-600 mt-1">
                          Total
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Results
