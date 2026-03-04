/**
 * Custom hook for score saving logic in the Jury Portal.
 * 
 * Extracted from JuryPortal.tsx for Separation of Concerns.
 * Handles: handleScoreSubmit (formula + simple), handleDeviceComplete, score validation.
 */

import { useCallback } from 'react';
import { getCreateWertungRequest, extractWertungenId } from '../../../utils/scoreSaveHelper';
import { validateScore } from '../../../utils/eventUtils';
import { showSuccessToast } from '../../../utils/toast';
import { formatScore } from '../../../utils/scoreFormatter';
import type { Participant, Device, DisciplineField, Competition, JuryStep } from '../JuryPortal.types';
import { API_BASE_URL } from '../JuryPortal.types';

interface UseScoreSaveParams {
  currentParticipant: Participant | undefined;
  currentParticipantIndex: number;
  participants: Participant[];
  selectedEvent: number | null;
  selectedSquad: { name: string } | null;
  selectedDevice: Device | null;
  competitions: Competition[];
  disciplineFields: DisciplineField[];
  formulaFieldValues: Record<string, number>;
  score: string;
  setLoading: (loading: boolean) => void;
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setStep: (step: JuryStep) => void;
  setCurrentParticipantIndex: (index: number) => void;
  setScore: (score: string) => void;
}

interface UseScoreSaveReturn {
  handleScoreSubmit: () => Promise<void>;
  handleDeviceComplete: () => Promise<void>;
  getScoreValidation: (scoreValue: string) => { isValid: boolean; message: string };
}

