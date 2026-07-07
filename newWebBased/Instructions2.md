
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
-> Erledigt ✅ 

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
-> Erledigt ✅ 

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
	-> Erledigt ✅ 

22. beim Erzeugen von Wettkämpfen ist die UI sehr voll. Insbesondere die Ganzen Geräte machen viel aus. Eine Darstellung wie bei Disziplingruppe bearbeiten wäre schön. mit Suchen, ausgewählt
	-> Erledigt ✅ 

23. Mannschaftswettkampf import 
Wird eine gymnet xml importiert welche unter dem knoten "mannschaft" nicht nur eine Person hat, so ist dies eine Mannschaft und muss in der http://localhost:3001/teams?eventId=1&squadName=asdf hinzugefügt werden. Natürlich müssen dann auch die Personen unter dieser Mannschaft hinzugefügt werden. 
	-> Erledigt ✅ 

24. Die UI "Bereiche" für das Geschlecht wird noch nicht angezeigt. 
	-> Erledigt ✅ 

25. kannst du ein MSI SEtup erstellen für Windows für das komplete turnfix Web. Ich denke diese schritte wären sinnvoll: 
    1. Admin rechte abfragen 
    2. PG installieren 
    3. Turnfix installieren 
    4. Service installieren welcher turnfix server startet 
	-> Erledigt ✅ 

26. Beim Import waren 4 Geräte in der XML es sind aber nur 2 Geräte an dem Wettkampf. Zudem sind das nicht die richtigen Geräte: 
Boden w. LK1
Sch.-Balken LK1
Stu.-Barren LK1
Sprung w. LK1

vielleicht können wir anhand der wedDisNr z.B. 161 bei Sprung in der XML den Match machen zu den Geräten im Turnfix. 
Da müsste es auch schon eine Datei für geben. 
Schreibe Tests, Doku und fixe den Code. 
	-> Erledigt ✅ 

27. Tests: In den Veranstaltungen bei Wettkämpfen und Teilnehmern lassen sich allerhand sachen einstellen: insbesondere "Nimmt nicht Teil", "Außer Konkurenz", "Qualifizierende", "Streichwertungen", "Gerätepunkte verwenden". Diese beeinflussen Statistiken wie in der Veranstaltungsverwaltung und Meldematrix aber auch die Plazierungen. Aktualisier am ende die Datei Test-coverage-overview.md
	-> Erledigt ✅

28. Tests: Bei den Disziplinen lassen sich allerhand sachen einstellen: Icons, Kürzel, Einheiten, Sportarten, Eingabemaske, Formel. Es muss geprüft werden, ob sich diese Einstellungen auch in den anderen UIs (Jury-Portal und Management-Server) richtig auswirken. Aktualisier am ende die Datei Test-coverage-overview.md im Documentation ordner
	-> Erledigt ✅ 

29. Startnummern vergeben: Beim Import eines Gymnet-Events sollten per Default Startnummern für die Teilnehmer vergeben werden. Eine Funktion gibt es Bereits in der Veranstaltung. Beim Hinzufügen von Teilnehmern zu einem Event müssen diese auch eine Startnummer erhalten. 
Bitte auch Tests hierfür schreiben. 
	-> Erledigt ✅ 

29. a Wenn ich das richtig sehe, hast du die funktion aus events.ts entfernt um startnummern zu vergeben. Dann sollte doch auch die UI demtentsprechend angepasst werden. 
	-> Erledigt ✅ 

30. Suchfenster: In der Veranstaltung sollte es übergeordnet (z.B. unter dem Dropdown der Veranstaltung-Auswahl) die Möglichkeit geben nach Personen / Wettkämpfen / Riegen / Geräten usw. zu suchen. Quasi ein Suchfenster auf Veranstaltungsebene. Wenn man hier was eintippt (egal ob Startnummer, Teilnehmername, Verein, Wettkampfnummer, Wettkampfname) bekommt man die Suchergebnisse als Vorschlag ("intellisense-Fenster") geliefert. Sortiert nach der eigentlichen Eingabe zu den abstrakteren (z.B. "TSV Musterstadt" liefert zuerst den Verein, dann die Wettkampfteilnehmer. Wobei der Verein nicht ausgewählt werden kann, da er sich nicht in der Veranstaltung befindet, sondern im Datenmanagement. Beim Name "Max Mustermann" sollte zuerst der Wettkampfteilnehmer (ggf. Mannschaft) , dann der Wettkampf angezeigt werden in dem dieser turnt, dann die Riege). Bei einem klick darauf springt die UI direkt zu dem Eintrag zum editieren. 
Außer du hast einen besseren UI-Vorschlag. 
	-> Erledigt ✅ 

31. Über den port 3002 wird ein Kampfrichter Portal geöffnet. Aber es wird wieder eine Seite mit der Überschrift "Willkommen im Kampfrichter Portal" angezeigt. Beim Klick auf "Wertungserfassung" und danach auf zurück wird die gewünschte Start-Seite mit der überschrift "Jury Portal" angezeigt. Die URL bleibt immer identisch. Diese "falsche" zwischen-seite sollte gelöscht werden und es muss direkt die Seite mit "Jury Portal" angezeigt werden. 
	-> Erledigt ✅ 

32. kannst du ein skript schreiben welches folgende schritte vornimmt: 
Tests laufen lassen (alle Unit Tests, alle integrationss Test, alle UI Tests -> newwebbased\client\npx playwright 
test), dann bauen des kompletten projekt (newwebbased\npm run build), dann setup erzeugen (turnfix\setup\installer\build-installer.ps1). 
Falls es das nicht schon gibt. Also das mann nur noch ein skript ausführen muss und nicht mehrere. 
	-> Erledigt ✅ 

33. beim setup muss immer geprüft werden, ob der Server/Dienst und node.js und nssm.exe schon läuft und diesen ggf. beenden. Sonst können die neuen Datein nicht überschrieben werden. 
Und nach dem Setup muss nicht nur der Server sonder auch der Jury-Server gestartet werden. 
	-> Erledigt ✅ 

34. Bei den Filtern werden keine Leerzeichen unterstützt. Das ist ein Problem denn wenn bei dem Veranstaltungsübergreifenden Suchfenster ein suchergebnis ausgewählt wird dann werden hier mit Leerzeichen in die Filter übertragen. Also müssten in den Filtern Leerzeichen unterstützt werden. 
	-> Erledigt ✅ 

35. 1. Der Link zum jury-portal verweist auf den Port 3002. Aber es fehlt der zusatz "/jury" sodass auch die seite geöffnet wird. 2. unter dem Port 3002 ist auch die Management UI erreichbar. Das sollte nicht so sein. Das war auch mal anders. 
3. Für die Fälle wären Tests ganz gut, wahrscheinlich UI-tests.
	-> Erledigt ✅  

36. haben wird das schon gemacht? 
1. ist bei den Disziplinen eine "Benutzerdefinierte Formel" (z.B. 1*x) angelegt und keine "Formel" aus einer anderen Tabelle, dann funktioniert die Eingabe der Wertungen nicht (im Jury-Portal). Es wird dann kein Feld für die Eingabe angezeigt! 
2. Im Jury-Portal werden in dem Fall "Benutzerdefinierte Formel" die richtigen Wertungen aus der DB ausgelesen. Und ich vermute auch irgendwo hin Kopiert. Im Management Portal werden Felder für die Eingabe angezeigt und auch Wertungen, aber nur die vom Jury-Portal kopierten... 
Also: Beim Score-Capture müssen auch die Wertungen kopiert werden, wie beim Jury-Portal. 
Auch dokumentieren & tests schreiben! 
	-> Erledigt ✅  

3. Hierfür müssen auch UI-Tests erstellt werden, am besten zuerst die Tests erstellen, die dann Rot sein müssen, dann die Fehler beheben und dann die Tests nochmal laufen lassen, die dann grün sein müssen. 
	-> Erledigt ✅  
	
37. Ist an einer Disziplin nur eine "Benutzerdefinierte Formel" konfiguriert so darf die Check-Box beim Score-Capture "Jury-Wertungen anzeigen" nicht auswählbar sein. Ein Tooltip mit dem Grund wäre gut. 

38. Wie kann man sicherstellen, dass die 3 Dateien src\utils\formulaUtils.ts im client, server und Jury-Portal identisch sind? Aktuell sind diese ja nicht identisch.
	-> Erledigt ✅  

39. Duplicate in Shared auslagern 
	-> Erledigt ✅  

40. beim letzen durchlauf von .\run-pipeline.ps1 sind viele fehler aufgetreten. Hauptsächlich in den UI-Tests. 
	-> Erledigt ✅  

41. Die Fallback Icons löschen und schauen warum in dem shared iconUtis.ts ein mapping drin ist. Das steht doch eigentlich in der DB ob und welche Disziplin welches Icon hat. Von mir aus kann beim fehlen eines icons in der DB (z.B. bei falschem namen) oder bei keiner angabe eines Icons in der Disziplin ein "Fehler" icon angezeigt werden. Auch testen.  
	-> Erledigt ✅  

42. UI für Bilder
Einstieg ist die Datenverwaltung im Management. Hier muss ein neuer Button hinzugefügt werden um zu einer neuen UI zu gelangen. 
Diese neue UI muss angelegt werden. 
Sie soll aussehen wie alle anderen DB-UIs in der Datenverwaltung (siehe auch myown). 
Die UI soll für das Handling von Dateien zuständig sein (z.B. Bilder, xml (gibt es noch mehr?))
- Unter Bilder fallen die Icons für die Disziplinen und die Bilder bei Urkunden. 
- Unter XML fallen die hoch geladenen GymNet Imports. 
- Es soll möglich sein hier Dateien hinzuzufügen, zu löschen und herunter zu laden. 
- Da sich alle diese jetzt erwähnten Dateien in separaten Ordnern befinden wäre es auch gut dies zu kennzeichnen (z.B. als Kategorie). 

Beim LayoutEditor gibt es schon eine Upload Möglichkeit. Diese sollte wiederverwendbar gemacht werden. 
Beim Editieren der Geräte wäre ein DropDown menü gut, um die vorhandenen Icons auswählen zu können. 

Tests und Dokumentation nicht vergessen 
	-> Erledigt ✅  

43. Benutzerdefinierte Formeln 
Bei den Sportarten Leichtathletik, Schwimmen, Rope-Skipping, Gymnastik, Turnen bei denen keine Formel aus der anderen DB-Tabelle hinterlegt ist müssen Benutzerdefinierte Formeln hinterlegt sein. Dies muss über den DB-Wizard erfolgen der bereits die Disziplinen anlegt. 
Wenn du in der Datenbank "turnfix" die Tabelle "tfx_disziplinen" anschaust siehts du in der Spalte "var_formeln" die gewünschten Formeln. 
Auch die Maske und die Anzahl der Versuche ist in dieser Tabelle richtig hinterlegt. 
Bitte auch Tests hierfür schreiben. 
	-> Erledigt ✅  

