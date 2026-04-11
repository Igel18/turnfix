import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import UnifiedModal, { UnifiedConfirmModal } from '@/components/UnifiedModal';

interface Team {
  int_mannschaftenid: number;
  int_vereineid: number;
  tfx_vereine: {
    var_name: string;
  };
  tfx_wettkaempfe: {
    var_name: string;
  };
}

interface PenaltyType {
  int_mannschaften_abzugid: number;
  var_name: string;
  rel_abzug: number;
}

interface AssignedPenalty {
  int_man_x_man_abid: number;
  int_mannschaften_abzugid: number;
  tfx_mannschaften_abzug: {
    var_name: string;
    rel_abzug: number;
  };
}

interface TeamPenaltiesModalProps {
  team: Team;
  onClose: () => void;
}

const TeamPenaltiesModal: React.FC<TeamPenaltiesModalProps> = ({ team, onClose }) => {
  const { t } = useTranslation();
  const [penaltyTypes, setPenaltyTypes] = useState<PenaltyType[]>([]);
  const [assignedPenalties, setAssignedPenalties] = useState<AssignedPenalty[]>([]);
  const [selectedPenaltyType, setSelectedPenaltyType] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingRemovePenaltyId, setPendingRemovePenaltyId] = useState<number | null>(null);

  // Fetch penalty types
  const fetchPenaltyTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/team-penalties?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch penalty types');
      
      const data = await response.json();
      setPenaltyTypes(data.penalties || []);
    } catch (error) {
      console.error('Error fetching penalty types:', error);
    }
  }, []);

  // Fetch assigned penalties
  const fetchAssignedPenalties = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${team.int_mannschaftenid}/penalties`);
      if (!response.ok) throw new Error('Failed to fetch assigned penalties');
      
      const data = await response.json();
      setAssignedPenalties(data.penalties || []);
    } catch (error) {
      console.error('Error fetching assigned penalties:', error);
    } finally {
      setLoading(false);
    }
  }, [team.int_mannschaftenid]);

  useEffect(() => {
    fetchPenaltyTypes();
    fetchAssignedPenalties();
  }, [fetchPenaltyTypes, fetchAssignedPenalties]);

  // Add penalty
  const handleAddPenalty = async () => {
    if (selectedPenaltyType === 0) {
      alert(t('teams.penalties.selectPenaltyType'));
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/teams/${team.int_mannschaftenid}/penalties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ int_mannschaften_abzugid: selectedPenaltyType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add penalty');
      }

      setSelectedPenaltyType(0);
      await fetchAssignedPenalties();
    } catch (error) {
      console.error('Error adding penalty:', error);
      alert(t('teams.messages.penaltyAddError'));
    } finally {
      setAdding(false);
    }
  };

  // Remove penalty
  const handleRemovePenalty = (penaltyId: number) => {
    setPendingRemovePenaltyId(penaltyId);
  };

  const executeRemovePenalty = async (penaltyId: number) => {
    try {
      const response = await fetch(
        `/api/teams/${team.int_mannschaftenid}/penalties/${penaltyId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove penalty');
      }

      await fetchAssignedPenalties();
    } catch (error) {
      console.error('Error removing penalty:', error);
      alert(t('teams.messages.penaltyRemoveError'));
    }
  };

  // Get available penalty types (not already assigned)
  const availablePenaltyTypes = penaltyTypes.filter(
    (pt) => !assignedPenalties.some((ap) => ap.int_mannschaften_abzugid === pt.int_mannschaften_abzugid)
  );

  return (
    <>
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title={t('teams.penalties.title')}
    >
      <div className="space-y-4">
        {/* Team Info */}
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm font-medium text-blue-900">
            {t('teams.penalties.teamInfo', {
              club: team.tfx_vereine.var_name,
              competition: team.tfx_wettkaempfe.var_name,
            })}
          </p>
        </div>

        {/* Current Penalties */}
        <div>
          <Label>{t('teams.penalties.currentPenalties')}</Label>
          {loading ? (
            <p className="text-sm text-gray-500 mt-2">{t('common.loading')}</p>
          ) : assignedPenalties.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded mt-2">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('teams.penalties.noPenalties')}</p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {assignedPenalties.map((penalty) => (
                <div
                  key={penalty.int_man_x_man_abid}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium">{penalty.tfx_mannschaften_abzug.var_name}</p>
                    <p className="text-sm text-gray-600">
                      {t('teams.penalties.deduction')}: {penalty.tfx_mannschaften_abzug.rel_abzug}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePenalty(penalty.int_man_x_man_abid)}
                    title={t('teams.penalties.remove')}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Penalty */}
        <div>
          <Label>{t('teams.penalties.addPenalty')}</Label>
          {availablePenaltyTypes.length === 0 ? (
            <p className="text-sm text-gray-500 mt-2">
              {t('teams.penalties.noPenaltyTypesAvailable')}
            </p>
          ) : (
            <div className="flex gap-2 mt-2">
              <select
                value={selectedPenaltyType.toString()}
                onChange={(e) => setSelectedPenaltyType(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">{t('teams.penalties.selectPenaltyType')}</option>
                {availablePenaltyTypes.map((pt) => (
                  <option
                    key={pt.int_mannschaften_abzugid}
                    value={pt.int_mannschaften_abzugid.toString()}
                  >
                    {pt.var_name} ({t('teams.penalties.deduction')}: {pt.rel_abzug})
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAddPenalty}
                disabled={adding || selectedPenaltyType === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('teams.penalties.add')}
              </Button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('teams.penalties.close')}
          </Button>
        </div>
      </div>
    </UnifiedModal>
    <UnifiedConfirmModal
      isOpen={pendingRemovePenaltyId !== null}
      onClose={() => setPendingRemovePenaltyId(null)}
      onConfirm={() => {
        const id = pendingRemovePenaltyId!;
        setPendingRemovePenaltyId(null);
        executeRemovePenalty(id);
      }}
      title={t('common.confirmDeleteTitle')}
      message={t('teams.penalties.confirmRemove')}
      confirmLabel={t('common.delete')}
      confirmStyle="danger"
    />
    </>
  );
};

export default TeamPenaltiesModal;
