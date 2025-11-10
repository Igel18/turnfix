/**
 * GroupsHelpPanel Component
 * Point 140: Help Information for Groups Management
 * 
 * Displays context-sensitive help for groups
 */

import { useTranslation } from 'react-i18next';
import { YellowInfoBox, BlueInfoBox } from '@/components/InfoBoxes';

export function GroupsHelpPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 mb-6">
      {/* What are Groups */}
      <BlueInfoBox title={t('groups.help.whatAreGroups.title')}>
        <p className="text-sm">
          {t('groups.help.whatAreGroups.description')}
        </p>
      </BlueInfoBox>

      {/* When to use Groups */}
      <YellowInfoBox title={t('groups.help.whenToUse.title')}>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>{t('groups.help.whenToUse.item1')}</li>
          <li>{t('groups.help.whenToUse.item2')}</li>
          <li>{t('groups.help.whenToUse.item3')}</li>
        </ul>
      </YellowInfoBox>

      {/* Differences: Groups vs Teams */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('groups.help.differences.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm">
              {t('groups.help.differences.groups')}
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• {t('groups.help.differences.groupsItem1')}</li>
              <li>• {t('groups.help.differences.groupsItem2')}</li>
              <li>• {t('groups.help.differences.groupsItem3')}</li>
            </ul>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 text-sm">
              {t('groups.help.differences.teams')}
            </h4>
            <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
              <li>• {t('groups.help.differences.teamsItem1')}</li>
              <li>• {t('groups.help.differences.teamsItem2')}</li>
              <li>• {t('groups.help.differences.teamsItem3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('groups.help.properties.title')}
        </h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong className="text-gray-900 dark:text-white">{t('groups.help.properties.name')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('groups.help.properties.nameDesc')}
            </span>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">{t('groups.help.properties.club')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('groups.help.properties.clubDesc')}
            </span>
          </div>
          <div>
            <strong className="text-gray-900 dark:text-white">{t('groups.help.properties.members')}:</strong>
            <span className="text-gray-700 dark:text-gray-300 ml-2">
              {t('groups.help.properties.membersDesc')}
            </span>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Example 1 */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 text-sm">
            {t('groups.help.examples.example1.title')}
          </h4>
          <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
            <li>• <strong>{t('groups.help.properties.name')}:</strong> Jugendgruppe U14</li>
            <li>• <strong>{t('common.club')}:</strong> TV Musterstadt</li>
            <li>• <strong>{t('groups.help.properties.members')}:</strong> Anna Schmidt, Max Müller, Lisa Weber, Tom Klein</li>
            <li className="text-xs italic mt-1">→ {t('groups.help.examples.example1.usageDesc')}</li>
          </ul>
        </div>

        {/* Example 2 */}
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2 text-sm">
            {t('groups.help.examples.example2.title')}
          </h4>
          <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
            <li>• <strong>{t('groups.help.properties.name')}:</strong> Leistungsgruppe Herren</li>
            <li>• <strong>{t('common.club')}:</strong> TSV Beispielverein</li>
            <li>• <strong>{t('groups.help.properties.members')}:</strong> Peter Lang, Michael Braun, Stefan Hoffmann</li>
            <li className="text-xs italic mt-1">→ {t('groups.help.examples.example2.usageDesc')}</li>
          </ul>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t('groups.help.workflow.title')}
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>{t('groups.help.workflow.step1')}</li>
          <li>{t('groups.help.workflow.step2')}</li>
          <li>{t('groups.help.workflow.step3')}</li>
          <li>{t('groups.help.workflow.step4')}</li>
        </ol>
      </div>
    </div>
  );
}
