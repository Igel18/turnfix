import type { TFunction } from 'i18next'

export const getUnifiedParticipantHeaderLabels = (t: TFunction) => ({
  name: t('eventParticipants.table.name'),
  startNumber: t('eventParticipants.table.startNumber'),
  club: t('eventParticipants.table.club'),
  age: t('eventParticipants.table.age'),
  gender: t('eventParticipants.table.gender'),
  squad: t('eventParticipants.table.squad'),
  status: t('eventParticipants.table.status'),
})

export const getUnifiedResultsHeaderLabels = (t: TFunction) => {
  const participant = getUnifiedParticipantHeaderLabels(t)
  return {
    rank: t('results.table.rank'),
    startNumber: participant.startNumber,
    name: participant.name,
    club: participant.club,
    age: participant.age,
    device: t('results.table.device'),
    total: t('results.table.total'),
    totalScore: t('results.table.totalScore'),
  }
}
