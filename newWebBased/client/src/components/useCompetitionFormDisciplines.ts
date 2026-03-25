import { useState, useEffect, useRef, useMemo } from 'react';
import type { Discipline, DisciplineGroup, CompetitionFormData } from './CompetitionFormModal.types';

/** Determines which disciplines are compatible with the given gender. */
export function filterDisciplinesByGender(
  disciplines: Discipline[],
  gender: CompetitionFormData['gender'],
): Discipline[] {
  return disciplines.filter(d =>
    gender === 'gemischt' ||
    (gender === 'männlich' && d.male_allowed) ||
    (gender === 'weiblich' && d.female_allowed),
  );
}

/** Returns a localised compatibility label for a discipline. */
export function getDisciplineGenderLabel(
  maleAllowed: boolean,
  femaleAllowed: boolean,
  labels: { both: string; male: string; female: string },
): string {
  if (maleAllowed && femaleAllowed) return labels.both;
  if (maleAllowed) return labels.male;
  if (femaleAllowed) return labels.female;
  return '';
}

interface UseDisciplineManagerOptions {
  isOpen: boolean;
  formData: CompetitionFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompetitionFormData>>;
  bulkMaxScore: string;
}

/**
 * Manages discipline loading, filtering, search, selection, and gender-change
 * side-effects for the CompetitionFormModal.
 *
 * Extracted so that each concern can be tested independently without mounting
 * the full form component.
 */
