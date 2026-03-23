/**
 * ManagementCenter – Action Definitions
 * All static action arrays and their factory functions.
 */

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
  ClockIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline'

export interface ActionItem {
  name: string
  description: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
  badge?: string
  external?: boolean
}

export interface DbActionItem extends ActionItem {
  count?: number
  countLabel?: string
}

export interface Statistics {
  activeEvents: number
  registeredClubs: number
  totalAthletes: number
  totalAreas: number
  totalRegions: number
  totalAssociations: number
  totalDisciplines: number
  totalLocations: number
  totalPersons: number
  totalSports: number
  totalFormulas: number
  totalDisciplineGroups: number
  totalDisciplineFields: number
  totalCertificateLayouts: number
  totalStatuses: number
  totalDocuments: number
  loading: boolean
}

export const INITIAL_STATISTICS: Statistics = {
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
  loading: true,
}

export const getDatabaseManagementActions = (statistics: Statistics): DbActionItem[] => [
  { name: 'Manage Associations', description: 'Manage gymnastics associations and federations', href: '/associations', icon: BuildingLibraryIcon, color: 'bg-teal-500', count: statistics.totalAssociations, countLabel: 'Associations' },
  { name: 'Manage Regions', description: 'Manage gymnastics regions and districts', href: '/regions', icon: MapIcon, color: 'bg-indigo-500', count: statistics.totalRegions, countLabel: 'Regions' },
  { name: 'Manage Clubs', description: 'Add and edit gymnastics clubs', href: '/clubs', icon: BuildingOfficeIcon, color: 'bg-green-500', count: statistics.registeredClubs, countLabel: 'Clubs' },
  { name: 'Manage Athletes', description: 'Add and manage athletes in the database', href: '/participants', icon: UserGroupIcon, color: 'bg-purple-500', count: statistics.totalAthletes, countLabel: 'Athletes' },
  { name: 'Manage Areas', description: 'Manage gender categories and areas', href: '/areas', icon: RectangleGroupIcon, color: 'bg-rose-500', count: statistics.totalAreas, countLabel: 'Areas' },
  { name: 'Manage Disciplines', description: 'Configure gymnastics disciplines and apparatus', href: '/disciplines', icon: CogIcon, color: 'bg-amber-500', count: statistics.totalDisciplines, countLabel: 'Disciplines' },
  { name: 'Manage Locations', description: 'Manage competition venues and locations', href: '/locations', icon: MapIcon, color: 'bg-red-500', count: statistics.totalLocations, countLabel: 'Locations' },
  { name: 'Manage Persons', description: 'Manage contact persons and individuals', href: '/persons', icon: UserIcon, color: 'bg-orange-500', count: statistics.totalPersons, countLabel: 'Persons' },
  { name: 'Manage Sports', description: 'Manage sport types and categories', href: '/sports', icon: BeakerIcon, color: 'bg-emerald-500', count: statistics.totalSports, countLabel: 'Sports' },
  { name: 'Manage Formulas', description: 'Manage calculation formulas and scoring methods', href: '/formulas', icon: CalculatorIcon, color: 'bg-cyan-500', count: statistics.totalFormulas, countLabel: 'Formulas' },
  { name: 'Manage Discipline Groups', description: 'Manage discipline groups and categories', href: '/discipline-groups', icon: TagIcon, color: 'bg-slate-500', count: statistics.totalDisciplineGroups, countLabel: 'Groups' },
  { name: 'Discipline Fields', description: 'Manage scoring fields for each discipline', href: '/discipline-fields', icon: CogIcon, color: 'bg-purple-500', count: statistics.totalDisciplineFields || 0, countLabel: 'Fields' },
  { name: 'Certificate Layouts', description: 'Design and manage certificate templates and layouts', href: '/certificate-layouts', icon: DocumentTextIcon, color: 'bg-pink-500', count: statistics.totalCertificateLayouts, countLabel: 'Layouts' },
  { name: 'Status Management', description: 'Manage participant statuses and squad states', href: '/status-management', icon: CogIcon, color: 'bg-violet-500', count: statistics.totalStatuses, countLabel: 'Statuses' },
  { name: 'Manage Documents', description: 'Manage icons, images, XML imports and preset files', href: '/documents', icon: DocumentTextIcon, color: 'bg-sky-500', count: statistics.totalDocuments, countLabel: 'Files' },
  { name: 'Create Event', description: 'Set up a new gymnastics competition', href: '/events', icon: CalendarDaysIcon, color: 'bg-blue-500', count: statistics.activeEvents, countLabel: 'Events' },
]

