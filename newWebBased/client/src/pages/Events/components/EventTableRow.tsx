/**
 * Table row rendering for a single event.
 */

import React from 'react'
import {
  MapPinIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import type { Event } from '../Events.types'
import { formatEventDate } from '../hooks/useEventsData'

interface EventTableRowProps {
  event: Event
  onEdit: (event: Event) => void
  onDelete: (eventId: number) => void
}

const EventTableRow: React.FC<EventTableRowProps> = ({ event, onEdit, onDelete }) => {
  const { t } = useTranslation()
  const locale = t('common.locale')

  return (
    <tr key={event.int_eventid} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="font-medium text-gray-900">{event.var_eventname}</div>
          {event.var_description && (
            <div className="text-sm text-gray-500 line-clamp-1">{event.var_description}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div>{formatEventDate(event.dat_eventstartdate, locale)}</div>
        {event.dat_eventstartdate !== event.dat_eventenddate && (
          <div className="text-gray-500">{t('events.table.to')} {formatEventDate(event.dat_eventenddate, locale)}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm">
          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
          {event.var_location}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm">
          <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
          {event.participant_count}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm">
          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
          {event.club_count || 0} clubs
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(event)}
            className="text-blue-600 hover:text-blue-800"
            title={t('events.editEvent')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(event.int_eventid)}
            className="text-red-600 hover:text-red-800"
            title={t('events.deleteEvent')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default EventTableRow
