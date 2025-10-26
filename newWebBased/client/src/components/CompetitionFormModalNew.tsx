import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { debugInfo } from '../utils/debug';
import { BlueInfoBox } from '@/components/InfoBoxes';

// Interface for discipline data from API
interface Discipline {
  id: number;
  name: string;
  short_name: string;
  display_name: string;
  male_allowed: boolean;
  female_allowed: boolean;
  icon: string;
}

// Interface for form data
interface CompetitionFormData {
  number?: string;
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

// Interface for competition (for editing)
interface Competition {
  id: number;
  number?: string;
  name: string;
  description: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: { disciplineId: number; name: string; maxScore: number }[];
  
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

interface CompetitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCompetition: Competition | null;
  formData: CompetitionFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompetitionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  bulkMaxScore: string;
  setBulkMaxScore: React.Dispatch<React.SetStateAction<string>>;
  handleBulkMaxScore: () => void;
}

const CompetitionFormModal: React.FC<CompetitionFormModalProps> = ({
  isOpen,
  onClose,
  editingCompetition,
  formData,
  setFormData,
  onSubmit,
  loading,
  bulkMaxScore,
  setBulkMaxScore,
  handleBulkMaxScore: _handleBulkMaxScore // Renamed to avoid unused variable warning
}) => {
  // Translation hook
  const { t } = useTranslation();
  
  // State for modal-specific data
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplineGroups, setDisciplineGroups] = useState<{ 
    int_disziplinen_gruppenid: number; 
    var_name: string; 
    disciplines: Array<{ int_disziplinenid: number; position: number }> 
  }[]>([]);
  const [selectedDisciplineGroup, setSelectedDisciplineGroup] = useState<number | null>(null);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  const [showIncompatibleMessage, setShowIncompatibleMessage] = useState(false);
  
  // Track previous gender to detect changes
  const previousGenderRef = useRef<string>(formData.gender);

