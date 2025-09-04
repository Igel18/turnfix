import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEvent } from '../contexts/EventContext'
import EventSelector from '@/components/EventSelector'
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
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

// Group 1: Database Management - Athletes, Clubs, Organizations
const getDatabaseManagementActions = (statistics: any) => [
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
    name: 'Manage Associations',
    description: 'Manage gymnastics associations and federations',
    href: '/associations',
    icon: BuildingLibraryIcon,
    color: 'bg-teal-500',
    count: statistics.totalAssociations,
    countLabel: 'Associations'
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
    href: '/events',
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
    name: 'Score Capture',
    description: 'Enter competition results and scores',
    href: '/score-capture',
    icon: ClipboardDocumentListIcon,
    color: 'bg-orange-500'
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

export function Dashboard() {
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
    totalRegions: 0,
    totalAssociations: 0,
    totalDisciplines: 0,
    totalLocations: 0,
    totalPersons: 0,
    totalSports: 0,
    totalFormulas: 0,
    totalDisciplineGroups: 0,
    totalCertificateLayouts: 0,
    totalStatuses: 0,
    loading: true
  })

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
          '/api/statuses'
        ]

        const additionalPromises = additionalApis.map(url => 
          fetch(url).then(res => res.ok ? res.json() : { pagination: { total: 0 } }).catch(() => ({ pagination: { total: 0 } }))
        )

        const [statusesData] = await Promise.all(additionalPromises)

        setStatistics({
          activeEvents: (events as any).pagination?.total || 0,
          registeredClubs: (clubs as any).pagination?.total || 0,
          totalAthletes: (participants as any).pagination?.total || 0,
          totalRegions: 0, // TODO: Add API endpoint
          totalAssociations: 0, // TODO: Add API endpoint
          totalDisciplines: 0, // TODO: Add API endpoint
          totalLocations: 0, // TODO: Add API endpoint
          totalPersons: 0, // TODO: Add API endpoint
          totalSports: 0, // TODO: Add API endpoint
          totalFormulas: 0, // TODO: Add API endpoint
          totalDisciplineGroups: 0, // TODO: Add API endpoint
          totalCertificateLayouts: 0, // TODO: Add API endpoint
          totalStatuses: statusesData.pagination?.total || 0,
          loading: false
        })
      } catch (error) {
        console.error('Error fetching statistics:', error)
        setStatistics(prev => ({ 
          ...prev, 
          totalRegions: 0,
          totalAssociations: 0,
          totalDisciplines: 0,
          totalLocations: 0,
          totalPersons: 0,
          totalSports: 0,
          totalFormulas: 0,
          totalDisciplineGroups: 0,
          totalCertificateLayouts: 0,
          totalStatuses: 0,
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
          Welcome back, {user?.username || 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your gymnastics competitions and events from this dashboard.
        </p>
      </div>

      {/* Action Groups */}
      <div className="space-y-8">
        {/* Database Management Group */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gray-100 p-2 rounded-lg mr-3">
                <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Database Management</h2>
                <p className="text-sm text-gray-600">Manage athletes, clubs, and organizational structure</p>
              </div>
            </div>
            <button
              onClick={() => setIsDatabaseManagementCollapsed(!isDatabaseManagementCollapsed)}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span>{isDatabaseManagementCollapsed ? 'Expand' : 'Collapse'}</span>
              {isDatabaseManagementCollapsed ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronUpIcon className="h-4 w-4" />
              )}
            </button>
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
                          {action.name}
                        </h3>
                        {!statistics.loading && action.count !== undefined && (
                          <p className="text-xs font-semibold text-blue-600 mt-1">
                            {action.countLabel}: {action.count}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {action.description}
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
              <h2 className="text-xl font-semibold text-gray-900">Event Management</h2>
              <p className="text-sm text-gray-600">3-step workflow: Setup → Competition → Results</p>
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
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Event Setup</h3>
                      <p className="text-sm text-gray-600">Planning & Configuration</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEventSetupCollapsed(!isEventSetupCollapsed)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span>{isEventSetupCollapsed ? 'Expand' : 'Collapse'}</span>
                    {isEventSetupCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </button>
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
                                <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                  {action.name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {action.description}
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
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-orange-600">2</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Competition Day</h3>
                      <p className="text-sm text-gray-600">Live Scoring & Execution</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCompetitionDayCollapsed(!isCompetitionDayCollapsed)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span>{isCompetitionDayCollapsed ? 'Expand' : 'Collapse'}</span>
                    {isCompetitionDayCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {!isCompetitionDayCollapsed && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {competitionDayActions.map((action) => {
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
                                  {action.name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {action.description}
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
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <span className="text-sm font-bold text-green-600">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Results & Awards</h3>
                      <p className="text-sm text-gray-600">Final Results & Completion</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsResultsAwardsCollapsed(!isResultsAwardsCollapsed)}
                    className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span>{isResultsAwardsCollapsed ? 'Expand' : 'Collapse'}</span>
                    {isResultsAwardsCollapsed ? (
                      <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4" />
                    )}
                  </button>
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
                                  {action.name}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  {action.description}
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
              <p className="text-sm">Choose an event above to access the 3-step workflow: Setup → Competition → Results</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full">
                  <CalendarDaysIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">New event "Spring Championships" created</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full">
                  <UserGroupIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">15 new participants registered</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="bg-purple-100 p-2 rounded-full">
                  <TrophyIcon className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Competition results uploaded for "Youth Cup"</p>
                  <p className="text-xs text-gray-500">6 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
