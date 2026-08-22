

57. Lässt sich das Layout und PDF generieren mit tests abdecken? Dass bei einem Layout alle möglichen Felder hinzugefügt werden und dann gespeichert, danach eine Urkunde mit dem Layout generiert und geprüft ob auch alle Felder vorhanden sind? Ggf. über Auswertung der Debug log files oder des PDFs direkt? 
Zudem alle möglichen Einstellungen in dem Layout designer. 

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

73. [Feature] Beim Automatischen Riegen erzeugen gehe ich wie folgt vor: 
1. Analyse wie viele Geräte geturnt werden müssen (je Wettkampf). Manche haben 4-Kampf manche 6-Kampf, das beeinflusst natürlich die Wettkampfdauer und damit die angestrebte Riegengröße 
2. Analyse wie viele Teilnehmer insgesamt gemeldet sind und wie viele in den einzelnen Wettkämpfen sind 
3. Überlegung ob alles mit einem Durchgang gemacht wird / werden soll, oder mehrere Durchgänge (In einem Durchgang müssen alle Teilnehmer eines Wettkampfes sein, damit am Ende des Durchgangs für diesen Wettkampf Urkunden und Siegerlisten gedruckt werden können) 
4. Dann überlege ich wie groß die Riegen sein dürfen. Es kann dann sein, dass man bei zu kleinen Riegen Pausenriegen bekommt. 
5. Wettkämpfe mit wenig Teilnehmern werden dann ggf. zu den Wettkämpfen mit mehr Teilnehmern zusammengefasst (in Ähnlichen Altersklassen) 
6. Dann werden diese Wettkämpfe bzw. zusammengefassen Wettkämpfe in Riegen aufgeteilt. Um möglichst gleich große Riegen zu bekommen. 
7. Die Riegen werden dann so definiert, dass die Teilnehmer von einem Verein möglichst zusammen bleiben. 


91. Im Jury-Portal beim Speichern der Wertung kommt die Meldung Fehler, Wertung wurde nicht angelegt. Ich denke es ist sinnvoll hier die verbindung zum Server zu überwachen! 

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


96. [Feature] Jury-Portal Sortieren der Teilnehmer ermöglichen ? 

98. [Feature] Scrollen bei vielen Teilnehmer in der Siegerliste. Hier muss immer die Überschrift Zeile von dem Wettkampf fixiert werden. So wie es auch in Excel möglich ist eine Zeile zu fixieren. Nur soll es halt immer die vom aktuelle Wettkampf sein. 
TDD mit UI Tests

110. [Improvement] Layout designer 
Im Layout designer ist es nicht bei jedem Typ (datenbank, bild, ...) möglich, dies in der UI zu editieren/vergrößern/verkleinern. über das eingabefeld geht es. Ich glaube es ist beim Bild beim Vergrößern aufgefallen. Bitte für alle Typen prüfen und mittels Test sicherstellen, das es funktioniert. 

108. [Improvement] automatisch Status Gedruckt setzen beim Export von PDF / Urkunden 

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

118. UI-Tests 
Root Cause: The production database has different discipline IDs than the gymnet preset scheme expects. Specifically, preset IDs 7–10 were occupied by male disciplines (Pauschenpferd, Reck, Ringe, Sprung) instead of the expected female disciplines (Sprung w, Stufenbarren, Schwebebalken, Boden w). When linkDisciplines looked up ID 7 and found "Pauschenpferd" (male-only), it failed the gender check for a female-only competition and skipped the discipline — resulting in only 2 of 4 disciplines being linked.

Fix (in gymnetDbImport.ts): Added a name-based fallback. After querying the discipline at the preset ID, if the found discipline name doesn't match the expected canonical name (from wedDisNrToName), it tries a name lookup in the DB instead. If that succeeds (e.g. finding "Sprung w" at its actual production DB ID), the correct ID is used for linking. This is safe and non-destructive — no existing DB records are modified.

