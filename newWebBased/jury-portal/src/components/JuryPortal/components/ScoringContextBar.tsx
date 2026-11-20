import React from 'react';

interface ScoringContextBarProps {
  durchgang: number | null;
  squadName: string | undefined;
  bahn: number | null;
}

interface ContextEntry {
  key: string;
  label: string;
  value: string;
}

const ScoringContextBar: React.FC<ScoringContextBarProps> = ({ durchgang, squadName, bahn }) => {
  const entries: ContextEntry[] = [
    durchgang !== null && { key: 'durchgang', label: 'Durchgang', value: String(durchgang) },
    squadName && { key: 'squad', label: 'Riege', value: squadName },
    bahn !== null && { key: 'bahn', label: 'Bahn', value: String(bahn) },
  ].filter(Boolean) as ContextEntry[];

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 text-xs sm:gap-2 sm:text-sm">
      {entries.map(entry => (
        <div
          key={entry.key}
          data-testid={`context-${entry.key}`}
          className="flex items-baseline gap-1.5 rounded-full bg-blue-500/60 px-3 py-1 text-blue-50"
        >
          <span className="text-[10px] uppercase tracking-wide text-blue-200">{entry.label}</span>
          <span className="font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default ScoringContextBar;
