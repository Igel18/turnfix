/**
 * SquadWizardModal
 * Two-step wizard for creating or editing a squad.
 * UI matches the AddParticipantModal (EventParticipants) pattern exactly:
 *   - Pill-style step indicator (same as addModal)
 *   - fullHeight + 3xl size for a spacious participant list
 *   Step 1 – Enter / confirm squad name
 *   Step 2 – Select participants with filters (Verein, Wettkampf, Jahrgang, Geschlecht)
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Users, UserPlus } from 'lucide-react';
import UnifiedModal from '@/components/UnifiedModal';
import { GenderBadge } from '@/components/GenderBadge';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import type { Participant, Squad } from '../SquadManagement.types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WizardFilters {
  searchTerm: string;
  club: string;
  competition: string;
  birthYear: string;
  gender: string;
}

export interface SquadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  squad?: Squad;
  eventId: string;
  onDone: () => Promise<void>;
}

type WizardStep = 'name' | 'participants';

// ── Component ──────────────────────────────────────────────────────────────────

export function SquadWizardModal({
  isOpen,
  onClose,
  mode,
  squad,
  eventId,
  onDone,
}: SquadWizardModalProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<WizardStep>('name');

  // Step 1
  const [squadName, setSquadName] = useState('');
  const nameValid = squadName.trim().length > 0 && squadName.trim().length <= 5;

  // Step 2
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<WizardFilters>({
    searchTerm: '', club: '', competition: '', birthYear: '', gender: '',
  });

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('name');
    setSquadName(mode === 'edit' && squad ? squad.name : '');
    setFilters({ searchTerm: '', club: '', competition: '', birthYear: '', gender: '' });
    setSelectedIds(new Set());
    setAllParticipants([]);
    setSaving(false);
  }, [isOpen]);

  // ── Load participants when entering step 2 ───────────────────────────────────
  useEffect(() => {
    if (step !== 'participants') return;
    loadParticipants();
  }, [step]);

  const loadParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const data = await apiGet(
        `/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${Date.now()}`,
      );
      const participants: Participant[] = data.participants || [];
      setAllParticipants(participants);
      if (mode === 'edit' && squad) {
        setSelectedIds(new Set(squad.participants.map((p) => p.id)));
      }
    } catch (err) {
      console.error('SquadWizard: error loading participants', err);
      setAllParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ── Filter option lists ──────────────────────────────────────────────────────
  const allClubs = useMemo(
    () => [...new Set(allParticipants.map((p) => p.club).filter(Boolean))].sort(),
    [allParticipants],
  );

  const allCompetitions = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string }[] = [];
    allParticipants.forEach((p) =>
      (p.competitions || []).forEach((c) => {
        if (!seen.has(c.id)) { seen.add(c.id); list.push({ id: c.id, name: c.name }); }
      }),
    );
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allParticipants]);

  // ── Filtered participants ────────────────────────────────────────────────────
  const filteredParticipants = useMemo(() => {
    const search = filters.searchTerm.toLowerCase();
    return allParticipants.filter((p) => {
      if (search && !`${p.firstname} ${p.lastname}`.toLowerCase().includes(search) && !p.club.toLowerCase().includes(search))
        return false;
      if (filters.club && p.club !== filters.club) return false;
      if (filters.competition && !(p.competitions || []).some((c) => c.id === parseInt(filters.competition)))
        return false;
      if (filters.birthYear && String(p.birthYear) !== filters.birthYear) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      return true;
    });
  }, [allParticipants, filters]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const allFilteredSelected =
    filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedIds.has(p.id));

  const toggleParticipant = (id: number) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => { const n = new Set(prev); filteredParticipants.forEach((p) => n.delete(p.id)); return n; });
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); filteredParticipants.forEach((p) => n.add(p.id)); return n; });
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedName = squadName.trim();
      const eventIdInt = parseInt(eventId);

      if (mode === 'create') {
        await apiPost('/squad-management/create', { eventId: eventIdInt, name: trimmedName });
        for (const participantId of selectedIds)
          await apiPost('/squad-management/assign', { participantId, squadName: trimmedName, eventId: eventIdInt });
      } else if (mode === 'edit' && squad) {
        if (trimmedName !== squad.name)
          await apiPost('/squad-management/update', { eventId: eventIdInt, oldName: squad.name, newName: trimmedName });
        const previousIds = new Set(squad.participants.map((p) => p.id));
        for (const id of [...selectedIds].filter((id) => !previousIds.has(id)))
          await apiPost('/squad-management/assign', { participantId: id, squadName: trimmedName, eventId: eventIdInt });
        for (const id of [...previousIds].filter((id) => !selectedIds.has(id)))
          await apiDelete(`/squad-management/unassign?participantId=${id}&eventId=${eventId}`);
      }

      await onDone();
      onClose();
    } catch (err) {
      console.error('SquadWizard: save error', err);
      alert(err instanceof Error ? err.message : t('squadManagement.messages.creationFailed', { message: '' }));
    } finally {
      setSaving(false);
    }
  };

  // ── Dynamic title ────────────────────────────────────────────────────────────
  const title = step === 'name'
    ? (mode === 'create' ? t('squadManagement.wizard.titleCreate') : t('squadManagement.wizard.titleEdit'))
    : t('squadManagement.wizard.stepParticipantsTitle');

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="3xl"
      showFooter={false}
      fullHeight={true}
    >
      {/* ── Step indicator (matches AddParticipantModal exactly) ── */}
      <div className="mb-5 flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'name'
            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
            : 'bg-green-100 text-green-700'
        }`}>
          {step === 'participants' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs">1</span>
          )}
          {t('squadManagement.wizard.stepNameShort')}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'participants'
            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
            : 'bg-gray-100 text-gray-400'
        }`}>
          <span
            className="w-5 h-5 flex items-center justify-center rounded-full text-white text-xs"
            style={{ backgroundColor: step === 'participants' ? '#2563eb' : '#9ca3af' }}
          >2</span>
          {t('squadManagement.wizard.stepParticipantsShort')}
        </div>
      </div>

      {/* ══════════════════ STEP 1: Squad name ══════════════════ */}
      {step === 'name' && (
        <>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.createModal.squadName')}{' '}
            <span className="text-red-500">*</span>{' '}
            <span className="text-gray-400 font-normal">{t('squadManagement.createModal.maxCharacters')}</span>
          </label>
          <input
            type="text"
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            maxLength={5}
            placeholder={t('squadManagement.createModal.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && nameValid) setStep('participants'); }}
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('squadManagement.createModal.characterCount', { count: squadName.length })}
          </p>
          <p className="mt-2 text-sm text-gray-500">{t('squadManagement.createModal.hint')}</p>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep('participants')}
              disabled={!nameValid}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('squadManagement.wizard.next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ══════════════════ STEP 2: Select participants ══════════════════ */}
      {step === 'participants' && (
        <>
          {/* Squad name summary bar */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{squadName}</p>
              <p className="text-sm text-gray-500">{t('squadManagement.wizard.selectedCount', { count: selectedIds.size })}</p>
            </div>
            <button
              onClick={() => setStep('name')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('squadManagement.wizard.changeName')}
            </button>
          </div>

          {/* Filter bar */}
          <div className="mb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
              placeholder={t('squadManagement.wizard.filters.search')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filters.club}
              onChange={(e) => setFilters((f) => ({ ...f, club: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.wizard.filters.allClubs')}</option>
              {allClubs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.competition}
              onChange={(e) => setFilters((f) => ({ ...f, competition: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.wizard.filters.allCompetitions')}</option>
              {allCompetitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              type="number"
              value={filters.birthYear}
              onChange={(e) => setFilters((f) => ({ ...f, birthYear: e.target.value }))}
              placeholder={t('squadManagement.filters.birthYearPlaceholder')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.filters.all')}</option>
              <option value="male">{t('squadManagement.filters.male')}</option>
              <option value="female">{t('squadManagement.filters.female')}</option>
            </select>
          </div>

          {/* Count + select-all */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>
              {filteredParticipants.length} {t('eventParticipants.addModal.resultsCount')}
              {' · '}
              <span className="font-medium text-blue-700">
                {t('squadManagement.wizard.selectedCount', { count: selectedIds.size })}
              </span>
            </span>
            <button
              onClick={toggleSelectAllFiltered}
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              {allFilteredSelected ? t('squadManagement.wizard.deselectAll') : t('squadManagement.wizard.selectAll')}
            </button>
          </div>

          {/* Participant list */}
          <div className="border rounded-lg overflow-auto" style={{ maxHeight: '42vh' }}>
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Users className="h-5 w-5 mr-2 animate-pulse" />
                {t('common.loading')}
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <UserPlus className="mx-auto h-8 w-8 mb-2" />
                <p>{t('squadManagement.wizard.noParticipants')}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} className="rounded" />
                    </th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.pdf.name')}</th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.filters.club')}</th>
                    <th className="px-3 py-2.5 text-center">{t('squadManagement.filters.birthYear')}</th>
                    <th className="px-3 py-2.5 text-center">{t('squadManagement.filters.gender')}</th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.filters.competition')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => toggleParticipant(p.id)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.firstname} {p.lastname}</td>
                      <td className="px-3 py-2 text-gray-600">{p.club || '–'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.birthYear || '–'}</td>
                      <td className="px-3 py-2 text-center"><GenderBadge value={p.gender} /></td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{(p.competitions || []).map((c) => c.name).join(', ') || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setStep('name')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('squadManagement.wizard.back')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saving ? t('squadManagement.messages.processing') : t('squadManagement.wizard.save')}
            </button>
          </div>
        </>
      )}
    </UnifiedModal>
  );
}

export default SquadWizardModal;