  // Age groups for dropdowns
  const ageGroups = Array.from({ length: 50 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1} years`
  }));

  // Load disciplines and discipline groups
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await fetch('/api/disciplines');
        const data = await response.json();
        setDisciplines(data);
      } catch (error) {
        console.error('Error fetching disciplines:', error);
      }
    };

    const fetchDisciplineGroups = async () => {
      try {
        const response = await fetch('/api/discipline-groups');
        const data = await response.json();
        // Extract disciplineGroups array from response
        const groups = data.disciplineGroups || [];
        setDisciplineGroups(groups);
      } catch (error) {
        console.error('Error fetching discipline groups:', error);
      }
    };

    if (isOpen) {
      fetchDisciplines();
      fetchDisciplineGroups();
    }
  }, [isOpen]);

  // Filter disciplines by gender compatibility and selected group
  useEffect(() => {
    // Get discipline IDs that belong to the selected group
    let groupDisciplineIds: number[] = [];
    if (selectedDisciplineGroup !== null) {
      const selectedGroup = disciplineGroups.find(g => g.int_disziplinen_gruppenid === selectedDisciplineGroup);
      if (selectedGroup) {
        groupDisciplineIds = selectedGroup.disciplines.map(d => d.int_disziplinenid);
      }
    }
    
    let filtered = disciplines.filter(discipline => {
      const genderMatch = formData.gender === 'gemischt' || 
        (formData.gender === 'männlich' && discipline.male_allowed) ||
        (formData.gender === 'weiblich' && discipline.female_allowed);
      
      // If a group is selected, only show disciplines that are part of that group
      const groupMatch = selectedDisciplineGroup === null || groupDisciplineIds.includes(discipline.id);
      
      return genderMatch && groupMatch;
    });

    setFilteredDisciplines(filtered);
  }, [disciplines, formData.gender, selectedDisciplineGroup, disciplineGroups]);

  // Remove incompatible disciplines when gender changes
  useEffect(() => {
    if (previousGenderRef.current !== formData.gender) {
      const currentDisciplineIds = formData.disciplines.map(d => d.disciplineId);
      const compatibleDisciplineIds = filteredDisciplines.map(d => d.id);
      
      const incompatibleDisciplines = currentDisciplineIds.filter(id => !compatibleDisciplineIds.includes(id));
      
      if (incompatibleDisciplines.length > 0) {
        const updatedDisciplines = formData.disciplines.filter(d => compatibleDisciplineIds.includes(d.disciplineId));
        setFormData(prev => ({ ...prev, disciplines: updatedDisciplines }));
        setShowIncompatibleMessage(true);
        
        setTimeout(() => setShowIncompatibleMessage(false), 5000);
      }
      
      previousGenderRef.current = formData.gender;
    }
  }, [formData.gender, filteredDisciplines, formData.disciplines, setFormData]);

  const handleDisciplineGroupChange = (groupId: number | null) => {
    setSelectedDisciplineGroup(groupId);
  };

  const handleBulkSelectGroup = () => {
    // If no group is selected, just apply max score to already selected disciplines
    if (selectedDisciplineGroup === null) {
      // Apply bulk max score to all currently selected disciplines
      if (bulkMaxScore) {
        const maxScore = parseFloat(bulkMaxScore);
        if (!isNaN(maxScore) && maxScore > 0) {
          setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(d => ({ ...d, maxScore }))
          }));
        }
      }
      return;
    }
    
    // Get all disciplines from the selected group
    const selectedGroup = disciplineGroups.find(g => g.int_disziplinen_gruppenid === selectedDisciplineGroup);
    if (!selectedGroup) return;
    
    const groupDisciplineIds = selectedGroup.disciplines.map(d => d.int_disziplinenid);
    
    // Get disciplines that match the current gender and are in the group
    const disciplinesToSelect = filteredDisciplines
      .filter(d => groupDisciplineIds.includes(d.id))
      .map(d => d.id);
    
    const maxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
    
    // Create new disciplines array: keep existing selections not in this group, add/update group disciplines
    const existingNonGroupDisciplines = formData.disciplines.filter(d => !groupDisciplineIds.includes(d.disciplineId));
    const newGroupDisciplines = disciplinesToSelect.map(disciplineId => ({
      disciplineId,
      maxScore
    }));
    
    setFormData(prev => ({
      ...prev,
      disciplines: [...existingNonGroupDisciplines, ...newGroupDisciplines]
    }));
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setFormData(prev => {
      const isSelected = prev.disciplines.some(d => d.disciplineId === disciplineId);
      
      if (isSelected) {
        return {
          ...prev,
          disciplines: prev.disciplines.filter(d => d.disciplineId !== disciplineId)
        };
      } else {
        const defaultMaxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
        return {
          ...prev,
          disciplines: [...prev.disciplines, { disciplineId, maxScore: defaultMaxScore }]
        };
      }
    });
  };

  const getGenderText = (maleAllowed: boolean, femaleAllowed: boolean) => {
    if (maleAllowed && femaleAllowed) return t('competitionForm.disciplines.genderCompatibility.both');
    if (maleAllowed) return t('competitionForm.disciplines.genderCompatibility.male');
    if (femaleAllowed) return t('competitionForm.disciplines.genderCompatibility.female');
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingCompetition ? t('competitionForm.title.edit') : t('competitionForm.title.create')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Debug Info */}
            {debugInfo(
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <strong>🔧 Debug Info:</strong><br/>
                • Form Number: "<span className="font-mono text-blue-700">{formData.number || 'EMPTY'}</span>"<br/>
                • Form Name: "<span className="font-mono text-blue-700">{formData.name || 'EMPTY'}</span>"<br/>
                • Age From: <span className="font-mono text-blue-700">{formData.ageFrom}</span> | Age To: <span className="font-mono text-blue-700">{formData.ageTo}</span><br/>
                • Mode: {editingCompetition ? 
                  <span className="text-green-600">EDITING (ID: {editingCompetition.id}, Number: "{editingCompetition.number || 'NULL'}")</span> : 
                  <span className="text-orange-600">CREATING NEW</span>
                }
              </div>
            )}

            {/* Basic Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📋 {t('competitionForm.basicInfo.title')}</h3>
              </div>
              <BlueInfoBox>{t('competitionForm.basicInfo.description')}</BlueInfoBox>
              
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔢 {t('competitionForm.fields.number.label')}
                  </label>
                  <input
                    type="text"
                    value={formData.number || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 5) {
                        setFormData(prev => ({ ...prev, number: value }));
                      }
                    }}
                    placeholder={t('competitionForm.fields.number.placeholder')}
                    maxLength={5}
                    className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="text-xs text-yellow-700 mt-1">{t('competitionForm.fields.number.description')} ({(formData.number || '').length}/5)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 {t('competitionForm.fields.name.label')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('competitionForm.fields.name.placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('competitionForm.fields.name.description')}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 {t('competitionForm.fields.description.label')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('competitionForm.fields.description.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">{t('competitionForm.fields.description.description')}</p>
              </div>
            </div>

            {/* Gender and Age Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 {t('competitionForm.fields.gender.label')} & Alter</h3>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    👥 {t('competitionForm.fields.gender.label')} *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'männlich' | 'weiblich' | 'gemischt' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="männlich">{t('competitionForm.fields.gender.options.male')}</option>
                    <option value="weiblich">{t('competitionForm.fields.gender.options.female')}</option>
                    <option value="gemischt">{t('competitionForm.fields.gender.options.mixed')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('competitionForm.fields.gender.description')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📅 {t('competitionForm.fields.ageFrom.label')} *
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
                    required
                  >
                    {ageGroups.map(age => (
                      <option key={age.value} value={age.value}>{age.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('competitionForm.fields.ageFrom.description')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📅 {t('competitionForm.fields.ageTo.label')} (min: {formData.ageFrom} Jahre) *
                  </label>
                  <select
                    value={formData.ageTo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, ageTo: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {!formData.ageTo && <option value="">Select age...</option>}
                    {ageGroups.filter(age => age.value >= (formData.ageFrom || 5)).map(age => (
                      <option key={age.value} value={age.value}>{age.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('competitionForm.fields.ageTo.description')}</p>
                </div>
              </div>
            </div>

            {/* Age Calculation Info */}
            <BlueInfoBox title="Altersberechnung" className="text-sm">
              <p className="text-blue-800">
                📅 <strong>Wichtig:</strong> Das Alter wird basierend auf dem Veranstaltungsdatum berechnet, nicht auf dem heutigen Datum.
                <br />
                🎂 Ein Teilnehmer, der 2005 geboren wurde, wird für eine Veranstaltung 2022 als 17 Jahre alt betrachtet, unabhängig vom aktuellen Alter.
                <br />
                🏆 Dies gewährleistet faire Wettkampfgruppen basierend auf dem Alter des Teilnehmers während der tatsächlichen Veranstaltung.
              </p>
            </BlueInfoBox>

            {/* Competition Settings Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚙️ {t('competitionForm.competitionSettings.title')}
              </h3>
              <BlueInfoBox>{t('competitionForm.competitionSettings.description')}</BlueInfoBox>
              
              {/* Scheduling Subsection */}
              <div className="mt-4">
                <h4 className="text-md font-medium text-gray-800 mb-3">📅 {t('competitionForm.scheduling.title')}</h4>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔄 {t('competitionForm.scheduling.round.label')} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.round}
                      onChange={(e) => setFormData(prev => ({ ...prev, round: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.scheduling.round.description')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏃 {t('competitionForm.scheduling.track.label')} *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.track}
                      onChange={(e) => setFormData(prev => ({ ...prev, track: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.scheduling.track.description')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🕐 {t('competitionForm.scheduling.startTime.label')}
                    </label>
                    <input
                      type="time"
                      value={formData.startTime || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.scheduling.startTime.description')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏃‍♂️ {t('competitionForm.scheduling.warmupTime.label')}
                    </label>
                    <input
                      type="time"
                      value={formData.warmupTime || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, warmupTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.scheduling.warmupTime.description')}</p>
                  </div>
                </div>
              </div>

              {/* Qualification & Scoring Subsection */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">🏆 {t('competitionForm.qualification.title')}</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🎯 {t('competitionForm.qualification.qualifiers.label')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={formData.qualifiers}
                      onChange={(e) => setFormData(prev => ({ ...prev, qualifiers: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.qualification.qualifiers.description')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📊 {t('competitionForm.qualification.evaluations.label')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.evaluations || 3}
                      onChange={(e) => setFormData(prev => ({ ...prev, evaluations: parseInt(e.target.value) || 3 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.qualification.evaluations.description')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🗑️ {t('competitionForm.qualification.dropCount.label')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={formData.dropCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, dropCount: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('competitionForm.qualification.dropCount.description')}</p>
                  </div>
                </div>
              </div>

              {/* Behavior & Display Subsection */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">🎛️ {t('competitionForm.behavior.title')}</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.dropWorstScore}
                        onChange={(e) => setFormData(prev => ({ ...prev, dropWorstScore: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.dropWorstScore.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.dropWorstScore.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.showAgeGroup}
                        onChange={(e) => setFormData(prev => ({ ...prev, showAgeGroup: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.showAgeGroup.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.showAgeGroup.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isOptionalCompetition}
                        onChange={(e) => setFormData(prev => ({ ...prev, isOptionalCompetition: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.isOptionalCompetition.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.isOptionalCompetition.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.showInfo}
                        onChange={(e) => setFormData(prev => ({ ...prev, showInfo: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.showInfo.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.showInfo.description')}</p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.useCompulsoryProgram}
                        onChange={(e) => setFormData(prev => ({ ...prev, useCompulsoryProgram: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.useCompulsoryProgram.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.useCompulsoryProgram.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.sortAscending}
                        onChange={(e) => setFormData(prev => ({ ...prev, sortAscending: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.sortAscending.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.sortAscending.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.manualSort}
                        onChange={(e) => setFormData(prev => ({ ...prev, manualSort: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.manualSort.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.manualSort.description')}</p>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.useApparatusPoints}
                        onChange={(e) => setFormData(prev => ({ ...prev, useApparatusPoints: e.target.checked }))}
                        className="mr-2 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{t('competitionForm.behavior.useApparatusPoints.label')}</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">{t('competitionForm.behavior.useApparatusPoints.description')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Discipline Selection Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏅 {t('competitionForm.disciplines.title')}</h3>
              <BlueInfoBox>{t('competitionForm.disciplines.description')}</BlueInfoBox>

              {/* Filter and bulk operations */}
              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔍 {t('competitionForm.disciplines.filterByGroup')}
                  </label>
                  <select
                    value={selectedDisciplineGroup || ''}
                    onChange={(e) => handleDisciplineGroupChange(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('competitionForm.disciplines.selectGroup')}</option>
                    {disciplineGroups.map(group => (
                      <option key={group.int_disziplinen_gruppenid} value={group.int_disziplinen_gruppenid}>{group.var_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🎯 {t('competitionForm.disciplines.bulkMaxScore')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={bulkMaxScore}
                    onChange={(e) => setBulkMaxScore(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10.0"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleBulkSelectGroup}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {selectedDisciplineGroup 
                      ? t('competitionForm.disciplines.selectGroupAndApply') || 'Gruppe auswählen & Max-Punkte setzen'
                      : t('competitionForm.disciplines.applyToAll')}
                  </button>
                </div>
              </div>

              {/* Incompatible disciplines message */}
              {showIncompatibleMessage && (
                <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                  <p className="text-orange-700 text-sm">
                    ⚠️ {t('competitionForm.disciplines.validation.incompatibleRemoved')}
                  </p>
                </div>
              )}

              {/* Filter status */}
              <div className="mt-4 text-sm text-gray-600">
                {t('competitionForm.disciplines.filterStatus.showing')} {filteredDisciplines.length} {t('competitionForm.disciplines.filterStatus.of')} {disciplines.length} {t('competitionForm.disciplines.filterStatus.disciplines')}
                {formData.gender !== 'gemischt' && ` (${t('competitionForm.disciplines.filterStatus.filteredByGender')})`}
                {selectedDisciplineGroup && ` (${t('competitionForm.disciplines.filterStatus.filteredByGroup')})`}
              </div>

              {/* Discipline selection grid */}
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredDisciplines.map(discipline => {
                  const isSelected = formData.disciplines.some(d => d.disciplineId === discipline.id);
                  const selectedDiscipline = formData.disciplines.find(d => d.disciplineId === discipline.id);
                  
                  return (
                    <div
                      key={discipline.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDisciplineToggle(discipline.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                          ) : (
                            <div className="w-5 h-5 border border-gray-300 rounded mr-2"></div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{discipline.display_name}</p>
                            <p className="text-xs text-gray-500">
                              ({getGenderText(discipline.male_allowed, discipline.female_allowed)})
                            </p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={selectedDiscipline?.maxScore || 0}
                            onChange={(e) => {
                              e.stopPropagation();
                              const maxScore = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({
                                ...prev,
                                disciplines: prev.disciplines.map(d =>
                                  d.disciplineId === discipline.id ? { ...d, maxScore } : d
                                )
                              }));
                            }}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="10.0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {formData.disciplines.length === 0 && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">
                    ⚠️ {t('competitionForm.disciplines.validation.noneSelected')}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t('competitionForm.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || formData.disciplines.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingCompetition ? t('competitionForm.messages.updating') : t('competitionForm.messages.creating')}
                  </>
                ) : (
                  t('competitionForm.actions.save')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompetitionFormModal;
