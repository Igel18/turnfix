/**
 * CompetitionFormModal - Race Condition Fix Tests
 * 
 * Tests for the race condition fix where the gender-change useEffect
 * would fire BEFORE disciplines were loaded from the API, causing all
 * disciplines to be wiped out when editing a competition.
 * 
 * Root cause:
 * - previousGenderRef starts at 'gemischt' (default)
 * - When editing, formData.gender is set to actual competition gender (e.g., 'weiblich')
 * - Gender-change useEffect fires BEFORE disciplines API call completes
 * - filteredDisciplines is still [] → all disciplines deemed "incompatible" → wiped
 * 
 * Fix:
 * - Added disciplinesLoadedRef that guards the gender-change useEffect
 * - Ref is set to false on modal open, true after disciplines API fetch completes
 * - previousGenderRef is synced with formData.gender on modal open
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useRef, useEffect } from 'react';

// We test the core logic extracted from CompetitionFormModalNew.tsx
// rather than rendering the full component (which has many dependencies)

interface Discipline {
  id: number;
  name: string;
  male_allowed: boolean;
  female_allowed: boolean;
}

interface FormDiscipline {
  disciplineId: number;
  maxScore: number;
}

/**
 * Hook that replicates the exact race condition logic from CompetitionFormModalNew.tsx
 * This allows us to test the fix in isolation.
 */
