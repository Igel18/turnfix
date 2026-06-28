/**
 * Custom hook for Events page data fetching, CRUD operations, and filtering.
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvent } from '../../../contexts/EventContext'
import { useTableSort } from '../../../components/SortableTableHeader'
import { apiGet, apiPost, apiPut, apiDelete, invalidateCache } from '../../../utils/api'
import { debugLog } from '../../../utils/debug'
import { useFilterPanel } from '../../../hooks'
import type { Event, Venue, EventFormData } from '../Events.types'

// ── Status helpers ──────────────────────────────────────────────────────────

export const getEventStatus = (startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' => {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (now < start) return 'upcoming'
  if (now > end) return 'completed'
  return 'active'
}

export const formatEventDate = (dateString: string, locale: string) => {
  const loc = locale === 'de' ? 'de-DE' : 'en-US'
  return new Date(dateString).toLocaleDateString(loc, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useEventsData() {
  const { t } = useTranslation()
  const { eventUpdateTrigger, selectedEvent, setSelectedEvent } = useEvent()

  // Data state
  const [events, setEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const isAnyFilterActive = searchTerm !== '' || selectedStatus !== '';
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, () => { setSearchTerm(''); setSelectedStatus(''); });

  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_eventname', 'asc')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '1000', offset: '0' })
      if (searchTerm) params.append('search', searchTerm)
      if (selectedStatus) params.append('status', selectedStatus)

      const data = await apiGet(`/events?${params}`)
      debugLog('=== CLIENT DEBUG: Successfully received API response ===')
      debugLog('Events array length:', data.events?.length)

      const eventsWithStatus = (data.events || []).map((event: any) => ({
        ...event,
        status: getEventStatus(event.dat_eventstartdate, event.dat_eventenddate)
      }))

      setEvents(eventsWithStatus)
    } catch (error) {
      debugLog('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedStatus])

  const fetchVenues = useCallback(async () => {
    try {
      const data = await apiGet('/venues?limit=1000')
      setVenues(data.venues || [])
    } catch (error) {
      debugLog('Error fetching venues:', error)
      setVenues([])
    }
  }, [])

  // ── CRUD ────────────────────────────────────────────────────────────────

  const handleSubmit = async (formData: EventFormData) => {
    try {
      const eventData = {
        var_eventname: formData.var_eventname,
        dat_eventstartdate: formData.dat_eventstartdate,
        dat_eventenddate: formData.dat_eventenddate,
        var_location: formData.var_location,
        var_description: formData.var_description || null
      }

      debugLog('=== CLIENT DEBUG: Saving event ===')
      debugLog('Event data being sent:', eventData)

      if (editingEvent) {
        await apiPut(`/events/${editingEvent.int_eventid}`, eventData)
      } else {
        await apiPost('/events', eventData)
      }

      invalidateCache('/events')
      await fetchEvents()
      setIsModalOpen(false)
      setEditingEvent(null)
    } catch (error) {
      debugLog('Error saving event:', error)
    }
  }

  const handleDelete = async (eventId: number, forceDelete = false) => {
    setErrorMessage('')

    try {
      const url = forceDelete ? `/events/${eventId}?force=true` : `/events/${eventId}`
      await apiDelete(url)
      if (selectedEvent?.int_eventid === eventId) {
        setSelectedEvent(null)
      }
      invalidateCache('/events')
      await fetchEvents()
    } catch (error: any) {
      debugLog('Error deleting event:', error)

      if (error.response?.status === 409) {
        const errorData = error.response.data
        if (errorData.hasScores) {
          setErrorMessage(errorData.error || 'Cannot delete event with existing scores')
        } else {
          setErrorMessage(errorData.error || 'Cannot delete event with existing data')
        }
      } else if (error.response?.status === 404) {
        setErrorMessage('Event not found')
      } else {
        setErrorMessage('Failed to delete event. Please try again.')
      }

      setTimeout(() => setErrorMessage(''), 5000)
    }
  }

  // ── Modal helpers ───────────────────────────────────────────────────────

  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setIsModalOpen(true)
    fetchVenues()
  }

  const openCreateModal = () => {
    setEditingEvent(null)
    setIsModalOpen(true)
    fetchVenues()
  }

  const openImportModal = () => {
    setIsImportModalOpen(true)
    fetchVenues()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false)
  }

  // ── Filter config ─────────────────────────────────────────────────────

  const statusOptions = [
    { value: 'upcoming', label: t('events.status.upcoming'), color: 'bg-blue-100 text-blue-800' },
    { value: 'active', label: t('events.status.active'), color: 'bg-green-100 text-green-800' },
    { value: 'completed', label: t('events.status.completed'), color: 'bg-gray-100 text-gray-800' }
  ]

  const getFilterConfig = () => [
    {
      label: t('events.filters.status'),
      value: 'status',
      options: statusOptions.map(s => ({ value: s.value, label: s.label })),
      selectedValue: selectedStatus,
      onChange: setSelectedStatus
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
  }

  // ── Sort helper for DatabaseManagementTemplate ────────────────────────

  const getSortValue = (event: Event) => {
    if (sortKey === 'participant_count') return event.participant_count
    if (sortKey === 'club_count') return event.club_count || 0
    if (sortKey === 'dat_eventstartdate') return new Date(event.dat_eventstartdate).getTime()
    return event[sortKey as keyof Event]
  }

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents, eventUpdateTrigger])

  return {
    // Data
    events,
    venues,
    isLoading,
    errorMessage,
    editingEvent,
    // Modals
    isModalOpen,
    isImportModalOpen,
    openEditModal,
    openCreateModal,
    openImportModal,
    closeModal,
    closeImportModal,
    // CRUD
    handleSubmit,
    handleDelete,
    fetchEvents,
    // Filters
    searchTerm,
    setSearchTerm,
    selectedStatus,
    showFilters,
    toggleFilters,
    getFilterConfig,
    handleClearAllFilters,
    // Sorting
    sortKey,
    sortDirection,
    handleSort,
    sortData,
    getSortValue,
  }
}
