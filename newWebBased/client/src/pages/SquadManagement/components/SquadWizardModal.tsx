/**
 * SquadWizardModal
 * Two-step wizard for creating or editing a squad:
 *   Step 1 – Enter / change squad name
 *   Step 2 – Select participants with rich filters (Verein, Wettkampf, Jahrgang, Geschlecht)
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Users } from 'lucide-react';
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
  squad?: Squad;        // populated in edit mode
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

  // ── Wizard step ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('name');

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [squadName, setSquadName] = useState('');
  const nameValid = squadName.trim().length > 0 && squadName.trim().length <= 5;

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<WizardFilters>({
    searchTerm: '',
    club: '',
    competition: '',
    birthYear: '',
    gender: '',
  });

  // ── Reset when modal opens ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('name');
    setSquadName(mode === 'edit' && squad ? squad.name : '');
    setFilters({ searchTerm: '', club: '', competition: '', birthYear: '', gender: '' });
    setSelectedIds(new Set());
    setAllParticipants([]);
    setSaving(false);
  }, [isOpen]);

  // ── Load participants when entering step 2 ─────────────────────────────────
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

      // In edit mode pre-select current squad members
      if (mode === 'edit' && squad) {
        const currentIds = new Set(squad.participants.map((p) => p.id));
        setSelectedIds(currentIds);
      }
    } catch (err) {
      console.error('SquadWizard: error loading participants', err);
      setAllParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ── Derived lists for filter dropdowns ─────────────────────────────────────
  const allClubs = useMemo(
    () => [...new Set(allParticipants.map((p) => p.club).filter(Boolean))].sort(),
    [allParticipants],
  );

  const allCompetitions = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string }[] = [];
    allParticipants.forEach((p) => {
      (p.competitions || []).forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, name: c.name });
        }
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [allParticipants]);

  // ── Filtered participants ──────────────────────────────────────────────────
  const filteredParticipants = useMemo(() => {
    const search = filters.searchTerm.toLowerCase();
    return allParticipants.filter((p) => {
      if (
        search &&
        !`${p.firstname} ${p.lastname}`.toLowerCase().includes(search) &&
        !p.club.toLowerCase().includes(search)
      )
        return false;

      if (filters.club && p.club !== filters.club) return false;

      if (
        filters.competition &&
        !(p.competitions || []).some((c) => c.id === parseInt(filters.competition))
      )
        return false;

      if (filters.birthYear && String(p.birthYear) !== filters.birthYear) return false;

      if (filters.gender && p.gender !== filters.gender) return false;

      return true;
    });
  }, [allParticipants, filters]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleParticipant = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedIds.has(p.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParticipants.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParticipants.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedName = squadName.trim();
      const eventIdInt = parseInt(eventId);

      if (mode === 'create') {
        // 1. Create squad
        await apiPost('/squad-management/create', {
          eventId: eventIdInt,
          name: trimmedName,
        });

        // 2. Assign selected participants
        for (const participantId of selectedIds) {
          await apiPost('/squad-management/assign', {
            participantId,
            squadName: trimmedName,
            eventId: eventIdInt,
          });
        }
      } else if (mode === 'edit' && squad) {
        // 1. Rename if needed
        if (trimmedName !== squad.name) {
          await apiPost('/squad-management/update', {
            eventId: eventIdInt,
            oldName: squad.name,
            newName: trimmedName,
          });
        }

        // 2. Compute diff
        const previousIds = new Set(squad.participants.map((p) => p.id));
        const toAdd = [...selectedIds].filter((id) => !previousIds.has(id));
        const toRemove = [...previousIds].filter((id) => !selectedIds.has(id));

        for (const participantId of toAdd) {
          await apiPost('/squad-management/assign', {
            participantId,
            squadName: trimmedName,
            eventId: eventIdInt,
          });
        }
        for (const participantId of toRemove) {
          await apiDelete(
            `/squad-management/unassign?participantId=${participantId}&eventId=${eventId}`,
          );
        }
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const title =
    mode === 'create'
      ? t('squadManagement.wizard.titleCreate')
      : t('squadManagement.wizard.titleEdit');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="3xl"
      showFooter={false}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <StepDot active={step === 'name'} done={step === 'participants'} label="1" />
        <div className="flex-1 h-0.5 bg-gray-200" />
        <StepDot active={step === 'participants'} done={false} label="2" />
      </div>

      {/* ── Step 1: Name ─────────────────────────────────────────────────── */}
      {step === 'name' && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {t('squadManagement.wizard.stepNameTitle')}
          </h3>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.createModal.squadName')}{' '}
            <span className="text-red-500">*</span>{' '}
            <span className="text-gray-400 font-normal">
              {t('squadManagement.createModal.maxCharacters')}
            </span>
          </label>
          <input
            type="text"
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            maxLength={5}
            placeholder={t('squadManagement.createModal.placeholder')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('squadManagement.createModal.characterCount', { count: squadName.length })}
          </p>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep('participants')}
              disabled={!nameValid}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('squadManagement.wizard.next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Participants ──────────────────────────────────────────── */}
      {step === 'participants' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {t('squadManagement.wizard.stepParticipantsTitle')}
          </h3>

          {/* Filter bar */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Search */}
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
              placeholder={t('squadManagement.wizard.filters.search')}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Club */}
            <select
              value={filters.club}
              onChange={(e) => setFilters((f) => ({ ...f, club: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('squadManagement.wizard.filters.allClubs')}</option>
              {allClubs.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {/* Competition */}
            <select
              value={filters.competition}
              onChange={(e) => setFilters((f) => ({ ...f, competition: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('squadManagement.wizard.filters.allCompetitions')}</option>
              {allCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {/* Birth year */}
            <input
              type="number"
              value={filters.birthYear}
              onChange={(e) => setFilters((f) => ({ ...f, birthYear: e.target.value }))}
              placeholder={t('squadManagement.filters.birthYearPlaceholder')}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Gender */}
            <select
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('squadManagement.filters.all')}</option>
              <option value="male">{t('squadManagement.filters.male')}</option>
              <option value="female">{t('squadManagement.filters.female')}</option>
            </select>
          </div>

          {/* Count + select all */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {t('squadManagement.wizard.participantsSelected', { count: selectedIds.size })}
              {' / '}
              {filteredParticipants.length} {t('squadManagement.wizard.visible')}
            </span>
            <button
              onClick={toggleSelectAllFiltered}
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              {allFilteredSelected
                ? t('squadManagement.wizard.deselectAll')
                : t('squadManagement.wizard.selectAll')}
            </button>
          </div>

          {/* Participant list */}
          <div className="border border-gray-200 rounded-md overflow-auto max-h-72">
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Users className="h-5 w-5 mr-2 animate-pulse" />
                {t('common.loading')}
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
                {t('squadManagement.wizard.noParticipants')}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">{t('squadManagement.pdf.name')}</th>
                    <th className="px-3 py-2 text-left">{t('squadManagement.filters.club')}</th>
                    <th className="px-3 py-2 text-center">{t('squadManagement.filters.birthYear')}</th>
                    <th className="px-3 py-2 text-center">{t('squadManagement.filters.gender')}</th>
                    <th className="px-3 py-2 text-left">{t('squadManagement.filters.competition')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => toggleParticipant(p.id)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedIds.has(p.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-1.5 font-medium text-gray-900">
                        {p.firstname} {p.lastname}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600">{p.club || '–'}</td>
                      <td className="px-3 py-1.5 text-center text-gray-600">{p.birthYear || '–'}</td>
                      <td className="px-3 py-1.5 text-center">
                        <GenderBadge value={p.gender} />
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 text-xs">
                        {(p.competitions || []).map((c) => c.name).join(', ') || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('name')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('squadManagement.wizard.back')}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              {saving ? t('squadManagement.messages.processing') : t('squadManagement.wizard.save')}
            </button>
          </div>
        </div>
      )}
    </UnifiedModal>
  );
}

// ── Small helper component ─────────────────────────────────────────────────────

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
        done
          ? 'bg-green-500 border-green-500 text-white'
          : active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-gray-300 text-gray-400'
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : label}
    </div>
  );
}

export default SquadWizardModal;
