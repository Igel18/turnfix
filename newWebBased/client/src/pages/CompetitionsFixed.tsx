import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { debugLog, debugInfo } from '../utils/debug';
import { 
  Users, 
  Trophy,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TrophyIcon } from '@heroicons/react/24/outline';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';
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

// Interface for disciplines returned by discipline groups API
interface DisciplineGroupDiscipline {
  int_disziplinenid: number;
  var_name: string;
  var_kurz1: string;
  var_kurz2: string;
  position: number;
}

// Interface for discipline groups
interface DisciplineGroup {
  int_disziplinen_gruppenid: number;
  var_name: string;
  txt_comment: string;
  discipline_count: number;
  disciplines: DisciplineGroupDiscipline[];
}

// Interface for competition display
interface Competition {
  id: number;
  number?: string; // Competition number (waNr)
  name: string; // Competition name (waBezeichnung)
  description: string;
  date: string;
  location: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: number[] | Discipline[];
  registrationDeadline?: string;
  organizer?: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  createdAt: string;
}

// Interface for form data
interface CompetitionFormData {
  number?: string; // Competition number (waNr)
  name: string;
  description: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: { disciplineId: number; maxScore: number }[];
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
  
  // Helper function to get gender text
  const getGenderText = (maleAllowed: boolean, femaleAllowed: boolean): string => {
    if (maleAllowed && femaleAllowed) return 'Mixed';
    if (maleAllowed && !femaleAllowed) return 'Male';
    if (!maleAllowed && femaleAllowed) return 'Female';
    return 'Unknown';
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  
  // State for disciplines and form data
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [ageGroups, setAgeGroups] = useState<{ value: number; label: string }[]>([]);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  
  // State for discipline groups
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([]);
  const [selectedDisciplineGroup, setSelectedDisciplineGroup] = useState<number | null>(null);
  const [loadingDisciplineGroups, setLoadingDisciplineGroups] = useState(false);
  const [bulkMaxScore, setBulkMaxScore] = useState<string>('');
  
  const [formData, setFormData] = useState<CompetitionFormData>({
    number: '',
    name: '',
    description: '',
    gender: 'gemischt',
    ageFrom: 6,
    ageTo: 18,
    disciplines: []
  });

  // Filter disciplines based on selected gender
  useEffect(() => {
    debugLog('Filtering disciplines. Gender:', formData.gender, 'All disciplines:', disciplines.length);
    if (formData.gender && disciplines.length > 0) {
      const filtered = disciplines.filter(discipline => {
        const allowed = formData.gender === 'männlich' ? discipline.male_allowed :
                       formData.gender === 'weiblich' ? discipline.female_allowed :
                       formData.gender === 'gemischt' ? (discipline.male_allowed || discipline.female_allowed) : // Changed from && to ||
                       false;
        
        debugLog(`Discipline ${discipline.var_disziplinname} (ID:${discipline.int_disziplinid}):`, {
          male_allowed: discipline.male_allowed,
          female_allowed: discipline.female_allowed,
          gender: formData.gender,
          allowed
        });
        
        return allowed;
      });
      debugLog('Filtered disciplines for gender:', filtered.length, filtered.map(d => `${d.var_disziplinname}(${d.int_disziplinid})`));
      setFilteredDisciplines(filtered);
    } else {
      debugLog('Using all disciplines');
      setFilteredDisciplines(disciplines);
    }
  }, [formData.gender, disciplines]);

  // Load initial data
  useEffect(() => {
    loadDisciplines();
    loadAgeGroups();
    loadDisciplineGroups();
    loadCompetitions();
  }, []);

  const loadDisciplines = async () => {
    try {
      const data = await apiGet('/disciplines/filtered');
      debugLog('Loaded disciplines:', data);
      debugLog('Disciplines with undefined IDs:', data.filter((d: Discipline) => !d.int_disziplinid));
      debugLog('Total discipline count:', data.length);
      debugLog('Valid discipline count:', data.filter((d: Discipline) => d.int_disziplinid != null).length);
      setDisciplines(data);
    } catch (error) {
      console.error('Error loading disciplines:', error);
    }
  };

  const loadAgeGroups = async () => {
    try {
      const data = await apiGet('/disciplines/age-groups');
      debugLog('🎂 Loaded age groups:', data);
      setAgeGroups(data);
    } catch (error) {
      console.error('Error loading age groups:', error);
    }
  };

  const loadDisciplineGroups = async () => {
    setLoadingDisciplineGroups(true);
    try {
      const data = await apiGet('/discipline-groups');
      debugLog('📚 Loaded discipline groups:', data);
      // The API returns an object with disciplineGroups array, not directly an array
      const groups = data?.disciplineGroups || [];
      setDisciplineGroups(Array.isArray(groups) ? groups : []);
    } catch (error) {
      console.error('Error loading discipline groups:', error);
      // Set empty array on error
      setDisciplineGroups([]);
    } finally {
      setLoadingDisciplineGroups(false);
    }
  };

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      // Build URL with eventId parameter if present
      let url = '/competitions';
      if (eventId) {
        url += `?eventId=${eventId}`;
        debugLog('Loading competitions for eventId:', eventId);
      } else {
        debugLog('Loading all competitions');
      }
      
      const data = await apiGet(url);
      setCompetitions(data);
      debugLog(`Loaded ${data.length} competitions`);
    } catch (error) {
      console.error('Error loading competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler for discipline group selection
  const handleDisciplineGroupChange = (groupId: number | null) => {
    setSelectedDisciplineGroup(groupId);
    
    if (groupId) {
      const selectedGroup = disciplineGroups.find(group => group.int_disziplinen_gruppenid === groupId);
      if (selectedGroup) {
        debugLog('📚 Selected discipline group:', selectedGroup.var_name, 'with', selectedGroup.disciplines.length, 'disciplines');
        
        // Clear all existing discipline selections and add only the ones from the selected group
        const newDisciplines = selectedGroup.disciplines.map(discipline => ({
          disciplineId: discipline.int_disziplinenid,
          maxScore: 10 // Default max score for new selections
        }));
        
        debugLog('🔄 Replacing all disciplines with group selections:', newDisciplines);
        
        setFormData({
          ...formData,
          disciplines: newDisciplines
        });
      }
    } else {
      // If no group is selected, clear the disciplines array
      debugLog('🔄 Clearing all discipline selections');
      setFormData({
        ...formData,
        disciplines: []
      });
    }
  };

  // Handler for bulk max score setting
  const handleBulkMaxScoreApply = () => {
    if (!bulkMaxScore || selectedDisciplineGroup === null) return;
    
    const selectedGroup = disciplineGroups.find(group => group.int_disziplinen_gruppenid === selectedDisciplineGroup);
    if (!selectedGroup) return;
    
    const maxScore = parseFloat(bulkMaxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      alert('Please enter a valid positive number for the max score');
      return;
    }
    
    debugLog('🎯 Applying bulk max score', maxScore, 'to all selected disciplines from group:', selectedGroup.var_name);
    
    // Since disciplines are now only from the selected group, update all of them
    const updatedDisciplines = formData.disciplines.map(discipline => ({
      ...discipline,
      maxScore
    }));
    
    setFormData({
      ...formData,
      disciplines: updatedDisciplines
    });
    
    // Clear the bulk score input
    setBulkMaxScore('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    debugLog('🚀 Competition submission started');
    
    try {
      const payload = {
        ...(formData.number && { number: formData.number }),
        name: formData.name,
        description: formData.description,
        gender: formData.gender,
        ageFrom: formData.ageFrom,
        ageTo: formData.ageTo,
        disciplines: formData.disciplines,
        ...(eventId && { eventId: parseInt(eventId) })
      };

      debugLog('Competition submission payload:', payload);
      debugLog('Disciplines array:', payload.disciplines, 'Length:', payload.disciplines.length);

      let result;
      if (editingCompetition) {
        debugLog('📝 Updating existing competition...');
        result = await apiPut(`/competitions/${editingCompetition.id}`, payload);
      } else {
        debugLog('➕ Creating new competition...');
        result = await apiPost('/competitions', payload);
      }
      
      debugLog('✅ API call successful, result:', result);

      console.log('🔄 Reloading competitions...');
      await loadCompetitions();
      
      console.log('🔒 Closing modal and resetting form...');
      setIsModalOpen(false);
      resetForm();
      
      console.log('🎉 Competition submission completed successfully!');
    } catch (error) {
      console.error('❌ Error submitting competition:', error);
      console.error('Error details:', (error as any)?.response || (error as Error)?.message);
      alert('Failed to save competition. Please check the console for details.');
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const resetForm = () => {
    console.log('Resetting competition form');
    
    setFormData({
      number: '',
      name: '',
      description: '',
      gender: 'gemischt',
      ageFrom: 6,
      ageTo: 18,
      disciplines: []
    });
    setEditingCompetition(null);
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      number: competition.number || '',
      name: competition.name,
      description: competition.description,
      gender: competition.gender,
      ageFrom: competition.ageFrom,
      ageTo: competition.ageTo,
      disciplines: Array.isArray(competition.disciplines) ? 
        competition.disciplines.map((d: any) => 
          typeof d === 'object' && d.disciplineId ? 
            { disciplineId: d.disciplineId, maxScore: d.maxScore || 0 } : 
            { disciplineId: typeof d === 'number' ? d : d.int_disziplinid, maxScore: 0 }
        ) : []
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

  // Helper functions for UnifiedPageHeader
  const getFilterOptions = () => [
    {
      label: 'Status',
      value: 'status',
      options: [
        { value: '', label: 'All Competitions' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' }
      ],
      selectedValue: statusFilter,
      onChange: setStatusFilter
    },
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
      <UnifiedPageHeader
        title="Competition Management"
        subtitle="Manage gymnastics competitions with disciplines and categories"
        icon={TrophyIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search competitions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        showExportCSV={true}
        onExportCSV={handleExportCSV}
        showAdd={true}
        addLabel="New Competition"
        onAdd={openCreateModal}
        totalCount={filteredCompetitions.length}
        showEventContext={true}
        hasFilters={true}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle={true}
      />

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
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCompetitions.map((competition) => (
                  <div key={competition.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          {competition.number && (
                            <div className="text-sm font-medium text-blue-600 mb-1">
                              Nr. {competition.number}
                            </div>
                          )}
                          <h3 className="text-lg font-semibold text-gray-900">{competition.name}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(competition.status)}`}>
                          {competition.status}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{competition.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-2" />
                          {competition.participantCount} participants
                        </div>
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
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Competition
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age Group
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCompetitions.map((competition) => (
                        <tr key={competition.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                {competition.number && (
                                  <span className="text-sm font-medium text-blue-600 mr-2">
                                    Nr. {competition.number}
                                  </span>
                                )}
                                <div className="text-sm font-medium text-gray-900">
                                  {competition.name}
                                </div>
                              </div>
                              {competition.description && (
                                <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                                  {competition.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              {competition.participantCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {competition.gender}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {competition.ageFrom}-{competition.ageTo} years
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(competition.status)}`}>
                              {competition.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(competition)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit competition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(competition.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete competition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
                {debugInfo(
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                    <strong>🔧 Debug Info:</strong><br/>
                    • Form Number: "<span className="font-mono text-blue-700">{formData.number || 'EMPTY'}</span>"<br/>
                    • Form Name: "<span className="font-mono text-blue-700">{formData.name || 'EMPTY'}</span>"<br/>
                    • Mode: {editingCompetition ? 
                      <span className="text-green-600">EDITING (ID: {editingCompetition.id}, Number: "{editingCompetition.number || 'NULL'}")</span> : 
                      <span className="text-orange-600">CREATING NEW</span>
                    }
                  </div>
                )}
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔢 Competition Number
                      </label>
                      <input
                        type="text"
                        value={formData.number || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.length <= 5) { // Limit to 5 characters
                            setFormData(prev => ({ ...prev, number: value }));
                          }
                        }}
                        placeholder="e.g. 0113"
                        maxLength={5}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      <p className="text-xs text-yellow-700 mt-1">Max 5 characters (current: {(formData.number || '').length}/5)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Competition Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
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
                      onChange={(e) => {
                        const newAgeFrom = parseInt(e.target.value);
                        setFormData(prev => ({ 
                          ...prev, 
                          ageFrom: newAgeFrom,
                          // Auto-adjust ageTo if it becomes invalid
                          ageTo: prev.ageTo < newAgeFrom ? newAgeFrom : prev.ageTo
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ageGroups.length === 0 ? (
                        <option value="">Loading ages...</option>
                      ) : (
                        ageGroups.map(age => (
                          <option key={age.value} value={age.value}>{age.label}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Age To (minimum: {formData.ageFrom} years)
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
                  
                  {/* Discipline Groups Quick Selection */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quick Select from Discipline Group
                        </label>
                        <select
                          value={selectedDisciplineGroup || ''}
                          onChange={(e) => handleDisciplineGroupChange(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          disabled={loadingDisciplineGroups}
                        >
                          <option value="">Select a discipline group...</option>
                          {Array.isArray(disciplineGroups) && disciplineGroups.map(group => (
                            <option key={group.int_disziplinen_gruppenid} value={group.int_disziplinen_gruppenid}>
                              {group.var_name} ({group.discipline_count} disciplines)
                            </option>
                          ))}
                        </select>
                        {loadingDisciplineGroups && (
                          <p className="text-sm text-gray-500 mt-1">Loading discipline groups...</p>
                        )}
                      </div>
                      
                      {selectedDisciplineGroup && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Set Max Score for Selected Group
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={bulkMaxScore}
                              onChange={(e) => setBulkMaxScore(e.target.value)}
                              placeholder="Enter max score"
                              min="0"
                              step="0.1"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                            <button
                              type="button"
                              onClick={handleBulkMaxScoreApply}
                              disabled={!bulkMaxScore}
                              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {formData.disciplines.length > 0 && (
                    <div className="mb-2 text-sm text-blue-600">
                      <span>Selected: </span>
                      {formData.disciplines.map((disciplineObj, index) => {
                        const discipline = filteredDisciplines.find(d => d.int_disziplinid === disciplineObj.disciplineId);
                        const allDisciplineMatch = disciplines.find(d => d.int_disziplinid === disciplineObj.disciplineId);
                        debugLog(`Selected discipline ID:${disciplineObj.disciplineId}:`, {
                          foundInFiltered: !!discipline,
                          foundInAll: !!allDisciplineMatch,
                          disciplineName: discipline?.var_disziplinname || allDisciplineMatch?.var_disziplinname,
                          maxScore: disciplineObj.maxScore,
                          filteredCount: filteredDisciplines.length,
                          totalCount: disciplines.length
                        });
                        return (
                          <span key={`selected-${disciplineObj.disciplineId}`}>
                            {discipline ? discipline.var_disziplinname : (allDisciplineMatch ? allDisciplineMatch.var_disziplinname : `ID:${disciplineObj.disciplineId}`)} ({disciplineObj.maxScore}pts)
                            {index < formData.disciplines.length - 1 ? ', ' : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {filteredDisciplines.length === 0 ? (
                      <p className="text-gray-500 text-sm">No disciplines available for selected gender</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredDisciplines.map((discipline, index) => {
                          const disciplineId = discipline.int_disziplinid;
                          const keyValue = disciplineId ? `discipline-${disciplineId}` : `discipline-index-${index}`;
                          
                          
                          // Check if this discipline is selected
                          const shouldBeChecked = disciplineId != null && formData.disciplines.some(d => d.disciplineId === Number(disciplineId));
                          
                          return (
                            <label key={keyValue} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={shouldBeChecked}
                                  onChange={(e) => {
                                    // Skip processing if disciplineId is null/undefined
                                    if (disciplineId == null) {
                                      console.warn('Cannot select discipline with undefined ID:', discipline.var_disziplinname);
                                      return;
                                    }
                                    
                                    const numericDisciplineId = Number(disciplineId);
                                    debugLog('Discipline selection changed:', {
                                      disciplineId: numericDisciplineId,
                                      checked: e.target.checked,
                                      currentDisciplines: formData.disciplines,
                                      disciplineName: discipline.var_disziplinname
                                    });
                                    
                                    if (e.target.checked) {
                                      // Add discipline if not already present
                                      if (!formData.disciplines.some(d => d.disciplineId === numericDisciplineId)) {
                                        const newDisciplines = [...formData.disciplines, { disciplineId: numericDisciplineId, maxScore: 0 }];
                                        debugLog('Adding discipline, new array:', newDisciplines);
                                        setFormData(prev => ({
                                          ...prev,
                                          disciplines: newDisciplines
                                        }));
                                      }
                                    } else {
                                      const newDisciplines = formData.disciplines.filter(d => d.disciplineId !== numericDisciplineId);
                                      debugLog('Removing discipline, new array:', newDisciplines);
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
                                    ({getGenderText(discipline.male_allowed, discipline.female_allowed)}, {discipline.altersklasse_von}-{discipline.altersklasse_bis} years)
                                  </span>
                                  <span className="text-blue-500 ml-2 text-xs">
                                    [ID: {disciplineId} | In Array: {formData.disciplines.some(d => d.disciplineId === Number(disciplineId)) ? 'YES' : 'NO'}]
                                  </span>
                                </span>
                              </div>
                              {shouldBeChecked && (
                                <div className="flex items-center ml-4">
                                  <label className="text-xs text-gray-600 mr-2">Max Score:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={formData.disciplines.find(d => d.disciplineId === Number(disciplineId))?.maxScore || 0}
                                    onChange={(e) => {
                                      const numericDisciplineId = Number(disciplineId);
                                      const maxScore = parseFloat(e.target.value) || 0;
                                      setFormData(prev => ({
                                        ...prev,
                                        disciplines: prev.disciplines.map(d => 
                                          d.disciplineId === numericDisciplineId 
                                            ? { ...d, maxScore: Math.max(0, maxScore) }
                                            : d
                                        )
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
  );
};

export default Competitions;
