/**
 * UnifiedAssignmentModal Component
 * Generic M:N assignment UI with three-column layout
 * Reusable across: Squads, Groups, Teams, Judges, Coaches, EventParticipants
 */

import { useState } from 'react';
import { MasterList } from './MasterList';
import { AvailableList } from './AvailableList';
import { DetailPane } from './DetailPane';
import { ColumnFilters } from './ColumnFilters';
import type { 
  BaseMasterItem, 
  BaseAvailableItem, 
  BaseAssignment,
  UnifiedAssignmentModalProps,
  FilterState
} from './UnifiedAssignmentModal.types';

export function UnifiedAssignmentModal<
  TMaster extends BaseMasterItem,
  TAvailable extends BaseAvailableItem,
  TAssignment extends BaseAssignment
>({
  masterItems,
  availableItems,
  config,
  isLoading = false,
  selectedMaster: externalSelectedMaster,
  onSelectMaster: externalOnSelectMaster,
  columnSearchPlaceholders
}: UnifiedAssignmentModalProps<TMaster, TAvailable, TAssignment>) {
  
  // Internal state (used when not controlled externally)
  const [internalSelectedMaster, setInternalSelectedMaster] = useState<TMaster | null>(null);
  const [filters, setFilters] = useState<FilterState>({ 
    searchTerm: '',
    columnSearches: {
      master: '',
      available: '',
      assigned: ''
    }
  });

  // Determine if component is controlled or uncontrolled
  const isControlled = externalSelectedMaster !== undefined && externalOnSelectMaster !== undefined;
  
  // Use external state if controlled, otherwise use internal state
  const selectedMaster = isControlled ? externalSelectedMaster : internalSelectedMaster;
  const setSelectedMaster = isControlled ? externalOnSelectMaster : setInternalSelectedMaster;

  // Handler: Update column-specific search
  const updateColumnSearch = (column: 'master' | 'available' | 'assigned', value: string) => {
    setFilters(prev => ({
      ...prev,
      columnSearches: {
        ...prev.columnSearches,
        [column]: value
      }
    }));
  };

  // Apply filters to master items (column 1)
  const filteredMaster = config.filterMasterItems && filters.columnSearches?.master
    ? config.filterMasterItems(masterItems, filters.columnSearches.master)
    : masterItems;

  // Apply filters to available items (column 2)
  const filteredAvailable = config.filterAvailableItems 
    ? config.filterAvailableItems(availableItems, filters)
    : availableItems;

  // Features
  const features = config.features || {
    allowCreate: true,
    allowDelete: true,
    allowExport: false,
    showFilters: false,
    showSearch: true,
    supportsVirtual: false
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      )}

      {/* Column-Specific Filters */}
      {!isLoading && columnSearchPlaceholders && (
        <ColumnFilters
          column1={columnSearchPlaceholders.master ? {
            placeholder: columnSearchPlaceholders.master,
            value: filters.columnSearches?.master || '',
            onChange: (value) => updateColumnSearch('master', value)
          } : undefined}
          column2={columnSearchPlaceholders.available ? {
            placeholder: columnSearchPlaceholders.available,
            value: filters.columnSearches?.available || '',
            onChange: (value) => updateColumnSearch('available', value)
          } : undefined}
          column3={columnSearchPlaceholders.assigned ? {
            placeholder: columnSearchPlaceholders.assigned,
            value: filters.columnSearches?.assigned || '',
            onChange: (value) => updateColumnSearch('assigned', value)
          } : undefined}
        />
      )}

      {/* Three-Column Layout */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Master List */}
          <MasterList
            items={filteredMaster}
            selectedItem={selectedMaster}
            onSelect={setSelectedMaster}
            onEdit={config.onEditMaster}
            onDelete={features.allowDelete ? config.onDeleteMaster : undefined}
            entityName={config.entityNames.masterPlural}
            getMetadata={config.getMasterMetadata}
          />

          {/* Column 2: Available Items */}
          <div className="lg:col-span-1">
            {/* Optional Header (e.g., for filters) */}
            {config.renderAvailableHeader && (
              <div className="mb-4">
                {config.renderAvailableHeader()}
              </div>
            )}
            
            <AvailableList
              items={filteredAvailable}
              selectedMaster={selectedMaster}
              onAssign={config.onAssign}
              entityName={config.entityNames.availablePlural}
              getMetadata={config.getAvailableMetadata}
              filters={filters}
              onFilterChange={setFilters}
              filterConfig={config.filterConfig}
            />
          </div>

          {/* Column 3: Detail Pane */}
          {/* Key forces re-render when selectedMaster or its nested data changes */}
          <DetailPane
            key={
              selectedMaster 
                ? `detail-${selectedMaster.id}-${(selectedMaster as any).participants?.length ?? (selectedMaster as any).members?.length ?? 0}-${(selectedMaster as any).participantCount ?? (selectedMaster as any).memberCount ?? 0}`
                : 'no-selection'
            }
            selectedItem={selectedMaster}
            entityName={config.entityNames.master}
            renderContent={config.renderDetailPane}
          />
        </div>
      )}
    </div>
  );
}
