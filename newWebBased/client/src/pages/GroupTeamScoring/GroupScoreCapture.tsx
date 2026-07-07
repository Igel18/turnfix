import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';

import { useEvent } from '@/contexts/EventContext';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { BlueInfoBox } from '@/components/InfoBoxes';
import UnifiedScoreEntry, { type ScoreComponentValue } from '@/components/UnifiedScoreEntry';
import { useFormulaCalculation } from '@/pages/ScoreCapture/hooks';

import type {
  Group,
  Discipline,
  DisciplineField,
  Competition,
  ScoreData
} from './GroupTeamScoring.types';

export default function GroupScoreCapture() {
  const { t } = useTranslation();
  const { calculateFinalScoreFromFieldMap } = useFormulaCalculation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  const urlCompetitionId = searchParams.get('competitionId');

  const { selectedEvent, selectedCompetition } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId;

  const [groups, setGroups] = useState<Group[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [disciplineFields, setDisciplineFields] = useState<DisciplineField[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(
    competitionId ? parseInt(competitionId) : null
  );
  const [selectedAttempt, setSelectedAttempt] = useState<number>(1);
  const [selectedStatusId] = useState<number>(1); // Default status

  const [scoreComponents, setScoreComponents] = useState<ScoreComponentValue[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  useEffect(() => {
    if (selectedDisciplineId) {
      loadDisciplineFields(selectedDisciplineId);
    } else {
      setDisciplineFields([]);
    }
  }, [selectedDisciplineId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, competitionsRes, disciplinesRes] = await Promise.all([
        fetch(`/api/groups?eventId=${eventId}&limit=1000`),
        fetch(`/api/competitions?eventId=${eventId}&limit=100`),
        fetch(`/api/disciplines?limit=500`)
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.results || []);
      }

      if (competitionsRes.ok) {
        const data = await competitionsRes.json();
        setCompetitions(data.results || []);
      }

      if (disciplinesRes.ok) {
        const data = await disciplinesRes.json();
        setDisciplines(data.results || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisciplineFields = async (disciplineId: number) => {
    try {
      const res = await fetch(`/api/discipline-fields?disciplineId=${disciplineId}&enabled=true&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const fields = data.results || [];
        setDisciplineFields(fields);
        
        const components = fields.map((f: DisciplineField) => ({
          fieldId: f.id,
          fieldName: f.name,
          value: null
        }));
        setScoreComponents(components);
      }
    } catch (error) {
      console.error('Error loading discipline fields:', error);
    }
  };

  const selectedGroup = useMemo(
    () => groups.find(g => g.int_gruppenid === selectedGroupId),
    [groups, selectedGroupId]
  );

  const selectedDiscipline = useMemo(
    () => disciplines.find(d => d.id === selectedDisciplineId),
    [disciplines, selectedDisciplineId]
  );

  const canOpenScoreEntry = useMemo(
    () => selectedGroupId && selectedDisciplineId && selectedCompetitionId,
    [selectedGroupId, selectedDisciplineId, selectedCompetitionId]
  );

  const handleComponentChange = (fieldId: number, value: number | null) => {
    setScoreComponents(prev =>
      prev.map(c => c.fieldId === fieldId ? { ...c, value } : c)
    );
  };

  const handleScoreComponentsChange = (fieldId: number, value: number | null) => {
    handleComponentChange(fieldId, value);
  };

  const calculateFinalScore = () => {
    const fieldValueMap = scoreComponents.reduce<Record<number, number | null>>((acc, component) => {
      acc[component.fieldId] = component.value;
      return acc;
    }, {});

    return calculateFinalScoreFromFieldMap(
      selectedDiscipline?.formula || null,
      disciplineFields,
      fieldValueMap
    ) ?? 0;
  };

  const handleOpenScoreEntry = () => {
    if (!canOpenScoreEntry) return;
    
    const calculated = calculateFinalScore();
    setFinalScore(calculated);
    setShowModal(true);
  };

  const handleSaveScore = async () => {
    if (!selectedGroupId || !selectedDisciplineId || !selectedCompetitionId) {
      return;
    }

    setSaving(true);
    try {
      const scoreData: ScoreData = {
        groupId: selectedGroupId,
        competitionId: selectedCompetitionId,
        disciplineId: selectedDisciplineId,
        statusId: selectedStatusId,
        attempt: selectedAttempt,
        components: scoreComponents.filter(c => c.value !== null),
        finalScore: finalScore || calculateFinalScore(),
        comment: comment || undefined
      };

      const res = await fetch('/api/scores/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
      });

      if (res.ok) {
        setShowModal(false);
        setScoreComponents(prev => prev.map(c => ({ ...c, value: null })));
        setFinalScore(null);
        setComment('');
        alert(t('groupTeamScoring.scoreSaved'));
      } else {
        const error = await res.json();
        alert(t('groupTeamScoring.saveError') + ': ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving score:', error);
      alert(t('groupTeamScoring.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EventManagementTemplate
        title={t('groupTeamScoring.groupScoring')}
        icon={UsersIcon}
        loading={loading}
        onAdd={handleOpenScoreEntry}
        addButtonText={t('groupTeamScoring.enterScore')}
        showAddButton={!!canOpenScoreEntry}
      >
        <div className="space-y-6">
          <BlueInfoBox>
            {t('groupTeamScoring.groupInfo')}
          </BlueInfoBox>

          <div className="bg-white p-6 rounded-lg border space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t('groupTeamScoring.selectionPanel')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectGroup')} *
                </label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseGroup')}</option>
                  {groups.map(g => (
                    <option key={g.int_gruppenid} value={g.int_gruppenid}>
                      {g.var_name} ({g.clubName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectCompetition')} *
                </label>
                <select
                  value={selectedCompetitionId || ''}
                  onChange={(e) => setSelectedCompetitionId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseCompetition')}</option>
                  {competitions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.selectDiscipline')} *
                </label>
                <select
                  value={selectedDisciplineId || ''}
                  onChange={(e) => setSelectedDisciplineId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('groupTeamScoring.chooseDiscipline')}</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('groupTeamScoring.attempt')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedDiscipline?.attempts || 3}
                  value={selectedAttempt}
                  onChange={(e) => setSelectedAttempt(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </EventManagementTemplate>

      {selectedDiscipline && (
        <UnifiedScoreEntry
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={t('groupTeamScoring.enterScoreFor') + ': ' + (selectedGroup?.var_name || '')}
          fields={disciplineFields.map(field => ({
            id: field.id,
            name: field.name,
            sortOrder: field.sortOrder ?? 0,
            group: field.group,
            isFinalScore: field.isFinalScore,
            isStartingScore: field.isStartingScore,
            enabled: field.enabled
          }))}
          components={scoreComponents}
          onChange={handleScoreComponentsChange}
          onSave={handleSaveScore}
          comment={comment}
          onCommentChange={setComment}
          attempt={selectedAttempt}
          maxAttempts={selectedDiscipline.attempts}
          onAttemptChange={setSelectedAttempt}
          showAttemptSelector={selectedDiscipline.attempts > 1}
          calculationType={selectedDiscipline.calculationType}
          saving={saving}
        />
      )}
    </>
  );
}