export function useCompetitionFormDisciplines({
  isOpen,
  formData,
  setFormData,
  bulkMaxScore,
}: UseDisciplineManagerOptions) {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [areas, setAreas] = useState<{
    int_bereicheid: number;
    var_name: string | null;
    bol_maennlich: boolean | null;
    bol_weiblich: boolean | null;
  }[]>([]);
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([]);
  const [selectedDisciplineGroup, setSelectedDisciplineGroup] = useState<number | null>(null);
  const [filteredDisciplines, setFilteredDisciplines] = useState<Discipline[]>([]);
  const [showIncompatibleMessage, setShowIncompatibleMessage] = useState(false);
  const [disciplineSearch, setDisciplineSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Refs that guard the gender-change side-effect against race conditions.
  const previousGenderRef = useRef<string>(formData.gender);
  const disciplinesLoadedRef = useRef<boolean>(false);

  // Reset guards when the modal opens.
  useEffect(() => {
    if (isOpen) {
      previousGenderRef.current = formData.gender;
      disciplinesLoadedRef.current = false;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch disciplines, groups and areas from the API when the modal opens.
  useEffect(() => {
    if (!isOpen) return;

    const fetchDisciplines = async () => {
      try {
        const response = await fetch('/api/disciplines');
        const data = await response.json();
        setDisciplines(data);
        disciplinesLoadedRef.current = true;
      } catch (error) {
        console.error('Error fetching disciplines:', error);
      }
    };

    const fetchDisciplineGroups = async () => {
      try {
        const response = await fetch('/api/discipline-groups');
        const data = await response.json();
        setDisciplineGroups(data.disciplineGroups || []);
      } catch (error) {
        console.error('Error fetching discipline groups:', error);
      }
    };

    const fetchAreas = async () => {
      try {
        const response = await fetch('/api/areas?limit=1000');
        const data = await response.json();
        setAreas(data.areas || []);
      } catch (error) {
        console.error('Error fetching areas:', error);
      }
    };

    fetchDisciplines();
    fetchDisciplineGroups();
    fetchAreas();
  }, [isOpen]);

  // Keep filteredDisciplines in sync with the current gender and selected group.
  useEffect(() => {
    let groupDisciplineIds: number[] = [];
    if (selectedDisciplineGroup !== null) {
      const group = disciplineGroups.find(
        g => g.int_disziplinen_gruppenid === selectedDisciplineGroup,
      );
      if (group) groupDisciplineIds = group.disciplines.map(d => d.int_disziplinenid);
    }

    const filtered = disciplines.filter(discipline => {
      const genderMatch =
        formData.gender === 'gemischt' ||
        (formData.gender === 'männlich' && discipline.male_allowed) ||
        (formData.gender === 'weiblich' && discipline.female_allowed);
      const groupMatch =
        selectedDisciplineGroup === null || groupDisciplineIds.includes(discipline.id);
      return genderMatch && groupMatch;
    });

    setFilteredDisciplines(filtered);
  }, [disciplines, formData.gender, selectedDisciplineGroup, disciplineGroups]);

  // Remove incompatible disciplines when gender changes (after load, not before).
  useEffect(() => {
    if (!disciplinesLoadedRef.current) return;
    if (disciplines.length === 0) return;
    if (previousGenderRef.current === formData.gender) return;

    const compatible = filterDisciplinesByGender(disciplines, formData.gender);
    const compatibleIds = compatible.map(d => d.id);
    const incompatible = formData.disciplines.filter(d => !compatibleIds.includes(d.disciplineId));

    if (incompatible.length > 0) {
      setFormData(prev => ({
        ...prev,
        disciplines: prev.disciplines.filter(d => compatibleIds.includes(d.disciplineId)),
      }));
      setShowIncompatibleMessage(true);
      setTimeout(() => setShowIncompatibleMessage(false), 5000);
    }

    previousGenderRef.current = formData.gender;
  }, [formData.gender, disciplines, formData.disciplines, setFormData]);

  // Disciplines visible in the list after search + showSelectedOnly filtering.
  const displayedDisciplines = useMemo(() => {
    let result = filteredDisciplines;

    if (showSelectedOnly) {
      const selectedIds = new Set(formData.disciplines.map(d => d.disciplineId));
      result = result.filter(d => selectedIds.has(d.id));
    }

    if (disciplineSearch.trim()) {
      const q = disciplineSearch.toLowerCase().trim();
      result = result.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.short_name?.toLowerCase().includes(q) ||
        d.display_name?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [filteredDisciplines, disciplineSearch, showSelectedOnly, formData.disciplines]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleDisciplineGroupChange = (groupId: number | null) => {
    setSelectedDisciplineGroup(groupId);
  };

  const handleDisciplineToggle = (disciplineId: number) => {
    setFormData(prev => {
      const isSelected = prev.disciplines.some(d => d.disciplineId === disciplineId);
      if (isSelected) {
        return { ...prev, disciplines: prev.disciplines.filter(d => d.disciplineId !== disciplineId) };
      }
      const defaultMaxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
      return {
        ...prev,
        disciplines: [...prev.disciplines, { disciplineId, maxScore: defaultMaxScore }],
      };
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = displayedDisciplines.map(d => d.id);
    const defaultMaxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
    setFormData(prev => {
      const existingMap = new Map(prev.disciplines.map(d => [d.disciplineId, d]));
      visibleIds.forEach(id => {
        if (!existingMap.has(id)) {
          existingMap.set(id, { disciplineId: id, maxScore: defaultMaxScore });
        }
      });
      return { ...prev, disciplines: Array.from(existingMap.values()) };
    });
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(displayedDisciplines.map(d => d.id));
    setFormData(prev => ({
      ...prev,
      disciplines: prev.disciplines.filter(d => !visibleIds.has(d.disciplineId)),
    }));
  };

  const handleBulkSelectGroup = () => {
    if (selectedDisciplineGroup === null) {
      // No group selected: apply bulk max score to all already-selected disciplines
      if (bulkMaxScore) {
        const maxScore = parseFloat(bulkMaxScore);
        if (!isNaN(maxScore) && maxScore > 0) {
          setFormData(prev => ({
            ...prev,
            disciplines: prev.disciplines.map(d => ({ ...d, maxScore })),
          }));
        }
      }
      return;
    }

    const selectedGroup = disciplineGroups.find(
      g => g.int_disziplinen_gruppenid === selectedDisciplineGroup,
    );
    if (!selectedGroup) return;

    const groupDisciplineIds = selectedGroup.disciplines.map(d => d.int_disziplinenid);
    const disciplinesToSelect = filteredDisciplines
      .filter(d => groupDisciplineIds.includes(d.id))
      .map(d => d.id);

    const maxScore = bulkMaxScore ? parseFloat(bulkMaxScore) || 0 : 0;
    const existingNonGroup = formData.disciplines.filter(
      d => !groupDisciplineIds.includes(d.disciplineId),
    );
    const newGroupDisciplines = disciplinesToSelect.map(id => ({ disciplineId: id, maxScore }));

    setFormData(prev => ({
      ...prev,
      disciplines: [...existingNonGroup, ...newGroupDisciplines],
    }));
  };

  return {
    // API data
    disciplines,
    areas,
    disciplineGroups,
    // Filter state
    selectedDisciplineGroup,
    filteredDisciplines,
    displayedDisciplines,
    showIncompatibleMessage,
    disciplineSearch,
    setDisciplineSearch,
    showSelectedOnly,
    setShowSelectedOnly,
    // Handlers
    handleDisciplineGroupChange,
    handleDisciplineToggle,
    handleSelectAllVisible,
    handleDeselectAllVisible,
    handleBulkSelectGroup,
    // Exposed for tests
    disciplinesLoadedRef,
    previousGenderRef,
    _setDisciplines: setDisciplines,        // test helper
    _markDisciplinesLoaded: () => { disciplinesLoadedRef.current = true; }, // test helper
  };
}
