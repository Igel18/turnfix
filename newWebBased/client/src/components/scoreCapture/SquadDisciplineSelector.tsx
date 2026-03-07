import { useTranslation } from 'react-i18next';
import { Squad, Discipline, Status } from '@/types/ScoreCapture.types';
import { getIconUrl } from '@/utils/iconUtils';

interface SquadDisciplineSelectorProps {
  // Squads
  squads: Squad[];
  activeSquad: string;
  onSquadChange: (squadName: string) => void;
  getFilteredSquads: () => Squad[];
  
  // Disciplines
  disciplines: Discipline[];
  activeDiscipline: number | string | '';
  onDisciplineChange: (disciplineValue: number | string) => void;
  getFilteredDisciplines: () => Discipline[];
  
  // Status
  statuses: Status[];
  squadStatus: number | null;
  onSquadStatusChange: (statusId: string) => void;
  getStatusColor: (statusId: number) => string;
  
  // Loading state
  loading: boolean;
}

export function SquadDisciplineSelector({
  squads: _squads,
  activeSquad,
  onSquadChange,
  getFilteredSquads,
  disciplines,
  activeDiscipline,
  onDisciplineChange,
  getFilteredDisciplines,
  statuses,
  squadStatus,
  onSquadStatusChange,
  getStatusColor,
  loading
}: SquadDisciplineSelectorProps) {
  const { t } = useTranslation();

  if (loading) {
    return null;
  }

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Squad Selection */}
      <div className="bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="inline-flex items-center">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
            {t('scoreCapture.selectSquad')}
          </span>
        </label>
        <select
          data-testid="squad-select"
          value={activeSquad}
          onChange={(e) => onSquadChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('scoreCapture.chooseSquad')}</option>
          {getFilteredSquads().map((squad) => (
            <option key={squad.name} value={squad.name}>
              {squad.name} ({squad.participant_count} {t('scoreCapture.participants')})
            </option>
          ))}
        </select>
        
        {activeSquad && (
          <div className="mt-2">
            <p className="text-sm text-green-600">
              ✓ {t('scoreCapture.squadSelected', { squad: activeSquad })}
            </p>
            {activeDiscipline && (
              <p className="text-xs text-blue-600">
                {t('scoreCapture.readyToCapture')}
              </p>
            )}
          </div>
        )}
        
        {/* Squad Status Selection */}
        {activeSquad && activeDiscipline && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('scoreCapture.squadStatusFor', { 
                discipline: typeof activeDiscipline === 'number' ? 
                  disciplines.find(d => d.int_disziplinid === activeDiscipline)?.var_shortname || t('scoreCapture.selectedDiscipline') :
                  activeDiscipline
              })}
            </label>
            <select
              value={squadStatus || ''}
              onChange={(e) => onSquadStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('scoreCapture.noStatus')}</option>
              {statuses.map(status => (
                <option key={status.int_statusid} value={status.int_statusid}>
                  {status.var_name}
                </option>
              ))}
            </select>
            
            <p className="mt-1 text-xs text-gray-500">
              {t('scoreCapture.statusAppliesTo')}
            </p>
            
            {/* Status Color Indicator */}
            {squadStatus && (
              <div className={`inline-block px-3 py-1 mt-2 text-sm rounded-full ${getStatusColor(squadStatus)}`}>
                {statuses.find(s => s.int_statusid === squadStatus)?.var_name || t('scoreCapture.unknownStatus')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Device/Discipline Selection */}
      <div className="bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="inline-flex items-center">
            <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2 ${
              activeSquad ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
            }`}>2</span>
            {t('scoreCapture.selectDevice')}
            {!activeSquad && <span className="text-gray-400 ml-2">({t('scoreCapture.requiresSquad')})</span>}
          </span>
        </label>
        
        {!activeSquad ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t('scoreCapture.selectSquadFirst')}</p>
          </div>
        ) : getFilteredDisciplines().length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t('scoreCapture.noDevicesAvailable')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {getFilteredDisciplines().map((discipline, index) => (
              <div
                key={`discipline-${discipline.int_disziplinid || index}-${discipline.var_name}`}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  (activeDiscipline === discipline.int_disziplinid || activeDiscipline === discipline.var_name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => onDisciplineChange(discipline.int_disziplinid || discipline.var_name)}
              >
                <div className="text-center">
                  {discipline.icon && (
                    <div className="flex justify-center mb-2">
                      <img 
                        src={getIconUrl(discipline.icon) || ''}
                        alt={`${discipline.var_name} icon`}
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <h3 className="font-medium text-sm">{discipline.var_name}</h3>
                  {discipline.apparatus && (
                    <p className="text-xs text-gray-500 mt-1">({discipline.apparatus})</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeDiscipline && activeSquad && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Device "{(disciplines || []).find(d => 
                d.int_disziplinid === activeDiscipline || d.var_name === activeDiscipline
              )?.var_name}" selected
            </p>
            <p className="text-xs text-green-600">
              Ready to capture scores for squad "{activeSquad}"
            </p>
          </div>
        )}
        {activeSquad && !activeDiscipline && getFilteredDisciplines().length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              {t('scoreCapture.devicesAvailable', { count: getFilteredDisciplines().length })}
            </p>
            <p className="text-xs text-blue-600">
              {t('scoreCapture.clickDevice')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
