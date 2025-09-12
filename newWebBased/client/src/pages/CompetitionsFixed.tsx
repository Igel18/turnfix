import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { debugLog } from '../utils/debug';
import { 
  Users, 
  Trophy
} from 'lucide-react';
import { EventManagementTemplate, UnifiedActionButtons } from '../components/templates/EventManagementTemplate';
import CompetitionFormModal from '../components/CompetitionFormModal';
import { useEvent } from '../contexts/EventContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

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
  disciplines: {
    disciplineId: number;
    name: string;
    short_name: string;
    apparatus: string;
    maxScore: number;
  }[];
  registrationDeadline?: string;
  organizer?: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  createdAt: string;
  
  // Additional competition settings
  round: number;
  track: number;
  startTime?: string;
  warmupTime?: string;
  qualifiers: number;
  evaluations?: number;
  dropWorstScore: boolean;
  showAgeGroup: boolean;
  isOptionalCompetition: boolean;
  showInfo: boolean;
  useCompulsoryProgram: boolean;
  sortAscending: boolean;
  manualSort: boolean;
  useApparatusPoints: boolean;
  dropCount: number;
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
  
  // Additional competition settings
  round: number;                    // int_durchgang - Competition round/session
  track: number;                    // int_bahn - Track/lane number
  startTime?: string;               // tim_startzeit - Start time (HH:MM format)
  warmupTime?: string;              // tim_einturnen - Warm-up time (HH:MM format)
  qualifiers: number;               // int_qualifikation - Number of qualifiers
  evaluations?: number;             // int_wertungen - Number of evaluations
  dropWorstScore: boolean;          // bol_streichwertung - Drop worst score
  showAgeGroup: boolean;            // bol_ak_anzeigen - Show age group
  isOptionalCompetition: boolean;   // bol_wahlwettkampf - Optional competition
  showInfo: boolean;                // bol_info_anzeigen - Show info
  useCompulsoryProgram: boolean;    // bol_kp - Use compulsory program
  sortAscending: boolean;           // bol_sortasc - Sort ascending
  manualSort: boolean;              // bol_mansort - Manual sort
  useApparatusPoints: boolean;      // bol_gerpkt - Use apparatus points
  dropCount: number;                // int_anz_streich - Number of scores to drop
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
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  
  const [bulkMaxScore, setBulkMaxScore] = useState<string>('');
  
  const [formData, setFormData] = useState<CompetitionFormData>({
    number: '',
    name: '',
    description: '',
    gender: 'gemischt',
    ageFrom: 6,
    ageTo: 18,
    disciplines: [],
    
    // Additional competition settings with defaults
    round: 1,
    track: 1,
    startTime: '08:30',
    warmupTime: '08:00',
    qualifiers: 0,
    evaluations: 3,
    dropWorstScore: false,
    showAgeGroup: false,
    isOptionalCompetition: false,
    showInfo: false,
    useCompulsoryProgram: false,
    sortAscending: false,
    manualSort: false,
    useApparatusPoints: false,
    dropCount: 0
  });

  // Load initial data
  useEffect(() => {
    loadCompetitions();
  }, []);

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

  // Handler for bulk max score setting
  const handleBulkMaxScoreApply = () => {
    if (!bulkMaxScore) return;
    
    const maxScore = parseFloat(bulkMaxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      alert('Please enter a valid positive number for the max score');
      return;
    }
    
    debugLog('🎯 Applying bulk max score', maxScore, 'to all selected disciplines');
    
    // Update all disciplines with the new max score
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
    
    // Client-side validation for age values
    if (formData.ageFrom < 5 || formData.ageFrom > 99) {
      console.error('❌ Invalid ageFrom value:', formData.ageFrom);
      alert(`Invalid "Age From" value: ${formData.ageFrom}. Please enter an age between 5 and 99.`);
      setLoading(false);
      return;
    }
    
    if (formData.ageTo < 5 || formData.ageTo > 99) {
      console.error('❌ Invalid ageTo value:', formData.ageTo);
      alert(`Invalid "Age To" value: ${formData.ageTo}. Please enter an age between 5 and 99.`);
      setLoading(false);
      return;
    }
    
    if (formData.ageFrom > formData.ageTo) {
      console.error('❌ Invalid age range:', { ageFrom: formData.ageFrom, ageTo: formData.ageTo });
      alert(`Invalid age range: "Age From" (${formData.ageFrom}) cannot be greater than "Age To" (${formData.ageTo}).`);
      setLoading(false);
      return;
    }
    
    try {
      const payload = {
        ...(formData.number && { number: formData.number }),
        name: formData.name,
        description: formData.description,
        gender: formData.gender,
        ageFrom: Number(formData.ageFrom),
        ageTo: Number(formData.ageTo),
        disciplines: formData.disciplines.map(d => ({
          disciplineId: Number(d.disciplineId),
          maxScore: Number(d.maxScore)
        })),
        ...(eventId && { eventId: parseInt(eventId) }),
        
        // Additional competition settings
        round: Number(formData.round),
        track: Number(formData.track),
        ...(formData.startTime && { startTime: formData.startTime }),
        ...(formData.warmupTime && { warmupTime: formData.warmupTime }),
        qualifiers: Number(formData.qualifiers),
        ...(formData.evaluations && { evaluations: Number(formData.evaluations) }),
        dropWorstScore: Boolean(formData.dropWorstScore),
        showAgeGroup: Boolean(formData.showAgeGroup),
        isOptionalCompetition: Boolean(formData.isOptionalCompetition),
        showInfo: Boolean(formData.showInfo),
        useCompulsoryProgram: Boolean(formData.useCompulsoryProgram),
        sortAscending: Boolean(formData.sortAscending),
        manualSort: Boolean(formData.manualSort),
        useApparatusPoints: Boolean(formData.useApparatusPoints),
        dropCount: Number(formData.dropCount)
      };

      debugLog('Competition submission payload:', payload);
      debugLog('Payload types:', {
        ageFrom: typeof payload.ageFrom,
        ageTo: typeof payload.ageTo,
        disciplines: payload.disciplines.map(d => ({ 
          disciplineId: typeof d.disciplineId, 
          maxScore: typeof d.maxScore 
        }))
      });
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
      disciplines: [],
      
      // Additional competition settings with defaults
      round: 1,
      track: 1,
      startTime: '08:30',
      warmupTime: '08:00',
      qualifiers: 0,
      evaluations: 3,
      dropWorstScore: false,
      showAgeGroup: false,
      isOptionalCompetition: false,
      showInfo: false,
      useCompulsoryProgram: false,
      sortAscending: false,
      manualSort: false,
      useApparatusPoints: false,
      dropCount: 0
    });
    setEditingCompetition(null);
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    
    // Validate and correct age values - if they look like birth years, fix them
    let ageFromValue = Number(competition.ageFrom);
    let ageToValue = Number(competition.ageTo);
    
    // If age values are unreasonably high (likely birth years), set reasonable defaults
    if (ageFromValue > 100 || ageToValue > 100) {
      console.warn('⚠️ Invalid age values detected, setting defaults:', { ageFrom: ageFromValue, ageTo: ageToValue });
      ageFromValue = 6;
      ageToValue = 18;
    }
    
    // Ensure ageFrom is not greater than ageTo
    if (ageFromValue > ageToValue) {
      const temp = ageFromValue;
      ageFromValue = ageToValue;
      ageToValue = temp;
    }
    
    setFormData({
      number: competition.number || '',
      name: competition.name,
      description: competition.description,
      gender: competition.gender,
      ageFrom: ageFromValue,
      ageTo: ageToValue,
      disciplines: Array.isArray(competition.disciplines) ? 
        competition.disciplines.map((d: any) => 
          typeof d === 'object' && (d.disciplineId || d.id) ? 
            { disciplineId: Number(d.disciplineId || d.id), maxScore: Number(d.maxScore || 0) } : 
            { disciplineId: Number(typeof d === 'number' ? d : d.int_disziplinid), maxScore: 0 }
        ) : [],
      
      // Additional competition settings with defaults from competition or fallback
      round: competition.round || 1,
      track: competition.track || 1,
      startTime: competition.startTime || '08:30',
      warmupTime: competition.warmupTime || '08:00',
      qualifiers: competition.qualifiers || 0,
      evaluations: competition.evaluations || 3,
      dropWorstScore: competition.dropWorstScore || false,
      showAgeGroup: competition.showAgeGroup || false,
      isOptionalCompetition: competition.isOptionalCompetition || false,
      showInfo: competition.showInfo || false,
      useCompulsoryProgram: competition.useCompulsoryProgram || false,
      sortAscending: competition.sortAscending || false,
      manualSort: competition.manualSort || false,
      useApparatusPoints: competition.useApparatusPoints || false,
      dropCount: competition.dropCount || 0
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

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setGenderFilter('');
    setStatusFilter('');
  };

  const handleExportCSV = () => {
    // CSV export functionality for competitions
    const csvData = filteredCompetitions.map(competition => ({
      'Competition Number': competition.number || '',
      'Name': competition.name,
      'Description': competition.description,
      'Gender': competition.gender,
      'Age Range': `${competition.ageFrom}-${competition.ageTo}`,
      'Status': competition.status,
      'Participants': competition.participantCount,
      'Disciplines': competition.disciplines.map(d => d.name).join(', '),
      'Created': new Date(competition.createdAt).toLocaleDateString()
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `competitions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <EventManagementTemplate
      title="Competition Management"
      description="Manage gymnastics competitions with disciplines and categories"
      onAdd={openCreateModal}
      onRefresh={loadCompetitions}
      onExportCSV={handleExportCSV}
      addButtonText="Create Competition"
      loading={loading}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      itemCount={filteredCompetitions.length}
      filterSection={
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genders</option>
              <option value="männlich">Male</option>
              <option value="weiblich">Female</option>
              <option value="gemischt">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      }
    >
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
                        <div className="flex items-center text-sm text-gray-600">
                          <Trophy className="w-4 h-4 mr-2" />
                          {competition.disciplines ? competition.disciplines.length : 0} discipline{competition.disciplines && competition.disciplines.length !== 1 ? 's' : ''}
                        </div>
                        {competition.disciplines && competition.disciplines.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {competition.disciplines.slice(0, 4).map((discipline, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                title={`${discipline.name} (${discipline.apparatus})`}
                              >
                                {discipline.short_name || discipline.name}
                              </span>
                            ))}
                            {competition.disciplines.length > 4 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{competition.disciplines.length - 4}
                              </span>
                            )}
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
                        <UnifiedActionButtons
                          onEdit={() => handleEdit(competition)}
                          onDelete={() => handleDelete(competition.id)}
                          editTitle="Edit competition"
                          deleteTitle="Delete competition"
                        />
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
                          Disciplines
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
                            <div className="flex flex-wrap gap-1">
                              {competition.disciplines && competition.disciplines.length > 0 ? (
                                competition.disciplines.slice(0, 3).map((discipline, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                    title={`${discipline.name} (${discipline.apparatus})`}
                                  >
                                    {discipline.short_name || discipline.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No disciplines</span>
                              )}
                              {competition.disciplines && competition.disciplines.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{competition.disciplines.length - 3} more
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {competition.disciplines ? competition.disciplines.length : 0} discipline{competition.disciplines && competition.disciplines.length !== 1 ? 's' : ''}
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
                            <UnifiedActionButtons
                              onEdit={() => handleEdit(competition)}
                              onDelete={() => handleDelete(competition.id)}
                              editTitle="Edit competition"
                              deleteTitle="Delete competition"
                            />
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

      {/* Competition Form Modal */}
      <CompetitionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCompetition={editingCompetition}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        bulkMaxScore={bulkMaxScore}
        setBulkMaxScore={setBulkMaxScore}
        handleBulkMaxScore={handleBulkMaxScoreApply}
      />
    </EventManagementTemplate>
  );
};

export default Competitions;
