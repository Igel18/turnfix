/**
 * MasterList Component
 * Generic master list (Column 1) for assignment UIs
 * Reusable across Squads, Groups, Teams, etc.
 */

import { Trash2, Pencil } from 'lucide-react';
import type { BaseMasterItem, MasterListProps } from './UnifiedAssignmentModal.types';

export function MasterList<TMaster extends BaseMasterItem>({
  items,
  selectedItem,
  onSelect,
  onDelete,
  onEdit,
  entityName,
  getMetadata
}: MasterListProps<TMaster>) {

  // Handler: Unselect when clicking on selected item again
  const handleClick = (item: TMaster) => {
    if (selectedItem?.id === item.id) {
      // Click on selected item = unselect
      onSelect(null as any); // Unselect by passing null
    } else {
      onSelect(item);
    }
  };

  return (
    <div className="lg:col-span-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {entityName} ({items.length})
      </h3>
      <div className="space-y-3">
        {items.map(item => {
          const metadata = getMetadata(item);
          return (
            <div
              key={item.id}
              className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                selectedItem?.id === item.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-300'
              } ${item.isVirtual ? 'border-l-4 border-l-orange-400' : ''}`}
              onClick={() => handleClick(item)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.isVirtual && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Virtual
                      </span>
                    )}
                  </div>
                  {metadata.subtitle && (
                    <p className="text-sm text-gray-500">
                      {metadata.subtitle}
                    </p>
                  )}
                  {item.isVirtual && item.hints?.storage && (
                    <p className="text-xs text-orange-600 mt-1">
                      💾 {item.hints.storage}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title={`Edit ${entityName}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title={`Delete ${entityName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Tags */}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {metadata.tags.slice(0, 5).map((tag, idx) => (
                      <span 
                        key={idx} 
                        className={`px-2 py-1 rounded text-xs ${
                          tag.color || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {metadata.tags.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        +{metadata.tags.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
