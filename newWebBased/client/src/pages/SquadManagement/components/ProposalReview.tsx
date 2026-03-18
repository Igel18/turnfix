/**
 * ProposalReview + ProposalStatsBar + StatCard + SquadCard
 * Step 2 sub-components for AutoAssignDialog.
 *
 * ProposalReview: Tabbed list of generated assignment proposals.
 * ProposalStatsBar: Summary statistics row for the selected proposal.
 * StatCard: Single stat value+label pill.
 * SquadCard: Expandable card showing one proposed squad and its participants.
 */

import React, { useState } from 'react';
import { InformationCircleIcon, CheckCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { GenderBadge } from '@/components/GenderBadge';
import type { Proposal, ProposedSquad } from '../AutoAssign.types';

// ── StatCard ──────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
    <div className="text-lg font-semibold text-gray-900">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

// ── ProposalStatsBar ──────────────────────────────────────────────────────────

export const ProposalStatsBar: React.FC<{ stats: Proposal['stats']; t: any }> = ({ stats, t }) => (
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

// ── SquadCard ─────────────────────────────────────────────────────────────────

export const SquadCard: React.FC<{ squad: ProposedSquad; t: any }> = ({ squad, t }) => {
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
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

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

// ── ProposalReview ────────────────────────────────────────────────────────────

export interface ProposalReviewProps {
  proposals: Proposal[];
  selectedProposalId: number;
  onSelectProposal: (id: number) => void;
  onApply: () => void;
  onBack: () => void;
  isApplying: boolean;
  totalParticipants: number | null;
  unassignedParticipants: number | null;
  existingSquadCount: number | null;
  existingAssignedCount: number | null;
  keepExistingSquads: boolean;
  t: any;
}

export const ProposalReview: React.FC<ProposalReviewProps> = ({
  proposals,
  selectedProposalId,
  onSelectProposal,
  onApply,
  onBack,
  isApplying,
  totalParticipants,
  unassignedParticipants,
  existingSquadCount,
  existingAssignedCount,
  keepExistingSquads,
  t,
}) => {
  const selected = proposals.find(p => p.id === selectedProposalId) || proposals[0];

  return (
    <div className="space-y-4">
      {/* Keep existing info box */}
      {keepExistingSquads && existingSquadCount != null && existingSquadCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {t('squadManagement.autoAssign.keepExistingInfo', {
              squads: existingSquadCount,
              assigned: existingAssignedCount || 0,
            })}
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          {keepExistingSquads && unassignedParticipants != null ? (
            t('squadManagement.autoAssign.proposalSummaryKeepExisting', {
              count: proposals.length,
              unassigned: unassignedParticipants,
              total: totalParticipants || 0,
            })
          ) : (
            t('squadManagement.autoAssign.proposalSummary', {
              count: proposals.length,
              participants: totalParticipants || 0,
            })
          )}
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

      {/* Selected proposal stats + squad cards */}
      {selected && (
        <>
          <ProposalStatsBar stats={selected.stats} t={t} />
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
            {keepExistingSquads
              ? t('squadManagement.autoAssign.applyWarningKeepExisting')
              : t('squadManagement.autoAssign.applyWarning')}
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
