/**
 * Edit Participant Form Component
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  EditParticipantFormProps,
  EditParticipantData,
  Competition,
  StatusOption,
} from '../EventParticipants.types';
import { useParticipantValidation } from '../hooks/useParticipantValidation';
import { normalizeGender } from '@/utils/genderHelpers';
import { apiGet } from '@/utils/api';

export const EditParticipantForm: React.FC<EditParticipantFormProps> = ({
  participant,
  clubs,
  competitions,
  statusOptions: statusOptionsProp,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { calculateAge, validateCompetition } = useParticipantValidation();

  // Normalize gender on initial load
  const normalizedGender = normalizeGender(participant.gender);

  const [statusOptions, setStatusOptions] = useState<StatusOption[]>(statusOptionsProp || []);

  useEffect(() => {
    if (statusOptionsProp && statusOptionsProp.length > 0) return;
    apiGet('/participant-status/statuses')
      .then((data: StatusOption[]) => setStatusOptions(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [statusOptionsProp]);

  const [formData, setFormData] = useState<EditParticipantData>({
    firstname: participant.firstname,
    lastname: participant.lastname,
    clubId: participant.clubId,
    // Use full birthday if available (API returns YYYY-MM-DD), otherwise fall back to year-only
    birthday: participant.birthday
      ? participant.birthday
      : participant.birthYear
      ? `${participant.birthYear}-01-01`
      : '',
    gender: normalizedGender,
    squad_name: participant.squad_name || '',
    startet_nicht: participant.startet_nicht,
    bol_ak: participant.bol_ak || false,
    var_comment: participant.var_comment || '',
    statusId: participant.statusId ?? 1,
    assignedCompetitions: participant.assignedCompetitions || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstname.trim() || !formData.lastname.trim()) {
      alert(t('eventParticipants.editParticipant.validationError'));
      return;
    }

    const age = calculateAge(formData.birthday);
    if (age < 1 || age > 100) {
      alert(t('eventParticipants.editParticipant.ageValidationError'));
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving participant:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.firstName')} *
          </label>
          <input
            type="text"
            required
            value={formData.firstname}
            onChange={(e) =>
              setFormData({ ...formData, firstname: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.lastName')} *
          </label>
          <input
            type="text"
            required
            value={formData.lastname}
            onChange={(e) =>
              setFormData({ ...formData, lastname: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.club')}
          </label>
          <select
            value={formData.clubId}
            onChange={(e) =>
              setFormData({ ...formData, clubId: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option key="select-club-0" value={0}>
              {t('eventParticipants.editParticipant.selectClub')}
            </option>
            {clubs
              .filter(
                (club) =>
                  club && typeof club.id !== 'undefined' && club.id !== null
              )
              .map((club) => (
                <option key={`club-${club.id}`} value={club.id}>
                  {club.name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.birthday')} *{' '}
            <span className="text-sm text-gray-500">
              ({t('eventParticipants.editParticipant.age')}:{' '}
              {calculateAge(formData.birthday)})
            </span>
          </label>
          <input
            type="date"
            required
            value={formData.birthday}
            onChange={(e) =>
              setFormData({ ...formData, birthday: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.gender')}
          </label>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({
                ...formData,
                gender: e.target.value as 'male' | 'female' | 'unknown',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="male">
              {t('common.gender.male')}
            </option>
            <option value="female">
              {t('common.gender.female')}
            </option>
            <option value="unknown">
              {t('common.gender.unknown')}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.squad')}
          </label>
          <input
            type="text"
            value={formData.squad_name}
            onChange={(e) =>
              setFormData({ ...formData, squad_name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('eventParticipants.editParticipant.squadPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.status')}
          </label>
          <select
            value={formData.statusId ?? ''}
            onChange={(e) =>
              setFormData({ ...formData, statusId: parseInt(e.target.value) || undefined })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.startet_nicht}
              onChange={(e) =>
                setFormData({ ...formData, startet_nicht: e.target.checked })
              }
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              {t('eventParticipants.editParticipant.notStarting')}
            </span>
          </label>
        </div>

        <div className="flex items-center">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.bol_ak}
              onChange={(e) =>
                setFormData({ ...formData, bol_ak: e.target.checked })
              }
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              {t('eventParticipants.editParticipant.outOfCompetition')}
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('eventParticipants.editParticipant.comment')}
          </label>
          <textarea
            value={formData.var_comment}
            onChange={(e) =>
              setFormData({ ...formData, var_comment: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t(
              'eventParticipants.editParticipant.commentPlaceholder'
            )}
            rows={3}
            maxLength={150}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.var_comment.length}/150
          </p>
        </div>
      </div>

      {/* Competition Assignments */}
      <div className="mt-6">
        <h5 className="text-sm font-medium text-gray-700 mb-3">
          {t('eventParticipants.editParticipant.competitionAssignments')}
        </h5>
        <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
          {competitions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('eventParticipants.editParticipant.loadingCompetitions')}
            </p>
          ) : (
            competitions.map((competition: Competition) => {
              const validation = validateCompetition(
                competition,
                formData.birthday,
                formData.gender
              );
              const isSelected = formData.assignedCompetitions.includes(
                competition.id
              );
              const showWarning = !validation.valid && isSelected;

              return (
                <div key={`competition-${competition.id}`}>
                  <label
                    className={`flex items-start p-2 rounded ${
                      showWarning
                        ? 'bg-yellow-50 border border-yellow-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assignedCompetitions: [
                              ...formData.assignedCompetitions,
                              competition.id,
                            ],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedCompetitions:
                              formData.assignedCompetitions.filter(
                                (id) => id !== competition.id
                              ),
                          });
                        }
                      }}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    />
                    <div className="flex-1">
                      <span
                        className={`text-sm ${
                          showWarning
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {competition.name}
                        {competition.number ? ` (Nr. ${competition.number})` : ''}{' '}
                        ({competition.gender}, Ages {competition.ageFrom}-
                        {competition.ageTo})
                      </span>
                      {showWarning && (
                        <div className="mt-1 text-xs text-yellow-700">
                          ⚠️ {validation.reasons.join(', ')}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {t('eventParticipants.editParticipant.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving
            ? t('eventParticipants.editParticipant.saving')
            : t('eventParticipants.editParticipant.save')}
        </button>
      </div>
    </form>
  );
};
