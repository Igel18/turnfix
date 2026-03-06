import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useEvent } from '../contexts/EventContext'
import EventSelector from '@/components/EventSelector'
import { apiGet } from '../utils/api' // Add this import
import { 
  CalendarDaysIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  MapIcon,
  BuildingLibraryIcon,
  CogIcon,
  DocumentTextIcon,
  UserIcon,
  BeakerIcon,
  CalculatorIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

// Group 1: Database Management - Athletes, Clubs, Organizations
const getDatabaseManagementActions = (statistics: any) => [
  {
    name: 'Manage Associations',
    description: 'Manage gymnastics associations and federations',
    href: '/associations',
    icon: BuildingLibraryIcon,
    color: 'bg-teal-500',
    count: statistics.totalAssociations,
    countLabel: 'Associations'
  },
  {
    name: 'Manage Regions',
    description: 'Manage gymnastics regions and districts',
    href: '/regions',
    icon: MapIcon,
    color: 'bg-indigo-500',
    count: statistics.totalRegions,
    countLabel: 'Regions'
  },
  {
    name: 'Manage Clubs',
    description: 'Add and edit gymnastics clubs',
    href: '/clubs',
    icon: BuildingOfficeIcon,
    color: 'bg-green-500',
    count: statistics.registeredClubs,
    countLabel: 'Clubs'
  },
  {
    name: 'Manage Athletes',
    description: 'Add and manage athletes in the database',
    href: '/participants',
    icon: UserGroupIcon,
    color: 'bg-purple-500',
    count: statistics.totalAthletes,
    countLabel: 'Athletes'
  },
  {
    name: 'Manage Areas',
    description: 'Manage gender categories and areas',
    href: '/areas',
    icon: RectangleGroupIcon,
    color: 'bg-rose-500',
    count: statistics.totalAreas,
    countLabel: 'Areas'
  },
  {
    name: 'Manage Disciplines',
    description: 'Configure gymnastics disciplines and apparatus',
    href: '/disciplines',
    icon: CogIcon,
    color: 'bg-amber-500',
    count: statistics.totalDisciplines,
    countLabel: 'Disciplines'
  },
  {
    name: 'Manage Locations',
    description: 'Manage competition venues and locations',
    href: '/locations',
    icon: MapIcon,
    color: 'bg-red-500',
    count: statistics.totalLocations,
    countLabel: 'Locations'
  },
  {
    name: 'Manage Persons',
    description: 'Manage contact persons and individuals',
    href: '/persons',
    icon: UserIcon,
    color: 'bg-orange-500',
    count: statistics.totalPersons,
    countLabel: 'Persons'
  },
  {
    name: 'Manage Sports',
    description: 'Manage sport types and categories',
    href: '/sports',
    icon: BeakerIcon,
    color: 'bg-emerald-500',
    count: statistics.totalSports,
    countLabel: 'Sports'
  },
  {
    name: 'Manage Formulas',
    description: 'Manage calculation formulas and scoring methods',
    href: '/formulas',
    icon: CalculatorIcon,
    color: 'bg-cyan-500',
    count: statistics.totalFormulas,
    countLabel: 'Formulas'
  },
  {
    name: 'Manage Discipline Groups',
    description: 'Manage discipline groups and categories',
    href: '/discipline-groups',
    icon: TagIcon,
    color: 'bg-slate-500',
    count: statistics.totalDisciplineGroups,
    countLabel: 'Groups'
  },
  {
    name: 'Discipline Fields',
    description: 'Manage scoring fields for each discipline',
    href: '/discipline-fields',
    icon: CogIcon,
    color: 'bg-purple-500',
    count: statistics.totalDisciplineFields || 0,
    countLabel: 'Fields'
  },
  {
    name: 'Certificate Layouts',
    description: 'Design and manage certificate templates and layouts',
    href: '/certificate-layouts',
    icon: DocumentTextIcon,
    color: 'bg-pink-500',
    count: statistics.totalCertificateLayouts,
    countLabel: 'Layouts'
  },
  {
    name: 'Status Management',
    description: 'Manage participant statuses and squad states',
    href: '/status-management',
    icon: CogIcon,
    color: 'bg-violet-500',
    count: statistics.totalStatuses,
    countLabel: 'Statuses'
  },
  {
    name: 'Manage Documents',
    description: 'Manage icons, images, XML imports and preset files',
    href: '/documents',
    icon: DocumentTextIcon,
    color: 'bg-sky-500',
    count: statistics.totalDocuments,
    countLabel: 'Files'
  },
  {
    name: 'Create Event',
    description: 'Set up a new gymnastics competition',
    href: '/events',
    icon: CalendarDaysIcon,
    color: 'bg-blue-500',
    count: statistics.activeEvents,
    countLabel: 'Events'
  }
]

// Group 2: Event Management - Organized into 3 workflow steps
const eventSetupActions = [
  {
    name: 'Manage Events',
    description: 'Create and configure events',
    href: '/event-management',
    icon: CalendarDaysIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'View Competitions',
    description: 'Define competitions and disciplines',
    href: '/competitions',
    icon: TrophyIcon,
    color: 'bg-yellow-500'
  },
  {
    name: 'Event Participants',
    description: 'Add participants to event and assign to competitions',
    href: '/event-participants',
    icon: UserGroupIcon,
    color: 'bg-indigo-500'
  },
  {
    name: 'Manage Squads',
    description: 'Create squads and organize participants',
    href: '/squads',
    icon: UserGroupIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Manage Groups',
    description: 'Create and manage groups for team competitions',
    href: '/groups',
    icon: UserGroupIcon,
    color: 'bg-emerald-500',
    badge: 'Beta'
  },
  {
    name: 'Manage Teams',
    description: 'Create and manage teams for team competitions',
    href: '/teams',
    icon: UserGroupIcon,
    color: 'bg-teal-500',
    badge: 'Beta'
  },
  {
    name: 'Time Planning',
    description: 'Plan competition times and apparatus rotations',
    href: '/time-planning',
    icon: ClockIcon,
    color: 'bg-purple-500'
  },
  {
    name: 'Meldematrix',
    description: 'Registration matrix: Clubs vs Competitions overview',
    href: '/meldematrix',
    icon: DocumentTextIcon,
    color: 'bg-emerald-500'
  }
]

const competitionDayActions = [
  {
    name: 'Squad Status',
    description: 'Manage status for squad-discipline combinations',
    href: '/squad-status',
    icon: ClipboardDocumentListIcon,
    color: 'bg-purple-500'
  },
  {
    name: 'Competition Status',
    description: 'Monitor live competition progress',
    href: '/competition-status',
    icon: TrophyIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Live Scores',
    description: 'Live score updates and recent results',
    href: '/live-scores',
    icon: ClipboardDocumentListIcon,
    color: 'bg-indigo-500'
  },
  {
    name: 'Individual Scoring',
    description: 'Enter competition results and scores for individual participants',
    href: '/score-capture',
    icon: ClipboardDocumentListIcon,
    color: 'bg-orange-500'
  },
  {
    name: 'Group Scoring',
    description: 'Enter scores for TeamGym groups with component breakdown',
    href: '/group-scoring',
    icon: UserGroupIcon,
    color: 'bg-cyan-500',
    badge: 'Beta'
  },
  {
    name: 'Team Scoring',
    description: 'Enter scores for competition teams (Mannschaften)',
    href: '/team-scoring',
    icon: UserGroupIcon,
    color: 'bg-teal-500',
    badge: 'Beta'
  },
  {
    name: 'Jury Portal',
    description: 'Simplified jury interface for competition day (opens in new window on port 3002)',
    href: `${window.location.protocol}//${window.location.hostname}:3002/jury`,
    icon: TrophyIcon,
    color: 'bg-blue-600',
    external: true
  }
]

const resultsAwardsActions = [
  {
    name: 'View Results',
    description: 'Check competition results and rankings',
    href: '/results',
    icon: ChartBarIcon,
    color: 'bg-red-500'
  },
  {
    name: 'Medallienspiegel',
    description: 'Medal standings by club',
    href: '/medallienspiegel',
    icon: TrophyIcon,
    color: 'bg-yellow-500'
  }
]

export function ManagementCenter() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { 
    selectedEvent, 
    selectedCompetition, 
    selectedSquad
  } = useEvent()

  // UI state - load from localStorage
  const [isDatabaseManagementCollapsed, setIsDatabaseManagementCollapsed] = useState(() => {
    const saved = localStorage.getItem('databaseManagementCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  
  // Event Management step collapse states
  const [isEventSetupCollapsed, setIsEventSetupCollapsed] = useState(() => {
    const saved = localStorage.getItem('eventSetupCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [isCompetitionDayCollapsed, setIsCompetitionDayCollapsed] = useState(() => {
    const saved = localStorage.getItem('competitionDayCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [isResultsAwardsCollapsed, setIsResultsAwardsCollapsed] = useState(() => {
    const saved = localStorage.getItem('resultsAwardsCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Statistics state
  const [statistics, setStatistics] = useState({
    activeEvents: 0,
    registeredClubs: 0,
    totalAthletes: 0,
    totalAreas: 0,
    totalRegions: 0,
    totalAssociations: 0,
    totalDisciplines: 0,
    totalLocations: 0,
    totalPersons: 0,
    totalSports: 0,
    totalFormulas: 0,
    totalDisciplineGroups: 0,
    totalDisciplineFields: 0,
    totalCertificateLayouts: 0,
    totalStatuses: 0,
    totalDocuments: 0,
    loading: true
  })

  // Helper function to translate action names and descriptions
  const translateAction = (action: any) => {
    // Map action names to translation keys
    const nameKeyMap: { [key: string]: string } = {
      'Manage Events': 'managementCenter.eventManagement.eventSetup.manageEvents.title',
      'View Competitions': 'managementCenter.eventManagement.eventSetup.viewCompetitions.title',
      'Event Participants': 'managementCenter.eventManagement.eventSetup.eventParticipants.title',
      'Manage Squads': 'managementCenter.eventManagement.eventSetup.manageSquads.title',
      'Manage Groups': 'managementCenter.eventManagement.eventSetup.manageGroups.title',
      'Manage Teams': 'managementCenter.eventManagement.eventSetup.manageTeams.title',
      'Time Planning': 'managementCenter.eventManagement.eventSetup.timePlanning.title',
      'Meldematrix': 'managementCenter.eventManagement.eventSetup.meldematrix.title',
      'Squad Status': 'managementCenter.eventManagement.competitionDay.squadStatus.title',
      'Competition Status': 'managementCenter.eventManagement.competitionDay.competitionStatus.title',
      'Live Scores': 'managementCenter.eventManagement.competitionDay.liveScores.title',
      'Individual Scoring': 'managementCenter.eventManagement.competitionDay.individualScoring.title',
      'Group Scoring': 'managementCenter.eventManagement.competitionDay.groupScoring.title',
      'Team Scoring': 'managementCenter.eventManagement.competitionDay.teamScoring.title',
      'Jury Portal': 'managementCenter.eventManagement.competitionDay.juryPortal.title',
      'View Results': 'managementCenter.eventManagement.resultsAwards.results.title',
      'Medals': 'managementCenter.eventManagement.resultsAwards.medals.title',
      'Medallienspiegel': 'managementCenter.eventManagement.resultsAwards.medallienspiegel.title',
      'Manage Regions': 'managementCenter.databaseManagement.regions.title',
      'Manage Associations': 'managementCenter.databaseManagement.associations.title',
      'Manage Clubs': 'managementCenter.databaseManagement.clubs.title',
      'Manage Athletes': 'managementCenter.databaseManagement.athletes.title',
      'Manage Areas': 'managementCenter.databaseManagement.areas.title',
      'Manage Disciplines': 'managementCenter.databaseManagement.disciplines.title',
      'Manage Locations': 'managementCenter.databaseManagement.locations.title',
      'Manage Persons': 'managementCenter.databaseManagement.persons.title',
      'Manage Sports': 'managementCenter.databaseManagement.sports.title',
      'Manage Formulas': 'managementCenter.databaseManagement.formulas.title',
      'Manage Discipline Groups': 'managementCenter.databaseManagement.disciplineGroups.title',
      'Discipline Fields': 'managementCenter.databaseManagement.disciplineFields.title',
      'Certificate Layouts': 'managementCenter.databaseManagement.certificateLayouts.title',
      'Status Management': 'managementCenter.databaseManagement.statusManagement.title',
      'Manage Documents': 'managementCenter.databaseManagement.documents.title',
      'Create Event': 'managementCenter.databaseManagement.createEvent.title'
    }

    const descriptionKeyMap: { [key: string]: string } = {
      'Manage Events': 'managementCenter.eventManagement.eventSetup.manageEvents.description',
      'View Competitions': 'managementCenter.eventManagement.eventSetup.viewCompetitions.description',
      'Event Participants': 'managementCenter.eventManagement.eventSetup.eventParticipants.description',
      'Manage Squads': 'managementCenter.eventManagement.eventSetup.manageSquads.description',
      'Manage Groups': 'managementCenter.eventManagement.eventSetup.manageGroups.description',
      'Manage Teams': 'managementCenter.eventManagement.eventSetup.manageTeams.description',
      'Time Planning': 'managementCenter.eventManagement.eventSetup.timePlanning.description',
      'Meldematrix': 'managementCenter.eventManagement.eventSetup.meldematrix.description',
      'Squad Status': 'managementCenter.eventManagement.competitionDay.squadStatus.description',
      'Competition Status': 'managementCenter.eventManagement.competitionDay.competitionStatus.description',
      'Live Scores': 'managementCenter.eventManagement.competitionDay.liveScores.description',
      'Individual Scoring': 'managementCenter.eventManagement.competitionDay.individualScoring.description',
      'Group Scoring': 'managementCenter.eventManagement.competitionDay.groupScoring.description',
      'Team Scoring': 'managementCenter.eventManagement.competitionDay.teamScoring.description',
      'Jury Portal': 'managementCenter.eventManagement.competitionDay.juryPortal.description',
      'View Results': 'managementCenter.eventManagement.resultsAwards.results.description',
      'Medals': 'managementCenter.eventManagement.resultsAwards.medals.description',
      'Medallienspiegel': 'managementCenter.eventManagement.resultsAwards.medallienspiegel.description',
      'Manage Regions': 'managementCenter.databaseManagement.regions.description',
      'Manage Associations': 'managementCenter.databaseManagement.associations.description',
      'Manage Clubs': 'managementCenter.databaseManagement.clubs.description',
      'Manage Athletes': 'managementCenter.databaseManagement.athletes.description',
      'Manage Areas': 'managementCenter.databaseManagement.areas.description',
      'Manage Disciplines': 'managementCenter.databaseManagement.disciplines.description',
      'Manage Locations': 'managementCenter.databaseManagement.locations.description',
      'Manage Persons': 'managementCenter.databaseManagement.persons.description',
      'Manage Sports': 'managementCenter.databaseManagement.sports.description',
      'Manage Formulas': 'managementCenter.databaseManagement.formulas.description',
      'Manage Discipline Groups': 'managementCenter.databaseManagement.disciplineGroups.description',
      'Discipline Fields': 'managementCenter.databaseManagement.disciplineFields.description',
      'Certificate Layouts': 'managementCenter.databaseManagement.certificateLayouts.description',
      'Status Management': 'managementCenter.databaseManagement.statusManagement.description',
      'Manage Documents': 'managementCenter.databaseManagement.documents.description',
      'Create Event': 'managementCenter.databaseManagement.createEvent.description'
    }

    return {
      name: nameKeyMap[action.name] ? t(nameKeyMap[action.name]) : action.name,
      description: descriptionKeyMap[action.name] ? t(descriptionKeyMap[action.name]) : action.description,
      countLabel: action.name === 'Create Event' ? t('managementCenter.databaseManagement.createEvent.countLabel') : action.countLabel
    }
  }

  // Fetch statistics from API
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const [eventsRes, clubsRes, participantsRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/clubs'), 
          fetch('/api/participants')
        ])

        // Check if responses are ok and contain JSON
        let events = { events: [] }
        let clubs = { clubs: [] }
        let participants = { participants: [] }

        if (eventsRes.ok) {
          try {
            events = await eventsRes.json()
          } catch (e) {
            console.warn('Events API returned non-JSON response')
          }
        } else {
          console.warn('Events API returned error:', eventsRes.status, eventsRes.statusText)
        }

        if (clubsRes.ok) {
          try {
            clubs = await clubsRes.json()
          } catch (e) {
            console.warn('Clubs API returned non-JSON response')
          }
        } else {
          console.warn('Clubs API returned error:', clubsRes.status, clubsRes.statusText)
        }

        if (participantsRes.ok) {
          try {
            participants = await participantsRes.json()
          } catch (e) {
            console.warn('Participants API returned non-JSON response')
          }
        } else {
          console.warn('Participants API returned error:', participantsRes.status, participantsRes.statusText)
        }

        // Fetch additional statistics for database management
        const additionalApis = [
          '/regions/count',
          '/associations/count', 
          '/disciplines/count',
          '/venues/count',
          '/persons/count',
          '/sports/count',
          '/formulas/count',
          '/discipline-groups/count',
          '/discipline-fields/count',
          '/layouts/count',
          '/statuses',
          '/areas/count',
          '/documents/count'
        ]

        const additionalPromises = additionalApis.map(url => 
          apiGet(url).then(res => res).catch(() => ({ pagination: { total: 0 }, count: 0 }))
        )

        const [
          areasData,
          associationsData,
          disciplinesData,
          venuesData,
          personsData,
          sportsData,
          formulasData,
          disciplineGroupsData,
          disciplineFieldsData,
          layoutsData,
          statusesData,
          areasCountData,
          documentsCountData
        ] = await Promise.all(additionalPromises)

        setStatistics({
          activeEvents: (events as any).pagination?.total || 0,
          registeredClubs: (clubs as any).pagination?.total || 0,
          totalAthletes: (participants as any).pagination?.total || 0,
          totalAreas: areasCountData?.count || 0,
          totalRegions: areasData?.count || 0,
          totalAssociations: associationsData?.count || 0,
          totalDisciplines: disciplinesData?.count || 0,
          totalLocations: venuesData?.count || 0,
          totalPersons: personsData?.count || 0,
          totalSports: sportsData?.count || 0,
          totalFormulas: formulasData?.count || 0,
          totalDisciplineGroups: disciplineGroupsData?.count || 0,
          totalDisciplineFields: disciplineFieldsData?.count || 0,
          totalCertificateLayouts: layoutsData?.count || 0,
          totalStatuses: statusesData.pagination?.total || 0,
          totalDocuments: documentsCountData?.count || 0,
          loading: false
        })
      } catch (error) {
        console.error('Error fetching statistics:', error)
        setStatistics(prev => ({ 
          ...prev, 
          loading: false 
        }))
      }
    }

    fetchStatistics()
  }, [])

  // Save collapse state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('databaseManagementCollapsed', JSON.stringify(isDatabaseManagementCollapsed))
  }, [isDatabaseManagementCollapsed])

  useEffect(() => {
    localStorage.setItem('eventSetupCollapsed', JSON.stringify(isEventSetupCollapsed))
  }, [isEventSetupCollapsed])

  useEffect(() => {
    localStorage.setItem('competitionDayCollapsed', JSON.stringify(isCompetitionDayCollapsed))
  }, [isCompetitionDayCollapsed])

  useEffect(() => {
    localStorage.setItem('resultsAwardsCollapsed', JSON.stringify(isResultsAwardsCollapsed))
  }, [isResultsAwardsCollapsed])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('managementCenter.welcome', { username: user?.username || 'User' })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('managementCenter.subtitle')}
        </p>
      </div>

      {/* Action Groups */}
      <div className="space-y-8">
        {/* Database Management Group */}
        <div>
          <div 
            className="flex items-center justify-between mb-6 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            onClick={() => setIsDatabaseManagementCollapsed(!isDatabaseManagementCollapsed)}
          >
            <div className="flex items-center">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('managementCenter.databaseManagement.title')}</h2>
                <p className="text-sm text-gray-600">{t('managementCenter.databaseManagement.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
              <span>{isDatabaseManagementCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
              {isDatabaseManagementCollapsed ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </div>
          </div>
          
          {!isDatabaseManagementCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getDatabaseManagementActions(statistics).map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-105 transition-transform relative`}>
                        <Icon className="h-6 w-6" />
                        {!statistics.loading && action.count !== undefined && (
                          <div className="absolute -top-2 -right-2 bg-white text-gray-900 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-gray-100 shadow-sm">
                            {action.count > 99 ? '99+' : action.count}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {translateAction(action).name}
                        </h3>
                        {!statistics.loading && action.count !== undefined && (
                          <p className="text-xs font-semibold text-blue-600 mt-1">
                            {translateAction(action).countLabel}: {action.count}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {translateAction(action).description}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Event Management Group */}
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('managementCenter.eventManagement.title')}</h2>
              <p className="text-sm text-gray-600">{t('managementCenter.eventManagement.subtitle')}</p>
            </div>
          </div>
          
          {/* Event Selector */}
          <div className="mb-6">
            <EventSelector />
          </div>

          {/* Event Management Workflow Steps */}
          {selectedEvent && (
            <div className="space-y-6">
              {/* Step 1: Event Setup */}
              <div className="bg-white border rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsEventSetupCollapsed(!isEventSetupCollapsed)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('managementCenter.eventManagement.eventSetup.title')}</h3>
                      <p className="text-sm text-gray-600">{t('managementCenter.eventManagement.eventSetup.subtitle')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
                    <span>{isEventSetupCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
                    {isEventSetupCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                
                {!isEventSetupCollapsed && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {eventSetupActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <Link
                            key={action.name}
                            to={`${action.href}?eventId=${selectedEvent.int_eventid}${selectedCompetition ? `&competitionId=${selectedCompetition.id}` : ''}${selectedSquad ? `&squadName=${encodeURIComponent(selectedSquad.squad_name)}` : ''}`}
                            className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all"
                          >
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center justify-center gap-2">
                                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                    {translateAction(action).name}
                                  </h4>
                                  {action.badge && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      {action.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {translateAction(action).description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Competition Day */}
              <div className="bg-white border rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsCompetitionDayCollapsed(!isCompetitionDayCollapsed)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-orange-600">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('managementCenter.eventManagement.competitionDay.title')}</h3>
                      <p className="text-sm text-gray-600">{t('managementCenter.eventManagement.competitionDay.subtitle')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
                    <span>{isCompetitionDayCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
                    {isCompetitionDayCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                
                {!isCompetitionDayCollapsed && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {competitionDayActions.map((action) => {
                        const Icon = action.icon
                        const linkUrl = action.external 
                          ? action.href 
                          : `${action.href}?eventId=${selectedEvent.int_eventid}${selectedCompetition ? `&competitionId=${selectedCompetition.id}` : ''}${selectedSquad ? `&squadName=${encodeURIComponent(selectedSquad.squad_name)}` : ''}`
                        
                        if (action.external) {
                          return (
                            <a
                              key={action.name}
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all"
                            >
                              <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform relative`}>
                                  <Icon className="h-5 w-5" />
                                  {action.external && (
                                    <ArrowTopRightOnSquareIcon className="h-3 w-3 absolute -top-1 -right-1 bg-white text-gray-600 rounded-sm" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                    {translateAction(action).name}
                                    {action.external && (
                                      <ArrowTopRightOnSquareIcon className="h-3 w-3 inline ml-1 text-gray-400" />
                                    )}
                                  </h4>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {translateAction(action).description}
                                  </p>
                                </div>
                              </div>
                            </a>
                          )
                        }
                        
                        return (
                          <Link
                            key={action.name}
                            to={linkUrl}
                            className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all"
                          >
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center justify-center gap-2">
                                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                    {translateAction(action).name}
                                  </h4>
                                  {action.badge && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      {action.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {translateAction(action).description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Results & Awards */}
              <div className="bg-white border rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setIsResultsAwardsCollapsed(!isResultsAwardsCollapsed)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-green-600">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('managementCenter.eventManagement.resultsAwards.title')}</h3>
                      <p className="text-sm text-gray-600">{t('managementCenter.eventManagement.resultsAwards.subtitle')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 rounded-lg">
                    <span>{isResultsAwardsCollapsed ? t('managementCenter.buttons.expand') : t('managementCenter.buttons.collapse')}</span>
                    {isResultsAwardsCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </div>
                </div>
                
                {!isResultsAwardsCollapsed && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resultsAwardsActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <Link
                            key={action.name}
                            to={`${action.href}?eventId=${selectedEvent.int_eventid}${selectedCompetition ? `&competitionId=${selectedCompetition.id}` : ''}${selectedSquad ? `&squadName=${encodeURIComponent(selectedSquad.squad_name)}` : ''}`}
                            className="group bg-gray-50 p-4 rounded-lg border hover:shadow-md hover:bg-white transition-all"
                          >
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className={`${action.color} p-2 rounded-lg text-white group-hover:scale-105 transition-transform`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                  {translateAction(action).name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {translateAction(action).description}
                                </p>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!selectedEvent && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('managementCenter.eventManagement.selectEvent.title')}</h3>
              <p className="text-sm">{t('managementCenter.eventManagement.selectEvent.description')}</p>
            </div>
          )}
        </div>

        {/* Configuration Group */}
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <CogIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('managementCenter.configuration.title')}</h2>
              <p className="text-sm text-gray-600">{t('managementCenter.configuration.subtitle')}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/configuration"
              className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-blue-500 p-3 rounded-lg text-white group-hover:scale-105 transition-transform">
                  <CogIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {t('managementCenter.configuration.applicationSettings.title')}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('managementCenter.configuration.applicationSettings.description')}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagementCenter
