import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Trophy,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Edit
} from 'lucide-react';
import { 
  UsersIcon,
  DocumentArrowDownIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiDelete, apiPut } from '../utils/api';
import { setupPDFWithHeaderFooter } from '../utils/pdfUtils';
import SmartPagination from '@/components/SmartPagination';
import { usePagination } from '@/hooks/usePagination';
import useViewToggle from '@/hooks/useViewToggle';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface for participant data
interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female';
  birthYear: number;
  age: number;
  squad_name?: string;
  startet_nicht: boolean;
  startNumber?: number | null;
  isInEvent: boolean;
  assignedCompetitions: number[];
  registrationDate?: string;
}

// Interface for competition data
interface Competition {
  id: number;
  name: string;
  number?: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  eventId: number;
  participantCount: number;
  maxParticipants?: number;
  registrationDeadline?: string;
}

// Interface for edit form data
interface EditParticipantData {
  firstname: string;
  lastname: string;
  clubId: number;
  birthday: string;
  gender: 'male' | 'female';
  squad_name: string;
  startet_nicht: boolean;
  assignedCompetitions: number[];
}

// Interface for club data
interface Club {
  id: number;
  name: string;
}

// Edit Participant Form Component
interface EditParticipantFormProps {
  participant: Participant;
  eventId: string;
  clubs: Club[];
  competitions: Competition[];
  onSave: (data: EditParticipantData) => Promise<void>;
  onCancel: () => void;
}

