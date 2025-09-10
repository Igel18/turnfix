import React, { useState, useEffect } from 'react';
import { DatabaseManagementTemplate } from '../components/DatabaseManagementTemplate';
import ParticipantFormModal from '../components/ParticipantFormModal';
import { 
  UserGroupIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface Participant {
  int_teilnehmerid: number;
  var_nachname: string;
  var_vorname: string;
  dat_geburtstag: string;
  int_geschlecht: number;
  int_vereineid: number;
  verein_name: string;
  geschlecht_name: string;
  age: number | null;
  int_startpassnummer: number | null;
}

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface FormData {
  var_nachname: string;
  var_vorname: string;
  dat_geburtsdatum: string;
  var_geschlecht: string;
  int_vereineid: number;
  int_startpassnummer: string;
}

const ParticipantsUnified: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [clubFilter, setClubFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    var_nachname: '',
    var_vorname: '',
    dat_geburtsdatum: '',
    var_geschlecht: '',
    int_vereineid: 0,
    int_startpassnummer: ''
  });

  const fetchParticipants = async () => {
    try {
      const response = await fetch('/api/participants');
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      setParticipants(Array.isArray(data.participants) ? data.participants : []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/clubs');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      const data = await response.json();
      setClubs(Array.isArray(data.clubs) ? data.clubs : []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchParticipants(), fetchClubs()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      var_nachname: '',
      var_vorname: '',
      dat_geburtsdatum: '',
      var_geschlecht: '',
      int_vereineid: 0,
      int_startpassnummer: ''
    });
    setEditingParticipant(null);
  };

  const handleCreate = () => {
    if (loading) {
      alert('Please wait for data to load before creating a participant.');
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (participant: Participant) => {
    if (loading) {
      alert('Please wait for data to load before editing a participant.');
      return;
    }
    
    // Format date for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      var_nachname: participant.var_nachname,
      var_vorname: participant.var_vorname,
      dat_geburtsdatum: formatDateForInput(participant.dat_geburtstag),
      var_geschlecht: participant.int_geschlecht.toString(),
      int_vereineid: participant.int_vereineid,
      int_startpassnummer: participant.int_startpassnummer?.toString() || ''
    });
    setEditingParticipant(participant);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this participant?')) return;
    
    try {
      const response = await fetch(`/api/participants/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete participant');
      
      setParticipants(participants.filter(p => p.int_teilnehmerid !== id));
    } catch (error) {
      console.error('Error deleting participant:', error);
      alert('Failed to delete participant');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingParticipant 
        ? `/api/participants/${editingParticipant.int_teilnehmerid}`
        : '/api/participants';
      
      const method = editingParticipant ? 'PUT' : 'POST';
      
      const requestData = {
        var_nachname: formData.var_nachname,
        var_vorname: formData.var_vorname,
        dat_geburtstag: formData.dat_geburtsdatum,  // Note: API expects dat_geburtstag
        int_geschlecht: parseInt(formData.var_geschlecht),
        int_vereineid: formData.int_vereineid,
        int_startpassnummer: formData.int_startpassnummer ? parseInt(formData.int_startpassnummer) : null
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save participant: ${response.status} ${errorText}`);
      }
      
      await fetchParticipants();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving participant:', error);
      alert('Failed to save participant');
    }
  };

  // Clear all filters
  const handleClearAllFilters = () => {
    setClubFilter('');
    setGenderFilter('');
    setAgeFilter('');
  };

  // Filter and search participants
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = searchTerm === '' || 
      participant.var_vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.var_nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.verein_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClub = !clubFilter || participant.int_vereineid.toString() === clubFilter;
    
    const matchesGender = !genderFilter || participant.int_geschlecht.toString() === genderFilter;
    
    const matchesAge = !ageFilter || 
      (ageFilter === 'child' && participant.age && participant.age < 12) ||
      (ageFilter === 'youth' && participant.age && participant.age >= 12 && participant.age < 18) ||
      (ageFilter === 'adult' && participant.age && participant.age >= 18);
    
    return matchesSearch && matchesClub && matchesGender && matchesAge;
  });

  // Filter options for the template
  const getFilterOptions = () => [
    {
      value: '',
      label: 'Club',
      selectedValue: clubFilter,
      onChange: setClubFilter,
      options: [
        { value: '', label: 'All Clubs' },
        ...(Array.isArray(clubs) ? clubs.map(club => ({ 
          value: club.int_vereineid.toString(), 
          label: club.var_name 
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
        { value: '1', label: 'Male' },
        { value: '2', label: 'Female' }
      ]
    },
    {
      value: '',
      label: 'Age Group',
      selectedValue: ageFilter,
      onChange: setAgeFilter,
      options: [
        { value: '', label: 'All Ages' },
        { value: 'child', label: 'Children (< 12)' },
        { value: 'youth', label: 'Youth (12-17)' },
        { value: 'adult', label: 'Adults (18+)' }
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
        Age
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Gender
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Club
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Start Number
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  );

  // Render table row
  const renderTableRow = (participant: Participant) => {
    return (
      <tr key={participant.int_teilnehmerid} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {participant.var_vorname} {participant.var_nachname}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(participant.dat_geburtstag).toLocaleDateString()}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {participant.age || 'N/A'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            participant.int_geschlecht === 1 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-pink-100 text-pink-800'
          }`}>
            {participant.geschlecht_name}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {participant.verein_name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {participant.int_startpassnummer || '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(participant)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
              title="Edit participant"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(participant.int_teilnehmerid)}
              className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
              title="Delete participant"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // Render card view
  const renderCard = (participant: Participant) => {
    return (
      <div key={participant.int_teilnehmerid} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <UserGroupIcon className="w-8 h-8 text-gray-400 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {participant.var_vorname} {participant.var_nachname}
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {new Date(participant.dat_geburtstag).toLocaleDateString()}
                {participant.age && ` (${participant.age} years)`}
              </p>
            </div>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handleEdit(participant)}
              className="text-blue-600 hover:text-blue-800 p-1 rounded-md hover:bg-blue-50"
              title="Edit participant"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(participant.int_teilnehmerid)}
              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50"
              title="Delete participant"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Gender</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                participant.int_geschlecht === 1 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-pink-100 text-pink-800'
              }`}>
                {participant.geschlecht_name}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Start Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{participant.int_startpassnummer || 'Not assigned'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm font-medium text-gray-500">Club</dt>
            <dd className="mt-1 text-sm text-gray-900 flex items-center">
              <BuildingOfficeIcon className="w-4 h-4 mr-1 text-gray-400" />
              {participant.verein_name}
            </dd>
          </div>
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
        title="Athletes Management"
        subtitle={`Manage competition participants and athlete information (${participants.length} athletes loaded)`}
        icon={UserGroupIcon}
        data={filteredParticipants}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search athletes..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onAdd={handleCreate}
        addLabel="Add Athlete"
        onEdit={handleEdit}
        onDelete={(participant) => handleDelete(participant.int_teilnehmerid)}
        viewStorageKey="participants-view"
        itemsPerPage={20}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
      />

      {!loading && (
        <ParticipantFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingParticipant={editingParticipant}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          clubs={clubs}
        />
      )}
    </>
  );
};

export default ParticipantsUnified;