44. Riegeneinteilung 
Es gibt bei den Veranstaltungen eine Seite um Riegen zu erstellen und Personen zuzuordnen. 
Nun ist die Zuordnung der Personen zu Riegen nicht ganz einfach und hat verschiedene Kriterien: 
a) Die Riege sollte nur eine gewisse Anzahl an Personen haben, da sonst der Wettkampf zu lange dauert 
b) Die Anzahl der Riegen richtet sich nach der Anzahl der Kampfrichter bzw. Kampfgerichte (wenn immer jede Riege gleichzeitig turnen soll)
c) Es ist möglich "Pausen" einzurichten. Diese Werden dann wie Geräte behandelt aber die Riege muss in der Zeit nicht turnen 
d) Teilnehmer eines Vereins sollten nicht auf verschiedene Riegen aufgeteilt werden (da sich sonst die Trainer zerreisen müssen) 
e) Gleiche Altersstufen sollten zusammen bleiben 
f) Gleiche Geschlechter sollten zusammen bleiben 
g) Gleiche Geräte sollten zusammen bleiben 
Anhand dieser Kriterien werden die Riegen eingeteilt. Und mit einem Namen erstellt. Der Name hat idr. den Prefix des Geschlechts (m, w) und dann die Kurzform einer Farbe. So gibt es dann z.B. "wGlb" für "weiblich gelb" oder "mSchw" für "männlich schwarz". Die Kurzform daher, weil die DB nur eine begrenzte 
Anzahl an Zeichen unterstützt. 
Nun wäre es gut wenn du mir in der Seite der Riegeneinteilung einen neuen Button hinzufügst mit der Beschriftung "automatische Zuweisung" (oder etwas in der Art). Beim Klick auf diesen Button soll sich ein Modaler Dialog öffnen. Bei dem die Kriterien einstellbar sein sollen (z.B. Geschlechter trennen, einstellen der Altersstufen, Größe der Riegen, Anzahl der Riegen usw.) 
Ist dies erfolgt soll nun mittels einem Klick auf einen Button "erstellen" eine vorher einstellbare Anzahl an Vorschlägen für diese Riegeneinteilung erstellt werden. Einer dieser Vorschläge kann sodann akzeptiert werden um den Vorschlag zu übernehmen, die Riegen werden dann anhand des Vorschlages erstellt und die Teilnehmer zugeordnet. 

Ist das soweit verständlich oder gibt es noch Unklarheiten? Hast du noch Verbesserungsvorschläge zum Workflow bzw. den Kriterien? 
Bitte dokumentieren und tests erstellen. 
Für die Kriterien soll in den Einstellungen default werte definiert werden können. Es gibt ja bereits eine Datei in der die Einstellungen gespeichert sind. Die Default werte für die Kriterien sollen hier auch gespeichert werden. 
	-> Erledigt ✅  

45. Verbesserungen bei Riegeneinteilung 
a) Anzahl Pausen-Riegen soll theoretisch unbegrenzt möglich sein 
b) Bezeichnungen der Riegen: wenn es mehr riegen gibt als mit den vordefinierten "Farben" möglich ist, soll einfach durch nummeriert werden. 
c) Versuche die Riegengrößen auch ähnlich groß zu halten. also nicht eine Riege mit der max. Anzahl an Teilnehmern und eine dann mit viel weniger. Zumindest als ein Vorschlag. 

46. Fehler: 
  ✘  210 …s:367:3 › Load Test: Concurrent Browser Sessions › 4.2 — 3 browsers view score capture for different squads (19.3s)
  1 failed
    [tests] › e2e\tests\load-test.spec.ts:367:3 › Load Test: Concurrent Browser Sessions › 4.2 — 3 browsers view score capture for different squads
	-> Erledigt ✅  

47. Setup 
Beim Setup sollte auf folgendes hingewiesen werden wenn keine neue DB erstellt wird und der DB-Wizard nicht durchlaufen wird: 
1. Der GymNet-Import kann das Mapping der Geräte nicht richtig machen 
2. Die Geschlechter können mit unbekannt gekennzeichnet sein 
3. Infolge von 2. können einige Funktionen nicht richtig sein (z.B. Statistiken, zuweisungen von Geräten, Automatische Riegeneinteilung, usw.)
	-> Erledigt ✅
	-> Erledigt ✅  

48. Etiketten-Konfiguration
a.) Die Etiketten-Konfiguration soll per Setup andere Default-Werte erhalten: 
Zeilen 16
Spalten 4
Breite (mm) 48,5
Höhe (mm) 16,9
Oberer Rand (mm) 13
Unterer Rand (mm) 13
Linker Rand (mm) 8
Rechter Rand (mm) 8
Papierformat Din-A4 
	-> Erledigt ✅  
b.) Zudem wird keine Vorschau-Info beim Drucken/Pdf-Erzeugen der Etiketten angezeigt. 
	-> Erledigt ✅  
c.) Ein Start in Zeile wäre gut. Dann hat man nicht so viel Ausschuss. 
	-> Erledigt ✅  

49. Jury-Portal Werte berechnen 
Ist bei einer Disziplin eine Formel hinterlegt (ohne DB-Felder), dann werden jetzt die Variablen (z.B. x) korrekt in dem Jury-Portal angezeigt. Aber nach der Eingabe des Werts sollte ein Ergebnis berechnet werden (anhand der Formel). Aber das passiert nicht. 
Bitte prüfen, beheben, Tests schreiben, Doku erstellen. Und prüfen ob dies im management score capture richtig funktioniert. 
	-> Erledigt ✅  

50. Lizenzbestimmungen 
Für die Software sollen beim Setup Lizenzbestimmungen abgefragt werden. Ggf. ist ein anhängen einer bestehende Lizenz Apache, MIT oder so sinnvoll? Diese sollen jegliche Haftung ausschließen. Die Software ist (aktuell) open source und darf (aktuell) kostenlos verwendet werden. Wird diese modifiziert, verbessert, erweitert, fehler behoben so sind diese auch als open source zur Verfügung zu stellen. Lizenzinhaber von Turnfix Web ist Dominik Prudlo. Was ist hier sinnvoll? 
	-> Erledigt ✅  

51. QR-Code für URL 
Für das Jury-Portal sollte es einen QR-Code zum Scannen der (URL) IP/Port-Kombination geben, damit die vielen Kampfrichter leicht darauf zugreifen könnnen. 
Vielleicht direkt auf der Startseite http://localhost:3001/ 
	-> Erledigt ✅  

52. Jetzt gibt es ja den Jury-Qr-Code. 
Die Meisten Kampfrichter müssen sich mit dem Handy an einem verschlüsseltes WLAN anmelden, damit diese das Jury-Portal erreichen können. Hierfür wäre es hilfreich, wenn auch ein QR-Code auf der Seite dargestellt ist. 
Am Besten beschriftet und Nummeriert. 
Die Infos zu dem WLAN wären dann gut wenn man diese in den Einstellungen in einem Separaten Punkt hinterlegen kann. Also Verschlüsselung, SSID, Passwort... 
	-> Erledigt ✅  

53. Riegeneinteilung verbessern wie in DB Turnfix. 
Es soll eine Möglichkeit geben bestehende Riegen so zu lassen, wie sie sind. Also Ignoriere bestehende Riegen und deren zugeordnete Personen. 
--
Riegeneinteilung wie in DB Turnfix: Die Automatische Riegeneinteilung ist schon ganz gut. Jetzt schau doch mal in die DB "TurnFix" in der wir bereits über 40 richtige Wettkämpfe mit manuellen Riegeneinteilungen durchgeführt haben. Wenn du das analysiert hast, wie könnten wir die Automatische Einteilung verbessern sodass zukünftig die Riegen genauso gut automatisch eingeteilt werden können (ggf. auf mit zusätzlichen Parametern)?
--
Auch tests hierfür schreiben & Dokumentieren
	-> Erledigt ✅
	Legacy DB Analyse (40+ Wettkämpfe):
	- Geschlechtertrennung: 97.8% aller Riegen sind eingeschlechtlich (stärkstes Muster)
	- Riegengrößen: Weiblich Ø7.8, Männlich Ø3.4 (männl. Riegen kleiner)
	- Vereinsgruppierung: 25% ein-Verein, 36% zwei-Vereine, 21% drei-Vereine
	- Alter: 91% gleich (0-1 Jahr Differenz, da Wettkämpfe nach Alter gefiltert)
	- Balance: 31% sehr ausgeglichen, 21% ausgeglichen, 34% moderat
	Implementiert:
	- "Bestehende Riegen beibehalten" Option (keepExistingSquads)
	- Balancierte Verteilung (Round-Robin statt sequentiell)
	- Besseres Bin-Packing bei Vereinsgruppierung
	- Eindeutige Namensgebung (keine Konflikte mit bestehenden Riegen)
	- Server: squadAutoAssign.ts (keepExistingSquads, fetchExistingSquadAssignments, balanced distributeIntoSquads)
	- Client: AutoAssignDialog.tsx, useAutoAssign.ts, AutoAssign.types.ts
	- i18n: de.json + en.json (keepExistingSquads, Info-Boxen, Warnungen)
	- E2E Tests: 4 neue Tests (keepExisting, unique names, all-assigned error, balanced distribution)
	- 1017 Unit/Integration Tests bestehen

Die Riegengröße ist auch abhängig von der Anzahl an Geräten welche absolviert werden müssen. 

