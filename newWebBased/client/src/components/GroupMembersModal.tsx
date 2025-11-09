import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon, PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import UnifiedModal from './UnifiedModal';

interface Group {
  id: number;
  clubId: number;
  name: string;
  clubName?: string;
}

interface GroupMember {
  id: number;
  groupMemberId?: number;
  firstName: string;
  lastName: string;
  clubId: number;
  clubName?: string;
}

interface Participant {
  int_teilnehmerid: number;
  var_vorname: string;
  var_nachname: string;
  int_vereineid: number;
}

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onMembersChanged: () => void;
}

const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  group,
  onMembersChanged
}) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchAvailableParticipants();
    }
  }, [isOpen, group.id]);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableParticipants = async () => {
    try {
      // Fetch participants from the same club
      const response = await fetch(`/api/participants?limit=5000&clubId=${group.clubId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableParticipants(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setAvailableParticipants([]);
    }
  };

  const handleAddMember = async () => {
    if (!selectedParticipant) {
      alert(t('groups.members.selectParticipant'));
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantId: parseInt(selectedParticipant)
        })
      });

      if (response.ok) {
        setSelectedParticipant('');
        await fetchMembers();
        onMembersChanged();
      } else {
        const error = await response.json();
        alert(error.error || t('groups.members.addError'));
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert(t('groups.members.addError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (participantId: number) => {
    if (!window.confirm(t('groups.members.confirmRemove'))) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${group.id}/members/${participantId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchMembers();
        onMembersChanged();
      } else {
        const error = await response.json();
        alert(error.error || t('groups.members.removeError'));
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert(t('groups.members.removeError'));
    }
  };

  // Filter out participants who are already members
  const memberIds = new Set(members.map(m => m.id));
  const filteredParticipants = availableParticipants.filter(p => !memberIds.has(p.int_teilnehmerid));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('groups.members.title')}: ${group.name}`}
      size="xl"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Add Member Section */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('groups.members.addMember')}
          </h3>
          <div className="flex space-x-3">
            <select
              value={selectedParticipant}
              onChange={(e) => setSelectedParticipant(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            >
              <option value="">{t('groups.members.selectParticipant')}</option>
              {filteredParticipants.map(participant => (
                <option key={participant.int_teilnehmerid} value={participant.int_teilnehmerid}>
                  {participant.var_vorname} {participant.var_nachname}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!selectedParticipant || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>{t('common.add')}</span>
            </button>
          </div>
          {filteredParticipants.length === 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
              ⚠️ {t('groups.members.noAvailable')}
            </p>
          )}
        </div>

        {/* Current Members List */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('groups.members.current')} ({members.length})
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {t('common.loading')}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('groups.members.noMembers')}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('participants.name')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title={t('common.remove')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
};

export default GroupMembersModal;
