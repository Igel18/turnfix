/**
 * useTimeCalculation Hook
 * Point 124: Separation of Concerns - Time Calculation Utilities
 * 
 * Extracted from TimePlanning.tsx (Lines 250-281)
 * Handles time parsing, arithmetic, and slot generation for Gantt charts
 */

import type { GanttTimeSlot } from '../TimePlanning.types';

interface UseTimeCalculationReturn {
  parseTime: (timeStr: string) => number;
  addMinutesToTime: (timeStr: string, minutes: number) => string;
  generateTimeSlots: (startTime: string, endTime: string) => GanttTimeSlot[];
}

export function useTimeCalculation(): UseTimeCalculationReturn {
  /**
   * Parse time string (HH:MM) to decimal hours
   * Example: "14:30" → 14.5
   */
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  /**
   * Add minutes to a time string
   * Example: addMinutesToTime("14:30", 45) → "15:15"
   */
  const addMinutesToTime = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  /**
   * Generate time slots for Gantt chart
   * Creates 30-minute intervals between start and end time
   * Example: generateTimeSlots("08:00", "12:00") → [{time: "08:00", ...}, {time: "08:30", ...}, ...]
   */
  const generateTimeSlots = (startTime: string, endTime: string): GanttTimeSlot[] => {
    const slots: GanttTimeSlot[] = [];
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    
    let current = start;
    while (current <= end) {
      const hour = Math.floor(current);
      const minute = (current % 1) * 60;
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        hour,
        minute
      });
      current += 0.5; // 30-minute intervals
    }
    
    return slots;
  };

  return {
    parseTime,
    addMinutesToTime,
    generateTimeSlots
  };
}
