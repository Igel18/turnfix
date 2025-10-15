import { useState, useEffect } from 'react';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';

interface Event {
  int_id: number;
  str_name: string;
  dat_datum?: string;
}

export default function JuryPortal() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setEvents(data);
      } else if (data && Array.isArray(data.events)) {
        setEvents(data.events);
      } else if (data && Array.isArray(data.data)) {
        setEvents(data.data);
      } else {
        console.error('Unexpected events response format:', data);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = (eventId: number) => {
    // Navigate to score capture for this event
    window.location.href = `/score-capture?event=${eventId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Wettkämpfe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <UnifiedPageHeader
        title="Kampfrichter-Portal"
        subtitle="Vereinfachte Ansicht für Wettkampftag"
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Willkommen im Kampfrichter-Portal
            </h2>
            <p className="text-gray-600 text-lg">
              Einfache und übersichtliche Wertungserfassung
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Hinweis:</strong> Diese Ansicht ist speziell für Kampfrichter optimiert.
                  Alle komplexen Verwaltungsfunktionen sind ausgeblendet.
                </p>
              </div>
            </div>
          </div>

          {/* Event Selection */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Wettkampf auswählen
            </h3>
            
            {events.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-gray-600">Keine Wettkämpfe verfügbar</p>
                <p className="text-sm text-gray-500 mt-2">
                  Bitte kontaktieren Sie den Administrator
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <button
                    key={event.int_id}
                    onClick={() => handleEventSelect(event.int_id)}
                    className="w-full text-left p-6 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-xl font-semibold text-gray-900 mb-1">
                          {event.str_name}
                        </h4>
                        {event.dat_datum && (
                          <p className="text-sm text-gray-600">
                            📅 {new Date(event.dat_datum).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="text-purple-600 font-medium mr-2">
                          Zur Wertungserfassung
                        </span>
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            💡 Bei Problemen wenden Sie sich bitte an den Wettkampfleiter
          </p>
          <p className="mt-2">
            TurnFix Kampfrichter-Portal • Version 2.0
          </p>
        </div>
      </div>
    </div>
  );
}
