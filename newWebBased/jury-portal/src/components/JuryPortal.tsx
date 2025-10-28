import React, { useState, useEffect } from 'react';
import { Users, Trophy } from 'lucide-react';
import { getDisciplineIcon, getFallbackDeviceEmoji } from '../utils/iconUtils';
import getSocket from '../utils/socket';

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
  assignedCompetitions?: number[];
}

interface Squad {
  id: number;
  name: string;
  participants: Participant[];
}

interface Device {
  id: number;
  name: string;
  icon: string; // Can be emoji or icon path
  iconPath?: string | null; // Optional: database icon path (web-accessible URL)
  disciplineId: number;
}

interface Competition {
  id: number;
  name: string;
  eventId: number;
  disciplines?: Device[];
}

// API configuration - use full URL to main server port in production
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // In production, connect to port 3001 (main server) instead of 3002 (jury server)
    const origin = window.location.origin.replace(':3002', ':3001');
    console.log('🔧 JURY API: Using production URL:', `${origin}/api`);
    return `${origin}/api`;
  }
  // In development, use proxy
  console.log('🔧 JURY API: Using development proxy: /api');
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

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
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auto-filter settings - persist in localStorage
  const [filterToday, setFilterToday] = useState<boolean>(() => {
    const saved = localStorage.getItem('juryPortal_filterToday');
    return saved !== null ? saved === 'true' : true; // Default: enabled
  });

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
  
  // Helper function to check if event is today
  const isEventToday = (event: any): boolean => {
    if (!event) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check event start date (dat_eventbeginn)
    if (event.dat_eventbeginn) {
      const eventStart = new Date(event.dat_eventbeginn);
      eventStart.setHours(0, 0, 0, 0);
      
      // Check event end date if available
      if (event.dat_eventende) {
        const eventEnd = new Date(event.dat_eventende);
        eventEnd.setHours(0, 0, 0, 0);
        
        // Event is "today" if today is between start and end date
        return today >= eventStart && today <= eventEnd;
      }
      
      // If no end date, just check if start date matches
      return today.getTime() === eventStart.getTime();
    }
    
    return false;
  };
  
  // Filter events based on today filter setting
  const filteredEvents = filterToday 
    ? events.filter(isEventToday)
    : events;
  
  // Save filter preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('juryPortal_filterToday', filterToday.toString());
  }, [filterToday]);

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

  // Fetch devices (disciplines) when squad is selected - use EXACT same logic as Score Capture
  useEffect(() => {
    const fetchDevices = async () => {
      if (!selectedEvent || !selectedSquad) return;
      
      try {
        setLoading(true);
        console.log('🔍 JURY: Loading disciplines for event:', selectedEvent, 'squad:', selectedSquad.name);
        
        // Helper function to add delay between API calls (same as Score Capture)
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
        
        // Load all disciplines/competitions for the event (same as Score Capture)
        const competitionsData = await fetch(`${API_BASE_URL}/competitions?eventId=${selectedEvent}`);
        const competitionsResponse = await competitionsData.json();
        await delay(100);
        console.log('🔍 JURY: Loaded competitions:', competitionsResponse);
        
        // Load all disciplines from all competitions and track their competition associations (EXACT COPY from Score Capture)
        let allDisciplines: any[] = []
        const disciplineToCompetitionMap = new Map<number | string, number>()
        
        console.log('🔍 JURY DEBUG: Starting discipline loading for competitions:', competitionsResponse?.map((c: any) => ({ id: c.id, name: c.name })))
        
        for (const competition of competitionsResponse || []) {
          try {
            await delay(50) // Delay between each competition request
            console.log(`🔍 JURY: Loading disciplines for competition ${competition.id} (${competition.name})`)
            const disciplinesResponse = await fetch(`${API_BASE_URL}/competitions/${competition.id}/disciplines`)
            const disciplinesData = await disciplinesResponse.json()
            const competitionDisciplines = disciplinesData.disciplines || []
            
            console.log(`🔍 JURY: Competition ${competition.id} returned ${competitionDisciplines.length} disciplines:`, 
              competitionDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })))
            
            // Track which competition each discipline belongs to
            competitionDisciplines.forEach((discipline: any) => {
              const disciplineKey = discipline.int_disziplinid || discipline.var_name
              disciplineToCompetitionMap.set(disciplineKey, competition.id)
              console.log(`🔍 JURY: Mapped discipline "${discipline.var_name}" (ID: ${discipline.int_disziplinid}) to competition ${competition.id}`)
            })
            
            allDisciplines = [...allDisciplines, ...competitionDisciplines]
          } catch (error) {
            console.error(`❌ JURY: Error loading disciplines for competition ${competition.id}:`, error)
          }
        }
        
        console.log('🔍 JURY: Final discipline-to-competition mapping:', Array.from(disciplineToCompetitionMap.entries()))
        
        // Remove duplicate disciplines based on int_disziplinid and var_name (EXACT COPY from Score Capture)
        const uniqueDisciplines = allDisciplines.reduce((acc: any[], current: any) => {
          const existingIndex = acc.findIndex(d => 
            (d.int_disziplinid && current.int_disziplinid && d.int_disziplinid === current.int_disziplinid) ||
            (d.var_name === current.var_name && d.int_disziplinid === current.int_disziplinid)
          )
          if (existingIndex === -1) {
            acc.push(current)
          }
          return acc
        }, [])

        console.log('🔍 JURY: All loaded disciplines (before dedup):', allDisciplines)
        console.log('🔍 JURY: Unique disciplines (after dedup):', uniqueDisciplines)
        
        // Now filter disciplines by the squad's assigned competitions
        const squadParticipants = selectedSquad.participants || [];
        console.log('🔍 JURY: Squad participants for filtering:', squadParticipants.length);
        
        if (squadParticipants.length === 0) {
          console.log('🔍 JURY: No participants in squad, showing no devices');
          setDevices([]);
          return;
        }

        // Get available disciplines for this squad using competition data
        const participantCompetitionIds = new Set<number>();
        
        // Extract competition IDs from squad participants
        // Squad participants have a 'competitions' array with objects: [{id, name, number}, ...]
        squadParticipants.forEach((participant: any) => {
          if (participant.competitions && Array.isArray(participant.competitions)) {
            participant.competitions.forEach((comp: any) => {
              if (comp.id) {
                participantCompetitionIds.add(comp.id);
              }
            });
          }
        });
        
        console.log('🔍 JURY: Competitions from squad participants:', Array.from(participantCompetitionIds));
        
        // Get disciplines from these competitions (same as Score Capture)
        const availableDisciplineIds = new Set<number>();
        competitionsResponse.forEach((competition: any) => {
          if (participantCompetitionIds.has(competition.id)) {
            console.log('🔍 JURY: Found matching competition:', competition.id, competition.name);
            console.log('🔍 JURY: Competition disciplines property:', competition.disciplines);
            
            if (competition.disciplines && Array.isArray(competition.disciplines)) {
              console.log('🔍 JURY: Competition has', competition.disciplines.length, 'disciplines');
              competition.disciplines.forEach((discipline: any) => {
                console.log('🔍 JURY: Processing discipline:', discipline);
                // Handle different discipline structure formats
                const disciplineId = discipline.int_disziplinid || discipline.disciplineId;
                if (disciplineId) {
                  availableDisciplineIds.add(disciplineId);
                  console.log('🔍 JURY: Added discipline ID:', disciplineId);
                } else {
                  console.log('🔍 JURY: Discipline missing both int_disziplinid and disciplineId:', discipline);
                }
              });
            } else {
              console.log('🔍 JURY: Competition has no disciplines property or it is not an array');
            }
          }
        });
        
        console.log('🔍 JURY: Available discipline IDs for squad:', Array.from(availableDisciplineIds));
        
        // Filter disciplines using EXACT SAME logic as Score Capture
        const filteredDisciplines = uniqueDisciplines.filter((discipline: any) => {
          return availableDisciplineIds.has(discipline.int_disziplinid);
        });
        
        console.log('🔍 JURY: Filtered disciplines using Score Capture logic:', filteredDisciplines.map((d: any) => ({ id: d.int_disziplinid, name: d.var_name })));
        
        // Transform to Device format - use database icon if available, fallback to emoji
        const devicesList = filteredDisciplines.map((discipline: any) => {
          const iconUrl = getDisciplineIcon(discipline.var_name, discipline.var_icon);
          return {
            id: discipline.int_disziplinid,
            name: discipline.var_name,
            disciplineId: discipline.int_disziplinid,
            icon: iconUrl ? '' : getFallbackDeviceEmoji(discipline.var_name), // Emoji if no icon URL
            iconPath: iconUrl // Web-accessible icon path or null
          };
        });
        
        console.log('🔍 JURY: Final devices list:', devicesList);
        
        // Fallback: if no disciplines found, show all disciplines (same as Score Capture fallback)
        if (devicesList.length === 0) {
          console.log('🔍 JURY: No filtered disciplines found, using fallback to all unique disciplines');
          const fallbackDevices = uniqueDisciplines.map((discipline: any) => {
            const iconUrl = getDisciplineIcon(discipline.var_name, discipline.var_icon);
            return {
              id: discipline.int_disziplinid,
              name: discipline.var_name,
              disciplineId: discipline.int_disziplinid,
              icon: iconUrl ? '' : getFallbackDeviceEmoji(discipline.var_name), // Emoji if no icon URL
              iconPath: iconUrl // Web-accessible icon path or null
            };
          });
          setDevices(fallbackDevices);
        } else {
          setDevices(devicesList);
        }
        
        setCompetitions(competitionsResponse || []);
      } catch (error) {
        console.error('❌ JURY: Error fetching devices:', error);
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
        
        // Use participants from the selected squad and DEDUPLICATE immediately
        const rawSquadParticipants = selectedSquad.participants || [];
        
        console.log('Raw squad participants (may contain duplicates):', rawSquadParticipants.length);
        
        // Deduplicate based on participant ID BEFORE processing
        const uniqueSquadParticipants = rawSquadParticipants.reduce((acc: any[], current: any) => {
          const exists = acc.find(p => p.id === current.id);
          if (!exists) {
            acc.push(current);
          } else {
            console.log(`⚠️ JURY: Skipping duplicate participant from squad: ${current.firstname} ${current.lastname} (ID: ${current.id})`);
          }
          return acc;
        }, []);
        
        console.log('Unique squad participants (after dedup):', uniqueSquadParticipants.length);
        
        // Format participants for scoring and fetch existing scores (same logic as Score Capture)
        const formattedParticipantsPromises = uniqueSquadParticipants.map(async (participant: any, index: number) => {
          // Fetch existing scores for this participant and discipline using Score Capture's approach
          let existingScore = null;
          try {
            console.log(`🔍 JURY: Checking existing scores for participant ${participant.id} and discipline ${selectedDevice?.disciplineId}`);
            
            // Use the same scores API as Score Capture
            const scoresResponse = await fetch(`${API_BASE_URL}/scores?eventId=${selectedEvent}&limit=1000`);
            if (scoresResponse.ok) {
              const scoresData = await scoresResponse.json();
              const scores = scoresData?.results || [];
              
              // Find score for this participant and discipline
              const existingScoreRecord = scores.find((s: any) => {
                const matchesParticipant = s.participantId === participant.id;
                const matchesDiscipline = s.disciplineId === selectedDevice?.disciplineId;
                return matchesParticipant && matchesDiscipline;
              });
              
              if (existingScoreRecord) {
                existingScore = existingScoreRecord.score;
                console.log(`✅ JURY: Found existing score for participant ${participant.id}:`, existingScore);
              } else {
                console.log(`ℹ️ JURY: No existing score found for participant ${participant.id} and discipline ${selectedDevice?.disciplineId}`);
              }
            } else {
              console.log(`❌ JURY: Scores API response not ok:`, scoresResponse.status);
            }
          } catch (error) {
            console.warn('⚠️ JURY: Could not fetch existing scores for participant:', participant.id, error);
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

  // Socket.IO Live Updates for Scores
  useEffect(() => {
    if (!selectedEvent || !selectedDevice) return;

    console.log('🔌 JURY: Setting up Socket.IO listeners for live score updates');
    const socket = getSocket();

    // Join the competition room to receive updates
    socket.emit('join-competition', selectedEvent);
    console.log(`🔌 JURY: Joined competition room: competition-${selectedEvent}`);

    // Listen for score updates (server sends 'score-updated' event)
    const handleScoreUpdate = (data: any) => {
      console.log('📡 JURY: Received score-updated:', data);
      
      // Only update if it's for our current event and discipline
      if (data.eventId === selectedEvent && data.disciplineId === selectedDevice.disciplineId) {
        console.log('✅ JURY: Score update matches current context, updating participant list');
        
        // Update the participant's score in the list
        setParticipants(prevParticipants => {
          return prevParticipants.map(participant => {
            if (participant.participantId === data.participantId) {
              console.log(`✅ JURY: Updating participant ${participant.name} with new score: ${data.score}`);
              return {
                ...participant,
                currentScore: data.score,
                status: 'completed' as const
              };
            }
            return participant;
          });
        });
      }
    };

    socket.on('score-updated', handleScoreUpdate);

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log('🔌 JURY: Cleaning up Socket.IO listeners');
      socket.emit('leave-competition', selectedEvent);
      socket.off('score-updated', handleScoreUpdate);
    };
  }, [selectedEvent, selectedDevice]);

  const currentParticipant = participants[currentParticipantIndex];

  // Update score input when current participant changes
  useEffect(() => {
    if (currentParticipant && currentParticipant.currentScore) {
      setScore(currentParticipant.currentScore.toString());
    } else {
      setScore('');
    }
  }, [currentParticipantIndex, currentParticipant]);

  const handleScoreSubmit = async () => {
    if (!currentParticipant || !score || !selectedDevice) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 JURY: Determining competition ID for score save...');
      
      // Find the correct competition ID for this discipline (same logic as Score Capture)
      let actualCompetitionId = null;
      
      // Try to find the competition that contains this discipline
      const disciplineCompetition = competitions.find(comp => 
        comp.disciplines?.some(d => d.disciplineId === selectedDevice.disciplineId)
      );
      
      if (disciplineCompetition) {
        actualCompetitionId = disciplineCompetition.id;
        console.log(`✅ JURY: Found competition ID ${actualCompetitionId} (${disciplineCompetition.name}) for discipline ${selectedDevice.disciplineId}`);
      } else {
        // Fallback: if participant has assigned competitions, use the first one
        const participant = participants.find((p: any) => p.id === currentParticipant.participantId);
        if (participant && participant.assignedCompetitions && participant.assignedCompetitions.length > 0) {
          actualCompetitionId = participant.assignedCompetitions[0];
          console.log(`✅ JURY: Using participant's first assigned competition: ${actualCompetitionId}`);
        } else {
          // Last resort: use the first available competition
          if (competitions.length > 0) {
            actualCompetitionId = competitions[0].id;
            console.log(`✅ JURY: Using first available competition as fallback: ${actualCompetitionId} (${competitions[0].name})`);
          } else {
            console.error('❌ JURY: Could not determine competition for discipline:', selectedDevice.disciplineId);
            alert('Error: Could not determine competition for this discipline. Please check that the discipline is properly assigned to a competition.');
            return;
          }
        }
      }
      
      // Use the same save-value endpoint as Score Capture
      const scoreData = {
        competitionId: actualCompetitionId,
        participantId: currentParticipant.participantId,
        disciplineId: selectedDevice.disciplineId,
        score: parseFloat(score)
      };

      console.log('🟢 JURY: Sending score data to API:', scoreData);

      const response = await fetch(`${API_BASE_URL}/scores/save-value`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ JURY: Score saved successfully:', responseData);
        
        // Update participant status and score
        const updatedParticipants = [...participants];
        if (updatedParticipants[currentParticipantIndex]) {
          updatedParticipants[currentParticipantIndex].status = 'completed';
          updatedParticipants[currentParticipantIndex].currentScore = parseFloat(score);
        }
        
        setParticipants(updatedParticipants);
        setScore('');
        
        // Optional: Show success message
        console.log('✅ Score saved! You can now navigate to the next participant or continue scoring.');
      } else {
        const errorData = await response.json();
        console.error('❌ JURY: API returned error:', errorData);
        alert(`Error saving score: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ JURY: Error submitting score:', error);
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

            {/* Filter Toggle */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={filterToday}
                    onChange={(e) => setFilterToday(e.target.checked)}
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
                onChange={(e) => setSelectedEvent(e.target.value ? parseInt(e.target.value) : null)}
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
                    <div className="flex justify-center mb-4">
                      {device.iconPath ? (
                        <img 
                          src={device.iconPath}
                          alt={`${device.name} icon`}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const emoji = getFallbackDeviceEmoji(device.name);
                              parent.innerHTML = `<div class="text-4xl">${emoji}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div className="text-4xl">{device.icon || getFallbackDeviceEmoji(device.name)}</div>
                      )}
                    </div>
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

  // Scoring interface - NEW SPLIT-VIEW LAYOUT
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header - Minimal in Landscape Mode */}
      <div className="bg-blue-600 text-white p-2 sm:p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => setStep('device')}
              className="text-blue-100 hover:text-white text-sm sm:text-base"
            >
              ← Zurück
            </button>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {selectedDevice?.iconPath ? (
                <img 
                  src={selectedDevice.iconPath}
                  alt={`${selectedDevice.name} icon`}
                  className="w-6 h-6 sm:w-10 sm:h-10 object-contain bg-white bg-opacity-20 rounded-lg p-1"
                  onError={(e) => {
                    // Fallback to emoji if image fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && selectedDevice?.name) {
                      const emoji = getFallbackDeviceEmoji(selectedDevice.name);
                      parent.innerHTML = `<div class="text-xl sm:text-3xl">${emoji}</div>`;
                    }
                  }}
                />
              ) : selectedDevice?.icon ? (
                <div className="text-xl sm:text-3xl">{selectedDevice.icon}</div>
              ) : selectedDevice?.name && (
                <div className="text-xl sm:text-3xl">{getFallbackDeviceEmoji(selectedDevice.name)}</div>
              )}
              <div>
                <h1 className="text-sm sm:text-xl font-bold">{selectedDevice?.name}</h1>
                <p className="text-xs sm:text-base text-blue-100">{selectedSquad?.name}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleDeviceComplete}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 sm:px-4 sm:py-2 rounded text-white font-medium text-xs sm:text-base"
          >
            Gerät abschließen
          </button>
        </div>
      </div>

      {/* Main Content: Split View - Mobile Optimized (Landscape) */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Left Sidebar: Participants List - ONLY THIS SCROLLS */}
        <div className="w-full sm:w-2/5 lg:w-1/3 bg-white border-b sm:border-b-0 sm:border-r border-gray-300 flex flex-col">
          <div className="p-2 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Teilnehmer ({participants.length})</h2>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedDevice?.name} - {selectedSquad?.name}</p>
            
            {/* Progress Bar */}
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Fortschritt</span>
                <span className="text-xs text-gray-500">
                  {participants.filter(p => p.currentScore && p.currentScore > 0).length} / {participants.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: participants.length 
                      ? `${(participants.filter(p => p.currentScore && p.currentScore > 0).length / participants.length) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Scrollable Participants List ONLY - Touch Optimized */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {participants.length === 0 ? (
              <div className="p-4 sm:p-8 text-center text-gray-500">
                <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">Keine Teilnehmer gefunden</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {participants.map((participant, index) => (
                  <div 
                    key={participant.id} 
                    className={`p-3 sm:p-4 cursor-pointer transition-all active:scale-98 ${
                      index === currentParticipantIndex 
                        ? 'bg-blue-50 border-l-4 border-blue-600 shadow-sm' 
                        : participant.currentScore && participant.currentScore > 0
                        ? 'bg-green-50 hover:bg-green-100 active:bg-green-200' 
                        : 'hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    onClick={() => {
                      setCurrentParticipantIndex(index);
                      setScore(participant.currentScore?.toString() || '');
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold flex-shrink-0 ${
                            index === currentParticipantIndex 
                              ? 'bg-blue-600 text-white' 
                              : participant.currentScore && participant.currentScore > 0
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {participant.startNumber}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm sm:text-base font-semibold truncate ${
                              index === currentParticipantIndex ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {participant.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{participant.clubName}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        {participant.currentScore && participant.currentScore > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-base sm:text-lg font-bold text-green-700">
                              {participant.currentScore.toFixed(2)}
                            </span>
                            <span className="text-xs text-green-600">✓</span>
                          </div>
                        ) : index === currentParticipantIndex ? (
                          <span className="text-xs sm:text-sm font-medium text-blue-600">→</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Score Input - FIXED, NO SCROLL */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4">
          {currentParticipant ? (
            <div className="w-full max-w-xl h-full flex items-center justify-center">
              {/* Compact Participant Card - Fits in Viewport */}
              <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-5">
                <div className="text-center mb-2 sm:mb-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white text-lg sm:text-xl font-bold mb-1">
                    {currentParticipant.startNumber}
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-0.5">{currentParticipant.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-600">{currentParticipant.club}</p>
                </div>

                {/* Score Input Section - Compact */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 text-center">
                      Wertung eingeben
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="0.0"
                      className="w-full text-3xl sm:text-4xl text-center p-2 sm:p-3 border-3 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-bold text-blue-900 bg-blue-50"
                      autoFocus
                      inputMode="decimal"
                    />
                  </div>

                  {/* Action Buttons - Compact */}
                  <div className="flex flex-col space-y-1.5">
                    <button
                      onClick={handleScoreSubmit}
                      disabled={!score || loading}
                      className="w-full bg-green-600 text-white py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-lg font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all transform active:scale-98"
                    >
                      {loading ? '💾 Speichert...' : '✓ Bewertung speichern'}
                    </button>

                    {/* Navigation Buttons - Compact */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          if (currentParticipantIndex > 0) {
                            setCurrentParticipantIndex(currentParticipantIndex - 1);
                            const prevParticipant = participants[currentParticipantIndex - 1];
                            setScore(prevParticipant.currentScore?.toString() || '');
                          }
                        }}
                        disabled={currentParticipantIndex <= 0}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs"
                      >
                        ← Vorheriger
                      </button>
                      <button
                        onClick={() => {
                          if (currentParticipantIndex < participants.length - 1) {
                            setCurrentParticipantIndex(currentParticipantIndex + 1);
                            const nextPart = participants[currentParticipantIndex + 1];
                            setScore(nextPart.currentScore?.toString() || '');
                          }
                        }}
                        disabled={currentParticipantIndex >= participants.length - 1}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs"
                      >
                        Nächster →
                      </button>
                    </div>

                    {/* Context Info - Integrated */}
                    <div className="text-center text-xs text-gray-500 pt-0.5">
                      <p>Teilnehmer {currentParticipantIndex + 1} von {participants.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-xl">Wählen Sie einen Teilnehmer aus der Liste</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JuryPortal;
