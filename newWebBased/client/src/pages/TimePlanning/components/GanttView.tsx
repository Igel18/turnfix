/**
 * GanttView Component
 * Point 124: Separation of Concerns
 * 
 * Displays Gantt chart showing device schedule over time:
 * - Time range controls
 * - Sessions grouped
 * - Devices as rows
 * - Time slots as columns
 * - Squad assignments colored
 */

import { useTranslation } from 'react-i18next';

import type { DeviceSchedule, Competition, GanttTimeSlot } from '../TimePlanning.types';

interface GanttViewProps {
  deviceSchedule: DeviceSchedule[];
  competitions: Competition[];
  ganttStartTime: string;
  ganttEndTime: string;
  setGanttStartTime: (time: string) => void;
  setGanttEndTime: (time: string) => void;
  generateTimeSlots: () => GanttTimeSlot[];
}

export function GanttView({
  deviceSchedule,
  competitions,
  ganttStartTime,
  ganttEndTime,
  setGanttStartTime,
  setGanttEndTime,
  generateTimeSlots
}: GanttViewProps) {
  const { t } = useTranslation();
  
  console.log('[GanttView] Received deviceSchedule:', deviceSchedule.length, 'entries');
  console.log('[GanttView] Squads in schedule:', [...new Set(deviceSchedule.map(s => s.squadName))]);
  
  const timeSlots = generateTimeSlots();
  
  // Group deviceSchedule by session (competition round)
  const scheduleBySession = new Map<number, DeviceSchedule[]>();
  deviceSchedule.forEach((item: DeviceSchedule) => {
    // Find competition to get round/session
    const comp = competitions.find((c) => c.name === item.competition);
    const session = comp ? comp.round : 1;
    if (!scheduleBySession.has(session)) scheduleBySession.set(session, []);
    scheduleBySession.get(session)!.push(item);
  });

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">{t('timePlanning.ganttChart')}</h3>
        {/* Time range controls */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">{t('timePlanning.timeRange.from')}:</label>
            <input
              type="time"
              value={ganttStartTime}
              onChange={(e) => setGanttStartTime(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">{t('timePlanning.timeRange.to')}:</label>
            <input
              type="time"
              value={ganttEndTime}
              onChange={(e) => setGanttEndTime(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {[...scheduleBySession.entries()].sort((a, b) => a[0] - b[0]).map(([session, activities]) => {
            // Find all devices in this session
            const devices = [...new Set((activities as DeviceSchedule[]).map((a: DeviceSchedule) => a.deviceName))];
            return (
              <div key={String(session)} className="mb-8">
                <div className="bg-blue-100 px-4 py-2 font-semibold text-blue-900 border-b flex items-center">
                  {t('timePlanning.session')} {session}
                </div>
                {/* Time header */}
                <div className="bg-gray-50 border-b flex">
                  <div className="w-48 p-3 font-medium text-gray-900 border-r">
                    {t('timePlanning.device', 'Gerät')}
                  </div>
                  {timeSlots.map(slot => (
                    <div key={slot.time} className="w-16 p-2 text-xs text-center text-gray-600 border-r">
                      {slot.time}
                    </div>
                  ))}
                </div>
                {/* Device rows */}
                {devices.map((deviceName) => {
                  // All activities for this device in this session
                  const deviceActivities = (activities as DeviceSchedule[]).filter((a: DeviceSchedule) => a.deviceName === deviceName);
                  // For each time slot, find which squad (if any) is at this device
                  return (
                    <div key={String(deviceName)} className="flex border-b border-gray-100">
                      <div className="w-48 p-2 text-sm border-r flex items-center">
                        <span className={deviceActivities.some((a: DeviceSchedule) => a.isFirstDevice) ? 'font-bold text-green-700' : 'text-gray-700'}>
                          {String(deviceName)}
                        </span>
                        {deviceActivities.some((a: DeviceSchedule) => a.isFirstDevice) && (
                          <span title="First Device for a squad" className="ml-2 text-yellow-500">★</span>
                        )}
                      </div>
                      {/* Time slots */}
                      {timeSlots.map((slot, idx) => {
                        // Find activity that covers this slot
                        const activity = deviceActivities.find((a: DeviceSchedule) => a.startTime <= slot.time && a.endTime > slot.time);
                        if (activity) {
                          return (
                            <div 
                              key={idx} 
                              className={`w-16 h-8 flex items-center justify-center border-r ${activity.isWarmup ? 'bg-yellow-200' : 'bg-blue-200'} text-xs font-medium`} 
                              title={`${activity.squadName} (${activity.competition})`}
                            >
                              {activity.squadName}
                              {activity.isFirstDevice && <span className="ml-1 text-yellow-500">★</span>}
                            </div>
                          );
                        }
                        // If previous slot had an activity, show Wechsel
                        const prevActivity = deviceActivities.find((a: DeviceSchedule) => a.endTime === slot.time);
                        if (prevActivity) {
                          return (
                            <div 
                              key={idx} 
                              className="w-16 h-8 flex items-center justify-center border-r bg-rose-100 text-rose-700 text-xs italic" 
                              title="Wechsel"
                            >
                              Wechsel
                            </div>
                          );
                        }
                        // Empty slot
                        return <div key={idx} className="w-16 h-8 border-r" />;
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
