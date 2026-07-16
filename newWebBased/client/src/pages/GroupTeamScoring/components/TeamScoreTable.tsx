/**
 * TeamScoreTable Component
 * Displays team score entry table similar to ScoreCapture
 * Shows team as row with discipline fields as columns for inline editing
 */

import { useTranslation } from 'react-i18next';
import { normalizeScoreInput, getPlaceholder } from '@/utils/inputMaskUtils';

interface Team {
  id: number;
  clubName?: string;
  riege?: string | null;
  startNumber?: number | null;
}

interface TeamScoreTableProps {
  team: Team;
  disciplineFields: Array<{
    id: number;
    name: string;
    isFinalScore: boolean;
  }>;
  formula?: string | null;
  maxAttempts: number;
  inputMask: string;
  loading?: boolean;
  onScoreChange: (attempt: number, fieldId: number, value: string) => void;
  onSaveScore: (attempt: number) => Promise<void>;
  scoreMatrix: { [key: string]: string };
  calculateFinalScore: (attempt: number) => number | null;
}

export const TeamScoreTable = ({
  team,
  disciplineFields,
  formula: _formula,
  maxAttempts,
  inputMask,
  loading,
  onScoreChange,
  onSaveScore,
  scoreMatrix,
  calculateFinalScore
}: TeamScoreTableProps) => {
  const { t } = useTranslation();

  // Get non-final fields for table columns
  const scoreFields = disciplineFields.filter(f => !f.isFinalScore);
  const finalField = disciplineFields.find(f => f.isFinalScore);

  // Generate array of all possible attempts
  const attempts = Array.from({ length: maxAttempts }, (_, i) => i + 1);

  // Get score value from matrix
  const getScoreValue = (attempt: number, fieldId: number): string => {
    const key = `team-${team.id}-attempt-${attempt}-field-${fieldId}`;
    return scoreMatrix[key] || '';
  };

  const getFinalScoreDisplay = (attempt: number): string => {
    const result = calculateFinalScore(attempt);
    return result === null ? '' : result.toFixed(3);
  };

  // Handle blur event to save score
  const handleBlur = async (attempt: number) => {
    await onSaveScore(attempt);
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-lg border">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-600">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // No fields configured for discipline
  if (disciplineFields.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {t('groupTeamScoring.noDisciplineFields')}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                {t('groupTeamScoring.configureFieldsHint')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                {t('groupTeamScoring.team')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('groupTeamScoring.attempt')}
              </th>
              {scoreFields.map(field => (
                <th key={field.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {field.name}
                </th>
              ))}
              {finalField && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                  {finalField.name}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attempts.map(attempt => (
              <tr key={attempt} className="hover:bg-gray-50">
                {attempt === 1 && (
                  <td
                    rowSpan={maxAttempts}
                    className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white border-r"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{team.clubName}</div>
                      {team.riege && (
                        <div className="text-sm text-gray-500">{t('groupTeamScoring.squad')} {team.riege}</div>
                      )}
                      {team.startNumber && (
                        <div className="text-xs text-gray-400">{t('groupTeamScoring.startNumber')}: {team.startNumber}</div>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold text-sm">
                    {attempt}
                  </span>
                </td>
                {scoreFields.map(field => (
                  <td key={field.id} className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={getScoreValue(attempt, field.id)}
                      onChange={(e) => {
                        onScoreChange(attempt, field.id, e.target.value);
                      }}
                      onBlur={(e) => {
                        // Normalize score using utility function
                        const normalized = normalizeScoreInput(e.target.value, inputMask);
                        if (normalized !== e.target.value) {
                          onScoreChange(attempt, field.id, normalized);
                        }
                        handleBlur(attempt);
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={getPlaceholder(inputMask)}
                    />
                  </td>
                ))}
                {finalField && (
                  <td className="px-4 py-3 whitespace-nowrap bg-blue-50/50">
                    <div className="w-20 px-2 py-1 text-sm font-semibold text-gray-900">
                      {getFinalScoreDisplay(attempt)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
