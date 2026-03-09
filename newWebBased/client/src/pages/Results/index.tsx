/**
 * Results Page - Main Component
 * Point 123: Separation of Concerns - COMPLETE REFACTORING ✅
 * 
 * Main orchestration component for results display.
 * Uses extracted hooks and components for better maintainability.
 * 
 * Architecture:
 * - Hooks: useResultsData, useResultsHelpers, useCertificates, useExport
 * - Components: ResultsTable, ResultsFilters, CertificateDialog
 * - Template: EventManagementTemplate for consistent layout
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from '@/contexts/EventContext'
import { useCertificateLayout } from '@/contexts/CertificateLayoutContext'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
import { TrophyIcon } from '@heroicons/react/24/outline'
import getSocket from '@/utils/socket'

// Hooks
import { 
  useResultsData, 
  useResultsHelpers, 
  useCertificates, 
  useExport 
} from './hooks'

// Components
import { 
  ResultsTable, 
  ResultsFilters, 
  CertificateDialog 
} from './components'

// Types
import type { PaperFormat } from './Results.types'

const Results = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()
  const { selectedLayout: contextSelectedLayout, setSelectedLayout: setContextSelectedLayout } = useCertificateLayout()
  
  // URL parameters
  const urlEventId = searchParams.get('eventId')
  const urlSquadName = searchParams.get('squadName')
  
  // Event ID from context or URL
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const squadName = urlSquadName

  // UI State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [genderFilter, setGenderFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showDisciplineScores, setShowDisciplineScores] = useState(true)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedPaperFormat, setSelectedPaperFormat] = useState<PaperFormat>('A4')
  const [certificatesToPrint, setCertificatesToPrint] = useState<any[]>([])

  // Data Hook - Loads all results data
  const {
    ranking,
    competitionGroups,
    competitions,
    disciplines,
    disciplineFormulas,
    selectedCompetitionDisciplineInfo,
    eventName,
    isLoading,
    fetchCompetitions,
    fetchEventRanking
  } = useResultsData(eventId, squadName, selectedCompetition)

  // Helpers Hook - Formatting utilities
  const {
    formatScore,
    getMedalColor,
    getMedalEmoji
  } = useResultsHelpers()

  // Certificates Hook - Certificate generation
  const {
    certificateLayouts,
    isPrintingCertificates,
    fetchCertificateLayouts,
    generateCertificates,
    PAPER_FORMATS
  } = useCertificates()

  // Export Hook - CSV/PDF export
  const {
    exportResultsCSV,
    exportResultsPDF
  } = useExport({
    eventName,
    selectedCompetition,
    ranking,
    competitionGroups,
    disciplines,
    disciplineFormulas,
    selectedCompetitionDisciplineInfo,
    formatScore
  })

  // Data loading: always fetch competitions first, then ranking
  // Single effect to prevent race conditions between parallel fetches
  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    fetchCompetitions().then((competitionsData) => {
      if (!cancelled) {
        fetchEventRanking(competitionsData)
      }
    })

    return () => { cancelled = true }
  }, [eventId, selectedCompetition])

  // Live updates via Socket.IO
  useEffect(() => {
    if (!eventId) return

    const socket = getSocket()
    
    const handleScoreUpdate = () => {
      console.log('Score updated, refreshing results...')
      fetchEventRanking()
    }

    socket.on('score-updated', handleScoreUpdate)
    socket.on('competition-updated', handleScoreUpdate)

    return () => {
      socket.off('score-updated', handleScoreUpdate)
      socket.off('competition-updated', handleScoreUpdate)
    }
  }, [eventId, selectedCompetition])

  // Filter participants
  const filteredRanking = ranking.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (participant.startNumber && participant.startNumber.toString().includes(searchTerm))
    
    const matchesGender = !genderFilter || participant.gender === genderFilter
    
    return matchesSearch && matchesGender
  })

  const filteredCompetitionGroups = competitionGroups
    .map(group => ({
      ...group,
      participants: group.participants.filter(participant => {
        const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (participant.startNumber && participant.startNumber.toString().includes(searchTerm))
        
        const matchesGender = !genderFilter || participant.gender === genderFilter
        
        return matchesSearch && matchesGender
      })
    }))
    .filter(group => group.participants.length > 0)

  // Get all participants for certificate printing
  const getAllParticipantsForCertificates = () => {
    if (selectedCompetition) {
      return filteredRanking
    } else {
      return filteredCompetitionGroups.flatMap(group => group.participants)
    }
  }

  // Show certificate dialog
  const showCertificateDialog = (participants: any[]) => {
    setCertificatesToPrint(participants)
    setShowCertificateModal(true)
    fetchCertificateLayouts()
  }

  // Handle certificate generation
  const handleGenerateCertificates = () => {
    generateCertificates(
      certificatesToPrint,
      contextSelectedLayout as any,
      selectedPaperFormat,
      competitions,
      selectedCompetition,
      eventName
    ).then(() => {
      setShowCertificateModal(false)
      setCertificatesToPrint([])
      setSelectedPaperFormat('A4')
    })
  }

  // Create filter section JSX
  const filterSectionJSX = (
    <ResultsFilters
      competitions={competitions} // Pass all competitions, not filtered
      selectedCompetition={selectedCompetition}
      onCompetitionChange={(compId) => setSelectedCompetition(compId || '')}
      genderFilter={genderFilter}
      onGenderChange={setGenderFilter}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
    />
  )

  // Debug logging
  console.log('Results Debug:', {
    showFilters,
    filterSectionExists: !!filterSectionJSX,
    competitionsCount: competitions.length,
    competitionsData: competitions
  })

  return (
    <EventManagementTemplate
      title={t('results.title')}
      subtitle={t('results.subtitle')}
      icon={TrophyIcon}
      searchPlaceholder={t('results.searchPlaceholder')}
      onSearchChange={setSearchTerm}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filterSection={filterSectionJSX}
      showExportCSV={true}
      onExportCSV={exportResultsCSV}
      showExportPDF={true}
      onExportPDF={exportResultsPDF}
      showPrint={true}
      onPrint={() => showCertificateDialog(getAllParticipantsForCertificates())}
      printLabel={t('results.printCertificates')}
      totalCount={selectedCompetition ? filteredRanking.length : filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)}
      showEventContext={true}
      showViewToggle={false}
      customActions={
        <>
          <LiveUpdateIndicator label={t('common.liveUpdates')} />
          <button
            onClick={() => setShowDisciplineScores(!showDisciplineScores)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showDisciplineScores
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={showDisciplineScores ? t('results.hideDisciplineScores') : t('results.showDisciplineScores')}
          >
            {showDisciplineScores ? '📊 ' + t('results.hideDetails') : '📊 ' + t('results.showDetails')}
          </button>
        </>
      }
    >
      {() => (
        <div>
          {/* Main Results Table */}
          <ResultsTable
            isLoading={isLoading}
            selectedCompetition={selectedCompetition}
            filteredRanking={filteredRanking}
            filteredCompetitionGroups={filteredCompetitionGroups}
            disciplines={disciplines}
            disciplineFormulas={disciplineFormulas}
            showDisciplineScores={showDisciplineScores}
            formatScore={formatScore}
            getMedalColor={getMedalColor}
            getMedalEmoji={getMedalEmoji}
          />

          {/* Certificate Printing Dialog */}
          <CertificateDialog
            isOpen={showCertificateModal}
            onClose={() => {
              setShowCertificateModal(false)
              setCertificatesToPrint([])
              setSelectedPaperFormat('A4')
            }}
            participants={certificatesToPrint}
            layouts={certificateLayouts}
            selectedLayout={contextSelectedLayout as any}
            onLayoutChange={(layout) => {
              if (layout) {
                // Map to context format - keep var_value for certificate generation
                const contextLayout = {
                  ...layout,
                  fields: layout.fields?.map((field: any) => ({
                    ...field,
                    var_text: field.var_value, // Add var_text for context compatibility
                    var_spaltenwert: null
                    // var_value remains unchanged for certificate generation
                  }))
                }
                setContextSelectedLayout(contextLayout as any)
              } else {
                setContextSelectedLayout(null)
              }
            }}
            selectedPaperFormat={selectedPaperFormat}
            onPaperFormatChange={setSelectedPaperFormat}
            isPrinting={isPrintingCertificates}
            onGenerate={handleGenerateCertificates}
            paperFormats={PAPER_FORMATS}
          />
        </div>
      )}
    </EventManagementTemplate>
  )
}

export default Results
