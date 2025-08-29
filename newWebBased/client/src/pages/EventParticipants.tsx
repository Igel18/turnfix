import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Trophy,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Edit
} from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api';

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
  squad_name?: string;
  startet_nicht: boolean;
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
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  
  // UI state
  const [selectedTab, setSelectedTab] = useState<'participants' | 'assign'>('participants');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSearchTerm, setAddModalSearchTerm] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null);

  useEffect(() => {
    if (eventId) {
      loadParticipants();
      loadAvailableParticipants();
      loadCompetitions();
    }
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      const data = await apiGet(`/event-participants?eventId=${eventId}`)
      setAllParticipants(data.participants || []);
      console.log(`Loaded ${data.participants?.length || 0} participants from API`);
    } catch (error) {
      console.error('Error loading participants:', error);
      // Use mock data for fallback
      setAllParticipants([
        {
          id: 1,
          firstname: 'Max',
          lastname: 'Mustermann',
          club: 'TSV München',
          clubId: 1,
          gender: 'male',
          birthYear: 2008,
          age: 16,
          squad_name: 'mBlau',
          startet_nicht: false,
          isInEvent: true,
          assignedCompetitions: [1, 3],
          registrationDate: '2023-10-15'
        }
      ]);
    }
  };

  const loadAvailableParticipants = async () => {
    try {
      // Load all participants (not just event participants)
      const data = await apiGet('/participants');
      console.log('Available participants data:', data);
      
      let participants = [];
      // Handle different response structures
      if (Array.isArray(data)) {
        participants = data;
      } else if (data && Array.isArray(data.participants)) {
        participants = data.participants;
      } else {
        console.warn('Unexpected participants data structure:', data);
        setAvailableParticipants([]);
        return;
      }

      // Normalize the participant data structure
      const normalizedParticipants = participants.map((p: any) => ({
        id: p.id || p.int_teilnehmerid,
        firstname: p.firstname || p.var_vorname,
        lastname: p.lastname || p.var_nachname, 
        club: p.club || p.verein_name,
        clubId: p.clubId || p.int_vereineid,
        gender: p.gender || p.geschlecht_name,
        age: p.age,
        birthYear: p.birthYear || (p.dat_geburtstag ? new Date(p.dat_geburtstag).getFullYear() : null),
        squad_name: p.squad_name,
        startet_nicht: p.startet_nicht || false,
        isInEvent: p.isInEvent || false,
        assignedCompetitions: p.assignedCompetitions || [],
        registrationDate: p.registrationDate
      }));

      setAvailableParticipants(normalizedParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
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

  const updateParticipantStatus = async (participantId: number, startetNicht: boolean) => {
    try {
      await apiPut('/event-participants/update-status', {
        participantId,
        eventId: parseInt(eventId!),
        startetNicht
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
            ? { ...p, startet_nicht: startetNicht }
            : p
        )
      );
      console.log(`Successfully updated participant ${participantId} status to startet_nicht: ${startetNicht}`);
    } catch (error) {
      console.error('Error updating participant status:', error);
      alert('Failed to update participant status');
    }
  };

  const addParticipantToEvent = async (participantId: number) => {
    try {
      await apiPost('/event-participants/add', {
        eventId: parseInt(eventId!),
        participantId: participantId
      });

      // Reload participants to get updated list
      await loadParticipants();
      console.log(`Successfully added participant ${participantId} to event`);
      setShowAddModal(false);
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

  const filteredAvailableParticipants = Array.isArray(availableParticipants) ? availableParticipants.filter(participant => {
    // Ensure participant has required properties
    if (!participant || typeof participant !== 'object') return false;
    
    const firstname = participant.firstname || '';
    const lastname = participant.lastname || '';
    const club = participant.club || '';
    
    const matchesSearch = 
      firstname.toLowerCase().includes(addModalSearchTerm.toLowerCase()) ||
      lastname.toLowerCase().includes(addModalSearchTerm.toLowerCase()) ||
      club.toLowerCase().includes(addModalSearchTerm.toLowerCase());
    
    return matchesSearch;
  }) : [];

  const getParticipantStateInfo = (): StateInfo[] => [
    {
      value: 'participants',
      label: 'Event Participants',
      count: filteredParticipants.length,
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
        onStateChange={(state) => setSelectedTab(state as 'participants' | 'assign')}
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
        totalCount={selectedTab === 'participants' ? filteredParticipants.length : competitions.length}
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
        {selectedTab === 'participants' && (
          <div className="space-y-6">
            {/* Event Participants Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Participants ({filteredParticipants.length})
                </h3>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Participant
                </button>
              </div>
              
              <div className="bg-white rounded-lg border">
                <div className="overflow-y-auto">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-medium mb-2">No participants in this event</p>
                      <p className="text-sm">Click "Add Participant" to start adding participants to this event.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Participant
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Club
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Age/Gender
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Squad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Competitions
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredParticipants.map(participant => (
                            <tr key={participant.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {participant.firstname} {participant.lastname}
                                </div>
                                <div className="text-sm text-gray-500">
                                  ID: {participant.id}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.club}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.age} • {participant.gender === 'male' ? 'Male' : 'Female'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.squad_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => updateParticipantStatus(participant.id, !participant.startet_nicht)}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    participant.startet_nicht
                                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  {participant.startet_nicht ? 'Not Starting' : 'Participating'}
                                </button>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.assignedCompetitions.length} competitions
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setEditingParticipant(editingParticipant === participant.id ? null : participant.id)}
                                    className="text-blue-600 hover:text-blue-900 p-1"
                                    title="Edit participant"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => removeParticipantFromEvent(participant.id)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                    title="Remove from event"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                Event Participants ({filteredParticipants.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredParticipants.map(participant => {
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
                        {filteredParticipants
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

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Participant to Event</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search Field */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search participants by name, club..."
                value={addModalSearchTerm}
                onChange={(e) => setAddModalSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Available Participants List */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredAvailableParticipants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p>No available participants found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAvailableParticipants.map(participant => (
                    <div key={participant.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.firstname} {participant.lastname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {participant.club} • {participant.gender} • Age {participant.age}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          addParticipantToEvent(participant.id);
                          setShowAddModal(false);
                        }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
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
      )}
    </div>
  );
};

export default EventParticipants;
