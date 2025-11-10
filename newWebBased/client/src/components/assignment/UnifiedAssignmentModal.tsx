/**
 * UnifiedAssignmentModal Component
 * Generic M:N assignment UI with three-column layout
 * Reusable across: Squads, Groups, Teams, Judges, Coaches, EventParticipants
 */

import { useState } from 'react';
import { PlusIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
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
  isLoading = false
}: UnifiedAssignmentModalProps<TMaster, TAvailable, TAssignment>) {
  
  // Local state
  const [selectedMaster, setSelectedMaster] = useState<TMaster | null>(null);
  const [filters, setFilters] = useState<FilterState>({ searchTerm: '' });

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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {config.entityNames.masterPlural} Management
            </h1>
            <p className="text-gray-600 mt-1">
              Assign {config.entityNames.availablePlural.toLowerCase()} to {config.entityNames.masterPlural.toLowerCase()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {features.allowCreate && config.onCreateMaster && (
              <button
                onClick={config.onCreateMaster}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create {config.entityNames.master}
              </button>
            )}
            
            {features.allowExport && config.onExportPDF && (
              <button
                onClick={config.onExportPDF}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

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
