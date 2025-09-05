import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import { 
  HomeIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  CircleStackIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Events', href: '/events', icon: CalendarDaysIcon },
  { name: 'Score Capture', href: '/score-capture', icon: ClipboardDocumentListIcon },
  { name: 'Competitions', href: '/competitions', icon: TrophyIcon },
  { name: 'Results', href: '/results', icon: ChartBarIcon },
]

const databaseMenuItems = [
  { name: 'Manage Disciplines', href: '/disciplines', icon: CircleStackIcon },
  { name: 'Clubs', href: '/clubs', icon: BuildingOfficeIcon },
  { name: 'Participants', href: '/participants', icon: UserGroupIcon },
  { name: 'Regions', href: '/regions', icon: HomeIcon },
  { name: 'Associations', href: '/associations', icon: BuildingOfficeIcon },
]

export function Layout() {
  const { user } = useAuth() // Only need user for display
  const { t } = useTranslation()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDatabaseMenuOpen, setIsDatabaseMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const isDatabasePathActive = () => {
    return databaseMenuItems.some(item => isActivePath(item.href))
  }

  // Translation helper for menu items
  const translateMenuItem = (name: string) => {
    const menuTranslationMap: { [key: string]: string } = {
      'Dashboard': 'navigation.dashboard',
      'Events': 'navigation.events',
      'Score Capture': 'navigation.scoreCapture',
      'Competitions': 'navigation.competitions',
      'Results': 'navigation.results',
      'Database Management': 'navigation.databaseManagement',
      'Manage Disciplines': 'navigation.manageDisciplines',
      'Clubs': 'navigation.clubs',
      'Participants': 'navigation.participants',
      'Regions': 'navigation.regions',
      'Associations': 'navigation.associations'
    }
    
    return menuTranslationMap[name] ? t(menuTranslationMap[name]) : name
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDatabaseMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Authentication is disabled - always show the main layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
              <Link to="/dashboard" className="text-xl font-bold text-blue-600 ml-2">
                TurnFix
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {translateMenuItem(item.name)}
                  </Link>
                )
              })}
              
              {/* Database Management Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDatabaseMenuOpen(!isDatabaseMenuOpen)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isDatabasePathActive()
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <CircleStackIcon className="h-4 w-4 mr-2" />
                  {translateMenuItem('Database Management')}
                  <ChevronDownIcon className="h-4 w-4 ml-1" />
                </button>
                
                {isDatabaseMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                      {databaseMenuItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setIsDatabaseMenuOpen(false)}
                            className={`flex items-center px-4 py-2 text-sm transition-colors ${
                              isActivePath(item.href)
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            {translateMenuItem(item.name)}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <UserCircleIcon className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">{user?.username || 'Guest'}</span>
              </div>
              <div className="hidden sm:flex items-center px-3 py-2 text-xs text-amber-600 bg-amber-50 rounded-md border border-amber-200">
                <span>Auth Disabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActivePath(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {translateMenuItem(item.name)}
                  </Link>
                )
              })}
              
              {/* Database Management Section in Mobile */}
              <div className="pt-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translateMenuItem('Database Management')}
                </div>
                {databaseMenuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 ml-4 rounded-md text-base font-medium transition-colors ${
                        isActivePath(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {translateMenuItem(item.name)}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
