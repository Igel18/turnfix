/**
 * ManagementCenter – translateAction utility
 * Maps raw action names to i18n keys for name, description and countLabel.
 */

import type { TFunction } from 'i18next'

const NAME_KEY_MAP: Record<string, string> = {
  'Manage Events':            'managementCenter.eventManagement.eventSetup.manageEvents.title',
  'View Competitions':        'managementCenter.eventManagement.eventSetup.viewCompetitions.title',
  'Event Participants':       'managementCenter.eventManagement.eventSetup.eventParticipants.title',
  'Manage Squads':            'managementCenter.eventManagement.eventSetup.manageSquads.title',
  'Manage Groups':            'managementCenter.eventManagement.eventSetup.manageGroups.title',
  'Manage Teams':             'managementCenter.eventManagement.eventSetup.manageTeams.title',
  'Time Planning':            'managementCenter.eventManagement.eventSetup.timePlanning.title',
  'Meldematrix':              'managementCenter.eventManagement.eventSetup.meldematrix.title',
  'Squad Status':             'managementCenter.eventManagement.competitionDay.squadStatus.title',
  'Participant Status':       'managementCenter.eventManagement.competitionDay.participantStatus.title',
  'Competition Status':       'managementCenter.eventManagement.competitionDay.competitionStatus.title',
  'Live Scores':              'managementCenter.eventManagement.competitionDay.liveScores.title',
  'Individual Scoring':       'managementCenter.eventManagement.competitionDay.individualScoring.title',
  'Group Scoring':            'managementCenter.eventManagement.competitionDay.groupScoring.title',
  'Team Scoring':             'managementCenter.eventManagement.competitionDay.teamScoring.title',
  'Jury Portal':              'managementCenter.eventManagement.competitionDay.juryPortal.title',
  'View Results':             'managementCenter.eventManagement.resultsAwards.results.title',
  'Medals':                   'managementCenter.eventManagement.resultsAwards.medals.title',
  'Medallienspiegel':         'managementCenter.eventManagement.resultsAwards.medallienspiegel.title',
  'Manage Regions':           'managementCenter.databaseManagement.regions.title',
  'Manage Countries':         'managementCenter.databaseManagement.countries.title',
  'Manage Associations':      'managementCenter.databaseManagement.associations.title',
  'Manage Clubs':             'managementCenter.databaseManagement.clubs.title',
  'Manage Athletes':          'managementCenter.databaseManagement.athletes.title',
  'Manage Areas':             'managementCenter.databaseManagement.areas.title',
  'Manage Disciplines':       'managementCenter.databaseManagement.disciplines.title',
  'Manage Locations':         'managementCenter.databaseManagement.locations.title',
  'Manage Persons':           'managementCenter.databaseManagement.persons.title',
  'Manage Sports':            'managementCenter.databaseManagement.sports.title',
  'Manage Formulas':          'managementCenter.databaseManagement.formulas.title',
  'Manage Discipline Groups': 'managementCenter.databaseManagement.disciplineGroups.title',
  'Discipline Fields':        'managementCenter.databaseManagement.disciplineFields.title',
  'Certificate Layouts':      'managementCenter.databaseManagement.certificateLayouts.title',
  'Status Management':        'managementCenter.databaseManagement.statusManagement.title',
  'Manage Documents':         'managementCenter.databaseManagement.documents.title',
  'Create Event':             'managementCenter.databaseManagement.createEvent.title',
}

const DESC_KEY_MAP: Record<string, string> = {
  'Manage Events':            'managementCenter.eventManagement.eventSetup.manageEvents.description',
  'View Competitions':        'managementCenter.eventManagement.eventSetup.viewCompetitions.description',
  'Event Participants':       'managementCenter.eventManagement.eventSetup.eventParticipants.description',
  'Manage Squads':            'managementCenter.eventManagement.eventSetup.manageSquads.description',
  'Manage Groups':            'managementCenter.eventManagement.eventSetup.manageGroups.description',
  'Manage Teams':             'managementCenter.eventManagement.eventSetup.manageTeams.description',
  'Time Planning':            'managementCenter.eventManagement.eventSetup.timePlanning.description',
  'Meldematrix':              'managementCenter.eventManagement.eventSetup.meldematrix.description',
  'Squad Status':             'managementCenter.eventManagement.competitionDay.squadStatus.description',
  'Competition Status':       'managementCenter.eventManagement.competitionDay.competitionStatus.description',
  'Live Scores':              'managementCenter.eventManagement.competitionDay.liveScores.description',
  'Individual Scoring':       'managementCenter.eventManagement.competitionDay.individualScoring.description',
  'Group Scoring':            'managementCenter.eventManagement.competitionDay.groupScoring.description',
  'Team Scoring':             'managementCenter.eventManagement.competitionDay.teamScoring.description',
  'Jury Portal':              'managementCenter.eventManagement.competitionDay.juryPortal.description',
  'View Results':             'managementCenter.eventManagement.resultsAwards.results.description',
  'Medals':                   'managementCenter.eventManagement.resultsAwards.medals.description',
  'Medallienspiegel':         'managementCenter.eventManagement.resultsAwards.medallienspiegel.description',
  'Manage Regions':           'managementCenter.databaseManagement.regions.description',
  'Manage Countries':         'managementCenter.databaseManagement.countries.description',
  'Manage Associations':      'managementCenter.databaseManagement.associations.description',
  'Manage Clubs':             'managementCenter.databaseManagement.clubs.description',
  'Manage Athletes':          'managementCenter.databaseManagement.athletes.description',
  'Manage Areas':             'managementCenter.databaseManagement.areas.description',
  'Manage Disciplines':       'managementCenter.databaseManagement.disciplines.description',
  'Manage Locations':         'managementCenter.databaseManagement.locations.description',
  'Manage Persons':           'managementCenter.databaseManagement.persons.description',
  'Manage Sports':            'managementCenter.databaseManagement.sports.description',
  'Manage Formulas':          'managementCenter.databaseManagement.formulas.description',
  'Manage Discipline Groups': 'managementCenter.databaseManagement.disciplineGroups.description',
  'Discipline Fields':        'managementCenter.databaseManagement.disciplineFields.description',
  'Certificate Layouts':      'managementCenter.databaseManagement.certificateLayouts.description',
  'Status Management':        'managementCenter.databaseManagement.statusManagement.description',
  'Manage Documents':         'managementCenter.databaseManagement.documents.description',
  'Create Event':             'managementCenter.databaseManagement.createEvent.description',
}

export function translateAction(action: { name: string; description: string; countLabel?: string }, t: TFunction) {
  return {
    name: NAME_KEY_MAP[action.name] ? t(NAME_KEY_MAP[action.name]) : action.name,
    description: DESC_KEY_MAP[action.name] ? t(DESC_KEY_MAP[action.name]) : action.description,
    countLabel: action.name === 'Create Event'
      ? t('managementCenter.databaseManagement.createEvent.countLabel')
      : action.countLabel,
  }
}
