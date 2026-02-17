/**
 * Card view rendering for a single event.
 */

import React from 'react'
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import type { Event } from '../Events.types'
import { formatEventDate } from '../hooks/useEventsData'

interface EventCardProps {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (eventId: number) => void
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete }) => {
  const { t } = useTranslation()
  const locale = t('common.locale')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {event.var_eventname}
          </h3>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <CalendarDaysIcon className="h-4 w-4 mr-2" />
          <span>
            {formatEventDate(event.dat_eventstartdate, locale)}
            {event.dat_eventstartdate !== event.dat_eventenddate &&
              ` - ${formatEventDate(event.dat_eventenddate, locale)}`
            }
          </span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <MapPinIcon className="h-4 w-4 mr-2" />
          <span>{event.var_location}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <UsersIcon className="h-4 w-4 mr-2" />
          <span>{t('events.card.participants', { count: event.participant_count })}</span>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <MapPinIcon className="h-4 w-4 mr-2" />
          <span>{t('events.card.clubs', { count: event.club_count || 0 })}</span>
        </div>

        {event.var_description && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-600 line-clamp-2">
              {event.var_description}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
        <button
          onClick={() => onEdit(event)}
          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <PencilIcon className="h-4 w-4" />
          <span>{t('events.card.edit')}</span>
        </button>
        <button
          onClick={() => onDelete(event.int_eventid)}
          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <TrashIcon className="h-4 w-4" />
          <span>{t('events.card.delete')}</span>
        </button>
      </div>
    </div>
  )
}

export default EventCard
