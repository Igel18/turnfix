/**
 * AutoAssignDialog Component
 * 
 * Multi-step modal dialog for automatic squad assignment:
 * Step 1: Configure criteria (squad size, gender separation, etc.)
 * Step 2: Review generated proposals
 * Step 3: Accept a proposal to create squads
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CogIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import UnifiedModal from '@/components/UnifiedModal';
import { GenderBadge } from '@/components/GenderBadge';
import { useAutoAssign } from '../hooks/useAutoAssign';
import type { Proposal, ProposedSquad } from '../AutoAssign.types';

interface AutoAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onApplied: () => void; // Called after successful apply to refresh squads
}

type Step = 'criteria' | 'proposals' | 'applied';

export const AutoAssignDialog: React.FC<AutoAssignDialogProps> = ({
  isOpen,
  onClose,
  eventId,
  onApplied,
}) => {
  const { t } = useTranslation();
  const {
    criteria,
    setCriteria,
    proposals,
    isGenerating,
    isApplying,
    error,
    totalParticipants,
    generateProposals,
    applyProposal,
    reset,
    loadDefaults,
  } = useAutoAssign();

  const [step, setStep] = useState<Step>('criteria');
  const [selectedProposalId, setSelectedProposalId] = useState<number>(1);

  // Load defaults when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadDefaults();
      setStep('criteria');
      setSelectedProposalId(1);
      reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    await generateProposals(eventId);
    setStep('proposals');
    setSelectedProposalId(1);
  }, [eventId, generateProposals]);

  const handleApply = useCallback(async () => {
    const proposal = proposals.find(p => p.id === selectedProposalId);
    if (!proposal) return;
    try {
      await applyProposal(eventId, proposal);
      setStep('applied');
      onApplied();
    } catch {
      // error is set inside the hook
    }
  }, [eventId, proposals, selectedProposalId, applyProposal, onApplied]);

  const handleClose = () => {
    reset();
    setStep('criteria');
    onClose();
  };

  const selectedProposal = proposals.find(p => p.id === selectedProposalId) || null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('squadManagement.autoAssign.title')}
      size="3xl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Step indicator */}
        <StepIndicator step={step} t={t} />

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Criteria Form */}
        {step === 'criteria' && (
          <CriteriaForm
            criteria={criteria}
            setCriteria={setCriteria}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            onCancel={handleClose}
            t={t}
          />
        )}

        {/* Step 2: Review Proposals */}
        {step === 'proposals' && proposals.length > 0 && (
          <ProposalReview
            proposals={proposals}
            selectedProposalId={selectedProposalId}
            onSelectProposal={setSelectedProposalId}
            onApply={handleApply}
            onBack={() => setStep('criteria')}
            isApplying={isApplying}
            totalParticipants={totalParticipants}
            t={t}
          />
        )}

        {/* Step 3: Applied */}
        {step === 'applied' && (
          <AppliedSuccess
            proposal={selectedProposal}
            onClose={handleClose}
            t={t}
          />
        )}
      </div>
    </UnifiedModal>
  );
};

