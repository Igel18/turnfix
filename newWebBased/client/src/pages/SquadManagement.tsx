import React, { useState, useEffect } from 'react';
import UnifiedModal from '../components/UnifiedModal';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Trash2,
  Trophy,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { InformationCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';
import { useEvent } from '@/contexts/EventContext';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import { 
  setupPDFWithHeaderFooter, 
  addSectionTitle, 
  addBodyText,
  PDF_CONFIG,
  getUnifiedTableStyles
} from '../utils/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interface for participant data
interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  gender: string;
  birthYear: number;
  squadId?: number;
  squadName?: string;
  competitions?: { id: number; name: string; number: string }[];
  competitionCount?: number;
  competitionNames?: string;
}

// Interface for squad data
interface Squad {
  id: number | string;
  name: string;
  eventId: number;
  participantCount: number;
  competitions: { id: number; name: string; number: string }[];
  participants: Participant[];
  isVirtual?: boolean;
  createdAt?: string;
  hints?: {
    storage?: string;
    status?: string;
    warning?: string;
  };
}

const SquadManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // State for squads and participants
  const [squads, setSquads] = useState<Squad[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  
  // UI state
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  // State for competition highlighting (now using both ID and name for robust matching)
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [selectedCompetitionName, setSelectedCompetitionName] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for creating squads
  const [newSquadName, setNewSquadName] = useState('');

  // Load initial data
  useEffect(() => {
    if (eventId) {
      loadSquads();
      loadAvailableParticipants();
    }
  }, [eventId]);

// Force reload functions that bypass cache
const forceLoadSquads = async () => {
  try {
    // Add cache busting timestamp and force fresh data
    const timestamp = Date.now();
    const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}&_force=true`);
    const rawSquads = data.squads || [];
    
    // Transform competition data from "id:name|number" format to objects
    const newSquads = rawSquads.map((squad: any) => ({
      ...squad,
      competitions: squad.competitions?.map((comp: string) => {
        if (typeof comp === 'string' && comp.includes(':') && comp.includes('|')) {
          const [idPart, nameAndNumber] = comp.split(':');
          const [name, number] = nameAndNumber.split('|');
          return {
            id: parseInt(idPart),
            name: name,
            number: number === 'No Number' ? '' : number
          };
        }
        // Fallback for unexpected format
        return typeof comp === 'string' 
          ? { id: 0, name: comp, number: '' }
          : comp;
      }) || []
    }));
    
    console.log('🔄 Force loading squads:', newSquads.length, 'squads loaded');
    setSquads(newSquads);
    
    // Update selected squad with fresh data if one is currently selected
    if (selectedSquad) {
      const updatedSquad = newSquads.find((s: Squad) => 
        s.id === selectedSquad.id || s.name === selectedSquad.name
      );
      if (updatedSquad) {
        console.log('📝 Updating selected squad with fresh data');
        setSelectedSquad(updatedSquad);
      } else {
        // Squad no longer exists (might have been deleted)
        console.log('❌ Selected squad no longer exists, clearing selection');
        setSelectedSquad(null);
      }
    }
  } catch (error) {
    console.error('Error force loading squads:', error);
    setSquads([]);
  }
};

const forceLoadAvailableParticipants = async () => {
  try {
    // Add cache busting timestamp and force fresh data
    // Use includeAvailable=false to only show event participants
    const timestamp = Date.now();
    const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${timestamp}&_force=true`);
    const newParticipants = data.participants || [];
    console.log('🔄 Force loading available participants:', newParticipants.length, 'participants loaded');
    setAvailableParticipants(newParticipants);
  } catch (error) {
    console.error('Error force loading available participants:', error);
    setAvailableParticipants([]);
  }
};

  const loadSquads = async () => {
    try {
      // Add cache busting timestamp
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management?eventId=${eventId}&_t=${timestamp}`);
      const rawSquads = data.squads || [];
      
      // Transform competition data from "id:name|number" format to objects
      const newSquads = rawSquads.map((squad: any) => ({
        ...squad,
        competitions: squad.competitions?.map((comp: string) => {
          if (typeof comp === 'string' && comp.includes(':') && comp.includes('|')) {
            const [idPart, nameAndNumber] = comp.split(':');
            const [name, number] = nameAndNumber.split('|');
            return {
              id: parseInt(idPart),
              name: name,
              number: number === 'No Number' ? '' : number
            };
          }
          // Fallback for unexpected format
          return typeof comp === 'string' 
            ? { id: 0, name: comp, number: '' }
            : comp;
        }) || []
      }));
      
      setSquads(newSquads);
      
      // Update selected squad with fresh data if one is currently selected
      if (selectedSquad) {
        const updatedSquad = newSquads.find((s: Squad) => 
          s.id === selectedSquad.id || s.name === selectedSquad.name
        );
        if (updatedSquad) {
          console.log('📝 Updating selected squad with fresh data');
          setSelectedSquad(updatedSquad);
        } else {
          // Squad no longer exists (might have been deleted)
          console.log('❌ Selected squad no longer exists, clearing selection');
          setSelectedSquad(null);
        }
      }
    } catch (error) {
      console.error('Error loading squads:', error);
      setSquads([]);
    }
  };

  const loadAvailableParticipants = async () => {
    try {
      // Add cache busting timestamp
      // Use includeAvailable=false to only show event participants
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${timestamp}`);
      const newParticipants = data.participants || [];
      console.log('🔄 Loading available participants:', newParticipants.length, 'participants loaded');
      setAvailableParticipants(newParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  const createSquad = async () => {
    if (!newSquadName.trim() || !eventId) return;
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/create', {
        eventId: parseInt(eventId),
        name: newSquadName
      });
      
      // Show enhanced success message with hints
      let message = t('squadManagement.messages.squadCreated', { name: newSquadName });
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Hints:`;
        if (response.hints.storage) message += `\n• Storage: ${response.hints.storage}`;
        if (response.hints.nextStep) message += `\n• Next: ${response.hints.nextStep}`;
        if (response.hints.deletion) message += `\n• Note: ${response.hints.deletion}`;
      }
      
      alert(message);
      
      setNewSquadName('');
      setIsCreateModalOpen(false);
      
      // Reload data to refresh the view
      console.log('🔄 Force reloading data after squad creation...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after squad creation');
    } catch (error: any) {
      console.error('Error creating squad:', error);
      
      // Handle specific error response from the server
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle character limit error specifically  
        if (errorData.constraint === 'varchar(5)') {
          alert(t('squadManagement.messages.nameTooLong', {
            message: errorData.message,
            hint: errorData.hint,
            providedName: errorData.providedName,
            nameLength: errorData.nameLength
          }));
        } else if (errorData.errors) {
          // Handle validation errors
          const errorMessages = errorData.errors.map((err: any) => err.message).join('\n');
          alert(t('squadManagement.messages.validationFailed', { errors: errorMessages }));
        } else {
          // Handle other API errors
          alert(t('squadManagement.messages.creationFailed', { message: errorData.message || 'Unknown error occurred' }));
        }
      } else {
        // Handle network or other errors
        alert(t('squadManagement.messages.creationFailed', { message: error instanceof Error ? error.message : 'Failed to create squad. Please try again.' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSquad = async (squadId: number | string) => {
    const squadName = typeof squadId === 'string' ? squadId : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName) {
      console.error('Squad not found');
      return;
    }
    
    if (!confirm(t('squadManagement.messages.confirmDelete'))) return;
    
    try {
      await apiDelete(`/squad-management/delete?squadName=${encodeURIComponent(squadName)}&eventId=${eventId}`);
      
      // Reload both squads and available participants
      console.log('🔄 Force reloading data after squad deletion...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after squad deletion');
      
      if (selectedSquad && (selectedSquad.id === squadId || selectedSquad.name === squadName)) {
        setSelectedSquad(null);
      }
    } catch (error) {
      console.error('Error deleting squad:', error);
      alert(error instanceof Error ? error.message : t('squadManagement.messages.deletionFailed'));
    }
  };

  const assignParticipantToSquad = async (participant: Participant, squadId: number | string) => {
    const squadName = typeof squadId === 'string' ? squadId : squads.find(s => s.id === squadId)?.name;
    
    if (!squadName || !eventId) {
      console.error('Squad name or event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiPost('/squad-management/assign', {
        participantId: participant.id,
        squadName: squadName,
        eventId: parseInt(eventId)
      });
      
      // Show enhanced feedback with hints
      let message = response.message || 'Participant assigned successfully';
      if (response.notice) {
        message += `\n\n📝 ${response.notice}`;
      }
      if (response.hints) {
        message += `\n\n💡 Storage Info:`;
        if (response.hints.storage) message += `\n• ${response.hints.storage}`;
        if (response.hints.status) message += `\n• ${response.hints.status}`;
        if (response.hints.reason) message += `\n• ${response.hints.reason}`;
      }
      
      // Show toast notification (can be replaced with a proper toast component)
      console.log('✅ Assignment completed:', message);
      
      // Reload both squads and available participants
      // loadSquads() will automatically update selectedSquad with fresh data
      console.log('🔄 Force reloading data after participant assignment...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after participant assignment');
    } catch (error: any) {
      console.error('Error assigning participant to squad:', error);
      
      // Handle specific error response from the server
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle character limit error specifically
        if (errorData.constraint === 'varchar(5)') {
          alert(t('squadManagement.messages.nameTooLong', {
            message: errorData.message,
            hint: errorData.hint,
            providedName: errorData.providedName,
            nameLength: errorData.nameLength
          }));
        } else {
          // Handle other API errors
          alert(t('squadManagement.messages.assignmentFailed', { message: errorData.message || 'Unknown error occurred' }));
        }
      } else {
        // Handle network or other errors
        alert(t('squadManagement.messages.assignmentFailed', { message: error instanceof Error ? error.message : 'Failed to assign participant to squad' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeParticipantFromSquad = async (participantId: number) => {
    if (!eventId) {
      console.error('Event ID not found');
      return;
    }
    
    setIsLoading(true);
    try {
      await apiDelete(`/squad-management/unassign?participantId=${participantId}&eventId=${eventId}`);
      
      // Reload both squads and available participants
      // loadSquads() will automatically update selectedSquad with fresh data
      console.log('🔄 Force reloading data after participant removal...');
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
      console.log('✅ Force data reload completed after participant removal');
    } catch (error) {
      console.error('Error removing participant from squad:', error);
      alert(error instanceof Error ? error.message : t('squadManagement.messages.removalFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // PDF Export Function
  const exportSquadsPDF = () => {
    if (!selectedEvent) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
    
    let yPosition = contentArea.startY + 10;
    const leftMargin = contentArea.startX;

    // Summary (directly at the top, no title needed as it's in the header)
    const totalParticipants = squads.reduce((sum, squad) => sum + squad.participantCount, 0);
    const summaryText = `${t('squadManagement.pdf.totalSquads', { count: squads.length })} | ${t('squadManagement.pdf.totalParticipants', { count: totalParticipants })}`;
    yPosition = addBodyText(doc, summaryText, yPosition, leftMargin);
    yPosition += PDF_CONFIG.spacing.section;

    // Get unified table styles
    const unifiedStyles = getUnifiedTableStyles();

    // Iterate through squads
    squads.forEach((squad, squadIndex) => {
      // Check if we need a new page before squad header
      if (yPosition > contentArea.endY - 80) {
        doc.addPage();
        setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
        yPosition = contentArea.startY + 10;
      }

      // Squad Name as section title
      yPosition = addSectionTitle(
        doc, 
        squad.name || `Riege ${squadIndex + 1}`, 
        yPosition,
        { fontSize: PDF_CONFIG.fonts.subtitle.size }
      );
      yPosition += PDF_CONFIG.spacing.line;

      // Squad info: Participant count
      doc.setFontSize(PDF_CONFIG.fonts.body.size);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${t('squadManagement.pdf.participants')}: ${squad.participantCount}`, 
        leftMargin, 
        yPosition
      );
      yPosition += PDF_CONFIG.spacing.line;

      // Squad Competitions - each on a separate line
      if (squad.competitions && squad.competitions.length > 0) {
        doc.text(
          `${t('squadManagement.pdf.competitions')}:`, 
          leftMargin, 
          yPosition
        );
        yPosition += PDF_CONFIG.spacing.line;
        
        squad.competitions.forEach((comp) => {
          const compText = comp.number ? `  • ${comp.name} (Nr. ${comp.number})` : `  • ${comp.name}`;
          doc.text(compText, leftMargin, yPosition);
          yPosition += PDF_CONFIG.spacing.line;
        });
        
        yPosition += PDF_CONFIG.spacing.line;
      } else {
        yPosition += PDF_CONFIG.spacing.line;
      }

      // Squad Participants Table
      if (squad.participants && squad.participants.length > 0) {
        // Prepare table data
        const tableData = squad.participants.map(p => [
          `${p.firstname} ${p.lastname}`,
          p.birthYear ? p.birthYear.toString() : t('squadManagement.pdf.notAvailable'),
          p.club || t('squadManagement.pdf.noClub')
        ]);

        // Add participants table
        autoTable(doc, {
          head: [[
            t('squadManagement.pdf.name'),
            t('squadManagement.pdf.birthYear'),
            t('squadManagement.pdf.club')
          ]],
          body: tableData,
          startY: yPosition,
          ...unifiedStyles,
          columnStyles: {
            0: { halign: 'left', cellWidth: 70 },   // Name
            1: { halign: 'center', cellWidth: 30 }, // Birth Year
            2: { halign: 'left', cellWidth: 70 }    // Club
          },
          didDrawPage: () => {
            setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
          }
        });

        // Update yPosition after table
        yPosition = (doc as any).lastAutoTable.finalY + PDF_CONFIG.spacing.section;
      } else {
        doc.setFontSize(PDF_CONFIG.fonts.small.size);
        doc.setFont('helvetica', 'italic');
        doc.text(t('squadManagement.pdf.noParticipants'), leftMargin, yPosition);
        yPosition += PDF_CONFIG.spacing.section;
      }

      // Add spacing between squads (except for the last one)
      if (squadIndex < squads.length - 1) {
        yPosition += PDF_CONFIG.spacing.section;
      }
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `squad-management-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
    
    doc.save(filename);
  };

  const filteredParticipants = availableParticipants.filter(participant => {
    const matchesSearch = 
      participant.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.competitionNames && participant.competitionNames.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGender = !genderFilter || participant.gender === genderFilter;
    
    const matchesCompetition = !competitionFilter || 
      (participant.competitions && participant.competitions.some(comp => 
        comp.name.toLowerCase().includes(competitionFilter.toLowerCase())
      ));
    
    const matchesClub = !clubFilter || 
      participant.club.toLowerCase().includes(clubFilter.toLowerCase());
    
    return matchesSearch && matchesGender && matchesCompetition && matchesClub;
  });

  // Handler for squad selection - reset competition selection when squad changes
  const handleSquadSelection = (squad: Squad) => {
    setSelectedSquad(squad);
    setSelectedCompetitionId(null); // Reset competition selection when squad changes
    setSelectedCompetitionName(null);
  };

  // Helper function to check if a participant has the selected competition
  const participantHasSelectedCompetition = (participant: Participant): boolean => {
    if (selectedCompetitionId === null || !selectedCompetitionName) return false;
    return participant.competitions?.some(comp => {
      // Match by both ID and name for robust matching
      return comp.id === selectedCompetitionId && comp.name === selectedCompetitionName;
    }) || false;
  };

  // Handler for competition selection
  const handleCompetitionClick = (competitionId: number, competitionName: string) => {
    // Toggle selection: if same competition is clicked again, deselect it
    const isSameCompetition = selectedCompetitionId === competitionId && selectedCompetitionName === competitionName;
    setSelectedCompetitionId(isSameCompetition ? null : competitionId);
    setSelectedCompetitionName(isSameCompetition ? null : competitionName);
  };

  const getFilterOptions = () => {
    // Get unique competitions from available participants
    const allCompetitions = availableParticipants
      .flatMap(p => p.competitions || [])
      .filter((comp, index, arr) => arr.findIndex(c => c.id === comp.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get unique clubs from available participants
    const allClubs = [...new Set(availableParticipants.map(p => p.club))]
      .filter(club => club && club !== 'Unknown Club')
      .sort((a, b) => a.localeCompare(b));

    return [
      {
        value: 'gender',
        label: t('squadManagement.filters.gender'),
        selectedValue: genderFilter,
        options: [
          { value: 'male', label: t('squadManagement.filters.male') },
          { value: 'female', label: t('squadManagement.filters.female') }
        ],
        onChange: setGenderFilter
      },
      {
        value: 'competition',
        label: t('squadManagement.filters.competition'),
        selectedValue: competitionFilter,
        options: allCompetitions.map(comp => ({
          value: comp.name,
          label: `${comp.name} (Nr. ${comp.number})`
        })),
        onChange: setCompetitionFilter
      },
      {
        value: 'club',
        label: t('squadManagement.filters.club'),
        selectedValue: clubFilter,
        options: allClubs.map(club => ({
          value: club,
          label: club
        })),
        onChange: setClubFilter
      }
    ];
  };

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('squadManagement.noEventSelected.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('squadManagement.noEventSelected.message')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">{t('squadManagement.messages.processing')}</span>
          </div>
        </div>
      )}

      <UnifiedPageHeader
        title={t('squadManagement.title')}
        subtitle={t('squadManagement.subtitle')}
        icon={UserGroupIcon}
        showEventContext={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('squadManagement.searchPlaceholder')}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasFilters={true}
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setSearchTerm('');
          setGenderFilter('');
          setCompetitionFilter('');
          setClubFilter('');
        }}
        showAdd={true}
        addLabel={t('squadManagement.actions.newSquad')}
        onAdd={() => setIsCreateModalOpen(true)}
        showExportCSV={true}
        onExportCSV={() => console.log('Export CSV clicked')}
        showExportPDF={true}
        onExportPDF={exportSquadsPDF}
        showViewToggle={false}
      />

      {/* Virtual Squad Information */}
      {squads.some(s => s.isVirtual) && (
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mx-6 mb-4 rounded">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
            <div className="text-sm">
              <div className="text-orange-800 font-medium mb-1">{t('squadManagement.virtualInfo.title')}</div>
              <div className="text-orange-700 space-y-1">
                <p>• <strong>Virtual squads</strong> {t('squadManagement.virtualInfo.point1')}</p>
                <p>• {t('squadManagement.virtualInfo.point2')}</p>
                <p>• {t('squadManagement.virtualInfo.point3')}</p>
                <p>• {t('squadManagement.virtualInfo.point4')}</p>
              </div>
            </div>
          </div>
        </div>
      )}



      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Squads List */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('squadManagement.squads.listTitle', { count: squads.length })}
            </h3>
            <div className="space-y-3">
              {squads.map(squad => (
                <div
                  key={squad.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedSquad?.id === squad.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                  } ${squad.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}
                  onClick={() => handleSquadSelection(squad)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{squad.name}</h4>
                        {squad.isVirtual && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {t('squadManagement.squads.virtual')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {t('squadManagement.squads.participants', { count: squad.participantCount })}
                      </p>
                      {squad.isVirtual && squad.hints && (
                        <p className="text-xs text-orange-600 mt-1">
                          💾 {squad.hints.storage}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSquad(squad.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title={t('squadManagement.actions.deleteSquad')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {squad.competitions.slice(0, 2).map((comp, idx) => {
                        const compData = typeof comp === 'string' 
                          ? { name: comp, number: '' }
                          : comp;
                        return (
                          <span 
                            key={idx} 
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            title={`${compData.name}${compData.number ? ` (Nr. ${compData.number})` : ''}`}
                          >
                            {compData.name}{compData.number ? ` (Nr. ${compData.number})` : ''}
                          </span>
                        );
                      })}
                      {squad.competitions.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {t('squadManagement.squads.moreCompetitions', { count: squad.competitions.length - 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Participants */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('squadManagement.availableParticipants.title', { count: filteredParticipants.length })}
              </h3>
              {!selectedSquad && filteredParticipants.length > 0 && (
                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  {t('squadManagement.availableParticipants.selectSquadHint')}
                </div>
              )}
            </div>
            
            {/* Competition Filter Info */}
            {selectedCompetitionId && selectedCompetitionName && selectedSquad && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <Trophy className="h-4 w-4 text-blue-700 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-900">
                      <p className="font-medium mb-1">Wettkampf-Filter aktiv</p>
                      <p>Zeigt Teilnehmer für: <strong>{selectedCompetitionName}</strong> <span className="opacity-60">(ID: {selectedCompetitionId})</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCompetitionId(null);
                      setSelectedCompetitionName(null);
                    }}
                    className="text-blue-700 hover:text-blue-900"
                    title="Filter entfernen"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Information about virtual squads */}
            {filteredParticipants.length > 0 && squads.some(s => s.isVirtual) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">{t('squadManagement.availableParticipants.virtualAssignmentTitle')}</p>
                    <p>{t('squadManagement.availableParticipants.virtualAssignmentInfo')}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredParticipants.map(participant => {
                const isHighlighted = participantHasSelectedCompetition(participant);
                return (
                <div
                  key={participant.id}
                  className={`bg-white rounded-lg border p-3 transition-all ${
                    isHighlighted 
                      ? 'border-blue-500 border-2 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium truncate ${isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
                          {participant.firstname} {participant.lastname}
                        </p>
                        {selectedSquad && (
                          <button
                            onClick={() => assignParticipantToSquad(participant, selectedSquad.id)}
                            className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title={t('squadManagement.actions.assignToSquad')}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        {participant.club} • {participant.gender} • {t('squadManagement.availableParticipants.age', { age: new Date().getFullYear() - participant.birthYear })}
                      </p>
                      {participant.competitions && participant.competitions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">
                            {t('squadManagement.availableParticipants.competitionsLabel', { count: participant.competitionCount })}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {participant.competitions.slice(0, 3).map((comp, idx) => {
                              const isCompSelected = comp.id === selectedCompetitionId && comp.name === selectedCompetitionName;
                              return (
                              <span 
                                key={idx} 
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  isCompSelected
                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                                title={`Competition ID: ${comp.id}, Number: ${comp.number}`}
                              >
                                {comp.name} (Nr. {comp.number})
                              </span>
                              );
                            })}
                            {participant.competitions.length > 3 && (
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                title={participant.competitionNames}
                              >
                                {t('squadManagement.availableParticipants.moreCompetitions', { count: participant.competitions.length - 3 })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Squad Details */}
          <div className="lg:col-span-1">
            {selectedSquad ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('squadManagement.squadDetails.title', { name: selectedSquad.name })}
                </h3>
                <div className="bg-white rounded-lg border p-4">
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t('squadManagement.squadDetails.participants', { count: selectedSquad.participants.length })}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedSquad.participants.map(participant => {
                        const isHighlighted = participantHasSelectedCompetition(participant);
                        return (
                        <div
                          key={participant.id}
                          className={`flex items-center justify-between p-2 rounded transition-all ${
                            isHighlighted 
                              ? 'bg-blue-100 border border-blue-300 shadow-sm' 
                              : 'bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className={`text-sm font-medium ${isHighlighted ? 'text-blue-900' : 'text-gray-900'}`}>
                              {participant.firstname} {participant.lastname}
                            </p>
                            <p className="text-xs text-gray-500">
                              {participant.club}
                            </p>
                          </div>
                          <button
                            onClick={() => removeParticipantFromSquad(participant.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title={t('squadManagement.actions.removeFromSquad')}
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      {t('squadManagement.squadDetails.assignedCompetitions')}
                    </h4>
                    <div className="space-y-1">
                      {selectedSquad.competitions.map((comp, idx) => {
                        const isSelected = comp.id === selectedCompetitionId && comp.name === selectedCompetitionName;
                        return (
                        <div 
                          key={`${comp.id}-${comp.name}-${idx}`}
                          onClick={() => handleCompetitionClick(comp.id, comp.name)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500 text-white ring-2 ring-blue-600' 
                              : 'bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-gray-900'}`}>
                            {comp.name}{comp.number ? ` (Nr. ${comp.number})` : ''}
                          </span>
                          <Trophy className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('squadManagement.noSquadSelected.title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('squadManagement.noSquadSelected.message')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Squad Modal */}
      <UnifiedModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('squadManagement.createModal.title')}
        size="md"
        showFooter={false}
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.createModal.squadName')} * <span className="text-sm text-gray-500">{t('squadManagement.createModal.maxCharacters')}</span>
          </label>
          <input
            type="text"
            value={newSquadName}
            onChange={(e) => setNewSquadName(e.target.value)}
            maxLength={5}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              newSquadName.length > 5 ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('squadManagement.createModal.placeholder')}
            autoFocus
          />
          <div className="flex justify-between items-center mt-1">
            <p className={`text-sm ${newSquadName.length > 5 ? 'text-red-500' : 'text-gray-500'}`}>
              {newSquadName.length > 5 
                ? t('squadManagement.createModal.nameTooLong')
                : t('squadManagement.createModal.hint')
              }
            </p>
            <span className={`text-xs ${newSquadName.length > 5 ? 'text-red-500' : 'text-gray-400'}`}>
              {t('squadManagement.createModal.characterCount', { count: newSquadName.length })}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={createSquad}
            disabled={!newSquadName.trim() || newSquadName.length > 5}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5" />
            {t('squadManagement.createModal.createButton')}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {t('squadManagement.createModal.cancelButton')}
          </button>
        </div>
      </UnifiedModal>
    </div>
  );
};

export default SquadManagement;
