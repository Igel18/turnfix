/**
 * TimePlanningWizard
 *
 * 6-step guided wizard for setting up the event time plan:
 *   1. startTime  — Event start time
 *   2. timing     — Exercise duration / timing settings
 *   3. rounds     — Assign competitions to Durchgänge
 *   4. lanes      — Assign competitions to Bahnen
 *   5. generate   — Review start assignments & generate round-robin
 *   6. schedule   — Summary + open matrix for fine-tuning
 */

import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  CalendarDaysIcon,
  ArrowsRightLeftIcon,
  TableCellsIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import WizardModal, { type WizardStepDef } from '@/components/WizardModal';
import { YellowInfoBox } from '@/components/InfoBoxes';
import type { Competition, TimeSettings } from '../TimePlanning.types';
import {
  useTimePlanningWizard,
  type WizardStep,
} from '../hooks/useTimePlanningWizard';

// ── Props ─────────────────────────────────────────────────────────────────────

interface TimePlanningWizardProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  competitions: Competition[];
  timeSettings: TimeSettings;
  setTimeSettings: (s: TimeSettings) => void;
  onRefetch: () => void;
  onViewMatrix: () => void;
}

// ── Wizard step definitions ───────────────────────────────────────────────────

function buildSteps(t: ReturnType<typeof useTranslation>['t']): WizardStepDef[] {
  return [
    { key: 'startTime', label: t('timePlanning.wizard.steps.startTime'), icon: ClockIcon },
    { key: 'timing',    label: t('timePlanning.wizard.steps.timing'),    icon: ClockIcon },
    { key: 'rounds',    label: t('timePlanning.wizard.steps.rounds'),    icon: CalendarDaysIcon },
    { key: 'lanes',     label: t('timePlanning.wizard.steps.lanes'),     icon: ArrowsRightLeftIcon },
    { key: 'generate',  label: t('timePlanning.wizard.steps.generate'),  icon: SparklesIcon },
    { key: 'schedule',  label: t('timePlanning.wizard.steps.schedule'),  icon: TableCellsIcon },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TimePlanningWizard({
  isOpen,
  onClose,
  eventId,
  competitions,
  timeSettings,
  setTimeSettings,
  onRefetch,
  onViewMatrix,
}: TimePlanningWizardProps) {
  const { t } = useTranslation();
  const steps = buildSteps(t);

  const wizard = useTimePlanningWizard({
    eventId,
    competitions,
    timeSettings,
    setTimeSettings,
    onRefetch,
    onClose,
  });

  const handleClose = () => {
    wizard.reset();
    onClose();
  };

  const handleOpenMatrix = () => {
    handleClose();
    onViewMatrix();
  };

  // ── Nav buttons ─────────────────────────────────────────────────────────
  const navButtons = (
    <div className="flex justify-between mt-6 pt-4 border-t">
      <button
        onClick={wizard.isFirstStep ? handleClose : wizard.goBack}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {wizard.isFirstStep
          ? t('common.cancel')
          : t('common.back')}
      </button>
      {wizard.currentStep !== 'generate' && wizard.currentStep !== 'schedule' && (
        <button
          onClick={wizard.goNext}
          disabled={wizard.savingRounds || wizard.savingBahnen}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {wizard.savingRounds || wizard.savingBahnen
            ? t('timePlanning.wizard.saving')
            : t('timePlanning.wizard.next')}
        </button>
      )}
    </div>
  );

  // ── Step 1: Start time ───────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-5">
      <YellowInfoBox>{t('timePlanning.wizard.step1.hint')}</YellowInfoBox>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('timePlanning.wizard.step1.startTimeLabel')}
          </label>
          <input
            type="time"
            value={wizard.startTime}
            onChange={e => wizard.setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('timePlanning.timeSettings.warmupDuration')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="60"
              value={wizard.timeSettings.warmupDurationMinutes}
              onChange={e => wizard.setTimeSettings({
                ...wizard.timeSettings,
                warmupDurationMinutes: parseInt(e.target.value) || 0,
              })}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">{t('timePlanning.minutes')}</span>
          </div>
        </div>
      </div>
      {navButtons}
    </div>
  );

  // ── Step 2: Timing ───────────────────────────────────────────────────────
  const step2 = (
    <div className="space-y-5">
      <YellowInfoBox>{t('timePlanning.wizard.step2.hint')}</YellowInfoBox>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { key: 'exerciseDurationMinutes',    label: t('timePlanning.timeSettings.exerciseDuration'),    min: 1, max: 60 },
          { key: 'rotationIntervalMinutes',    label: t('timePlanning.timeSettings.rotationInterval'),    min: 5, max: 120 },
          { key: 'breakBetweenDevicesMinutes', label: t('timePlanning.timeSettings.breakBetweenDevices'), min: 0, max: 60 },
        ].map(({ key, label, min, max }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={min} max={max}
                value={(wizard.timeSettings as any)[key]}
                onChange={e => wizard.setTimeSettings({
                  ...wizard.timeSettings,
                  [key]: parseInt(e.target.value) || min,
                })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">{t('timePlanning.minutes')}</span>
            </div>
          </div>
        ))}
      </div>
      {navButtons}
    </div>
  );

  // ── Step 3: Rounds ───────────────────────────────────────────────────────
  const allRounds = Array.from({ length: wizard.maxRound + 1 }, (_, i) => i + 1);

  const step3 = (
    <div className="space-y-4">
      <YellowInfoBox>{t('timePlanning.wizard.step3.hint')}</YellowInfoBox>
      {/* Session label inputs */}
      <div className="flex flex-wrap gap-3 mb-2">
        {Array.from({ length: wizard.maxRound }, (_, i) => i + 1).map(r => (
          <div key={r} className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('timePlanning.session')} {r}:</span>
            <input
              value={wizard.sessionLabels[r] ?? ''}
              onChange={e => wizard.setSessionLabel(r, e.target.value)}
              placeholder={t('timePlanning.wizard.step3.labelPlaceholder')}
              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-gray-200 border rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">{t('competitions.fields.name.label')}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">{t('timePlanning.round')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {competitions.map(c => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-gray-800">{c.number} {c.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={wizard.pendingRounds[c.id] ?? c.round}
                    onChange={e => wizard.setCompetitionRound(c.id, Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  >
                    {allRounds.map(r => (
                      <option key={r} value={r}>
                        {t('timePlanning.session')} {r}
                        {wizard.sessionLabels[r] ? ` — ${wizard.sessionLabels[r]}` : ''}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {navButtons}
    </div>
  );

  // ── Step 4: Lanes ────────────────────────────────────────────────────────
  const allBahnen = Array.from(
    new Set([...Object.values(wizard.pendingBahnen), 1, 2, 3, 4]),
  ).sort((a, b) => a - b);

  const step4 = (
    <div className="space-y-4">
      <YellowInfoBox>{t('timePlanning.wizard.step4.hint')}</YellowInfoBox>
      {/* Bahn label inputs */}
      <div className="flex flex-wrap gap-3 mb-2">
        {allBahnen.map(b => (
          <div key={b} className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('timePlanning.wizard.step4.bahnLabel')} {b}:</span>
            <input
              value={wizard.bahnLabels[b] ?? ''}
              onChange={e => wizard.setBahnLabel(b, e.target.value)}
              placeholder={t('timePlanning.wizard.step4.bahnPlaceholder')}
              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-gray-200 border rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">{t('timePlanning.session')}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">{t('competitions.fields.name.label')}</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">{t('timePlanning.wizard.step4.bahnColumn')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {competitions.map(c => (
              <tr key={c.id}>
                <td className="px-3 py-2 text-gray-500 text-xs">
                  {t('timePlanning.session')} {wizard.pendingRounds[c.id] ?? c.round}
                  {wizard.sessionLabels[wizard.pendingRounds[c.id] ?? c.round]
                    ? ` — ${wizard.sessionLabels[wizard.pendingRounds[c.id] ?? c.round]}`
                    : ''}
                </td>
                <td className="px-3 py-2 text-gray-800">{c.number} {c.name}</td>
                <td className="px-3 py-2">
                  <select
                    value={wizard.pendingBahnen[c.id] ?? 1}
                    onChange={e => wizard.setCompetitionBahn(c.id, Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  >
                    {allBahnen.map(b => (
                      <option key={b} value={b}>
                        {t('timePlanning.wizard.step4.bahnLabel')} {b}
                        {wizard.bahnLabels[b] ? ` — ${wizard.bahnLabels[b]}` : ''}
                      </option>
                    ))}
                    <option value={(Math.max(...allBahnen) + 1)}>
                      + {t('timePlanning.wizard.step4.newBahn')}
                    </option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {navButtons}
    </div>
  );

  // ── Step 5: Generate ─────────────────────────────────────────────────────
  const step5 = (
    <div className="space-y-4">
      <YellowInfoBox>{t('timePlanning.wizard.step5.hint')}</YellowInfoBox>
      {wizard.loadingDurchgangData ? (
        <div className="text-center py-8 text-gray-500">{t('timePlanning.loadingData')}</div>
      ) : wizard.durchgangData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('timePlanning.wizard.step5.noData')}</div>
      ) : (
        <div className="space-y-6">
          {wizard.durchgangData.map(d => (
            <div key={d.durchgang} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 font-medium text-sm text-gray-700">
                {t('timePlanning.session')} {d.durchgang}
                {wizard.sessionLabels[d.durchgang] ? ` — ${wizard.sessionLabels[d.durchgang]}` : ''}
              </div>
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('timePlanning.squad')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('timePlanning.wizard.step5.startDevice')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {d.squads.map(squad => (
                    <tr key={squad}>
                      <td className="px-3 py-2 font-mono text-gray-800">{squad}</td>
                      <td className="px-3 py-2">
                        <select
                          value={wizard.startAssignments[d.durchgang]?.[squad] ?? d.disciplines[0]?.id ?? ''}
                          onChange={e => wizard.setStartAssignment(d.durchgang, squad, Number(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        >
                          {d.disciplines.map(disc => (
                            <option key={disc.id} value={disc.id}>{disc.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={wizard.autoAssignStartPositions}
              className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('timePlanning.wizard.step5.autoAssign')}
            </button>
            <button
              onClick={wizard.generateRoundRobin}
              disabled={wizard.generating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <SparklesIcon className="h-4 w-4" />
              {wizard.generating
                ? t('timePlanning.wizard.step5.generating')
                : t('timePlanning.wizard.step5.generate')}
            </button>
          </div>

          {wizard.generationError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {wizard.generationError}
            </p>
          )}
        </div>
      )}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <button onClick={wizard.goBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          {t('common.back')}
        </button>
      </div>
    </div>
  );

  // ── Step 6: Schedule summary ─────────────────────────────────────────────
  const step6 = (
    <div className="space-y-5">
      {wizard.generationResult ? (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">{t('timePlanning.wizard.step6.success')}</p>
            <p className="text-sm text-green-700 mt-1">{wizard.generationResult.message}</p>
            <p className="text-xs text-green-600 mt-1">
              {t('timePlanning.wizard.step6.cellsGenerated', { count: wizard.generationResult.totalCells })}
            </p>
          </div>
        </div>
      ) : (
        <YellowInfoBox>{t('timePlanning.wizard.step6.noResult')}</YellowInfoBox>
      )}
      <p className="text-sm text-gray-600">{t('timePlanning.wizard.step6.nextSteps')}</p>
      <div className="flex justify-between mt-6 pt-4 border-t">
        <button onClick={wizard.goBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          {t('common.back')}
        </button>
        <button
          onClick={handleOpenMatrix}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <TableCellsIcon className="h-4 w-4" />
          {t('timePlanning.wizard.step6.openMatrix')}
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  const stepContent: Record<WizardStep, React.ReactNode> = {
    startTime: step1,
    timing: step2,
    rounds: step3,
    lanes: step4,
    generate: step5,
    schedule: step6,
  };

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('timePlanning.wizard.title')}
      steps={steps}
      currentStep={wizard.currentStep}
      size="2xl"
    >
      {stepContent[wizard.currentStep]}
    </WizardModal>
  );
}
