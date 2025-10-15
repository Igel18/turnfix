import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { debugLog, debugInfo } from '../utils/debug';
import { 
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { TrophyIcon } from '@heroicons/react/24/outline';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiPut } from '../utils/api';

// Interface for discipline data from API
interface Discipline {
  int_disziplinid: number;
  var_disziplinname: string;
  var_kurz1: string;
  var_einheit: string;
  bol_m: boolean;
  bol_w: boolean;
  male_allowed: boolean;
  female_allowed: boolean;
  var_icon?: string;
}

// Interface for competition data
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
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
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

const EditCompetition: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const competitionId = searchParams.get('competitionId');
  const eventId = searchParams.get('eventId');
  const { selectedEvent } = useEvent();

  // State management
  const [, setCompetition] = useState<Competition | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    if (disciplines.length > 0) {
      if (formData.gender) {
        const filtered = disciplines.filter(discipline => {
          const allowed = formData.gender === 'männlich' ? discipline.male_allowed :
                         formData.gender === 'weiblich' ? discipline.female_allowed :
                         formData.gender === 'gemischt' ? (discipline.male_allowed || discipline.female_allowed) :
                         false;
          
          debugLog(`Discipline ${discipline.var_disziplinname}: male=${discipline.male_allowed}, female=${discipline.female_allowed}, allowed=${allowed}`);
          return allowed;
        });
        
        debugLog('Filtered disciplines for gender:', filtered.length, filtered.map(d => `${d.var_disziplinname}(${d.int_disziplinid})`));
        setFilteredDisciplines(filtered);
      } else {
        debugLog('Using all disciplines (no gender filter)');
        setFilteredDisciplines(disciplines);
      }
    } else {
      debugLog('No disciplines loaded yet, keeping filtered list empty');
      setFilteredDisciplines([]);
    }
  }, [formData.gender, disciplines]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load disciplines
        const disciplinesResponse = await apiGet('/disciplines/filtered');
        setDisciplines(disciplinesResponse);

        // Load competition if editing
        if (competitionId) {
          const competitionResponse = await apiGet(`/competitions/${competitionId}`);
          setCompetition(competitionResponse);
          setFormData({
            number: competitionResponse.number || '',
            name: competitionResponse.name,
            description: competitionResponse.description,
            gender: competitionResponse.gender,
            ageFrom: competitionResponse.ageFrom,
            ageTo: competitionResponse.ageTo,
            disciplines: Array.isArray(competitionResponse.disciplines) ? 
              competitionResponse.disciplines.map((d: any) => 
                typeof d === 'object' && (d.disciplineId || d.id) ? 
                  { disciplineId: d.disciplineId || d.id, maxScore: d.maxScore || 0 } : 
                  { disciplineId: typeof d === 'number' ? d : d.int_disziplinid, maxScore: 0 }
              ) : []
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [competitionId]);

  const handleDisciplineToggle = (disciplineId: number) => {
    const existingIndex = formData.disciplines.findIndex(d => d.disciplineId === disciplineId);
    
    if (existingIndex >= 0) {
      // Remove discipline
      setFormData({
        ...formData,
        disciplines: formData.disciplines.filter(d => d.disciplineId !== disciplineId)
      });
    } else {
      // Add discipline
      setFormData({
        ...formData,
        disciplines: [...formData.disciplines, { disciplineId, maxScore: 0 }]
      });
    }
  };

  const handleMaxScoreChange = (disciplineId: number, maxScore: number) => {
    setFormData({
      ...formData,
      disciplines: formData.disciplines.map(d => 
        d.disciplineId === disciplineId ? { ...d, maxScore } : d
      )
    });
  };

  const applyBulkMaxScore = () => {
    const score = parseFloat(bulkMaxScore);
    if (isNaN(score) || score < 0) {
      alert('Please enter a valid max score (0 or higher)');
      return;
    }

    const updatedDisciplines = formData.disciplines.map(d => ({
      ...d,
      maxScore: score
    }));

    setFormData({
      ...formData,
      disciplines: updatedDisciplines
    });
    
    setBulkMaxScore('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
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

      if (competitionId) {
        await apiPut(`/competitions/${competitionId}`, payload);
      } else {
        await apiPost('/competitions', payload);
      }
      
      // Navigate back to competitions list
      navigate(`/competitions?eventId=${eventId}`);
    } catch (error) {
      console.error('Error saving competition:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/competitions?eventId=${eventId}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader
        title={competitionId ? 'Edit Competition' : 'Create Competition'}
        subtitle={selectedEvent?.var_eventname || 'Event Management'}
        icon={TrophyIcon}
      />

      <div className="mt-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Navigation */}
          <div className="mb-6">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Competitions
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Debug Info */}
            {debugInfo(
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                <strong>🔧 Debug Info:</strong><br/>
                • Form Number: "<span className="font-mono text-blue-700">{formData.number || 'EMPTY'}</span>"<br/>
                • Form Name: "<span className="font-mono text-blue-700">{formData.name || 'EMPTY'}</span>"<br/>
                • Mode: {competitionId ? 
                  <span className="text-green-600">EDITING (ID: {competitionId})</span> : 
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
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="gemischt">Mixed</option>
                  <option value="männlich">Male</option>
                  <option value="weiblich">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age From *
                </label>
                <input
                  type="number"
                  min="5"
                  max="99"
                  value={formData.ageFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageFrom: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age To *
                </label>
                <input
                  type="number"
                  min="5"
                  max="99"
                  value={formData.ageTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageTo: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Disciplines Selection */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  📋 Disciplines ({formData.disciplines.length} selected)
                </h3>
                {formData.disciplines.length > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Max score"
                      value={bulkMaxScore}
                      onChange={(e) => setBulkMaxScore(e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={applyBulkMaxScore}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Apply to All
                    </button>
                  </div>
                )}
              </div>

              {filteredDisciplines.length === 0 ? (
                <p className="text-sm text-gray-500">Loading disciplines...</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDisciplines.map((discipline) => {
                    const isSelected = formData.disciplines.some(d => d.disciplineId === discipline.int_disziplinid);
                    const selectedDiscipline = formData.disciplines.find(d => d.disciplineId === discipline.int_disziplinid);
                    
                    return (
                      <div
                        key={discipline.int_disziplinid}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleDisciplineToggle(discipline.int_disziplinid)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // Handled by parent onClick
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-medium text-sm">{discipline.var_disziplinname}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {discipline.var_kurz1} • {discipline.var_einheit}
                            </p>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max Score
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={selectedDiscipline?.maxScore || 0}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMaxScoreChange(discipline.int_disziplinid, parseFloat(e.target.value) || 0);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="space-y-4 pt-4 border-t">
              {/* Show warning message if no disciplines selected */}
              {disciplines.length > 0 && formData.disciplines.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  ⚠️ Mindestens eine Disziplin muss ausgewählt werden
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || (disciplines.length > 0 && formData.disciplines.length === 0)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {competitionId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {competitionId ? 'Update Competition' : 'Create Competition'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditCompetition;
