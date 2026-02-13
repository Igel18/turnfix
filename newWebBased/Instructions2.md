
1. Im DB Setup 
http://localhost:3001/configuration

muss mit einem "zurückgesetzen" UI begonnen werden. 

2. ✅ ERLEDIGT - Im DB Setup 
http://localhost:3001/configuration
Gab es diese Fehler (Fix: Defensive `.substring()` Truncation für alle String-Spalten, siehe `documentation/newWebbased/developer-guide/DATABASE_STRING_TRUNCATION.md`): 

Produktions-Disziplinen importieren
Optional

Importiert alle 139 Disziplinen aus 12 Sportarten (Turnen, Leichtathletik, Schwimmen, etc.) - Empfohlen!
⏳ Produktions-Disziplinen werden importiert...
❌ Fehler: 
Invalid `prisma.tfx_disziplinen.create()` invocation:


The provided value for the column is too long for the column's type. Column: (not available)
Invalid `prisma.tfx_disziplinen.create()` invocation: The provided value for the column is too long for the column's type. Column: (not available)

GymNet-Voreinstellungen
Optional

Befüllt die Datenbank mit 60+ Geräten, Formeln und Feldern für GymNet-Import (optional)
⏳ GymNet-Voreinstellungen werden angewendet...
❌ Fehler: 
Invalid `prisma.tfx_disziplinen.create()` invocation:


The provided value for the column is too long for the column's type. Column: (not available)
Invalid `prisma.tfx_disziplinen.create()` invocation: The provided value for the column is too long for the column's type. Column: (not available)

3. Im DB Setup 
http://localhost:3001/configuration
müssen für den Setup assistenten Tests geschrieben werden. 

4. In dem Export PDF von Siegerlisten muss auch immer die Formel angezeigt werden. 
Da jeder Teilnehmer in einem Wettkampf immer die gleiche Formel an einem Gerät hat reicht das in der Überschrift. 

5. Im DatabaseSetupWizard.tsx 
die Datei ist langsam sehr groß und es ist JS und HTML vermischt. Wäre hier eine Trennung nach dem in "myown" angegebenen pattern nicht sinnvoll? 

6. Bezüglich den Formeln wäre eine kompakere darstellung schön. 
Ich stelle mir das so vor: 

Beim Erfassen der wertungen: 1. wird die Riege ausgewählt 2. das Gerät. An dem Gerät hängt ja auch die Formel, daher kann immer nur 1 Formel aktiv sein. Daher wäre es ja möglich, wenn die Formel über der kompletten Teilnehmerliste steht. 

Bei den Results: 
In einem Wettkampf gibt es auch nur eine definierte Gerätezahl welche bei jedem Turner gleich ist. Daher wäre es auch hier möglich die Formel im Kopf darzustellen und am Rand nur die Felder zur Eingabe und der Endwert. 

7. der Import funktioniert jetz immerhin ohne fehler. Nach dem Import habe ich die disziplinen geprüft. 
Die Sportart "Turnen" hat einige Geräte. Alle Felder sind Korrekt. Nur die "Einheit" fehlt bei fast allen. Das muss "Pkt." Sein. 
Die Sportart "Turnen DTB": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen die Formeln. 
Die Sportart "Turnen DTB P": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen fast überall die Formeln. Korrekt wäre hier die Formel "P-Wettkampf" 
Die Sportart "Turnen DTB LK": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen fast überall die Formeln. Korrekt wäre hier die Formel "LK" 

8. Nach dem Erzeugen einer neuen DB muss auch in der Konfiguration dieser neue DB Name verwendet werdeen. Ggf. auch mit zusätzlichem Button "Neue DB verwenden" oder so. Und dann auch reconnected. 
Warum steht im Datenbank Host der DB-name? 

9. layout 

