import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UnifiedModal from '@/components/UnifiedModal';

interface Club {
  int_vereineid: number;
  var_name: string;
}

interface Competition {
  id: number;
  name: string;
}

interface Team {
  int_mannschaftenid: number;
  int_vereineid: number;
  int_wettkaempfeid: number;
  int_nummer: number;
  var_riege: string | null;
  int_startnummer: number | null;
}

interface TeamFormModalProps {
  team: Team | null;
  clubs: Club[];
  competitions: Competition[];
  onClose: (saved: boolean) => void;
}

const TeamFormModal: React.FC<TeamFormModalProps> = ({ team, clubs, competitions, onClose }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    int_vereineid: team?.int_vereineid || 0,
    int_wettkaempfeid: team?.int_wettkaempfeid || 0,
    int_nummer: team?.int_nummer || 1,
    var_riege: team?.var_riege || '',
    int_startnummer: team?.int_startnummer || null as number | null,
  });

  const isEditing = !!team;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.int_vereineid === 0 || formData.int_wettkaempfeid === 0) {
      alert(t('teams.form.selectClubAndCompetition'));
      return;
    }

    setSaving(true);

    try {
      const url = isEditing ? `/api/teams/${team.int_mannschaftenid}` : '/api/teams';
      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        int_vereineid: formData.int_vereineid,
        int_wettkaempfeid: formData.int_wettkaempfeid,
        int_nummer: formData.int_nummer,
      };

      if (formData.var_riege) payload.var_riege = formData.var_riege;
      if (formData.int_startnummer) payload.int_startnummer = formData.int_startnummer;

      console.log('🏆 Saving team:', { method, url, payload });

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Server error:', error);
        throw new Error(error.error || 'Failed to save team');
      }

      const result = await response.json();
      console.log('✅ Team saved successfully:', result);

      onClose(true);
    } catch (error) {
      console.error('Error saving team:', error);
      alert(isEditing ? t('teams.messages.updateError') : t('teams.messages.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose(false);
  };

  return (
    <UnifiedModal
      isOpen={true}
      onClose={handleClose}
      title={isEditing ? t('teams.editTeam') : t('teams.createTeam')}
      showFooter={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Club Selection */}
        <div>
          <Label htmlFor="club">{t('teams.form.club')}</Label>
          {clubs.length === 0 ? (
            <p className="text-sm text-red-600 mt-1">{t('teams.form.noClubsAvailable')}</p>
          ) : (
            <select
              id="club"
              value={formData.int_vereineid.toString()}
              onChange={(e) =>
                setFormData({ ...formData, int_vereineid: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">{t('teams.form.clubPlaceholder')}</option>
              {clubs.map((club) => (
                <option key={club.int_vereineid} value={club.int_vereineid.toString()}>
                  {club.var_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Competition Selection */}
        <div>
          <Label htmlFor="competition">{t('teams.form.competition')}</Label>
          {competitions.length === 0 ? (
            <p className="text-sm text-red-600 mt-1">{t('teams.form.noCompetitionsAvailable')}</p>
          ) : (
            <select
              id="competition"
              value={formData.int_wettkaempfeid.toString()}
              onChange={(e) =>
                setFormData({ ...formData, int_wettkaempfeid: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">{t('teams.form.competitionPlaceholder')}</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id.toString()}>
                  {comp.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Team Number */}
        <div>
          <Label htmlFor="number">{t('teams.form.number')}</Label>
          <Input
            id="number"
            type="number"
            min="1"
            value={formData.int_nummer}
            onChange={(e) =>
              setFormData({ ...formData, int_nummer: parseInt(e.target.value) || 1 })
            }
            placeholder={t('teams.form.numberPlaceholder')}
          />
        </div>

        {/* Squad */}
        <div>
          <Label htmlFor="squad">{t('teams.form.squad')}</Label>
          <Input
            id="squad"
            type="text"
            maxLength={5}
            value={formData.var_riege || ''}
            onChange={(e) => setFormData({ ...formData, var_riege: e.target.value })}
            placeholder={t('teams.form.squadPlaceholder')}
          />
        </div>

        {/* Start Number */}
        <div>
          <Label htmlFor="startNumber">{t('teams.form.startNumber')}</Label>
          <Input
            id="startNumber"
            type="number"
            min="1"
            value={formData.int_startnummer || ''}
            onChange={(e) =>
              setFormData({ 
                ...formData, 
                int_startnummer: e.target.value ? parseInt(e.target.value) : null 
              })
            }
            placeholder={t('teams.form.startNumberPlaceholder')}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            {t('teams.form.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              clubs.length === 0 ||
              competitions.length === 0 ||
              formData.int_vereineid === 0 ||
              formData.int_wettkaempfeid === 0
            }
          >
            {saving ? t('common.saving') : t('teams.form.save')}
          </Button>
        </div>
      </form>
    </UnifiedModal>
  );
};

export default TeamFormModal;
