import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimeCalculation } from '../hooks/useTimeCalculation';

describe('useTimeCalculation', () => {
  describe('parseTime', () => {
    it('parses exact hours', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.parseTime('08:00')).toBe(8);
      expect(result.current.parseTime('14:00')).toBe(14);
    });

    it('parses half hours', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.parseTime('08:30')).toBe(8.5);
      expect(result.current.parseTime('14:30')).toBe(14.5);
    });

    it('parses quarter hours', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.parseTime('09:15')).toBeCloseTo(9.25);
      expect(result.current.parseTime('09:45')).toBeCloseTo(9.75);
    });

    it('parses midnight / start of day', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.parseTime('00:00')).toBe(0);
    });
  });

  describe('addMinutesToTime', () => {
    it('adds minutes within the same hour', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('08:00', 15)).toBe('08:15');
      expect(result.current.addMinutesToTime('08:00', 30)).toBe('08:30');
    });

    it('rolls over to next hour', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('08:45', 30)).toBe('09:15');
    });

    it('adds large minute values (> 60)', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('08:00', 90)).toBe('09:30');
      expect(result.current.addMinutesToTime('08:00', 120)).toBe('10:00');
    });

    it('pads hours and minutes with leading zeros', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('08:05', 5)).toBe('08:10');
      expect(result.current.addMinutesToTime('00:00', 5)).toBe('00:05');
    });

    it('adding zero minutes returns same time', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('11:30', 0)).toBe('11:30');
    });

    it('handles midnight rollover', () => {
      const { result } = renderHook(() => useTimeCalculation());
      expect(result.current.addMinutesToTime('23:30', 45)).toBe('24:15');
    });
  });

  describe('generateTimeSlots', () => {
    it('creates 30-minute slots between start and end', () => {
      const { result } = renderHook(() => useTimeCalculation());
      const slots = result.current.generateTimeSlots('08:00', '09:00');
      expect(slots.map(s => s.time)).toEqual(['08:00', '08:30', '09:00']);
    });

    it('includes both start and end time', () => {
      const { result } = renderHook(() => useTimeCalculation());
      const slots = result.current.generateTimeSlots('10:00', '10:30');
      expect(slots.length).toBe(2);
      expect(slots[0].time).toBe('10:00');
      expect(slots[1].time).toBe('10:30');
    });

    it('sets correct hour and minute on each slot', () => {
      const { result } = renderHook(() => useTimeCalculation());
      const slots = result.current.generateTimeSlots('09:30', '10:00');
      expect(slots[0]).toMatchObject({ time: '09:30', hour: 9, minute: 30 });
      expect(slots[1]).toMatchObject({ time: '10:00', hour: 10, minute: 0 });
    });
  });
});
