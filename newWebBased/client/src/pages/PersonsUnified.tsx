import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import PersonFormModal from '../components/PersonFormModal';

interface Person {
  int_personenid: number;
  var_vorname: string;
  var_nachname: string;
  var_email?: string;
  var_telefon?: string;
  var_fax?: string;
  var_adresse?: string;
  var_plz?: string;
  var_ort?: string;
}

interface FormData {
  var_vorname: string;
  var_nachname: string;
  var_email: string;
  var_telefon: string;
  var_fax: string;
  var_adresse: string;
  var_plz: string;
  var_ort: string;
}

const PersonsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [persons, setPersons] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState<FormData>({
    var_vorname: '',
    var_nachname: '',
    var_email: '',
    var_telefon: '',
    var_fax: '',
    var_adresse: '',
    var_plz: '',
    var_ort: ''
  });

  // Fetch data
  const fetchPersons = async () => {
    setIsLoading(true);
    try {
      // Load all persons with high limit
      const response = await fetch('/api/persons?limit=10000');
      if (response.ok) {
        const data = await response.json();
        // API response has persons wrapped in an object: { persons: [], pagination: {} }
        setPersons(Array.isArray(data.persons) ? data.persons : []);
      }
    } catch (error) {
      console.error('Error fetching persons:', error);
      setPersons([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormData({
      var_vorname: '',
      var_nachname: '',
      var_email: '',
      var_telefon: '',
      var_fax: '',
      var_adresse: '',
      var_plz: '',
      var_ort: ''
    });
    setEditingPerson(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (person: Person) => {
    setFormData({
      var_vorname: person.var_vorname,
      var_nachname: person.var_nachname,
      var_email: person.var_email || '',
      var_telefon: person.var_telefon || '',
      var_fax: person.var_fax || '',
      var_adresse: person.var_adresse || '',
      var_plz: person.var_plz || '',
      var_ort: person.var_ort || ''
    });
    setEditingPerson(person);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPerson 
        ? `/api/persons/${editingPerson.int_personenid}`
        : '/api/persons';
      
      const method = editingPerson ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save person: ${response.status} ${errorText}`);
      }
      
      await fetchPersons();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving person:', error);
      alert(t('persons.messages.createError'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('persons.messages.confirmDelete'))) return;
    
    try {
      const response = await fetch(`/api/persons/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete person');
      }
      
      await fetchPersons();
    } catch (error) {
      console.error('Error deleting person:', error);
      alert(t('persons.messages.deleteError'));
    }
  };

  // Filter data
  const filteredData = persons.filter(person => {
    const fullName = `${person.var_vorname} ${person.var_nachname}`.toLowerCase();
    const matchesSearch = !searchFilter || 
      fullName.includes(searchFilter.toLowerCase()) ||
      (person.var_email && person.var_email.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (person.var_ort && person.var_ort.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesCity = !cityFilter || 
      (person.var_ort && person.var_ort.toLowerCase().includes(cityFilter.toLowerCase()));
    
    let matchesStatus = true;
    if (statusFilter === 'complete') {
      matchesStatus = !!(person.var_vorname && person.var_nachname && person.var_email && person.var_ort);
    } else if (statusFilter === 'incomplete') {
      matchesStatus = !(person.var_vorname && person.var_nachname && person.var_email && person.var_ort);
    }
    
    return matchesSearch && matchesCity && matchesStatus;
  });

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setCityFilter('');
    setStatusFilter('');
  };

  // Get unique cities for filter
  const uniqueCities = Array.from(new Set(
    persons
      .map(person => person.var_ort)
      .filter(city => city && city.trim() !== '')
  )).sort();

  // Get filter options for template
  const getFilterOptions = () => [
    {
      value: 'city',
      label: t('persons.filters.city'),
      selectedValue: cityFilter,
      onChange: setCityFilter,
      options: [
        ...uniqueCities.map(city => ({
          value: city!,
          label: city!
        }))
      ]
    },
    {
      value: 'status',
      label: t('persons.filters.profileStatus'),
      selectedValue: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'complete', label: t('persons.filters.complete') },
        { value: 'incomplete', label: t('persons.filters.incomplete') }
      ]
    }
  ];

  // Table render functions
  const renderTableHeaders = () => (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('persons.table.name')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('persons.table.contact')}</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('persons.table.city')}</th>
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
    </tr>
  );

  const renderTableRow = (person: Person) => (
    <tr key={person.int_personenid} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">
              {person.var_vorname} {person.var_nachname}
            </div>
            <div className="text-sm text-gray-500">ID: {person.int_personenid}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          {person.var_email && (
            <div className="flex items-center text-sm text-gray-900">
              <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
              {person.var_email}
            </div>
          )}
          {person.var_telefon && (
            <div className="flex items-center text-sm text-gray-600">
              <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
              {person.var_telefon}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {person.var_ort && (
          <div className="flex items-center text-sm text-gray-900">
            <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span>
              {person.var_plz && person.var_ort 
                ? `${person.var_plz} ${person.var_ort}`
                : person.var_ort
              }
            </span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleEdit(person)}
            className="text-blue-600 hover:text-blue-800"
            title={t('persons.editPerson')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(person.int_personenid)}
            className="text-red-600 hover:text-red-800"
            title={t('persons.deletePerson')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card render function
  const renderCard = (person: Person) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
            {person.var_vorname} {person.var_nachname}
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-500">ID: {person.int_personenid}</div>
            
            {person.var_email && (
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {person.var_email}
              </div>
            )}
            
            {person.var_telefon && (
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                {person.var_telefon}
              </div>
            )}
            
            {person.var_ort && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPinIcon className="h-4 w-4 mr-2" />
                <span>
                  {person.var_plz && person.var_ort 
                    ? `${person.var_plz} ${person.var_ort}`
                    : person.var_ort
                  }
                </span>
              </div>
            )}
            
            {person.var_adresse && (
              <div className="text-sm text-gray-600">
                {person.var_adresse}
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={() => handleEdit(person)}
            className="text-blue-600 hover:text-blue-800"
            title={t('persons.editPerson')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(person.int_personenid)}
            className="text-red-600 hover:text-red-800"
            title={t('persons.deletePerson')}
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
        title={t('persons.title')}
        subtitle={t('persons.subtitle') + ` (${persons.length} ${t('persons.personsLoaded')})`}
        icon={UserIcon}
        data={filteredData}
        isLoading={isLoading}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder={t('persons.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel={t('persons.addPerson')}
        onEdit={handleEdit}
        onDelete={(person) => handleDelete(person.int_personenid)}
        viewStorageKey="persons-view"
        itemsPerPage={50}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <PersonFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        editingPerson={editingPerson}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default PersonsUnified;
