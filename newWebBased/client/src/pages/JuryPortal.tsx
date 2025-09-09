import React, { useState, useEffect } from 'react';
import { Users, Trophy, Smartphone, Monitor, Tablet, ArrowLeft } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  club: string;
  startNumber: number;
  currentScore?: string;
  status: 'completed' | 'current' | 'pending';
  participantId: number;
  firstName: string;
  lastName: string;
  clubName: string;
  wertungenId?: number;
}

interface Squad {
  id: number;
  name: string;
  participants: Participant[];
}

interface Device {
  id: number;
  name: string;
  icon: string;
  disciplineId: number;
}

interface Event {
  int_eventid: number;
  var_eventname: string;
  dat_eventstartdate: string;
  dat_eventenddate: string;
}

interface Competition {
  id: number;
  name: string;
  eventId: number;
}

interface ApiParticipant {
  id: number;
  firstName: string;
  lastName: string;
  club?: {
    name: string;
  };
  clubName?: string;
  startNumber?: number;
  participantId?: number;
  wertungenId?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const JuryPortal: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(0);
  const [score, setScore] = useState<string>('');
  const [step, setStep] = useState<'event' | 'squad' | 'device' | 'scoring'>('event');
  
  // Real data states
  const [events, setEvents] = useState<any[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:3001/api';

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/events`);
        const data = await response.json();
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  // Fetch squads when event is selected
  useEffect(() => {
    const fetchSquads = async () => {
      if (!selectedEvent) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/squad-management?eventId=${selectedEvent}`);
        const data = await response.json();
        
        const formattedSquads = (data?.squads || []).map((squad: any) => ({
          id: squad.id,
          name: squad.name || squad.squadName,
          participants: []
        }));
        