export const eventSetupActions: ActionItem[] = [
  { name: 'Manage Events', description: 'Create and configure events', href: '/event-management', icon: CalendarDaysIcon, color: 'bg-blue-500' },
  { name: 'View Competitions', description: 'Define competitions and disciplines', href: '/competitions', icon: TrophyIcon, color: 'bg-yellow-500' },
  { name: 'Event Participants', description: 'Add participants to event and assign to competitions', href: '/event-participants', icon: UserGroupIcon, color: 'bg-indigo-500' },
  { name: 'Manage Squads', description: 'Create squads and organize participants', href: '/squads', icon: UserGroupIcon, color: 'bg-blue-500' },
  { name: 'Manage Groups', description: 'Create and manage groups for team competitions', href: '/groups', icon: UserGroupIcon, color: 'bg-emerald-500', badge: 'Beta' },
  { name: 'Manage Teams', description: 'Create and manage teams for team competitions', href: '/teams', icon: UserGroupIcon, color: 'bg-teal-500', badge: 'Beta' },
  { name: 'Time Planning', description: 'Plan competition times and apparatus rotations', href: '/time-planning', icon: ClockIcon, color: 'bg-purple-500' },
  { name: 'Meldematrix', description: 'Registration matrix: Clubs vs Competitions overview', href: '/meldematrix', icon: DocumentTextIcon, color: 'bg-emerald-500' },
]

export const competitionDayActions: ActionItem[] = [
  { name: 'Squad Status', description: 'Manage status for squad-discipline combinations', href: '/squad-status', icon: ClipboardDocumentListIcon, color: 'bg-purple-500' },
  { name: 'Participant Status', description: 'View and update individual participant status during competition', href: '/participant-status', icon: UserIcon, color: 'bg-pink-500' },
  { name: 'Competition Status', description: 'Monitor live competition progress', href: '/competition-status', icon: TrophyIcon, color: 'bg-green-500' },
  { name: 'Live Scores', description: 'Live score updates and recent results', href: '/live-scores', icon: ClipboardDocumentListIcon, color: 'bg-indigo-500' },
  { name: 'Individual Scoring', description: 'Enter competition results and scores for individual participants', href: '/score-capture', icon: ClipboardDocumentListIcon, color: 'bg-orange-500' },
  { name: 'Group Scoring', description: 'Enter scores for TeamGym groups with component breakdown', href: '/group-scoring', icon: UserGroupIcon, color: 'bg-cyan-500', badge: 'Beta' },
  { name: 'Team Scoring', description: 'Enter scores for competition teams (Mannschaften)', href: '/team-scoring', icon: UserGroupIcon, color: 'bg-teal-500', badge: 'Beta' },
  { name: 'Jury Portal', description: 'Simplified jury interface for competition day (opens in new window on port 3002)', href: `${window.location.protocol}//${window.location.hostname}:3002/jury`, icon: TrophyIcon, color: 'bg-blue-600', external: true },
]

export const resultsAwardsActions: ActionItem[] = [
  { name: 'View Results', description: 'Check competition results and rankings', href: '/results', icon: ChartBarIcon, color: 'bg-red-500' },
  { name: 'Medallienspiegel', description: 'Medal standings by club', href: '/medallienspiegel', icon: TrophyIcon, color: 'bg-yellow-500' },
]