export function useScoreSave({
  currentParticipant,
  currentParticipantIndex,
  participants,
  selectedEvent,
  selectedSquad,
  selectedDevice,
  competitions,
  disciplineFields,
  formulaFieldValues,
  score,
  setLoading,
  setParticipants,
  setStep,
  setCurrentParticipantIndex,
  setScore,
}: UseScoreSaveParams): UseScoreSaveReturn {

  /**
   * Finds the correct competition ID for the selected discipline.
   */
  const findCompetitionId = (): number | null => {
    if (!selectedDevice) return null;

    // Try to find the competition that contains this discipline
    const disciplineCompetition = competitions.find(comp =>
      comp.disciplines?.some(d => d.disciplineId === selectedDevice.disciplineId)
    );

    if (disciplineCompetition) {
      console.log(`✅ JURY: Found competition ID ${disciplineCompetition.id} for discipline ${selectedDevice.disciplineId}`);
      return disciplineCompetition.id;
    }

    // Fallback: participant's assigned competitions
    const participant = participants.find((p: any) => p.id === currentParticipant?.participantId);
    if (participant?.assignedCompetitions?.length) {
      console.log(`✅ JURY: Using participant's first assigned competition: ${participant.assignedCompetitions[0]}`);
      return participant.assignedCompetitions[0];
    }

    // Last resort: first available competition
    if (competitions.length > 0) {
      console.log(`✅ JURY: Using first available competition as fallback: ${competitions[0].id}`);
      return competitions[0].id;
    }

    return null;
  };

  /**
   * Saves formula field values to tfx_jury_results.
   */
  const saveFormulaFields = async (wertungenId: number, actualCompetitionId: number) => {
    console.log('🔵 JURY: Saving formula field values:', formulaFieldValues, 'with wertungenId:', wertungenId);

    for (const [symbol, value] of Object.entries(formulaFieldValues)) {
      const fieldIndex = symbol.charCodeAt(0) - 65; // A=0, B=1, C=2...
      const disciplineField = disciplineFields[fieldIndex];

      if (!disciplineField) {
        console.warn(`⚠️ JURY: No discipline field found for symbol ${symbol}`);
        continue;
      }

      const juryResultData = {
        competitionId: actualCompetitionId,
        participantId: wertungenId,
        disciplineId: selectedDevice!.disciplineId,
        disciplineFieldId: disciplineField.id,
        performance: value,
        attempt: 1
      };

      console.log('🔵 JURY: Saving field', symbol, ':', juryResultData);

      try {
        const fieldResponse = await fetch(`${API_BASE_URL}/jury-results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(juryResultData)
        });

        if (!fieldResponse.ok) {
          console.error('❌ JURY: Failed to save field', symbol);
        } else {
          const fieldResult = await fieldResponse.json();
          console.log('✅ JURY: Saved field', symbol, 'result:', fieldResult);
        }
      } catch (fieldError) {
        console.error('❌ JURY: Error saving field', symbol, ':', fieldError);
      }
    }

    console.log('✅ JURY: All formula fields saved');
  };

  /**
   * Saves the final score to the Endwert field in tfx_jury_results.
   */
  const saveFinalScoreField = async (wertungenId: number, actualCompetitionId: number, finalScore: number) => {
    const finalScoreField = disciplineFields.find(f => f.isEndValue);
    if (!finalScoreField) {
      console.warn('⚠️ JURY: No final score field (bol_endwert=true) found in discipline fields');
      return;
    }

    console.log('🔵 JURY: Saving final score to Endwert field:', finalScoreField.name);
    try {
      const finalScoreData = {
        competitionId: actualCompetitionId,
        participantId: wertungenId,
        disciplineId: selectedDevice!.disciplineId,
        disciplineFieldId: finalScoreField.id,
        performance: finalScore,
        attempt: 1
      };

      const response = await fetch(`${API_BASE_URL}/jury-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalScoreData)
      });

      if (response.ok) {
        console.log('✅ JURY: Final score saved to Endwert field');
      } else {
        console.error('❌ JURY: Failed to save final score to Endwert field');
      }
    } catch (error) {
      console.error('❌ JURY: Error saving final score to Endwert field:', error);
    }
  };

  /**
   * Handles formula-based score submission.
   */
  const handleFormulaSubmit = async (actualCompetitionId: number): Promise<boolean> => {
    if (!currentParticipant || !selectedDevice) return false;

    let wertungenId = currentParticipant.wertungenId;

    // Ensure we have a wertungenId
    if (!wertungenId) {
      console.log('🔵 JURY: No wertungenId yet, creating wertung entry first...');

      const { url: createUrl, body: createBody } = getCreateWertungRequest(
        API_BASE_URL,
        actualCompetitionId,
        currentParticipant.participantId,
        selectedDevice.disciplineId
      );

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBody)
      });

      if (createResponse.ok) {
        const createResult = await createResponse.json();
        wertungenId = extractWertungenId(createResult);
        console.log('✅ JURY: Created wertung entry, got wertungenId:', wertungenId);

        // Update local participant with wertungenId
        setParticipants(prev => {
          const updated = [...prev];
          if (updated[currentParticipantIndex]) {
            updated[currentParticipantIndex].wertungenId = wertungenId;
          }
          return updated;
        });
      } else {
        console.error('❌ JURY: Failed to create score entry');
        alert('❌ Fehler beim Erstellen des Score-Eintrags');
        return false;
      }
    }

    if (!wertungenId) return false;

    // Save formula field values
    await saveFormulaFields(wertungenId, actualCompetitionId);

    // Calculate final score
    const finalScore = parseFloat(score);
    if (isNaN(finalScore)) {
      console.error('❌ JURY: Invalid calculated score:', score);
      alert('❌ Fehler: Ungültiger berechneter Wert');
      return false;
    }

    // Save final score to Endwert field
    await saveFinalScoreField(wertungenId, actualCompetitionId, finalScore);

    // Save final score to tfx_wertungen_details via save-value
    try {
      console.log('🔵 JURY: Saving final score to tfx_wertungen_details:', finalScore);

      const saveResponse = await fetch(`${API_BASE_URL}/scores/save-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: actualCompetitionId,
          participantId: currentParticipant.participantId,
          disciplineId: selectedDevice.disciplineId,
          score: finalScore
        })
      });

      if (saveResponse.ok) {
        const saveResult = await saveResponse.json();
        console.log('✅ JURY: Final score saved:', saveResult);

        setParticipants(prev => {
          const updated = [...prev];
          if (updated[currentParticipantIndex]) {
            updated[currentParticipantIndex].status = 'completed';
            updated[currentParticipantIndex].currentScore = finalScore;
            updated[currentParticipantIndex].wertungenId = saveResult.wertungenId || updated[currentParticipantIndex].wertungenId;
          }
          return updated;
        });

        showSuccessToast(`✅ Bewertung gespeichert! Endwert: ${formatScore(finalScore, selectedDevice!.int_berechnung)}`);
        console.log('✅ Formula-based score saved! Final score:', finalScore);
        return true;
      } else {
        console.error('❌ JURY: Failed to save final score');
        return false;
      }
    } catch (error) {
      console.error('❌ JURY: Error saving final score:', error);
      return false;
    }
  };

  /**
   * Main score submit handler.
   */
  const handleScoreSubmit = useCallback(async () => {
    if (!currentParticipant || !score || !selectedDevice) return;

    try {
      setLoading(true);
      console.log('🔍 JURY: Determining competition ID for score save...');

      const actualCompetitionId = findCompetitionId();
      if (!actualCompetitionId) {
        console.error('❌ JURY: Could not determine competition for discipline:', selectedDevice.disciplineId);
        alert('Error: Could not determine competition for this discipline. Please check that the discipline is properly assigned to a competition.');
        return;
      }

      // Check if this is a formula-based discipline
      const hasFormula = selectedDevice.var_formel && Object.keys(formulaFieldValues).length > 0;

      if (hasFormula) {
        const success = await handleFormulaSubmit(actualCompetitionId);
        if (!success) {
          alert('❌ Fehler beim Berechnen des Endwerts. Bitte versuchen Sie es erneut.');
        }
        setLoading(false);
        return;
      }

      // For non-formula disciplines, save the final score directly
      const scoreData = {
        competitionId: actualCompetitionId,
        participantId: currentParticipant.participantId,
        disciplineId: selectedDevice.disciplineId,
        score: parseFloat(score)
      };

      console.log('🟢 JURY: Sending score data to API:', scoreData);

      const response = await fetch(`${API_BASE_URL}/scores/save-value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scoreData)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ JURY: Score saved successfully:', responseData);

        setParticipants(prev => {
          const updated = [...prev];
          if (updated[currentParticipantIndex]) {
            updated[currentParticipantIndex].status = 'completed';
            updated[currentParticipantIndex].currentScore = parseFloat(score);
          }
          return updated;
        });

        showSuccessToast('✅ Bewertung gespeichert!');
        console.log('✅ Score saved!');
      } else {
        const errorData = await response.json();
        console.error('❌ JURY: API returned error:', errorData);
        alert(`Error saving score: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ JURY: Error submitting score:', error);
      alert('Error submitting score');
    } finally {
      setLoading(false);
    }
  }, [currentParticipant, score, selectedDevice, competitions, formulaFieldValues, disciplineFields, participants, currentParticipantIndex]);

  /**
   * Handles completing a device (marking squad as done for this discipline).
   */
  const handleDeviceComplete = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/squad-management/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent,
          squadName: selectedSquad?.name,
          disciplineId: selectedDevice?.disciplineId,
          status: 'Leistung erfasst'
        }),
      });
    } catch (error) {
      console.error('Error completing device:', error);
    } finally {
      setStep('device');
      setCurrentParticipantIndex(0);
      setScore('');
    }
  }, [selectedEvent, selectedSquad, selectedDevice]);

  /**
   * Score validation wrapper.
   */
  const getScoreValidation = useCallback((scoreValue: string): { isValid: boolean; message: string } => {
    if (!selectedDevice) return { isValid: true, message: '' };
    return validateScore(scoreValue, selectedDevice.maxScore || 0);
  }, [selectedDevice]);

  return {
    handleScoreSubmit,
    handleDeviceComplete,
    getScoreValidation,
  };
}
