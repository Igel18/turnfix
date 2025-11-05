/**
 * HelpPanels Component
 * Point 124: Separation of Concerns - Help Information
 * 
 * Displays context-sensitive help for time planning
 * - Workflow-Hinweise (Yellow Info Box)
 */

import { YellowInfoBox } from '@/components/InfoBoxes';

export function HelpPanels() {
  return (
    <div className="space-y-4 mb-6">
      {/* Workflow-Hinweis */}
      <YellowInfoBox title="💡 Hinweis zur Zeitplanung">
        <div className="space-y-2">
          <p>
            <strong>Durchgang (Session):</strong> Ein Durchgang ist ein zeitlicher Abschnitt, in dem mehrere Wettkämpfe parallel stattfinden.
            Jeder Durchgang hat eine eigene Startzeit.
          </p>
          <p>
            <strong>Bahn (Track):</strong> Eine Bahn ist ein physischer Bereich in der Halle, in dem eine Riege ihre Übungen durchführt.
            Mehrere Bahnen können parallel genutzt werden.
          </p>
          <p>
            <strong>Rotation:</strong> Jede Riege wechselt nach Ablauf der festgelegten Zeit zum nächsten Gerät in der vorgesehenen Reihenfolge.
            Die Rotation sorgt dafür, dass alle Riegen alle Geräte durchlaufen.
          </p>
          <p className="text-xs italic mt-2">
            Nutzen Sie die verschiedenen Ansichten (Durchgänge, Zeitstrahl, Gantt, Rotation), um die Zeitplanung optimal zu gestalten.
          </p>
        </div>
      </YellowInfoBox>
    </div>
  );
}
