/**
 * HelpPanel Component
 * Point 123: Separation of Concerns
 * 
 * Displays context-sensitive help for score capture
 */

import { BlueInfoBox } from '@/components/InfoBoxes';
import { useTranslation } from 'react-i18next';
import type { HelpPanelProps } from '../ScoreCapture.types';

export function HelpPanel({ showJuryScores }: HelpPanelProps) {
  const { t } = useTranslation();

  const juryScoresHelp = (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.juryScores.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.juryScores.step1')}</li>
          <li>{t('scoreCapture.help.juryScores.step2')}</li>
          <li>{t('scoreCapture.help.juryScores.step3')}</li>
          <li>{t('scoreCapture.help.juryScores.step4')}</li>
        </ul>
      </div>
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.navigation.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.navigation.enter')}</li>
          <li>{t('scoreCapture.help.navigation.arrows')}</li>
        </ul>
      </div>
    </div>
  );

  const simpleScoresHelp = (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-blue-900 mb-2">{t('scoreCapture.help.simpleScores.title')}</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>{t('scoreCapture.help.simpleScores.step1')}</li>
          <li>{t('scoreCapture.help.simpleScores.step2')}</li>
          <li>{t('scoreCapture.help.simpleScores.step3')}</li>
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

  return (
    <div className="mb-6">
      <BlueInfoBox>
        {showJuryScores ? juryScoresHelp : simpleScoresHelp}
      </BlueInfoBox>
    </div>
  );
}
