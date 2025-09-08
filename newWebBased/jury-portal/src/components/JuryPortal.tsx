import React, { useState, useEffect } from 'react';
import { Users, Trophy } from 'lucide-react';

interface Participant {
  id: number;
  name: string;
  club: string;
  startNumber: number;
  currentScore?: number;
  status: 'completed' | 'current' | 'pending';
  participantId: number;
  firstName: string;
  lastName: string;
  firstname?: string; // API sometimes uses this format
  lastname?: string;  // API sometimes uses this format
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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/events`);
        const data = await response.json();
        
        // Handle different response structures
        let eventsArray = [];
        if (Array.isArray(data)) {
          eventsArray = data;
        } else if (data && Array.isArray(data.events)) {
          eventsArray = data.events;
        } else if (data && data.data && Array.isArray(data.data)) {
          eventsArray = data.data;
        }
        
        console.log('Events API response:', data);
        console.log('Processed events array:', eventsArray);
        
        setEvents(eventsArray);
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
        
        console.log('Squad Management API response:', data);
        
        // Handle the squad data structure based on the API
        const formattedSquads = (data?.squads || [])
          .filter((squad: any) => squad.participantCount > 0) // Only show squads with participants
          .map((squad: any) => ({
            id: squad.id,
            name: squad.name,
            participants: squad.participants || [] // Use the participants array from the API
          }));
        
        console.log('Processed squads:', formattedSquads);
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
      if (!selectedEvent || !selectedSquad) return;
      
      try {
        setLoading(true);
        
        // First try to get squad-specific disciplines
        const squadDisciplinesResponse = await fetch(`${API_BASE_URL}/squad-disciplines?eventId=${selectedEvent}&squadName=${encodeURIComponent(selectedSquad.name)}`);
        
        let formattedDevices = [];
        
        if (squadDisciplinesResponse.ok) {
          const squadDisciplinesData = await squadDisciplinesResponse.json();
          console.log('Squad disciplines API response:', squadDisciplinesData);
          
          // Use squad-specific disciplines if available
          formattedDevices = (squadDisciplinesData?.squadDisciplines || []).map((squadDiscipline: any) => ({
            id: squadDiscipline.disciplineId,
            name: squadDiscipline.disciplineName,
            disciplineId: squadDiscipline.disciplineId,
            icon: getDeviceIcon(squadDiscipline.disciplineName)
          }));
        }
        
        // Fallback to all disciplines if no squad-specific ones found
        if (formattedDevices.length === 0) {
          console.log('No squad-specific disciplines found, falling back to all disciplines');
          const disciplinesResponse = await fetch(`${API_BASE_URL}/disciplines`);
          const disciplinesData = await disciplinesResponse.json();
          
          formattedDevices = (disciplinesData || []).map((discipline: any) => ({
            id: discipline.id,
            name: discipline.name,
            disciplineId: discipline.id,
            icon: getDeviceIcon(discipline.name)
          }));
        }
        
        console.log('Processed devices:', formattedDevices);
        setDevices(formattedDevices);
      } catch (error) {
        console.error('Error fetching devices:', error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [selectedEvent, selectedSquad]);

  // Fetch participants when squad and device are selected
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!selectedEvent || !selectedSquad || !selectedDevice) return;
      
      try {
        setLoading(true);
        
        // Use participants from the selected squad
        const squadParticipants = selectedSquad.participants || [];
        
        console.log('Selected squad participants:', squadParticipants);
        
        // Format participants for scoring and fetch existing scores
        const formattedParticipantsPromises = squadParticipants.map(async (participant: any, index: number) => {
          // Fetch existing scores for this participant and discipline
          let existingScore = null;
          try {
            // Use the new wertungen-details API to check for main discipline scores (from tfx_wertungen_details)
            const queryParticipantId = participant.id; // Use the actual participant ID
            const scoresResponse = await fetch(`${API_BASE_URL}/wertungen-details/by-participant/${queryParticipantId}/discipline/${selectedDevice?.disciplineId}`);
            if (scoresResponse.ok) {
              const scoreData = await scoresResponse.json();
              console.log(`Fetched main discipline score for participant ${participant.id} (discipline ${selectedDevice?.disciplineId}):`, scoreData);
              
              if (scoreData && scoreData.score !== undefined && scoreData.score !== null) {
                existingScore = parseFloat(scoreData.score);
                console.log(`Found existing main discipline score for participant ${participant.id}:`, existingScore);
              } else {
                console.log(`No main discipline score found for participant ${participant.id}, checking detailed field scores...`);
                
                // Fallback: check jury results for detailed field scores
                const detailedScoresResponse = await fetch(`${API_BASE_URL}/jury-results?participantId=${participant.wertungenId || participant.id}&disciplineId=${selectedDevice?.disciplineId}`);
                if (detailedScoresResponse.ok) {
                  const detailedScores = await detailedScoresResponse.json();
                  if (detailedScores.results && detailedScores.results.length > 0) {
                    const totalScore = detailedScores.results.reduce((sum: number, score: any) => {
                      const performance = parseFloat(score.performance || 0);
                      return sum + performance;
                    }, 0);
                    existingScore = totalScore > 0 ? totalScore : null;
                    console.log(`Calculated total from field scores for participant ${participant.id}:`, existingScore);
                  }
                }
              }
            } else {
              console.log(`Main score API response not ok for participant ${participant.id}:`, scoresResponse.status);
            }
          } catch (error) {
            console.warn('Could not fetch existing scores for participant:', participant.id, error);
          }

          return {
            id: participant.id,
            participantId: participant.id,
            name: participant.firstname && participant.lastname 
              ? `${participant.firstname} ${participant.lastname}`
              : participant.firstName && participant.lastName
              ? `${participant.firstName} ${participant.lastName}`
              : participant.name || 'Unknown Participant',
            firstName: participant.firstname || participant.firstName || '',
            lastName: participant.lastname || participant.lastName || '',
            club: participant.clubName || participant.club || 'Unknown Club',
            clubName: participant.clubName || participant.club || 'Unknown Club',
            startNumber: participant.startNumber || (index + 1),
            status: existingScore ? 'completed' : (index === 0 ? 'current' : 'pending') as 'completed' | 'current' | 'pending',
            currentScore: existingScore,
            wertungenId: participant.wertungenId
          };
        });
        
        const formattedParticipants = await Promise.all(formattedParticipantsPromises);
        
        console.log('Formatted participants for scoring with scores:', formattedParticipants);
        setParticipants(formattedParticipants);
        
        // Set current participant to first one without a score
        const firstUncompletedIndex = formattedParticipants.findIndex(p => !p.currentScore);
        setCurrentParticipantIndex(firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0);
      } catch (error) {
        console.error('Error processing participants:', error);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [selectedEvent, selectedSquad, selectedDevice]);

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
    return iconMap[deviceName] || '🏆';
  };

  const currentParticipant = participants[currentParticipantIndex];
  const previousParticipant = participants[currentParticipantIndex - 1];
  const nextParticipant = participants[currentParticipantIndex + 1];

  const handleScoreSubmit = async () => {
    if (!currentParticipant || !score || !selectedDevice) return;
    
    try {
      setLoading(true);
      
      // Save main discipline score to tfx_wertungen_details (following C++ logic)
      const scoreData = {
        participantId: currentParticipant.participantId,
        disciplineId: selectedDevice.disciplineId,
        score: parseFloat(score),
        attempt: 1,
        type: 0, // 0=Pflicht, 1=Kür
        eventId: selectedEvent
      };

      console.log('Saving main discipline score:', scoreData);

      const response = await fetch(`${API_BASE_URL}/wertungen-details/save-main-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        console.log('✅ Main discipline score saved successfully');
        
