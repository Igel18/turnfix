 import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { debugLog } from '../utils/debug';
import { 
  Users, 
  Trophy
} from 'lucide-react';
import { EventManagementTemplate, UnifiedActionButtons } from '../components/templates/EventManagementTemplate';
import { GenderBadge, getGenderColumnHeader } from '../components/GenderBadge';
import CompetitionFormModal from '../components/CompetitionFormModal';
import { useEvent } from '../contexts/EventContext';
import { apiGet, apiPost, apiPut, apiDelete, invalidateCache } from '../utils/api';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';

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
  const { t } = useTranslation();
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
  // viewMode removed - now handled by EventManagementTemplate with persistence
  
  const [bulkMaxScore, setBulkMaxScore] = useState<string>('');
  
  // Sorting state
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort<Competition>();
  
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
      alert(t('competitions.validation.invalidMaxScore'));
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
    
    // Client-side validation for disciplines
    if (formData.disciplines.length === 0) {
      console.error('❌ No disciplines selected');
      alert(t('competitions.validation.disciplinesRequired'));
      setLoading(false);
      return;
    }
    
    // Client-side validation for age values (allow ages 1-99)
    if (formData.ageFrom < 1 || formData.ageFrom > 99) {
      console.error('❌ Invalid ageFrom value:', formData.ageFrom);
      alert(t('competitions.validation.invalidAgeFrom', { value: formData.ageFrom }));
      setLoading(false);
      return;
    }
    
    if (formData.ageTo < 1 || formData.ageTo > 99) {
      console.error('❌ Invalid ageTo value:', formData.ageTo);
      alert(t('competitions.validation.invalidAgeTo', { value: formData.ageTo }));
      setLoading(false);
      return;
    }
    
    if (formData.ageFrom > formData.ageTo) {
      console.error('❌ Invalid age range:', { ageFrom: formData.ageFrom, ageTo: formData.ageTo });
      alert(t('competitions.validation.invalidAgeRange', { ageFrom: formData.ageFrom, ageTo: formData.ageTo }));
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

      console.log('�️ Invalidating competitions cache...');
      invalidateCache('/competitions');
      
      console.log('�🔄 Reloading competitions...');
      await loadCompetitions();
      
      console.log('🔒 Closing modal and resetting form...');
      setIsModalOpen(false);
      resetForm();
      
      console.log('🎉 Competition submission completed successfully!');
    } catch (error) {
      console.error('❌ Error submitting competition:', error);
      console.error('Error details:', (error as any)?.response || (error as Error)?.message);
      alert(t('competitions.messages.saveFailed'));
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
    console.log('📝 EDIT COMPETITION:', competition);
    console.log('📝 Competition Ages (raw):', { 
      ageFrom: competition.ageFrom, 
      ageTo: competition.ageTo,
      typeFrom: typeof competition.ageFrom,
      typeTo: typeof competition.ageTo
    });
    console.log('📝 Competition Disciplines:', competition.disciplines);
    console.log('📝 Disciplines Type:', typeof competition.disciplines, Array.isArray(competition.disciplines));
    
    setEditingCompetition(competition);
    
    // Validate and correct age values - if they look like birth years, fix them
    let ageFromValue = Number(competition.ageFrom);
    let ageToValue = Number(competition.ageTo);
    
    // Handle NaN values
    if (isNaN(ageFromValue) || ageFromValue < 1) {
      console.warn('⚠️ Invalid ageFrom value, setting default to 6:', ageFromValue);
      ageFromValue = 6;
    }
    if (isNaN(ageToValue) || ageToValue < 1) {
      console.warn('⚠️ Invalid ageTo value, setting default to 18:', ageToValue);
      ageToValue = 18;
    }
    
    // If age values are unreasonably high (likely birth years), set reasonable defaults
    if (ageFromValue > 100 || ageToValue > 100) {
      console.warn('⚠️ Age values > 100 detected (likely birth years), setting defaults:', { ageFrom: ageFromValue, ageTo: ageToValue });
      ageFromValue = 6;
      ageToValue = 18;
    }
    
    // NO SWAP - Backend already provides ageFrom < ageTo (youngest to oldest)
    // Just ensure ageFrom is not greater than ageTo as a safety check
    if (ageFromValue > ageToValue) {
      console.warn('⚠️ ageFrom > ageTo detected, this should not happen! Swapping values:', { ageFrom: ageFromValue, ageTo: ageToValue });
      const temp = ageFromValue;
      ageFromValue = ageToValue;
      ageToValue = temp;
    }
    
    console.log('✅ Final age values for form:', { ageFrom: ageFromValue, ageTo: ageToValue });
    
    setFormData({
      number: competition.number || '',
      name: competition.name,
      description: competition.description,
      gender: competition.gender,
      ageFrom: ageFromValue,
      ageTo: ageToValue,
      disciplines: Array.isArray(competition.disciplines) ? 
        competition.disciplines.map((d: any) => {
          console.log('🔄 Processing discipline:', d);
          const result = typeof d === 'object' && (d.disciplineId || d.id) ? 
            { disciplineId: Number(d.disciplineId || d.id), maxScore: Number(d.maxScore || 0) } : 
            { disciplineId: Number(typeof d === 'number' ? d : d.int_disziplinid), maxScore: 0 };
          console.log('✅ Mapped to:', result);
          return result;
        }) : [],
      
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
    if (!confirm(t('competitions.actions.confirmDelete'))) return;
    
    try {
      await apiDelete(`/competitions/${id}`);
      console.log('🗑️ Invalidating competitions cache after deletion...');
      invalidateCache('/competitions');
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

  const filteredCompetitions = sortData(
    competitions.filter(competition => {
      const matchesSearch = competition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           competition.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = !genderFilter || competition.gender === genderFilter;
      const matchesStatus = !statusFilter || competition.status === statusFilter;
      
      return matchesSearch && matchesGender && matchesStatus;
    })
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setGenderFilter('');
    setStatusFilter('');
  };

  const handleExportCSV = () => {
    // CSV export functionality for competitions
    const csvData = filteredCompetitions.map(competition => ({
      [t('competitions.export.headers.number')]: competition.number || '',
      [t('competitions.export.headers.name')]: competition.name,
      [t('competitions.export.headers.description')]: competition.description,
      [t('competitions.export.headers.gender')]: competition.gender,
      [t('competitions.export.headers.ageRange')]: `${competition.ageFrom}-${competition.ageTo}`,
      [t('competitions.export.headers.status')]: competition.status,
      [t('competitions.export.headers.participants')]: competition.participantCount,
      [t('competitions.export.headers.disciplines')]: competition.disciplines.map(d => d.name).join(', '),
      [t('competitions.export.headers.created')]: new Date(competition.createdAt).toLocaleDateString()
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', t('competitions.export.filename', { date: new Date().toISOString().slice(0, 10) }));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <>
    <EventManagementTemplate
      title={t('competitions.title')}
      description={t('competitions.description')}
      onAdd={openCreateModal}
      onRefresh={loadCompetitions}
      onExportCSV={handleExportCSV}
      addButtonText={t('competitions.createButton')}
      loading={loading}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      viewStorageKey="competitions-view"  // NEW: Enable view persistence
      defaultView="table"  // NEW: Default to table view
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      itemCount={filteredCompetitions.length}
      filterSection={
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('competitions.filters.gender')}
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('competitions.filters.allGenders')}</option>
              <option value="männlich">{t('competitions.filters.male')}</option>
              <option value="weiblich">{t('competitions.filters.female')}</option>
              <option value="gemischt">{t('competitions.filters.mixed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('competitions.filters.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('competitions.filters.allStatus')}</option>
              <option value="upcoming">{t('competitions.filters.upcoming')}</option>
              <option value="active">{t('competitions.filters.active')}</option>
              <option value="completed">{t('competitions.filters.completed')}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('competitions.filters.clear')}
            </button>
          </div>
        </div>
      }
    >
      {(viewMode: 'table' | 'grid') => (
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('competitions.loading')}</p>
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('competitions.noCompetitions')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {competitions.length === 0 ? t('competitions.noCompetitionsHint') : t('competitions.adjustFilters')}
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
                          {competition.participantCount} {t('competitions.card.participants')}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Trophy className="w-4 h-4 mr-2" />
                          {competition.disciplines ? competition.disciplines.length : 0} {competition.disciplines && competition.disciplines.length === 1 ? t('competitions.card.discipline') : t('competitions.card.disciplines')}
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
                                +{competition.disciplines.length - 4} {t('competitions.card.more')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <GenderBadge value={competition.gender} />
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {competition.ageFrom}-{competition.ageTo} {t('competitions.fields.years')}
                          </span>
                        </div>
                        <UnifiedActionButtons
                          onEdit={() => handleEdit(competition)}
                          onDelete={() => handleDelete(competition.id)}
                          editTitle={t('competitions.actions.edit')}
                          deleteTitle={t('competitions.actions.delete')}
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
                        <SortableTableHeader
                          sortKey="number"
                          label={t('competitions.fields.number')}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHeader
                          sortKey="name"
                          label={t('competitions.fields.name')}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('competitions.fields.disciplines')}
                        </th>
                        <SortableTableHeader
                          sortKey="participantCount"
                          label={t('competitions.fields.participants')}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHeader
                          sortKey="gender"
                          label={getGenderColumnHeader(t)}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHeader
                          sortKey="ageFrom"
                          label={t('competitions.fields.ageGroup')}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <SortableTableHeader
                          sortKey="status"
                          label={t('competitions.filters.status')}
                          currentSortKey={sortKey}
                          currentSortDirection={sortDirection}
                          onSort={handleSort}
                        />
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('competitions.fields.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredCompetitions.map((competition) => (
                        <tr key={competition.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600">
                              {competition.number || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {competition.name}
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
                                <span className="text-xs text-gray-500">{t('competitions.card.noDisciplines')}</span>
                              )}
                              {competition.disciplines && competition.disciplines.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  +{competition.disciplines.length - 3} {t('competitions.card.more')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {competition.disciplines ? competition.disciplines.length : 0} {competition.disciplines && competition.disciplines.length === 1 ? t('competitions.card.discipline') : t('competitions.card.disciplines')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <Users className="w-4 h-4 mr-2 text-gray-400" />
                              {competition.participantCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <GenderBadge value={competition.gender} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {competition.ageFrom}-{competition.ageTo} {t('competitions.fields.years')}
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
                              editTitle={t('competitions.actions.edit')}
                              deleteTitle={t('competitions.actions.delete')}
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
      )}
    </EventManagementTemplate>

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
    </>
  );
};

export default Competitions;
