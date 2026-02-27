/**
 * Add Participant Modal Component
 * Point 131: Extracted from EventParticipants for SoC
 * 
 * Displays a modal to search and add participants to an event
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus } from 'lucide-react';
import UnifiedModal from '@/components/UnifiedModal';
import { GenderBadge } from '@/components/GenderBadge';
import { apiGet, apiPost } from '@/utils/api';
import { normalizeGender } from '@/utils/genderHelpers';
import type { Participant } from '../EventParticipants.types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onParticipantAdded: () => void;
}

export function AddParticipantModal({ isOpen, onClose, eventId, onParticipantAdded }: AddParticipantModalProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available participants when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableParticipants();
    }
  }, [isOpen]);

  const loadAvailableParticipants = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const data = await apiGet(`/participants?limit=10000&_t=${timestamp}`);
      
      let participants = [];
      if (Array.isArray(data)) {
        participants = data;
      } else if (data && Array.isArray(data.participants)) {
        participants = data.participants;
      }

      // Normalize participant data
      const normalizedParticipants = participants.map((p: any) => ({
        id: p.id || p.int_teilnehmerid,
        firstname: p.firstname || p.var_vorname,
        lastname: p.lastname || p.var_nachname,
        club: p.club || p.verein_name || '',
        clubId: p.clubId || p.int_vereineid || 0,
        gender: normalizeGender(p.gender || p.geschlecht_name || p.int_geschlecht),
        age: p.age || 0,
        birthYear: p.birthYear || (p.dat_geburtstag ? new Date(p.dat_geburtstag).getFullYear() : null),
        squad_name: p.squad_name || '',
        startet_nicht: p.startet_nicht || false,
        bol_ak: p.bol_ak || false,
        var_comment: p.var_comment || '',
        isInEvent: p.isInEvent || false,
        assignedCompetitions: p.assignedCompetitions || [],
        registrationDate: p.registrationDate || '',
        startNumber: p.startNumber || p.int_startnummer || null,
      }));

      setAvailableParticipants(normalizedParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async (participantId: number) => {
    try {
      await apiPost('/event-participants/add', {
        eventId: parseInt(eventId),
        participantId: participantId,
      });

      onParticipantAdded();
      onClose();
    } catch (error) {
      console.error('Error adding participant to event:', error);
      alert(t('eventParticipants.messages.addError'));
    }
  };

  // Filter participants by search term
  const filteredParticipants = availableParticipants.filter((participant) => {
    if (!participant || typeof participant !== 'object') return false;

    const firstname = participant.firstname || '';
    const lastname = participant.lastname || '';
    const club = participant.club || '';

    const matchesSearch =
      firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${firstname} ${lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      club.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('eventParticipants.addModal.title')}
      size="2xl"
      showFooter={false}
      fullHeight={true}
    >
      {/* Search Field */}
      <div className="mb-4">
        <input
          type="text"
          placeholder={t('eventParticipants.addModal.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Available Participants List */}
      <div className="max-h-96 overflow-y-auto border rounded-lg">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <p>{t('common.loading')}</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto h-8 w-8 mb-2" />
            <p>{t('eventParticipants.addModal.noParticipants')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredParticipants.map((participant) => (
              <div key={participant.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    {participant.firstname} {participant.lastname}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    {participant.club} • <GenderBadge value={participant.gender} /> • {t('eventParticipants.card.years', { count: participant.age })}
                  </p>
                </div>
                {participant.isInEvent ? (
                  <span className="text-sm text-gray-500">{t('eventParticipants.addModal.alreadyInEvent')}</span>
                ) : (
                  <button
                    onClick={() => handleAddParticipant(participant.id)}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t('eventParticipants.addModal.add')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </UnifiedModal>
  );
}
