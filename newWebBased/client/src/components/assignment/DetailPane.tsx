/**
 * DetailPane Component
 * Generic detail pane (Column 3) for assignment UIs
 * Shows selected master item's assigned items
 */

import { Users } from 'lucide-react';
import type { BaseMasterItem, DetailPaneProps } from './UnifiedAssignmentModal.types';

export function DetailPane<TMaster extends BaseMasterItem>({
  selectedItem,
  entityName,
  renderContent
}: DetailPaneProps<TMaster>) {

  if (!selectedItem) {
    return (
      <div className="lg:col-span-1">
        <div className="text-center py-8">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No {entityName} Selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a {entityName.toLowerCase()} to view details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {entityName} Details: {selectedItem.name}
      </h3>
      <div className="bg-white rounded-lg border p-4">
        {/* Custom content or default rendering */}
        {renderContent ? (
          renderContent(selectedItem)
        ) : (
          <div className="text-sm text-gray-500">
            No details available
          </div>
        )}
      </div>
    </div>
  );
}
