# Stammdaten und veranstaltungsspezifische Daten

TurnFix trennt wiederverwendbare Grundlagen von den Daten eines konkreten Wettkampftags. Diese Unterscheidung hilft insbesondere beim Import, bei der Teilnehmerzuordnung und beim Ändern von Disziplinen.

| Ebene | Beispiele | Bedeutung |
|---|---|---|
| **Stammdaten** | Personen, Vereine, Sportarten, Disziplinen, Disziplinfelder, Formeln, Wettkampforte | Gemeinsame Datenbasis, aus der mehrere Veranstaltungen Daten verwenden können. |
| **Veranstaltung** | Name, Datum, Ort | Der organisatorische Rahmen für einen Wettkampftag oder ein Turnfest. |
| **Wettkampf** | Nummer, Bereich, Altersgrenzen, Typ und ausgewählte Disziplinen mit Höchstpunkten | Eine konkrete Ausschreibung innerhalb der Veranstaltung. |
| **Teilnahme und Wertung** | Zuordnung einer Person zu einem Wettkampf, Startnummer, Riege und erfasste Leistungen | Daten zum konkreten Start; eine Person kann in mehreren Wettkämpfen oder Veranstaltungen vorkommen. |
| **Organisation der Veranstaltung** | Riegen, Mannschaften, Durchgänge und Zeitplanung | Einteilung für die jeweilige Veranstaltung beziehungsweise den jeweiligen Wettkampf. |

## Beispiel

Die Person **Alex Beispiel** und der Verein **TV Muster** sind in den Stammdaten vorhanden. Für das Turnfest wird Alex einem Wettkampf zugeordnet, erhält eine Startnummer und startet in einer Riege. Bei einer anderen Veranstaltung kann dieselbe Person erneut zugeordnet werden, ohne sie als neue Person anzulegen.

Die Disziplin **Boden** ist ebenfalls Stammdatum: Name, Eingabeformat und Formel werden dort verwaltet. Erst die Auswahl im Wettkampf bestimmt, dass Boden zu *diesem* Wettkampf gehört; die dort eingetragene Maximalpunktzahl gilt für diese Wettkampf-Disziplin-Zuordnung.

## Praktische Folgen

- Eine Person in den Stammdaten ist **nicht automatisch** für eine Veranstaltung oder einen Wettkampf gemeldet. Nach dem Anlegen oder Import die Wettkampfzuordnung prüfen.
- Eine Disziplin in den Stammdaten erscheint nicht automatisch bei jedem Wettkampf. Sie muss dort ausgewählt sein.
- Ein Wechsel von Riege oder Wettkampf betrifft die konkrete Teilnahme. Eine Änderung am Namen einer gemeinsam verwendeten Person oder Disziplin kann dagegen auch anderswo sichtbar werden.
- Eine gemeinsam verwendete Formel oder ihre Disziplinfelder nicht kurz vor einem laufenden Wettkampf ändern, ohne die weiteren Verwendungen zu prüfen. Bei abweichenden Regeln eine passende separate Konfiguration erwägen und testen.
- Ein Import kann neue Stammdaten und Zuordnungen erzeugen beziehungsweise vorhandene verwenden. Nach dem Import insbesondere Personen, Vereine, Disziplinzuordnung und Wettkampftyp prüfen.

**Empfohlene Reihenfolge:** Stammdaten prüfen → Veranstaltung anlegen oder importieren → Wettkämpfe und Disziplinen prüfen → Personen zuordnen → Riegen und Zeitplanung einteilen → Eingabe und Ergebnisse testen.

Weiter: [Disziplinen](master-data/disciplines.md) · [Disziplinformeln](master-data/formulas.md) · [Wettkampfeinstellungen](wettkampf-einstellungen.md) · [Zeitplanung](time-planning.md)
