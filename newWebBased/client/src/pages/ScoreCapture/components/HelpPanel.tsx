/**
 * HelpPanel Component
 * Point 123: Separation of Concerns
 * 
 * Displays context-sensitive help for score capture
 */

import { useTranslation } from 'react-i18next';

export function HelpPanel() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.modeRules.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.modeRules.step1')}</li>
          <li>{t('scoreCapture.help.modeRules.step2')}</li>
          <li>{t('scoreCapture.help.modeRules.step3')}</li>
          <li>{t('scoreCapture.help.modeRules.step4')}</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.navigation.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.navigation.enter')}</li>
          <li>{t('scoreCapture.help.navigation.arrows')}</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.tips.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.tips.validation')}</li>
          <li>{t('scoreCapture.help.tips.autosave')}</li>
        </ul>
      </div>
    </div>
  );
}
