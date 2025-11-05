/**
 * SquadStartDeviceEditor Component
 * 
 * Allows editing the start device (bol_erstes_geraet) for each squad in a competition.
 * Each squad can select which device they start their rotation from.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { apiGet, apiPut } from '@/utils/api';
import { BlueInfoBox } from '@/components/InfoBoxes';

interface SquadDiscipline {
  tfx_disziplinen: {
    int_disziplinenid: number;
    var_name: string;
    var_kurz1?: string;
    var_icon?: string;
  };
  var_riege: string;
  int_runde: number;
  bol_erstes_geraet: boolean;
  tfx_wettkaempfeid: number | null;
}

interface SquadWithDevices {
  name: string;
  devices: {
    id: number;
    name: string;
    shortName: string;
    icon?: string;
  }[];
  currentStartDeviceId?: number;
}

interface Props {
  eventId: number;
  competitionId: number;
  competitionName: string;
  round: number;
  onClose: () => void;
  onSave: () => void;
}

const SquadStartDeviceEditor: React.FC<Props> = ({
  eventId,
  competitionId,
  competitionName,
  round,
  onClose,
  onSave
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [squadsWithDevices, setSquadsWithDevices] = useState<SquadWithDevices[]>([]);
  const [startDevices, setStartDevices] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchSquadDisciplines();
  }, [eventId, competitionId, round]);

  useEffect(() => {
    // Handle ESC key to close dialog
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const fetchSquadDisciplines = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/time-planning?eventId=${eventId}`);
      
      console.log('[SquadStartDeviceEditor] API Response:', response);
      console.log('[SquadStartDeviceEditor] Looking for competitionId:', competitionId, 'round:', round);
      console.log('[SquadStartDeviceEditor] All squadDisciplines:', response.squadDisciplines);
      
      // Filter squad disciplines for this round (not by competitionId, as that might be null/different)
      // We use the round number to match squads
      const filtered = response.squadDisciplines.filter(
        (sd: SquadDiscipline) => sd.int_runde === round
      );
      
      console.log('[SquadStartDeviceEditor] Filtered by round:', filtered);
      console.log('[SquadStartDeviceEditor] Sample tfx_wettkaempfeid values:', 
        filtered.slice(0, 5).map((sd: SquadDiscipline) => sd.tfx_wettkaempfeid));
      
      // Group by squad name
      const squadMap = new Map<string, SquadDiscipline[]>();
      filtered.forEach((sd: SquadDiscipline) => {
        if (!sd.var_riege) return;
        if (!squadMap.has(sd.var_riege)) {
          squadMap.set(sd.var_riege, []);
        }
        squadMap.get(sd.var_riege)!.push(sd);
      });
      
      console.log('[SquadStartDeviceEditor] Squads found:', Array.from(squadMap.keys()));
      console.log('[SquadStartDeviceEditor] Squad map:', squadMap);
      
      // Build squads with devices
      const squads: SquadWithDevices[] = Array.from(squadMap.entries()).map(([squadName, disciplines]) => {
        const devices = disciplines.map(sd => ({
          id: sd.tfx_disziplinen.int_disziplinenid,
          name: sd.tfx_disziplinen.var_name,
          shortName: sd.tfx_disziplinen.var_kurz1 || sd.tfx_disziplinen.var_name,
          icon: sd.tfx_disziplinen.var_icon
        }));
        
        const currentStartDevice = disciplines.find(sd => sd.bol_erstes_geraet);
        
        return {
          name: squadName,
          devices,
          currentStartDeviceId: currentStartDevice?.tfx_disziplinen.int_disziplinenid
        };
      });
      
      setSquadsWithDevices(squads);
      
      // Build map of current start devices
      const deviceMap = new Map<string, number>();
      squads.forEach(squad => {
        if (squad.currentStartDeviceId) {
          deviceMap.set(squad.name, squad.currentStartDeviceId);
        }
      });
      setStartDevices(deviceMap);
      
      console.log('[SquadStartDeviceEditor] Squads with devices:', squads);
      console.log('[SquadStartDeviceEditor] Current start devices:', Array.from(deviceMap.entries()));
      
    } catch (error) {
      console.error('Error fetching squad disciplines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDeviceChange = (squadName: string, disciplineId: number) => {
    setStartDevices(prev => new Map(prev).set(squadName, disciplineId));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update each squad's start device
      for (const [squadName, disciplineId] of startDevices.entries()) {
        await apiPut('/time-planning/squad-start-device', {
          eventId,
          squadName,
          round,
          disciplineId
        });
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving start devices:', error);
      alert(t('common.error') + ': ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('timePlanning.startDevices')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {competitionName} - {t('timePlanning.round')} {round}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : squadsWithDevices.length === 0 ? (
            <div className="text-center py-12">
              <BlueInfoBox>
                <p>{t('timePlanning.noSquadsFound')}</p>
                <p className="mt-2 text-sm">Competition ID: {competitionId}, Round: {round}</p>
              </BlueInfoBox>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info Box */}
              <BlueInfoBox>
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('timePlanning.startDeviceInfo')}</p>
                    <p className="mt-1 text-sm">{t('timePlanning.startDeviceDescription')}</p>
                  </div>
                </div>
              </BlueInfoBox>

              {/* Squads Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('timePlanning.squad')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('timePlanning.firstDevice')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {squadsWithDevices.map(squad => (
                      <tr key={squad.name}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{squad.name}</div>
                          <div className="text-xs text-gray-500">{squad.devices.length} {t('timePlanning.devices')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={startDevices.get(squad.name) || ''}
                            onChange={(e) => handleStartDeviceChange(squad.name, Number(e.target.value))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">{t('common.pleaseSelect')}</option>
                            {squad.devices.map(device => (
                              <option key={device.id} value={device.id}>
                                {device.shortName || device.name}
                              </option>
                            ))}
                          </select>
                          {startDevices.get(squad.name) && (
                            <div className="mt-1 text-xs text-gray-500">
                              ✓ {squad.devices.find(d => d.id === startDevices.get(squad.name))?.shortName}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || startDevices.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('common.saving')}
              </>
            ) : (
              <>
                💾 {t('common.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SquadStartDeviceEditor;
