import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { debugLog } from '../../../utils/debug';
import { apiGet, apiPost, apiPut, apiDelete, invalidateCache } from '../../../utils/api';
import { Competition, CompetitionFormData } from '../Competitions.types';
import { useFilterPanel } from '../../../hooks';

export interface UseCompetitionsProps {
  eventId?: string | null;
}

const getInitialFormData = (): CompetitionFormData => ({
  number: '',
  name: '',
  description: '',
  gender: 'gemischt',
  areaId: null,
  ageFrom: 6,
  ageTo: 18,
  disciplines: [],
  round: 1,
  track: 1,
  competitionType: 0,
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

export const useCompetitions = ({ eventId }: UseCompetitionsProps = {}) => {
  const { t } = useTranslation();
  
  // State for competitions list and UI
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const isAnyFilterActive = searchTerm !== '' || genderFilter !== '' || areaFilter !== '' || statusFilter !== '';
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, () => { setSearchTerm(''); setGenderFilter(''); setAreaFilter(''); setStatusFilter(''); });
  
  // Form state
  const [formData, setFormData] = useState<CompetitionFormData>(getInitialFormData());
  const [bulkMaxScore, setBulkMaxScore] = useState<string>('');

  // Load competitions
  const loadCompetitions = useCallback(async () => {
    setLoading(true);
    try {
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
  }, [eventId]);

  // Load data on mount and when eventId changes
  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // Handler for bulk max score setting
  const handleBulkMaxScoreApply = useCallback(() => {
    if (!bulkMaxScore) return;
    
    const maxScore = parseFloat(bulkMaxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      alert(t('competitions.validation.invalidMaxScore'));
      return;
    }
    
    debugLog('🎯 Applying bulk max score', maxScore, 'to all selected disciplines');
    
    const updatedDisciplines = formData.disciplines.map(discipline => ({
      ...discipline,
      maxScore
    }));
    
    setFormData({
      ...formData,
      disciplines: updatedDisciplines
    });
    
    setBulkMaxScore('');
  }, [bulkMaxScore, formData, t]);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
    
    // Client-side validation for age values
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
        round: Number(formData.round),
        track: Number(formData.track),
        competitionType: Number(formData.competitionType),
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

      let result;
      if (editingCompetition) {
        debugLog('📝 Updating existing competition...');
        result = await apiPut(`/competitions/${editingCompetition.id}`, payload);
      } else {
        debugLog('➕ Creating new competition...');
        result = await apiPost('/competitions', payload);
      }
      
      debugLog('✅ API call successful, result:', result);

      invalidateCache('/competitions');
      await loadCompetitions();
      
      setIsModalOpen(false);
      resetForm();
      
      debugLog('🎉 Competition submission completed successfully!');
    } catch (error) {
      console.error('❌ Error submitting competition:', error);
      alert(t('competitions.messages.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [formData, editingCompetition, eventId, loadCompetitions, t]);

  // Reset form
  const resetForm = useCallback(() => {
    debugLog('Resetting competition form');
    setFormData(getInitialFormData());
    setEditingCompetition(null);
  }, []);

  // Edit handler
  const handleEdit = useCallback((competition: Competition) => {
    debugLog('📝 EDIT COMPETITION:', competition);
    
    setEditingCompetition(competition);
    
    // Validate and correct age values
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
    
    // Safety check: ageFrom should not be greater than ageTo
    if (ageFromValue > ageToValue) {
      console.warn('⚠️ ageFrom > ageTo detected, swapping values:', { ageFrom: ageFromValue, ageTo: ageToValue });
      const temp = ageFromValue;
      ageFromValue = ageToValue;
      ageToValue = temp;
    }
    
    debugLog('✅ Final age values for form:', { ageFrom: ageFromValue, ageTo: ageToValue });
    
    setFormData({
      number: competition.number || '',
      name: competition.name,
      description: competition.description,
      gender: competition.gender,
      areaId: competition.areaId ?? null,
      ageFrom: ageFromValue,
      ageTo: ageToValue,
      disciplines: Array.isArray(competition.disciplines) ? 
        competition.disciplines.map((d: any) => {
          debugLog('🔄 Processing discipline:', d);
          const result = typeof d === 'object' && (d.disciplineId || d.id) ? 
            { disciplineId: Number(d.disciplineId || d.id), maxScore: Number(d.maxScore || 0) } : 
            { disciplineId: Number(typeof d === 'number' ? d : d.int_disziplinid), maxScore: 0 };
          debugLog('✅ Mapped to:', result);
          return result;
        }) : [],
      round: competition.round || 1,
      track: competition.track || 1,
      competitionType: competition.competitionType ?? 0,
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
  }, []);

  // Delete handler
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm(t('competitions.actions.confirmDelete'))) return;
    
    try {
      await apiDelete(`/competitions/${id}`);
      invalidateCache('/competitions');
      await loadCompetitions();
    } catch (error) {
      console.error('Error deleting competition:', error);
    }
  }, [loadCompetitions, t]);

  // Filter handlers
  const handleClearAllFilters = useCallback(() => {
    setSearchTerm('');
    setGenderFilter('');
    setAreaFilter('');
    setStatusFilter('');
  }, []);

  // Export handler
  const handleExportCSV = useCallback(() => {
    const filteredCompetitions = competitions.filter(competition => {
      const matchesSearch = competition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           competition.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = !genderFilter || competition.gender === genderFilter;
      const matchesArea = !areaFilter || competition.areaId?.toString() === areaFilter;
      const matchesStatus = !statusFilter || competition.status === statusFilter;
      
      return matchesSearch && matchesGender && matchesArea && matchesStatus;
    });

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
  }, [competitions, searchTerm, genderFilter, statusFilter, t]);

  // Open create modal
  const openCreateModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  // Get filtered competitions
  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         competition.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = !genderFilter || competition.gender === genderFilter;
    const matchesArea = !areaFilter || competition.areaId?.toString() === areaFilter;
    const matchesStatus = !statusFilter || competition.status === statusFilter;
    
    return matchesSearch && matchesGender && matchesArea && matchesStatus;
  });

  // Extract unique areas from loaded competitions for filter dropdown
  const availableAreas = useMemo(() => {
    const areaMap = new Map<number, string>();
    competitions.forEach(comp => {
      if (comp.areaId && comp.areaName) {
        areaMap.set(comp.areaId, comp.areaName);
      }
    });
    return Array.from(areaMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [competitions]);

  return {
    // Data
    competitions: filteredCompetitions,
    loading,
    
    // Modal state
    isModalOpen,
    setIsModalOpen,
    editingCompetition,
    
    // Form state
    formData,
    setFormData,
    bulkMaxScore,
    setBulkMaxScore,
    
    // Filter state
    searchTerm,
    setSearchTerm,
    genderFilter,
    setGenderFilter,
    areaFilter,
    setAreaFilter,
    availableAreas,
    statusFilter,
    setStatusFilter,
    showFilters,
    toggleFilters,
    
    // Handlers
    handleSubmit,
    handleEdit,
    handleDelete,
    handleClearAllFilters,
    handleExportCSV,
    handleBulkMaxScoreApply,
    openCreateModal,
    loadCompetitions,
    resetForm
  };
};
