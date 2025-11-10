/**
 * TeamsHelpPanel Component
 * Point 140: Help Information for Teams Management
 * 
 * Displays context-sensitive help for teams
 */

import { useTranslation } from 'react-i18next';
import { YellowInfoBox, BlueInfoBox } from '@/components/InfoBoxes';

export function TeamsHelpPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 mb-6">
      {/* What are Teams */}
      <BlueInfoBox title={t('teams.help.whatAreTeams.title')}>
        <p className="text-sm">
          {t('teams.help.whatAreTeams.description')}
        </p>
      </BlueInfoBox>

      {/* When to use Teams */}
      <YellowInfoBox title={t('teams.help.whenToUse.title')}>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>{t('teams.help.whenToUse.item1')}</li>
          <li>{t('teams.help.whenToUse.item2')}</li>
          <li>{t('teams.help.whenToUse.item3')}</li>
        </ul>
      </YellowInfoBox>

      {/* Properties */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('teams.help.properties.title')}
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong className="text-gray-900 dark:text-white">{t('teams.help.properties.club')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('teams.help.properties.clubDesc')}
            </span>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">{t('teams.help.properties.competition')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('teams.help.properties.competitionDesc')}
            </span>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">{t('teams.help.properties.riege')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('teams.help.properties.riegeDesc')}
            </span>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">{t('teams.help.properties.startNumber')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('teams.help.properties.startNumberDesc')}
            </span>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Example 1 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm">
            {t('teams.help.examples.example1.title')}
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>{t('common.club')}:</strong> TV Musterstadt</li>
            <li>• <strong>{t('common.competition')}:</strong> Mannschaftsmehrkampf 3. Liga männlich</li>
            <li>• <strong>{t('teams.riege')}:</strong> Riege A</li>
            <li>• <strong>{t('teams.startNumber')}:</strong> 1</li>
          </ul>
        </div>

        {/* Example 2 */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 text-sm">
            {t('teams.help.examples.example2.title')}
          </h4>
          <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
            <li>• <strong>{t('common.club')}:</strong> TSV Beispielverein</li>
            <li>• <strong>{t('common.competition')}:</strong> Mannschaftsmehrkampf Oberliga weiblich</li>
            <li>• <strong>{t('teams.riege')}:</strong> Riege B</li>
            <li>• <strong>{t('teams.startNumber')}:</strong> 2</li>
          </ul>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('teams.help.workflow.title')}
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>{t('teams.help.workflow.step1')}</li>
          <li>{t('teams.help.workflow.step2')}</li>
          <li>{t('teams.help.workflow.step3')}</li>
          <li>{t('teams.help.workflow.step4')}</li>
        </ol>
      </div>
    </div>
  );
}
