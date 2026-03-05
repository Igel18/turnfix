/**
 * Scoring View for the Jury Portal.
 * 
 * The main scoring interface with split-view layout:
 * - Left sidebar: scrollable participant list with progress
 * - Right panel: score input (formula or simple) with navigation
 */

import React from 'react';
import { Users, Trophy } from 'lucide-react';
import { MISSING_ICON_EMOJI, getMissingIconUrl } from '../../../utils/iconUtils';
import { normalizeScoreInput, getScorePlaceholder, formatScore } from '../../../utils/scoreFormatter';
import { applyBuiltInFormula, detectFormulaType } from '../../../utils/formulaUtils';
import FormulaInput from '../../FormulaInput';
import type { Participant, Device, Squad, DisciplineField } from '../JuryPortal.types';

interface ScoringViewProps {
  // Data
  participants: Participant[];
  currentParticipant: Participant | undefined;
  currentParticipantIndex: number;
  selectedDevice: Device | null;
  selectedSquad: Squad | null;
  disciplineFields: DisciplineField[];
  loadedJuryResults: Record<string, number>;
  score: string;
  loading: boolean;

  // Handlers
  onParticipantSelect: (index: number) => void;
  onScoreChange: (score: string) => void;
  onFormulaChange: (calculatedScore: number | null, fieldValues: Record<string, number>) => void;
  onScoreSubmit: () => void;
  onDeviceComplete: () => void;
  onBack: () => void;
  getScoreValidation: (scoreValue: string) => { isValid: boolean; message: string };
}

const ScoringView: React.FC<ScoringViewProps> = ({
  participants,
  currentParticipant,
  currentParticipantIndex,
  selectedDevice,
  selectedSquad,
  disciplineFields,
  loadedJuryResults,
  score,
  loading,
  onParticipantSelect,
  onScoreChange,
  onFormulaChange,
  onScoreSubmit,
  onDeviceComplete,
  onBack,
  getScoreValidation,
}) => {
  const completedCount = participants.filter(p => p.currentScore && p.currentScore > 0).length;
  const progressPercent = participants.length ? (completedCount / participants.length) * 100 : 0;

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <ScoringHeader
        selectedDevice={selectedDevice}
        selectedSquad={selectedSquad}
        onBack={onBack}
        onDeviceComplete={onDeviceComplete}
      />

      {/* Main Content: Split View */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Left Sidebar: Participants List */}
        <ParticipantSidebar
          participants={participants}
          currentParticipantIndex={currentParticipantIndex}
          selectedDevice={selectedDevice}
          selectedSquad={selectedSquad}
          completedCount={completedCount}
          progressPercent={progressPercent}
          onParticipantSelect={onParticipantSelect}
        />

        {/* Right Panel: Score Input */}
        <ScoreInputPanel
          currentParticipant={currentParticipant}
          currentParticipantIndex={currentParticipantIndex}
          participantCount={participants.length}
          selectedDevice={selectedDevice}
          disciplineFields={disciplineFields}
          loadedJuryResults={loadedJuryResults}
          score={score}
          loading={loading}
          onScoreChange={onScoreChange}
          onFormulaChange={onFormulaChange}
          onScoreSubmit={onScoreSubmit}
          onParticipantSelect={onParticipantSelect}
          getScoreValidation={getScoreValidation}
        />
      </div>
    </div>
  );
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

interface ScoringHeaderProps {
  selectedDevice: Device | null;
  selectedSquad: Squad | null;
  onBack: () => void;
  onDeviceComplete: () => void;
}