-> vielleicht wäre für den Test auch hilfreich, immer mit einer neuen DB anzufangen und immer erst denn DB-Wizard drüber laufen zu lassen. Dann gibt es keine Probleme mit den IDs beim import. 

123. Modale dialoge umbauen zu Wizard 
a.) Standard button zum Aufruf des Wizards in der Kopfzeile ggf. zusätzlich zum Standardbutton "Hinzufügen" 
b.) Standard button zum Aufruf des Wizards an Elementen (z.B. Riegen in der Riegeneinteilung, GymNet XML Importieren (Assistent), Wettkampf-Assistent,) soll immer an der gleichen Postition sein (neben dem Hinzufügen Button z.B. +Wettkampf erstellen), und soll immer das gleiche Icon davor haben. 
c.) TDD! 
| Create/Edit Discipline | DisciplineFormModal | HIGH (15+ fields) | UnifiedDialog |
| Create/Edit Competition | CompetitionFormModalNew | HIGH (15+ fields) | UnifiedDialog |
| Import GymNet XML | EventImportModal | HIGH (file + progress) | UnifiedDialog |

134. [Feature] PDF Export vereinheitlichen
a.) Reihenfolge der Spalten muss einheitlich sein (so wie bei "event-participants")
b.) Button zum PDF Generieren muss überall identisch benannt sein und ggf. auch ein einheitliches Icon haben 
c.) Seitenformat sollte eher im Querformat sein (bevor man Zeilenumbrüche erhält) 
d.) Spaltenbezeichnung muss einheitlich sein (mal steht alter, mal Geburtsdatum drin -> so wie bei "event-participants") 

135. [Refactoring] AddParticipantModal.tsx 
In dieser Datei ist ziemlich viel Code, der auch in der Klasse AddParticipantModal drin sein sollte weil mit beiden UIs eine Person zur DB hinzugefügt werden kann. Hier sollten wahrscheinlich utils verwenden, was wir ja bisher so gemacht haben... 


