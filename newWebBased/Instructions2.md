
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
c.) Ein Start in Zeile wäre gut. Dann hat man nicht so viel Ausschuss. 

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
Ich habe gedacht die sample data werden jetzt auch mit einem JSON importiert. Aber jetzt sehe ich, dass diese im SampleDataImport.ts drin stehen. Das muss geänderte werden. 

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
Sollte auch direkt in der Veranstaltung funktionieren und dann bei den Athletes angelegt werden 

68. [Feature] Beim Hinzufügen von Teilnehmern in einer Veranstaltung sollten die Startnummern vergeben werden 
	-> Erledigt ✅

69. [Bug] Beim Automatischen generieren von Riegen ist die Eingabe der Zahlen (Teilnehmer, Vorschläge, Pausen-Riegen) nicht gut. Man kann die komplette Eingabe in dem Feld nicht löschen. Wenn das nicht valide ist sollte ein roter Rahmen drum rum... 
	-> Erledigt ✅ | String-basierte Eingabe, roter Rahmen + Fehlermeldung bei ungültigem Wert, Generieren-Button deaktiviert bis alle Felder valide

70. [Bug] Löschen von Teilnhemern erscheint ein nicht lokalisierter Dialog 

71. [Bug] Hinzufügen von Teilnehmern ist der Modale Dialog nicht lokalisiert 
	-> Erledigt ✅ 

72. [Feature] Beim PDF Export müssen noch ein paar informationen mit dran. 
Teilnehmerexport: Wettkampfnummer 
Riegenliste: Wettkampf zusätzlich an die Teilnehmer 
-> In Arbeit 🚀 | Tests fehlen

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

75. [Bug] Beim dem DB-Wizard werden geräte angelegt. U.a. auch Stufenbarren in verschiedenen konstellationen (mit P, LK usw.). Hier fehlt noch das Icon. Es soll das Icon "Barren" bekommen. 

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
-> In Arbeit 🚀 | Tests fehlen

79. [improvement] Riegeneinteilung UI 
In der Spalte Riegen stehen nicht alle Wettkämpfe dran sondern nur 2 stück 
Bei den Riegen Details steht bei den Teilnehmern fast keine Info dabei. Hier muss die gleiche Karte wie in der Spalte "Teilnehmer" angezeigt werden, mit den ganzen Details. 
Und die Spalte ist in der Höhe ziemlich begrenzt. Das muss viel länger sein... 
-> In Arbeit 🚀 | Tests fehlen

80. [improvement] Riegeneinteilung 
Beim klick auf den Pfeil zum entfernen eines Teilnehmers aus der Spalte "Riege Details" aktualisiert die UI nicht. erst nach dem manuellen aktualisieren sieht man welche teilnehmer wo drin sind. 
Es aktualisiert auch nicht diese Spalte, wenn Teilnehmer hinzugefügt werden... 
-> In Arbeit 🚀 | Tests fehlen 

81. [Bug] Riegenliste PDF 
Auf der 1. Seite der RIegenliste wird der name der Riege nicht angezeigt. 
-> Erledigt ✅ | Formatierung einheitlich auf allen Seiten, 24 Unit-Tests hinzugefügt

82. [Refactoring] Wizard DB 
Der DB Wizard in der Configuration soll auch den WizardModal verwenden.  
-> Erledigt ✅ | UnifiedDialog durch WizardModal ersetzt, 3-phasiger Indikator (Datenbank → Daten importieren → Fertig) wird aus dem Step-Status abgeleitet

83. [improvement] Events GymNet Import -> Wizard
http://localhost:3001/events 
Der Dialog "Aus Gymnet Importieren" muss auch als Wizard ausgeführt werden. 
Wichtig ist noch, dass wir mehrere GymNet XML-Dateien gleichzeitig (oder in separaten Dialogen) auswählen können müssen, da Einzelwettkämpfe und Mannschaftswettkämpfe in verschiedenen Dateien kommen (auch wenn diese gleich aufgebaut sind). 

84. ✅ [Bug] Teilnehmer hinzufügen 
Auf der Seite http://localhost:3001/event-participants kann man Teilnehmer mit dem Wizard hinzufügen. In dem WIzard wird eine Liste der TEilnehmer angezeigt. An den Teilnehmern sind auch noch details. Das Jahr wird aber nicht angezeigt, sondern nur "Jahre". TDD
Fix: i18n keys `eventParticipants.card.years` in de.json and en.json were missing `{{count}}` placeholder ("Jahre" → "{{count}} Jahre"). Added TDD tests in useAddParticipantWizard.test.ts.