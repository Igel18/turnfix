
1. Im DB Setup 
http://localhost:3001/configuration

muss mit einem "zurückgesetzen" UI begonnen werden. 
-> Erledigt ✅ 

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
-> Erledigt ✅ 

3. Im DB Setup 
http://localhost:3001/configuration
müssen für den Setup assistenten Tests geschrieben werden. 
-> Erledigt ✅ 

4. In dem Export PDF von Siegerlisten muss auch immer die Formel angezeigt werden. 
Da jeder Teilnehmer in einem Wettkampf immer die gleiche Formel an einem Gerät hat reicht das in der Überschrift. 

5. Im DatabaseSetupWizard.tsx 
die Datei ist langsam sehr groß und es ist JS und HTML vermischt. Wäre hier eine Trennung nach dem in "myown" angegebenen pattern nicht sinnvoll? 
-> Erledigt ✅ 

6. Bezüglich den Formeln wäre eine kompaktere darstellung schön. 
Ich stelle mir das so vor: <>

Beim Erfassen der wertungen: 1. wird die Riege ausgewählt 2. das Gerät. An dem Gerät hängt ja auch die Formel, daher kann immer nur 1 Formel aktiv sein. Daher wäre es ja möglich, wenn die Formel über der kompletten Teilnehmerliste steht. 

Bei den Results: 
In einem Wettkampf gibt es auch nur eine definierte Gerätezahl welche bei jedem Turner gleich ist. Daher wäre es auch hier möglich die Formel im Kopf darzustellen und am Rand nur die Felder zur Eingabe und der Endwert. 

7. der Import funktioniert jetz immerhin ohne fehler. Nach dem Import habe ich die disziplinen geprüft. 
Die Sportart "Turnen" hat einige Geräte. Alle Felder sind Korrekt. Nur die "Einheit" fehlt bei fast allen. Das muss "Pkt." Sein. 
Die Sportart "Turnen DTB": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen die Formeln. 
Die Sportart "Turnen DTB P": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen fast überall die Formeln. Korrekt wäre hier die Formel "P-Wettkampf" 
Die Sportart "Turnen DTB LK": Hier fehlen die Icons. Wahrscheinlich ist überall der Pfad nicht ganz korrekt. Zudem Fehlen fast überall die Formeln. Korrekt wäre hier die Formel "LK" 
-> Erledigt ✅ 

8. Nach dem Erzeugen einer neuen DB muss auch in der Konfiguration dieser neue DB Name verwendet werdeen. Ggf. auch mit zusätzlichem Button "Neue DB verwenden" oder so. Und dann auch reconnected. 
Warum steht im Datenbank Host der DB-name? 
-> Erledigt ✅ 

9. Urkunden Layout Vorlage (Standard-Urkunde) 
Es wäre gut wenn mit dem Datenbank-Setup-Assistent ein Layout für eine Urkunde mitkommt welches auch brauchbar ist. 
kannst du damit was anfangen? So ist ein Layout in einer anderen DB angelegt. 
285	25	0	"Tahoma,20,-1,5,50,0,0,0,0,0"	35.7882	144.635	137.012	9.95294	"3"	0	0
286	25	0	"Tahoma,20,-1,5,75,0,0,0,0,0"	82.59	208.165	43.6235	11.0118	"5"	0	1
287	25	1	"Tahoma,12,-1,5,50,0,0,0,0,0"	82.5882	187.624	43.2	6.98824	"Platz"	0	2
288	25	1	"Tahoma,12,-1,5,50,0,0,0,0,0"	53.7882	169.835	43.4118	4.65882	"erreichte mit "	0	3
289	25	0	"Tahoma,12,-1,5,50,0,0,0,0,0"	82.3765	169.835	42.7765	4.65882	"6"	0	4
290	25	1	"Tahoma,12,-1,5,50,0,0,0,0,0"	103.765	169.835	42.7765	5.92941	"Punkten"	0	5
291	25	2	"Tahoma,12,-1,5,50,0,0,0,0,0"	0	0	209.85085	297.4832	"C:\\Users\\Turnuntergau2 UA\\Nextcloud\\Wettkämpfe\\Bestenkämpfe\\39\\Urkunden November\\Urkunde.png"	0	6
292	25	0	"Tahoma,12,-1,5,50,0,0,0,0,0"	98.4538	178.023	48.166	6.15336	"15"	0	7
293	25	1	"Tahoma,12,-1,5,50,0,0,0,0,0"	73.416	177.811	43.9223	9.33613	"im Wettkampf Nr."	0	8
294	25	0	"Tahoma,12,-1,5,50,0,0,0,0,0"	63.867645	155.95589	80.63025	9.972689	"4"	0	9
-> Erledigt ✅ 