54. Fehler: 
a.) Die WLAN / WiFi Einstellungen (http://localhost:3001/configuration) werden nicht gespeichert. Es kommt zur Fehlermeldung "Fehler beim Speichern der WLAN-Einstellungen" 
	-> Erledigt ✅

55. Urkunden PDF generieren
auf der Seite http://localhost:3001/results lassen sich "Urkunden-PDF generieren" hier wird das Layout ausgewählt und anschließend alle PDF generiert. Leider funktionieren die Bilder nicht mehr, die in den Layouts eingebettet sind. 
http://localhost:3001/certificate-layouts 

09:32:11.515 [DEBUG] Using cached request for: /api/layouts index-Rr7bXvmM.js:180:29953
09:32:11.515 Results Debug: 
Object { showFilters: false, filterSectionExists: true, competitionsCount: 1, competitionsData: (1) […] }
index-Rr7bXvmM.js:387:22725
09:32:11.517 [DEBUG] Fetched certificate layouts: 
Array [ {…} ]
index-Rr7bXvmM.js:180:29953
09:32:11.517 Results Debug: 
Object { showFilters: false, filterSectionExists: true, competitionsCount: 1, competitionsData: (1) […] }
index-Rr7bXvmM.js:387:22725
09:32:13.585 [DEBUG] Fetching fresh layout data from API for layout ID: 52 index-Rr7bXvmM.js:180:29953
09:32:13.585 Results Debug: 
Object { showFilters: false, filterSectionExists: true, competitionsCount: 1, competitionsData: (1) […] }
index-Rr7bXvmM.js:387:22725
09:32:13.591 [DEBUG] Using fresh layout data: 
Object { int_layoutid: 52, var_name: "aaaaa", txt_comment: null, fieldCount: 4, fields: (4) […] }
index-Rr7bXvmM.js:180:29953
09:32:13.591 [DEBUG] Generating certificates for participants: 1 index-Rr7bXvmM.js:180:29953
09:32:13.591 [DEBUG] Paper format: A4 index-Rr7bXvmM.js:180:29953
09:32:13.592 [DEBUG] Processing certificate 1/1 for: Sophie Beispielkind index-Rr7bXvmM.js:180:29953
09:32:13.592 Processing 4 fields for participant 1: Sophie Beispielkind index-Rr7bXvmM.js:384:47941
09:32:13.592 Coordinate scaling: dbMax=(1.0, 1.0), scale=(595.0000, 842.0000) index-Rr7bXvmM.js:384:48155
09:32:13.592 Field 2 (type 2): 
Object { x: "0.0", y: "0.0", width: "595.0", height: "842.0", value: "/uploads/images/layout-image-1772871978433-747885855.png" }
index-Rr7bXvmM.js:384:48399
09:32:14.260 [DEBUG] ✓ Added image: /uploads/images/layout-image-1772871978433-747885855.png index-Rr7bXvmM.js:180:29953
09:32:14.261 Field 4 (type 0): 
Object { x: "178.0", y: "430.4", width: "119.0", height: "42.1", value: "0" }
index-Rr7bXvmM.js:384:48399
09:32:14.261 Text field 4: "0" → "1 (Nr. 1)" (fontSize: 12) index-Rr7bXvmM.js:384:49065
09:32:14.261 Field 4 alignment: int_align=0, computed="left", textX=178.0, x=178.0, width=119.0 index-Rr7bXvmM.js:384:49542
09:32:14.261 [DEBUG] Added text: "1 (Nr. 1)" at (177.95260000000002, 457.40554620000006) with font helvetica, size 12, align left index-Rr7bXvmM.js:180:29953
09:32:14.261 Field 3 (type 0): 
Object { x: "201.3", y: "374.2", width: "119.0", height: "42.1", value: null }
index-Rr7bXvmM.js:384:48399
09:32:14.262 Field 5 (type 0): 
Object { x: "324.5", y: "436.6", width: "119.0", height: "42.1", value: "4" }
index-Rr7bXvmM.js:384:48399
09:32:14.262 Text field 5: "4" → "SV Beispieldorf 1900 e.V." (fontSize: 12) index-Rr7bXvmM.js:384:49065
09:32:14.262 Field 5 alignment: int_align=0, computed="left", textX=324.5, x=324.5, width=119.0 index-Rr7bXvmM.js:384:49542
09:32:14.262 [DEBUG] Added text: "SV Beispieldorf 1900 e.V." at (324.45986650000003, 463.6426612000001) with font helvetica, size 12, align left index-Rr7bXvmM.js:180:29953
09:32:14.360 [DEBUG] Certificate PDF generated successfully: certificates_all_2026-03-07.pdf index-Rr7bXvmM.js:180:29953
09:32:14.363 Results Debug: 
Object { showFilters: false, filterSectionExists: true, competitionsCount: 1, competitionsData: (1) […] } 
	-> Erledigt ✅

56. Wurde dem Layout ein Bild hinzugefügt, kann dieses zwar geändert werden, aber nach dem Speichern und schließen und erneut öffnen ist wieder das vorherige da. Das passiert aber nur sporadisch
	-> Erledigt ✅

57. Lässt sich das Layout und PDF generieren mit tests abdecken? Dass bei einem Layout alle möglichen Felder hinzugefügt werden und dann gespeichert, danach eine Urkunde mit dem Layout generiert und geprüft ob auch alle Felder vorhanden sind? Ggf. über Auswertung der Debug log files oder des PDFs direkt? 
Zudem alle möglichen Einstellungen in dem Layout designer. 

58. Ich habe jetzt eine neue DB angelegt und auch gespeichert. aber es sieht so aus, als ob noch die vorherige DB verwendet wird, da noch viele Daten vorhanden sind... in den Einstellungen steht aber die neue DB. Ich dachte das wird schon mittels tests abgedeckt? 
	-> Erledigt ✅

59. Datenbankkonfiguration: Wenn die DB nicht existiert und versucht wird zu connecten sollte das visualisiert werden... 

60. die Positionen der DB Felder in den Certifikaten passen nicht. Bei dem Import über den Wizard werden die voreinstellungen nicht richtig gesetzt oder importiert: 
Name muss Zentriert sein 
Verein muss Zentriert sein 
Wettkampfnummer muss rechts sein 
Textfeld Platz muss Zentriert sein 
DB Feld Platz muss Zentriert sein 
Das sollte ja einfach über das JSON zu lösen sein... 
	-> Erledigt ✅

61. Sample data 
	-> Erledigt ✅ | Sample-Daten werden aus JSON-Dateien importiert.

62. Formel Felder & Jury-Wertungen Konzept: 
Also die Möglichkeit die Jury-Wertungen anzuzeigen/auszublenden im score-capture gefällt mir nicht so gut. 
- Wie wäre es wenn wir bei Formeln mit mehr wie einem Feld immer alle Felder anzeigen? 
- Bei "Benutzerdefinierte Formel" (die haben ja eigentlich nur x als variable) immer dieses X und die Formel anzeigen, wie im Jury-Portal? 
- Die Formel soll auch angezeigt werden, wie bisher 
- Das Berechte Ergebnis soll auch angezeigt werden, wie bisher 
- Wenn es eine vordefinierte Formel und "Benutzerdefinierte Formel" gibt soll die vordefinierte Formel verwendet werden, wie bisher 

Hab ich was vergessen? Verhält sich das so wie früher im c++ und wäre kompatibel? Wie ist das in anderen systemen? 

usw. 

Die Info: "Eingabemodus

    Verknüpfte Formel: Detailfelder werden immer erfasst
    Benutzerdefinierte Formel (x): x-Eingabe + Formel + Ergebnis
    Wenn beides gesetzt ist, wird die verknüpfte Formel verwendet"
	Soll im Jury-Portal nicht angezeigt werden. Eher auf der Disziplin seite http://localhost:3001/disciplines 

Die Berechnung für die Build-In-Formel ist im Jury-Portal korrekt. Aber im Score-Capture nicht. 
	-> Erledigt ✅

63. 
Now I understand both bugs clearly. Let me write the tests, then the fixes.

For the Score-Capture issue: The onFieldChange handler in ScoreInputCell tries to find the field by ID in disciplineFields (which only has real DB field IDs), but FormulaInput/useFormulaFields may assign synthetic IDs (1000+i) for missing fields. The fix is to auto-create missing discipline fields in the database when the formula requires them.

Actually, looking at it more carefully — the real issue is simpler: if a discipline has formula (10+A)-B in the DB, both fields A and B should exist as tfx_disziplinen_felder entries. The bug is that field B doesn't exist yet. But we can't force users to manually create all fields. The fix should be in the code: when useFormulaFields detects missing fields, it should auto-create them via API, OR the onFieldChange handler should handle synthetic fields by creating the DB entry on-the-fly.

Let me check if there's an API to create discipline fields:

64. Formeln verwalten / Disziplinfelder 
Bei den Disziplinfeldern gibt es die Möglichkeit dieses Feld als EW Endwert zu definieren. Nach meinem Verständnist ist dieses Feld dann immer die Zuweisung ( = EW). Das bedeutet bei den Formeln müsste dieser Endwert immer als Zusweisung dargestellt werden. 
Wie war das denn im c++ mit dem Ausgangswert und Endwert? 
a) beim Import von Formeln auf die definition von EW achten
b) im Formel verwalten sollte es als Warnung dargestellt werden, wenn ein Formelbuchstabe als Endwert definiert ist, aber nicht die Zuweisung (= EW) bekommt. 
	-> Erledigt ✅ 

65. Score-Capture Suche 
Das Suchfeld im Score-Capture sollte wie auf allen anderen Seiten mittels dem Filter Button ein und ausgeblendet werden. Hier bitte keine Sonderlösung sonder 
den vorhandenen Style von den anderen Seiten übernehmen. Da gibt es bestimmt auch Unified / Shared code. 
	-> Erledigt ✅ 

66. Dokumentation
Wir haben ja sehr viel Doku erstellt. 
Kannst du all diese Dokumente bitte ordentlich aufbereiten und in ein einheitliches look & feel bringen um daraus eine Anwenderdoku und eine Entwicklerdoku zu erstellen. 
Dann ist es ja so, dass playwright Screenshots der UI machen kann. Wäre es möglich dies zu nutzen und Bilder von der UI in der ANwender-Doku mit anzuhängen? 
Also: 
- Dokumente Benennung einheitlich (z.B. nach Thema)
- Dokumenten Inhalt gleicher Style 
- Anwender (Admin) Doku ohne Technischen Details (Variablennamen, Tabellen, usw.)
- Jury-Doku mit ausschließlichem Thema Jury-Portal (ggf. als extra Kapitel der Anwenderdoku)
- Entwickler Doku mit viel Technischen Details (Variablennamen, Tabellen, usw.) 
- Inhaltsverzeichnis über alle Dokumente 
- ggf. Bilder der UI 
- Alle Themen wie 
	- Systemvoraussetzungen 
	- Installation 
	- Ersteinrichtung 
	- Import von GymNet Veranstaltungen 
	- usw. 
	- Bis zum Drucken der Urkunden / Siegerlisten 

Die Doku muss auch mit dem Setup mitgeliefert werden und soll über einen Desktop Icon erreichbar sein. 

67. [Feature] Teilnehmer hinzufügen 
	-> Erledigt ✅ | "Neue Person anlegen" Button in Step 1 des Wizards; neuer createAthlete-Schritt mit Formular (Vorname, Nachname, Geschlecht, Verein, Geburtsdatum optional); nach Anlegen wird direkt zur Wettkampf-Auswahl weitergeleitet oder bei nur einem Wettkampf direkt hinzugefügt.

68. [Feature] Beim Hinzufügen von Teilnehmern in einer Veranstaltung sollten die Startnummern vergeben werden 
	-> Erledigt ✅

69. [Bug] Beim Automatischen generieren von Riegen ist die Eingabe der Zahlen (Teilnehmer, Vorschläge, Pausen-Riegen) nicht gut. Man kann die komplette Eingabe in dem Feld nicht löschen. Wenn das nicht valide ist sollte ein roter Rahmen drum rum... 
	-> Erledigt ✅ | String-basierte Eingabe, roter Rahmen + Fehlermeldung bei ungültigem Wert, Generieren-Button deaktiviert bis alle Felder valide