// ── Step Indicator ──
const StepIndicator: React.FC<{ step: Step; t: any }> = ({ step, t }) => {
  const steps = [
    { key: 'criteria', label: t('squadManagement.autoAssign.steps.criteria'), icon: CogIcon },
    { key: 'proposals', label: t('squadManagement.autoAssign.steps.proposals'), icon: SparklesIcon },
    { key: 'applied', label: t('squadManagement.autoAssign.steps.applied'), icon: CheckCircleIcon },
  ];

  const currentIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div className={`h-0.5 w-8 ${isDone ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
            <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 ${
              isActive ? 'bg-blue-100 text-blue-700' :
              isDone ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-400'
            }`}>
              <Icon className="h-4 w-4" />
              {s.label}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Criteria Form ──
interface CriteriaFormProps {
  criteria: any;
  setCriteria: React.Dispatch<React.SetStateAction<any>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onCancel: () => void;
  t: any;
}

const CriteriaForm: React.FC<CriteriaFormProps> = ({
  criteria,
  setCriteria,
  onGenerate,
  isGenerating,
  onCancel,
  t,
}) => {
  const updateField = (field: string, value: any) => {
    setCriteria((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t('squadManagement.autoAssign.criteriaDescription')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Max participants per squad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.maxPerSquad')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={2}
            max={50}
            value={criteria.maxParticipantsPerSquad}
            onChange={e => updateField('maxParticipantsPerSquad', parseInt(e.target.value) || 12)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.maxPerSquad')}</p>
        </div>

        {/* Number of proposals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.numberOfProposals')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={criteria.numberOfProposals}
            onChange={e => updateField('numberOfProposals', parseInt(e.target.value) || 3)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.numberOfProposals')}</p>
        </div>

        {/* Naming prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.namingPrefix')}
          </label>
          <select
            value={criteria.namingPrefix}
            onChange={e => updateField('namingPrefix', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gender">{t('squadManagement.autoAssign.namingOptions.gender')}</option>
            <option value="number">{t('squadManagement.autoAssign.namingOptions.number')}</option>
            <option value="none">{t('squadManagement.autoAssign.namingOptions.none')}</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.namingPrefix')}</p>
        </div>

        {/* Break count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.breakCount')}
          </label>
          <input
            type="number"
            min={0}
            max={10}
            value={criteria.breakCount}
            onChange={e => updateField('breakCount', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.breakCount')}</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-2">
        {/* Separate genders */}
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.separateGenders')}
          hint={t('squadManagement.autoAssign.hints.separateGenders')}
          checked={criteria.separateGenders}
          onChange={val => updateField('separateGenders', val)}
        />

        {/* Keep clubs together */}
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.keepClubsTogether')}
          hint={t('squadManagement.autoAssign.hints.keepClubsTogether')}
          checked={criteria.keepClubsTogether}
          onChange={val => updateField('keepClubsTogether', val)}
        />

        {/* Group by age category */}
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.groupByAgeCategory')}
          hint={t('squadManagement.autoAssign.hints.groupByAgeCategory')}
          checked={criteria.groupByAgeCategory}
          onChange={val => updateField('groupByAgeCategory', val)}
        />

        {/* Age ranges (only if groupByAgeCategory) */}
        {criteria.groupByAgeCategory && (
          <div className="ml-12">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('squadManagement.autoAssign.fields.ageCategoryRanges')}
            </label>
            <input
              type="text"
              value={criteria.ageCategoryRanges}
              onChange={e => updateField('ageCategoryRanges', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="6-8,9-10,11-12,13-14,15-18"
            />
            <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.ageCategoryRanges')}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              {t('squadManagement.autoAssign.generating')}
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {t('squadManagement.autoAssign.generateButton')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ── Toggle Row component ──
const ToggleRow: React.FC<{
  label: string;
  hint: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, hint, checked, onChange }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    <div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  </div>
);

// ── Proposal Review ──
interface ProposalReviewProps {
  proposals: Proposal[];
  selectedProposalId: number;
  onSelectProposal: (id: number) => void;
  onApply: () => void;
  onBack: () => void;
  isApplying: boolean;
  totalParticipants: number | null;
  t: any;
}

const ProposalReview: React.FC<ProposalReviewProps> = ({
  proposals,
  selectedProposalId,
  onSelectProposal,
  onApply,
  onBack,
  isApplying,
  totalParticipants,
  t,
}) => {
  const selected = proposals.find(p => p.id === selectedProposalId) || proposals[0];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          {t('squadManagement.autoAssign.proposalSummary', {
            count: proposals.length,
            participants: totalParticipants || 0,
          })}
        </p>
      </div>

      {/* Proposal tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {proposals.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectProposal(p.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors ${
              p.id === selectedProposalId
                ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('squadManagement.autoAssign.proposalTab', { num: p.id })}
          </button>
        ))}
      </div>

      {/* Selected proposal stats */}
      {selected && (
        <>
          <ProposalStatsBar stats={selected.stats} t={t} />

          {/* Squads grid */}
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {selected.squads.map((squad, idx) => (
              <SquadCard key={idx} squad={squad} t={t} />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('squadManagement.autoAssign.backToCriteria')}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {t('squadManagement.autoAssign.applyWarning')}
          </span>
          <button
            onClick={onApply}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('squadManagement.autoAssign.applying')}
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4" />
                {t('squadManagement.autoAssign.applyButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Stats bar ──
const ProposalStatsBar: React.FC<{ stats: Proposal['stats']; t: any }> = ({ stats, t }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <StatCard
      label={t('squadManagement.autoAssign.stats.totalSquads')}
      value={stats.totalSquads - stats.breakSquads}
    />
    <StatCard
      label={t('squadManagement.autoAssign.stats.totalParticipants')}
      value={stats.totalParticipants}
    />
    <StatCard
      label={t('squadManagement.autoAssign.stats.avgPerSquad')}
      value={stats.avgParticipantsPerSquad}
    />
    <StatCard
      label={t('squadManagement.autoAssign.stats.range')}
      value={`${stats.minParticipantsPerSquad}–${stats.maxParticipantsPerSquad}`}
    />
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
    <div className="text-lg font-semibold text-gray-900">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

// ── Squad Card ──
const SquadCard: React.FC<{ squad: ProposedSquad; t: any }> = ({ squad, t }) => {
  const [expanded, setExpanded] = useState(false);

  if (squad.isBreak) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">⏸ {squad.name}</span>
          <span className="text-xs text-gray-400">{t('squadManagement.autoAssign.breakSquad')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">{squad.name}</span>
          <span className="text-xs text-gray-500">({squad.colorName})</span>
          {squad.genderGroup !== 'mixed' && (
            <GenderBadge value={squad.genderGroup === 'male' ? 'männlich' : 'weiblich'} />
          )}
          {squad.ageCategory && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
              {squad.ageCategory} {t('squadManagement.autoAssign.years')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {squad.participants.length} {t('squadManagement.autoAssign.participants')}
          </span>
          <svg className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Participant list */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left py-1">{t('common.name')}</th>
                <th className="text-left py-1">{t('squadManagement.autoAssign.clubColumn')}</th>
                <th className="text-left py-1">{t('squadManagement.autoAssign.ageColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {squad.participants.map(p => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="py-1 text-gray-900">{p.lastname}, {p.firstname}</td>
                  <td className="py-1 text-gray-600">{p.club || '–'}</td>
                  <td className="py-1 text-gray-600">{p.age ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Applied Success ──
const AppliedSuccess: React.FC<{
  proposal: Proposal | null;
  onClose: () => void;
  t: any;
}> = ({ proposal, onClose, t }) => (
  <div className="text-center py-6 space-y-4">
    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
    <h3 className="text-lg font-semibold text-gray-900">
      {t('squadManagement.autoAssign.appliedTitle')}
    </h3>
    {proposal && (
      <p className="text-sm text-gray-600">
        {t('squadManagement.autoAssign.appliedMessage', {
          squads: proposal.stats.totalSquads - proposal.stats.breakSquads,
          participants: proposal.stats.totalParticipants,
        })}
      </p>
    )}
    <button
      onClick={onClose}
      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
    >
      {t('common.close')}
    </button>
  </div>
);

export default AutoAssignDialog;
