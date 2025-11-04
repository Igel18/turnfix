/**
 * HelpPanels Component
 * Point 124: Separation of Concerns - Help Information
 * 
 * Displays context-sensitive help for time planning
 * - Olympische Gerätereihenfolge (Blue Info Box)
 * - Workflow-Hinweise (Yellow Info Box)
 */

import { BlueInfoBox, YellowInfoBox } from '@/components/InfoBoxes';

export function HelpPanels() {
  return (
    <div className="space-y-4 mb-6">
      {/* Olympische Reihenfolge */}
      <BlueInfoBox title="📘 Olympische Gerätereihenfolge">
        <p className="mb-3">
          Bei der Turnen gibt es eine festgelegte Reihenfolge der Geräte, die als "Olympische Reihenfolge" bekannt ist.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Männer:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Boden 🤸</li>
              <li>Pauschenpferd 🐎</li>
              <li>Ringe ⭕</li>
              <li>Sprung 🦘</li>
              <li>Barren 🏋️</li>
              <li>Reck 🤸‍♂️</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Frauen:</h4>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Sprung 🦘</li>
              <li>Stufenbarren 🤸‍♀️</li>
              <li>Schwebebalken ⚖️</li>
              <li>Boden 🤸</li>
            </ol>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-3 italic">
          Diese Reihenfolge sollte bei der Planung und Durchführung von Wettkämpfen beachtet werden, um einen reibungslosen Ablauf zu gewährleisten.
        </p>
      </BlueInfoBox>

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