70. [Bug] Löschen von Teilnhemern erscheint ein nicht lokalisierter Dialog 
	-> Erledigt ✅ | Löschen-Bestätigungsdialog war bereits durch UnifiedDialog/i18n korrekt lokalisiert.

71. [Bug] Hinzufügen von Teilnehmern ist der Modale Dialog nicht lokalisiert 
	-> Erledigt ✅ 

72. [Feature] Beim PDF Export müssen noch ein paar informationen mit dran. 
Teilnehmerexport: Wettkampfnummer 
Riegenliste: Wettkampf zusätzlich an die Teilnehmer 
-> Erledigt ✅ | Teilnehmer-PDF: Spalte "Wettkämpfe" mit "Name (Nr. X)" hinzugefügt; Riegenliste: Wettkampfnummer in Teilnehmer-Tabellenzeilen; 11 Unit-Tests + Integration (squadPdfExport.test.ts) + 11 Tests eventParticipantsPdfCompetition.test.ts

73. [Feature] Beim Automatischen Riegen erzeugen gehe ich wie folgt vor: 
1. Analyse wie viele Geräte geturnt werden müssen (je Wettkampf). Manche haben 4-Kampf manche 6-Kampf, das beeinflusst natürlich die Wettkampfdauer und damit die angestrebte Riegengröße 
2. Analyse wie viele Teilnehmer insgesamt gemeldet sind und wie viele in den einzelnen Wettkämpfen sind 
3. Überlegung ob alles mit einem Durchgang gemacht wird / werden soll, oder mehrere Durchgänge (In einem Durchgang müssen alle Teilnehmer eines Wettkampfes sein, damit am Ende des Durchgangs für diesen Wettkampf Urkunden und Siegerlisten gedruckt werden können) 
4. Dann überlege ich wie groß die Riegen sein dürfen. Es kann dann sein, dass man bei zu kleinen Riegen Pausenriegen bekommt. 
5. Wettkämpfe mit wenig Teilnehmern werden dann ggf. zu den Wettkämpfen mit mehr Teilnehmern zusammengefasst (in Ähnlichen Altersklassen) 
6. Dann werden diese Wettkämpfe bzw. zusammengefassen Wettkämpfe in Riegen aufgeteilt. Um möglichst gleich große Riegen zu bekommen. 
7. Die Riegen werden dann so definiert, dass die Teilnehmer von einem Verein möglichst zusammen bleiben. 

74. [Bug] Filter 
Wir haben auf fast jeder Seite einen Filter. Wenn ein Filter aktiv ist (also Filterkriterien eingestellt), dann muss der Filter angezeigt sein. 
Andersherum. Wird der Filter mittels dem Button Filter ausgeblendet, muss der Filter zurückgesetzt werden. 
Wird über die Globale Event Filterfunktion etwas gesucht und ausgewählt, springt man an die entsprechende stelle und auch hier muss dann der Filter angezeigt werden. 
-> Erledigt ✅ | useFilterPanel Hook implementiert: auto-show bei aktivem Filter, Reset beim Ausblenden, prefillSearch-URL-Param öffnet Filter-Panel automatisch; Tests in useFilterPanel.test.ts

75. [Bug] Beim dem DB-Wizard werden geräte angelegt. U.a. auch Stufenbarren in verschiedenen konstellationen (mit P, LK usw.). Hier fehlt noch das Icon. Es soll das Icon "Barren" bekommen. 
	-> Erledigt ✅ | Alle Stufenbarren-Einträge in den Seed-/Preset-Dateien (productionDisciplines.ts, disciplines-production.json, gymnet-preset.json, disciplines-gymnet.json) auf icon :/icons/barren.png umgestellt.

76. Alter / Geburtsdatum
Beim Anlegen von Athleten auf der Seite participants kann man das Geburtsdatum angeben. Es wird jedoch nur das Jahr gespeichert, nicht der Tag & Monat. TDD
	-> Erledigt ✅ 

77. [Feature] Beim hinzufügen von Teilnehmern zu einer Veranstaltung soll es möglich sein den Wettkampf auszuwählen. Aktuell wird der Teilnehmer einfach irgend einem Wettkampf zugeordnet. 
Bei der Zuweisung soll es dann auch noch möglich sein den Wettkampf zu filtern (Passende Altersklassen, Passendes Geschlecht). Diese Filter sollten per default aktiviert sein. 
-> Erledigt ✅

78. [improvement] Riegeneinteilung Filter
Die Filter bei der Riegeneinteilung müssen besser werden. 
a) Man muss über zugewiesen und nicht zugewiesenen Teilnehmern filtern können 
b) der Namensfilter muss in den "Filter" Bereich 
c) Es muss auch nach Jahrgang gefiltert werden können 
-> Erledigt ✅ | Alle drei Filter implementiert (assignmentStatus, Namensfilter im Filter-Bereich, Jahrgang); 14 Unit-Tests in squadManagement78_79_80.test.ts

79. [improvement] Riegeneinteilung UI 
In der Spalte Riegen stehen nicht alle Wettkämpfe dran sondern nur 2 stück 
Bei den Riegen Details steht bei den Teilnehmern fast keine Info dabei. Hier muss die gleiche Karte wie in der Spalte "Teilnehmer" angezeigt werden, mit den ganzen Details. 
Und die Spalte ist in der Höhe ziemlich begrenzt. Das muss viel länger sein... 
-> Erledigt ✅ | MasterList zeigt bis zu 5 Tags (alle Wettkämpfe); Detail-Karte nutzt ParticipantCard; keine Höhenbeschränkung; 5 Unit-Tests in squadManagement78_79_80.test.ts

80. [improvement] Riegeneinteilung 
Beim klick auf den Pfeil zum entfernen eines Teilnehmers aus der Spalte "Riege Details" aktualisiert die UI nicht. erst nach dem manuellen aktualisieren sieht man welche teilnehmer wo drin sind. 
Es aktualisiert auch nicht diese Spalte, wenn Teilnehmer hinzugefügt werden... 
-> Erledigt ✅ | useSquadAssignment ruft onDataChange() nach Zuweisung/Entfernung auf; DetailPane-Key beinhaltet participants.length für erzwungenes Re-Render; 4 Unit-Tests in squadManagement78_79_80.test.ts

81. [Bug] Riegenliste PDF 
Auf der 1. Seite der RIegenliste wird der name der Riege nicht angezeigt. 
-> Erledigt ✅ | Formatierung einheitlich auf allen Seiten, 24 Unit-Tests hinzugefügt

82. [Refactoring] Wizard DB 
Der DB Wizard in der Configuration soll auch den WizardModal verwenden.  
-> Erledigt ✅ | UnifiedDialog durch WizardModal ersetzt, 3-phasiger Indikator (Datenbank → Daten importieren → Fertig) wird aus dem Step-Status abgeleitet

83. [Bug] in der Eingabe score-capture-v2 werden die Disziplinen nicht richtig gefiltert. 

---

## Zukunftsideen (noch nicht umgesetzt)

