/**
 * Context bar of the scoring view: makes visible what is being scored right now
 * (Durchgang, Riege, Bahn and Gerät).
 */

import React from 'react';

interface ScoringContextBarProps {
  durchgang: number | null;
  squadName: string | undefined;
  bahn: number | null;
  deviceName: string | undefined;
}

interface ContextEntry {
  key: string;
  label: string;
  value: string;
  current?: boolean;
}

const ScoringContextBar: React.FC<ScoringContextBarProps> = ({ durchgang, squadName, bahn, deviceName }) => {
  const entries: ContextEntry[] = [
    durchgang !== null && { key: 'durchgang', label: 'Durchgang', value: String(durchgang) },
    squadName && { key: 'squad', label: 'Riege', value: squadName },
    bahn !== null && { key: 'bahn', label: 'Bahn', value: String(bahn) },
    deviceName && { key: 'device', label: 'Gerät', value: deviceName, current: true },
  ].filter(Boolean) as ContextEntry[];

  return (
    <div className="bg-blue-700 text-white px-2 py-1.5 sm:px-4 sm:py-2 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
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
      </div>
    </div>
  );
};

export default ScoringContextBar;
