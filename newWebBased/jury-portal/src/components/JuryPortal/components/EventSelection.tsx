/**
 * Event Selection step for the Jury Portal.
 * 
 * Displays a list of events for the jury to choose from,
 * with an optional filter to show only today's events.
 */

import React from 'react';
import { Trophy } from 'lucide-react';

interface EventSelectionProps {
  events: any[];
  filteredEvents: any[];
  filterToday: boolean;
  loading: boolean;
  selectedEvent: number | null;
  onEventChange: (eventId: number | null) => void;
  onFilterTodayChange: (enabled: boolean) => void;
  onNext: () => void;
}

const EventSelection: React.FC<EventSelectionProps> = ({
  events,
  filteredEvents,
  filterToday,
  loading,
  selectedEvent,
  onEventChange,
  onFilterTodayChange,
  onNext,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Trophy className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Jury Portal</h1>
            <p className="text-gray-600">Vereinfachte Bewertungsansicht für Wettkampftag</p>
          </div>

          {/* Filter Toggle */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filterToday}
                  onChange={(e) => onFilterTodayChange(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900">Nur heutige Events anzeigen</span>
                  <p className="text-sm text-gray-600">
                    Zeigt nur Veranstaltungen, die heute stattfinden
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {filterToday ? `${filteredEvents.length} Event(s)` : `${events.length} Event(s)`}
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-lg font-medium text-gray-700">Event auswählen:</label>
            <select
              className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              value={selectedEvent || ''}
              onChange={(e) => onEventChange(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Bitte Event auswählen...</option>
              {Array.isArray(filteredEvents) && filteredEvents.map((event) => (
                <option key={event.int_eventid} value={event.int_eventid}>
                  {event.var_eventname}
                  {event.dat_eventbeginn && ` (${new Date(event.dat_eventbeginn).toLocaleDateString('de-DE')})`}
                </option>
              ))}
            </select>

            {filterToday && filteredEvents.length === 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ℹ️ Keine Events für heute gefunden. Deaktiviere den Filter, um alle Events zu sehen.
                </p>
              </div>
            )}

            <button
              className="w-full mt-6 bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={!selectedEvent || loading}
              onClick={onNext}
            >
              {loading ? 'Lädt...' : 'Weiter zur Riegeneinteilung'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSelection;