137. Beim Import der XML kommt es zu Fehlern: 
Warnungen
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (9-10Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (9-10Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (9-10Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (9-10Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (9-10Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (9-10Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (11-12Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (11-12Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (11-12Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf m (9-10Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (11-12Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (13-14Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (13-14Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (13-14Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (13-14Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (1-6Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (1-6Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (1-6Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf m (13-14Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (7-8Jahre)" (weiblich): Disziplin "Boden" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Boden", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (7-8Jahre)" (weiblich): Disziplin "Reck" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Reck", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 3-Kampf w (7-8Jahre)" (weiblich): Disziplin "Sprung" ist nur für männlich zugelassen — Zuweisung übersprungen
Disziplin="Sprung", erwartet nach wedDisNr: männlich
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf m (17-18Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis
[discipline] Wettkampf "Turn10 Basisstufe Gerät 4-Kampf m (7-8Jahre)": Keine Disziplinen in XML — manuelle Zuweisung erforderlich
Vorschläge: Boden Turn10® Basis, Balken/Bank Turn10® Basis, P-Barren Turn10® Basis, Minitrampolin Turn10® Basis, Reck/St-Barren Turn10® Basis, Sprung Turn10® Basis

Grund ist wahrscheinlich, dass keine Teilnehmer in diesen Wettkämpfen drin sind und daher auch keine Disziplinen hinzugefügt werden können. 
Die Meldung ist daher ok, sollte aber den Grund enthalten (wenn dieser ausfindig gemacht werden kann). 

138. [Bug] http://localhost:3001/events Beim Import kann kein Veranstaltungsort ausgewählt werden, erst beim nachträglichen editieren. TDD
-> Erledigt ✅

139. [Bug] Nach dem Import von dem 69. Schüler und Jugendturnfest sind oft 6 Geräte mit einem Wettkampf verknüpft, obwohl das im XML nicht so drin zu sein scheint. TDD -> Liegt an den Zuordnungsvorschlägen. Wird mit 140 gefixt. 

140. [Feature] Beim Import der XML wäre es doch gut, wenn man jeden Wettkampf einmal durch geht / anschaut und die Vorschläge für die Disziplinen anzeigt und dann korrigiert. Also ob die Disziplin passt und ob der Wettkampf passt. ggf. dann mit den auto-imports. Wie wäre sowas? Den Wizard gibt es ja bereits, da kann man sowas ja einfach erweitern. 

141. [Bug] Beim Wettkampf editieren "Gruppe setzen" wird zwar die Disziplin Gruppe selektiert, aber die anderen ggf. bereits selektierten Diszplinen nicht 
deselektiert. 

142. [Bug] Die TurnFix Tray app muss als admin ausgeführt werden, da man sonst keine Services starten / stoppen kann Das muss mittels dem Setup sicher gestellt werden. 
-> 🚀 In Arbeit 

144. Beim dem DB Wizard / Setup sollte bei den Disziplingruppen folgende mitkommen: Turn10 3-Kampf w, Turn10 3-Kampf m, Turn10 4-Kampf w, Turn10 4-Kampf m. 

145. [Feature] Mehrfachselektion von Wettkämpfen und editieren davon 

146. Doppelte Disziplinen und Barren als (w) 

147. auf der Seite competitions muss man immer links / rechts scrollen... Die 1. Spalte könnte man doch schmäler machen. 

148. Manche Riegenbezeichnungen nicht auf den Etiketten. 
-> Erledigt ✅

149. Etiketten default maße: 
oben / unten 8 
rechts / links 3 
höhe 15

152. [Feature] Es wäre gut, wenn ich den build mittels runpipeline.ps1 starte, und da dann ja auch die E2E tests ausgeführt werden, wenn davor auch die Dienste TurnFix und TurnFix Jury beendet werden. 

153. [Bug] Zeitplanung: 
a.) Beim Erstellen des Zeitplan über den Assistent gibt es im Schritt "Generieren" keinen Button um weiter zu drücken. TDD 
b.) Bei den Bahnzuordnungen (Rotation) scheint es so, dass einige Wettkämpfe fehlen 
c.) Bei den Rotationen Übersicht muss die Anzahl der Rotationen der Anzahl der Geräte entsprechen. Es werden aber immer nur 3 Rotationen angezeigt. 
d.) In der Zeitplan Tabelle muss je Bahn die Geräte dargestellt werden. 

155. [Feature] Zeitplanung: 
Bei dem Zeitplan sollte in der Zeitplantabelle keine Riege zum auswählen sein, wenn diese in einem anderen Durchgang ist. Beste Lösung wie ich finde: Für jeden Durchgang eine eigene Überschrift mit den Geräten die in dem Durchgang dran sind. Alle anderen gar nicht darstellen. 
🚀 In Arbeit 

156. [Bug] Die Live Wertungen tauchen immer 2x auf TDD.

157. [Feature] In den Live Wertungen wäre es gut wenn auch der Riegenstatus angezeigt wird. (An/Abschaltbar) TDD.

161. [bug] 
a.) Export des XML mit den Ergebnissen (http://192.168.1.51:3001/results?eventId=1) lässt sich nicht im GymNet importieren. TDD.
Das liegt wohl daran, dass in der GymNet xml viele Ids drin sind, die nicht ins TurnFix importiert werden. Daher können diese auch nicht exportiert werden. 
Wie wäre folgender Workflow: man muss zum Export der Ergebnisse die GymNet Xml vom Import öffnen. Dann wird eine Kopie davon erstellt als "Results" an der gleichen Stelle/Pfad. Dann können alle Ergebnisse direkt in diese Datei geschrieben werden, mit matching der Teilnehmer per name, vorname, verein, alter; matching der Disziplinen per name
Ist das machbar, oder fehlen noch infos zur Ausführung? 
🚀 In Arbeit
b.) Jetzt wäre es noch gut, wenn sich bei dem klick auf xml export ein Wizard öffnet mit den verschiedenen Schritten. Ein Einheitlichen Wizard klasse gibt es ja schon. Schritte könnte ich mir folgende vorstellen. Auswahl der GymNet xml, Auswahl des Ablageorts, Export und dann Ergebniss Anzeige ob alles gematcht hat. TDD 

164. [Feature] wenn man eine Seite öffnet (z.B. Wettkampfergebnisse) gibt es immer die Möglichkeit mit dem Button "Verwaltungszentrale" zurück in die Management UI zu springen. Dies ist aber häufig ein Umweg. Daher wäre es schön, wenn auf ALLEN UI-Seiten an der Linken Seite die Management UI Buttons der aktuellen Rubrik (Datenverwaltung, Veranstaltungsaufbau, Wettkampftag, Ergbenisse) zur Verfügung stehen. 

165. [Feature] Das Jury-Portal benötigt wie auch die Ergebnisansicht dieses "Live-Update"

166. [Feature] Auf der Veranstaltungsübersicht sollte es eine Statistik über die Anzahl der Teilnehmer geben, die Krank gemeldet sind. Zudem wie viele Teilnehmer in welchem Wettkampf waren. 

167. [Feature] in Layout Editor sind Verband, Land und Gau Hard coded. Das lässt sich eigentlich über den Verein ableiten: 
      useCertificates.ts 
	  case 9: return 'Turngau'
      case 10: return 'Turnerbund'
      case 11: return 'Deutschland'

168. [Refactoring] Die Schedule Matrix view.tsx ist ja recht groß. die könnte refactored werden genauso wie die timeplanning.ts

169. [Feature] Zeitplanung: wenn man bei der Zeitplanung eine Session mit vielen Wettkämpfen hat, ist es mühselig auf jedem wettkampf die Startzeit zu ändern. hier wäre ein Multiselect sehr schön. oder man ändert die Zeit auf der Sesstion für alle Wettkämpfe... 

170. [Feature] Zeitplanung: 
a) In der Zuordnung der Durchgänge & Bahnen sollte über den Bahnen immer die Summe aller Teilnehmer stehen. 
b) Die Riegen in den durchgängen sollten vielleicht mit am Wettkampf dargestellt werden. Vergleiche hierzu die UI von der Riegenverwaltung. Hier werden die Wettkämpfe an den Riegen dargestellt. 
c) die UI Durchgänge sollte auch so aufgebaut sein wie in der Riegeneinteilung mit verschiedenen Spalten. Vergleiche die Riegeneinteilung. Hier können bestimmt auch Utils übernommen werden. 

d) Die Zeitplanung soll einen eigenen Expander in der Management UI bekommen, wie "Veranstaltungsaufbau" und "Wettkampftag". Und zwar zwischen "Veranstaltungsaufbau" und "Wettkampftag". TDD. 
-> Erledigt ✅
e) in dem Expander Zeitplanung müssen dann die Punkte Durchgänge, Rotation, und Zeitplan-Tabelle, also das was jetzt alles in dem "Zeitplanung" in separaten UIs drin ist. TDD. (gerne erst mal copy paste, am Ende können wir das alte Widget und UIs entfernen)
-> Erledigt ✅

🚀 In Arbeit (unvollständig) 

171. [Bug] Zeitplanung: Werden Wettkämpfe von einer Bahn in eine andere verschoben, wechselt die UI immer in Durchgang 1
-> Erledigt ✅ Obsolete wegen 170 d.)

172. [Feature/Bug] Zeitplanung: In der Zeitplanung werden im Reiter Rotation Bahnen zugeordnet. Jetzt bedeutet das, dass eigentlich jede Bahn ein eigenes Gerät und ein eigene Kampfgerich hat. Somit muss in der Zeitplan Tabelle zu erst der Durchang auftauchen, das passt schon. Danach stehen die Geräte die in diesem Durchgang geturnt werden, das passt auch, aber Die Geräteauswahl muss für jede Bahn erfolgen können! 

173. [Bug] Zeitplanung: 
a) Wenn ich eine Bahn habe die Wettkämpfe mit 3 Geräten hat, dann gibt es unten in der Rotationsübersicht aktuell noch 4 Rotationen. Das stimmt nicht... Die Anzahl der Rotationen ist immer von der max. Anzahl der Geräte abhängig, die in der Bahn drin sind. 
b) Im Zeitplanung-Assistent wird im Schritt "Generieren" kein Button angezeigt mit dem man den Assistenten weiter schalten kann. 

174. [prüfen] Suchfeld: Bei sehr vielen Teilnehmern wird im Suchfeld oft kein Ergebnis angezeigt. Falls es da irgendein mechanismus gibt, der verhindert dass nach allen gesucht wird oder nach einer Zeit abgebrochen wird, sollte das geändert werden. Gerne darf das auch bisschen dauern, sollte dann halt visualisiert werden. 

175. [Feature] Riegeneinteilung: Für die Riegeneinteilung wird i.d.r. die Meldematrix heran gezogen. Nun sind das ja zwei verschiedene Ansichten / UIs. Folgende idee: Bei der Riegeneinteilung einen separaten Reiter machen (vgl. Zeitplanung Durchgänge / Rotationen) der die Meldematrix anzeigt. 
Wenn man hier jetzt auf eine Zelle klickt (entweder in der Matrix-> Verein/Wettkampf oder auf die Summe) soll sich ein Pop-Up Menü öffnen um diese einer Riege zuzuordnen (vgl. Wizard Riegeneinteilung). Entweder eine neue Riege erstellen, oder eine vorhandene verwenden. Zudem soll es möglich sein alle Teilnehmer dieser Riege zuzuordnen oder nur einzelne bzw. eine Anzahl x. 

176. [Bug] In der UI http://localhost:3001/associations Verbandsverwaltung gibt es ein Feld "Land" welches zwingend angegeben werden muss. Es gibt aber keine UI um Länder zu erstellen. 
a) Es muss nach dem UI-Standard eine UI erstellt werden, um die Länder zu verwalten (hinzufügen, löschen, filtern, usw.) 
b) Es müssen Tests hierfür geschrieben werden 
c) Es müssen alle standard komponenten verwendet werden (utils) 
-> Erledigt ✅

177. [Bug] In der UI clubs und persons beim erstellen eines Vereins ist der Dialog nicht lokalisiert
-> Erledigt ✅

178. Bereinigung: 
Aktuell ist der komplette C++ Code von alten Turnfix noch mit im Ordner. Den können wir jetzt doch eigentlich löschen. Gründe: 
a.) Wir haben den Code soweit verstanden und Dokumentiert, damit wir die neue WebApp nachbauen können 
b.) die neue Web App funktioniert 
c.) wir haben seit einiger Zeit nichts mehr nachschauen müssen 
d.) in GitHub alle Issues und Stories für TurnFix löschen, da dann obsolet. 
e.) Vielleicht sollte man auch noch warten, bis Gruppen/Mannschaftwettkämpfe funktionieren und validiert sind? 