Z1. [Idee] Wettkampf-Auswahl in der Wertungserfassung
Aktueller Stand: Jede Person darf nur einem Wettkampf pro Veranstaltung zugeordnet werden (1:1-Regel, seit #113 im Backend durchgesetzt). Als Workaround für mehrere Wettkämpfe kann eine separate Veranstaltung angelegt werden.
Idee für die Zukunft: Falls mehrere Wettkämpfe pro Person doch benötigt werden, könnte in der Wertungserfassung ein Schritt "0 – Wettkampf auswählen" vor der Riegen-Auswahl eingebaut werden. Der Selector würde nur erscheinen, wenn die Veranstaltung mehr als einen Wettkampf hat, und würde Teilnehmer sowie Disziplinen auf den gewählten Wettkampf beschränken.
Betroffene Dateien: ScoreCapture/index.tsx, SquadDisciplineSelector.tsx, useScoreValidation.ts


83. [improvement] Events GymNet Import -> Wizard
	-> Erledigt ✅ | GymNet-Import als Wizard umgesetzt; mehrere XML-Dateien (Einzelwettkampf + Mannschaftswettkampf) können gleichzeitig/sequenziell importiert werden.

84. ✅ [Bug] Teilnehmer hinzufügen 
Auf der Seite http://localhost:3001/event-participants kann man Teilnehmer mit dem Wizard hinzufügen. In dem WIzard wird eine Liste der TEilnehmer angezeigt. An den Teilnehmern sind auch noch details. Das Jahr wird aber nicht angezeigt, sondern nur "Jahre". TDD
Fix: i18n keys `eventParticipants.card.years` in de.json and en.json were missing `{{count}}` placeholder ("Jahre" → "{{count}} Jahre"). Added TDD tests in useAddParticipantWizard.test.ts.

85. ✅ [Feature] Time Planning 
Auf der Seite http://localhost:3001/time-planning 
soll es eine möglichkeit geben den Zeitlichen Ablauf der Veranstaltung tabellarisch darzustellen. 
- Die Spaltenbeschriftung sind die Disziplinen 
- Die Zeilenbeschriftung die Zeiten 
- Die Startzeit ist aus dem Event ersichtlich 
- Jede weitere Zeit berechnet sich aus den Voreinstellungen (Anzahl der Teilnehmer * Übungsdauer pro Gerät)
- Der Schnittpunkt aus Zeit und Disziplin ist eine Riege. Diese Zellen sollen als DropDown dargestellt werden. 

Nun die Frage lässt sich die Zelle / Riegenzuordnung in der DB ohne Änderung der DB speichern? 
Umsetzen, Testen, Dokumentieren. 
Fix: Ja – `tfx_riegen_x_disziplinen` speichert die Matrix-Zuordnungen ohne Schema-Änderung: `int_runde`=Zeile, `int_disziplinenid`=Spalte, `var_riege`=Riegenname. Neuer „Zeitplan-Tabelle"-ViewMode in TimePlanning: ScheduleMatrixView-Komponente mit optimistischen Zell-Updates, +/- Zeilen-Steuerung. Server-Endpoints GET /time-planning/matrix und PUT /time-planning/matrix/cell. Pure Helpers `addMinutesToTime`/`calculateRoundTime` exportiert und mit 13 Unit-Tests abgedeckt (scheduleMatrix.test.ts).

86. Im Wizard Riegen einteilen im Schritt 2 werden die Wettkämpfe an den TEilnehmern angezeigt. Hier müssen auch noch die WEttkampfnummern in die Tabelle.
	-> Erledigt ✅ | Competition numbers shown as "Nr. X – Name" in table column and filter dropdown; allCompetitions sorted by number 

87. Im Wizard Riegen einteilen im Schritt 2
Hier lassen sich Teilnehmer hinzufügen. Aber Aber aus der Riege wieder entfernen geht nicht. Wie könnten wir das lösen, weil eigentlich gefällt mir die UI und das Konzept ganz gut.
	-> Erledigt ✅ | Im Edit-Modus werden aktuelle Riegenmitglieder in die Teilnehmerliste eingeblendet (oben sortiert, "In Riege"-Badge). Abwählen entfernt den Teilnehmer aus der Riege. 

88. In den Live-Wertungen werden die Wertungen mit 0,0 angezeigt. TDD mit UI Tests
-> Erledigt ✅ | Root cause: `save-value` jury results SQL in `scoresScoring.ts` used snake_case column aliases (`field_name`, `sort_order`, `is_final_score`, `is_starting_score`) instead of camelCase (`"fieldName"`, `"sortOrder"`, `"isFinalScore"`, `"isStartingScore"`). `buildFieldSymbolsMap` only reads camelCase properties, so field-name matching always failed. For lowercase formula variables (e.g. `x` in `1*x`) there is no fallback-by-order mechanism → `valuesMap = {}` → `calculateFormula("1*x", {})` replaces `x` with `0` → returns `0` (not null) → overrides the correct body score → socket emits `score: 0` → Live view shows "0,0". Fix: Changed SQL aliases to camelCase (matching `juryResultsScoring.ts`). Added safety net: if formula recalculation yields `0` but body score is clearly non-zero, trust body score. TDD: 12 unit tests in `shared/src/__tests__/liveScoreCalculation.test.ts` (1 RED → 12 GREEN). Files: `server/src/routes/scoresScoring.ts`, `shared/src/__tests__/liveScoreCalculation.test.ts`.

89. Die Wertungen die eingegeben werden, werden nicht im alten Turnfix angezeigt 
	-> Erledigt ✅ | Scores werden korrekt in tfx_wertungen / tfx_wertungen_details geschrieben, welche auch das alte Qt-TurnFix liest. 

90. Die Wertungen werden in den Ergebnissen nicht angezeigt. Es gibt wohl irgendwie einen Filter der in der URL bei den Ergebnissen gesetzt sein kann. Dann werden nicht alle Wertungen angezeigt. Das darf nicht sein... 
TDD 
-> Erledigt ✅ | Ursache: `squadName` aus URL wurde als `WHERE var_riege = ?` an Scores-API übergeben → Wertungen other Riegen gefiltert. Fix: `squadName` wird in `useResultsData` nicht mehr an die Scores-API weitergegeben. TDD: 1 neuer Vitest-Test (RED→GREEN).

91. Im Jury-Portal beim Speichern der Wertung kommt die Meldung Fehler, Wertung wurde nicht angelegt. 

92. im Wettkampf status 
Wird keine prozent Zahl bei den Geräten angezeigt. 
TDD mit UI Tests
-> Erledigt ✅ | Root cause: disciplines_detail used tfx_riegen_x_disziplinen squad-entries (always 0 without "Generate") as denominator. Fix: new per-discipline SQL query counts distinct participants with score entries per discipline; server returns totalParticipants/completedParticipants/percentage; client uses server-provided percentage directly. New: server/src/utils/competitionStatusUtils.ts (13 unit tests), e2e tests in competition-status-percentage.spec.ts.

93. [Improvement] Layout designer 
- Größer, damit man das Urkundendesign besser ändern kann. ggf. über zoom? 
-> Erledigt ✅
- Ist es möglich ein PDF in Hintergrund zu laden (so wie auch die PNGs halt zusätzlich)? 

Ja, das ist technisch machbar. Hier die Analyse:

Aktueller Stand
Designer-Canvas: reines HTML/CSS mit <img>-Tags
PDF-Export: jsPDF mit addImage() für Rasterbilder
Keine PDF-Rendering-Bibliothek installiert (nur jsPDF für Erstellung, nicht Anzeige)
Wie es funktionieren würde
Mit pdfjs-dist (Mozilla pdf.js):

Im Designer (Bearbeitungsansicht): PDF-Seite via pdf.js auf ein <canvas> rendern → als Hintergrundbild anzeigen
Beim PDF-Export: PDF-Seite auf Canvas rendern → Canvas zu PNG-DataURL konvertieren → doc.addImage() aufrufen
Der PDF-Hintergrund wird dabei als Rasterbild gerendert, hat damit keine Transparenz — genau wie du beschrieben hast. Das wäre kein Problem, da Background-Elemente ohnhin immer unten liegen.

Einschränkungen
Immer nur eine Seite des PDFs darstellbar (normalerweise Seite 1)
Die PDF-Qualität im Export hängt von der Render-Auflösung ab (DPI konfigurierbar)
pdfjs-dist ist eine relativ große Abhängigkeit (~2MB)
Aufwand
Mittel — ca. 3–4 Stunden Implementierung:

pdfjs-dist installieren
Upload-Filter (accept) um .pdf erweitern
Im LayoutDesigner: PDF-Elemente via Canvas rendern
In useCertificates.ts: PDF-Seite vor dem Export in ein Bild konvertieren

94. [Bug] Die Buttons in der TrayApp "Server stoppen" "Server neustarten" funktionieren nicht.  
-> Erledigt ✅

95. Im PDF results steht keine Überschrift mit dem Wettkampf bezeichnung 
-> Erledigt ✅ addSectionTitle(doc, competitionName, 60) vor autoTable in exportSingleCompetitionPDF eingefügt; startY: 60 → 75

96. [Feature] Jury-Portal Sortieren der Teilnehmer ermöglichen ? 

97. [Bug] Wettkampf Status wird nicht angezeigt 
Auf der Seite Riegen Status steht immer 0% 
TDD mit UI Tests
-> Erledigt ✅

98. [Feature] Scrollen bei vielen Teilnehmer in der Siegerliste. Hier muss immer die Überschrift Zeile von dem Wettkampf fixiert werden. So wie es auch in Excel möglich ist eine Zeile zu fixieren. Nur soll es halt immer die vom aktuelle Wettkampf sein. 
TDD mit UI Tests

99. [Improvement] Jury-Portal: 
Beim Wechsel der Teilnehmer sollte der Focus direkt in das eingabefeld 
-> Erledigt ✅ | Focus is set on the score input field on participant switch for all 3 input modes: simple (useRef+useEffect with 50ms timeout), builtInFormula (new inputRef prop on BuiltInFormulaInput wired via ref), linkedFormula (FormulaInput already re-keyed per participant so it remounts; added autoFocus={index === 0} to the first field). Files: shared/src/components/BuiltInFormulaInput.tsx, jury-portal/src/components/JuryPortal/components/ScoringView.tsx, jury-portal/src/components/FormulaInput.tsx

100. Urkunden als PDF Drucken 
Reihenfolge sollte per default absteigend sein. Aber auch umschaltbar. 
-> Erledigt ✅

101. Gleiche Punktzahl muss gleiche Plazierung bedeuten! TDD
-> Erledigt ✅

102. [Bug] Geburtsdatum passt nicht. Der GymNet-Import funktioniert korrekt. Die Geburtsdaten werden bei den participants richtig angezeigt. Aber in den UIs der Veranstaltung (z.B. event-participants -> Teilnehmer bearbeiten) steht als Geburtsdatum immer 01.01. drin. TDD
-> Erledigt ✅ | Root cause: Server mapped `dat_geburtstag` → `birthYear` (year only) — day/month lost. `EditParticipantForm` constructed date as `YYYY-01-01`. Fix: New `participantBirthdayUtils.ts` with `formatBirthday()` (uses UTC methods for DATE columns); server now returns `birthday: YYYY-MM-DD` alongside `birthYear`; `EditParticipantForm` uses `participant.birthday` with year-only fallback. TDD: 10 server unit tests + 6 client component tests (RED→GREEN). `Participant` type updated with `birthday?: string`.

103. [improvement] in der results UI werden im Filter die Wettkämpfe im absteigend angezeigt. Aufsteigend wäre korrekt
	-> Erledigt ✅ | useResultsData.fetchCompetitions() sortiert Wettkämpfe jetzt numerisch aufsteigend nach number. 2 Unit-Tests ergänzt (useResultsData.test.ts).

104. [Bug] Riegen Status wird nicht angezeigt 
-> Erledigt ✅ | Root cause: useSquadDisciplineStatus-Hook (1) empfing squadDisciplineStatuses nie von useScoreData (squadStatus immer null), (2) rief falschen Endpoint apiPost('/squad-disciplines') statt PUT /:squadName/:disciplineId/status auf. Fix: Hook akzeptiert squadDisciplineStatuses als Prop + onSquadDisciplineStatusChange-Callback; index.tsx leitet Daten durch; fetch PUT für Save. TDD: 12 Unit-Tests in useSquadDisciplineStatus.test.ts.

105. [Feature] Es ist möglich Veranstaltungen über ein GymNet-XML zu importieren. Wir haben auch schon eine möglichkeit geschaffen Ergebnisse darzustellen und als CSV zu exportieren. Im GymNet kann jedoch nur eine XML importiert werden. Dieses Import XML hat das identische Format wie das Export XML. 
Dies soll implementiert werden. Zu beachten ist nun: der Export Button soll in der Ergebnisse UI sichtbar sein. Es sollen Funktionen möglichst wieder verwendet werden und wenn es noch keine gibt, dann sollen diese so geschrieben werden dass sie wiederverwendet werden können. Es müssen Tests geschrieben werden. -> Erledigt ✅ |

106. Im Jury-Portal gibt es jetzt ein Status, den man an der Person setzen kann. Das ist doch eigentlich eine technische Schuld und sollte ausgeblendet sein, oder?  -> Erledigt ✅ 

107. [Bug] nice to have: Im Jury-Portal kann man Wertungen eingeben und es wird ein "Berechnetes Ergebnis" angezeigt. bei der Eingabe wird mit Punkten gearbeitet und bei der Berechnung mit Kommas. Das sollte einheitlich mit Kommas sein. Genauso bei der Anzeige der Wertung in der Liste der Teilnehmer. -> Erledigt ✅ |

108. [Bug] DRINGEND
-> Erledigt ✅ | In der Veranstaltungsliste in der management UI http://localhost:5173/management werden irgendwie nicht alle Veranstaltungen angezeigt ich habe 93 Veranstaltungen in der DB, aber nur etwa 40 in der Liste. Zudem ist es nicht möglich hier nach einer Veranstaltung zu suchen. 
Natürlich mittels TDD fixen. 

109. [Bug] Dringend: Wertung Eingabefenster wird nicht angezeigt
-> Erledigt ✅ | In der UI http://localhost:5173/score-capture?eventId=1 wird ständig "Lädt" in dem Eingabefenster der Wertung angzeigt. 


---

## Technische Schuld

### TD-01: Hard-coded „Pause"-Erkennung per Name-Präfix

**Datei:** `client/src/pages/TimePlanning/components/ScheduleMatrixView.tsx` → `isDisciplineRemovable()`

**Problem:** Ob eine Disziplin eine Pausenspalte ist (und damit aus der Matrix entfernt werden darf), wird per Regex `/^pause/i` auf den Anzeigenamen geprüft. Das ist ein Workaround, weil `tfx_disziplinen` kein dediziertes Feld (z. B. `bol_pause`) besitzt.

**Risiko:** Benennt jemand eine echte Disziplin mit „Pause…" im Namen, erscheint ungewollt ein ×-Button.

**Saubere Lösung (sobald DB-Schema angepasst werden darf):**
1. Spalte `bol_pause BOOLEAN DEFAULT false` in `tfx_disziplinen` ergänzen
2. Prisma-Schema regenerieren (`npx prisma db pull`)
3. Alle bestehenden Pause-Disziplinen einmalig per Migration auf `bol_pause = true` setzen
4. API/Mapping: Feld `isPause: boolean` an den Client weitergeben
5. `isDisciplineRemovable` auf `col.isPause === true` umstellen
6. Regex-Check und TODO-Kommentar im Code entfernen
Auf der Seite Riegen Status steht immer "kein Status". Entweder wird der im Jury-Portal nicht gesetzt oder auf der Seite squad-status nicht richtig angezeigt. 
TDD mit UI Tests
-> Erledigt ✅ | Root cause: POST /api/squad-management/complete war ein Stub — hat DB nie aktualisiert. Fix: 3 Probleme behoben: (1) Endpoint implementiert: findet Status via findStatusByName() (case-insensitive + Wort-Matching) und schreibt in tfx_riegen_x_disziplinen; (2) authenticateToken entfernt — Jury-Portal sendet kein Auth-Token; (3) Status-Name-Tippfehler korrigiert: 'Leistung erfasst' → 'Leistungen erfasst' in useScoreSave.ts. Socket.IO-Event 'squad-status-updated' wird nach Update emittiert. Neues: server/src/utils/squadStatusUtils.ts (10 Unit-Tests), server/tests/unit/squadDisciplineComplete.test.ts, client/e2e/tests/squad-status-complete.spec.ts.

105. 
LK / KÜR: 
D + 10 - E - P = EW 
10 ist default, kein fixer wert,
auch nicht AW, AUsgangswert da das nur ein Teilausgang ist. 

P: 
10 + AW - E = EW 

106. [Bug] results UI 
Wenn hier ein Filter von Wettkämpfen gesetzt wird, werden Geräte ohne Wertung ausgeblendet. Das sollte nicht sein.
-> Erledigt ✅ | Root cause: `setDisciplines()` was called with `Array.from(disciplineSet)` which only contains disciplines that had at least one score entry. Fix: when `selectedCompetition` is active and `selectedCompetitionDisciplineInfoData` was populated from `GET /competitions/{id}/disciplines`, use those API disciplines instead — so ALL configured disciplines appear as columns regardless of whether scores exist yet. TDD: 2 new tests in `useResultsData.test.ts` (RED→GREEN): "Bug #106: competition filter shows disciplines without scores" and "Bug #106: no-filter mode uses per-competition API disciplines". File: `client/src/pages/Results/hooks/useResultsData.ts`.

107. [Bug] results view - Live Updates 
nach dem eingeben einer Wertung sollte das aktualisiert werden. 
-> Erledigt ✅ | Root cause: Results page socket effect was missing `socket.emit('join-competition', eventId)`. The server emits `score-updated` only to room `competition-{eventId}`, so without joining the room the client never received events. Fix: added `socket.emit('join-competition', eventId)` on effect start and `socket.emit('leave-competition', eventId)` in cleanup, matching the working pattern from Medallienspiegel.tsx. File: `client/src/pages/Results/index.tsx`.

108. [Improvement] automatisch Status Gedruckt setzen beim Export von PDF / Urkunden 

109. [Bug?] Bei gleicher Platzierung wegen gleichem Endwert gibt es ja jetzt den gleichen Platz. Der darauffolgende platz wir dann frei gelassen. Ist das so implementiert? TDD fall es behoben werden muss.
-> Erledigt ✅ | Bereits korrekt implementiert als Teil von #101. `assignRanks()` in `client/src/utils/rankingUtils.ts` verwendet 1-2-2-4 (olympisches) Ranking: gleiche Punktzahl → gleicher Platz, nächster Platz wird übersprungen. Beispiel: [100, 95, 95, 90] → [1, 2, 2, 4]. 8 Unit-Tests in `rankingUtils.test.ts` decken alle Fälle ab (2-Wege, 3-Wege, Mitte, alle gleich). 

110. Analyzer (Konzept)
Für die Veranstaltung muss ein Analyzer entstehen der auf verschiedene misskonfigurationen hinweisen soll: 
a. Wo wäre hier der richtige Platz? Prominent in der Management UI oder hinter einer Kachel versteckt? 
b. Wenn aktualisiert sich der Analyzer? 
c. Es müssen verschiedene Punkte geprüft werden: 
	- Sind bei jedem Teilnehmer die Startnummern vergeben 
	- Sind jedem Wettkampf min. 1 Disziplin zugeordnet 
	- Ist jeder Disziplin die max. Punktzahl zugeordnet 
	- ist jedem Teilnehmer 1 Wettkampf zugeordenet 
	- Ist der zugeordnete Wettkampf in der richtigen Altersklasse / geschlecht? 
	- Ist jedem Teilnehmer eine Riege zugeordnet 
	- Hat jeder Teilnehmer an jedem Gerät eine Wertung (alternativ markiert als "nimmt nicht Teil"), bzw. Status gesezt Wertung erfasst.. 
	- Riegenstatus-Verwaltung: ist die Kombination generiert? warum muss man das separat anstoßen? kann das nicht automtisch passieren? 
	- Ist der Status richtig gesetzt (geht das überhaupt), z.B. Wertung erfasst bei dem Teilnehmer, Gerät fertig bei der Riege
	- Gibt es mehrere gleich plazierte (das ist hilfreich für die Siegerehrung insbesondere bei den Plätzen 1-3, da hier oft Gold, Silber, Broze vergeben wird. Dann bräuchte man ja 2x die gleiche Medallie/Pokal). 
d. Beim klick auf den jeweiligen Punkt soll sich auch die entsprechende UI öffnen um das Problem zu beheben. 
-> Erledigt ✅ 

110i. Analyzer – Zeitplan in Veranstaltungs-Analyzer integrieren
-> Erledigt ✅ | Neue Kategorie `schedule` (Zeitplanung) im Analyzer. Neuer Check `schedule_missing_start_times`: Wettkämpfe ohne `tim_startzeit` (Severity info, Link `/time-planning`). Neue Kategorie in `AnalyzerCategory` type (Client + Server), `CATEGORY_ORDER` in `index.tsx`, i18n (de/en). Dateien: `server/src/routes/analyzer.ts`, `client/src/pages/Analyzer/Analyzer.types.ts`, `client/src/pages/Analyzer/index.tsx`.

122i. Analyzer – Zeitplan-Analyse (Zeiten & Riegen/Disziplin-Kombinationen)
-> Erledigt ✅ | Neuer Check `schedule_matrix_incomplete`: Vergleicht erwartete (Riegen × Disziplinen) vs. tatsächliche Einträge in `tfx_riegen_x_disziplinen`. Nur aktiv wenn Matrix bereits generiert wurde (sonst handled by `squad_combination_not_generated`). Severity warning, Link `/time-planning`. Details zeigen welche Riege/Disziplin-Kombination fehlt.

111. [Idee] Was passiert wenn einem Teilnehmer mehr wie 1 Wettkampf zugeordnet ist? Lässt sich das aktuell handeln? 
 Multi-Wettkampf-Teilnehmer vollständig unterstützt:

**Architektur**:
- DB: `tfx_wertungen` enthält einen Datensatz pro Teilnehmer × Wettkampf (kein UNIQUE-Constraint → mehrere Einträge möglich).
- API `GET /event-participants`: `DISTINCT ON (int_teilnehmerid)` liefert genau einen Datensatz pro Teilnehmer; eine Second-Query befüllt `assignedCompetitions: number[]` mit ALLEN Wettkampf-IDs dieses Teilnehmers.
- `update-details` Endpoint: Verwaltet Hinzufügen / Entfernen von Wettkampf-Zuordnungen über das Edit-Formular.

**event-participants Seite**:
- Wettkampf-Filter-Dropdown: Zeigt nur Teilnehmer des gewählten Wettkampfs (Client-seitiger Filter auf `assignedCompetitions`).
- "Wettkämpfe"-Spalte im Table: Zeigt jetzt die echten Wettkampf-Namen als Pills/Badges (statt nur "2 Wettkämpfe").
- Filter zurücksetzen leert auch den Wettkampf-Filter.

**Results Seite**:
- `flatMap` über `participant.assignedCompetitions` erstellt pro Wettkampf-Zuordnung einen Ranking-Eintrag → Teilnehmer erscheint in JEDER seiner Wettkampf-Gruppen.
- Scores werden über `participantId:competitionId`-Key referenziert → keine Score-Vermischung zwischen Wettkämpfen möglich.

**Tests**: 21 Unit-Tests in `client/src/test/pages/multiCompetitionParticipant.test.ts`, 9 E2E-Tests in `client/e2e/tests/multi-competition-participant.spec.ts`.

112. event-participants Filter muss im Wettkampf erweitert werden.
-> Erledigt ✅ | Wettkampf-Filter hinzugefügt (siehe #111). Dropdown erscheint automatisch sobald eine Veranstaltung ≥ 2 Wettkämpfe hat.

113. in der URL gibt es immer noch squadName 
http://localhost:3001/event-participants?eventId=289&squadName=aaa
Generell sollte gelten: Das ist ja ein Filter über die URL. Dies benötigen wir eigentlich ja nur bei der EventId. Wenn es anders möglich ist den Filter von von der Management UI in die einzelnen UIs zu übergeben wäre das denke ich besser. 
Generell sollte beim "Alle Filter zurücksetzen" in einer der Event Spezifischen UIs nur noch der Event Filter aktiv sein! 
-> Erledigt ✅ | ManagementCenter baut URLs jetzt nur noch mit `?eventId=...` (kein `competitionId` / `squadName` mehr). EventContext (localStorage) überträgt competition/squad/discipline zur Zielseite. `urlSquadName` aus ScoreCapture und Results entfernt, `_squadName`-Parameter aus `useResultsData` entfernt. 1368/1368 Tests grün.

114. ManagementCenter.tsx refactoring 
die Datei ist ziemlich groß und könnte ein refactoring vertragen? 
-> Erledigt ✅

115. Im alten c++ code konnte man für jeden Teilnehmer einen Status vergeben (nicht nur für die Riege). 
Wie könnte das jetzt im neuen code aussehen? In der Management UI unter Wettkampftag ein neuer Bereich "Teilnehmer Status"? 
Kann man beide Statuse in der DB separat handeln? 
Dann könnte man ggf. bei der eingabe der Wertung den Status aktualisieren auf "Wertung erfasst" und das auch anzeigen (im Jury-Portal & score-Capture). Und auch editierbar machen, sodass wenn man keine wertung eingibt den Status manuell ändern kann (z.B. "keine Wertung verfügbar"). 
Und dann den Riegenstatus aktualisieren auf "Fertig erfasst" wenn alle auf "Wertung erfasst" oder "keine Wertung verfügbar" stehen? 
Zur Umsetzung: 
- TDD, 
- möglist wenig abhängikeiten im Code zu der DB, ggf. nur ein einer stelle
- Dokumentation 
-> Erledigt ✅
Design-Entscheidungen:
- DB trennt Teilnehmer-Status (tfx_wertungen.int_statusid) und Riegenstatus (tfx_riegen_x_disziplinen.int_statusid) bereits — kein Schema-Change nötig
- Status-IDs werden zur Laufzeit per Name aus tfx_status gelesen (via findStatusByName + normalizeStatusName aus squadStatusUtils), nie hardcoded
- Kein neuer Status in der DB — "Leistungen erfasst" (id=2) = "Wertung erfasst"; "Keine Wertung verfügbar" wird als neuer Status über die Status-Verwaltungs-UI angelegt
- Alle DB-Zugriffe gebündelt in server/src/utils/participantStatusService.ts (Single Responsibility)
- participantStatusService ist vollständig pure / testbar: DB-Adapter per Dependency Injection injizierbar
- ~~Auto-Propagation nach Wertungserfassung~~ → ENTFERNT: tfx_wertungen.int_statusid ist 1× pro Teilnehmer × Wettkampf (nicht je Gerät), daher kann nach einem einzelnen Gerät nicht automatisch "Wertung erfasst" gesetzt werden.
- Kein Automatismus für Teilnehmer-Status: Status wird ausschließlich manuell über die Teilnehmer-Status-Verwaltungsseite gesetzt.
- Status wird NICHT in der Wertungserfassung (Score Capture / Jury-Portal) angezeigt oder bearbeitet.
- onScoreSaved() bleibt im Service als utility, wird aber nicht mehr vom save-value Handler aufgerufen.
Neue Dateien:
- server/src/utils/participantStatusService.ts — Service (pure functions + DB adapter)
- server/tests/unit/participantStatus.test.ts — TDD Unit Tests (kein DB-Zugriff)
- server/src/routes/participant-status.ts — REST API (GET alle, PATCH manuell)
- client/src/pages/ParticipantStatusManagement.tsx — Neue UI-Seite (erreichbar über ManagementCenter → Wettkampftag → Teilnehmer Status)

116. Im Medallienspiegel muss die Rangfolge anders berechnet werden: 
Beim Gerätturnen (national und international) ist es üblich, nach Anzahl der Goldmedaillen zu rangieren, mit Silber und Bronze als Tiebreaker. Also:

    Mehr Gold = besser.
    Bei Gleichstand Gold → mehr Silber entscheidet.
    Bei weiterem Gleichstand → mehr Bronze.
    Bleibt Gleichstand → gleiche Platzierung (z. B. geteilte Platzierung).
-> Erledigt ✅

117. Modale dialoge 
Wir haben einige Modale dialoge mit vielen Einstellmöglichkeiten. Manche könnten doch sinnvollerweise in Wizards umgewandelt werden, oder? VIelleicht erstellen wir mal eine übersicht über alle modalen dialoge und deren anzahl an einstellmöglichkeiten / komplexität. Und machen dann in myown ein Abschnitt wann man ein wizard verwendet und wann ein modaler dialog reicht. 
-> Erledigt ✅

118. UI-Tests 
Root Cause: The production database has different discipline IDs than the gymnet preset scheme expects. Specifically, preset IDs 7–10 were occupied by male disciplines (Pauschenpferd, Reck, Ringe, Sprung) instead of the expected female disciplines (Sprung w, Stufenbarren, Schwebebalken, Boden w). When linkDisciplines looked up ID 7 and found "Pauschenpferd" (male-only), it failed the gender check for a female-only competition and skipped the discipline — resulting in only 2 of 4 disciplines being linked.

Fix (in gymnetDbImport.ts): Added a name-based fallback. After querying the discipline at the preset ID, if the found discipline name doesn't match the expected canonical name (from wedDisNrToName), it tries a name lookup in the DB instead. If that succeeds (e.g. finding "Sprung w" at its actual production DB ID), the correct ID is used for linking. This is safe and non-destructive — no existing DB records are modified.

-> vielleicht wäre für den Test auch hilfreich, immer mit einer neuen DB anzufangen und immer erst denn DB-Wizard drüber laufen zu lassen. Dann gibt es keine Probleme mit den IDs beim import. 

119. UI Zeitplanung "time-planning"
Das Register Zeitplan-Tabelle sieht schon ganz gut aus. a.) Stelle ich aber in der 1. Zeile die Riegen ein, werden diese nicht persistent gepeichert. 
b.) Es muss möglich sein die Spalten zu verschieben, oder die Geräte/Disziplinen in der Überschrift zu ändern. Denke verschieben ist besser, da dann nicht die Geräte gewechselt werden müssen. Oder gibt es eine andere gute UI funktion um das umzusetzen?  
-> Erledigt ✅

