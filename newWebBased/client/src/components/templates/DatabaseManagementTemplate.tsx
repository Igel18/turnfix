import React from 'react';
import { UnifiedPageHeader } from '../layout/UnifiedPageHeader';

interface DatabaseManagementTemplateProps {
  title: string;
  children?: React.ReactNode;
  onAdd?: () => void;
  onRefresh?: () => void;
  addButtonText?: string;
  showAddButton?: boolean;
  showRefreshButton?: boolean;
  description?: string;
}

export const DatabaseManagementTemplate: React.FC<DatabaseManagementTemplateProps> = ({
  title,
  children,
  onAdd,
  onRefresh,
  addButtonText = 'Add New',
  showAddButton = true,
  showRefreshButton = true,
  description
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedPageHeader 
        title={title}
        description={description}
      />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-2">
            {showAddButton && onAdd && (
              <button
                onClick={onAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {addButtonText}
              </button>
            )}
            {showRefreshButton && onRefresh && (
              <button
                onClick={onRefresh}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {children}
        </div>
      </div>
    </div>
  );
};