        setSquads(formattedSquads);
      } catch (error) {
        console.error('Error fetching squads:', error);
        setSquads([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSquads();
  }, [selectedEvent]);

  // Fetch devices (disciplines) when squad is selected
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedEvent) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/disciplines`);
        const data = await response.json();
        
        const formattedDevices = (data || []).map((discipline: any) => ({
          id: discipline.id,
          name: discipline.name,
          disciplineId: discipline.id,
          icon: getDeviceIcon(discipline.name)
        }));
        
        setDevices(formattedDevices);
      } catch (error) {
        console.error('Error fetching devices:', error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [selectedEvent]);

  // Fetch participants when squad and device are selected
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!selectedEvent || !selectedSquad || !selectedDevice) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/event-participants?eventId=${selectedEvent}&includeAvailable=true`);
        const data = await response.json();
        
        // Filter participants by squad and get those who should compete in this device
        const filteredParticipants = (data?.participants || [])
          .filter((p: any) => p.squadName === selectedSquad.name)
          .map((participant: any, index: number) => ({
            id: participant.id,
            participantId: participant.id,
            name: `${participant.firstName} ${participant.lastName}`,
            firstName: participant.firstName,
            lastName: participant.lastName,
            club: participant.clubName || 'Unknown Club',
            clubName: participant.clubName || 'Unknown Club',
            startNumber: participant.startNumber || (index + 1),
            status: index === 0 ? 'current' : 'pending',
            wertungenId: participant.wertungenId
          }));
        
        setParticipants(filteredParticipants);
        setCurrentParticipantIndex(0);

        // Fetch scores for all participants
        await fetchParticipantScores(filteredParticipants);
      } catch (error) {
        console.error('Error fetching participants:', error);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [selectedEvent, selectedSquad, selectedDevice]);

  // Function to fetch scores for all participants
  const fetchParticipantScores = async (participantsList: Participant[]) => {
    if (!selectedDevice?.disciplineId) return;

    try {
      const updatedParticipants = await Promise.all(
        participantsList.map(async (participant) => {
          try {
            // Use wertungenId if available, otherwise use participantId
            const idToUse = participant.wertungenId || participant.participantId;
            const response = await fetch(
              `${API_BASE_URL}/jury-results?participantId=${idToUse}&disciplineId=${selectedDevice.disciplineId}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              // Calculate total score from all results
              const totalScore = data.results.reduce((sum: number, result: any) => {
                return sum + (parseFloat(result.performance) || 0);
              }, 0);
              
              return {
                ...participant,
                status: 'completed' as const,
                currentScore: totalScore.toFixed(2)
              };
            }
            
            return participant;
          } catch (error) {
            console.error(`Error fetching score for participant ${participant.id}:`, error);
            return participant;
          }
        })
      );

      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('Error fetching participant scores:', error);
    }
  };

  const getDeviceIcon = (deviceName: string): string => {
    const iconMap: { [key: string]: string } = {
      'Boden': '🤸',
      'Reck': '🏃',
      'Barren': '💪', 
      'Pferd': '🏇',
      'Stufenbarren': '🤸‍♀️',
      'Schwebebalken': '⚖️',
      'Sprung': '🤾',
      'Ringe': '💍'
    };
    return iconMap[deviceName] || '�';
  };

  const currentParticipant = participants[currentParticipantIndex];
  const previousParticipant = participants[currentParticipantIndex - 1];
  const nextParticipant = participants[currentParticipantIndex + 1];

  const handleScoreSubmit = async () => {
    if (!currentParticipant || !score || !selectedDevice) return;
    
    try {
      setLoading(true);
      
      // Find a discipline field for this device (use the first enabled one)
      const disciplineFieldsResponse = await fetch(`${API_BASE_URL}/discipline-fields`);
      const disciplineFields = await disciplineFieldsResponse.json();
      const relevantField = disciplineFields.find((field: any) => 
        field.disciplineId === selectedDevice.disciplineId && field.enabled
      );
      
      if (!relevantField) {
        alert('No discipline field found for this device');
        return;
      }

      const scoreData = {
        participantId: currentParticipant.participantId,
        disciplineFieldId: relevantField.id,
        attempt: 1,
        performance: parseFloat(score),
        type: 0,
        eventId: selectedEvent
      };

      const response = await fetch(`${API_BASE_URL}/jury-results/save-field-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        // Update participant status
        const updatedParticipants = [...participants];
        if (updatedParticipants[currentParticipantIndex]) {
          updatedParticipants[currentParticipantIndex].status = 'completed';
          updatedParticipants[currentParticipantIndex].currentScore = parseFloat(score).toFixed(2);
        }
        
        // Move to next participant
        if (nextParticipant && currentParticipantIndex + 1 < participants.length) {
          updatedParticipants[currentParticipantIndex + 1].status = 'current';
          setCurrentParticipantIndex(currentParticipantIndex + 1);
        }
        
        setParticipants(updatedParticipants);
        setScore('');
      } else {
        const errorData = await response.json();
        alert(`Error saving score: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Error submitting score');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceComplete = () => {
    // Mark device as complete and return to device selection
    setStep('device');
    setCurrentParticipantIndex(0);
    setScore('');
  };

  if (step === 'event') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <Trophy className="mx-auto h-16 w-16 text-blue-600 mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Jury Portal</h1>
              <p className="text-gray-600">Vereinfachte Bewertungsansicht für Wettkampftag</p>
            </div>

            <div className="space-y-4">
              <label className="block text-lg font-medium text-gray-700">Event auswählen:</label>
              <select 
                className="w-full p-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Bitte Event auswählen...</option>
                {events.map((event) => (
                  <option key={event.int_eventid} value={event.int_eventid}>
                    {event.var_eventname}
                  </option>
                ))}
              </select>

              <button
                className="w-full mt-6 bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={!selectedEvent || loading}
                onClick={() => setStep('squad')}
              >
                {loading ? 'Lädt...' : 'Weiter zur Riegeneinteilung'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'squad') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Riege auswählen</h1>
              <button 
                onClick={() => setStep('event')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Zurück
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {loading ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">Lade Riegen...</p>
                </div>
              ) : squads.length === 0 ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">Keine Riegen gefunden für dieses Event</p>
                </div>
              ) : (
                squads.map((squad) => (
                  <div
                    key={squad.id}
                    className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedSquad(squad);
                      setStep('device');
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">{squad.name}</h3>
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-gray-600">{squad.participants.length} Teilnehmer</p>
                    <div className="mt-4 space-y-1">
                      {squad.participants.slice(0, 3).map((participant) => (
                        <div key={participant.id} className="text-sm text-gray-500">
                          #{participant.startNumber} {participant.name}
                        </div>
                      ))}
                      {squad.participants.length > 3 && (
                        <div className="text-sm text-gray-400">
                          ...und {squad.participants.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'device') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerät auswählen</h1>
                <p className="text-gray-600">{selectedSquad?.name}</p>
              </div>
              <button 
                onClick={() => setStep('squad')}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Zurück
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <div className="col-span-4 text-center py-8">
                  <p className="text-gray-500">Lade Geräte...</p>
                </div>
              ) : devices.length === 0 ? (
                <div className="col-span-4 text-center py-8">
                  <p className="text-gray-500">Keine Geräte gefunden</p>
                </div>
              ) : (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className="border-2 border-gray-200 rounded-lg p-8 hover:border-blue-500 cursor-pointer transition-colors text-center"
                    onClick={() => {
                      setSelectedDevice(device);
                      setStep('scoring');
                    }}
                  >
                    <div className="text-4xl mb-4">{device.icon}</div>
                    <h3 className="text-xl font-semibold">{device.name}</h3>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Scoring interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setStep('device')}
              className="text-blue-100 hover:text-white"
            >
              ← Zurück
            </button>
            <div>
              <h1 className="text-xl font-bold">{selectedDevice?.name}</h1>
              <p className="text-blue-100">{selectedSquad?.name}</p>
            </div>
          </div>
          <button
            onClick={handleDeviceComplete}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium"
          >
            Gerät abschließen
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Participant Navigation */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Previous Participant */}
          <div className="bg-gray-200 rounded-lg p-4 text-center">
            <h3 className="font-medium text-gray-600 mb-2">Vorheriger</h3>
            {previousParticipant ? (
              <div>
                <p className="font-semibold">#{previousParticipant.startNumber}</p>
                <p className="text-sm">{previousParticipant.name}</p>
                <p className="text-xs text-gray-500">{previousParticipant.club}</p>
                {previousParticipant.currentScore && (
                  <p className="text-lg font-bold text-green-600 mt-2">
                    {previousParticipant.currentScore}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          {/* Current Participant */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
            <h3 className="font-medium text-blue-600 mb-2">Aktuell</h3>
            {currentParticipant && (
              <div>
                <p className="text-2xl font-bold">#{currentParticipant.startNumber}</p>
                <p className="text-lg font-semibold">{currentParticipant.name}</p>
                <p className="text-sm text-gray-600">{currentParticipant.club}</p>
                
                {/* Score Input */}
                <div className="mt-6 space-y-4">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="0.0"
                    className="w-full text-2xl text-center p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleScoreSubmit}
                    disabled={!score || loading}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg text-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Speichert...' : 'Bewertung speichern'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Next Participant */}
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <h3 className="font-medium text-gray-600 mb-2">Nächster</h3>
            {nextParticipant ? (
              <div>
                <p className="font-semibold">#{nextParticipant.startNumber}</p>
                <p className="text-sm">{nextParticipant.name}</p>
                <p className="text-xs text-gray-500">{nextParticipant.club}</p>
              </div>
            ) : (
              <p className="text-gray-400">Ende der Riege</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg p-6 shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Fortschritt</span>
            <span className="text-sm text-gray-500">
              {currentParticipantIndex + 1} von {participants.length || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: participants.length 
                  ? `${((currentParticipantIndex + 1) / participants.length) * 100}%` 
                  : '0%' 
              }}
            ></div>
          </div>
          
          {/* Participant List for this Device */}
          {participants.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Teilnehmer in dieser Riege für {selectedDevice?.name}:</h3>
              <div className="max-h-40 overflow-y-auto">
                {participants.map((participant, index) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center justify-between p-2 rounded ${
                      index === currentParticipantIndex 
                        ? 'bg-blue-100 border-l-4 border-blue-500' 
                        : participant.status === 'completed' 
                        ? 'bg-green-50' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="font-medium">#{participant.startNumber} {participant.name}</span>
                      <div className="text-sm text-gray-500">{participant.clubName}</div>
                    </div>
                    <div className="text-right">
                      {participant.status === 'completed' && participant.currentScore && (
                        <span className="text-green-600 font-bold">{participant.currentScore}</span>
                      )}
                      {participant.status === 'current' && (
                        <span className="text-blue-600 font-medium">Aktuell</span>
                      )}
                      {participant.status === 'pending' && (
                        <span className="text-gray-400">Wartend</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Device Info for Reference */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white p-4 rounded-lg shadow">
            <Monitor className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Windows PC optimiert</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <Tablet className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Tablet-freundlich</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <Smartphone className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Smartphone-tauglich</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JuryPortal;
