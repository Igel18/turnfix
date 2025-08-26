import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Trophy,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiDelete } from '../utils/api';

// Interface for participant data
interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female';
  birthYear: number;
  age: number;
  isInEvent: boolean;
  assignedCompetitions: number[];
  registrationDate?: string;
}

// Interface for competition data
interface Competition {
  id: number;
  name: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  eventId: number;
  participantCount: number;
  maxParticipants?: number;
  registrationDeadline?: string;
}

const EventParticipants: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // State for participants and competitions
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  
  // UI state
  const [selectedTab, setSelectedTab] = useState<'add-remove' | 'assign'>('add-remove');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');

  // Load initial data
  useEffect(() => {
    if (eventId) {
      loadParticipants();
      loadCompetitions();
    }
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      const data = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=true`)
      setAllParticipants(data.participants || []);
      console.log(`Loaded ${data.participants?.length || 0} participants from API`);
    } catch (error) {
      console.error('Error loading participants:', error);
      // Fallback to mock data
      const mockParticipants: Participant[] = [
        // Participants already in event
        {
          id: 1,
          firstname: 'Max',
          lastname: 'Mustermann',
          club: 'TSV München',
          clubId: 1,
          gender: 'male',
          birthYear: 2008,
          age: 16,
          isInEvent: true,
          assignedCompetitions: [1, 3],
          registrationDate: '2023-10-15'
        },
        {
          id: 2,
          firstname: 'Anna',
          lastname: 'Weber',
          club: 'SV Hamburg',
          clubId: 2,
          gender: 'female',
          birthYear: 2009,
          age: 15,
          isInEvent: true,
          assignedCompetitions: [2],
          registrationDate: '2023-10-16'
        },
        // Available participants not in event
        {
          id: 3,
          firstname: 'Tom',
          lastname: 'Schmidt',
          club: 'TV Berlin',
          clubId: 3,
          gender: 'male',
          birthYear: 2007,
          age: 17,
          isInEvent: false,
          assignedCompetitions: []
        },
        {
          id: 4,
          firstname: 'Lisa',
          lastname: 'Klein',
          club: 'TG Frankfurt',
          clubId: 4,
          gender: 'female',
          birthYear: 2010,
          age: 14,
          isInEvent: false,
          assignedCompetitions: []
        }
      ];
      setAllParticipants(mockParticipants);
      console.log('Using mock participant data due to API error');
    }
  };

  const loadCompetitions = async () => {
    try {
      let url = '/competitions';
      if (eventId) {
        url += `?eventId=${eventId}`;
      }
      
      const data = await apiGet(url)
      setCompetitions(data);
    } catch (error) {
      console.error('Error loading competitions:', error);
      // Fallback mock data
      const mockCompetitions: Competition[] = [
        {
          id: 1,
          name: 'Men 16-18 Floor Exercise',
          gender: 'männlich',
          ageFrom: 16,
          ageTo: 18,
          eventId: parseInt(eventId || '1'),
          participantCount: 12,
          maxParticipants: 20
        },
        {
          id: 2,
          name: 'Women 14-16 Uneven Bars',
          gender: 'weiblich',
          ageFrom: 14,
          ageTo: 16,
          eventId: parseInt(eventId || '1'),
          participantCount: 8,
          maxParticipants: 15
        }
      ];
      setCompetitions(mockCompetitions);
    }
  };

  const addParticipantToEvent = async (participantId: number) => {
    try {
      await apiPost('/event-participants/add', {
        eventId: parseInt(eventId!),
        participantId: participantId
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
              ? { ...p, isInEvent: true, registrationDate: new Date().toISOString().split('T')[0] }
              : p
          )
        );
        console.log(`Successfully added participant ${participantId} to event`);
    } catch (error) {
      console.error('Error adding participant to event:', error);
      alert('Failed to add participant to event');
    }
  };

  const removeParticipantFromEvent = async (participantId: number) => {
    if (!confirm('Remove this participant from the event? They will be unassigned from all competitions.')) {
      return;
    }
    
    try {
      await apiDelete(`/event-participants/remove?eventId=${eventId}&participantId=${participantId}`)

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
            ? { ...p, isInEvent: false, assignedCompetitions: [], registrationDate: undefined }
              : p
          )
        );
        console.log(`Successfully removed participant ${participantId} from event`);
    } catch (error) {
      console.error('Error removing participant from event:', error);
      alert('Failed to remove participant from event');
    }
  };

  const assignParticipantToCompetition = async (participantId: number, competitionId: number) => {
    try {
      await apiPost('/event-participants/assign', {
        participantId: participantId,
        competitionId: competitionId
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId && !p.assignedCompetitions.includes(competitionId)
            ? { ...p, assignedCompetitions: [...p.assignedCompetitions, competitionId] }
            : p
        )
      );
      console.log(`Successfully assigned participant ${participantId} to competition ${competitionId}`);
    } catch (error) {
      console.error('Error assigning participant to competition:', error);
      alert('Failed to assign participant to competition');
    }
  };

  const unassignParticipantFromCompetition = async (participantId: number, competitionId: number) => {
    try {
      await apiDelete(`/event-participants/unassign?participantId=${participantId}&competitionId=${competitionId}`)

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
              ? { ...p, assignedCompetitions: p.assignedCompetitions.filter(c => c !== competitionId) }
              : p
          )
        );
        console.log(`Successfully unassigned participant ${participantId} from competition ${competitionId}`);
    } catch (error) {
      console.error('Error unassigning participant from competition:', error);
      alert('Failed to unassign participant from competition');
    }
  };

  const isParticipantEligibleForCompetition = (participant: Participant, competition: Competition): boolean => {
    // Check age eligibility
    if (participant.age < competition.ageFrom || participant.age > competition.ageTo) {
      return false;
    }
    
    // Check gender eligibility
    if (competition.gender === 'männlich' && participant.gender !== 'male') {
      return false;
    }
    if (competition.gender === 'weiblich' && participant.gender !== 'female') {
      return false;
    }
    
    return true;
  };

  const filteredParticipants = allParticipants.filter(participant => {
    const matchesSearch = 
      participant.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = !genderFilter || participant.gender === genderFilter;
    const matchesClub = !clubFilter || participant.club.toLowerCase().includes(clubFilter.toLowerCase());
    const matchesAge = !ageFilter || participant.age.toString() === ageFilter;
    
    return matchesSearch && matchesGender && matchesClub && matchesAge;
  });

  const eventParticipants = filteredParticipants.filter(p => p.isInEvent);
  const availableParticipants = filteredParticipants.filter(p => !p.isInEvent);

  const getParticipantStateInfo = (): StateInfo[] => [
    {
      value: 'add-remove',
      label: 'Event Registration',
      count: allParticipants.filter(p => p.isInEvent).length,
      color: 'text-blue-600'
    },
    {
      value: 'assign',
      label: 'Competition Assignment',
      count: competitions.length,
      color: 'text-green-600'
    }
  ];

  const getFilterOptions = () => [
    {
      label: 'Gender',
      value: 'gender',
      options: [
        { value: '', label: 'All Genders' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
      ],
      selectedValue: genderFilter,
      onChange: setGenderFilter
    }
  ];

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Event Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an event to manage participants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Event Participants"
        description="Add, remove and assign participants to competitions within the selected event"
        icon={Users}
        stateInfo={getParticipantStateInfo()}
        selectedState={selectedTab}
        onStateChange={(state) => setSelectedTab(state as 'add-remove' | 'assign')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setSearchTerm('');
          setGenderFilter('');
          setClubFilter('');
          setAgeFilter('');
        }}
        onExportCSV={() => console.log('Export CSV clicked')}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={selectedTab === 'add-remove' ? eventParticipants.length : competitions.length}
      />

      {/* Selected Context */}
      {eventId && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mb-4 rounded">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Selected Context:</strong>
              {eventId && ` Event: ${selectedEvent?.var_eventname || `Event ID ${eventId}`}`}
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        {selectedTab === 'add-remove' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Participants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Available Participants ({availableParticipants.length})
                </h3>
              </div>
              <div className="bg-white rounded-lg border">
                <div className="max-h-96 overflow-y-auto">
                  {availableParticipants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-8 w-8 mb-2" />
                      <p>No available participants found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {availableParticipants.map(participant => (
                        <div key={participant.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {participant.firstname} {participant.lastname}
                            </p>
                            <p className="text-sm text-gray-500">
                              {participant.club} • {participant.gender} • Age {participant.age}
                            </p>
                          </div>
                          <button
                            onClick={() => addParticipantToEvent(participant.id)}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                            title="Add to event"
                          >
                            <UserPlus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Event Participants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Participants ({eventParticipants.length})
                </h3>
              </div>
              <div className="bg-white rounded-lg border">
                <div className="max-h-96 overflow-y-auto">
                  {eventParticipants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-8 w-8 mb-2" />
                      <p>No participants registered for this event</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {eventParticipants.map(participant => (
                        <div key={participant.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {participant.firstname} {participant.lastname}
                              </p>
                              <p className="text-sm text-gray-500">
                                {participant.club} • {participant.gender} • Age {participant.age}
                              </p>
                              <p className="text-xs text-gray-400">
                                Registered: {participant.registrationDate}
                              </p>
                            </div>
                            <button
                              onClick={() => removeParticipantFromEvent(participant.id)}
                              className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                              title="Remove from event"
                            >
                              <UserMinus className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                          {participant.assignedCompetitions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {participant.assignedCompetitions.map(compId => {
                                const comp = competitions.find(c => c.id === compId);
                                return comp ? (
                                  <span key={compId} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                    {comp.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'assign' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Competitions List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Competitions ({competitions.length})
              </h3>
              <div className="space-y-3">
                {competitions.map(competition => (
                  <div
                    key={competition.id}
                    className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedCompetition?.id === competition.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCompetition(competition)}
                  >
                    <h4 className="font-medium text-gray-900">{competition.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {competition.gender} • Ages {competition.ageFrom}-{competition.ageTo}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {competition.participantCount} / {competition.maxParticipants || '∞'} participants
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Participants for Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event Participants ({eventParticipants.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {eventParticipants.map(participant => {
                  const isEligible = selectedCompetition ? 
                    isParticipantEligibleForCompetition(participant, selectedCompetition) : false;
                  const isAssigned = selectedCompetition ? 
                    participant.assignedCompetitions.includes(selectedCompetition.id) : false;
                  
                  return (
                    <div
                      key={participant.id}
                      className={`bg-white rounded-lg border p-3 flex items-center justify-between ${
                        !isEligible && selectedCompetition ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.firstname} {participant.lastname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {participant.club} • Age {participant.age}
                        </p>
                        {!isEligible && selectedCompetition && (
                          <p className="text-xs text-red-500">Not eligible for this competition</p>
                        )}
                      </div>
                      {selectedCompetition && isEligible && (
                        <div className="flex gap-1">
                          {!isAssigned ? (
                            <button
                              onClick={() => assignParticipantToCompetition(participant.id, selectedCompetition.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Assign to competition"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => unassignParticipantFromCompetition(participant.id, selectedCompetition.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Unassign from competition"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competition Details */}
            <div>
              {selectedCompetition ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedCompetition.name}
                  </h3>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Competition Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Gender:</span> {selectedCompetition.gender}</p>
                        <p><span className="font-medium">Age Range:</span> {selectedCompetition.ageFrom}-{selectedCompetition.ageTo} years</p>
                        <p><span className="font-medium">Participants:</span> {selectedCompetition.participantCount} / {selectedCompetition.maxParticipants || '∞'}</p>
                        {selectedCompetition.registrationDeadline && (
                          <p><span className="font-medium">Deadline:</span> {selectedCompetition.registrationDeadline}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Assigned Participants
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {eventParticipants
                          .filter(p => p.assignedCompetitions.includes(selectedCompetition.id))
                          .map(participant => (
                            <div key={participant.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {participant.firstname} {participant.lastname}
                                </p>
                                <p className="text-xs text-gray-500">{participant.club}</p>
                              </div>
                              <Trophy className="w-4 h-4 text-green-600" />
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Competition Selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select a competition to manage participant assignments.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventParticipants;
