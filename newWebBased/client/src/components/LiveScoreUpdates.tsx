import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import getSocket from '@/utils/socket'
import { formatScore } from '@/utils/scoreFormatter'
import { 
  TrophyIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import GenderBadge from './GenderBadge'

interface LiveScore {
  id: number
  timestamp: string
  participantName: string
  participantFirstname: string
  participantLastname: string
  gender: 'männlich' | 'weiblich'
  competitionName: string
  competitionNumber: string
  disciplineName: string
  disciplineShort: string
  score: number
  squadName: string
}

interface LiveScoreUpdatesProps {
  eventId: number
  maxEntries?: number
  showSquad?: boolean
  className?: string
}

const LiveScoreUpdates = ({ eventId, maxEntries = 10, showSquad = true, className = '' }: LiveScoreUpdatesProps) => {
  const { t } = useTranslation()
  const [liveScores, setLiveScores] = useState<LiveScore[]>([])

  useEffect(() => {
    if (!eventId) return

    const socket = getSocket()
    
    // Join the event room to receive score updates
    console.log('📊 Joining event room:', eventId)
    socket.emit('join-competition', eventId)

    // Listen for score updates (the server sends 'score-updated' with hyphen)
    const handleScoreUpdate = (data: any) => {
      console.log('📊 Live score update received:', data)
      console.log('📊 Data details:', {
        firstname: data.firstname,
        lastname: data.lastname,
        competitionName: data.competitionName,
        disciplineName: data.disciplineName,
        disciplineShort: data.disciplineShort,
        score: data.finalScore || data.score
      })
      
      // Create a new score entry
      const newScore: LiveScore = {
        id: data.scoreId || Date.now(),
        timestamp: new Date().toISOString(),
        participantName: `${data.firstname || ''} ${data.lastname || ''}`.trim() || 'Unbekannt',
        participantFirstname: data.firstname || '',
        participantLastname: data.lastname || '',
        gender: data.gender || 'männlich',
        competitionName: data.competitionName || 'Unbekannt',
        competitionNumber: data.competitionNumber || '',
        disciplineName: data.disciplineName || 'Unbekannt',
        disciplineShort: data.disciplineShort || data.disciplineName?.substring(0, 3) || 'UNK',
        score: data.finalScore || data.score || 0,
        squadName: data.squadName || ''
      }
      
      console.log('📊 Created newScore:', newScore)

      // Add to the beginning of the list and limit to maxEntries
      setLiveScores(prev => [newScore, ...prev].slice(0, maxEntries))
    }

    // Listen for the server's 'score-updated' event (with hyphen, not colon)
    socket.on('score-updated', handleScoreUpdate)

    return () => {
      socket.off('score-updated', handleScoreUpdate)
      socket.emit('leave-competition', eventId)
    }
  }, [eventId, maxEntries])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'text-green-600 font-bold'
    if (score >= 10) return 'text-blue-600 font-semibold'
    if (score >= 5) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <TrophyIcon className="h-5 w-5" />
            <h3 className="font-semibold">{t('liveScores.title')}</h3>
          </div>
          <div className="flex items-center gap-1 text-blue-100 text-sm">
            <ClockIcon className="h-4 w-4" />
            <span>{t('liveScores.live')}</span>
            <div className="ml-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Scores List */}
      <div className="divide-y divide-gray-100">
        {liveScores.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <TrophyIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>{t('liveScores.noScores')}</p>
          </div>
        ) : (
          liveScores.map((score, index) => (
            <div 
              key={`${score.id}-${index}`}
              className="px-4 py-3 hover:bg-gray-50 transition-colors animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Participant Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <UserIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">
                      {score.participantName}
                    </span>
                    <GenderBadge value={score.gender} className="text-xs" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate">
                      {score.competitionName}
                      {score.competitionNumber && ` (${score.competitionNumber})`}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="font-medium">{score.disciplineShort || score.disciplineName}</span>
                    {showSquad && score.squadName && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {score.squadName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Score & Time */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                    {formatScore(score.score)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(score.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {liveScores.length > 0 && (
        <div className="bg-gray-50 px-4 py-2 text-center text-xs text-gray-500">
          {t('liveScores.showing', { count: liveScores.length, max: maxEntries })}
        </div>
      )}
    </div>
  )
}

export default LiveScoreUpdates
