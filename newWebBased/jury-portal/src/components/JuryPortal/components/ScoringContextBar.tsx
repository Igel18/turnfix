/**
 * Context bar of the scoring view: makes visible what is being scored right now
 * (Durchgang, Riege, Bahn and Gerät) and where the squad is in its device rotation.
 */

import React from 'react';
import type { RotationDevice } from '../JuryPortal.types';
import { getRotationProgress, type RotationState } from '../../../utils/rotationHelpers';

interface ScoringContextBarProps {
  durchgang: number | null;
  squadName: string | undefined;
  bahn: number | null;
  /** Devices of the squad in rotation order (empty/omitted = no rotation planned) */
  rotation?: RotationDevice[];
  currentDisciplineId?: number | null;
}

interface ContextEntry {
  key: string;
  label: string;
  value: string;
  current?: boolean;
}

const ROTATION_CHIP_CLASSES: Record<RotationState, string> = {
  done: 'bg-blue-800 bg-opacity-60 text-blue-200 line-through decoration-blue-300',
  current: 'bg-white text-blue-800 font-bold ring-2 ring-yellow-300',
  next: 'bg-orange-400 text-white font-semibold',
  upcoming: 'bg-blue-500 bg-opacity-60 text-blue-50',
};

const ScoringContextBar: React.FC<ScoringContextBarProps> = ({
  durchgang,
  squadName,
  bahn,
  rotation = [],
  currentDisciplineId = null,
}) => {
  const entries: ContextEntry[] = [
    durchgang !== null && { key: 'durchgang', label: 'Durchgang', value: String(durchgang) },
    squadName && { key: 'squad', label: 'Riege', value: squadName },
    bahn !== null && { key: 'bahn', label: 'Bahn', value: String(bahn) },
  ].filter(Boolean) as ContextEntry[];

  const progress = getRotationProgress(rotation, currentDisciplineId);
  const showRotation = progress.some(p => p.state === 'current');
  const next = progress.find(p => p.state === 'next')?.device;
  const rotationStatus = !showRotation ? 'Keine Geräterotation geplant' : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
        {entries.map(entry => (
          <div
            key={entry.key}
            data-testid={`context-${entry.key}`}
            {...(entry.current ? { 'data-current': 'true' } : {})}
            className={`flex items-baseline gap-1.5 rounded-full px-3 py-0.5 text-xs sm:text-sm ${
              entry.current
                ? 'bg-white text-blue-800 font-bold ring-2 ring-yellow-300'
                : 'bg-blue-500 bg-opacity-60 text-blue-50'
            }`}
          >
            <span className={entry.current ? 'text-blue-600 uppercase tracking-wide text-[10px]' : 'text-blue-200 uppercase tracking-wide text-[10px]'}>
              {entry.label}
            </span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      {showRotation ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" data-testid="rotation-status">
          <span className="sr-only">Geräterotation</span>
          {progress.map(({ device, state }) => (
            <span
              key={device.disciplineId}
              data-testid={`rotation-device-${device.disciplineId}`}
              data-state={state}
              {...(state === 'current' ? { 'aria-current': 'step' as const } : {})}
              className={`rounded-full px-2.5 py-0.5 ${ROTATION_CHIP_CLASSES[state]}`}
            >
              {state === 'done' ? '✓ ' : ''}{device.name}
            </span>
          ))}
          <span className="ml-auto text-blue-100">
            {next ? (
              <span data-testid="rotation-next">Nächstes Gerät: <strong>{next.name}</strong></span>
            ) : (
              <span data-testid="rotation-last">Letztes Gerät der Riege</span>
            )}
          </span>
        </div>
      ) : (
        <span className="sr-only" data-testid="rotation-status">{rotationStatus}</span>
      )}
    </div>
  );
};

export default ScoringContextBar;
