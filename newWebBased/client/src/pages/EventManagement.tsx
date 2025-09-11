import React, { useState, useEffect } from 'react';
import { useEvent } from '../contexts/EventContext';
import { useTranslation } from 'react-i18next';
import UnifiedPageHeader from '../components/UnifiedPageHeader';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  PencilIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { apiGet, apiPut, invalidateCache } from '../utils/api';

interface EventDetails {
  int_eventid: number;
  var_eventname: string;
  dat_eventstartdate: string;
  dat_eventenddate: string;
  var_location: string;
  var_description?: string;
  dat_meldeschluss?: string;
  var_veranstalter?: string;
  int_ansprechpartner?: number;
  int_meldung_an?: number;
  int_kampfrichter?: number;
  int_helfer?: number;
  int_edv?: number;
  txt_hinweise?: string;
  int_wettkampforteid?: number;
  venue_name?: string;
  venue_address?: string;
  venue_postal_code?: string;
  venue_city?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  registration_contact_name?: string;
  registration_contact_email?: string;
  registration_contact_phone?: string;
}

interface Venue {
  int_wettkampforteid: number;
  var_name: string;
  var_adresse?: string;
  var_plz?: string;
  var_ort?: string;
}

interface Person {
  int_personenid: number;
  var_vorname: string;
  var_nachname: string;
  full_name?: string;
  var_email?: string;
  var_telefon?: string;
  var_adresse?: string;
  var_plz?: string;
  var_ort?: string;
}

interface EventStatistics {
  totalParticipants: number;
  maleParticipants: number;
  femaleParticipants: number;
  totalClubs: number;
  totalCompetitions: number;
  totalGroups: number;
  ageGroups: { [key: string]: number };
  clubBreakdown: { clubName: string; count: number }[];
}

