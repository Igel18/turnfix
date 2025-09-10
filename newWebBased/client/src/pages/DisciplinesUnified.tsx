import React, { useState, useEffect } from 'react';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import DisciplineFormModal from '../components/DisciplineFormModal';
import { 
  CogIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon 
} from '@heroicons/react/24/outline';
import { getIconUrl } from '../utils/iconUtils';

interface Discipline {
  id: number;
  name: string;
  short_name: string;
  display_name?: string;
  formula?: string;
  input_mask?: string;
  attempts: number;
  icon?: string;
  shortcut?: string;
  calculation_type: number;
  unit?: string;
  lanes_division: boolean;
  male_allowed: boolean;
  female_allowed: boolean;
  sport_id: number;
  formula_id?: number;
  should_calculate: boolean;
  gender_text: string;
  category_id?: number;
  available_from?: string;
  available_to?: string;
  active?: boolean;
}

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count: number;
}

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count: number;
}

interface FormData {
  name: string;
  shortName: string;
  displayName: string;
  formula: string;
  inputMask: string;
  attempts: number;
  icon: string;
  shortcut: string;
  calculationType: number;
  unit: string;
  lanesDivision: boolean;
  maleAllowed: boolean;
  femaleAllowed: boolean;
  sportId: number;
  formulaId: number | undefined;
  shouldCalculate: boolean;
}

