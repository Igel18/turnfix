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
  CogIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

// Group 1: Database Management - Athletes, Clubs, Organizations
const databaseManagementActions = [
  {
    name: 'Manage Regions',
    description: 'Manage gymnastics regions and districts',
    href: '/regions',
    icon: MapIcon,
    color: 'bg-indigo-500'
  },
  {
    name: 'Manage Associations',
    description: 'Manage gymnastics associations and federations',
    href: '/associations',
    icon: BuildingLibraryIcon,
    color: 'bg-teal-500'
  },
  {
    name: 'Manage Clubs',
    description: 'Add and edit gymnastics clubs',
    href: '/clubs',
    icon: BuildingOfficeIcon,
    color: 'bg-green-500'
  },
  {
    name: 'Manage Athletes',
    description: 'Add and manage athletes in the database',
    href: '/participants',
    icon: UserGroupIcon,
    color: 'bg-purple-500'
  },
  {
    name: 'Manage Disciplines',
    description: 'Configure gymnastics disciplines and apparatus',
    href: '/disciplines',
    icon: CogIcon,
    color: 'bg-amber-500'
  },
  {
    name: 'Create Event',
    description: 'Set up a new gymnastics competition',
    href: '/events',
    icon: CalendarDaysIcon,
    color: 'bg-blue-500'
  }
]

// Group 2: Event Management - Competitions, Scoring, Results
const eventManagementActions = [
  {
    name: 'View Competitions',
    description: 'Browse and manage ongoing competitions',
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
    description: 'Create squads and assign participants to competitions',
    href: '/squads',
    icon: UserGroupIcon,
    color: 'bg-blue-500'
  },
  {
    name: 'Score Capture',
    description: 'Enter competition results and scores',
    href: '/score-capture',
    icon: ClipboardDocumentListIcon,
    color: 'bg-orange-500'
  },
  {
    name: 'View Results',
    description: 'Check competition results and rankings',
    href: '/results',
    icon: ChartBarIcon,
    color: 'bg-red-500'
  }
]

export function Dashboard() {
  const { user } = useAuth()
  const { 
    selectedEvent, 
    selectedCompetition, 
    selectedSquad
  } = useEvent()

  // Statistics state
  const [statistics, setStatistics] = useState({
    activeEvents: 0,
    registeredClubs: 0,
    totalAthletes: 0,
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

        const [events, clubs, participants] = await Promise.all([
          eventsRes.json(),
          clubsRes.json(),
          participantsRes.json()
        ])

        setStatistics({
          activeEvents: events.events?.length || 0,
          registeredClubs: clubs.clubs?.length || 0,
          totalAthletes: participants.participants?.length || 0,
          loading: false
        })
      } catch (error) {
        console.error('Error fetching statistics:', error)
        setStatistics(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStatistics()
  }, [])

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

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Events</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.loading ? '...' : statistics.activeEvents}
              </p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Registered Clubs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.loading ? '...' : statistics.registeredClubs}
              </p>
            </div>
            <BuildingOfficeIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Athletes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {statistics.loading ? '...' : statistics.totalAthletes}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Action Groups */}
      <div className="space-y-8">
        {/* Database Management Group */}
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-gray-100 p-2 rounded-lg mr-3">
              <BuildingOfficeIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Database Management</h2>
              <p className="text-sm text-gray-600">Manage athletes, clubs, and organizational structure</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {databaseManagementActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {action.name}
                      </h3>
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

        {/* Event Management Group */}
        <div>
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Event Management</h2>
              <p className="text-sm text-gray-600">Select an event to manage competitions, scoring, and results</p>
            </div>
          </div>
          
          {/* Event Selector */}
          <div className="mb-6">
            <EventSelector />
          </div>

          {/* Event Management Actions */}
          {selectedEvent && (
            <>              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventManagementActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.name}
                      to={`${action.href}?eventId=${selectedEvent.int_eventid}${selectedCompetition ? `&competitionId=${selectedCompetition.id}` : ''}${selectedSquad ? `&squadName=${encodeURIComponent(selectedSquad.squad_name)}` : ''}`}
                      className="group bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-105 transition-transform`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                            {action.name}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
          
          {!selectedEvent && (
            <div className="text-center py-8 text-gray-500">
              <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
              <p className="text-sm">Choose an event above to access competitions, scoring, and results management.</p>
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
