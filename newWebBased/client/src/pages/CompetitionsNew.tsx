import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  PlusIcon, 
  CalendarDaysIcon, 
  MapPinIcon, 
  UserGroupIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  InformationCircleIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface Competition {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'MIXED';
  status: 'PLANNED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  maxParticipants?: number;
  registrationDeadline?: string;
  isPublic: boolean;
  participantCount: number;
  createdAt: string;
}

interface CompetitionFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'MIXED';
  maxParticipants: number | '';
  registrationDeadline: string;
  isPublic: boolean;
}

const CompetitionsNew: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { selectedEvent, selectedCompetition, selectedSquad } = useEvent()
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlCompetitionId = searchParams.get('competitionId') 
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId
  const squadName = selectedSquad?.squad_name || urlSquadName
  
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState<CompetitionFormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    type: 'INDIVIDUAL',
    maxParticipants: '',
    registrationDeadline: '',
    isPublic: true
  });

  const competitionTypes = [
    { value: 'INDIVIDUAL', label: 'Individual Competition' },
    { value: 'TEAM', label: 'Team Competition' },
    { value: 'MIXED', label: 'Mixed Competition' }
  ];

  const statusOptions = [
    { value: 'PLANNED', label: 'Planned', color: 'bg-gray-100 text-gray-800' },
    { value: 'REGISTRATION_OPEN', label: 'Registration Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'REGISTRATION_CLOSED', label: 'Registration Closed', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-green-100 text-green-800' },
    { value: 'COMPLETED', label: 'Completed', color: 'bg-purple-100 text-purple-800' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchCompetitions();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchCompetitions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((currentPage - 1) * 10).toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCompetitions(data.events || data.competitions || []);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 10));
      }
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCompetition 
        ? `http://localhost:3001/api/events/${editingCompetition.id}`
        : 'http://localhost:3001/api/events';
      
      const method = editingCompetition ? 'PUT' : 'POST';
      
      const requestBody = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        location: formData.location,
        type: formData.type,
        maxParticipants: formData.maxParticipants ? Number(formData.maxParticipants) : null,
        registrationDeadline: formData.registrationDeadline || null,
        isPublic: formData.isPublic
      };
      
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        await fetchCompetitions();
        setShowCreateForm(false);
        setEditingCompetition(null);
        resetForm();
      } else {
        console.error('Error saving competition:', response.status);
      }
    } catch (error) {
      console.error('Error saving competition:', error);
    }
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      name: competition.name,
      description: competition.description || '',
      startDate: competition.startDate.split('T')[0],
      endDate: competition.endDate.split('T')[0],
      location: competition.location || '',
      type: competition.type,
      maxParticipants: competition.maxParticipants || '',
      registrationDeadline: competition.registrationDeadline ? competition.registrationDeadline.split('T')[0] : '',
      isPublic: competition.isPublic
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (competitionId: number) => {
    if (!confirm('Are you sure you want to delete this competition?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${competitionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchCompetitions();
      }
    } catch (error) {
      console.error('Error deleting competition:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      location: '',
      type: 'INDIVIDUAL',
      maxParticipants: '',
      registrationDeadline: '',
      isPublic: true
    });
    setEditingCompetition(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption || { value: status, label: status, color: 'bg-gray-100 text-gray-800' };
  };

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
    <div className="p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 mb-4">
        <Link 
          to="/dashboard" 
          className="text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center"
        >
          <HomeIcon className="h-5 w-5 mr-1" />
          Dashboard
        </Link>
        <span className="text-gray-500">/</span>
        <span className="text-gray-900 font-medium">Competitions</span>
      </nav>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitions</h1>
          <p className="text-gray-600">Manage gymnastics competitions and events</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Competition
        </button>
      </div>

      {/* Event Selection Context */}
      {(eventId || competitionId || squadName) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Selected Context:</strong>
              {eventId && <span key="event-id"> Event: {selectedEvent?.var_eventname || `Event ID ${eventId}`}</span>}
              {competitionId && <span key="competition-id"> • Competition ID: {competitionId}</span>}
              {squadName && <span key="squad-name"> • Squad: {squadName}</span>}
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Competitions are filtered based on your selection from the dashboard.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search competitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Competitions List */}
      <div className="bg-white rounded-lg shadow-sm">
        {competitions.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No competitions found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Create your first competition
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {competitions.map((competition) => (
              <div key={competition.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {competition.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(competition.status).color}`}>
                        {getStatusBadge(competition.status).label}
                      </span>
                    </div>
                    
                    {competition.description && (
                      <p className="text-gray-600 mb-3">{competition.description}</p>
                    )}
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div key="date" className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        {formatDate(competition.startDate)} - {formatDate(competition.endDate)}
                      </div>
                      {competition.location && (
                        <div key="location" className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {competition.location}
                        </div>
                      )}
                      <div key="participants" className="flex items-center gap-1">
                        <UserGroupIcon className="h-4 w-4" />
                        {competition.participantCount} participants
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      key={`edit-${competition.id}`}
                      onClick={() => handleEdit(competition)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      key={`delete-${competition.id}`}
                      onClick={() => handleDelete(competition.id)}
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
            key="pagination-prev"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Previous
          </button>
          <span key="pagination-info" className="px-3 py-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            key="pagination-next"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingCompetition ? 'Edit Competition' : 'Create Competition'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {competitionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                  Public competition
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  key="form-submit"
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  {editingCompetition ? 'Update' : 'Create'}
                </button>
                <button
                  key="form-cancel"
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

export default CompetitionsNew;