179. [Bug] Im Medallienspiegel und der Siegerliste steht im Header immer "Muster-Sporthalle" obwohl die korrekte Location am Event hinterlegt ist. Das müsste ja eine Util klasse sein und kann für alle listen behoben werden. TDD. 
-> Erledigt ✅

180. [Feature] Wir haben in der UI verschiedene Exports (CSV, PDF, Ergebnisse, Urkunden, Medallienspiegel, XML Ergebnisse, usw.) 
Das ist in der UI nich immer klar, was hier passiert bei dem Button & jede UI sieht anders aus. Mein Vorschlag: 
a.) jede UI hat nur einen Button "Export" 
b.) mit dem Button Export öffnet sich ein "Wizard" 
-> Erledigt ✅
c.) in dem Wizard kann man jetzt den Dateityp (CSV, PDF, XML) wählen (ggf. auf mehrere)
-> Erledigt ✅
d.) in dem Wizard kann man noch diverse weitere spezielle eigenschaften auswählen (wie z.B. die GymNet XML vom import)
e.) in dem Wizard kann man noch den ablageort definieren 
-> Erledigt ✅
g.) in dem Wizard kann man neben dem Dateityp auch noch Exporttyp auswählen (Urkunde, Siegerliste, Etiketten) vielleicht auch kombiniert mit dem Dateityp. Der Exporttyp ist natürlich immer abhängig von der aktuellen Seite, bzw. sind alle anderen Typen per default ausgeblendet. 
h.) Das soll natürlich wiederverwendbar implemnentiert sein
-> Erledigt ✅
i.) Tests müssen vorhanden sein 
-> Erledigt ✅
j.) Falls ein Filter aktiv ist, wirkt sich das auf den Export aus, wie bisher (und sollte auch angezeigt werden)
-> Erledigt ✅
k.) wenn es in einer UI nur einen Export gibt, dann brauchen wir eigentlich keinen Wizard öffnen, oder? (z.B. event-management)
-> Erledigt ✅
l.) fehltnoch was? macht das sinn? 
-> Erledigt ✅