120. Jury-Portal - Auswahl Riege & Gerät optimieren
Im Jury-Portal werden aktuell immer das Event, die Riege und dann das Geräte ausgewählt. 
An welchem gerät die Kampfrichter sitzen, wissen sie ja eigentlich. Aber welche Riege jetzt dran ist, ist nicht immer klar. 
Daher wäre es doch schön, wenn die Riegen die aufgrund der aktuellen Zeit dran sind farbig hinterlegt sind. 
Und dann noch ersichtlich ist, welches denn jetzt das Gerät ist, an dem die Riege sein sollte, oder? 
Die Info müsste man ja aus der Zeitplantabelle von der Zeitplanung bekommen. 
-> Erledigt ✅

121. Disziplinen "Pause" hinzufügen 
manchmal müssen Riegen eine Pause machen, bevor sie ans nächste Gerät können. Dafür bedarf es als "WorkAround" eine Diszplin die mit Pause benannt ist. 
Solche Pausen-Disziplinen (5 Stück) müssen über den DB-Wizard angelegt werden. Als Build in Formel wird diesen eine 0 hinterlegt. Ein Pause Icon wäre auch ganz schön. Kürzel PAU1 - PAU5. Name und Anzeigename "Pause1"- "Pause5" Als Sportart wäre dann noch "Pause" hinzuzufügen und die Pausen Disziplinen diesen zuzuweisen. 
-> Erledigt ✅

