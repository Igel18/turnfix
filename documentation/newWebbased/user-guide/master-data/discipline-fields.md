# Disziplinfelder verwalten

Disziplinfelder beschreiben die einzelnen Eingaben einer Disziplin, etwa D-Note, E-Note und Abzug, sowie gegebenenfalls den Endwert. Sie gehören zu einer **Disziplin**, nicht zu einem einzelnen Wettkampf. Unter **Stammdaten → Disziplinfelder** können sie angelegt und bearbeitet werden.

## Felder im Formular

| Einstellung | Bedeutung |
|---|---|
| **Disziplin** | Zuordnung des Feldes; beim späteren Bearbeiten kann sie nicht geändert werden. |
| **Feldname** | Beschriftung für die Eingabe, z. B. `D-Note` (maximal 15 Zeichen). |
| **Sortierreihenfolge** | Bestimmt die Reihenfolge der Felder. Bei Buchstabenformeln ist die Reihenfolge für die Zuordnung zu `A`, `B`, `C` wichtig. Eindeutige Werte verwenden. |
| **Gruppe** | Nummer zur Gruppierung der Felder. |
| **Endwert** | Kennzeichnet das Feld für das berechnete Endergebnis; es ist kein zusätzlicher Summand der Formel. |
| **Ausgangswert** | Kennzeichnet ein Feld als Ausgangswert. |
| **Aktiviert** | Kennzeichnet, ob das Feld in der Wertungserfassung angezeigt wird. |

Das Formular weist weder Min-/Max-Grenzen noch eine Formel einem einzelnen Feld zu. Die Formel wird bei der **Disziplin** ausgewählt; Höchstpunkte werden für die Disziplin im **Wettkampf** eingestellt.

## Beispiel für eine Detailwertung

| Reihenfolge | Feld | Rolle |
|---|---|---|
| 0 | D-Note | Eingabe `A` |
| 1 | E-Note | Eingabe `B` |
| 2 | Abzug | Eingabe `C` |
| 3 | Endwert | Als Endwert markieren |

Für diese Felder kann die verknüpfte Formel `A+B-C` verwendet werden. Bei `A=5`, `B=8` und `C=0,5` ergibt sich `12,5`. Ein Minuszeichen im Feldnamen allein zieht nichts ab – der Abzug muss in der Formel stehen.

Fehlt ein benötigtes Feld, kann in der Eingabemaske ein deaktivierter Platzhalter erscheinen; damit ist das Feld noch nicht gespeichert. Lege die benötigten Felder tatsächlich an und prüfe die Eingabe nach dem Speichern. Nach Änderungen an Sortierung oder Feldrollen die Formel erneut mit bekannten Werten testen.

Weiter: [Formeln und Zuordnung](formulas.md) · [Disziplinen](disciplines.md)
