# Wettkämpfe konfigurieren

Ein Wettkampf gehört zu einer Veranstaltung und beschreibt eine konkrete Ausschreibung, z. B. „Gerätvierkampf weiblich, 12–13 Jahre“. Nach Auswahl der Veranstaltung im Bereich **Wettkämpfe** kann er angelegt oder bearbeitet werden. Die Disziplinen selbst stammen aus den [Stammdaten](master-data/disciplines.md).

## Grunddaten und Kategorie

| Feld | Bedeutung |
|---|---|
| **Wettkampfnummer** | Optionale kurze Kennzeichnung mit höchstens fünf Zeichen; sinnvoll für Ausschreibung und Zuordnung. |
| **Wettkampfname** und **Beschreibung** | Name und optionaler erklärender Text. |
| **Wettkampftyp** | Einzel-, Mannschafts- oder Gruppenwettkampf. Wähle den zur Ausschreibung passenden Typ. Für die Mannschaftsanlage sind Mannschaftswettkämpfe auswählbar; Einzelwettkämpfe werden dort nicht als neue Mannschaftswettkämpfe freigegeben. |
| **Bereich** | Bestimmt die Geschlechtskategorie des Wettkampfs und beeinflusst den Disziplinfilter. |
| **Alter von / bis** | Inklusive untere und obere Altersgrenze. |

Die ausgegraute Option **Jahrgangsprüfung** zeigt den Standard an: Maßgeblich ist grundsätzlich das Geburtsjahr, nicht der Geburtstag. Beispiel: Jahrgang 2012 ist im Veranstaltungsjahr 2025 für die Altersgrenze 13 vorgesehen. Die Option lässt sich hier nicht umstellen. Da einzelne Zuordnungswege unterschiedlich prüfen können, die angebotenen Teilnehmer und Wettkämpfe vorab kontrollieren.

## Zeitplanung

| Feld | Bedeutung |
|---|---|
| **Durchgang** | Nummer des vorgesehenen Durchgangs. |
| **Bahn** | Nummer der Bahn beziehungsweise Spur für die Planung. |
| **Startzeit** | Geplanter Beginn des Wettkampfs. |
| **Einturnen** | Geplante Zeit für das Einturnen. |

Durchgang und Bahn sind nicht dasselbe wie die **Riege**: Die Riege ist die Gruppe der gemeinsam eingeteilten Teilnehmenden. Für Startgeräte und Rotation zusätzlich die Zeitplanung und die tatsächliche Riegenzuordnung prüfen; eine Eingabe in diesem Formular ersetzt diese Planung nicht.

## Qualifikation, Wertung und Anzeige

| Einstellung | Zweck laut Formular |
|---|---|
| **Qualifizierende** | Anzahl der Personen, die sich qualifizieren sollen. |
| **Wertungen** | Vorgesehene Anzahl von Bewertungen pro Teilnehmer. |
| **Streichwertungen** | Anzahl der zu streichenden Wertungen. |
| **Streichwertung** | Schalter für das Streichen der schlechtesten Wertung. |
| **Altersklasse anzeigen**, **Info anzeigen** | Anzeigeoptionen für zusätzliche Angaben. |
| **Wahlwettkampf** | Kennzeichnung als optionaler Wettkampf. |
| **Kürprogramm verwenden** | Kennzeichnung für ein Kürprogramm. |
| **Aufsteigend sortieren** | Für Ergebnisse, bei denen ein kleinerer Gesamtwert besser sein soll; sonst werden höhere Werte bevorzugt. |
| **Manuelle Sortierung**, **Gerätepunkte verwenden** | Einstellungen für Sortierung beziehungsweise gerätespezifische Punkte. |

**Wichtig:** Das Vorhandensein eines Feldes bedeutet nicht, dass jeder Auswertungs- und Exportweg sämtliche Optionen gleichermaßen unterstützt. Insbesondere Qualifikation, mehrere Bewertungen, Kürprogramm, manuelle Sortierung und Gerätepunkte vor dem Wettkampf anhand des tatsächlich verwendeten Ablaufs prüfen.

Bei der gemeinsamen Ranglistenberechnung werden bei aktivierter Streichwertung und positiver Anzahl die numerisch niedrigsten Disziplinwerte aus der Summe entfernt. Beispiel: `10 + 9 + 8`, eine Streichwertung → `19`. Ist die Anzahl mindestens so groß wie die Zahl der vorliegenden Disziplinwerte, wird stattdessen die vollständige Summe verwendet. **Achtung bei aufsteigender Sortierung:** Dort ist ein kleinerer Wert besser; trotzdem werden numerisch niedrige Werte gestrichen. Diese Kombination unbedingt vorab fachlich prüfen und nicht ungeprüft verwenden.

## Disziplinen auswählen und Höchstpunkte setzen

1. Im Abschnitt **Disziplinauswahl** mindestens eine Disziplin auswählen.
2. Der Standardfilter zeigt zum Wettkampfbereich passende Disziplinen; **Alle anzeigen** erweitert die Auswahl. Suche und Gruppenfilter schränken die sichtbare Liste zusätzlich ein. **Ausgewählt** zeigt die bisher ausgewählten Einträge.
3. **Alle sichtbaren auswählen/abwählen** betrifft die aktuell sichtbaren Einträge, nicht alle Disziplinen der Datenbank.
4. Bei ausgewählten Disziplinen die **Max. Punkte** jeweils eintragen. Das Feld **Maximalpunktzahl für alle** kann für eine Sammelaktion verwendet werden:
   - Ohne gewählte Gruppe übernimmt **Auf alle anwenden** einen positiven Wert für die bereits ausgewählten Disziplinen.
   - Mit Gruppe wählt die Gruppenaktion die anhand von Gruppe und Wettkampffilter passenden Disziplinen und setzt den angegebenen Wert für diese; bereits gewählte Gruppeneinträge werden dabei neu gesetzt. Andere ausgewählte Disziplinen bleiben erhalten.
5. Auswahl und Werte prüfen und den Wettkampf speichern.

**Achtung:** Eine Änderung des Bereichs kann zuvor ausgewählte, nicht mehr passende Disziplinen automatisch entfernen. Die Auswahl anschließend erneut prüfen. Eine Disziplingruppe ist eine Auswahlhilfe und ersetzt nicht die Kontrolle des gespeicherten Wettkampfs.

## Vor dem Start prüfen

- Stimmen Typ, Bereich, Jahrgänge und alle ausgewählten Disziplinen mit der Ausschreibung überein?
- Sind Maximalpunkte, Zeiten und Riegenplanung korrekt?
- Lässt sich eine Testperson zuordnen und erscheint die richtige Disziplin in der Wertungserfassung?
- Ergeben Testwertungen einschließlich Streichwertung und Sortierrichtung die erwartete Rangliste?

Weiter: [Stammdaten und Veranstaltung](stammdaten-und-veranstaltung.md) · [Disziplinen](master-data/disciplines.md) · [Formeln](master-data/formulas.md) · [Zeitplanung](time-planning.md)
