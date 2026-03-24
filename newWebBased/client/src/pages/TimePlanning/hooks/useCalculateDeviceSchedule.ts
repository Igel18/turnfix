/**
 * useCalculateDeviceSchedule hook
 * Point 124: Separation of Concerns
 *
 * Encapsulates the device-schedule calculation logic extracted from index.tsx.
 */

import { useCallback } from 'react';
import type { DeviceSchedule, SessionGroup, TimeSettings } from '../TimePlanning.types';

interface UseCalculateDeviceScheduleProps {
  squadDisciplines: any[];
  disciplineCache: React.MutableRefObject<{ [competitionId: number]: any[] }>;
  timeSettings: TimeSettings;
  addMinutesToTime: (time: string, minutes: number) => string;
}

export function useCalculateDeviceSchedule({
  squadDisciplines,
  disciplineCache,
  timeSettings,
  addMinutesToTime,
}: UseCalculateDeviceScheduleProps) {
  const calculateDeviceSchedule = useCallback((sessionGroup: SessionGroup): DeviceSchedule[] => {
    const schedule: DeviceSchedule[] = [];
    if (!sessionGroup.startTime) return schedule;

    const deviceTimeMap = new Map<string, string>();
    const squadTimeMap = new Map<string, string>();

    sessionGroup.competitions.forEach(competition => {
      const compStartTime = competition.startTime || sessionGroup.startTime!;
      const compWarmupTime = competition.warmupTime;

      let disciplineObjs: { name: string; isFirst: boolean; order: number }[] = [];
      let debugSource = '';
      const filtered = squadDisciplines.filter(sd => sd.tfx_disziplinen && sd.tfx_wettkaempfeid === competition.id);

      if (filtered.length > 0) {
        disciplineObjs = filtered
          .map(sd => ({
            name: sd.tfx_disziplinen.var_name,
            isFirst: !!sd.bol_erstes_geraet,
            order: typeof sd.tfx_disziplinen.var_reihenfolge === 'number' ? sd.tfx_disziplinen.var_reihenfolge : 9999,
          }))
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        debugSource = 'squadDisciplines';
      } else if (disciplineCache.current[competition.id]?.length > 0) {
        if (typeof window !== 'undefined' && (window as any).DEBUG) {
          console.log(`[TimePlanning][DEBUG] Full disciplineCache for competition ${competition.id} (${competition.name}):`, disciplineCache.current[competition.id]);
          if (disciplineCache.current[competition.id][0]) {
            console.log(`[TimePlanning][DEBUG] First discipline object for competition ${competition.id}:`, disciplineCache.current[competition.id][0]);
          }
        }
        disciplineObjs = disciplineCache.current[competition.id]
          .map((d: any, idx: number) => ({
            name: d.var_name || d.var_disziplinname || d.name || `Device ${idx + 1}`,
            isFirst: idx === 0,
            order: typeof d.var_reihenfolge === 'number' ? d.var_reihenfolge : idx + 1,
          }))
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
        debugSource = 'disciplineCache';
      } else {
        disciplineObjs = Array.from({ length: competition.disciplineCount }, (_, i) => ({
          name: `Device ${i + 1}`,
          isFirst: false,
          order: i + 1,
        }));
        debugSource = 'generic';
      }

      if (typeof window !== 'undefined' && (window as any).DEBUG) {
        console.log(`[TimePlanning] Competition ${competition.id} (${competition.name}) devices from ${debugSource}:`, disciplineObjs.map(d => d.name));
      }

      sessionGroup.squads.forEach((squad, squadIndex) => {
        const isAssigned = squad.competitionIds && squad.competitionIds.includes(competition.id);
        console.log(`[calculateDeviceSchedule] Competition "${competition.name}" (${competition.id}), Squad "${squad.name}":`, {
          competitionId: competition.id,
          squadCompetitionIds: squad.competitionIds,
          isAssigned,
          startTime: compStartTime,
          disciplines: disciplineObjs.length,
        });
        if (!isAssigned) return;

        let currentTime = compStartTime;

        if (compWarmupTime) {
          const warmupKey = `${squad.name}__Warm-up Area__${compWarmupTime}`;
          if (!squadTimeMap.has(warmupKey)) {
            schedule.push({
              squadName: squad.name,
              deviceName: 'Warm-up Area',
              startTime: compWarmupTime,
              endTime: addMinutesToTime(compWarmupTime, timeSettings.warmupDurationMinutes),
              competition: competition.name,
              isWarmup: true,
            });
            squadTimeMap.set(warmupKey, 'Warm-up Area');
          }
        }

        const startDeviceIndex = disciplineObjs.findIndex(d => d.isFirst);
        const effectiveStartIndex = startDeviceIndex >= 0 ? startDeviceIndex : squadIndex % disciplineObjs.length;

        console.log(`[calculateDeviceSchedule] Squad "${squad.name}" (index ${squadIndex}) starts at device index ${effectiveStartIndex} (${disciplineObjs[effectiveStartIndex]?.name})`);

        for (let i = 0; i < disciplineObjs.length; i++) {
          const deviceIndex = (effectiveStartIndex + i) % disciplineObjs.length;
          const device = disciplineObjs[deviceIndex];
          const startTime = currentTime;
          const squadDuration = (squad.participantCount || 1) * timeSettings.exerciseDurationMinutes;
          const endTime = addMinutesToTime(startTime, squadDuration);
          const deviceKey = `${device.name}__${startTime}`;
          const squadKey = `${squad.name}__${startTime}`;

          const deviceOccupied = deviceTimeMap.has(deviceKey);
          const squadOccupied = squadTimeMap.has(squadKey);

          if (!deviceOccupied && !squadOccupied) {
            schedule.push({
              squadName: squad.name,
              deviceName: device.name,
              startTime,
              endTime,
              competition: competition.name,
              isWarmup: false,
              isFirstDevice: device.isFirst,
            });
            deviceTimeMap.set(deviceKey, squad.name);
            squadTimeMap.set(squadKey, device.name);
          } else {
            console.log(`[calculateDeviceSchedule] SKIPPED: Squad "${squad.name}" on "${device.name}" at ${startTime}`, {
              deviceOccupied,
              squadOccupied,
              deviceOccupiedBy: deviceOccupied ? deviceTimeMap.get(deviceKey) : null,
              squadOccupiedOn: squadOccupied ? squadTimeMap.get(squadKey) : null,
            });
          }

          currentTime = addMinutesToTime(currentTime, squadDuration + timeSettings.breakBetweenDevicesMinutes);
        }
      });
    });

    console.log(`[calculateDeviceSchedule] Generated ${schedule.length} schedule entries:`, schedule.map(s => ({
      squad: s.squadName,
      device: s.deviceName,
      competition: s.competition,
      time: `${s.startTime}-${s.endTime}`,
    })));

    return schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [squadDisciplines, disciplineCache, timeSettings, addMinutesToTime]);

  return { calculateDeviceSchedule };
}