const ScoringHeader: React.FC<ScoringHeaderProps> = ({
  selectedDevice,
  selectedSquad,
  onBack,
  onDeviceComplete,
}) => (
  <div className="bg-blue-600 text-white p-2 sm:p-4 flex-shrink-0">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={onBack}
          className="text-blue-100 hover:text-white text-sm sm:text-base"
        >
          ← Zurück
        </button>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {selectedDevice?.iconPath ? (
            <img
              src={selectedDevice.iconPath}
              alt={`${selectedDevice.name} icon`}
              className="w-6 h-6 sm:w-10 sm:h-10 object-contain bg-white bg-opacity-20 rounded-lg p-1"
              onError={(e) => {
                const missingUrl = getMissingIconUrl();
                if (e.currentTarget.src !== missingUrl) {
                  e.currentTarget.src = missingUrl;
                } else {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="text-xl sm:text-3xl">${MISSING_ICON_EMOJI}</div>`;
                  }
                }
              }}
            />
          ) : selectedDevice?.icon ? (
            <div className="text-xl sm:text-3xl">{selectedDevice.icon}</div>
          ) : (
            <div className="text-xl sm:text-3xl">{MISSING_ICON_EMOJI}</div>
          )}
          <div>
            <h1 className="text-sm sm:text-xl font-bold">{selectedDevice?.name}</h1>
            <p className="text-xs sm:text-base text-blue-100">{selectedSquad?.name}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onDeviceComplete}
        className="bg-green-600 hover:bg-green-700 px-2 py-1 sm:px-4 sm:py-2 rounded text-white font-medium text-xs sm:text-base"
      >
        Gerät abschließen
      </button>
    </div>
  </div>
);

interface ParticipantSidebarProps {
  participants: Participant[];
  currentParticipantIndex: number;
  selectedDevice: Device | null;
  selectedSquad: Squad | null;
  completedCount: number;
  progressPercent: number;
  onParticipantSelect: (index: number) => void;
}

const ParticipantSidebar: React.FC<ParticipantSidebarProps> = ({
  participants,
  currentParticipantIndex,
  selectedDevice,
  selectedSquad,
  completedCount,
  progressPercent,
  onParticipantSelect,
}) => (
  <div className="w-full sm:w-2/5 lg:w-1/3 bg-white border-b sm:border-b-0 sm:border-r border-gray-300 flex flex-col">
    <div className="p-2 sm:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900">Teilnehmer ({participants.length})</h2>
      <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedDevice?.name} - {selectedSquad?.name}</p>

      {/* Progress Bar */}
      <div className="mt-2 sm:mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Fortschritt</span>
          <span className="text-xs text-gray-500">
            {completedCount} / {participants.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
    </div>

    {/* Scrollable Participants List */}
    <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {participants.length === 0 ? (
        <div className="p-4 sm:p-8 text-center text-gray-500">
          <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm sm:text-base">Keine Teilnehmer gefunden</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {participants.map((participant, index) => (
            <div
              key={participant.id}
              className={`p-3 sm:p-4 cursor-pointer transition-all active:scale-98 ${
                index === currentParticipantIndex
                  ? 'bg-blue-50 border-l-4 border-blue-600 shadow-sm'
                  : participant.currentScore && participant.currentScore > 0
                    ? 'bg-green-50 hover:bg-green-100 active:bg-green-200'
                    : 'hover:bg-gray-50 active:bg-gray-100'
              }`}
              onClick={() => onParticipantSelect(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-bold flex-shrink-0 ${
                      index === currentParticipantIndex
                        ? 'bg-blue-600 text-white'
                        : participant.currentScore && participant.currentScore > 0
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                    }`}>
                      {participant.startNumber}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm sm:text-base font-semibold truncate ${
                        index === currentParticipantIndex ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {participant.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{participant.clubName}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {participant.currentScore && participant.currentScore > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="text-base sm:text-lg font-bold text-green-700">
                        {formatScore(
                          selectedDevice?.var_formel && detectFormulaType(selectedDevice.var_formel) === 'variable'
                            ? applyBuiltInFormula(selectedDevice.var_formel, participant.currentScore)
                            : participant.currentScore,
                          selectedDevice?.int_berechnung
                        )}
                      </span>
                      {selectedDevice?.var_formel && detectFormulaType(selectedDevice.var_formel) === 'variable' && (
                        <span className="text-xs text-gray-400">
                          (Eingabe: {formatScore(participant.currentScore, selectedDevice?.int_berechnung)})
                        </span>
                      )}
                      <span className="text-xs text-green-600">✓</span>
                    </div>
                  ) : index === currentParticipantIndex ? (
                    <span className="text-xs sm:text-sm font-medium text-blue-600">→</span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

interface ScoreInputPanelProps {
  currentParticipant: Participant | undefined;
  currentParticipantIndex: number;
  participantCount: number;
  selectedDevice: Device | null;
  disciplineFields: DisciplineField[];
  loadedJuryResults: Record<string, number>;
  score: string;
  loading: boolean;
  onScoreChange: (score: string) => void;
  onFormulaChange: (calculatedScore: number | null, fieldValues: Record<string, number>) => void;
  onScoreSubmit: () => void;
  onParticipantSelect: (index: number) => void;
  getScoreValidation: (scoreValue: string) => { isValid: boolean; message: string };
}

const ScoreInputPanel: React.FC<ScoreInputPanelProps> = ({
  currentParticipant,
  currentParticipantIndex,
  participantCount,
  selectedDevice,
  disciplineFields,
  loadedJuryResults,
  score,
  loading,
  onScoreChange,
  onFormulaChange,
  onScoreSubmit,
  onParticipantSelect,
  getScoreValidation,
}) => {
  const validation = getScoreValidation(score);

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4">
      {currentParticipant ? (
        <div className="w-full max-w-xl h-full flex items-center justify-center">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-5">
            {/* Participant Info */}
            <div className="text-center mb-2 sm:mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white text-lg sm:text-xl font-bold mb-1">
                {currentParticipant.startNumber}
              </div>
              <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-0.5">{currentParticipant.name}</h2>
              <p className="text-xs sm:text-sm text-gray-600">{currentParticipant.club}</p>
            </div>

            {/* Score Input Section */}
            <div className="space-y-2">
              {selectedDevice?.var_formel ? (
                <FormulaInput
                  formula={selectedDevice.var_formel}
                  decimals={selectedDevice.int_berechnung || 2}
                  disciplineFields={disciplineFields}
                  initialValues={loadedJuryResults}
                  onScoreChange={(calculatedScore: number | null, fieldValues: Record<string, number>) => {
                    onFormulaChange(calculatedScore, fieldValues);
                  }}
                  disabled={loading}
                />
              ) : (
                <div className={validation.isValid ? '' : 'mb-6'}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 text-center">
                    Wertung eingeben
                    {selectedDevice?.maxScore && selectedDevice.maxScore > 0 && (
                      <span className="ml-2 text-blue-600">
                        (max. {selectedDevice.maxScore.toFixed(2)})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={score}
                      onChange={(e) => onScoreChange(e.target.value)}
                      onBlur={(e) => {
                        const normalized = normalizeScoreInput(e.target.value, selectedDevice?.int_berechnung || 2);
                        if (normalized !== e.target.value) {
                          onScoreChange(normalized);
                        }
                      }}
                      placeholder={getScorePlaceholder(selectedDevice?.int_berechnung || 2)}
                      className={`w-full text-3xl sm:text-4xl text-center p-2 sm:p-3 border-3 rounded-lg focus:outline-none font-bold transition-colors ${
                        validation.isValid
                          ? 'border-gray-300 focus:border-blue-500 text-blue-900 bg-blue-50'
                          : 'border-red-300 focus:border-red-500 text-red-900 bg-red-50'
                      }`}
                      autoFocus
                    />
                    {!validation.isValid && (
                      <div className="absolute left-0 right-0 mt-1 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 text-center z-10">
                        ⚠️ {validation.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col space-y-1.5">
                <button
                  onClick={onScoreSubmit}
                  disabled={!score || loading}
                  className="w-full bg-green-600 text-white py-2 sm:py-3 px-4 rounded-lg text-sm sm:text-lg font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all transform active:scale-98"
                >
                  {loading ? '💾 Speichert...' : '✓ Bewertung speichern'}
                </button>

                {/* Navigation Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      if (currentParticipantIndex > 0) {
                        onParticipantSelect(currentParticipantIndex - 1);
                      }
                    }}
                    disabled={currentParticipantIndex <= 0}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    ← Vorheriger
                  </button>
                  <button
                    onClick={() => {
                      if (currentParticipantIndex < participantCount - 1) {
                        onParticipantSelect(currentParticipantIndex + 1);
                      }
                    }}
                    disabled={currentParticipantIndex >= participantCount - 1}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs"
                  >
                    Nächster →
                  </button>
                </div>

                {/* Context Info */}
                <div className="text-center text-xs text-gray-500 pt-0.5">
                  <p>Teilnehmer {currentParticipantIndex + 1} von {participantCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500">
          <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
          <p className="text-base sm:text-xl">Wählen Sie einen Teilnehmer aus der Liste</p>
        </div>
      )}
    </div>
  );
};

export default ScoringView;