181. [Feature] Gerätewertung 
Es muss bei in der Anzeige der Ergebnisse eine Gerätewertung verfügbar sein. Und zwar muss je Wettkampf die Person mit der größten Punktzahl der Gerätesieger in dem Wettkampf sein. Dies soll direkt an der Wertung mittels einer goldenen 1 (gleiches Icon wie sonst auch verwendet) gekennzeichnet werden. Auch der 2. und 3. Platz soll dementsprechen gekennzeichnet sein. 
Möglich wäre auch eine komplett neue UI nur für die Gerätewertung... ? Wäre vielleicht schöner, da dann die Themen komplett getrennt sind und die Wertungen aller Teilnehmer betrachtet werden können? 

182. [improvement] statt der client/src/test/i18n/noNardcodedUiStrings.baseline.json wäre es besser die UI Texte zu lokalisieren. Dann kann die baseline datei gelöscht werden. 
🚀 In Arbeit (unvollständig)

183. [improvement] in den Einstellungen sollte es auf der Seite für die Software (mit Versionsinfos usw.) weitere Hinweise zur Software geben, so wie ein Changelog. nur eine Komprimierte version mit Features, Bugfixes, known bugs immer zur Softwareversion. 

184. [improvement/bug] Ergebnisse XML Export. Aktuell funktioniert der XML Export nicht als Wizard. 
Es öffnet sich ein "File open Dialog" um die GymNet.xml zu öffnen. Danach eine UI, welche die matches anzeigt. Das sollte alles als Wizard passieren. Auch dann der "File save Dialog". 
Zudem funktioniert das Matching der Namen nicht. 
Bei dem Report steht dran, dass 
26 Competitions matched
0 Participants matched 
0 Diszipline scores written 
0 Competitions unmatched
0 Participants unmatched 
0 Disziplines unmatched 
🚀 In Arbeit (unvollständig)