const DisciplinesUnified: React.FC = () => {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [sportFilter, setSportFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [formulaFilter, setFormulaFilter] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    shortName: '',
    displayName: '',
    formula: '',
    inputMask: '',
    attempts: 1,
    icon: '',
    shortcut: '',
    calculationType: 2,
    unit: '',
    lanesDivision: false,
    maleAllowed: true,
    femaleAllowed: true,
    sportId: 0,
    formulaId: undefined,
    shouldCalculate: true
  });

  const fetchDisciplines = async () => {
    try {
      const response = await fetch('/api/disciplines');
      if (!response.ok) throw new Error('Failed to fetch disciplines');
      const data = await response.json();
      setDisciplines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching disciplines:', error);
      setDisciplines([]);
    }
  };

  const fetchFormulas = async () => {
    try {
      const response = await fetch('/api/formulas');
      if (!response.ok) throw new Error('Failed to fetch formulas');
      const data = await response.json();
      setFormulas(Array.isArray(data.formulas) ? data.formulas : []);
    } catch (error) {
      console.error('Error fetching formulas:', error);
      setFormulas([]);
    }
  };

  const fetchSports = async () => {
    try {
      const response = await fetch('/api/sports');
      if (!response.ok) throw new Error('Failed to fetch sports');
      const data = await response.json();
      setSports(Array.isArray(data.sports) ? data.sports : []);
    } catch (error) {
      console.error('Error fetching sports:', error);
      setSports([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchDisciplines(), fetchFormulas(), fetchSports()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      displayName: '',
      formula: '',
      inputMask: '',
      attempts: 1,
      icon: '',
      shortcut: '',
      calculationType: 2,
      unit: '',
      lanesDivision: false,
      maleAllowed: true,
      femaleAllowed: true,
      sportId: 0,
      formulaId: undefined,
      shouldCalculate: true
    });
    setEditingDiscipline(null);
  };

  const handleCreate = () => {
    // Ensure data has finished loading before opening modal
    if (loading) {
      alert('Please wait for data to load before creating a discipline.');
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (discipline: Discipline) => {
    // Ensure data has finished loading before opening modal
    if (loading) {
      alert('Please wait for data to load before editing a discipline.');
      return;
    }
    setFormData({
      name: discipline.name,
      shortName: discipline.short_name,
      displayName: discipline.display_name || '',
      formula: discipline.formula || '',
      inputMask: discipline.input_mask || '',
      attempts: discipline.attempts,
      icon: discipline.icon || '',
      shortcut: discipline.shortcut || '',
      calculationType: discipline.calculation_type,
      unit: discipline.unit || '',
      lanesDivision: discipline.lanes_division,
      maleAllowed: discipline.male_allowed,
      femaleAllowed: discipline.female_allowed,
      sportId: discipline.sport_id,
      formulaId: discipline.formula_id,
      shouldCalculate: discipline.should_calculate
    });
    setEditingDiscipline(discipline);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discipline?')) return;
    
    try {
      const response = await fetch(`/api/disciplines/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete discipline');
      
      await fetchDisciplines();
    } catch (error) {
      console.error('Error deleting discipline:', error);
      alert('Error deleting discipline. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const disciplineData = {
        name: formData.name,
        short_name: formData.shortName,
        display_name: formData.displayName || null,
        formula: formData.formula || null,
        input_mask: formData.inputMask || null,
        attempts: formData.attempts,
        icon: formData.icon || null,
        shortcut: formData.shortcut || null,
        calculation_type: formData.calculationType,
        unit: formData.unit || null,
        lanes_division: formData.lanesDivision,
        male_allowed: formData.maleAllowed,
        female_allowed: formData.femaleAllowed,
        sport_id: formData.sportId,
        formula_id: formData.formulaId || null,
        should_calculate: formData.shouldCalculate
      };

      const url = editingDiscipline 
        ? `/api/disciplines/${editingDiscipline.id}`
        : '/api/disciplines';
      
      const method = editingDiscipline ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(disciplineData)
      });

      if (!response.ok) throw new Error('Failed to save discipline');
      
      setIsModalOpen(false);
      resetForm();
      await fetchDisciplines();
    } catch (error) {
      console.error('Error saving discipline:', error);
      alert('Error saving discipline. Please try again.');
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setSportFilter('');
    setGenderFilter('');
    setFormulaFilter('');
  };

  // Filter disciplines based on search term and filters
  const filteredDisciplines = disciplines.filter(discipline => {
    const matchesSearch = searchTerm === '' || 
      discipline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      discipline.short_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (discipline.display_name && discipline.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSport = !sportFilter || discipline.sport_id.toString() === sportFilter;
    
    const matchesGender = !genderFilter || 
      (genderFilter === 'male' && discipline.male_allowed && !discipline.female_allowed) ||
      (genderFilter === 'female' && discipline.female_allowed && !discipline.male_allowed) ||
      (genderFilter === 'both' && discipline.male_allowed && discipline.female_allowed);
    
    const hasFormula = discipline.formula_id || (discipline.formula && discipline.formula.trim());
    const matchesFormula = !formulaFilter ||
      (formulaFilter === 'yes' && hasFormula) ||
      (formulaFilter === 'no' && !hasFormula);
    
    return matchesSearch && matchesSport && matchesGender && matchesFormula;
  });

  // Filter options for the template
  const getFilterOptions = () => [
    {
      value: '',
      label: 'Sport',
      selectedValue: sportFilter,
      onChange: setSportFilter,
      options: [
        { value: '', label: 'All Sports' },
        ...(Array.isArray(sports) ? sports.map(sport => ({ 
          value: sport.int_sportid.toString(), 
          label: sport.var_name 
        })) : [])
      ]
    },
    {
      value: '',
      label: 'Gender',
      selectedValue: genderFilter,
      onChange: setGenderFilter,
      options: [
        { value: '', label: 'All Genders' },
        { value: 'male', label: 'Male Only' },
        { value: 'female', label: 'Female Only' },
        { value: 'both', label: 'Both Genders' }
      ]
    },
    {
      value: '',
      label: 'Has Formula',
      selectedValue: formulaFilter,
      onChange: setFormulaFilter,
      options: [
        { value: '', label: 'All Disciplines' },
        { value: 'yes', label: 'Has Formula' },
        { value: 'no', label: 'No Formula' }
      ]
    }
  ];

  // Render table headers
  const renderTableHeaders = () => (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Short Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Sport
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Gender
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Attempts
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Unit
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Formula
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  );

  // Render table row
  const renderTableRow = (discipline: Discipline) => {
    const sport = Array.isArray(sports) ? sports.find(s => s.int_sportid === discipline.sport_id) : undefined;
    const formula = Array.isArray(formulas) ? formulas.find(f => f.int_formelid === discipline.formula_id) : undefined;
    const hasCustomFormula = discipline.formula && discipline.formula.trim();
    const hasFormula = formula || hasCustomFormula;

    return (
      <tr key={discipline.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {discipline.icon && (
              <img 
                src={getIconUrl(discipline.icon) || ''} 
                alt=""
                className="w-6 h-6 mr-3 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{discipline.name}</div>
              {discipline.display_name && (
                <div className="text-sm text-gray-500">{discipline.display_name}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {discipline.short_name}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {sport?.var_name || 'Unknown'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex space-x-1">
            {discipline.male_allowed && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                M
              </span>
            )}
            {discipline.female_allowed && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                F
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {discipline.attempts}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {discipline.unit || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {hasFormula ? (
            <div className="flex items-center text-sm">
              {formula && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-1">
                  {formula.var_name}
                </span>
              )}
              {hasCustomFormula && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Custom
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">No formula</span>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(discipline)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
              title="Edit discipline"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(discipline.id)}
              className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
              title="Delete discipline"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Render card view
  const renderCard = (discipline: Discipline) => {
    const sport = Array.isArray(sports) ? sports.find(s => s.int_sportid === discipline.sport_id) : undefined;
    const formula = Array.isArray(formulas) ? formulas.find(f => f.int_formelid === discipline.formula_id) : undefined;
    const hasCustomFormula = discipline.formula && discipline.formula.trim();
    const hasFormula = formula || hasCustomFormula;

    return (
      <div key={discipline.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {discipline.icon && (
              <img 
                src={getIconUrl(discipline.icon) || ''} 
                alt=""
                className="w-8 h-8 mr-3 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{discipline.name}</h3>
              {discipline.display_name && (
                <p className="text-sm text-gray-500">{discipline.display_name}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handleEdit(discipline)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50"
              title="Edit discipline"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(discipline.id)}
              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50"
              title="Delete discipline"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Short Name</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {discipline.short_name}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Sport</dt>
            <dd className="mt-1 text-sm text-gray-900">{sport?.var_name || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Gender</dt>
            <dd className="mt-1 flex space-x-1">
              {discipline.male_allowed && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Male
                </span>
              )}
              {discipline.female_allowed && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                  Female
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Attempts</dt>
            <dd className="mt-1 text-sm text-gray-900">{discipline.attempts}</dd>
          </div>
          {discipline.unit && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Unit</dt>
              <dd className="mt-1 text-sm text-gray-900">{discipline.unit}</dd>
            </div>
          )}
          {hasFormula && (
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-500">Formula</dt>
              <dd className="mt-1 flex space-x-2">
                {formula && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {formula.var_name}
                  </span>
                )}
                {hasCustomFormula && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Custom: {discipline.formula}
                  </span>
                )}
              </dd>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <DatabaseManagementTemplate
        title="Disciplines Management"
        subtitle={`Manage competition disciplines, formulas, and scoring configurations (${disciplines.length} disciplines loaded)`}
        icon={CogIcon}
        data={filteredDisciplines}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search disciplines..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel="Create Discipline"
        onEdit={handleEdit}
        onDelete={(discipline) => handleDelete(discipline.id)}
        viewStorageKey="disciplines-view"
        itemsPerPage={20}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      {!loading && (
        <DisciplineFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingDiscipline={editingDiscipline}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          formulas={formulas}
          sports={sports}
        />
      )}
    </>
  );
};

export default DisciplinesUnified;