122. Zeitplanung 
a.) Drucken der Zeitplan-Tabelle muss noch implementiert werden. 
-> Erledigt ✅
b.) Durchgänge hinzufügen geht nicht in der Zeitplan Tabelle. Dann sollte es da ausgeblendet sein, oder? 
-> Erledigt ✅
c.) in der Zeitplan-Tabelle sollten auch die Durchgänge visualisiert werden. 
-> Erledigt ✅
d.) eine Riege kann zu einer Zeit nur an einem Gerät sein. Wird über das drop down eine "vorhandene" Riege ausgewählt, muss diese vorhandene als "-Keine Riege-" gesetzt werden. 
-> Erledigt ✅
e.) Wizard für die Zeitplanung: 1. Startzeit der Veranstaltung einstellen (default 08:00 Uhr) 2. Zeit pro Teilnehmer einstellen (default 3min) 3. Zuweisen der Wettkämpfe zu Durchgängen (ggf. hinzufügen von Durchgängen) 4. Zuweisen der Riegen zu Bahnen. 
Immer auch eine Beschreibung dazu mitliefern (Durchgang z.B. vormittag, nachmittag; Bahn z.B. Boden 1, Boden 2) ggf. hinzufügen von Bahnen 5. Generieren eines Vorschlags im Round Robin prinzip, und auch Update der Rotation Tabelle & Zeitplan Tabelle 6. Anpassen der Zeitplan Tabelle
Tests 
-> Erledigt ✅
f.) überlüssige UIs können entfernt werden. (Gantt, Zeitstrahl) 
-> Erledigt ✅
g.) Auf der Seite "Durchgänge" werden für jede Riege die Zeiten berechnet. Diese berechnung muss auch für die Zeitplan-Tabelle verfügbar sein. Die Zeitslots je Runde sollen anhand diesen Berechnungen angezeigt werden. 
-> Erledigt ✅
h.) Time-planning index.tsx refactoring 
-> Erledigt ✅
i.) Veranstaltungs-Analyzer um Zeitplan verfollständigen: Sind Zeiten eingestellt am Wettkamp, sind allen Riegen / Disziplin kombination eingestellt. 

123. Modale dialoge umbauen zu Wizard 
a.) Standard button zum Aufruf des Wizards in der Kopfzeile ggf. zusätzlich zum Standardbutton "Hinzufügen" 
b.) Standard button zum Aufruf des Wizards an Elementen (z.B. Riegen in der Riegeneinteilung, GymNet XML Importieren (Assistent), Wettkampf-Assistent,) soll immer an der gleichen Postition sein (neben dem Hinzufügen Button z.B. +Wettkampf erstellen), und soll immer das gleiche Icon davor haben. 
c.) TDD! 
| Create/Edit Discipline | DisciplineFormModal | HIGH (15+ fields) | UnifiedDialog |
| Create/Edit Competition | CompetitionFormModalNew | HIGH (15+ fields) | UnifiedDialog |
| Import GymNet XML | EventImportModal | HIGH (file + progress) | UnifiedDialog |

124. Altersüberprüfung bei Wettkämpfen
Bei Wettkämpfen wird aktuell genau der Geburtstag zur Altersüberprüfung herangezogen. In der Praxis wird es jedoch anders umgesetzt. Und zwar nur das Geburtsjahr. 
Die genaue Altersprüfung soll im Code erhalten bleiben. Die mit dem reinen Jahr soll als default hinterlegt sein und auch eine Checkbox im Wettkampf hinzugefügt werden, die jedoch ausgegraut ist, da es hierfür kein DB feld gibt. 
Ist das verständlich? 
Auch tests und Docu 
-> Erledigt ✅

125. Eingabe der Wertungen Score-Capture
-> UI Konzept für die Eingabe von Wertungen
Ob eine Wertung für eine Build In Formel oder ein DB-Feld eingegeben wird, soll egal sein. Für beide Fälle wird eine einheitliche UI verwendet. Sowohl für die Anzeige der Formel, als auch für die Eingabe der Werte. Die Eingabe/Anzeige der Wertung soll jetzt etwas schöner werden da sie aktuell viel Platz benötigt (zumindest bei DB-Formeln). 
1. Wird zuerst eine Riege, dann das Gerät und dann eine Person ausgewählt, wird ein Modales Fenster geöffnet bei dem die einzelnen Felder eingegeben werden (gleiche UI wie im Jury-Portal). 
2. Der Endwert wird bei DB-Formeln nicht berechnet (bei der DB-Formel)
3. der Doppelte Rahmen bei der DB-Formel ist unpraktisch -> Erledigt ✅
4. Die Geräte-Formel soll am Gerät angezeigt werden (vlg. results UI), nicht im Header. 