185. [improvement] Ergebnisse XML Export. Manche Teilnehmer können nicht gematched werden. Zu diesen müssen noch detaillierte Infos, wenn das möglich ist. 

🚀 In Arbeit (unvollständig)
#	Titel
72	PDF Export – Wettkampfnummer bei Teilnehmer- & Riegenlistenexport (Tests fehlen)
78	Riegeneinteilung Filter – Zugewiesen/Nicht-zugewiesen, Jahrgang, Namensfilter-Position (Tests fehlen)
79	Riegeneinteilung UI – Alle Wettkämpfe in Riegenspalte, Details-Karte, Höhe der Spalte (Tests fehlen)
80	Riegeneinteilung – UI aktualisiert nicht nach Entfernen/Hinzufügen von Teilnehmern (Tests fehlen)

❌ Offen (kein Status)
#	Titel	Priorität
4	PDF Siegerliste – Formel in der Überschrift anzeigen	mittel
45c	Riegeneinteilung – Ausgeglichene Riegengrößen	niedrig
66	Dokumentation – Anwender-/Entwicklerdoku mit einheitlichem Design, inkl. Playwright-Screenshots	mittel
67	Feature: Teilnehmer direkt in Veranstaltung hinzufügen (& in Athletes anlegen)	mittel
70	Bug: Dialog beim Löschen von Teilnehmern nicht lokalisiert	niedrig
73	Riegeneinteilung Konzept – Analyse Geräteanzahl/Durchgänge/Zusammenführung kleiner Wettkämpfe	niedrig
93	Layout-Designer – Zoom, PDF als Hintergrund laden	niedrig
103	Improvement: Results-Filter – Wettkämpfe aufsteigend sortieren	niedrig
108	Improvement: Status "Gedruckt" automatisch setzen beim PDF-Export	niedrig
123	Modale Dialoge → Wizard (Disziplin, Wettkampf, GymNet-Import)	niedrig

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

