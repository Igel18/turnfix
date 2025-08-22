import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  BuildingOfficeIcon, 
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV } from '@/utils/csvExport'

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

interface ClubFormData {
  name: string;
  shortName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  website: string;
}

const ClubsNew: React.FC = () => {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState<ClubFormData>({
    name: '',
    shortName: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    email: '',
    website: ''
  });

  useEffect(() => {
    fetchClubs();
  }, [currentPage, searchTerm]);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((currentPage - 1) * 10).toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/clubs?${params}`);

      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 10));
      } else {
        console.error('Error fetching clubs:', response.status);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingClub 
        ? `/api/clubs/${editingClub.int_vereineid}`
        : '/api/clubs';
      
      const method = editingClub ? 'PUT' : 'POST';
      
      const requestBody = {
        name: formData.name,
        shortName: formData.shortName || null,
        address: formData.address || null,
        city: formData.city || null,
        postalCode: formData.postalCode || null,
        country: formData.country || null,
        phoneNumber: formData.phoneNumber || null,
        email: formData.email || null,
        website: formData.website || null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });      if (response.ok) {
        await fetchClubs();
        setShowCreateForm(false);
        setEditingClub(null);
        resetForm();
      } else {
        const errorData = await response.text();
        console.error('Error saving club:', response.status, errorData);
        alert('Error saving club. Please check the console for details.');
      }
    } catch (error) {
      console.error('Error saving club:', error);
      alert('Error saving club. Please try again.');
    }
  };

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setFormData({
      name: club.var_name,
      shortName: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      phoneNumber: club.var_telefon || '',
      email: club.var_email || '',
      website: club.var_website || ''
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (clubId: number) => {
    if (!confirm('Are you sure you want to delete this club?')) return;

    try {
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchClubs();
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Error deleting club');
      }
    } catch (error) {
      console.error('Error deleting club:', error);
      alert('Error deleting club. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      email: '',
      website: ''
    });
    setEditingClub(null);
  };

  // Unified Header Functions
  const getClubStateInfo = (): StateInfo[] => {
    // For now, just use the total count since we don't have isActive field
    const activeClubs = clubs.length
    const inactiveClubs = 0
    
    return [
      { label: 'All', count: clubs.length, value: '', color: 'bg-blue-100 text-blue-800' },
      { label: 'Active', count: activeClubs, value: 'active', color: 'bg-green-100 text-green-800' },
      { label: 'Inactive', count: inactiveClubs, value: 'inactive', color: 'bg-red-100 text-red-800' }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Status',
      value: 'status',
      selectedValue: selectedStatus,
      onChange: setSelectedStatus,
      options: [
        { label: 'All Status', value: '' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' }
      ]
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
  }

  const handleExportCSV = () => {
    const csvData = clubs.map(club => ({
      'Club ID': club.int_vereineid,
      'Club Name': club.var_name,
      'Region': club.gaue_name || '',
      'Contact First Name': club.var_vorname || '',
      'Contact Last Name': club.var_nachname || '',
      'Phone': club.var_telefon || '',
      'Email': club.var_email || '',
      'Website': club.var_website || '',
      'Athletes': club.athlete_count
    }))
    
    const csvExportData = {
      filename: 'clubs-export',
      headers: Object.keys(csvData[0] || {}),
      data: csvData
    }
    exportToCSV(csvExportData)
  }

  // Filter clubs based on search and status
  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (club.gaue_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (club.var_vorname?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (club.var_nachname?.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = selectedStatus === ''
                         // Since we don't have status field, all clubs are considered active for now
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Club Management"
        description={`Manage gymnastics clubs and organizations (${clubs.length} clubs loaded)`}
        icon={BuildingOfficeIcon}
        stateInfo={getClubStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search clubs..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Add Club',
          icon: PlusIcon,
          onClick: () => setShowCreateForm(true)
        }}
        totalCount={filteredClubs.length}
      />

      {/* Clubs List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredClubs.length === 0 ? (
          <div className="p-8 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No clubs found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Create your first club
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredClubs.map((club) => (
              <div key={club.int_vereineid} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {club.var_name}
                      </h3>
                      {club.gaue_name && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {club.gaue_name}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      {(club.var_vorname || club.var_nachname) && (
                        <div className="flex items-start gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Contact: {[club.var_vorname, club.var_nachname].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      )}
                      
                      {club.var_telefon && (
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{club.var_telefon}</span>
                        </div>
                      )}
                      
                      {club.var_email && (
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                          <a href={`mailto:${club.var_email}`} className="text-blue-600 hover:text-blue-800">
                            {club.var_email}
                          </a>
                        </div>
                      )}
                      
                      {club.var_website && (
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="h-4 w-4 flex-shrink-0" />
                          <a 
                            href={club.var_website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {club.var_website}
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        {club.athlete_count} athletes
                      </div>
                      <div>
                        Club ID: {club.int_vereineid}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(club)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(club.int_vereineid)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingClub ? 'Edit Club' : 'Create Club'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Club Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({...formData, shortName: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  {editingClub ? 'Update Club' : 'Create Club'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubsNew;
