import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { debugInfo, debugLog } from '../utils/debug';
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
  disciplines: {
    disciplineId: number;
    name: string;
    short_name: string;
    apparatus: string;
    maxScore: number;
  }[];
  status: string;
  participantCount: number;
  createdAt: string;
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
  handleBulkMaxScore
}) => {
  // State for modal-specific data
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  const [ageGroups, setAgeGroups] = useState<{ value: number; label: string }[]>([]);
  const [disciplineGroups, setDisciplineGroups] = useState<any[]>([]);
  const [selectedDisciplineGroup, setSelectedDisciplineGroup] = useState<number | null>(null);
  const [loadingDisciplineGroups, setLoadingDisciplineGroups] = useState(false);

  // Helper function for gender text
  const getGenderText = (maleAllowed: boolean, femaleAllowed: boolean): string => {
    if (maleAllowed && femaleAllowed) return 'Mixed';
    if (maleAllowed) return 'Male';
    if (femaleAllowed) return 'Female';
    return 'Unknown';
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
      loadAgeGroups();
      loadDisciplineGroups();
    }
  }, [isOpen]);

  // Ensure ageTo has a valid value when ageGroups are loaded
  useEffect(() => {
    if (ageGroups.length > 0 && (!formData.ageTo || formData.ageTo < formData.ageFrom)) {
      const minAge = formData.ageFrom || 5;
      const validAges = ageGroups.filter(age => age.value >= minAge);
      if (validAges.length > 0 && !formData.ageTo) {
        // Set ageTo to ageFrom + 10 or the closest available age
        const targetAge = Math.min(minAge + 10, 70);
        const closestAge = validAges.find(age => age.value >= targetAge) || validAges[0];
        debugLog('Auto-setting ageTo to:', closestAge.value);
        setFormData(prev => ({ ...prev, ageTo: closestAge.value }));
      }
    }
  }, [ageGroups, formData.ageFrom, formData.ageTo]);

  // Filter disciplines based on gender selection
  useEffect(() => {
    if (!formData.gender || disciplines.length === 0) {
      setFilteredDisciplines([]);
      return;
    }

    const filtered = disciplines.filter((discipline) => {
      if (formData.gender === 'gemischt') {
        return true; // Show all disciplines for mixed gender
      } else if (formData.gender === 'männlich') {
        return discipline.male_allowed;
      } else if (formData.gender === 'weiblich') {
        return discipline.female_allowed;
      }
      return false;
    });

    debugLog('Filtered disciplines for gender', formData.gender, ':', filtered.length);
    setFilteredDisciplines(filtered);
  }, [formData.gender, disciplines]);

  const loadDisciplines = async () => {
    try {
      const response = await fetch('/api/disciplines');
      if (response.ok) {
        const data = await response.json();
        debugLog('Loaded disciplines:', data.length);
        setDisciplines(data);
      }
    } catch (error) {
      console.error('Error loading disciplines:', error);
    }
  };

  const loadAgeGroups = () => {
    const ages = [];
    for (let i = 5; i <= 70; i++) {
      ages.push({ value: i, label: `${i} years` });
    }
    debugLog('Generated age groups:', ages.length, 'ages from 5 to 70');
    setAgeGroups(ages);
  };

  const loadDisciplineGroups = async () => {
    setLoadingDisciplineGroups(true);
    try {
      const response = await fetch('/api/discipline-groups');
      if (response.ok) {
        const data = await response.json();
        // Handle both array and paginated response formats
        const groups = Array.isArray(data) ? data : data.disciplineGroups || [];
        setDisciplineGroups(groups);
      }
    } catch (error) {
      console.error('Error loading discipline groups:', error);
    } finally {
      setLoadingDisciplineGroups(false);
    }
  };

  const handleDisciplineGroupChange = (groupId: number | null) => {
    console.log('🔧 DEBUG: handleDisciplineGroupChange called with groupId:', groupId);
    setSelectedDisciplineGroup(groupId);
    if (groupId) {
      // Replace all disciplines with the ones from this group
      const group = disciplineGroups.find(g => g.int_disziplinen_gruppenid === groupId);
      console.log('🔧 DEBUG: Found group:', group);
      if (group && group.disciplines) {
        console.log('🔧 DEBUG: Group disciplines:', group.disciplines);
        
        // Determine the max score to use (from bulk input or default to 0)
        const defaultMaxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
        console.log('🔧 DEBUG: Using default max score:', defaultMaxScore);
        
        // Replace the entire disciplines array with only the disciplines from this group
        const newDisciplines = group.disciplines.map((discipline: any) => ({
          disciplineId: discipline.int_disziplinenid,
          maxScore: defaultMaxScore
        }));
        
        console.log('🔧 DEBUG: New disciplines array (replacing all):', newDisciplines);
        setFormData(prev => ({
          ...prev,
          disciplines: newDisciplines
        }));
        console.log('🔧 DEBUG: Form data updated - replaced all disciplines');
      } else {
        console.log('🔧 DEBUG: No group found or no disciplines in group');
      }
    } else {
      // If no group selected, clear all disciplines
      console.log('🔧 DEBUG: No group selected, clearing all disciplines');
      setFormData(prev => ({
        ...prev,
        disciplines: []
      }));
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingCompetition ? 'Edit Competition' : 'Create New Competition'}
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
                • Age Groups: {ageGroups.length} total, {ageGroups.filter(age => age.value >= (formData.ageFrom || 5)).length} available for "Age To"<br/>
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
                      if (value.length <= 5) {
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
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'männlich' | 'weiblich' | 'gemischt' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="männlich">Male</option>
                  <option value="weiblich">Female</option>
                  <option value="gemischt">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age From *
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
                  Age To (minimum: {formData.ageFrom} years) *
                </label>
                <select
                  value={formData.ageTo || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageTo: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {ageGroups.length === 0 ? (
                    <option value="">Loading ages...</option>
                  ) : (
                    <>
                      {!formData.ageTo && <option value="">Select age...</option>}
                      {ageGroups.filter(age => age.value >= (formData.ageFrom || 5)).map(age => (
                        <option key={age.value} value={age.value}>{age.label}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Age Calculation Info */}
            <BlueInfoBox title="Age Calculation" className="text-sm">
              <p className="text-blue-800">
                📅 <strong>Important:</strong> Ages are calculated based on the event date, not today's date.
                <br />
                🎂 A participant born in 2005 will be considered 17 years old for a 2022 event, regardless of their current age.
                <br />
                🏆 This ensures fair competition groupings based on the participant's age during the actual event.
              </p>
            </BlueInfoBox>

            {/* Disciplines */}
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Set Max Score for Selected Group (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={bulkMaxScore}
                        onChange={(e) => setBulkMaxScore(e.target.value)}
                        placeholder="Enter max score (optional)"
                        min="0"
                        step="0.1"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={handleBulkMaxScore}
                        disabled={!selectedDisciplineGroup}
                        className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title={!selectedDisciplineGroup ? "Please select a discipline group first" : "Apply max score to all selected disciplines"}
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to set max score to 0, or enter a value to apply to all disciplines in the group
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-600">
                  Individual Discipline Selection
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bulkMaxScore}
                    onChange={(e) => setBulkMaxScore(e.target.value)}
                    placeholder="Max score"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={handleBulkMaxScore}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Set All
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                {filteredDisciplines.length === 0 ? (
                  <p className="text-gray-500 text-sm">No disciplines available for selected gender</p>
                ) : (
                  <div className="space-y-2">
                    {filteredDisciplines.map((discipline) => {
                      const isSelected = formData.disciplines.some(d => d.disciplineId === discipline.id);
                      const currentDiscipline = formData.disciplines.find(d => d.disciplineId === discipline.id);
                      
                      return (
                        <div key={discipline.id} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    disciplines: [...prev.disciplines, { disciplineId: discipline.id, maxScore: 0 }]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    disciplines: prev.disciplines.filter(d => d.disciplineId !== discipline.id)
                                  }));
                                }
                              }}
                              className="mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm select-none">
                              {discipline.name} 
                              <span className="text-gray-500 ml-1">
                                ({getGenderText(discipline.male_allowed, discipline.female_allowed)})
                              </span>
                            </span>
                          </div>
                          {isSelected && (
                            <div className="flex items-center ml-4">
                              <label className="text-xs text-gray-600 mr-2">Max Score:</label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={currentDiscipline?.maxScore || 0}
                                onChange={(e) => {
                                  const maxScore = parseFloat(e.target.value) || 0;
                                  setFormData(prev => ({
                                    ...prev,
                                    disciplines: prev.disciplines.map(d => 
                                      d.disciplineId === discipline.id 
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
                        </div>
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
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompetitionFormModal;
