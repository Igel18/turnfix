import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  ChartBarIcon,
  TrophyIcon,
  InformationCircleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { apiGet } from '../utils/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Participant {
  id: number
  name: string
  club: string
  startNumber: number
  age: number
  scores: { [discipline: string]: number }
  totalScore: number
  rank: number
  competitionId?: number
  competitionName?: string
}

interface CompetitionGroup {
  competitionId: number
  competitionName: string
  participants: Participant[]
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
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionGroup[]>([])
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [competitions, setCompetitions] = useState<any[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')

  // Helper functions for unified header
  const getResultsStateInfo = (): StateInfo[] => {
    const totalParticipants = selectedCompetition ? 
      ranking.length : 
      filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)
    
    const totalDisciplines = disciplines.length
    const completedScores = selectedCompetition ?
      ranking.reduce((sum, p) => sum + Object.keys(p.scores).length, 0) :
      filteredCompetitionGroups.reduce((sum, group) => 
        sum + group.participants.reduce((groupSum, p) => groupSum + Object.keys(p.scores).length, 0), 0
      )

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
        setCompetitionGroups([])
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
          rank: 0,
          competitionId: participant.assignedCompetitions?.[0], // Use first assigned competition
          competitionName: competitions.find(c => c.id === participant.assignedCompetitions?.[0])?.name || 'Unknown Competition'
        }
      })

      if (selectedCompetition) {
        // Single competition view - normal ranking
        participantsList.sort((a, b) => b.totalScore - a.totalScore)
        participantsList.forEach((participant, index) => {
          participant.rank = index + 1
        })
        setRanking(participantsList)
        setCompetitionGroups([])
      } else {
        // Group by competition and rank within each competition
        const competitionMap = new Map<number, Participant[]>()
        
        participantsList.forEach(participant => {
          const compId = participant.competitionId || 0
          if (!competitionMap.has(compId)) {
            competitionMap.set(compId, [])
          }
          competitionMap.get(compId)!.push(participant)
        })

        // Create competition groups with individual rankings
        const groups: CompetitionGroup[] = []
        competitionMap.forEach((participants, competitionId) => {
          // Sort participants by total score within this competition
          participants.sort((a, b) => b.totalScore - a.totalScore)
          participants.forEach((participant, index) => {
            participant.rank = index + 1
          })

          const competitionName = competitions.find(c => c.id === competitionId)?.name || `Competition ${competitionId}`
          groups.push({
            competitionId,
            competitionName,
            participants
          })
        })

        // Sort groups by competition name
        groups.sort((a, b) => a.competitionName.localeCompare(b.competitionName))
        
        setCompetitionGroups(groups)
        setRanking([]) // Clear single ranking when showing groups
      }

      setDisciplines(Array.from(disciplineSet).sort())
      setEventName(scores[0]?.event_name || scores[0]?.eventName || `Event ${eventId}`)
    } catch (error) {
      console.error('Error fetching event ranking:', error)
      setRanking([])
      setCompetitionGroups([])
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

  // Export results to PDF
  const exportResultsPDF = () => {
    if (ranking.length === 0) return

    const doc = new jsPDF('landscape')
    
    // Add title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Competition Results', 20, 20)
    
    // Add event info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Event: ${eventName}`, 20, 35)
    if (squadName) {
      doc.text(`Squad: ${squadName}`, 20, 45)
    }
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, squadName ? 55 : 45)
    
    // Prepare table data
    const headers = ['Rank', 'Name', 'Club', 'Age', ...disciplines, 'Total']
    const tableData = filteredRanking.map(participant => [
      participant.rank,
      participant.name,
      participant.club,
      participant.age,
      ...disciplines.map(discipline => 
        participant.scores[discipline] ? formatScore(participant.scores[discipline]) : '-'
      ),
      formatScore(participant.totalScore)
    ])

    // Generate table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: squadName ? 65 : 55,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // Rank
        1: { halign: 'left', cellWidth: 40 },   // Name
        2: { halign: 'left', cellWidth: 35 },   // Club
        3: { halign: 'center', cellWidth: 15 }, // Age
        [headers.length - 1]: { 
          halign: 'center', 
          cellWidth: 20,
          fillColor: [240, 248, 255],
          fontStyle: 'bold'
        } // Total
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didParseCell: function(data) {
        // Highlight medal positions
        if (data.section === 'body' && data.column.index === 0) {
          const rank = parseInt(data.cell.text[0])
          if (rank <= 3) {
            switch (rank) {
              case 1:
                data.cell.styles.fillColor = [255, 215, 0] // Gold
                break
              case 2:
                data.cell.styles.fillColor = [192, 192, 192] // Silver
                break
              case 3:
                data.cell.styles.fillColor = [205, 127, 50] // Bronze
                break
            }
            data.cell.styles.textColor = [0, 0, 0]
            data.cell.styles.fontStyle = 'bold'
          }
        }
        
        // Highlight total score column
        if (data.section === 'body' && data.column.index === headers.length - 1) {
          data.cell.styles.fillColor = [240, 248, 255]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    })

    // Save the PDF
    doc.save(`results_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Filter participants based on search term
  const filteredRanking = ranking.filter(participant =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.club.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter competition groups based on search term
  const filteredCompetitionGroups = competitionGroups.map(group => ({
    ...group,
    participants: group.participants.filter(participant =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.participants.length > 0)

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
        secondaryAction={{
          label: 'Export PDF',
          icon: DocumentArrowDownIcon,
          onClick: exportResultsPDF
        }}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={selectedCompetition ? filteredRanking.length : filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)}
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
        ) : selectedCompetition ? (
          // Single Competition View
          filteredRanking.length === 0 ? (
            <div className="p-6 text-center">
              <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found for this competition</p>
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
          )
        ) : (
          // Grouped by Competition View
          filteredCompetitionGroups.length === 0 ? (
            <div className="p-6 text-center">
              <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found for this event</p>
            </div>
          ) : (
            <div className="space-y-8 p-6">
              {filteredCompetitionGroups.map((group) => (
                <div key={group.competitionId} className="border rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h3 className="text-xl font-bold text-white">{group.competitionName}</h3>
                    <p className="text-blue-100 text-sm">{group.participants.length} participants</p>
                  </div>
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
                        {group.participants.map((participant) => (
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
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Results