const EditParticipantForm: React.FC<EditParticipantFormProps> = ({ participant, clubs, competitions, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EditParticipantData>({
    firstname: participant.firstname,
    lastname: participant.lastname,
    clubId: participant.clubId,
    birthday: participant.birthYear ? `${participant.birthYear}-01-01` : '',
    gender: participant.gender,
    squad_name: participant.squad_name || '',
    startet_nicht: participant.startet_nicht,
    assignedCompetitions: participant.assignedCompetitions || []
  });
  const [saving, setSaving] = useState(false);

  // Calculate age from birthday
  const calculateAge = (birthday: string): number => {
    if (!birthday) return 0;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstname.trim() || !formData.lastname.trim()) {
      alert(t('eventParticipants.editParticipant.validationError'));
      return;
    }
    
    const age = calculateAge(formData.birthday);
    if (age < 1 || age > 100) {
      alert(t('eventParticipants.editParticipant.ageValidationError'));
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving participant:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border">
      <h4 className="text-lg font-medium text-gray-900 mb-4">{t('eventParticipants.editParticipant.title')}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventParticipants.editParticipant.firstName')} *</label>
          <input
            type="text"
            required
            value={formData.firstname}
            onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventParticipants.editParticipant.lastName')} *</label>
          <input
            type="text"
            required
            value={formData.lastname}
            onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventParticipants.editParticipant.club')}</label>
          <select
            value={formData.clubId}
            onChange={(e) => setFormData({ ...formData, clubId: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option key="select-club-0" value={0}>{t('eventParticipants.editParticipant.selectClub')}</option>
            {clubs
              .filter(club => club && typeof club.id !== 'undefined' && club.id !== null)
              .map(club => (
                <option key={`club-${club.id}`} value={club.id}>{club.name}</option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.birthday')} * <span className="text-sm text-gray-500">({t('eventParticipants.editParticipant.age')}: {calculateAge(formData.birthday)})</span>
          </label>
          <input
            type="date"
            required
            value={formData.birthday}
            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventParticipants.editParticipant.gender')}</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="male">{t('eventParticipants.editParticipant.male')}</option>
            <option value="female">{t('eventParticipants.editParticipant.female')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('eventParticipants.editParticipant.squad')}</label>
          <input
            type="text"
            value={formData.squad_name}
            onChange={(e) => setFormData({ ...formData, squad_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('eventParticipants.editParticipant.squadPlaceholder')}
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.startet_nicht}
              onChange={(e) => setFormData({ ...formData, startet_nicht: e.target.checked })}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">{t('eventParticipants.editParticipant.notStarting')}</span>
          </label>
        </div>
      </div>

      {/* Competition Assignments */}
      <div className="mt-6">
        <h5 className="text-sm font-medium text-gray-700 mb-3">{t('eventParticipants.editParticipant.competitionAssignments')}</h5>
        <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
          {competitions.length === 0 ? (
            <p className="text-sm text-gray-500">{t('eventParticipants.editParticipant.loadingCompetitions')}</p>
          ) : (
            competitions.map((competition: Competition) => (
              <label key={`competition-${competition.id}`} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.assignedCompetitions.includes(competition.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        assignedCompetitions: [...formData.assignedCompetitions, competition.id]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        assignedCompetitions: formData.assignedCompetitions.filter(id => id !== competition.id)
                      });
                    }
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {competition.name}{competition.number ? ` (Nr. ${competition.number})` : ''} ({competition.gender}, Ages {competition.ageFrom}-{competition.ageTo})
                </span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {t('eventParticipants.editParticipant.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? t('eventParticipants.editParticipant.saving') : t('eventParticipants.editParticipant.save')}
        </button>
      </div>
    </form>
  );
};

const EventParticipants: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // State for participants and competitions
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // State for participant counts from API
  const [totalInEvent, setTotalInEvent] = useState<number>(0);
  
  // UI state
  const [selectedTab] = useState<'participants' | 'assign'>('participants');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination hook with automatic reset on filter changes
  const pagination = usePagination({ 
    itemsPerPage: 50,
    resetDependencies: [searchTerm, genderFilter, clubFilter, ageFilter]
  });
  
  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'event-participants', 
    defaultView: 'table' 
  });
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalSearchTerm, setAddModalSearchTerm] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<number | null>(null);
  
  // PDF Label Configuration Modal State
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelConfig, setLabelConfig] = useState({
    rows: 8,
    columns: 4,
    width: 48.5, // mm
    height: 16.9, // mm
    marginTop: 15, // mm
    marginLeft: 10, // mm
    marginRight: 10, // mm
    marginBottom: 15, // mm
    showBorders: true
  });

  // Load label configuration from server on mount
  useEffect(() => {
    const loadLabelConfig = async () => {
      try {
        const config = await apiGet('/configuration');
        if (config?.printing) {
          setLabelConfig({
            rows: config.printing.labelRows || 8,
            columns: config.printing.labelColumns || 4,
            width: config.printing.labelWidth || 48.5,
            height: config.printing.labelHeight || 16.9,
            marginTop: config.printing.labelMarginTop || 15,
            marginLeft: config.printing.labelMarginLeft || 10,
            marginRight: config.printing.labelMarginRight || 10,
            marginBottom: config.printing.labelMarginBottom || 15,
            showBorders: config.printing.labelShowBorders !== undefined ? config.printing.labelShowBorders : true
          });
        }
      } catch (error) {
        console.error('Failed to load label configuration, using defaults:', error);
        // Keep default values if loading fails
      }
    };
    loadLabelConfig();
  }, []);

  useEffect(() => {
    if (eventId) {
      // Add a small delay to prevent simultaneous API calls from multiple components
      const timeoutId = setTimeout(() => {
        loadParticipants();
        loadAvailableParticipants();
        loadCompetitions();
        loadClubs();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      const data = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=false`)
      setAllParticipants(data.participants || []);
      setTotalInEvent(data.totalInEvent || 0);
      console.log(`Loaded ${data.participants?.length || 0} participants from API (${data.totalInEvent || 0} in event)`);
    } catch (error: any) {
      console.error('Error loading participants:', error);
      
      // Handle rate limiting gracefully
      if (error.message?.includes('429')) {
        console.warn('Rate limited while loading participants, will retry...');
        // Don't show error to user for rate limiting, the API will handle retry
        return;
      }
      
      // Use mock data for other errors
      setAllParticipants([
        {
          id: 1,
          firstname: 'Max',
          lastname: 'Mustermann',
          club: 'TSV München',
          clubId: 1,
          gender: 'male',
          birthYear: 2008,
          age: 16,
          squad_name: 'mBlau',
          startet_nicht: false,
          isInEvent: true,
          assignedCompetitions: [1, 3],
          registrationDate: '2023-10-15',
          startNumber: 1
        }
      ]);
    }
  };

  const loadAvailableParticipants = async () => {
    try {
      // Load all participants (not just event participants)
      const data = await apiGet('/participants');
      console.log('Available participants data:', data);
      
      let participants = [];
      // Handle different response structures
      if (Array.isArray(data)) {
        participants = data;
      } else if (data && Array.isArray(data.participants)) {
        participants = data.participants;
      } else {
        console.warn('Unexpected participants data structure:', data);
        setAvailableParticipants([]);
        return;
      }

      // Normalize the participant data structure
      const normalizedParticipants = participants.map((p: any) => ({
        id: p.id || p.int_teilnehmerid,
        firstname: p.firstname || p.var_vorname,
        lastname: p.lastname || p.var_nachname, 
        club: p.club || p.verein_name,
        clubId: p.clubId || p.int_vereineid,
        gender: p.gender || p.geschlecht_name,
        age: p.age,
        birthYear: p.birthYear || (p.dat_geburtstag ? new Date(p.dat_geburtstag).getFullYear() : null),
        squad_name: p.squad_name,
        startet_nicht: p.startet_nicht || false,
        isInEvent: p.isInEvent || false,
        assignedCompetitions: p.assignedCompetitions || [],
        registrationDate: p.registrationDate,
        startNumber: p.startNumber || p.int_startnummer
      }));

      setAvailableParticipants(normalizedParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  const loadCompetitions = async () => {
    try {
      let url = '/competitions';
      if (eventId) {
        url += `?eventId=${eventId}`;
      }
      
      const data = await apiGet(url)
      setCompetitions(data);
    } catch (error) {
      console.error('Error loading competitions:', error);
      // Fallback mock data
      const mockCompetitions: Competition[] = [
        {
          id: 1,
          name: 'Men 16-18 Floor Exercise',
          number: '0001',
          gender: 'männlich',
          ageFrom: 16,
          ageTo: 18,
          eventId: parseInt(eventId || '1'),
          participantCount: 12,
          maxParticipants: 20
        },
        {
          id: 2,
          name: 'Women 14-16 Uneven Bars',
          number: '0002',
          gender: 'weiblich',
          ageFrom: 14,
          ageTo: 16,
          eventId: parseInt(eventId || '1'),
          participantCount: 8,
          maxParticipants: 15
        }
      ];
      setCompetitions(mockCompetitions);
    }
  };

  const loadClubs = async () => {
    try {
      const data = await apiGet('/clubs');
      console.log('Raw clubs data:', data);
      
      let clubsArray = [];
      if (Array.isArray(data)) {
        clubsArray = data;
      } else if (data && Array.isArray(data.clubs)) {
        clubsArray = data.clubs;
      } else {
        console.warn('Unexpected clubs data structure:', data);
        setClubs([]);
        return;
      }

      // Filter and validate clubs data
      const validClubs = clubsArray
        .filter((club: any) => club && typeof club === 'object')
        .map((club: any) => ({
          id: club.id || club.int_vereineid,
          name: club.name || club.var_name || 'Unknown Club'
        }))
        .filter((club: Club) => club.id && club.id !== undefined && club.id !== null);

      console.log('Processed clubs:', validClubs);
      setClubs(validClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
      setClubs([]);
    }
  };

  const updateParticipantStatus = async (participantId: number, startetNicht: boolean) => {
    try {
      await apiPut('/event-participants/update-status', {
        participantId,
        eventId: parseInt(eventId!),
        startetNicht
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
            ? { ...p, startet_nicht: startetNicht }
            : p
        )
      );
      console.log(`Successfully updated participant ${participantId} status to startet_nicht: ${startetNicht}`);
    } catch (error) {
      console.error('Error updating participant status:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  const updateParticipantDetails = async (participantId: number, updatedData: EditParticipantData) => {
    try {
      // Calculate age from birthday
      const age = updatedData.birthday ? 
        new Date().getFullYear() - new Date(updatedData.birthday).getFullYear() : 0;

      await apiPut('/event-participants/update-details', {
        participantId,
        eventId: parseInt(eventId!),
        ...updatedData,
        age // Send calculated age to backend
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
            ? { 
                ...p, 
                firstname: updatedData.firstname,
                lastname: updatedData.lastname,
                clubId: updatedData.clubId,
                club: clubs.find(c => c.id === updatedData.clubId)?.name || p.club, // Update club name
                birthYear: updatedData.birthday ? new Date(updatedData.birthday).getFullYear() : p.birthYear,
                age: age,
                gender: updatedData.gender,
                squad_name: updatedData.squad_name,
                startet_nicht: updatedData.startet_nicht,
                assignedCompetitions: updatedData.assignedCompetitions
              }
            : p
        )
      );
      console.log(`Successfully updated participant ${participantId} details`);
    } catch (error) {
      console.error('Error updating participant details:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  const addParticipantToEvent = async (participantId: number) => {
    try {
      await apiPost('/event-participants/add', {
        eventId: parseInt(eventId!),
        participantId: participantId
      });

      // Reload participants to get updated list
      await loadParticipants();
      console.log(`Successfully added participant ${participantId} to event`);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding participant to event:', error);
      alert(t('eventParticipants.messages.addError'));
    }
  };

  const removeParticipantFromEvent = async (participantId: number) => {
    if (!confirm(t('eventParticipants.messages.confirmRemove'))) {
      return;
    }
    
    try {
      await apiDelete(`/event-participants/remove?eventId=${eventId}&participantId=${participantId}`)

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
            ? { ...p, isInEvent: false, assignedCompetitions: [], registrationDate: undefined }
              : p
          )
        );
        console.log(`Successfully removed participant ${participantId} from event`);
    } catch (error) {
      console.error('Error removing participant from event:', error);
      alert(t('eventParticipants.messages.removeError'));
    }
  };

  const assignParticipantToCompetition = async (participantId: number, competitionId: number) => {
    try {
      await apiPost('/event-participants/assign', {
        participantId: participantId,
        competitionId: competitionId
      });

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId && !p.assignedCompetitions.includes(competitionId)
            ? { ...p, assignedCompetitions: [...p.assignedCompetitions, competitionId] }
            : p
        )
      );
      console.log(`Successfully assigned participant ${participantId} to competition ${competitionId}`);
    } catch (error) {
      console.error('Error assigning participant to competition:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  const unassignParticipantFromCompetition = async (participantId: number, competitionId: number) => {
    try {
      await apiDelete(`/event-participants/unassign?participantId=${participantId}&competitionId=${competitionId}`)

      // Update UI optimistically
      setAllParticipants(participants =>
        participants.map(p =>
          p.id === participantId
              ? { ...p, assignedCompetitions: p.assignedCompetitions.filter(c => c !== competitionId) }
              : p
          )
        );
        console.log(`Successfully unassigned participant ${participantId} from competition ${competitionId}`);
    } catch (error) {
      console.error('Error unassigning participant from competition:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  const isParticipantEligibleForCompetition = (participant: Participant, competition: Competition): boolean => {
    // Check age eligibility
    if (participant.age < competition.ageFrom || participant.age > competition.ageTo) {
      return false;
    }
    
    // Check gender eligibility
    if (competition.gender === 'männlich' && participant.gender !== 'male') {
      return false;
    }
    if (competition.gender === 'weiblich' && participant.gender !== 'female') {
      return false;
    }
    
    return true;
  };

  // PDF Export Functions
  const exportParticipantsListPDF = () => {
    const eventParticipants = filteredParticipants.filter(p => p.isInEvent)
    
    if (!selectedEvent || eventParticipants.length === 0) {
      alert(t('eventParticipants.messages.noParticipantsToExport'))
      return
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent, 'Event Participants List')
    
    // Prepare data for the table
    const tableData = eventParticipants.map((participant, index) => [
      (index + 1).toString(),
      `${participant.firstname} ${participant.lastname}`,
      participant.club,
      participant.gender === 'male' ? t('eventParticipants.editParticipant.male') : t('eventParticipants.editParticipant.female'),
      participant.age.toString(),
      participant.birthYear.toString(),
      participant.startet_nicht ? t('eventParticipants.status.notStarting') : t('eventParticipants.status.active')
    ])

    autoTable(doc, {
      head: [['#', 'Name', 'Club', 'Gender', 'Age', 'Birth Year', 'Status']],
      body: tableData,
      startY: contentArea.startY + 10,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 135, 245],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `event-participants-list-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`
    
    doc.save(filename)
  }

  const exportParticipantsLabelsPDF = () => {
    const eventParticipants = filteredParticipants.filter(p => p.isInEvent)
    
    if (!selectedEvent || eventParticipants.length === 0) {
      alert(t('eventParticipants.messages.noParticipantsToExport'))
      return
    }

    // Sort participants by: 1. Gender, 2. Squad, 3. Club
    const sortedParticipants = [...eventParticipants].sort((a, b) => {
      // Primary sort: Gender (male first, then female)
      const genderOrder = { 'male': 0, 'female': 1, 'unknown': 2 };
      const genderA = genderOrder[a.gender as keyof typeof genderOrder] ?? 2;
      const genderB = genderOrder[b.gender as keyof typeof genderOrder] ?? 2;
      
      if (genderA !== genderB) {
        return genderA - genderB;
      }
      
      // Secondary sort: Squad (alphabetical)
      const squadA = (a.squad_name || '').toLowerCase();
      const squadB = (b.squad_name || '').toLowerCase();
      
      if (squadA !== squadB) {
        return squadA.localeCompare(squadB, 'de');
      }
      
      // Tertiary sort: Club (alphabetical)
      const clubA = (a.club || '').toLowerCase();
      const clubB = (b.club || '').toLowerCase();
      
      return clubA.localeCompare(clubB, 'de');
    });

    const config = labelConfig
    const doc = new jsPDF('p', 'mm', 'a4')
    
    // A4 dimensions: 210 x 297 mm
    const pageWidth = 210
    const pageHeight = 297
    
    // Calculate available area for labels
    const availableWidth = pageWidth - config.marginLeft - config.marginRight
    const availableHeight = pageHeight - config.marginTop - config.marginBottom
    
    // Calculate actual label dimensions including spacing
    const labelWidth = availableWidth / config.columns
    const labelHeight = availableHeight / config.rows
    
    let currentPage = 1
    let currentRow = 0
    let currentCol = 0
    
    sortedParticipants.forEach((participant, index) => {
      // Check if we need a new page
      if (index > 0 && currentRow === 0 && currentCol === 0) {
        doc.addPage()
        currentPage++
      }
      
      // Calculate position
      const x = config.marginLeft + (currentCol * labelWidth)
      const y = config.marginTop + (currentRow * labelHeight)
      
      // Draw border if enabled
      if (config.showBorders) {
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.rect(x, y, labelWidth, labelHeight)
      }
      
      // Add participant information
      const name = `${participant.firstname} ${participant.lastname}`
      const club = participant.club
      const startNumber = participant.startNumber ? `#${participant.startNumber}` : ''
      
      // Get competition names for this participant
      const participantCompetitions = competitions
        .filter(comp => participant.assignedCompetitions.includes(comp.id))
        .map(comp => comp.number ? `${comp.number} ${comp.name}` : comp.name)
        .join(', ')
      
      // Get squad information
      const squadInfo = participant.squad_name || t('eventParticipants.card.noSquad')
      
      // Set font for label content
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      
      // Name (top of label)
      const nameY = y + 4
      doc.text(name, x + 2, nameY, { maxWidth: labelWidth - 4 })
      
      // Start number (top right)
      if (startNumber) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        const startNumberWidth = doc.getTextWidth(startNumber)
        doc.text(startNumber, x + labelWidth - startNumberWidth - 2, nameY)
      }
      
      // Club
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const clubY = nameY + 4
      doc.text(club, x + 2, clubY, { maxWidth: labelWidth - 4 })
      
      // Competition information
      if (participantCompetitions) {
        doc.setFontSize(7)
        const competitionY = clubY + 3
        doc.text(participantCompetitions, x + 2, competitionY, { maxWidth: labelWidth - 4 })
      }
      
      // Squad information (bottom of label)
      doc.setFontSize(7)
      const squadY = y + labelHeight - 2
      doc.text(squadInfo, x + 2, squadY, { maxWidth: labelWidth - 4 })
      
      // Move to next position
      currentCol++
      if (currentCol >= config.columns) {
        currentCol = 0
        currentRow++
        if (currentRow >= config.rows) {
          currentRow = 0
        }
      }
    })
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `event-participants-labels-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`
    
    doc.save(filename)
  }

  const filteredParticipants = allParticipants.filter(participant => {
    const matchesSearch = 
      participant.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.startNumber && participant.startNumber.toString().includes(searchTerm));
    
    const matchesGender = !genderFilter || participant.gender === genderFilter;
    const matchesClub = !clubFilter || participant.club.toLowerCase().includes(clubFilter.toLowerCase());
    
    // Age filter logic - handle age ranges
    let matchesAge = true;
    if (ageFilter) {
      const age = participant.age;
      if (ageFilter === '6-8') {
        matchesAge = age >= 6 && age <= 8;
      } else if (ageFilter === '9-10') {
        matchesAge = age >= 9 && age <= 10;
      } else if (ageFilter === '11-12') {
        matchesAge = age >= 11 && age <= 12;
      } else if (ageFilter === '13-14') {
        matchesAge = age >= 13 && age <= 14;
      } else if (ageFilter === '15-16') {
        matchesAge = age >= 15 && age <= 16;
      } else if (ageFilter === '17+') {
        matchesAge = age >= 17;
      }
    }
    
    return matchesSearch && matchesGender && matchesClub && matchesAge;
  });

  // Pagination logic using the hook
  const { 
    paginatedItems: paginatedParticipants, 
    totalPages, 
    totalItems: totalParticipants,
    startIndex,
    endIndex 
  } = pagination.getPaginatedItems(filteredParticipants);

  const filteredAvailableParticipants = Array.isArray(availableParticipants) ? availableParticipants.filter(participant => {
    // Ensure participant has required properties
    if (!participant || typeof participant !== 'object') return false;
    
    const firstname = participant.firstname || '';
    const lastname = participant.lastname || '';
    const club = participant.club || '';
    
    const matchesSearch = 
      firstname.toLowerCase().includes(addModalSearchTerm.toLowerCase()) ||
      lastname.toLowerCase().includes(addModalSearchTerm.toLowerCase()) ||
      club.toLowerCase().includes(addModalSearchTerm.toLowerCase());
    
    return matchesSearch;
  }) : [];

  const getFilterOptions = () => [
    {
      value: 'gender',
      label: t('eventParticipants.filters.gender'),
      selectedValue: genderFilter,
      options: [
        { value: 'male', label: t('eventParticipants.editParticipant.male') },
        { value: 'female', label: t('eventParticipants.editParticipant.female') }
      ],
      onChange: setGenderFilter
    },
    {
      value: 'club',
      label: t('eventParticipants.filters.club'),
      selectedValue: clubFilter,
      options: [...new Set(allParticipants.map((p: Participant) => p.club))].map(club => ({
        value: club,
        label: club
      })),
      onChange: setClubFilter
    },
    {
      value: 'age',
      label: t('eventParticipants.filters.ageGroup'), 
      selectedValue: ageFilter,
      options: [
        { value: '6-8', label: t('eventParticipants.filters.ageGroups.6-8') },
        { value: '9-10', label: t('eventParticipants.filters.ageGroups.9-10') },
        { value: '11-12', label: t('eventParticipants.filters.ageGroups.11-12') },
        { value: '13-14', label: t('eventParticipants.filters.ageGroups.13-14') },
        { value: '15-16', label: t('eventParticipants.filters.ageGroups.15-16') },
        { value: '17+', label: t('eventParticipants.filters.ageGroups.17+') }
      ],
      onChange: setAgeFilter
    }
  ];

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('eventParticipants.noEventSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('eventParticipants.selectEventPrompt')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title={t('eventParticipants.title')}
        subtitle={t('eventParticipants.subtitle')}
        icon={UsersIcon}
        showEventContext={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('eventParticipants.searchPlaceholder')}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasFilters={true}
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setSearchTerm('');
          setGenderFilter('');
          setClubFilter('');
          setAgeFilter('');
        }}
        showAdd={true}
        addLabel={t('eventParticipants.addParticipant')}
        onAdd={() => setShowAddModal(true)}
        showExportCSV={true}
        onExportCSV={() => console.log('Export CSV clicked')}
        showViewToggle={true}
        viewMode={viewType === 'cards' ? 'grid' : 'table'}
        onViewModeChange={(mode) => handleViewTypeChange(mode === 'grid' ? 'cards' : 'table')}
        customActions={
          filteredParticipants.filter(p => p.isInEvent).length > 0 ? (
            <div className="flex space-x-2">
              <button
                onClick={exportParticipantsListPDF}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                {t('eventParticipants.actions.exportParticipantsList')}
              </button>
              <button
                onClick={() => setShowLabelModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TagIcon className="h-4 w-4 mr-2" />
                {t('eventParticipants.actions.exportParticipantsLabels')}
              </button>
            </div>
          ) : null
        }
      />

      <div className="p-6">
        {selectedTab === 'participants' && (
          <div className="space-y-6">
            {/* Event Participants Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('eventParticipants.title')} ({totalParticipants})
                  {totalPages > 1 && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      Showing {startIndex + 1}-{Math.min(endIndex, totalParticipants)} of {totalParticipants} (Page {pagination.currentPage} of {totalPages})
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="bg-white rounded-lg border">
                <div className="overflow-y-auto">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-medium mb-2">{t('eventParticipants.empty.title')}</p>
                      <p className="text-sm">{t('eventParticipants.empty.subtitle')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {viewType === 'table' ? (
                        <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.name')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.startNumber')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.club')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.age')}/{t('eventParticipants.table.gender')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.squad')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.competitions')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('eventParticipants.table.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paginatedParticipants.map(participant => (
                            <React.Fragment key={participant.id}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {participant.firstname} {participant.lastname}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {participant.id}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    #{participant.startNumber || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {participant.club}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {participant.age} • {participant.gender === 'male' ? 'Male' : 'Female'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {participant.squad_name || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => updateParticipantStatus(participant.id, !participant.startet_nicht)}
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      participant.startet_nicht
                                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }`}
                                  >
                                    {participant.startet_nicht ? 'Not Starting' : 'Participating'}
                                  </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {participant.assignedCompetitions.length} competitions
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setEditingParticipant(editingParticipant === participant.id ? null : participant.id)}
                                      className={`p-1 ${editingParticipant === participant.id ? 'text-green-600 hover:text-green-900' : 'text-blue-600 hover:text-blue-900'}`}
                                      title={editingParticipant === participant.id ? t('eventParticipants.editParticipant.save') : t('eventParticipants.actions.editParticipant')}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => removeParticipantFromEvent(participant.id)}
                                      className="text-red-600 hover:text-red-900 p-1"
                                      title={t('eventParticipants.actions.removeFromEvent')}
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expandable edit row */}
                              {editingParticipant === participant.id && (
                                <tr className="bg-gray-50">
                                  <td colSpan={7} className="px-6 py-4">
                                    <EditParticipantForm 
                                      participant={participant}
                                      eventId={eventId!}
                                      clubs={clubs}
                                      competitions={competitions}
                                      onSave={async (updatedData) => {
                                        await updateParticipantDetails(participant.id, updatedData);
                                        setEditingParticipant(null);
                                      }}
                                      onCancel={() => setEditingParticipant(null)}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                          {paginatedParticipants.map((participant) => (
                            <div key={participant.id} className="bg-white rounded-lg border shadow-sm p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="text-2xl font-bold text-gray-900">
                                      #{participant.startNumber || '—'}
                                    </span>
                                    <div>
                                      <h3 className="text-lg font-medium text-gray-900">
                                        {participant.firstname} {participant.lastname}
                                      </h3>
                                      <p className="text-sm text-gray-500">
                                        Born: {participant.birthYear}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Age:</span>
                                      <span className="font-medium">{participant.age}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Gender:</span>
                                      <span className="font-medium capitalize">{participant.gender}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Club:</span>
                                      <span className="font-medium">{participant.club}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Squad:</span>
                                      <span className="font-medium">{participant.squad_name || '—'}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      participant.startet_nicht 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {participant.startet_nicht ? t('eventParticipants.status.notStarting') : t('eventParticipants.status.active')}
                                    </span>
                                    {participant.assignedCompetitions && participant.assignedCompetitions.length > 0 && (
                                      <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded">
                                        {participant.assignedCompetitions.length} Competition(s)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="ml-4 flex flex-col gap-2">
                                  <button
                                    onClick={() => setEditingParticipant(participant.id)}
                                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                    title={t('eventParticipants.actions.editParticipant')}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => removeParticipantFromEvent(participant.id)}
                                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                    title={t('eventParticipants.actions.removeFromEvent')}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {editingParticipant === participant.id && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <EditParticipantForm
                                    participant={participant}
                                    eventId={eventId!}
                                    clubs={clubs}
                                    competitions={competitions}
                                    onSave={async (updatedData) => {
                                      await updateParticipantDetails(participant.id, updatedData);
                                      setEditingParticipant(null);
                                    }}
                                    onCancel={() => setEditingParticipant(null)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Smart Pagination */}
                <SmartPagination
                  currentPage={pagination.currentPage}
                  totalPages={totalPages}
                  onPageChange={pagination.setCurrentPage}
                />
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'assign' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Competitions List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Competitions ({competitions.length})
              </h3>
              <div className="space-y-3">
                {competitions.map(competition => (
                  <div
                    key={competition.id}
                    className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedCompetition?.id === competition.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedCompetition(competition)}
                  >
                    <h4 className="font-medium text-gray-900">
                      {competition.name}{competition.number ? ` (Nr. ${competition.number})` : ''}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {competition.gender} • Ages {competition.ageFrom}-{competition.ageTo}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {competition.participantCount} / {competition.maxParticipants || '∞'} participants
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Participants for Assignment */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Event Participants ({totalInEvent})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredParticipants.map(participant => {
                  const isEligible = selectedCompetition ? 
                    isParticipantEligibleForCompetition(participant, selectedCompetition) : false;
                  const isAssigned = selectedCompetition ? 
                    participant.assignedCompetitions.includes(selectedCompetition.id) : false;
                  
                  return (
                    <div
                      key={participant.id}
                      className={`bg-white rounded-lg border p-3 flex items-center justify-between ${
                        !isEligible && selectedCompetition ? 'opacity-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.firstname} {participant.lastname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {participant.club} • Age {participant.age}
                        </p>
                        {!isEligible && selectedCompetition && (
                          <p className="text-xs text-red-500">Not eligible for this competition</p>
                        )}
                      </div>
                      {selectedCompetition && isEligible && (
                        <div className="flex gap-1">
                          {!isAssigned ? (
                            <button
                              onClick={() => assignParticipantToCompetition(participant.id, selectedCompetition.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Assign to competition"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => unassignParticipantFromCompetition(participant.id, selectedCompetition.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Unassign from competition"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competition Details */}
            <div>
              {selectedCompetition ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {selectedCompetition.name}{selectedCompetition.number ? ` (Nr. ${selectedCompetition.number})` : ''}
                  </h3>
                  <div className="bg-white rounded-lg border p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Competition Details</h4>
                      <div className="space-y-2 text-sm">
                        {selectedCompetition.number && (
                          <p><span className="font-medium">Number:</span> {selectedCompetition.number}</p>
                        )}
                        <p><span className="font-medium">Gender:</span> {selectedCompetition.gender}</p>
                        <p><span className="font-medium">Age Range:</span> {selectedCompetition.ageFrom}-{selectedCompetition.ageTo} years</p>
                        <p><span className="font-medium">Participants:</span> {selectedCompetition.participantCount} / {selectedCompetition.maxParticipants || '∞'}</p>
                        {selectedCompetition.registrationDeadline && (
                          <p><span className="font-medium">Deadline:</span> {selectedCompetition.registrationDeadline}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Assigned Participants
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredParticipants
                          .filter(p => p.assignedCompetitions.includes(selectedCompetition.id))
                          .map(participant => (
                            <div key={participant.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {participant.firstname} {participant.lastname}
                                </p>
                                <p className="text-xs text-gray-500">{participant.club}</p>
                              </div>
                              <Trophy className="w-4 h-4 text-green-600" />
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Competition Selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Select a competition to manage participant assignments.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Participant to Event</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search Field */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search participants by name, club..."
                value={addModalSearchTerm}
                onChange={(e) => setAddModalSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Available Participants List */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredAvailableParticipants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p>No available participants found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAvailableParticipants.map(participant => (
                    <div key={participant.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.firstname} {participant.lastname}
                        </p>
                        <p className="text-sm text-gray-500">
                          {participant.club} • {participant.gender} • Age {participant.age}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          addParticipantToEvent(participant.id);
                          setShowAddModal(false);
                        }}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Label Configuration Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('eventParticipants.labelConfig.title')}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.rows')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={labelConfig.rows}
                    onChange={(e) => setLabelConfig({ ...labelConfig, rows: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.columns')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={labelConfig.columns}
                    onChange={(e) => setLabelConfig({ ...labelConfig, columns: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.labelWidth')}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    step="0.1"
                    value={labelConfig.width}
                    onChange={(e) => setLabelConfig({ ...labelConfig, width: parseFloat(e.target.value) || 48.5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.labelHeight')}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.1"
                    value={labelConfig.height}
                    onChange={(e) => setLabelConfig({ ...labelConfig, height: parseFloat(e.target.value) || 16.9 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.marginTop')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginTop}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginTop: parseFloat(e.target.value) || 15 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.marginBottom')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginBottom}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginBottom: parseFloat(e.target.value) || 15 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.marginLeft')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginLeft}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginLeft: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('eventParticipants.labelConfig.marginRight')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginRight}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginRight: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBorders"
                  checked={labelConfig.showBorders}
                  onChange={(e) => setLabelConfig({ ...labelConfig, showBorders: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showBorders" className="ml-2 block text-sm text-gray-900">
                  {t('eventParticipants.labelConfig.showBorders')}
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{t('eventParticipants.labelConfig.previewInfo')}</h4>
                <p className="text-sm text-gray-600">
                  {t('eventParticipants.labelConfig.layout')}: {labelConfig.rows} × {labelConfig.columns} {t('eventParticipants.labelConfig.labelsPerPage')}<br/>
                  {t('eventParticipants.labelConfig.labelSize')}: {labelConfig.width} × {labelConfig.height} mm<br/>
                  {t('eventParticipants.labelConfig.totalLabelsPerPage')}: {labelConfig.rows * labelConfig.columns}<br/>
                  {t('eventParticipants.labelConfig.pagesNeeded')}: {Math.ceil(filteredParticipants.filter(p => p.isInEvent).length / (labelConfig.rows * labelConfig.columns))}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('eventParticipants.labelConfig.cancel')}
              </button>
              <button
                onClick={() => {
                  exportParticipantsLabelsPDF()
                  setShowLabelModal(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('eventParticipants.labelConfig.exportLabels')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventParticipants;
