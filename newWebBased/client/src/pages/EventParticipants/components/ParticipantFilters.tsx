/**
 * Participant Filters Component
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Participant } from '../EventParticipants.types';

interface ParticipantFiltersProps {
  participants: Participant[];
  searchTerm: string;
  genderFilter: string;
  clubFilter: string;
  ageFilter: string;
  onSearchChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onClubChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onReset: () => void;
}

export const ParticipantFilters: React.FC<ParticipantFiltersProps> = ({
  participants,
  searchTerm,
  genderFilter,
  clubFilter,
  ageFilter,
  onSearchChange,
  onGenderChange,
  onClubChange,
  onAgeChange,
  onReset,
}) => {
  const { t } = useTranslation();

  // Get unique clubs from participants
  const uniqueClubs = useMemo(() => {
    const clubs = participants
      .map((p) => p.club)
      .filter((club, index, self) => club && self.indexOf(club) === index)
      .sort();
    return clubs;
  }, [participants]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('eventParticipants.filters.search')}
        </label>
        <input
          type="text"
          placeholder={t('eventParticipants.filters.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Gender Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('eventParticipants.filters.gender')}
        </label>
        <select
          value={genderFilter}
          onChange={(e) => onGenderChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('eventParticipants.filters.all')}</option>
          <option value="male">{t('common.gender.male')}</option>
          <option value="female">{t('common.gender.female')}</option>
        </select>
      </div>

      {/* Club Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('eventParticipants.filters.club')}
        </label>
        <select
          value={clubFilter}
          onChange={(e) => onClubChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('eventParticipants.filters.all')}</option>
          {uniqueClubs.map((club) => (
            <option key={club} value={club}>
              {club}
            </option>
          ))}
        </select>
      </div>

      {/* Age Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('eventParticipants.filters.ageGroup')}
        </label>
        <select
          value={ageFilter}
          onChange={(e) => onAgeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('eventParticipants.filters.all')}</option>
          <option value="6-8">{t('eventParticipants.filters.ageGroups.6-8')}</option>
          <option value="9-10">{t('eventParticipants.filters.ageGroups.9-10')}</option>
          <option value="11-12">{t('eventParticipants.filters.ageGroups.11-12')}</option>
          <option value="13-14">{t('eventParticipants.filters.ageGroups.13-14')}</option>
          <option value="15-16">{t('eventParticipants.filters.ageGroups.15-16')}</option>
          <option value="17+">{t('eventParticipants.filters.ageGroups.17+')}</option>
        </select>
      </div>

      {/* Reset Button */}
      <div className="flex items-end">
        <button
          onClick={onReset}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common.resetFilters')}
        </button>
      </div>
    </div>
  );
};
