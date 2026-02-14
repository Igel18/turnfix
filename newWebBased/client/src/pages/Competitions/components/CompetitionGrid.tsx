import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Trophy } from 'lucide-react';
import { GenderBadge } from '../../../components/GenderBadge';
import { UnifiedActionButtons } from '../../../components/templates/EventManagementTemplate';
import { Competition } from '../Competitions.types';

interface CompetitionGridProps {
  competitions: Competition[];
  onEdit: (competition: Competition) => void;
  onDelete: (id: number) => void;
  getStatusBadge: (status: string) => string;
}

export const CompetitionGrid: React.FC<CompetitionGridProps> = ({
  competitions,
  onEdit,
  onDelete,
  getStatusBadge
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {competitions.map((competition) => (
        <div key={competition.id} className="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                {competition.number && (
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Nr. {competition.number}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{competition.name}</h3>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(competition.status)}`}>
                {competition.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{competition.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                {competition.participantCount} {t('competitions.card.participants')}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Trophy className="w-4 h-4 mr-2" />
                {competition.disciplines ? competition.disciplines.length : 0} {competition.disciplines && competition.disciplines.length === 1 ? t('competitions.card.discipline') : t('competitions.card.disciplines')}
              </div>
              {competition.disciplines && competition.disciplines.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {competition.disciplines.slice(0, 4).map((discipline, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      title={`${discipline.name} (${discipline.apparatus})`}
                    >
                      {discipline.short_name || discipline.name}
                    </span>
                  ))}
                  {competition.disciplines.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{competition.disciplines.length - 4} {t('competitions.card.more')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <GenderBadge value={competition.gender} />
                {competition.areaName && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                    {competition.areaName}
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {competition.ageFrom}-{competition.ageTo} {t('competitions.fields.years')}
                </span>
              </div>
              <UnifiedActionButtons
                onEdit={() => onEdit(competition)}
                onDelete={() => onDelete(competition.id)}
                editTitle={t('competitions.actions.edit')}
                deleteTitle={t('competitions.actions.delete')}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
