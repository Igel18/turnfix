/**
 * AutoAssignDialog — thin orchestrator component.
 * All JSX sub-components live in their own files:
 *   - CriteriaForm.tsx  (Step 1)
 *   - ProposalReview.tsx (Step 2)
 *   - AppliedSuccess.tsx (Step 3)
 * All business logic lives in hooks/useAutoAssign.ts.
 *
 * Multi-step modal dialog for automatic squad assignment:
 * Step 1: Configure criteria (squad size, gender separation, etc.)
 * Step 2: Review generated proposals
 * Step 3: Accept a proposal to create squads
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CogIcon, SparklesIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import WizardModal from '@/components/WizardModal';
import { useAutoAssign } from '../hooks/useAutoAssign';
import { CriteriaForm } from './CriteriaForm';
import { ProposalReview } from './ProposalReview';
import { AppliedSuccess } from './AppliedSuccess';

interface AutoAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  onApplied: () => void;
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
    unassignedParticipants,
    existingSquadCount,
    existingAssignedCount,
    generateProposals,
    applyProposal,
    reset,
    loadDefaults,
  } = useAutoAssign();

  const [step, setStep] = useState<Step>('criteria');
  const [selectedProposalId, setSelectedProposalId] = useState<number>(1);

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

  const wizardSteps = [
    { key: 'criteria', label: t('squadManagement.autoAssign.steps.criteria'), icon: CogIcon },
    { key: 'proposals', label: t('squadManagement.autoAssign.steps.proposals'), icon: SparklesIcon },
    { key: 'applied', label: t('squadManagement.autoAssign.steps.applied'), icon: CheckCircleIcon },
  ];

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('squadManagement.autoAssign.title')}
      steps={wizardSteps}
      currentStep={step}
      size="3xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

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

        {step === 'proposals' && proposals.length > 0 && (
          <ProposalReview
            proposals={proposals}
            selectedProposalId={selectedProposalId}
            onSelectProposal={setSelectedProposalId}
            onApply={handleApply}
            onBack={() => setStep('criteria')}
            isApplying={isApplying}
            totalParticipants={totalParticipants}
            unassignedParticipants={unassignedParticipants}
            existingSquadCount={existingSquadCount}
            existingAssignedCount={existingAssignedCount}
            keepExistingSquads={criteria.keepExistingSquads}
            t={t}
          />
        )}

        {step === 'applied' && (
          <AppliedSuccess
            proposal={selectedProposal}
            onClose={handleClose}
            t={t}
          />
        )}
      </div>
    </WizardModal>
  );
};

export default AutoAssignDialog;