        // Update participant status
        const updatedParticipants = [...participants];
        if (updatedParticipants[currentParticipantIndex]) {
          updatedParticipants[currentParticipantIndex].status = 'completed';
          updatedParticipants[currentParticipantIndex].currentScore = parseFloat(score);
        }
        
        // Find next participant without a score
        const nextUncompletedIndex = updatedParticipants.findIndex((p, index) => 
          index > currentParticipantIndex && !p.currentScore
        );
        
        if (nextUncompletedIndex >= 0) {
          // Set previous current participant status based on whether they have a score
          if (currentParticipantIndex >= 0 && currentParticipantIndex < updatedParticipants.length) {
            updatedParticipants[currentParticipantIndex].status = 'completed';
          }
          // Set next participant as current
          updatedParticipants[nextUncompletedIndex].status = 'current';
          setCurrentParticipantIndex(nextUncompletedIndex);
        } else {
          // All participants completed
          if (currentParticipantIndex >= 0 && currentParticipantIndex < updatedParticipants.length) {
            updatedParticipants[currentParticipantIndex].status = 'completed';
          }
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

  const handleDeviceComplete = async () => {
    try {
      // Mark squad as completed for this device
      await fetch(`${API_BASE_URL}/squad-management/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent,
          squadName: selectedSquad?.name,
          disciplineId: selectedDevice?.disciplineId,
          status: 'Leistung erfasst'
        }),
      });
      
      // Return to device selection and reset current participant
      setStep('device');
      setCurrentParticipantIndex(0);
      setScore('');
    } catch (error) {
      console.error('Error completing device:', error);
      // Still navigate back even if API call fails
      setStep('device');
      setCurrentParticipantIndex(0);
      setScore('');
    }
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
                {Array.isArray(events) && events.map((event) => (
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
            <div className="mb-8">
              <button 
                onClick={() => setStep('event')}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Zurück
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Riege auswählen</h1>
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
                    <p className="text-gray-600">{squad.participants?.length || 0} Teilnehmer</p>
                    <div className="mt-4 space-y-1">
                      {(squad.participants || []).slice(0, 3).map((participant, index) => (
                        <div key={`${participant.id}-${index}`} className="text-sm text-gray-500">
                          #{participant.startNumber || index + 1} {participant.firstName || participant.firstname} {participant.lastName || participant.lastname}
                        </div>
                      ))}
                      {(squad.participants || []).length > 3 && (
                        <div className="text-sm text-gray-400">
                          ...und {(squad.participants || []).length - 3} weitere
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
            <div className="mb-8">
              <button 
                onClick={() => setStep('squad')}
                className="text-blue-600 hover:text-blue-800 mb-4"
              >
                ← Zurück
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerät auswählen</h1>
                <p className="text-gray-600">{selectedSquad?.name}</p>
              </div>
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
                {previousParticipant.currentScore && previousParticipant.currentScore > 0 && (
                  <p className="text-lg font-bold text-green-600 mt-2">
                    {previousParticipant.currentScore.toFixed(2)}
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
                      {participant.currentScore && participant.currentScore > 0 && (
                        <div className="mb-1">
                          <span className="text-green-600 font-bold">{participant.currentScore.toFixed(2)}</span>
                        </div>
                      )}
                      {participant.status === 'current' && (
                        <span className="text-blue-600 font-medium">Aktuell</span>
                      )}
                      {participant.status === 'pending' && !participant.currentScore && (
                        <span className="text-gray-400">Wartend</span>
                      )}
                      {participant.status === 'completed' && (
                        <span className="text-green-600 font-medium">Abgeschlossen</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JuryPortal;