TD-02	Technische Schuld: "Pause"-Erkennung per Name-Regex in ScheduleMatrixView.tsx	niedrig

TD-04 TD-Uneinheitliche Persistenzpfade (mittel-hoch)
Beschreibung: Scores werden über mehrere Endpunkte/Flows gespeichert (value-save, field-save, group/team save).
Risiko: Validierung/Audit/Plausi verhalten sich nicht überall gleich.
Fundstellen: useScoreActions.ts:163, useScoreActions.ts:216, GroupScoreCapture.tsx:175, TeamScoreCapture.tsx:316

TD-05 TD-SoC-Verstoß in zentralen Seiten (mittel)
Beschreibung: Mehrere große Dateien > 600 Zeilen, teils UI + Workflow + API + Berechnung in einer Einheit.
Risiko: hoher Änderungsaufwand, Regressionen.
Fundstellen: Configuration, EventManagement, DisciplinesUnified, EventImportModal

TD-06 Offen bleibt noch ein angrenzender Punkt: die Auflösung von int_formelid per API-Fetch ist weiterhin an mehreren Stellen separat vorhanden. Die reine Berechnungslogik ist jetzt zentralisiert, die Formel-Resolver-Logik noch nicht vollständig. Wenn du willst, ziehe ich das als nächsten Schritt auch noch in eine gemeinsame Hook/Utility zusammen.

TD-07 GymNet XML Export der Ergebnisse ist nur möglich wenn man auch die GymNet Import XML hat. Das liegt daran, dass die Teilnehmer IDs nicht ins GymNet importiert werden sowie auch nicht die Wettkampf und Geräte IDs. 
Es wäre wohl einfacher, wenn alle IDs aus dem GymNet einen Platz in der DB von TurnFix hätten. Dann gäbe es keine Duplikate und ein Matching wäre ohne Probleme möglich. 

## Zukunftsideen (noch nicht umgesetzt)

Z1. [Idee] Wettkampf-Auswahl in der Wertungserfassung
Aktueller Stand: Jede Person darf nur einem Wettkampf pro Veranstaltung zugeordnet werden (1:1-Regel, seit #113 im Backend durchgesetzt). Als Workaround für mehrere Wettkämpfe kann eine separate Veranstaltung angelegt werden.
Idee für die Zukunft: Falls mehrere Wettkämpfe pro Person doch benötigt werden, könnte in der Wertungserfassung ein Schritt "0 – Wettkampf auswählen" vor der Riegen-Auswahl eingebaut werden. Der Selector würde nur erscheinen, wenn die Veranstaltung mehr als einen Wettkampf hat, und würde Teilnehmer sowie Disziplinen auf den gewählten Wettkampf beschränken.
Betroffene Dateien: ScoreCapture/index.tsx, SquadDisciplineSelector.tsx, useScoreValidation.ts


------------------------------------------------------------
-> Erledigt ✅
-> In Arbeit 🚀
-> obsolete 