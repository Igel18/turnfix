/**
 * UnifiedAssignmentModal Component
 * Generic M:N assignment UI with three-column layout
 * Reusable across: Squads, Groups, Teams, Judges, Coaches, EventParticipants
 */

import { useState } from 'react';
import { MasterList } from './MasterList';
import { AvailableList } from './AvailableList';
import { DetailPane } from './DetailPane';
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
  onSelectMaster: externalOnSelectMaster
}: UnifiedAssignmentModalProps<TMaster, TAvailable, TAssignment>) {
  
  // Internal state (used when not controlled externally)
  const [internalSelectedMaster, setInternalSelectedMaster] = useState<TMaster | null>(null);
  const [filters, setFilters] = useState<FilterState>({ searchTerm: '' });

  // Determine if component is controlled or uncontrolled
  const isControlled = externalSelectedMaster !== undefined && externalOnSelectMaster !== undefined;
  
  // Use external state if controlled, otherwise use internal state
  const selectedMaster = isControlled ? externalSelectedMaster : internalSelectedMaster;
  const setSelectedMaster = isControlled ? externalOnSelectMaster : setInternalSelectedMaster;

  // Apply filters if configured
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

      {/* Three-Column Layout */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Master List */}
          <MasterList
            items={masterItems}
            selectedItem={selectedMaster}
            onSelect={setSelectedMaster}
            onEdit={config.onEditMaster}
            onDelete={features.allowDelete ? config.onDeleteMaster : undefined}
            entityName={config.entityNames.masterPlural}
            getMetadata={config.getMasterMetadata}
          />

          {/* Column 2: Available Items */}
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

          {/* Column 3: Detail Pane */}
          <DetailPane
            selectedItem={selectedMaster}
            entityName={config.entityNames.master}
            renderContent={config.renderDetailPane}
          />
        </div>
      )}
    </div>
  );
}
