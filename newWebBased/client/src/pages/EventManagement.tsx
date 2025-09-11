import React, { useState, useEffect } from 'react';
import { useEvent } from '../contexts/EventContext';
import { useTranslation } from 'react-i18next';
import { UnifiedPageHeader } from '../components/layout/UnifiedPageHeader';
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
import { apiGet, apiPut } from '../utils/api';

interface EventDetails {
  int_eventid: number;
  var_eventname: string;
  dat_eventstartdate: string;
  dat_eventenddate: string;
  var_location: string;
  var_description?: string;
  dat_meldeschluss?: string;
  var_veranstalter?: string;
  var_kontaktperson?: string;
  var_kontakt_email?: string;
  var_kontakt_telefon?: string;
  int_anzahl_kampfrichter?: number;
  var_zusatzinfo?: string;
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
  const { selectedEvent, setSelectedEvent } = useEvent();
  
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<EventDetails>>({});

  // Load event details and statistics
  useEffect(() => {
    if (selectedEvent) {
      loadEventData();
    }
  }, [selectedEvent]);

  const loadEventData = async () => {
    if (!selectedEvent) return;
    
    setIsLoading(true);
    try {
      // Load event details
      const eventResponse = await apiGet(`/events/${selectedEvent.int_eventid}`);
      setEventDetails(eventResponse);
      setEditForm(eventResponse);

      // Load statistics
      const statsResponse = await apiGet(`/events/${selectedEvent.int_eventid}/statistics`);
      setStatistics(statsResponse);
    } catch (error) {
      console.error('Error loading event data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEvent || !editForm) return;

    try {
      const updatedEvent = await apiPut(`/events/${selectedEvent.int_eventid}`, editForm);
      setEventDetails(updatedEvent);
      setSelectedEvent(updatedEvent);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleCancel = () => {
    setEditForm(eventDetails || {});
    setIsEditing(false);
  };

  if (!selectedEvent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <UnifiedPageHeader 
          title={t('eventManagement.title')}
          description={t('eventManagement.noEventSelected')}
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
          description={t('common.loading')}
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
        description={t('eventManagement.subtitle')}
        actions={
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
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
                    {t('events.eventName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.var_eventname || ''}
                      onChange={(e) => setEditForm({ ...editForm, var_eventname: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{eventDetails?.var_eventname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPinIcon className="w-4 h-4 inline mr-1" />
                    {t('events.location')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.var_location || ''}
                      onChange={(e) => setEditForm({ ...editForm, var_location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{eventDetails?.var_location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('events.startDate')}
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
                    {t('events.endDate')}
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
                    {t('events.registrationDeadline')}
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
                    {t('events.judges')}
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.int_anzahl_kampfrichter || ''}
                      onChange={(e) => setEditForm({ ...editForm, int_anzahl_kampfrichter: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{eventDetails?.int_anzahl_kampfrichter || 0}</p>
                  )}
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
                      {t('events.organizer')}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.var_veranstalter || ''}
                        onChange={(e) => setEditForm({ ...editForm, var_veranstalter: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.var_veranstalter || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('events.contactPerson')}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.var_kontaktperson || ''}
                        onChange={(e) => setEditForm({ ...editForm, var_kontaktperson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.var_kontaktperson || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('events.contactEmail')}
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.var_kontakt_email || ''}
                        onChange={(e) => setEditForm({ ...editForm, var_kontakt_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.var_kontakt_email || '-'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('events.contactPhone')}
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.var_kontakt_telefon || ''}
                        onChange={(e) => setEditForm({ ...editForm, var_kontakt_telefon: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{eventDetails?.var_kontakt_telefon || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('events.description')}
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.var_description || ''}
                    onChange={(e) => setEditForm({ ...editForm, var_description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{eventDetails?.var_description || '-'}</p>
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
                <span>{t('eventManagement.statistics')}</span>
              </h2>
            </div>
            <div className="p-6">
              {statistics ? (
                <div className="space-y-6">
                  {/* Participant Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                      <UsersIcon className="w-4 h-4" />
                      <span>{t('events.participants')}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{statistics.totalParticipants}</div>
                        <div className="text-xs text-blue-600">{t('common.total')}</div>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-pink-600">{statistics.femaleParticipants}</div>
                        <div className="text-xs text-pink-600">{t('common.female')}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-blue-600">{statistics.maleParticipants}</div>
                        <div className="text-xs text-blue-600">{t('common.male')}</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">{statistics.totalClubs}</div>
                        <div className="text-xs text-green-600">{t('events.clubs')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Competition Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                      <TrophyIcon className="w-4 h-4" />
                      <span>{t('events.competitions')}</span>
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
                        <span>{t('events.topClubs')}</span>
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
                  <p className="text-gray-500">{t('eventManagement.noStatistics')}</p>
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
