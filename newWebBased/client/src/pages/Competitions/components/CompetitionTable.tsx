import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { GenderBadge, getGenderColumnHeader } from '../../../components/GenderBadge';
import { UnifiedActionButtons } from '../../../components/templates/EventManagementTemplate';
import { SortableTableHeader, useTableSort } from '../../../components/SortableTableHeader';
import { Competition } from '../Competitions.types';

interface CompetitionTableProps {
  competitions: Competition[];
  onEdit: (competition: Competition) => void;
  onDelete: (id: number) => void;
  getStatusBadge: (status: string) => string;
}

export const CompetitionTable: React.FC<CompetitionTableProps> = ({
  competitions,
  onEdit,
  onDelete,
  getStatusBadge
}) => {
  const { t } = useTranslation();
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort<Competition>();
  
  const sortedCompetitions = sortData(competitions);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableTableHeader
                sortKey="number"
                label={t('competitions.fields.number')}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHeader
                sortKey="name"
                label={t('competitions.fields.name')}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('competitions.fields.disciplines')}
              </th>
              <SortableTableHeader
                sortKey="participantCount"
                label={t('competitions.fields.participants')}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHeader
                sortKey="gender"
                label={getGenderColumnHeader(t)}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHeader
                sortKey="ageFrom"
                label={t('competitions.fields.ageGroup')}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHeader
                sortKey="status"
                label={t('competitions.filters.status')}
                currentSortKey={sortKey}
                currentSortDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('competitions.fields.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCompetitions.map((competition) => (
              <tr key={competition.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-blue-600">
                    {competition.number || '-'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {competition.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {competition.disciplines && competition.disciplines.length > 0 ? (
                      competition.disciplines.slice(0, 3).map((discipline, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          title={`${discipline.name} (${discipline.apparatus})`}
                        >
                          {discipline.short_name || discipline.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">{t('competitions.card.noDisciplines')}</span>
                    )}
                    {competition.disciplines && competition.disciplines.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{competition.disciplines.length - 3} {t('competitions.card.more')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {competition.disciplines ? competition.disciplines.length : 0} {competition.disciplines && competition.disciplines.length === 1 ? t('competitions.card.discipline') : t('competitions.card.disciplines')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    {competition.participantCount}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <GenderBadge value={competition.gender} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {competition.ageFrom}-{competition.ageTo} {t('competitions.fields.years')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(competition.status)}`}>
                    {competition.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <UnifiedActionButtons
                    onEdit={() => onEdit(competition)}
                    onDelete={() => onDelete(competition.id)}
                    editTitle={t('competitions.actions.edit')}
                    deleteTitle={t('competitions.actions.delete')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
