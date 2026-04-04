import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { EventManagementTemplate } from '../../components/templates/EventManagementTemplate';
import CompetitionFormModal from '../../components/CompetitionFormModalNew';
import CompetitionFormWizard from '../../components/CompetitionFormWizard';
import { useEvent } from '../../contexts/EventContext';
import { useCompetitions } from './hooks/useCompetitions';
import { CompetitionFilters } from './components/CompetitionFilters';
import { CompetitionTable } from './components/CompetitionTable';
import { CompetitionGrid } from './components/CompetitionGrid';

const Competitions: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // Use custom hook for all business logic
  const {
    competitions,
    loading,
    isModalOpen,
    setIsModalOpen,
    editingCompetition,
    formData,
    setFormData,
    bulkMaxScore,
    setBulkMaxScore,
    searchTerm,
    setSearchTerm,
    genderFilter,
    setGenderFilter,
    areaFilter,
    setAreaFilter,
    availableAreas,
    statusFilter,
    setStatusFilter,
    showFilters,
    toggleFilters,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleClearAllFilters,
    handleExportCSV,
    handleBulkMaxScoreApply,
    openCreateModal,
    loadCompetitions
  } = useCompetitions({ eventId });

  // Pre-fill search from ?prefillSearch= URL param (set by EventSearchPalette navigation)
  useEffect(() => {
    const prefill = searchParams.get('prefillSearch');
    if (prefill) setSearchTerm(prefill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardCompetition, setWizardCompetition] = useState<any | null>(null);

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      upcoming: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    return statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <EventManagementTemplate
        title={t('competitions.title')}
        description={t('competitions.description')}
        onAdd={openCreateModal}
        customActions={
          <button
            type="button"
            onClick={() => { setWizardCompetition(null); setIsWizardOpen(true); }}
            className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 whitespace-nowrap"
          >
            ✨ {t('competitionForm.wizard.openButton', 'Neuer Wettkampf (Assistent)')}
          </button>
        }
        onRefresh={loadCompetitions}
        onExportCSV={handleExportCSV}
        addButtonText={t('competitions.createButton')}
        showAddButton={true}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewStorageKey="competitions-view"
        defaultView="table"
        showFilters={showFilters}
        onToggleFilters={toggleFilters}
        itemCount={competitions.length}
        filterSection={
          <CompetitionFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            areaFilter={areaFilter}
            setAreaFilter={setAreaFilter}
            availableAreas={availableAreas}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onClearAll={handleClearAllFilters}
          />
        }
      >
        {(viewMode: 'table' | 'grid') => (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">{t('competitions.loading')}</p>
              </div>
            ) : competitions.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('competitions.noCompetitions')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('competitions.noCompetitionsHint')}
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' && (
                  <CompetitionGrid
                    competitions={competitions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    getStatusBadge={getStatusBadge}
                  />
                )}

                {viewMode === 'table' && (
                  <CompetitionTable
                    competitions={competitions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    getStatusBadge={getStatusBadge}
                  />
                )}
              </>
            )}
          </div>
        )}
      </EventManagementTemplate>

      {/* Competition Form Modal */}
      <CompetitionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCompetition={editingCompetition}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        bulkMaxScore={bulkMaxScore}
        setBulkMaxScore={setBulkMaxScore}
        handleBulkMaxScore={handleBulkMaxScoreApply}
      />

      {/* Competition Form Wizard */}
      <CompetitionFormWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        editingCompetition={wizardCompetition}
        eventId={eventId}
        onSaved={loadCompetitions}
      />
    </>
  );
};

export default Competitions;
