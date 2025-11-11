/**
 * AvailableList Component
 * Generic available items list (Column 2) for assignment UIs
 * Supports filtering, search, and assignment actions
 */

import { ArrowRight } from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { BaseAvailableItem, AvailableListProps } from './UnifiedAssignmentModal.types';

export function AvailableList<TAvailable extends BaseAvailableItem>({
  items,
  selectedMaster,
  onAssign,
  entityName,
  getMetadata
}: AvailableListProps<TAvailable>) {

  const hasVirtualItems = items.some(item => 
    'isVirtual' in item && (item as any).isVirtual
  );

  return (
    <div className="lg:col-span-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {entityName} ({items.length})
        </h3>
        {!selectedMaster && items.length > 0 && (
          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            Select an item first
          </div>
        )}
      </div>
      
      {/* Virtual Items Info */}
      {items.length > 0 && hasVirtualItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Virtual Assignment</p>
              <p>Virtual items can be assigned multiple times without conflicts.</p>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {items.map(item => {
          const metadata = getMetadata(item);
          const displayName = item.displayName || 
                             (item.firstname && item.lastname 
                               ? `${item.firstname} ${item.lastname}` 
                               : item.name || String(item.id));
          
          // Check if any tag is highlighted
          const hasHighlightedTag = metadata.tags?.some(tag => tag.isHighlighted);
          
          return (
            <div
              key={item.id}
              className={`bg-white rounded-lg border p-3 transition-all ${
                hasHighlightedTag
                  ? 'border-blue-500 border-2 bg-blue-50 shadow-md ring-2 ring-blue-200' 
                  : 'hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium truncate ${hasHighlightedTag ? 'text-blue-900' : 'text-gray-900'}`}>
                      {displayName}
                    </p>
                    {selectedMaster && (
                      <button
                        onClick={() => onAssign(item, selectedMaster.id)}
                        className="ml-2 p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title={`Assign to ${selectedMaster.name}`}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Subtitle */}
                  {metadata.subtitle && (
                    <p className="text-sm text-gray-500 mb-1">
                      {metadata.subtitle}
                    </p>
                  )}
                  
                  {/* Tags */}
                  {metadata.tags && metadata.tags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {metadata.tags.slice(0, 3).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              tag.isHighlighted
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                : tag.color || 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {tag.label}
                          </span>
                        ))}
                        {metadata.tags.length > 3 && (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            +{metadata.tags.length - 3} more
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
  );
}
