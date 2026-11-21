# Disziplinformeln verstehen

Formeln bestimmen, wie aus eingegebenen Leistungen ein Ergebnis entsteht. Sie sind von den **Höchstpunkten im Wettkampf** und von der **Anzahl der Versuche** zu unterscheiden. Unter **Stammdaten → Formeln** werden wiederverwendbare Formeln mit Name, Ausdruck und Typ angelegt. Eine solche Formel wird anschließend im Disziplinformular ausgewählt; sie wird nicht direkt einem Disziplinfeld zugewiesen.

## Zwei Möglichkeiten

| | Verknüpfte Formel | Benutzerdefinierte Disziplinformel |
|---|---|---|
| Pflege | Gemeinsamer Eintrag unter **Formeln**, an der Disziplin ausgewählt | Ausdruck direkt im Disziplinformular |
| Typische Eingabe | Mehrere Detailfelder, z. B. `A+B-C` | Eine Leistung `x`, z. B. `1*x` oder `20-x` |
| Auswirkung einer Änderung | Kann alle Disziplinen betreffen, die die Formel verwenden | Betrifft die betreffende Disziplin und deren Verwendung |

Ist beides eingetragen, hat die ausgewählte verknüpfte Formel Vorrang. Den Eintrag **Keine vordefinierte Formel** wählen, wenn stattdessen die direkte Formel verwendet werden soll. Der Typ im Formeleditor dient der Einordnung; er ersetzt nicht den Ausdruck oder die benötigten Felder.

## Detailfelder: `A`, `B`, `C`

Lege die [Disziplinfelder](discipline-fields.md) in der gewünschten Reihenfolge an. Im üblichen Fall entspricht `A` dem ersten Eingabefeld, `B` dem zweiten und `C` dem dritten; der Endwert ist das Ergebnis und kein Eingabefeld. Die Namen wie „D-Note“ dienen der Anzeige – verwende im Ausdruck einzelne Buchstaben und nicht `D_NOTE` oder andere Feldnamen.

Beispiel: D-Note `5`, E-Note `8` und Abzug `0,5` ergeben mit `A+B-C` den Endwert `12,5`. Der Abzug muss ausdrücklich mit `-C` in der Formel stehen. Für eine P-Übung mit Stufe als `A` und Ausführungsabzug als `B` wäre `(10+A)-B` ein mögliches Beispiel, sofern es zur Ausschreibung passt.

Die Feldzuordnung ist empfindlich gegenüber Änderungen der Sortierung und Feldkonfiguration. Bei einzelnen Symbolen kann eine explizite Feldbezeichnung die Zuordnung beeinflussen. Kontrolliere deshalb nach jeder Änderung die angezeigte Zuordnung und rechne mehrere Testfälle einschließlich `0` nach.

## Direkte Leistungsumrechnung mit `x`

Eine direkt an der Disziplin hinterlegte Formel wie `1*x` übernimmt die Leistung unverändert; `x*2` verdoppelt sie. Bei einer Zeitdisziplin kann beispielsweise eine Umrechnung in Punkte benötigt werden. Eine Zeitangabe in der Form `01:30.25` entspricht für die Berechnung 90,25 Sekunden. Welche Formel fachlich richtig ist, bestimmt die Ausschreibung.

Für robuste Formeln Grundrechenarten `+`, `-`, `*`, `/` und Klammern verwenden. Die Hilfe im Formular nennt weitere mathematische Funktionen; deren Unterstützung ist nicht in allen Berechnungspfaden gleich. Insbesondere komplexe Funktionen oder Bedingungen nicht ungeprüft im Wettkampf einsetzen: zunächst mit bekannten Werten in der Vorschau **und** in der tatsächlichen Erfassung und Ergebnisliste prüfen.

Bei direkten Leistungsformeln kann der eingegebene Rohwert gespeichert und erst für Ergebnisanzeige oder Rangliste umgerechnet werden. Ein abweichender Eingabe- und Ergebniswert ist deshalb nicht automatisch ein Fehler.

## Warum erscheint nur ein Endwert?

Bei einem GymNet-Import kann der **Wertungsmodus** für die Veranstaltung gewählt werden: **Formelberechnung** oder **Nur Endwert-Eingabe**. Letzterer ist für direkt eingegebene Endwerte vorgesehen. Eine Formelauswahl an der Disziplin allein bedeutet daher nicht, dass in jeder Veranstaltung Detailfelder erfasst werden.

**Vor dem Einsatz:** Richtige Formel auswählen, Felder und Reihenfolge prüfen, Vorschau verwenden, anschließend eine Testwertung erfassen und gespeicherten Wert sowie Ergebnisliste kontrollieren. Bei einer geteilten Formel vor Änderungen ihre weiteren Verwendungen berücksichtigen.

Weiter: [Disziplinen](disciplines.md) · [Disziplinfelder](discipline-fields.md) · [Wettkampfeinstellungen](../wettkampf-einstellungen.md)
