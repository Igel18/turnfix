import React from 'react';
import { useTranslation } from 'react-i18next';

interface CompetitionFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  genderFilter: string;
  setGenderFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  onClearAll: () => void;
}

export const CompetitionFilters: React.FC<CompetitionFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  genderFilter,
  setGenderFilter,
  statusFilter,
  setStatusFilter,
  onClearAll
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('competitions.filters.search')}
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('competitions.filters.searchPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('competitions.filters.gender')}
        </label>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('competitions.filters.allGenders')}</option>
          <option value="männlich">{t('competitions.filters.male')}</option>
          <option value="weiblich">{t('competitions.filters.female')}</option>
          <option value="gemischt">{t('competitions.filters.mixed')}</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('competitions.filters.status')}
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('competitions.filters.allStatus')}</option>
          <option value="upcoming">{t('competitions.filters.upcoming')}</option>
          <option value="active">{t('competitions.filters.active')}</option>
          <option value="completed">{t('competitions.filters.completed')}</option>
        </select>
      </div>
      
      <div className="flex items-end">
        <button
          onClick={onClearAll}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('competitions.filters.clear')}
        </button>
      </div>
    </div>
  );
};
