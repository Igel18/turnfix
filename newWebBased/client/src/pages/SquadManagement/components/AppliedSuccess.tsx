/**
 * AppliedSuccess
 * Step 3 sub-component for AutoAssignDialog.
 * Shows a success screen after a proposal has been applied.
 */

import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { Proposal } from '../AutoAssign.types';

export interface AppliedSuccessProps {
  proposal: Proposal | null;
  onClose: () => void;
  t: any;
}

export const AppliedSuccess: React.FC<AppliedSuccessProps> = ({ proposal, onClose, t }) => (
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
