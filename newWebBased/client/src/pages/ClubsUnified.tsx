import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import { SortableTableHeader, useTableSort } from '../components/SortableTableHeader';
import ClubFormModal from '../components/ClubFormModal';
import { UnifiedConfirmModal } from '../components/UnifiedModal';
import { debugLog } from '../utils/debug';

interface Club {
  int_vereineid: number;
  var_name: string;
  var_website?: string;
  int_gaueid: number;
  int_personenid?: number;
  int_start_ort: number;
  gaue_name?: string;
  var_vorname?: string;
  var_nachname?: string;
  var_email?: string;
  var_telefon?: string;
  athlete_count: number;
}

interface Region {
  id: number;
  name: string;
}

interface Contact {
  int_personenid: number;
  var_vorname: string;
  var_nachname: string;
  var_email?: string;
  var_telefon?: string;
}

interface FormData {
  var_name: string;
  var_website: string;
  int_gaueid: string;
  int_personenid: string;
  int_start_ort: string;
}

const ClubsUnified: React.FC = () => {
  const { t } = useTranslation();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({
    var_name: '',
    var_website: '',
    int_gaueid: '',
    int_personenid: '',
    int_start_ort: '0'
  });

  // Fetch data
  const fetchClubs = async () => {
    setIsLoading(true);
    try {
      // Load all clubs with high limit
      const response = await fetch('/api/clubs?limit=5000');
      if (response.ok) {
        const data = await response.json();
        // The clubs API returns { clubs: [...], pagination: {...} }
        setClubs(Array.isArray(data.clubs) ? data.clubs : []);
      }
    } catch (error) {
      debugLog('Error fetching clubs:', error);
      setClubs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/clubs/data/gaue');
      if (response.ok) {
        const data = await response.json();
        setRegions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      debugLog('Error fetching regions:', error);
      setRegions([]);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/persons');
      if (response.ok) {
        const data = await response.json();
        // The persons API returns { persons: [...], pagination: {...} }
        setContacts(Array.isArray(data.persons) ? data.persons : []);
      }
    } catch (error) {
      debugLog('Error fetching contacts:', error);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchClubs();
    fetchRegions();
    fetchContacts();
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormData({
      var_name: '',
      var_website: '',
      int_gaueid: '',
      int_personenid: '',
      int_start_ort: '0'
    });
    setEditingClub(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (club: Club) => {
    setFormData({
      var_name: club.var_name,
      var_website: club.var_website || '',
      int_gaueid: club.int_gaueid.toString(),
      int_personenid: club.int_personenid?.toString() || '',
      int_start_ort: club.int_start_ort.toString()
    });
    setEditingClub(club);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingClub 
        ? `/api/clubs/${editingClub.int_vereineid}`
        : '/api/clubs';
      
      const method = editingClub ? 'PUT' : 'POST';
      
      const requestData = {
        var_name: formData.var_name,
        var_website: formData.var_website || null,
        int_gaueid: parseInt(formData.int_gaueid),
        int_personenid: formData.int_personenid ? parseInt(formData.int_personenid) : null,
        int_start_ort: parseInt(formData.int_start_ort)
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save club: ${response.status} ${errorText}`);
      }
      
      await fetchClubs();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      debugLog('Error saving club:', error);
      alert(t('clubs.messages.createError'));
    }
  };

  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
  };

  const executeDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/clubs/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete club');
      }
      
      await fetchClubs();
    } catch (error) {
      debugLog('Error deleting club:', error);
      alert(t('clubs.messages.deleteError'));
    }
  };

  // Sort and filter data
  const sortedClubs = sortData(clubs, (club) => {
    if (sortKey === 'gaue_name') return club.gaue_name || '';
    if (sortKey === 'athlete_count') return club.athlete_count;
    if (sortKey === 'var_email') return club.var_email || '';
    if (sortKey === 'var_telefon') return club.var_telefon || '';
    return club[sortKey as keyof Club];
  });

  const filteredData = sortedClubs.filter(club => {
    const matchesSearch = !searchFilter ||
      club.var_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (club.gaue_name && club.gaue_name.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (club.var_vorname && club.var_vorname.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (club.var_nachname && club.var_nachname.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (club.var_vorname && club.var_nachname && `${club.var_vorname} ${club.var_nachname}`.toLowerCase().includes(searchFilter.toLowerCase()));
    
    const matchesRegion = !regionFilter || 
      club.int_gaueid.toString() === regionFilter;
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && club.athlete_count > 0) ||
      (statusFilter === 'inactive' && club.athlete_count === 0) ||
      (statusFilter === 'with_contact' && (club.var_email || club.var_telefon)) ||
      (statusFilter === 'without_contact' && !club.var_email && !club.var_telefon);
    
    return matchesSearch && matchesRegion && matchesStatus;
  });

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchFilter('');
    setRegionFilter('');
    setStatusFilter('');
  };

  // Get filter options for template
  const getFilterOptions = () => [
    {
      value: 'region',
      label: t('clubs.filters.region'),
      selectedValue: regionFilter,
      onChange: setRegionFilter,
      options: [
        ...regions
          .filter(region => region && region.id && region.name)
          .map(region => ({
            value: region.id.toString(),
            label: region.name
          }))
      ]
    },
    {
      value: 'status',
      label: t('clubs.filters.status'),
      selectedValue: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'active', label: t('clubs.filters.active') },
        { value: 'inactive', label: t('clubs.filters.inactive') },
        { value: 'with_contact', label: t('clubs.filters.withContact') },
        { value: 'without_contact', label: t('clubs.filters.withoutContact') }
      ]
    }
  ];

  // Table render functions
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label={t('clubs.table.name')}
        sortKey="var_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('clubs.table.region')}
        sortKey="gaue_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('clubs.table.contact')}
        sortKey="var_email"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('clubs.table.athletes')}
        sortKey="athlete_count"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
        className="text-center"
      />
      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
    </tr>
  );

  const renderTableRow = (club: Club) => (
    <tr key={club.int_vereineid} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{club.var_name}</div>
            {club.var_website && (
              <div className="text-sm text-gray-500">
                <a href={club.var_website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  {club.var_website}
                </a>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <MapPinIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span>{club.gaue_name || t('clubs.noRegion')}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          {club.var_vorname && club.var_nachname && (
            <div className="flex items-center text-sm">
              <UserGroupIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span>{club.var_vorname} {club.var_nachname}</span>
            </div>
          )}
          {club.var_email && (
            <div className="flex items-center text-sm text-gray-600">
              <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span>{club.var_email}</span>
            </div>
          )}
          {club.var_telefon && (
            <div className="flex items-center text-sm text-gray-600">
              <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
              <span>{club.var_telefon}</span>
            </div>
          )}
          {!club.var_vorname && !club.var_nachname && !club.var_email && !club.var_telefon && (
            <span className="text-sm text-gray-400">{t('clubs.noContact')}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          club.athlete_count > 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {club.athlete_count}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleEdit(club)}
            className="text-blue-600 hover:text-blue-800"
            title={t('clubs.editClub')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(club.int_vereineid)}
            className="text-red-600 hover:text-red-800"
            title={t('clubs.deleteClub')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card render function
  const renderCard = (club: Club) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
            {club.var_name}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-2" />
              <span>{club.gaue_name || t('clubs.noRegion')}</span>
            </div>
            
            {club.var_vorname && club.var_nachname && (
              <div className="flex items-center text-sm text-gray-600">
                <UserGroupIcon className="h-4 w-4 mr-2" />
                <span>{club.var_vorname} {club.var_nachname}</span>
              </div>
            )}
            
            {club.var_email && (
              <div className="flex items-center text-sm text-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                <span>{club.var_email}</span>
              </div>
            )}
            
            {club.var_telefon && (
              <div className="flex items-center text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                <span>{club.var_telefon}</span>
              </div>
            )}
            
            {club.var_website && (
              <div className="flex items-center text-sm text-gray-600">
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                <a href={club.var_website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  {club.var_website}
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end space-y-2">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            club.athlete_count > 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {club.athlete_count} {t('clubs.athletes')}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(club)}
              className="text-blue-600 hover:text-blue-800"
              title={t('clubs.editClub')}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(club.int_vereineid)}
              className="text-red-600 hover:text-red-800"
              title={t('clubs.deleteClub')}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title={t('clubs.title')}
        subtitle={t('clubs.subtitle') + ` (${clubs.length} ${t('clubs.clubsLoaded')})`}
        icon={BuildingOfficeIcon}
        data={filteredData}
        isLoading={isLoading}
        searchTerm={searchFilter}
        onSearchChange={setSearchFilter}
        searchPlaceholder={t('clubs.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel={t('clubs.addClub')}
        onEdit={handleEdit}
        onDelete={(club) => handleDelete(club.int_vereineid)}
        viewStorageKey="clubs-view"
        itemsPerPage={50}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      <ClubFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        editingClub={editingClub}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        regions={regions}
        contacts={contacts}
      />

      <UnifiedConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => executeDelete(pendingDeleteId!)}
        title={t('common.confirmDeleteTitle')}
        message={t('clubs.messages.confirmDelete')}
        confirmLabel={t('common.delete')}
        confirmStyle="danger"
      />
    </>
  );
};

export default ClubsUnified;