const EventManagement: React.FC = () => {
  const { t } = useTranslation();
  const { selectedEvent, setSelectedEvent, refreshEvents } = useEvent();
  
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EventDetails>>({});

  // Load event details and statistics
  useEffect(() => {
    if (selectedEvent) {
      loadEventData();
    }
    // Load venues and persons on component mount
    loadVenues();
    loadPersons();
  }, [selectedEvent]);

  const loadEventData = async () => {
    if (!selectedEvent) return;
    
    setIsLoading(true);
    try {
      // Load event details
      const eventResponse = await apiGet(`/events/${selectedEvent.int_eventid}`);
      setEventDetails(eventResponse);
      
      // Format dates for HTML date inputs (YYYY-MM-DD format)
      const formattedEditForm = {
        ...eventResponse,
        dat_eventstartdate: eventResponse.dat_eventstartdate ? 
          new Date(eventResponse.dat_eventstartdate).toISOString().split('T')[0] : '',
        dat_eventenddate: eventResponse.dat_eventenddate ? 
          new Date(eventResponse.dat_eventenddate).toISOString().split('T')[0] : '',
        dat_meldeschluss: eventResponse.dat_meldeschluss ? 
          new Date(eventResponse.dat_meldeschluss).toISOString().split('T')[0] : ''
      };
      setEditForm(formattedEditForm);

      // Load statistics (with error handling for missing endpoint)
      try {
        const statsResponse = await apiGet(`/events/${selectedEvent.int_eventid}/statistics`);
        setStatistics(statsResponse);
      } catch (error: any) {
        console.warn('Statistics endpoint not available:', error.message);
        // Set default statistics if endpoint doesn't exist
        setStatistics({
          totalParticipants: 0,
          maleParticipants: 0,
          femaleParticipants: 0,
          totalClubs: 0,
          totalCompetitions: 0,
          totalGroups: 0,
          ageGroups: {},
          clubBreakdown: []
        });
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      const data = await apiGet('/venues?limit=1000');
      setVenues(data.venues || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setVenues([]);
    }
  };

  const loadPersons = async () => {
    try {
      const data = await apiGet('/persons?limit=1000');
      // Format persons for dropdown use
      const formattedPersons = (data.persons || []).map((person: any) => ({
        ...person,
        full_name: `${person.var_nachname || ''}, ${person.var_vorname || ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
      }));
      setPersons(formattedPersons);
    } catch (error) {
      console.error('Error fetching persons:', error);
      setPersons([]);
    }
  };

  const handleSave = async () => {
    if (!selectedEvent || !editForm) return;

    setIsSaving(true);
    try {
      console.log('🔄 Saving event changes...');
      const response = await apiPut(`/events/${selectedEvent.int_eventid}`, editForm);
      const updatedEvent = response.event || response; // Handle both response formats
      
      console.log('✅ Event saved, received response:', updatedEvent);
      
      // Invalidate cache for this event to ensure fresh data on reload
      invalidateCache(`/events/${selectedEvent.int_eventid}`);
      
      // Create the updated event object for context with proper format
      // Use JSON.parse(JSON.stringify()) to ensure a completely new object
      const updatedEventForContext = JSON.parse(JSON.stringify({
        int_eventid: updatedEvent.int_eventid,
        var_eventname: updatedEvent.var_eventname,
        dat_eventstartdate: updatedEvent.dat_eventstartdate,
        dat_eventenddate: updatedEvent.dat_eventenddate,
        var_location: updatedEvent.var_location,
        status: selectedEvent.status // Keep the existing status
      }));
      
      console.log('🔄 Updating EventContext with:', updatedEventForContext);
      
      // Update the EventContext FIRST - this should immediately update the header
      setSelectedEvent(updatedEventForContext);
      
      // Update local state
      setEventDetails(updatedEvent);
      setIsEditing(false);
      
      console.log('🔄 Context updated, now triggering refresh...');
      
      // Trigger a refresh of the events list on other pages
      refreshEvents();
      
      // Force a re-render by reloading the event data
      // This ensures all components have the latest data
      setTimeout(async () => {
        console.log('🔄 Reloading event data after context update...');
        await loadEventData();
        console.log('✅ All updates complete - UI should now show latest data');
      }, 100);
      
    } catch (error) {
      console.error('❌ Error updating event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (eventDetails) {
      // Format dates for HTML date inputs when canceling
      const formattedEditForm = {
        ...eventDetails,
        dat_eventstartdate: eventDetails.dat_eventstartdate ? 
          new Date(eventDetails.dat_eventstartdate).toISOString().split('T')[0] : '',
        dat_eventenddate: eventDetails.dat_eventenddate ? 
          new Date(eventDetails.dat_eventenddate).toISOString().split('T')[0] : '',
        dat_meldeschluss: eventDetails.dat_meldeschluss ? 
          new Date(eventDetails.dat_meldeschluss).toISOString().split('T')[0] : ''
      };
      setEditForm(formattedEditForm);
    }
    setIsEditing(false);
  };

  if (!selectedEvent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <UnifiedPageHeader 
          title={t('eventManagement.title')}
          subtitle={t('eventManagement.noEventSelected')}
          icon={CalendarDaysIcon}
          showEventContext={true}
        />
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <CalendarDaysIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('eventManagement.selectEvent')}
          </h3>
          <p className="text-gray-500">
            {t('eventManagement.selectEventDescription')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <UnifiedPageHeader 
          title={selectedEvent.var_eventname}
          subtitle={t('common.loading')}
          icon={CalendarDaysIcon}
          showEventContext={true}
        />
        <div className="bg-white rounded-lg shadow p-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader 
        title={selectedEvent.var_eventname}
        subtitle={t('eventManagement.subtitle')}
        icon={CalendarDaysIcon}
        showEventContext={true}
        customActions={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`${
                    isSaving 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2`}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t('common.saving')}</span>
                    </>
                  ) : (
                    <span>{t('common.save')}</span>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <PencilIcon className="w-4 h-4" />
                <span>{t('common.edit')}</span>
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                <span>{t('eventManagement.eventDetails')}</span>
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventManagement.form.eventName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.var_eventname || ''}
                      onChange={(e) => setEditForm({ ...editForm, var_eventname: e.target.value })}
                      placeholder={t('eventManagement.form.eventNamePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{eventDetails?.var_eventname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    {t('eventManagement.form.location')}
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.int_wettkampforteid || ''}
                      onChange={(e) => {
                        const venueId = e.target.value ? parseInt(e.target.value) : null;
                        const selectedVenue = venues.find(v => v.int_wettkampforteid === venueId);
                        setEditForm({ 
                          ...editForm, 
                          int_wettkampforteid: venueId || undefined,
                          var_location: selectedVenue?.var_name || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('eventManagement.form.locationPlaceholder')}</option>
                      {venues.map((venue) => (
                        <option key={venue.int_wettkampforteid} value={venue.int_wettkampforteid}>
                          {venue.var_name}
                          {venue.var_ort && ` (${venue.var_ort})`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {eventDetails?.venue_name || eventDetails?.var_location || '-'}
                      {eventDetails?.venue_city && ` (${eventDetails.venue_city})`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventManagement.form.startDate')}
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.dat_eventstartdate || ''}
                      onChange={(e) => setEditForm({ ...editForm, dat_eventstartdate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eventDetails?.dat_eventstartdate ? new Date(eventDetails.dat_eventstartdate).toLocaleDateString() : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventManagement.form.endDate')}
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.dat_eventenddate || ''}
                      onChange={(e) => setEditForm({ ...editForm, dat_eventenddate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eventDetails?.dat_eventenddate ? new Date(eventDetails.dat_eventenddate).toLocaleDateString() : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventManagement.form.registrationDeadline')}
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.dat_meldeschluss || ''}
                      onChange={(e) => setEditForm({ ...editForm, dat_meldeschluss: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {eventDetails?.dat_meldeschluss ? new Date(eventDetails.dat_meldeschluss).toLocaleDateString() : '-'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventManagement.form.numberOfJudges')}
                  </label>
                  <p className="text-gray-900 text-sm text-gray-500">
                    {t('eventManagement.form.numberOfJudgesNotAvailable')}
                  </p>
                </div>
              </div>

              {/* Organizer Information */}
              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <BuildingOfficeIcon className="w-5 h-5 text-green-600" />
                  <span>{t('events.organizerInfo')}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.organizer')}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.var_veranstalter || ''}
                        onChange={(e) => setEditForm({ ...editForm, var_veranstalter: e.target.value })}
                        placeholder={t('eventManagement.form.organizerPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.var_veranstalter || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.contactPerson')}
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.int_ansprechpartner || ''}
                        onChange={(e) => setEditForm({ ...editForm, int_ansprechpartner: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('eventManagement.form.selectContactPerson')}</option>
                        {persons.map((person) => (
                          <option key={person.int_personenid} value={person.int_personenid}>
                            {person.full_name || `${person.var_vorname} ${person.var_nachname}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">{eventDetails?.contact_person_name || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.registrationContact')}
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.int_meldung_an || ''}
                        onChange={(e) => setEditForm({ ...editForm, int_meldung_an: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('eventManagement.form.selectRegistrationContact')}</option>
                        {persons.map((person) => (
                          <option key={person.int_personenid} value={person.int_personenid}>
                            {person.full_name || `${person.var_vorname} ${person.var_nachname}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">{eventDetails?.registration_contact_name || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('eventManagement.form.description')}
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.var_description || ''}
                    onChange={(e) => setEditForm({ ...editForm, var_description: e.target.value })}
                    placeholder={t('eventManagement.form.descriptionPlaceholder')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{eventDetails?.var_description || '-'}</p>
                )}
              </div>

              {/* Staff Requirements */}
              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <UserGroupIcon className="w-5 h-5 text-blue-600" />
                  <span>{t('eventManagement.staffRequirements')}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.numberOfJudges')}
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editForm.int_kampfrichter || 0}
                        onChange={(e) => setEditForm({ ...editForm, int_kampfrichter: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.int_kampfrichter || 0}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.numberOfHelpers')}
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editForm.int_helfer || 0}
                        onChange={(e) => setEditForm({ ...editForm, int_helfer: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.int_helfer || 0}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('eventManagement.form.numberOfCompOffice')}
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editForm.int_edv || 0}
                        onChange={(e) => setEditForm({ ...editForm, int_edv: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.int_edv || 0}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('eventManagement.form.additionalInfo')}
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.txt_hinweise || ''}
                    onChange={(e) => setEditForm({ ...editForm, txt_hinweise: e.target.value })}
                    placeholder={t('eventManagement.form.additionalInfoPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{eventDetails?.txt_hinweise || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
                <span>{t('eventManagement.statistics.title')}</span>
              </h2>
            </div>
            <div className="p-6">
              {statistics ? (
                <div className="space-y-6">
                  {/* Participant Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                      <UsersIcon className="w-4 h-4" />
                      <span>{t('eventManagement.statistics.participantsByGender')}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{statistics.totalParticipants}</div>
                        <div className="text-xs text-blue-600">{t('eventManagement.statistics.totalParticipants')}</div>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-pink-600">{statistics.femaleParticipants}</div>
                        <div className="text-xs text-pink-600">{t('eventManagement.statistics.female')}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-blue-600">{statistics.maleParticipants}</div>
                        <div className="text-xs text-blue-600">{t('eventManagement.statistics.male')}</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">{statistics.totalClubs}</div>
                        <div className="text-xs text-green-600">{t('eventManagement.statistics.totalClubs')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Competition Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                      <TrophyIcon className="w-4 h-4" />
                      <span>{t('eventManagement.statistics.totalCompetitions')}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{statistics.totalCompetitions}</div>
                        <div className="text-xs text-yellow-600">{t('events.competitions')}</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{statistics.totalGroups}</div>
                        <div className="text-xs text-purple-600">{t('events.groups')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Club Breakdown */}
                  {statistics.clubBreakdown && statistics.clubBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                        <UserGroupIcon className="w-4 h-4" />
                        <span>{t('eventManagement.statistics.clubDistribution')}</span>
                      </h3>
                      <div className="space-y-2">
                        {statistics.clubBreakdown.slice(0, 5).map((club, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <span className="text-sm text-gray-700 truncate">{club.clubName}</span>
                            <span className="text-sm font-medium text-gray-900">{club.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">{t('eventManagement.statistics.loading')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventManagement;
