/**
 * EntityScoringSelector Component
 * Wiederverwendbare Schritt-für-Schritt Auswahlkomponente für Scoring
 * 
 * Unterstützt verschiedene Entity-Typen: Teams, Gruppen, Einzelteilnehmer
 * Basiert auf der bewährten SquadDisciplineSelector-Architektur
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { getIconUrl } from '@/utils/iconUtils';

// Generische Interfaces
export interface ScoringEntity {
  id: number | string;
  name: string;
  displayName?: string;
  metadata?: Record<string, any>;
}

export interface ScoringCompetition {
  id: number;
  name: string;
  eventId?: number;
  gender?: string;
  competitionType?: number;
}

export interface ScoringDiscipline {
  id: number;
  name: string;
  shortName?: string;
  icon?: string;
  attempts?: number;
  maleAllowed?: boolean;
  femaleAllowed?: boolean;
}

export interface EntityScoringSelectorProps {
  // Step 1: Entity Selection
  entities: ScoringEntity[];
  selectedEntityId: number | string | null;
  onEntityChange: (entityId: number | string | null) => void;
  entityType: 'team' | 'group' | 'participant';
  entityLabel?: string;
  entityPlaceholder?: string;
  
  // Step 2: Competition Selection (optional)
  competitions?: ScoringCompetition[];
  selectedCompetitionId?: number | null;
  onCompetitionChange?: (competitionId: number | null) => void;
  showCompetitionStep?: boolean;
  
  // Step 3: Discipline Selection
  disciplines: ScoringDiscipline[];
  selectedDisciplineId: number | string | null;
  onDisciplineChange: (disciplineId: number | string | null) => void;
  getFilteredDisciplines?: () => ScoringDiscipline[];
  
  // UI Options
  loading?: boolean;
  showStepNumbers?: boolean;
  layout?: 'horizontal' | 'vertical';
  disciplineLayout?: 'grid' | 'list';
  
  // Translation keys (for customization)
  translationPrefix?: string;
}

export const EntityScoringSelector: React.FC<EntityScoringSelectorProps> = ({
  entities,
  selectedEntityId,
  onEntityChange,
  entityType,
  entityLabel,
  entityPlaceholder,
  competitions = [],
  selectedCompetitionId,
  onCompetitionChange,
  showCompetitionStep = true,
  disciplines,
  selectedDisciplineId,
  onDisciplineChange,
  getFilteredDisciplines,
  loading = false,
  showStepNumbers = true,
  layout = 'horizontal',
  disciplineLayout = 'grid',
  translationPrefix = 'scoring'
}) => {
  const { t } = useTranslation();

  // Use filtered disciplines if function provided, otherwise use all
  const displayDisciplines = getFilteredDisciplines ? getFilteredDisciplines() : disciplines;

  // Step validation
  const isStep1Complete = !!selectedEntityId;
  const isStep2Complete = !showCompetitionStep || !!selectedCompetitionId;
  const canShowStep3 = isStep1Complete && isStep2Complete;

  // Find selected items
  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const selectedCompetition = competitions.find(c => c.id === selectedCompetitionId);
  const selectedDiscipline = displayDisciplines.find(d => d.id === selectedDisciplineId);

  // Entity display helpers
  const getEntityDisplayName = (entity: ScoringEntity): string => {
    if (entityType === 'team' && entity.metadata) {
      const { clubName, riege, startNumber } = entity.metadata;
      let display = clubName || entity.name;
      if (riege) display += ` - Riege ${riege}`;
      if (startNumber) display += ` (${t('common.startNumber')}: ${startNumber})`;
      return display;
    }
    return entity.displayName || entity.name;
  };

  const getEntitySuccessText = (entity: ScoringEntity): string => {
    if (entityType === 'team' && entity.metadata?.riege) {
      return `Riege: ${entity.metadata.riege}${entity.metadata?.startNumber ? ` • ${t('common.startNumber')}: ${entity.metadata.startNumber}` : ''}`;
    }
    return '';
  };

  // Translation keys with fallbacks
  const getTranslationKey = (key: string): string => {
    return `${translationPrefix}.${key}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const containerClass = layout === 'horizontal' 
    ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
    : 'space-y-6';

  const disciplineGridClass = disciplineLayout === 'grid'
    ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-4'
    : 'space-y-2';

  return (
    <div className={containerClass}>
      {/* Step 1: Entity Selection */}
      <div className="bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="inline-flex items-center">
            {showStepNumbers && (
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
            )}
            {entityLabel || t(getTranslationKey(`select${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`), `${entityType} auswählen`)}
          </span>
        </label>
        
        <select
          value={selectedEntityId || ''}
          onChange={(e) => onEntityChange(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{entityPlaceholder || t(getTranslationKey(`choose${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`), `${entityType} wählen...`)}</option>
          {entities.map(entity => (
            <option key={entity.id} value={entity.id}>
              {getEntityDisplayName(entity)}
            </option>
          ))}
        </select>

        {selectedEntity && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ {t(getTranslationKey(`${entityType}Selected`), `${entityType} ausgewählt`)}: <strong>{selectedEntity.name}</strong>
            </p>
            {getEntitySuccessText(selectedEntity) && (
              <p className="text-xs text-green-600">
                {getEntitySuccessText(selectedEntity)}
              </p>
            )}
          </div>
        )}

        {entities.length === 0 && (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">⚠️ {t(getTranslationKey(`no${entityType.charAt(0).toUpperCase() + entityType.slice(1)}sAvailable`), `Keine ${entityType}s verfügbar`)}</p>
          </div>
        )}
      </div>

      {/* Step 2: Competition Selection (Optional) */}
      {showCompetitionStep && (
        <div className="bg-white rounded-lg border p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <span className="inline-flex items-center">
              {showStepNumbers && (
                <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2 ${
                  isStep1Complete ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
                }`}>2</span>
              )}
              {t(getTranslationKey('selectCompetition'), 'Wettkampf auswählen')}
              {!isStep1Complete && <span className="text-gray-400 ml-2">({t(getTranslationKey(`requires${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`), `erfordert ${entityType}auswahl`)})</span>}
            </span>
          </label>
          
          <select
            value={selectedCompetitionId || ''}
            onChange={(e) => onCompetitionChange?.(e.target.value ? Number(e.target.value) : null)}
            disabled={!isStep1Complete}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{t(getTranslationKey('chooseCompetition'), 'Wettkampf wählen...')}</option>
            {competitions.map(competition => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>

          {selectedCompetition && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                ✓ {t(getTranslationKey('competitionSelected'), 'Wettkampf ausgewählt')}: <strong>{selectedCompetition.name}</strong>
              </p>
            </div>
          )}

          {!isStep1Complete && (
            <div className="text-center py-8 bg-gray-50 rounded-lg mt-3">
              <p className="text-gray-500 text-sm">{t(getTranslationKey(`select${entityType.charAt(0).toUpperCase() + entityType.slice(1)}First`), `Bitte zuerst ${entityType} auswählen`)}</p>
            </div>
          )}

          {competitions.length === 0 && isStep1Complete && (
            <div className="text-center py-4 bg-orange-50 rounded-lg mt-3">
              <p className="text-orange-600 text-sm">⚠️ {t(getTranslationKey('noCompetitionsAvailable'), 'Keine Wettkämpfe verfügbar')}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Discipline Selection */}
      <div className="bg-white rounded-lg border p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <span className="inline-flex items-center">
            {showStepNumbers && (
              <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2 ${
                canShowStep3 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
              }`}>{showCompetitionStep ? '3' : '2'}</span>
            )}
            {t(getTranslationKey('selectDiscipline'), 'Disziplin auswählen')}
            {!canShowStep3 && (
              <span className="text-gray-400 ml-2">
                ({t(getTranslationKey('requiresSelection'), 'erfordert Auswahl')})
              </span>
            )}
          </span>
        </label>

        {!canShowStep3 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-sm">
              {t(getTranslationKey('selectRequiredFirst'), 'Bitte zuerst erforderliche Schritte auswählen')}
            </p>
          </div>
        ) : displayDisciplines.length === 0 ? (
          <div className="text-center py-4 bg-orange-50 rounded-lg">
            <p className="text-orange-600 text-sm">⚠️ {t(getTranslationKey('noDisciplinesAvailable'), 'Keine Disziplinen verfügbar')}</p>
          </div>
        ) : (
          <div className={disciplineGridClass}>
            {displayDisciplines.map((discipline, index) => (
              <div
                key={`discipline-${discipline.id || index}-${discipline.name}`}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedDisciplineId === discipline.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => onDisciplineChange(
                  selectedDisciplineId === discipline.id ? null : discipline.id
                )}
              >
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <img 
                      src={getIconUrl(discipline.icon || discipline.name) || ''}
                      alt={`${discipline.name} icon`}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <h3 className="font-medium text-sm">{discipline.name}</h3>
                  {discipline.shortName && discipline.shortName !== discipline.name && (
                    <p className="text-xs text-gray-500 mt-1">({discipline.shortName})</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDiscipline && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ {t(getTranslationKey('disciplineSelected'), 'Disziplin ausgewählt')}: <strong>{selectedDiscipline.name}</strong>
            </p>
            <p className="text-xs text-green-600">
              {t(getTranslationKey('readyToEnterScore'), 'Bereit zur Wertungserfassung')}
            </p>
          </div>
        )}

        {canShowStep3 && !selectedDisciplineId && displayDisciplines.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              {t(getTranslationKey('disciplinesAvailable'), '{{count}} Disziplinen verfügbar', { count: displayDisciplines.length })}
            </p>
            <p className="text-xs text-blue-600">
              {t(getTranslationKey('clickDiscipline'), 'Klicken Sie auf eine Disziplin zum Werten')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityScoringSelector;