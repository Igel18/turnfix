import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Trophy,
  Clock,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

// Interface for discipline data from API
interface Discipline {
  int_disziplinid: number;
  var_disziplinname: string;
  var_disziplinkategorie: string;
  male_allowed: boolean;
  female_allowed: boolean;
  altersklasse_von: number;
  altersklasse_bis: number;
}

// Interface for competition display
interface Competition {
  id: number;
  name: string;
  description: string;
  date: string;
  location: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: number[] | Discipline[];
  maxParticipants?: number;
  registrationDeadline?: string;
  organizer?: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  createdAt: string;
}

// Interface for form data
interface CompetitionFormData {
  name: string;
  description: string;
  date: string;
  location: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: number[];
  maxParticipants: number | '';
  registrationDeadline: string;
  organizer: string;
}

const Competitions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // State for competitions list and UI
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // State for disciplines and form data
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [ageGroups, setAgeGroups] = useState<{ value: number; label: string }[]>([]);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  
  const [formData, setFormData] = useState<CompetitionFormData>({
    name: '',
    description: '',
    date: '',
    location: '',
    gender: 'gemischt',
    ageFrom: 6,
    ageTo: 18,
    disciplines: [],
    maxParticipants: '',
    registrationDeadline: '',
    organizer: ''
  });

  // Filter disciplines based on selected gender
  useEffect(() => {
    if (formData.gender && disciplines.length > 0) {
      const filtered = disciplines.filter(discipline => {
        if (formData.gender === 'männlich') return discipline.male_allowed;
        if (formData.gender === 'weiblich') return discipline.female_allowed;
        if (formData.gender === 'gemischt') return discipline.male_allowed && discipline.female_allowed;
        return false;
      });
      setFilteredDisciplines(filtered);
    } else {
      setFilteredDisciplines(disciplines);
    }
  }, [formData.gender, disciplines]);

  // Load initial data
  useEffect(() => {
    loadDisciplines();
    loadAgeGroups();
    loadCompetitions();
  }, []);

  const loadDisciplines = async () => {
    try {
      const data = await apiGet('/disciplines/filtered');
      setDisciplines(data);
    } catch (error) {
      console.error('Error loading disciplines:', error);
    }
  };

  const loadAgeGroups = async () => {
    try {
      const data = await apiGet('/disciplines/age-groups');
      setAgeGroups(data);
    } catch (error) {
      console.error('Error loading age groups:', error);
    }
  };

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      // Build URL with eventId parameter if present
      let url = '/competitions';
      if (eventId) {
        url += `?eventId=${eventId}`;
        console.log('Loading competitions for eventId:', eventId);
      } else {
        console.log('Loading all competitions');
      }
      
      const data = await apiGet(url);
      setCompetitions(data);
      console.log(`Loaded ${data.length} competitions`);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        gender: formData.gender,
        ageFrom: formData.ageFrom,
        ageTo: formData.ageTo,
        disciplines: formData.disciplines,
        maxParticipants: typeof formData.maxParticipants === 'string' ? 
          (formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined) : 
          formData.maxParticipants,
        registrationDeadline: formData.registrationDeadline || null,
        organizer: formData.organizer,
        ...(eventId && { eventId: parseInt(eventId) })
      };

      console.log('Competition submission payload:', payload);
      console.log('Disciplines array:', payload.disciplines, 'Length:', payload.disciplines.length);

      if (editingCompetition) {
        await apiPut(`/competitions/${editingCompetition.id}`, payload);
      } else {
        await apiPost('/competitions', payload);
      }

      await loadCompetitions();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting competition:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    // Pre-populate date and location from selected event
    let eventDate = '';
    if (selectedEvent?.dat_eventstartdate) {
      // Extract date part only (YYYY-MM-DD) from datetime string
      eventDate = selectedEvent.dat_eventstartdate.split('T')[0];
    }
    const eventLocation = selectedEvent?.var_location || '';
    
    console.log('Presetting competition form with event data:', {
      eventDate,
      eventLocation,
      eventName: selectedEvent?.var_eventname
    });
    
    setFormData({
      name: '',
      description: '',
      date: eventDate,
      location: eventLocation,
      gender: 'gemischt',
      ageFrom: 6,
      ageTo: 18,
      disciplines: [],
      maxParticipants: '',
      registrationDeadline: '',
      organizer: ''
    });
    setEditingCompetition(null);
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      name: competition.name,
      description: competition.description,
      date: competition.date,
      location: competition.location,
      gender: competition.gender,
      ageFrom: competition.ageFrom,
      ageTo: competition.ageTo,
      disciplines: Array.isArray(competition.disciplines) ? 
        competition.disciplines.map(d => typeof d === 'object' ? d.int_disziplinid : d) : [],
      maxParticipants: competition.maxParticipants || '',
      registrationDeadline: competition.registrationDeadline || '',
      organizer: competition.organizer || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this competition?')) return;
    
    try {
      await apiDelete(`/competitions/${id}`);
      await loadCompetitions();
    } catch (error) {
      console.error('Error deleting competition:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800';
  };

  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         competition.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = !genderFilter || competition.gender === genderFilter;
    const matchesStatus = !statusFilter || competition.status === statusFilter;
    
    return matchesSearch && matchesGender && matchesStatus;
  });

  // Helper functions for UnifiedHeader
  const getCompetitionStateInfo = (): StateInfo[] => {
    const stateCounts = competitions.reduce((acc, comp) => {
      acc[comp.status] = (acc[comp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      {
        value: '',
        label: 'All Competitions',
        count: competitions.length,
        color: 'text-gray-600'
      },
      {
        value: 'upcoming',
        label: 'Upcoming',
        count: stateCounts.upcoming || 0,
        color: 'text-blue-600'
      },
      {
        value: 'active',
        label: 'Active',
        count: stateCounts.active || 0,
        color: 'text-green-600'
      },
      {
        value: 'completed',
        label: 'Completed',
        count: stateCounts.completed || 0,
        color: 'text-gray-600'
      }
    ];
  };

  const getFilterOptions = () => [
    {
      label: 'Gender',
      value: 'gender',
      options: [
        { value: '', label: 'All Genders' },
        { value: 'männlich', label: 'Male' },
        { value: 'weiblich', label: 'Female' },
        { value: 'gemischt', label: 'Mixed' }
      ],
      selectedValue: genderFilter,
      onChange: setGenderFilter
    }
  ];

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setGenderFilter('');
    setStatusFilter('');
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export for competitions
    console.log('Export CSV clicked');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Competition Management"
        description="Manage gymnastics competitions with disciplines and categories"
        icon={Trophy}
        stateInfo={getCompetitionStateInfo()}
        selectedState={statusFilter}
        onStateChange={setStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search competitions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'New Competition',
          icon: Plus,
          onClick: openCreateModal
        }}
        totalCount={filteredCompetitions.length}
      />

      {/* Selected Context */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mb-4 rounded">
        <div className="flex items-center">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
          <div className="text-sm text-blue-800">
            {eventId ? (
              <>
                <strong>Selected Context:</strong>
                {` Event: ${selectedEvent?.var_eventname || `Event ID ${eventId}`}`}
                {filteredCompetitions.length > 0 && (
                  <span className="ml-4">
                    <span className="font-medium">Competitions:</span> {filteredCompetitions.length}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-medium">Total Competitions:</span> {filteredCompetitions.length}
                {statusFilter !== 'all' && (
                  <span className="ml-4">
                    <span className="font-medium">Filter:</span> {statusFilter === 'active' ? 'Active' : statusFilter === 'completed' ? 'Completed' : 'Draft'}
                  </span>
                )}
                {searchTerm && (
                  <span className="ml-4">
                    <span className="font-medium">Search:</span> "{searchTerm}"
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Competitions Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading competitions...</p>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No competitions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {competitions.length === 0 ? 'Get started by creating a new competition.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((competition) => (
            <div key={competition.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{competition.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(competition.status)}`}>
                    {competition.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{competition.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(competition.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {competition.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {competition.participantCount} / {competition.maxParticipants || '∞'} participants
                  </div>
                  {competition.registrationDeadline && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Deadline: {new Date(competition.registrationDeadline).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {competition.gender}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {competition.ageFrom}-{competition.ageTo} years
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(competition)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit competition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(competition.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete competition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      }

      {/* Modal for Create/Edit Competition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Debug Info */}
                <div className="bg-gray-100 p-3 rounded text-xs">
                  <strong>Debug:</strong> Selected disciplines: [{formData.disciplines.join(', ')}] | 
                  Submit enabled: {!(loading || formData.disciplines.length === 0)} | 
                  Form valid: {formData.name && formData.date && formData.location && formData.disciplines.length > 0}
                </div>
                {/* Basic Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competition Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Competition Settings */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        gender: e.target.value as 'männlich' | 'weiblich' | 'gemischt',
                        disciplines: [] // Reset disciplines when gender changes
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option key="gemischt" value="gemischt">Gemischt</option>
                      <option key="männlich" value="männlich">Männlich</option>
                      <option key="weiblich" value="weiblich">Weiblich</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age From
                    </label>
                    <select
                      value={formData.ageFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, ageFrom: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ageGroups.map(age => (
                        <option key={age.value} value={age.value}>{age.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age To
                    </label>
                    <select
                      value={formData.ageTo}
                      onChange={(e) => setFormData(prev => ({ ...prev, ageTo: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ageGroups.filter(age => age.value >= formData.ageFrom).map(age => (
                        <option key={age.value} value={age.value}>{age.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Disciplines Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disciplines * ({filteredDisciplines.length} available for {formData.gender}, {formData.disciplines.length} selected)
                  </label>
                  {formData.disciplines.length > 0 && (
                    <div className="mb-2 text-sm text-blue-600">
                      Selected: {formData.disciplines.map(id => {
                        const discipline = filteredDisciplines.find(d => d.int_disziplinid === id);
                        return discipline ? discipline.var_disziplinname : `ID:${id}`;
                      }).join(', ')}
                    </div>
                  )}
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {filteredDisciplines.length === 0 ? (
                      <p className="text-gray-500 text-sm">No disciplines available for selected gender</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredDisciplines.map((discipline) => (
                          <label key={discipline.int_disziplinid} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.disciplines.includes(discipline.int_disziplinid)}
                              onChange={(e) => {
                                const disciplineId = discipline.int_disziplinid;
                                console.log('Discipline selection changed:', {
                                  disciplineId,
                                  checked: e.target.checked,
                                  currentDisciplines: formData.disciplines,
                                  disciplineName: discipline.var_disziplinname
                                });
                                
                                if (e.target.checked) {
                                  const newDisciplines = [...formData.disciplines, disciplineId];
                                  console.log('Adding discipline, new array:', newDisciplines);
                                  setFormData(prev => ({
                                    ...prev,
                                    disciplines: newDisciplines
                                  }));
                                } else {
                                  const newDisciplines = formData.disciplines.filter(id => id !== disciplineId);
                                  console.log('Removing discipline, new array:', newDisciplines);
                                  setFormData(prev => ({
                                    ...prev,
                                    disciplines: newDisciplines
                                  }));
                                }
                              }}
                              className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm select-none">
                              {discipline.var_disziplinname} 
                              <span className="text-gray-500 ml-1">
                                ({discipline.var_disziplinkategorie}, {discipline.altersklasse_von}-{discipline.altersklasse_bis} years)
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value as number | '' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="No limit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organizer
                  </label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData(prev => ({ ...prev, organizer: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading || formData.disciplines.length === 0}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingCompetition ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        {editingCompetition ? 'Update Competition' : 'Create Competition'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Competitions;
