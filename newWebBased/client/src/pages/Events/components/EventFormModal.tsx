/**
 * Modal form for creating and editing events.
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import UnifiedModal from '../../../components/UnifiedModal'
import type { Event, Venue, EventFormData } from '../Events.types'
import { EMPTY_FORM_DATA as DEFAULT_FORM } from '../Events.types'

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingEvent: Event | null
  venues: Venue[]
  onSubmit: (formData: EventFormData) => Promise<void>
}

const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  editingEvent,
  venues,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<EventFormData>({ ...DEFAULT_FORM })

  // Sync form data when opening with an event to edit
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        var_eventname: editingEvent.var_eventname,
        dat_eventstartdate: editingEvent.dat_eventstartdate.split('T')[0],
        dat_eventenddate: editingEvent.dat_eventenddate.split('T')[0],
        var_location: editingEvent.var_location,
        var_description: editingEvent.var_description || ''
      })
    } else {
      setFormData({ ...DEFAULT_FORM })
    }
  }, [editingEvent, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
    setFormData({ ...DEFAULT_FORM })
  }

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEvent ? t('events.editEvent') : t('events.addEvent')}
      size="md"
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('events.form.eventName')} *
          </label>
          <input
            type="text"
            required
            value={formData.var_eventname}
            onChange={(e) => setFormData({ ...formData, var_eventname: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('events.form.eventNamePlaceholder')}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('events.form.startDate')} *
            </label>
            <input
              type="date"
              required
              value={formData.dat_eventstartdate}
              onChange={(e) => setFormData({ ...formData, dat_eventstartdate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('events.form.endDate')} *
            </label>
            <input
              type="date"
              required
              value={formData.dat_eventenddate}
              onChange={(e) => setFormData({ ...formData, dat_eventenddate: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('events.form.location')} *
          </label>
          <select
            required
            value={formData.var_location}
            onChange={(e) => setFormData({ ...formData, var_location: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('events.form.locationPlaceholder')}</option>
            {venues.map((venue) => (
              <option key={venue.int_wettkampforteid} value={venue.var_name}>
                {venue.var_name}
                {venue.var_ort && ` (${venue.var_ort})`}
              </option>
            ))}
          </select>
          {venues.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No venues found. You can manage venues in Database Management → Manage Locations.
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('events.form.description')}
          </label>
          <textarea
            value={formData.var_description}
            onChange={(e) => setFormData({ ...formData, var_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('events.form.descriptionPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {t('events.form.cancel')}
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingEvent ? t('events.form.updating') : t('events.form.creating')}
          </button>
        </div>
      </form>
    </UnifiedModal>
  )
}

export default EventFormModal