function useCompetitionDisciplineLogic(
  isOpen: boolean,
  initialGender: string,
  initialDisciplines: FormDiscipline[]
) {
  const [formGender, setFormGender] = useState(initialGender);
  const [formDisciplines, setFormDisciplines] = useState<FormDiscipline[]>(initialDisciplines);
  const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  const [incompatibleMessage, setIncompatibleMessage] = useState(false);

  // These are the exact refs from the fix
  const previousGenderRef = useRef<string>(formGender);
  const disciplinesLoadedRef = useRef<boolean>(false);

  // Reset refs when modal opens (the fix)
  useEffect(() => {
    if (isOpen) {
      previousGenderRef.current = formGender;
      disciplinesLoadedRef.current = false;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter disciplines by gender — compute inline instead of via stale state
  const computeFilteredDisciplines = (gender: string, discs: Discipline[]) => {
    return discs.filter(discipline => {
      return gender === 'gemischt' ||
        (gender === 'männlich' && discipline.male_allowed) ||
        (gender === 'weiblich' && discipline.female_allowed);
    });
  };

  // Update filteredDisciplines state for UI display
  useEffect(() => {
    setFilteredDisciplines(computeFilteredDisciplines(formGender, allDisciplines));
  }, [allDisciplines, formGender]);

  // Remove incompatible disciplines when gender changes (WITH the fix)
  // Uses computed filtered list (not stale state) to avoid render-order issues
  useEffect(() => {
    // Guard: Don't run until disciplines have been loaded from API
    if (!disciplinesLoadedRef.current) return;
    if (allDisciplines.length === 0) return;

    if (previousGenderRef.current !== formGender) {
      // Compute compatible disciplines directly (don't rely on filteredDisciplines state
      // which may be from the previous render)
      const compatible = computeFilteredDisciplines(formGender, allDisciplines);
      const compatibleIds = compatible.map(d => d.id);
      const incompatible = formDisciplines.filter(d => !compatibleIds.includes(d.disciplineId));

      if (incompatible.length > 0) {
        const updated = formDisciplines.filter(d => compatibleIds.includes(d.disciplineId));
        setFormDisciplines(updated);
        setIncompatibleMessage(true);
      }

      previousGenderRef.current = formGender;
    }
  }, [formGender, allDisciplines, formDisciplines]);

  return {
    formGender,
    setFormGender,
    formDisciplines,
    setFormDisciplines,
    allDisciplines,
    setAllDisciplines,
    filteredDisciplines,
    incompatibleMessage,
    // Expose refs for testing
    disciplinesLoadedRef,
    previousGenderRef,
    // Simulate API load completing
    markDisciplinesLoaded: () => { disciplinesLoadedRef.current = true; },
  };
}

// Sample test data
const sampleDisciplines: Discipline[] = [
  { id: 1, name: 'Boden', male_allowed: true, female_allowed: true },
  { id: 2, name: 'Reck', male_allowed: true, female_allowed: false },
  { id: 3, name: 'Stufenbarren', male_allowed: false, female_allowed: true },
  { id: 4, name: 'Sprung', male_allowed: true, female_allowed: true },
  { id: 5, name: 'Pferd', male_allowed: true, female_allowed: false },
];

describe('CompetitionFormModal - Race Condition Fix', () => {
  
  describe('disciplinesLoadedRef guard', () => {
    
    it('should NOT wipe disciplines when gender differs from default but disciplines not yet loaded', () => {
      // This is THE race condition scenario:
      // Modal opens for editing a 'weiblich' competition with 2 disciplines
      // Gender is 'weiblich' but previousGenderRef starts at 'gemischt' (default)
      // Disciplines haven't loaded yet from API
      
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true, // isOpen
          'weiblich', // gender (different from default 'gemischt')
          [
            { disciplineId: 1, maxScore: 10 }, // Boden (both genders)
            { disciplineId: 3, maxScore: 15 }, // Stufenbarren (female only)
          ]
        )
      );

      // At this point, disciplines are NOT loaded yet (disciplinesLoadedRef = false)
      // The gender-change effect should NOT have fired
      expect(result.current.formDisciplines).toHaveLength(2);
    });

    it('should preserve disciplines after API load completes', () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'weiblich',
          [
            { disciplineId: 1, maxScore: 10 },
            { disciplineId: 3, maxScore: 15 },
          ]
        )
      );

      // Simulate API response arriving
      act(() => {
        result.current.setAllDisciplines(sampleDisciplines);
        result.current.markDisciplinesLoaded();
      });

      // previousGenderRef was synced to 'weiblich' on modal open,
      // formGender is 'weiblich' → no gender change detected → no wipe
      expect(result.current.formDisciplines).toHaveLength(2);
    });

    it('should remove incompatible disciplines only after explicit gender change', async () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'gemischt',
          [
            { disciplineId: 1, maxScore: 10 }, // Boden (both)
            { disciplineId: 2, maxScore: 15 }, // Reck (male only)
            { disciplineId: 3, maxScore: 12 }, // Stufenbarren (female only)
          ]
        )
      );

      // Load disciplines from API
      act(() => {
        result.current.setAllDisciplines(sampleDisciplines);
        result.current.markDisciplinesLoaded();
      });

      // All 3 disciplines should be present (gemischt allows all)
      expect(result.current.formDisciplines).toHaveLength(3);

      // Now explicitly change gender to 'weiblich'
      // Need separate act() calls to allow React to flush effects between state updates
      act(() => {
        result.current.setFormGender('weiblich');
      });

      // Wait for effects to settle (filteredDisciplines updates, then incompatible check runs)
      await vi.waitFor(() => {
        expect(result.current.formDisciplines).toHaveLength(2);
      });

      // Reck (male only) should be removed, Boden + Stufenbarren should remain
      expect(result.current.formDisciplines.map(d => d.disciplineId)).toContain(1); // Boden
      expect(result.current.formDisciplines.map(d => d.disciplineId)).toContain(3); // Stufenbarren
      expect(result.current.formDisciplines.map(d => d.disciplineId)).not.toContain(2); // Reck removed
    });

    it('should show incompatible message when disciplines are removed due to gender change', async () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'gemischt',
          [
            { disciplineId: 2, maxScore: 15 }, // Reck (male only)
          ]
        )
      );

      act(() => {
        result.current.setAllDisciplines(sampleDisciplines);
        result.current.markDisciplinesLoaded();
      });

      // Change gender to weiblich → Reck is incompatible
      act(() => {
        result.current.setFormGender('weiblich');
      });

      await vi.waitFor(() => {
        expect(result.current.incompatibleMessage).toBe(true);
      });
      expect(result.current.formDisciplines).toHaveLength(0);
    });
  });

  describe('previousGenderRef sync on modal open', () => {
    
    it('should sync previousGenderRef with formData.gender on modal open', () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'weiblich',
          [{ disciplineId: 3, maxScore: 10 }]
        )
      );

      // previousGenderRef should be 'weiblich' (synced on open), not 'gemischt' (old default)
      expect(result.current.previousGenderRef.current).toBe('weiblich');
    });

    it('should reset disciplinesLoadedRef to false on modal open', () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'weiblich',
          []
        )
      );

      expect(result.current.disciplinesLoadedRef.current).toBe(false);
    });
  });

  describe('Full edit scenario simulation', () => {
    
    it('should handle the complete edit flow: open → load disciplines → display correctly', () => {
      // Simulate: User clicks "Edit" on a weiblich competition with Boden + Stufenbarren
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'weiblich',
          [
            { disciplineId: 1, maxScore: 10 },  // Boden
            { disciplineId: 3, maxScore: 15 },   // Stufenbarren
          ]
        )
      );

      // Step 1: Modal opens, refs are synced
      expect(result.current.previousGenderRef.current).toBe('weiblich');
      expect(result.current.disciplinesLoadedRef.current).toBe(false);
      expect(result.current.formDisciplines).toHaveLength(2);

      // Step 2: API returns all disciplines (async)
      act(() => {
        result.current.setAllDisciplines(sampleDisciplines);
        result.current.markDisciplinesLoaded();
      });

      // Step 3: filteredDisciplines should only show female-compatible ones
      const filtered = result.current.filteredDisciplines;
      expect(filtered.every(d => d.female_allowed)).toBe(true);
      expect(filtered.map(d => d.id)).toContain(1);  // Boden (both)
      expect(filtered.map(d => d.id)).toContain(3);  // Stufenbarren (female)
      expect(filtered.map(d => d.id)).toContain(4);  // Sprung (both)
      expect(filtered.map(d => d.id)).not.toContain(2); // Reck (male only)
      expect(filtered.map(d => d.id)).not.toContain(5); // Pferd (male only)

      // Step 4: Disciplines should still be intact (not wiped by race condition!)
      expect(result.current.formDisciplines).toHaveLength(2);
      expect(result.current.formDisciplines[0].disciplineId).toBe(1);
      expect(result.current.formDisciplines[1].disciplineId).toBe(3);
    });

    it('should handle edit flow with subsequent gender change', async () => {
      const { result } = renderHook(() =>
        useCompetitionDisciplineLogic(
          true,
          'gemischt',
          [
            { disciplineId: 1, maxScore: 10 },  // Boden (both)
            { disciplineId: 2, maxScore: 15 },   // Reck (male only)
            { disciplineId: 3, maxScore: 12 },   // Stufenbarren (female only)
          ]
        )
      );

      // Load disciplines
      act(() => {
        result.current.setAllDisciplines(sampleDisciplines);
        result.current.markDisciplinesLoaded();
      });

      expect(result.current.formDisciplines).toHaveLength(3);

      // User changes gender to männlich
      act(() => {
        result.current.setFormGender('männlich');
      });

      // Stufenbarren (female only) should be removed
      await vi.waitFor(() => {
        expect(result.current.formDisciplines).toHaveLength(2);
      });
      expect(result.current.formDisciplines.map(d => d.disciplineId)).toContain(1); // Boden
      expect(result.current.formDisciplines.map(d => d.disciplineId)).toContain(2); // Reck
      expect(result.current.formDisciplines.map(d => d.disciplineId)).not.toContain(3); // Stufenbarren removed

      // User changes gender again to weiblich
      act(() => {
        result.current.setFormGender('weiblich');
      });

      // Now Reck (male only) should also be removed, only Boden remains
      await vi.waitFor(() => {
        expect(result.current.formDisciplines).toHaveLength(1);
      });
      expect(result.current.formDisciplines[0].disciplineId).toBe(1); // Only Boden
    });
  });
});
