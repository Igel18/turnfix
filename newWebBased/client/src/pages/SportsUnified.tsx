import React, { useState, useEffect } from 'react';
import {
  BeakerIcon,
  PencilIcon,
  TrashIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import SportFormModal from '../components/SportFormModal';

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count?: number;
}

interface Discipline {
  id: number;
  name: string;
  sport_id: number;
}

interface FormData {
  var_name: string;
}

const SportsUnified: React.FC = () => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [disciplineCountFilter, setDisciplineCountFilter] = useState('');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    var_name: ''
  });

  // Fetch data
  const fetchSports = async () => {
    setIsLoading(true);
    try {
      // Load both sports and disciplines
      const [sportsResponse, disciplinesResponse] = await Promise.all([
        fetch('/api/sports?limit=5000'),
        fetch('/api/disciplines?limit=10000')
      ]);

      let sportsData: Sport[] = [];
      let disciplinesData: Discipline[] = [];

      if (sportsResponse.ok) {
        const data = await sportsResponse.json();
        sportsData = Array.isArray(data.sports) ? data.sports : [];
        setSports(sportsData);
      }

      if (disciplinesResponse.ok) {
        const data = await disciplinesResponse.json();
        // Disciplines API returns data directly as an array, not wrapped in an object
        disciplinesData = Array.isArray(data) ? data : [];
      }

      // Calculate discipline count for each sport
      const sportsWithCounts = sportsData.map(sport => ({
        ...sport,
        discipline_count: disciplinesData.filter(discipline => discipline.sport_id === sport.int_sportid).length
      }));

      setSports(sportsWithCounts);
    } catch (error) {
      console.error('Error fetching sports:', error);
      setSports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormData({
      var_name: ''
    });
    setEditingSport(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (sport: Sport) => {
    setFormData({
      var_name: sport.var_name
    });
    setEditingSport(sport);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.var_name.trim()) {
      alert('Please enter a sport name');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingSport 
        ? `/api/sports/${editingSport.int_sportid}`
        : '/api/sports';
      
      const method = editingSport ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save sport: ${response.status} ${errorText}`);
      }
      
      await fetchSports();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving sport:', error);
      alert('Failed to save sport');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sport? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/sports/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete sport');
      }
      
      await fetchSports();
    } catch (error) {
      console.error('Error deleting sport:', error);
      alert('Failed to delete sport');
    }
  };

  // Sort and filter data
  const sortedSports = sortData(sports, (sport) => {
    if (sortKey === 'discipline_count') return sport.discipline_count || 0;
    return sport[sortKey as keyof Sport];
  });

  const filteredData = sortedSports.filter(sport => {
    const matchesSearch = !searchFilter || 
      sport.var_name.toLowerCase().includes(searchFilter.toLowerCase());
    
    let matchesDisciplineCount = true;
    if (disciplineCountFilter === 'with-disciplines') {
      matchesDisciplineCount = (sport.discipline_count || 0) > 0;
    } else if (disciplineCountFilter === 'without-disciplines') {
      matchesDisciplineCount = (sport.discipline_count || 0) === 0;
    }
    
    return matchesSearch && matchesDisciplineCount;
  });

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setDisciplineCountFilter('');
  };

  // Get filter options for template
  const getFilterOptions = () => [
    {
      value: 'discipline-count',
      label: 'Discipline Status',
      selectedValue: disciplineCountFilter,
      onChange: setDisciplineCountFilter,
      options: [
        { value: '', label: 'All Sports' },
        { value: 'with-disciplines', label: 'Has Disciplines' },
        { value: 'without-disciplines', label: 'No Disciplines' }
      ]
    }
  ];

  // Table render functions
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label="Sport Name"
        sortKey="var_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label="Disciplines"
        sortKey="discipline_count"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
    </tr>
  );

  const renderTableRow = (sport: Sport) => (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <BeakerIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{sport.var_name}</div>
            <div className="text-sm text-gray-500">ID: {sport.int_sportid}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <HashtagIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-sm text-gray-900">
            {sport.discipline_count || 0} discipline{(sport.discipline_count || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleEdit(sport)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit Sport"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(sport.int_sportid)}
            className="text-red-600 hover:text-red-800"
            title="Delete Sport"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card render function
  const renderCard = (sport: Sport) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <BeakerIcon className="h-5 w-5 text-gray-400 mr-2" />
            {sport.var_name}
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">ID: {sport.int_sportid}</div>
            
            <div className="flex items-center text-sm text-gray-600">
              <HashtagIcon className="h-4 w-4 mr-2" />
              <span>
                {sport.discipline_count || 0} discipline{(sport.discipline_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            
            {(sport.discipline_count || 0) === 0 && (
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                No disciplines
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={() => handleEdit(sport)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit Sport"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(sport.int_sportid)}
            className="text-red-600 hover:text-red-800"
            title="Delete Sport"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title="Sports Management"
        subtitle={`Manage sports categories and types (${sports.length} sports loaded)`}
        icon={BeakerIcon}
        data={filteredData}
        isLoading={isLoading}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder="Search sports by name..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel="Add Sport"
        onEdit={handleEdit}
        onDelete={(sport) => handleDelete(sport.int_sportid)}
        viewStorageKey="sports-view"
        itemsPerPage={50}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <SportFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        editingSport={editingSport}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default SportsUnified;
