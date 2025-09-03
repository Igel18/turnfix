import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Users, 
  Trash2,
  Trophy,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft
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
  gender: string;
  birthYear: number;
  squadId?: number;
  squadName?: string;
  competitions?: { id: number; name: string }[];
  competitionCount?: number;
  competitionNames?: string;
}

// Interface for squad data
interface Squad {
  id: number | string;
  name: string;
  eventId: number;
  participantCount: number;
  competitions: string[];
  participants: Participant[];
  isVirtual?: boolean;
  createdAt?: string;
  hints?: {
    storage?: string;
    status?: string;
    warning?: string;
  };
}

const SquadManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // State for squads and participants
  const [squads, setSquads] = useState<Squad[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  
  // UI state
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for creating squads
  const [newSquadName, setNewSquadName] = useState('');

  // Load initial data
  useEffect(() => {
    if (eventId) {
      loadSquads();
      loadAvailableParticipants();
    }
  }, [eventId]);

// Force reload functions that bypass cache
const forceLoadSquads = async () => {
  try {
    // Add cache busting timestamp and force fresh data
    const timestamp = Date.now();
    const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}&_force=true`);
    const newSquads = data.squads || [];
    console.log('🔄 Force loading squads:', newSquads.length, 'squads loaded');
    setSquads(newSquads);
    
    // Update selected squad with fresh data if one is currently selected
    if (selectedSquad) {
      const updatedSquad = newSquads.find((s: Squad) => 
        s.id === selectedSquad.id || s.name === selectedSquad.name
      );
      if (updatedSquad) {
        console.log('📝 Updating selected squad with fresh data');
        setSelectedSquad(updatedSquad);
      } else {
        // Squad no longer exists (might have been deleted)
        console.log('❌ Selected squad no longer exists, clearing selection');
        setSelectedSquad(null);
      }
    }
  } catch (error) {
    console.error('Error force loading squads:', error);
    setSquads([]);
  }
};

const forceLoadAvailableParticipants = async () => {
  try {
    // Add cache busting timestamp and force fresh data
    const timestamp = Date.now();
    const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&_t=${timestamp}&_force=true`);
    const newParticipants = data.participants || [];
    console.log('🔄 Force loading available participants:', newParticipants.length, 'participants loaded');
    setAvailableParticipants(newParticipants);
  } catch (error) {
    console.error('Error force loading available participants:', error);
    setAvailableParticipants([]);
  }
};

  const loadSquads = async () => {
    try {
      // Add cache busting timestamp
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}`);
      const newSquads = data.squads || [];
      console.log('🔄 Loading squads:', newSquads.length, 'squads loaded');
      setSquads(newSquads);
      
      // Update selected squad with fresh data if one is currently selected
      if (selectedSquad) {
        const updatedSquad = newSquads.find((s: Squad) => 
          s.id === selectedSquad.id || s.name === selectedSquad.name
        );
        if (updatedSquad) {
          console.log('📝 Updating selected squad with fresh data');
          setSelectedSquad(updatedSquad);
        } else {
          // Squad no longer exists (might have been deleted)
          console.log('❌ Selected squad no longer exists, clearing selection');
          setSelectedSquad(null);
        }
      }
    } catch (error) {
      console.error('Error loading squads:', error);
      setSquads([]);
    }
  };

  const loadAvailableParticipants = async () => {
    try {
      // Add cache busting timestamp
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&_t=${timestamp}`);
      const newParticipants = data.participants || [];
      console.log('🔄 Loading available participants:', newParticipants.length, 'participants loaded');
      setAvailableParticipants(newParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  const createSquad = async () => {
    if (!newSquadName.trim() || !eventId) return;
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/create', {
        eventId: parseInt(eventId),
        name: newSquadName
      });
      
      // Show enhanced success message with hints
      let message = `Squad "${newSquadName}" created successfully!`;
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Hints:`;
        if (response.hints.storage) message += `\n• Storage: ${response.hints.storage}`;
        if (response.hints.nextStep) message += `\n• Next: ${response.hints.nextStep}`;
        if (response.hints.deletion) message += `\n• Note: ${response.hints.deletion}`;
      }
      
      alert(message);
      
      setNewSquadName('');
      setIsCreateModalOpen(false);
      
      // Reload data to refresh the view
      console.log('🔄 Force reloading data after squad creation...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after squad creation');
    } catch (error) {
      console.error('Error creating squad:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to create squad. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSquad = async (squadId: number | string) => {
    const squadName = typeof squadId === 'string' ? squadId : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName) {
      console.error('Squad not found');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this squad? All participants will be unassigned.')) return;
    
    try {
      await apiDelete(`/squad-management/delete?squadName=${encodeURIComponent(squadName)}&eventId=${eventId}`);
      
      // Reload both squads and available participants
      console.log('🔄 Force reloading data after squad deletion...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after squad deletion');
      
      if (selectedSquad && (selectedSquad.id === squadId || selectedSquad.name === squadName)) {
        setSelectedSquad(null);
      }
    } catch (error) {
      console.error('Error deleting squad:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete squad');
    }
  };

  const assignParticipantToSquad = async (participant: Participant, squadId: number | string) => {
    const squadName = typeof squadId === 'string' ? squadId : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName || !eventId) {
      console.error('Squad name or event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/assign', {
        participantId: participant.id,
        squadName: squadName,
        eventId: parseInt(eventId)
      });
      
      // Show enhanced feedback with hints
      let message = response.message || 'Participant assigned successfully';
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Storage Info:`;
        if (response.hints.storage) message += `\n• ${response.hints.storage}`;
        if (response.hints.status) message += `\n• ${response.hints.status}`;
        if (response.hints.reason) message += `\n• ${response.hints.reason}`;
      }
      
      // Show toast notification (can be replaced with a proper toast component)
      console.log('✅ Assignment completed:', message);
      
      // Reload both squads and available participants
      // loadSquads() will automatically update selectedSquad with fresh data
      console.log('🔄 Force reloading data after participant assignment...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after participant assignment');
    } catch (error) {
      console.error('Error assigning participant to squad:', error);
      alert(error instanceof Error ? error.message : 'Failed to assign participant to squad');
    } finally {
      setIsLoading(false);
    }
  };

  const removeParticipantFromSquad = async (participantId: number) => {
    if (!eventId) {
      console.error('Event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      await apiDelete(`/squad-management/unassign?participantId=${participantId}&eventId=${eventId}`);
      
      // Reload both squads and available participants
      // loadSquads() will automatically update selectedSquad with fresh data
      console.log('🔄 Force reloading data after participant removal...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after participant removal');
    } catch (error) {
      console.error('Error removing participant from squad:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove participant from squad');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredParticipants = availableParticipants.filter(participant => {
    const matchesSearch = 
      participant.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.competitionNames && participant.competitionNames.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGender = !genderFilter || participant.gender === genderFilter;
    
    const matchesCompetition = !competitionFilter || 
      (participant.competitions && participant.competitions.some(comp => 
        comp.name.toLowerCase().includes(competitionFilter.toLowerCase())
      ));
    
    return matchesSearch && matchesGender && matchesCompetition;
  });

  const getSquadStateInfo = (): StateInfo[] => [
    {
      value: '',
      label: 'All Squads',
      count: squads.length,
      color: 'text-gray-600'
    },
    {
      value: 'participants',
      label: 'Available Participants',
      count: availableParticipants.length,
      color: 'text-blue-600'
    }
  ];

  const getFilterOptions = () => {
    // Get unique competitions from available participants
    const allCompetitions = availableParticipants
      .flatMap(p => p.competitions || [])
      .filter((comp, index, arr) => arr.findIndex(c => c.id === comp.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));

    return [
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
      },
      {
        label: 'Competition',
        value: 'competition',
        options: [
          { value: '', label: 'All Competitions' },
          ...allCompetitions.map(comp => ({
            value: comp.name,
            label: `${comp.name} (ID: ${comp.id})`
          }))
        ],
        selectedValue: competitionFilter,
        onChange: setCompetitionFilter
      }
    ];
  };

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Event Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an event to manage squads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Processing...</span>
          </div>
        </div>
      )}

      <UnifiedHeader
        title="Squad Management"
        description="Create squads and assign participants to competitions"
        icon={Users}
        stateInfo={getSquadStateInfo()}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants, clubs, competitions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setSearchTerm('');
          setGenderFilter('');
          setCompetitionFilter('');
        }}
        onExportCSV={() => console.log('Export CSV clicked')}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'New Squad',
          icon: Plus,
          onClick: () => setIsCreateModalOpen(true)
        }}
        totalCount={squads.reduce((sum, squad) => sum + squad.participantCount, 0)}
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

      {/* Virtual Squad Information */}
      {squads.some(s => s.isVirtual) && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mx-6 mb-4 rounded">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <div className="text-orange-800 font-medium mb-1">Virtual Squad Information</div>
              <div className="text-orange-700 space-y-1">
                <p>• <strong>Virtual squads</strong> are temporarily stored in memory</p>
                <p>• They become <strong>permanent</strong> when first participant is assigned</p>
                <p>• Virtual squads will be <strong>lost on server restart</strong> if empty</p>
                <p>• Look for the orange "Virtual" badge to identify them</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Squads List */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Squads ({squads.length})
            </h3>
            <div className="space-y-3">
              {squads.map(squad => (
                <div
                  key={squad.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedSquad?.id === squad.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                  } ${squad.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}
                  onClick={() => setSelectedSquad(squad)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{squad.name}</h4>
                        {squad.isVirtual && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Virtual
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {squad.participantCount} participants
                      </p>
                      {squad.isVirtual && squad.hints && (
                        <p className="text-xs text-orange-600 mt-1">
                          💾 {squad.hints.storage}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSquad(squad.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete squad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {squad.competitions.slice(0, 2).map((comp, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {comp}
                        </span>
                      ))}
                      {squad.competitions.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{squad.competitions.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Participants */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Available Participants ({filteredParticipants.length})
              </h3>
              {!selectedSquad && filteredParticipants.length > 0 && (
                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  Select a squad to assign
                </div>
              )}
            </div>
            {/* Information about virtual squads */}
            {filteredParticipants.length > 0 && squads.some(s => s.isVirtual) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">Virtual Squad Assignment</p>
                    <p>Participants assigned to virtual squads will automatically save the squad to database.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredParticipants.map(participant => (
                <div
                  key={participant.id}
                  className="bg-white rounded-lg border p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {participant.firstname} {participant.lastname}
                        </p>
                        {selectedSquad && (
                          <button
                            onClick={() => assignParticipantToSquad(participant, selectedSquad.id)}
                            className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Assign to selected squad"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        {participant.club} • {participant.gender} • {new Date().getFullYear() - participant.birthYear} years
                      </p>
                      {participant.competitions && participant.competitions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">
                            Competitions ({participant.competitionCount}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {participant.competitions.slice(0, 3).map((comp, idx) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                title={`Competition ID: ${comp.id}`}
                              >
                                {comp.name}
                              </span>
                            ))}
                            {participant.competitions.length > 3 && (
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                title={participant.competitionNames}
                              >
                                +{participant.competitions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Squad Details */}
          <div className="lg:col-span-1">
            {selectedSquad ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedSquad.name} Details
                </h3>
                <div className="bg-white rounded-lg border p-4">
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Squad Participants ({selectedSquad.participants.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedSquad.participants.map(participant => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {participant.firstname} {participant.lastname}
                            </p>
                            <p className="text-xs text-gray-500">
                              {participant.club}
                            </p>
                          </div>
                          <button
                            onClick={() => removeParticipantFromSquad(participant.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove from squad"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Assigned Competitions
                    </h4>
                    <div className="space-y-1">
                      {selectedSquad.competitions.map((comp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span className="text-sm text-gray-900">{comp}</span>
                          <Trophy className="w-4 h-4 text-blue-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Squad Selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a squad to view and manage its participants.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Squad Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Squad</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Squad Name *
              </label>
              <input
                type="text"
                value={newSquadName}
                onChange={(e) => setNewSquadName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter squad name..."
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-1">
                The squad will appear in the list immediately and be ready for participant assignment.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createSquad}
                disabled={!newSquadName.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                Create Squad
              </button>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadManagement;
