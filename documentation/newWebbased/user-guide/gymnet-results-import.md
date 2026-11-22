# Ergebnisse aus TurnFix in GymNet importieren

Diese Anleitung beschreibt den Weg von den in TurnFix erfassten Wertungen bis zum Ergebnisimport im DTB-GymNet. Dafür wird zuerst eine GymNet-XML aus TurnFix exportiert und anschließend im passenden Wettkampf-Angebot hochgeladen.

## 1. Ergebnisdatei in TurnFix exportieren

1. In TurnFix die Veranstaltung und den Wettkampf mit den zu importierenden Ergebnissen öffnen.
2. In der Ergebnisansicht **Export** wählen.
3. Als Exporttyp **XML** auswählen.
4. Die ursprüngliche GymNet-XML als Vorlage auswählen. Wenn die Veranstaltung zuvor aus GymNet importiert wurde, kann TurnFix die bereits importierte Datei als Vorschlag anbieten.
5. Einen Namen für die Ausgabedatei festlegen und den Export starten.
6. Warten, bis der Browser die erzeugte XML-Datei heruntergeladen hat.

Die Vorlage muss zum GymNet-Wettkampf gehören. Vor dem Import kontrollieren, dass Veranstaltung, Wettkampf und Wertungen vollständig und richtig sind.

## 2. Ergebnisdatei in GymNet importieren

1. Bei [DTB-GymNet](https://www.dtb-gymnet.de/) anmelden.
2. Den zuständigen Verband über [Verband auswählen](https://www.dtb-gymnet.de/Kreis.php?edit=Blatt) öffnen.
3. [Wettkämpfe / Vorführungen](https://www.dtb-gymnet.de/Event.php?evKategorie=5) auswählen.
4. Den passenden Wettkampf auswählen und anmelden beziehungsweise das Wettkampf-Angebot öffnen.
5. In der linken Seitenleiste im **Wettkampf-Angebot** den **Einzelwettkampf** auswählen.
6. Oben den Reiter **Ergebnisse** öffnen und **Ergebnisse importieren** wählen.
7. Im Bereich **XML-Importe** auf **Durchsuchen** klicken und die eben aus TurnFix exportierte XML-Datei auswählen.
8. Als Importtyp **xml - GymNet-Import Teil- und Endergebnisse** auswählen.
9. **Speichern** wählen und die Rückmeldung von GymNet prüfen.

## Wenn der Import nicht klappt

- Sicherstellen, dass die Datei die aus TurnFix erzeugte GymNet-XML ist, nicht die ursprüngliche Vorlage.
- Prüfen, ob die Vorlage zum ausgewählten GymNet-Wettkampf gehört und der richtige Einzelwettkampf geöffnet ist.
- Vor einem erneuten Import Ergebnisdatei und ausgewählten Wettkampf vergleichen. Nicht ungeprüft eine Datei in einen anderen Wettkampf importieren.
- Die Bezeichnungen und Menüs von GymNet können sich ändern; im Zweifel die im Portal angezeigten Importhinweise beachten.

Weitere Hinweise zum Einlesen von Meldedaten aus GymNet in TurnFix stehen unter [GymNet-Import](../developer-guide/features/gymnet-import.md).
