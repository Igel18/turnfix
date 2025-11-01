import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon, SwatchIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DatabaseManagementTemplate from '../components/DatabaseManagementTemplate';
import StatusFormModal from '../components/StatusFormModal';
import { BlueInfoBox, GreenInfoBox, RedInfoBox, InfoList, FeatureList } from '../components/InfoBoxes';

interface Status {
  int_statusid: number;
  var_name: string;
  ary_colorcode: string;
  bol_bogen: boolean;
  bol_karte: boolean;
}

const StatusUnified: React.FC = () => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [colorTypeFilter, setColorTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Help panel state
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/statuses?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch statuses');
      }
      const data = await response.json();
      setStatuses(Array.isArray(data.statuses) ? data.statuses : []);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      setStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (loading) {
      alert(t('status.waitForData'));
      return;
    }
    setEditingStatus(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleEdit = (status: Status) => {
    setEditingStatus(status);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (status: Status) => {
    if (window.confirm(t('status.messages.confirmDelete'))) {
      try {
        const response = await fetch(`/api/statuses/${status.int_statusid}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to delete status');
        }
        await fetchStatuses();
      } catch (error) {
        console.error('Error deleting status:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete status. This status may be in use.');
      }
    }
  };

  const handleSubmit = async (statusData: Partial<Status>) => {
    try {
      const url = isEditing ? `/api/statuses/${editingStatus?.int_statusid}` : '/api/statuses';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save status');
      }

      await fetchStatuses();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving status:', error);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleClearAllFilters = () => {
    setVisibilityFilter('all');
    setColorTypeFilter('all');
    setSearchTerm('');
  };

  // Helper function to convert {R,G,B} to hex
  const rgbToHex = (rgbString: string): string => {
    try {
      const match = rgbString.match(/\{(\d+),(\d+),(\d+)\}/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Error converting RGB to hex:', error);
    }
    return '#FF0000';
  };

  // Helper function to determine color category
  const getColorCategory = (colorString: string) => {
    const hex = rgbToHex(colorString).toLowerCase();
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    if (r > g && r > b && r > 150) return 'red';
    if (g > r && g > b && g > 150) return 'green';
    if (b > r && b > g && b > 150) return 'blue';
    if (r > 200 && g > 200 && b < 100) return 'yellow';
    if (r > 200 && g > 100 && g < 200 && b < 100) return 'orange';
    if (r > 100 && g < 100 && b > 100) return 'purple';
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 100 && g < 100 && b < 100) return 'black';
    return 'other';
  };

  // Apply filters
  const getFilteredData = () => {
    return statuses.filter(status => {
      // Search filter
      const matchesSearch = !searchTerm || 
        status.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        status.ary_colorcode?.toLowerCase().includes(searchTerm.toLowerCase());

      // Visibility filter
      const matchesVisibility = visibilityFilter === 'all' ||
        (visibilityFilter === 'both' && status.bol_bogen && status.bol_karte) ||
        (visibilityFilter === 'bogen-only' && status.bol_bogen && !status.bol_karte) ||
        (visibilityFilter === 'karte-only' && !status.bol_bogen && status.bol_karte) ||
        (visibilityFilter === 'neither' && !status.bol_bogen && !status.bol_karte);

      // Color type filter
      const matchesColorType = colorTypeFilter === 'all' || getColorCategory(status.ary_colorcode) === colorTypeFilter;

      return matchesSearch && matchesVisibility && matchesColorType;
    });
  };

  const filteredData = getFilteredData();

  // Table headers
  const renderTableHeaders = () => (
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        ID
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Status Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Color
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Results Sheet
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Score Card
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  );

  // Table row renderer
  const renderTableRow = (status: Status) => (
    <tr key={status.int_statusid}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {status.int_statusid}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div 
            className="w-4 h-4 rounded-full mr-3 border border-gray-300"
            style={{ backgroundColor: rgbToHex(status.ary_colorcode) }}
            title={`Color: ${status.ary_colorcode}`}
          />
          <div>
            <div className="text-sm font-medium text-gray-900">{status.var_name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-6 rounded border border-gray-300"
            style={{ backgroundColor: rgbToHex(status.ary_colorcode) }}
          />
          <div className="text-xs">
            <div className="font-mono text-gray-600">{rgbToHex(status.ary_colorcode)}</div>
            <div className="text-gray-500">{status.ary_colorcode}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status.bol_bogen 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status.bol_bogen ? (
            <>
              <CheckIcon className="w-3 h-3 mr-1" />
              Yes
            </>
          ) : (
            <>
              <XMarkIcon className="w-3 h-3 mr-1" />
              No
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status.bol_karte 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status.bol_karte ? (
            <>
              <CheckIcon className="w-3 h-3 mr-1" />
              Yes
            </>
          ) : (
            <>
              <XMarkIcon className="w-3 h-3 mr-1" />
              No
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2 justify-end">
          <button
            onClick={() => handleEdit(status)}
            className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors"
            title="Edit status"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(status)}
            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
            title="Delete status"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card renderer
  const renderCard = (status: Status) => (
    <div key={status.int_statusid} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <div 
              className="w-6 h-6 rounded-full mr-3 border-2 border-gray-300"
              style={{ backgroundColor: rgbToHex(status.ary_colorcode) }}
              title={`Color: ${status.ary_colorcode}`}
            />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{status.var_name}</h3>
              <p className="text-sm text-gray-500">ID: {status.int_statusid}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Color:</span>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: rgbToHex(status.ary_colorcode) }}
                />
                <div className="text-xs">
                  <div className="font-mono text-gray-700">{rgbToHex(status.ary_colorcode)}</div>
                  <div className="text-gray-500">{status.ary_colorcode}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Results:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                status.bol_bogen 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {status.bol_bogen ? (
                  <>
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Shown
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-3 h-3 mr-1" />
                    Hidden
                  </>
                )}
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Score Card:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                status.bol_karte 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {status.bol_karte ? (
                  <>
                    <CheckIcon className="w-3 h-3 mr-1" />
                    Shown
                  </>
                ) : (
                  <>
                    <XMarkIcon className="w-3 h-3 mr-1" />
                    Hidden
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            onClick={() => handleEdit(status)}
            className="text-purple-600 hover:text-purple-900 p-2 rounded-md hover:bg-purple-50"
            title="Edit Status"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(status)}
            className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
            title="Delete Status"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const filterOptions = [
    {
      value: 'visibility',
      label: 'Visibility',
      selectedValue: visibilityFilter,
      onChange: setVisibilityFilter,
      options: [
        { value: 'all', label: 'All Visibility Settings' },
        { value: 'both', label: 'Show in Both' },
        { value: 'bogen-only', label: 'Results Sheet Only' },
        { value: 'karte-only', label: 'Score Card Only' },
        { value: 'neither', label: 'Hidden from Both' }
      ]
    },
    {
      value: 'colorType',
      label: 'Color Type',
      selectedValue: colorTypeFilter,
      onChange: setColorTypeFilter,
      options: [
        { value: 'all', label: 'All Colors' },
        { value: 'red', label: 'Red Colors' },
        { value: 'green', label: 'Green Colors' },
        { value: 'blue', label: 'Blue Colors' },
        { value: 'yellow', label: 'Yellow Colors' },
        { value: 'orange', label: 'Orange Colors' },
        { value: 'purple', label: 'Purple Colors' },
        { value: 'white', label: 'White Colors' },
        { value: 'black', label: 'Black Colors' },
        { value: 'other', label: 'Other Colors' }
      ]
    }
  ];

  // Help content for the status management
  const helpContent = (
    <div className="space-y-4">
      <BlueInfoBox title="Status Management Overview">
        <div className="space-y-2">
          <p>
            This page manages status definitions used for squad-discipline combinations throughout the gymnastics management system.
          </p>
          <InfoList items={[
            { label: "Purpose", value: "Define colored status indicators for tracking progress" },
            { label: "Usage", value: "Used in Squad Status Management for discipline progress tracking" },
            { label: "Storage", value: "Colors stored in {R,G,B} format (e.g., {255,0,0} for red)" }
          ]} />
        </div>
      </BlueInfoBox>

      <GreenInfoBox title="Status Configuration">
        <div className="space-y-2">
          <p><strong>Visibility Settings:</strong></p>
          <FeatureList features={[
            "Results Sheet (Bogen): Display status in competition results",
            "Score Card (Karte): Show status on individual score cards",
            "Both settings can be configured independently"
          ]} />
        </div>
      </GreenInfoBox>

      <RedInfoBox title="Important Notes">
        <div className="space-y-2">
          <p><strong>Deletion Restrictions:</strong></p>
          <FeatureList features={[
            "Status entries in use cannot be deleted",
            "Check Squad Status Management before removal",
            "Consider deactivating instead of deleting active statuses"
          ]} />
        </div>
      </RedInfoBox>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title="Status Management"
        subtitle={`Manage status for squad-discipline combinations • ${statuses.length} statuses loaded`}
        icon={SwatchIcon}
        data={filteredData}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search statuses by name or color..."
        itemsPerPage={50}
        viewStorageKey="status-view"
        onAdd={handleCreate}
        addLabel="Add Status"
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
        filterOptions={filterOptions}
        onClearAllFilters={handleClearAllFilters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        showHelpPanel={showHelpPanel}
        onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
        helpContent={helpContent}
        helpLabel="Status Help"
      />
      
      {!loading && (
        <StatusFormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          status={editingStatus}
          isEditing={isEditing}
        />
      )}
    </>
  );
};

export default StatusUnified;