10. Es ist aktuell nicht möglich einen neuen Wettkampf anzulegen. Beim Speichern wird das Fenster geschlossen, aber es taucht kein Wettkampf in der Liste auf. 
-> Erledigt ✅ 

11. tfx_bereiche 
Es muss eine neue UI geben um die Bereiche anzulegen und zu editieren. 
Styleguide, Unified komponenten, Tests, Doku, 

12. Mit dem DB-Wizard sollten es auch Disziplin gruppen (http://localhost:3001/discipline-groups) angelegt werden. 
4-Kampf w P 
- Boden w. P1-P9
- Par.-Barren P1-P9
- Schwebebalken P1-P9 
- Sprung w. P1-P9 

4-Kampf m P 
- Boden m. P1-P9
- Reck m. P1-P9 
- Sprung m. P1-P9
- Barren m. P1-P9 

6-Kampf m P
- Boden m. P1-P9
- Reck m. P1-P9 
- Sprung m. P1-P9
- Barren m. P1-P9 
- Ringe P1-P9
- Pauschenpferd P1-P9
	
4-Kampf w LK1
- Boden w. LK1
... 

6-Kampf m LK1 
- Boden m. LK1
...
-> Erledigt ✅ 
	
13. DIese Geräte sind Männlich, werden aber fälschlicherweise als Weiblich importiert 
Par.-BarrenKür
Par.-Barren LK1
Par.-Barren LK2
Par.-Barren LK3
Par.-Barren P1-P9
	-> Erledigt ✅ 
	
14. nach dem anlegen einer Veranstaltung, wird die Veranstaltungsverwaltung nicht aktualisiert 
	-> Erledigt ✅ 
15. Bei den Gebieten wird auf der Management UI eine falsche anzahl angezeigt. 
	-> Erledigt ✅ 
16. BEim Wettkampf erstellen werden die Disziplin-Gruppen nicht angezeigt. 
	-> Erledigt ✅ 

17. Bei den Wettkampfergebnissen http://localhost:3001/results?eventId=1&squadName=asdf

werden bei den geräten immer alle Felder mit von allen Geräten bei jedem gerät angezeigt. 
Es darf aber nur von dem dedizierten Gerät die Felder bei diesem gerät angezeigt werden. (und dann auch in die Auswertung)
Bitte hier auch unbedingt tests schreiben! 
	-> Erledigt ✅ 

18. es müssen noch mehr Disziplingruppen angelegt werden: 
4-Kampf w LK1
4-Kampf w LK2
4-Kampf w LK3
4-Kampf w LK4

und natürlich die geräte dazu hinzugefügt. 
	-> Erledigt ✅ 

19. Das bearbeiten / hinzufügen von Disziplingruppen geht zwar, aber es können keine Geräte ausgewählt werden. http://localhost:3001/discipline-groups
	-> Erledigt ✅ 

20. Es werden gerade massenhaft Gebiete und Veände und VEreine und Athleten angelegt aber woher kommen die??? 
Test Gymnastics Association
Test Gymnastics Club
John Doe
	-> Erledigt ✅ 

21. Schreibe tests für alle Filter Menüs. Manchmal funktionieren die "Alle Filter zurücksetzen" Buttons nicht, manchmal werden beim "Geschlecht" nicht die Typen aus der DB tfx_bereiche und zusätzlich "Alle Geschlechter" (default) sondern auch "All Geschlecht" angezeigt. 

22. beim Erzeugen von Wettkämpfen ist die UI sehr voll. Insbesondere die Ganzen Geräte machen viel aus. Eine Darstellung wie bei Disziplingruppe bearbeiten wäre schön. mit Suchen, ausgewählt