-> Umsetzen in komplett neuer UI mit Tests
-> Konsequente Trennung von Einabe UI und Result view

Ok. 
Wir haben mit dem Punkt 125 schon ein Konzept für die Wertungserfassung gemacht. Jetzt folgendes: 
Es soll eine Komplett neue Seite gebaut werden (die Alte bleibt!) sodass sich die Person im Wettkampfbüro aussuchen kann welche Seite verwendet wird (unter dem Expander Wettkapftag). 
Diese Seite soll den einheitlichen Header verwenden (ein Filter ist nicht notwendig). Darunter soll die Riegen & Disziplinauswahl angezeigt werden (Wie in der View "score-capture"). Darunter soll die Wertungserfassung angezeigt werden Visuell soll es genauso aussehen wie im Jury-Portal die Eingabe der Wertungen (Links die Liste, rechts die ausgewählte Person mit den Eingabefeldern). Dazu muss ja nicht neu erfunden werden, sondern nur "wiederverwenden" 
Zusätzlich: 
- Alles was wiederverwente (öfter verwendet) wird, soll in separate Klassen/Dateien ausgelagert werden. Sodass kein Code doppelt ist. 
- An der Eingabe der Person soll zusätzlich noch der "Status" der Person angezeigt werden. Dieser soll auf "Wertung erfasst" gesetzt werden, sobald der Button "Wertung speichern" gedrückt wird. 
- Der Status soll dann auch auf der Seite "participant-status" visualisiert werden. 
Wichtig sind auch Tests. 
Sind noch Fragen offen? 
-> Erledigt ✅

126. Race conditions werden mit pg_advisory_xact_lock
zu vermeiden. Wird das dann auch dem User als sinnvolle Fehlermeldung ausgegeben? 

127. Refactoring competitionstatusmanagement.tsx und squadstatusmanagement.tsx: 
lassen sich hier einheitliche UIs bauen sodass man auch unified sachen auslager kann? 
-> Erledigt ✅

128. Personen Status soll bei den Veranstaltungsteilnehmern editierbar sein, wenn man auf den Stift geht um eine person zu editieren. 
-> Erledigt ✅

129. Auf der Seite "participant-status" wir kein Status angezeigt. 
-> Erledigt ✅

130. Einheitliches UI-Element für den Status. 
Es gibt verschiedene UI-Elemente um den Status zu visualisieren. Das muss vereinheitlicht werden und als unified oder common oder so ausgelagert, sodass es wiederverwendbar / testbar / einheitlich ist. 
squad-status -> die hinterlegte Farbe ist gut, aber das X beim Editieren gefällt mir nicht 
participant-status 
event-participants edit dialog 
score-capture -> hier steht nochmal der aktuelle Status unter dem Drop-Down. Das ist überflüssig. 
-> Erledigt ✅

131. [Bug] build pipeline: bei der auswahl skip download 
╔════════════════════════════════════════════════════════════╗
║          TurnFix Installer Build Script                    ║
╚════════════════════════════════════════════════════════════╝

✓ Inno Setup gefunden: C:\Program Files (x86)\Inno Setup 6\ISCC.exe
s): Response status code does not indicate success: 404 (Not Found).
Invoke-WebRequest: C:\Users\Dominik Prudlo\Documents\GitHub\turnfix\setup\installer\build-installer.ps1:105:9
Line |
 105 |          Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicPa …
     |          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     | File not found
-> Erledigt ✅

132. im Veranstaltungs-Analyzer muss nach dem Event alle Teilnehmer den Status "Leistung erfasst" oder Nimmt nicht teil haben. 
-> Erledigt ✅

133. Der Status Badge der Teilnehmer ist ja gar nicht Gerätespezifisch. Daher ist es quatsch diesen im Jury-Portal bei der Wertungseingabe anzuzeigen. 
Das muss ausgeblendet werden und als technische Schuld gekennzeichnet, falls mal die DB erweitert wird. 
-> Erledigt ✅

134. [Feature] PDF Export vereinheitlichen
a.) Reihenfolge der Spalten muss einheitlich sein (so wie bei "event-participants")
b.) Button zum PDF Generieren muss überall identisch benannt sein und ggf. auch ein einheitliches Icon haben 
c.) Seitenformat sollte eher im Querformat sein (bevor man Zeilenumbrüche erhält) 
d.) Spaltenbezeichnung muss einheitlich sein (mal steht alter, mal Geburtsdatum drin -> so wie bei "event-participants") 

135. [Refactoring] AddParticipantModal.tsx 
In dieser Datei ist ziemlich viel Code, der auch in der Klasse AddParticipantModal drin sein sollte weil mit beiden UIs eine Person zur DB hinzugefügt werden kann. Hier sollten wahrscheinlich utils verwenden, was wir ja bisher so gemacht haben... 

136. [Feature] Beim Import auswählbar zu machen ob man Einzelwerte eingeben möchte. Pragmatisch und workflow-freundlich:
Im Import-Wizard einen zusätzlichen Schritt „Wertungsmodus“ einbauen.
Default per Auto-Mapping setzen (z. B. aus GymNet-Disziplin + vorhandenem Profil).
Admin kann vor Abschluss überschreiben: Endwert oder Formelprofil.
Ergebnis im Import-Review pro Disziplin sichtbar machen.
Nach Import weiter editierbar in Disziplin-/Event-Konfiguration.

Im Import-Wizard einen zusätzlichen Schritt „Wertungsmodus“ einbauen.
Default per Auto-Mapping setzen (z. B. aus GymNet-Disziplin + vorhandenem Profil).
Admin kann vor Abschluss überschreiben: Endwert oder Formelprofil.
Ergebnis im Import-Review pro Disziplin sichtbar machen.
Nach Import weiter editierbar in Disziplin-/Event-Konfiguration.
-> Erledigt ✅

🚀 In Arbeit (unvollständig)
#	Titel
72	PDF Export – Wettkampfnummer bei Teilnehmer- & Riegenlistenexport (Tests fehlen)
78	Riegeneinteilung Filter – Zugewiesen/Nicht-zugewiesen, Jahrgang, Namensfilter-Position (Tests fehlen)
79	Riegeneinteilung UI – Alle Wettkämpfe in Riegenspalte, Details-Karte, Höhe der Spalte (Tests fehlen)
80	Riegeneinteilung – UI aktualisiert nicht nach Entfernen/Hinzufügen von Teilnehmern (Tests fehlen)
125	Score-Capture – Komplette neue UI (vereinheitlicht, modal, inline-editing)
❌ Offen (kein Status)
#	Titel	Priorität
4	PDF Siegerliste – Formel in der Überschrift anzeigen	mittel
45c	Riegeneinteilung – Ausgeglichene Riegengrößen	niedrig
66	Dokumentation – Anwender-/Entwicklerdoku mit einheitlichem Design, inkl. Playwright-Screenshots	mittel
67	Feature: Teilnehmer direkt in Veranstaltung hinzufügen (& in Athletes anlegen)	mittel
70	Bug: Dialog beim Löschen von Teilnehmern nicht lokalisiert	niedrig
73	Riegeneinteilung Konzept – Analyse Geräteanzahl/Durchgänge/Zusammenführung kleiner Wettkämpfe	niedrig
74	Bug: Filter – aktiver Filter muss sichtbar sein; Ausblenden = Zurücksetzen	mittel
75	Bug: Stufenbarren-Icon fehlt im DB-Wizard (soll "Barren"-Icon erhalten)	niedrig
93	Layout-Designer – Zoom, PDF als Hintergrund laden	niedrig
96	Feature: Jury-Portal – Teilnehmer sortieren	niedrig
98	Feature: Siegerliste – Überschrift fixieren bei vielen Teilnehmern	niedrig
103	Improvement: Results-Filter – Wettkämpfe aufsteigend sortieren	niedrig
108	Improvement: Status "Gedruckt" automatisch setzen beim PDF-Export	niedrig
123	Modale Dialoge → Wizard (Disziplin, Wettkampf, GymNet-Import)	niedrig
TD-01	Technische Schuld: "Pause"-Erkennung per Name-Regex in ScheduleMatrixView.tsx	niedrig


TD-02 TD-Import-Scoring-Kopplung (hoch) 
Beschreibung: Import legt Disziplinen an, aber der Wertungsmodus ist nicht als erster Klassenbürger im Importprozess modelliert.
Risiko: Nacharbeit nach Import, inkonsistente Defaults je Seite.
Fundstellen: index.tsx:4, index.tsx:449, Configuration.tsx:1089
-> Erledigt ✅

TD-03 TD-Formellogik mehrfach implementiert (hoch)
Beschreibung: Formel-/Endwert-Logik ist auf Disziplinverwaltung, ScoreCapture, ScoreCaptureV2 und GroupTeamScoring verteilt.
Risiko: unterschiedliche Ergebnisse je Erfassungsweg.
Fundstellen: DisciplinesUnified.tsx:367, useFormulaCalculation.ts:62, ScoringPanel.tsx:175, TeamScoreCapture.tsx:300
-> Erledigt ✅

TD-04 TD-Uneinheitliche Persistenzpfade (mittel-hoch)
Beschreibung: Scores werden über mehrere Endpunkte/Flows gespeichert (value-save, field-save, group/team save).
Risiko: Validierung/Audit/Plausi verhalten sich nicht überall gleich.
Fundstellen: useScoreActions.ts:163, useScoreActions.ts:216, GroupScoreCapture.tsx:175, TeamScoreCapture.tsx:316

TD-05 TD-SoC-Verstoß in zentralen Seiten (mittel)
Beschreibung: Mehrere große Dateien > 600 Zeilen, teils UI + Workflow + API + Berechnung in einer Einheit.
Risiko: hoher Änderungsaufwand, Regressionen.
Fundstellen: Configuration, EventManagement, DisciplinesUnified, EventImportModal

TD-06 Offen bleibt noch ein angrenzender Punkt: die Auflösung von int_formelid per API-Fetch ist weiterhin an mehreren Stellen separat vorhanden. Die reine Berechnungslogik ist jetzt zentralisiert, die Formel-Resolver-Logik noch nicht vollständig. Wenn du willst, ziehe ich das als nächsten Schritt auch noch in eine gemeinsame Hook/Utility zusammen.
------------------------------------------------------------
-> Erledigt ✅
-> In Arbeit 🚀
-> obsolete 