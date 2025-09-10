import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon, TableCellsIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DatabaseManagementTemplate from '../components/DatabaseManagementTemplate';
import { BlueInfoBox, GreenInfoBox, RedInfoBox, InfoList, FeatureList } from '../components/InfoBoxes';

interface DisciplineField {
  id: number;
  disciplineId: number;
  disciplineName: string;
  disciplineShort: string;
  name: string;
  sortOrder: number | null;
  isFinalScore: boolean;
  isStartingScore: boolean;
  group: number;
  enabled: boolean;
}

interface Discipline {
  id: number;
  name: string;
  short_name?: string;
}

const DisciplineFieldsUnified: React.FC = () => {
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [fieldTypeFilter, setFieldTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Help panel state
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch discipline fields and disciplines
      const [fieldsResponse, disciplinesResponse] = await Promise.all([
        fetch('/api/discipline-fields?limit=1000'),
        fetch('/api/disciplines?limit=1000')
      ]);

      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        // Handle both array response and object with disciplineFields property
        const fieldsArray = Array.isArray(fieldsData) ? fieldsData : 
                           (Array.isArray(fieldsData.disciplineFields) ? fieldsData.disciplineFields : 
                            Array.isArray(fieldsData.value) ? fieldsData.value : []);
        setDisciplineFields(fieldsArray);
      }

      if (disciplinesResponse.ok) {
        const disciplinesData = await disciplinesResponse.json();
        // Handle both array response and object with disciplines property
        const disciplinesArray = Array.isArray(disciplinesData) ? disciplinesData :
                                 (Array.isArray(disciplinesData.disciplines) ? disciplinesData.disciplines : []);
        setDisciplines(disciplinesArray);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setDisciplineFields([]);
      setDisciplines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllFilters = () => {
    setDisciplineFilter('all');
    setFieldTypeFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
  };

  // Apply filters
  const getFilteredData = () => {
    return disciplineFields.filter(field => {
      // Search filter
      const matchesSearch = !searchTerm || 
        field.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.disciplineName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.disciplineShort?.toLowerCase().includes(searchTerm.toLowerCase());

      // Discipline filter
      const matchesDiscipline = disciplineFilter === 'all' || 
        field.disciplineId.toString() === disciplineFilter;

      // Field type filter
      const matchesFieldType = fieldTypeFilter === 'all' ||
        (fieldTypeFilter === 'final' && field.isFinalScore) ||
        (fieldTypeFilter === 'starting' && field.isStartingScore) ||
        (fieldTypeFilter === 'both' && field.isFinalScore && field.isStartingScore) ||
        (fieldTypeFilter === 'neither' && !field.isFinalScore && !field.isStartingScore);

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enabled' && field.enabled) ||
        (statusFilter === 'disabled' && !field.enabled);

      return matchesSearch && matchesDiscipline && matchesFieldType && matchesStatus;
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
        Field Name
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Discipline
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Sort Order
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Final Score
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Starting Score
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Status
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  );

  // Table row renderer
  const renderTableRow = (field: DisciplineField) => (
    <tr key={field.id}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {field.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <TableCellsIcon className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{field.name}</div>
            <div className="text-sm text-gray-500">Group: {field.group}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">{field.disciplineName}</div>
          <div className="text-sm text-gray-500">{field.disciplineShort}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {field.sortOrder || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          field.isFinalScore 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {field.isFinalScore ? (
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
          field.isStartingScore 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {field.isStartingScore ? (
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
          field.enabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {field.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2 justify-end">
          <button
            className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
            title="Edit field"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
            title="Delete field"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  // Card renderer
  const renderCard = (field: DisciplineField) => (
    <div key={field.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-3">
            <TableCellsIcon className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
              <p className="text-sm text-gray-500">ID: {field.id} • Group: {field.group}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Discipline:</span>
              <div>
                <div className="text-sm font-medium text-gray-900">{field.disciplineName}</div>
                <div className="text-sm text-gray-500">{field.disciplineShort}</div>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Sort Order:</span>
              <span className="text-sm text-gray-900">{field.sortOrder || 'N/A'}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Final Score:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  field.isFinalScore 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {field.isFinalScore ? (
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
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Starting:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  field.isStartingScore 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {field.isStartingScore ? (
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
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 w-24">Status:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                field.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {field.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <button
            className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50"
            title="Edit Field"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50"
            title="Delete Field"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const filterOptions = [
    {
      value: 'discipline',
      label: 'Discipline',
      selectedValue: disciplineFilter,
      onChange: setDisciplineFilter,
      options: [
        { value: 'all', label: 'All Disciplines' },
        ...disciplines.map(discipline => ({
          value: discipline.id.toString(),
          label: `${discipline.name} (${discipline.short_name || 'N/A'})`
        }))
      ]
    },
    {
      value: 'fieldType',
      label: 'Score Type',
      selectedValue: fieldTypeFilter,
      onChange: setFieldTypeFilter,
      options: [
        { value: 'all', label: 'All Score Types' },
        { value: 'final', label: 'Final Score Only' },
        { value: 'starting', label: 'Starting Score Only' },
        { value: 'both', label: 'Both Final & Starting' },
        { value: 'neither', label: 'Neither Final nor Starting' }
      ]
    },
    {
      value: 'status',
      label: 'Status',
      selectedValue: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'enabled', label: 'Enabled Only' },
        { value: 'disabled', label: 'Disabled Only' }
      ]
    }
  ];

  // Help content similar to the screenshot
  const helpContent = (
    <div className="space-y-4">
      <BlueInfoBox title="Score Capture Configuration">
        <div className="space-y-2">
          <p>
            These fields determine which input fields are displayed in the competition capture (Score Capture).
          </p>
          <div className="mt-3">
            <p><strong>Visible fields appear as:</strong></p>
            <InfoList items={[
              { label: "D/A-Note", value: "Difficulty (Schwierigkeit)" },
              { label: "E/B-Note", value: "Execution (Ausführung)" },
              { label: "Neutral Deductions", value: "Neutral Abzüge" },
              { label: "Execution Deductions", value: "Ausganswert" },
              { label: "Additional configured fields", value: "Weitere konfigurierte Felder" }
            ]} />
          </div>
          <div className="mt-3">
            <p><strong>Configuration:</strong></p>
            <InfoList items={[
              { label: "Sorting", value: "Order of field sequence" },
              { label: "Grouping", value: "Field grouping" },
              { label: "Type", value: "Final/Starting score value" },
              { label: "Visibility", value: "Enabled/Disabled for Score Capture" }
            ]} />
          </div>
        </div>
      </BlueInfoBox>

      <GreenInfoBox title="Field-specific Evaluations">
        <div className="space-y-2">
          <p>
            <strong>Field-specific evaluations are already stored in the database (tfx_jury_results).</strong>
          </p>
          <div className="mt-2">
            <p><strong>Functionality:</strong></p>
            <FeatureList features={[
              "Fields are displayed correctly",
              "Inputs are stored",
              "API binding implemented",
              "Database integration active"
            ]} />
          </div>
          <p className="mt-2 text-green-700">
            The configuration and storage of fields is fully functional. Jury evaluations are correctly persisted in the database.
          </p>
        </div>
      </GreenInfoBox>

      <RedInfoBox title="Deletion of Discipline Fields">
        <div className="space-y-2">
          <p>
            <strong>Fields with existing jury evaluations cannot be deleted.</strong>
          </p>
          <div className="mt-2">
            <p><strong>Deletion not possible when:</strong></p>
            <FeatureList features={[
              "Jury evaluations exist",
              "Field is used in competitions",
              "References in other tables"
            ]} />
          </div>
          <div className="mt-2">
            <p><strong>Alternatives:</strong></p>
            <FeatureList features={[
              "Deactivate: Hide field",
              "Rename: Adapt field",
              "Delete evaluations: Then remove field"
            ]} />
          </div>
          <p className="mt-2 text-red-700">
            This protection prevents data loss and ensures the integrity of competition data.
          </p>
        </div>
      </RedInfoBox>
    </div>
  );

  return (
    <>
      <DatabaseManagementTemplate
        title="Discipline Fields Management"
        subtitle={`Configure input fields for score capture • ${disciplineFields.length} fields loaded`}
        icon={TableCellsIcon}
        data={filteredData}
        isLoading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search fields by name or discipline..."
        itemsPerPage={50}
        viewStorageKey="discipline-fields-view"
        addLabel="Add Field"
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
        filterOptions={filterOptions}
        onClearAllFilters={handleClearAllFilters}
        showFilters={true}
        showHelpPanel={showHelpPanel}
        onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
        helpContent={helpContent}
        helpLabel="Field Configuration Help"
      />
    </>
  );
};

export default DisciplineFieldsUnified;
