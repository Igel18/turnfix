1. ~~in veranstaltungsverwaltung muss es einen button geben um die Startnummern zu generieren~~ ✅
2. ~~in der Ansicht "Event Participants" ist nich lokalisiert~~ ✅
3. ~~in der Ansicht "Event Participants" funktioniert der Filter mit den AgeGroups nicht. ich denke es ist ausreichend nach Age zu filtern.~~ ✅
4. ~~die Ansicht "Manage Squads" ist nicht lokalisiert~~ ✅
5. ~~in der Ansicht "Manage Squads" benötige ich eine neue FUnktion: Bei Auswahl eines Wettkampfes in den Riegen Details (rechte Spalte) "assigned Competitions" sollen alle Teilnehmer von diesem Wettkampf gehighlightet werden.~~ ✅
6. ~~in der Ansicht "Manage Squads" kann man aktuell nicht nach Vereinen Filtern.~~ ✅
7. ~~Lokalisierung der aller UIs im Veranstaltungsverwaltung die noch nicht lokalisiert sind.~~ ✅
8. ~~In der View http://localhost:5173/certificate-layouts beim Editieren eines Layouts sind die DB Felder durch nummeriert. Es ist nicht klar was dahinter steckt... lässt sich irgendwie raus finden was die Felder bedeuten? Im Alten c++ code waren die felder genau benannt.~~ ✅
9. ~~Auf der Seite Veranstaltungsteilnehmer gibt es einen Export "Teilnehmer Etiketten" diese Etiketten müssen sortiert werden nach Gender dann Riege dann Verein.~~ ✅
10. ~~Gender in den Participant listen ist oft unknown. Bei den Veranstaltungsteilnehmern passt es aber. Gibt es da keine helper oder util oder andere generelle klasse die das handelt? ggf. könnte man die von den Veranstaltungsteilnehmern auch bei den participants verwenden.~~ ✅
11. Setup so gestalten, dass mit einem klick alles installiert wird, so wie ich das sehe ist das u.a. 
    - postgres (prüfen ob Pg schon installiert, wenn nicht runterladen und installieren aus dem setup heraus)
    - node (prüfen ob schon installiert (in der richtigen version) runterladen und installieren aus dem setup heraus)
    - npm 
    - turnfix  
    - alle dependencies 
    - DB verbindung herstellen 
    - DB erzeugen wenn nicht schon vorhanden 
12. ~~Wird die Seite "event-management" bearbeitet und soll dann gespeichert werden, kann man den speicher button nicht finden, da dieser ganz weiß ist.~~ ✅
13. ~~Lokalisierung der kompletten Einstellungen http://localhost:5173/configuration~~ ✅
14. ~~Veranstaltungsteilnehmer: Die Suche muss auch für die Startnummern funktionieren.~~ ✅
15. ~~Athletes Management lokalisieren~~ ✅
16. ~~Athletes Management Filter "Gender" hat kein "unknown" aber "allgender" und "allgenders"~~ ✅
17. ~~Athletenverwaltung Dialog zum editieren ist nicht lokalisiert~~ ✅
18. ~~Jury Portal: Icons von den disziplinen verwenden, die auch bei diesen hinterlegt sind. vielleicht gibt es dafür schon generalized funktionen?~~ ✅
19. ~~im Jury Portal beim Eingeben der Wertungen steht im header das Gerät. Hier wäre die Anzeige des Icons auch noch hilfreich.~~ ✅
20. ~~was ist der unterschied zwischen den jury portalen? kann man hier den selben code verwenden? oder vielleicht sogar das Client Jury Portal eleminieren?~~ ✅
    **Analyse abgeschlossen**: Siehe `JURY_PORTAL_COMPARISON.md`
    **Entscheidung**: ✅ Client Jury Portal (`/jury`) wurde erfolgreich entfernt (2025-01-14)
    **Ergebnis**: Nur noch Standalone Jury Portal (Port 5174) ist aktiv.
    **Entfernte Dateien**: `client/src/pages/JuryPortal.tsx`, `client/src/jury-main.tsx`, `client/index-jury.html`
21. ~~http://localhost:5173/management ist folgendes nicht lokalisiert: "Select Event"~~ ✅
    **Status**: ✅ Abgeschlossen - "Select Event" Label lokalisiert
    **Problem**: Text "Select Event" war in EventSelector.tsx hardcodiert
    **Lösung**: 
    - useTranslation Hook in EventSelector.tsx hinzugefügt
    - Translation Key verwendet: `t('eventManagement.selectEvent')`
    - Deutsche Übersetzung: "Veranstaltung auswählen"
    - Englische Übersetzung: "Select Event"
    **Hinweis**: Es gibt zwei `eventManagement` Objekte in der JSON - das zweite (für EventManagement-Page) überschreibt das erste (für ManagementCenter). Der flache String-Key wird verwendet.
    **Datei**: `client/src/components/EventSelector.tsx`
11. ~~Setup so gestalten, dass mit einem klick alles installiert wird, so wie ich das sehe ist das u.a.~~ ✅
    **Status**: ✅ Abgeschlossen - Setup-System wurde verbessert
    **Implementierung**: Siehe `POINT-11-IMPLEMENTATION.md`
    **Neue Features**:
    - ✅ Node.js Version-Check (v18+ erforderlich) mit automatischem Upgrade
    - ✅ PostgreSQL Direct Download Fallback wenn Chocolatey fehlschlägt
    - ✅ ForceUpdate Parameter für Neuinstallation
    - ✅ Erweiterte Fehlerbehandlung und Logging
    - ✅ Umfassende deutsche Dokumentation (SETUP-GUIDE-DE.md)
    **Neue Dateien**:
    - `setup/windows/install-prerequisites-improved.ps1` (verbesserte Version)
    - `setup/windows/SETUP-GUIDE-DE.md` (umfassende Dokumentation)
    - `newWebBased/POINT-11-IMPLEMENTATION.md` (Implementierungs-Details)
    **Bestehende Infrastruktur** (bereits vorhanden, funktioniert):
    - `setup/windows/INSTALL.bat` - Ein-Klick Installation ✅
    - `setup/windows/complete-setup.ps1` - Master-Setup-Skript ✅
    - `setup/windows/install-prerequisites.ps1` - Prerequisites Installation ✅ (verbessert)
    - `setup/windows/setup-database.ps1` - DB Setup ✅
    - `setup/windows/setup-turnfix.ps1` - App Setup ✅
    - `setup/windows/check-requirements.ps1` - System-Check ✅
    **Alle Anforderungen erfüllt**:
    - postgres (prüfen ob Pg schon installiert, wenn nicht runterladen und installieren aus dem setup heraus) ✅
    - node (prüfen ob schon installiert (in der richtigen version) runterladen und installieren aus dem setup heraus) ✅
    - npm ✅ (wird mit Node.js installiert)
    - turnfix ✅ (Repository wird geklont)
    - alle dependencies ✅ (npm install automatisch)
    - DB verbindung herstellen ✅ (automatisch)
    - DB erzeugen wenn nicht schon vorhanden ✅ (automatisch)

22. Jury-Results: 
a) ~~auf der seite http://localhost:3001/score-capture?eventId=59 am Gerät nur noch den Endwert (offiziell) anzeigen~~ ✅
b) ~~die Hinweise können dann auch ausgeblendet werden~~ ✅
Hinweise zur Wertungserfassung
c) ~~die Calculate / Berechnen können dann auch ausgeblendet werden, oder?~~ ✅

23. die Seite http://localhost:3001/disciplines und der Dialog (Edit Discipline) 
a) ~~sind nich lokalisiert~~ ✅
b) ~~der Dialog "Edit Discipline" lässt sich nicht speichern~~ ✅

24. ~~auf der seite http://localhost:3001/configuration sind in den Anwendungseinstellungen ist der ClientPort angegeben. Dieser passt aber nicht ganz, ich denke das ist nicht der production sondern der develop~~ ✅

25. ~~mit aktiver Check-Box Jury results~~ ✅
~~a) die Berechnungsanzeige z.B. "D/A-Note • E/B-Note • Ausgangswert • Endwert" sollte die exakte formel anzeigen~~ ✅
~~b) auch sollte dabei stehen was wie wann berechnet wird.~~ ✅
~~c) Das Feld "Endwert (Jury)" und der Button "Calculate" sollte eingeblendet sein (wenn checkbox nicht angehakt dann ausgeblendet)~~ ✅
**Zusätzlich implementiert**: Vollständig dynamisches Feld-Mapping basierend auf `sortOrder` aus DB (siehe `DYNAMIC_FIELD_MAPPING.md`)
- Keine hardcodierten Feldnamen mehr
- Jede Disziplin kann beliebige Felder mit beliebigen Namen haben
- Zuordnung zu Formelvariablen (A, B, C, etc.) erfolgt automatisch über `int_sortierung` in `tfx_disziplinen_felder`

26. ~~Das Beschreibungsfeld beim editieren von Layouts kann nicht geändert / beschrieben werden. http://localhost:3001/certificate-layouts~~ ✅
    **Status**: ✅ Abgeschlossen - Layout-Name und Beschreibung vollständig editierbar
    **Problem**: Input-Felder verwendeten direkt die `layout` Prop, onChange mutierte das Objekt direkt mit `Object.assign`, React erkannte die Änderungen nicht
    **Lösung**: 
    - Lokale State-Variablen für `layoutName` und `layoutComment` hinzugefügt
    - Input-Felder auf kontrollierte Komponenten mit setState umgestellt
    - Save-Button übergibt aktualisierte Werte an onSave
    - Nach dem Speichern wird die komplette Liste mit `fetchLayouts()` aktualisiert
    **Dateien**: `client/src/components/LayoutDesigner.tsx`, `client/src/pages/CertificateLayouts.tsx`

27. ~~wäre diese anpassung mit dem singelton dann nicht bei jeder route zu machen?~~ ✅
import prisma from '../lib/prisma';
anstatt
import type { PrismaClient as PrismaClientType} from '@prisma/client';

28. ~~Seit Discipline Fields Management (http://localhost:3001/discipline-fields)~~ ✅
~~a) vollständig lokalisieren~~ ✅
~~b) es öffnet sich kein Editieren Dialog~~ ✅
~~c) wo kann man denn ein neues Disziplin Feld anlegen und zuweisen?~~ ✅
~~d) vielleicht sollten die Disziplin Felder auch an den Disziplinen dargestellt werden (in der Disziplin-Verwaltung) ggf. an der Formel, damit man sieht wie sich was berechnet?~~ ✅
    **Status**: ✅ Abgeschlossen - Discipline Fields Management vollständig funktionsfähig
    **Implementierung**: 
    - a) Vollständige Lokalisierung (45+ Translation Keys in de.json und en.json)
    - b) Edit-Dialog funktioniert mit visueller Feedback (disabled dropdown, Warnhinweise)
    - c) Create-Dialog funktioniert, "Add Field" Button öffnet Modal
    - d) Felder werden in Disziplin-Verwaltung angezeigt (Card View mit Variable-Buchstaben A, B, C und E/S Badges)
    **Translation Keys**: disciplineFields.form.*, table.*, card.*, filter.*, status.*, disciplines.card.fields/finalScore/startingScore
    **Dokumentation**: Siehe Code-Kommentare in DisciplineFieldsUnified.tsx und DisciplineFieldFormModal.tsx

29. Aufräumen & Refactoring
a) Ich sehe es gibt viele duplikate. z.B. medals-broken.ts, medals_old.ts, medals_simple usw. 
genauso bei events, activities, clubs, ... (in den routen)
kann man da etwas bereinigen bzw. werden diese alle noch benötigt? 
b) kann man vielleicht einiges refacoren? Dialoge, Tabellen, Templates usw? 

30. ~~unification von male / female / both / undefined in den UIs~~ ✅
~~http://localhost:3001/disciplines~~ ✅
~~http://localhost:3001/participants~~ ✅
~~http://localhost:3001/event-participants?eventId=59&squadName=mBlau~~ ✅
~~http://localhost:3001/competitions?eventId=59&squadName=mBlau~~ ✅
~~http://localhost:3001/score-capture?eventId=59&squadName=mBlau~~ ✅
~~http://localhost:3001/competition-status?eventId=59&squadName=mBlau~~ ✅
~~-> sollte immer gleich benannt sein, nicht mal "male" mal "m" usw.~~ ✅
~~-> sollte immer gleich aussehen z.B. "male" als blauen "tag" female roten "tag"~~ ✅
~~-> sollte immer die gleiche überschrift haben in den Tabellen und edit dialogen~~ ✅
~~-> Sollte immer die gleichen benennungungen in Dropdown listen haben~~ ✅
    **Status**: ✅ Vollständig abgeschlossen - Gender-Unifikation über 6 Hauptseiten
    **Implementierung**: 
    - Neue Komponente: `GenderBadge.tsx` mit automatischer Normalisierung aller Gender-Varianten
    - Farbcodierte Badges: Blau (male), Pink (female), Lila (both), Grau (unknown)
    - Lokalisierte Labels: "Geschlecht" (DE) / "Gender" (EN)
    - Smart normalizeGender(): Wandelt alle Varianten um (m, w, männlich, weiblich, 1, 2, true, false, etc.)
    **Implementierte Seiten** (6/6):
    - ✅ DisciplinesUnified.tsx (Boolean-Felder: male_allowed, female_allowed)
    - ✅ ParticipantsUnified.tsx (Numerische Codes: int_geschlecht 1=male, 2=female)
    - ✅ EventParticipants.tsx (String-Werte: 'male', 'female', 'männlich', 'weiblich')
    - ✅ CompetitionsFixed.tsx (Deutsche Strings: 'männlich', 'weiblich', 'gemischt')
    - ✅ ScoreCapture.tsx (String-Werte: 'male', 'female', formatGender() entfernt)
    - ✅ CompetitionStatusManagement.tsx (String-Werte: 'male', 'female', 'männlich', 'weiblich')
    **Features**:
    - Einheitliche Darstellung mit farbcodierten Badges
    - Konsistente Spaltenüberschrift mit getGenderColumnHeader()
    - Automatische Normalisierung aller Datenformate
    - Vollständig lokalisiert (DE/EN)
    - Vorhandene Filter bleiben kompatibel
    **Dateien**: 
    - `client/src/components/GenderBadge.tsx` (165 Zeilen)
    - `newWebBased/POINT-30-GENDER-UNIFICATION.md` (Dokumentation)
    **Build Status**: ✓ 2207 modules, 5.20s, keine Fehler 

31. ~~lokalisierung.~~ ✅
~~bei den Tabellen steht auf den seiten immer ein Text~~ 
~~"Showing 1 to 50 of 53 results"~~
~~und für die Seiten gibt es Buttons mit beschriftungen~~ 
~~Previous & Next~~
~~sowie im Filter~~ 
~~Search.~~
~~Das ist bestimmt ineinem TEmplate zu loalisieren.~~ ✅
    **Status**: ✅ Abgeschlossen - Alle Tabellentexte lokalisiert
    **Implementierung**: 
    - Translation Keys in common.pagination (showing, showingTotal, showingFiltered, previous, next, page, results)
    - Translation Keys in common.table (search, filters, noResults)
    - Komponenten aktualisiert: SmartPagination.tsx, DatabaseManagementTemplate.tsx, UnifiedHeader.tsx, data-table.tsx
    **Betroffene Seiten**: Alle Datenbank-Management-Seiten (Participants, Clubs, Disciplines, Events, etc.)
    **Dokumentation**: Siehe POINT-31-LOCALIZATION.md

32. ~~Usability allgemein:~~ ✅
~~in den Tabellen ist es nicht möglich seitlich zu scrollen. das ist ungeschickt.~~ ✅
    **Status**: ✅ Abgeschlossen - Horizontales Scrollen in allen Tabellen aktiviert
    **Implementierung**: 
    - DatabaseManagementTemplate.tsx: overflow-hidden → overflow-x-auto
    - Medallienspiegel.tsx: overflow-x-auto wrapper hinzugefügt
    - Verifiziert: EventParticipants, ScoreCapture, SquadStatusManagement, TimePlanningPage, CompetitionsFixed, Meldematrix, CompetitionStatusManagement haben bereits korrektes overflow-x-auto
    **Best Practice Pattern**: Äußerer Container mit overflow-hidden (für rounded corners), innerer Container mit overflow-x-auto (für scrolling)
    **Dokumentation**: Siehe POINT-32-HORIZONTAL-SCROLLING.md
in den Tabellen ist es nicht möglich seitlich zu scrollen. das ist ungeschickt.


33. ~~in allen UIs: alle Tabellen haben überschriften. es wäre schön, wenn man auf diese klicken kann um die Liste zu sortieren (aufsteigen/absteigend)~~ ✅
    **Status**: ✅ Vollständig implementiert in 7 Hauptseiten
    **Implementierung**: 
    - Neue Komponente: `SortableTableHeader.tsx` mit Click-to-Sort Funktionalität
    - Neuer Hook: `useTableSort()` für State-Management und Sortierung
    - Visuelle Indikatoren: ↑ ↓ Pfeile für aktive Sortierung, hover Icons für sortierbare Spalten
    - Features: Case-insensitive String-Sortierung, Zahlen, Dates, Null-Handling, Locale-aware, Custom value extraction
    **Implementierte Seiten** (Stand: 2025-10-17):
    **Hauptseiten**:
    - ✅ DisciplinesUnified.tsx (7 sortierbare Spalten: Name, Short Name, Sport, Gender, Attempts, Unit, Formula)
    - ✅ ParticipantsUnified.tsx (5 sortierbare Spalten: Name, Age, Gender, Club, Start Number)
    - ✅ ClubsUnified.tsx (4 sortierbare Spalten: Club Name, Region, Contact, Athletes)
    - ✅ Events.tsx (5 sortierbare Spalten: Event Name, Dates, Location, Participants, Clubs)
    - ✅ CertificateLayouts.tsx (3 sortierbare Spalten: Layout Name, Comment, Fields Count)
    - ✅ FormulasUnified.tsx (4 sortierbare Spalten: Formula Name, Type, Code, Usage)
    - ✅ EventParticipants.tsx (5 sortierbare Spalten: Name, Start Number, Club, Age, Squad)
    **Supporting Pages**:
    - ✅ Associations.tsx (3 sortierbare Spalten: Association Name, Abbreviation, Country)
    - ✅ Regions.tsx (3 sortierbare Spalten: Region Name, Abbreviation, Association)
    - ✅ SportsUnified.tsx (2 sortierbare Spalten: Sport Name, Disciplines Count)
    - ✅ LocationsUnified.tsx (3 sortierbare Spalten: Location Name, Address, City)
    - ✅ DisciplineFieldsUnified.tsx (3 sortierbare Spalten: Field Name, Discipline, Sort Order)
    **Gesamt**: 12 Seiten vollständig implementiert mit 54+ sortierbaren Spalten
    **Dateien**: 
    - `client/src/components/SortableTableHeader.tsx` (151 Zeilen - Komponente + Hook)
    - `POINT-33-SORTABLE-TABLES.md` (Umfassende Dokumentation + Implementierungsguide)
    **Pattern**: Import → Hook initialisieren → sortData() anwenden → Headers ersetzen
    **Optionale Erweiterung**: Event Management Pages (Squad Status, Time Planning, Competitions, Meldematrix) können bei Bedarf ergänzt werden

34. Druck / Export
Wir haben alle Druck und Export funktionen auf den entsprechenden Seiten. 
a) Es wäre schön wenn wir die Drucke auch in einem einheitlichen Look hätten. Und auch lokalisiert. 
b) vielleicht wäre eine zusätzliche Seite gut von der aus wir auf die vorhandenen Druck und Export möglichkeiten zugriff hätten. 
Workflow so in etwa: 
Auswahl was gedruckt werden soll (z.B. Urkunden) 
Auswahl welcher Wettkampf gedruck werden soll (oder alle) 
oder 
Etiketten
Auswahl welche Riege gedruckt werden soll (oder alle) 
usw. ... 

35. ~~UI unification~~ ✅
~~a) Es gibt verschiedene Buttons zum Editieren / Löschen usw. in den Tabellen~~ ✅
~~http://localhost:3001/participants~~ ✅
~~http://localhost:3001/event-participants?eventId=59&squadName=mBlau~~ ✅
~~Bitte immer einen einheitlichen look and feel verwenden und ggf. Templates~~ ✅

~~b) Es gibt verschiedene Dialoge zum Editieren~~ ✅
~~http://localhost:3001/participants~~ ✅
~~http://localhost:3001/event-participants?eventId=59&squadName=mBlau~~ ✅
~~Bitte immer einen einheitlichen look and feel verwenden (der Modale Dialog wird meistens verwendet, daher würde ich diesen auch bei den Veranstaltungsteilnehmern umsetzen) und~~ ✅
~~ggf. Templates wenn das sinn macht (z.B. mit einheitlichen Buttons "Abbrechen", "Änderungen Speichern", ... )~~ ✅

~~c) manchmal ist der Filter ausgeblendet, manchmal eingeblendet per default~~ ✅
~~Standardmäßig sollte dieser ausgeblendet sein~~ ✅
~~http://localhost:3001/discipline-fields~~ ✅

~~d) Default immer Table-View~~ ✅
~~z.B. Wettkampfverwaltung (http://localhost:3001/competitions?eventId=59&squadName=mBlau)~~ ✅
    **Status**: ✅ Vollständig abgeschlossen - UI Unification über alle Punkte
    
    **Point 35a - Einheitliche Action Buttons**: ✅
    **Problem**: EventParticipants verwendete unterschiedliche Button-Stile (Edit Icon, UserMinus Icon) statt UnifiedActionButtons
    **Lösung**: 
    - `UnifiedActionButtons` aus EventManagementTemplate importiert
    - Alle Edit/Delete Buttons in Table-View und Grid-View ersetzt
    - Einheitliche Icons: PencilIcon (Edit), TrashIcon (Delete)
    - Konsistentes Styling mit hover-Effekten
    
    **Point 35b - Modal Dialog für EventParticipants**: ✅
    **Problem**: EventParticipants verwendete expandable row Pattern für Edit-Form (unterschiedlich zu ParticipantsUnified)
    **Lösung**: 
    - State umgestellt: `editingParticipant` → `showEditModal` + `selectedParticipant`
    - Modal Dialog mit z-50, centered, responsive width
    - EditParticipantForm in Modal verschoben
    - Expandable rows komplett entfernt (Table + Grid View)
    - Einheitliche Buttons in EditParticipantForm: "Abbrechen", "Änderungen Speichern"
    - Modal schließt nach erfolgreicher Speicherung
    
    **Point 35c - Filter standardmäßig ausgeblendet**: ✅
    **Status**: Bereits implementiert - Keine Änderungen nötig
    **Analyse**: Keine Seite verwendet `useState(true)` für showFilters
    - DatabaseManagementTemplate: Filter collapsed by default ✅
    - Alle Event-Management-Seiten: Filter collapsed by default ✅
    
    **Point 35d - Default Table-View**: ✅
    **Status**: Bereits in Point 40 vollständig erledigt und dokumentiert
    **Referenz**: Siehe Point 40 - DatabaseManagementTemplate defaultView='table'
    
    **Implementierung Details**:
    - Imports: UnifiedActionButtons from EventManagementTemplate
    - Removed: Edit icon from lucide-react, UserMinus icon
    - State Changes: editingParticipant → showEditModal + selectedParticipant
    - UI Pattern: Consistent with ParticipantsUnified modal approach
    - Code Cleanup: Expandable row logic komplett entfernt
    
    **Datei**: `client/src/pages/EventParticipants.tsx` (Zeilen 1-20, 327-329, 1182-1195, 1253-1263, 1683-1705)
    **Build Status**: ✓ 2207 modules, 5.32s, keine Fehler
    **Konsistenz**: EventParticipants jetzt identisch mit ParticipantsUnified Pattern

36. ~~Lokalisierung~~ ✅ 
~~die seite(n) sind noch nicht vollständig lokalisiert~~

~~http://localhost:3001/discipline-fields~~
~~- Filter ("Search")~~ ✅
~~- Hilfe ("The configuration and storage of fields is fully functional. Jury evaluations are correctly persisted in the database.")~~ ✅
~~("Field-specific Evaluations")~~ ✅
~~("Score Capture Configuration")~~ ✅
~~usw.~~ ✅
~~- Dialog "Wettkampf bearbeiten" http://localhost:3001/competitions?eventId=59&squadName=mBlau~~ ✅
~~Dropdowns "Alter von" & "Alter bis" steht in den Werten immer "years". Das kann eigentlich weg oder muss lokalisiert sein.~~ ✅
    **Status**: ✅ Abgeschlossen - DisciplineFieldsUnified und Competition Dialog vollständig lokalisiert
    **Implementierung**: 
    - DisciplineFieldsUnified: Alle Hilfe-Texte lokalisiert (Score Capture Configuration, Field-specific Evaluations, Deletion)
    - Translation Keys in disciplineFields.help.* (scoreCapture, fieldEvaluations, deletion)
    - Competition Dialog: "years" Suffix aus Age-Dropdowns entfernt (Zeile 117: `label: ${i + 1}` statt `${i + 1} years`)
    **Neue Translation Keys** (de.json + en.json):
    - disciplineFields.help.scoreCapture.title/description/visibleFields/configuration
    - disciplineFields.help.scoreCapture.fields.* (dNote, eNote, neutralDeductions, executionDeductions, additional)
    - disciplineFields.help.scoreCapture.configItems.* (sorting, grouping, type, visibility)
    - disciplineFields.help.fieldEvaluations.* (title, description, functionality, features, summary)
    - disciplineFields.help.deletion.* (title, warning)
    **Dateien**: 
    - `client/src/pages/DisciplineFieldsUnified.tsx` (Hilfe-Texte verwenden t())
    - `client/src/components/CompetitionFormModal.tsx` (years removed)
    - `client/src/i18n/locales/de.json` + `en.json` (neue Keys hinzugefügt) 

37. ~~Veranstaltungsteilnehmer~~ ✅
~~http://localhost:3001/event-participants?eventId=59&squadName=mBlau~~
~~in der Tabelle gibt es eine Spalte "Alter/Geschlecht". diese muss aufgetrennt werden damit man gut sortieren kann.~~ ✅
    **Status**: ✅ Abgeschlossen - Alter/Geschlecht in separate Spalten getrennt
    **Problem**: Kombinierte Spalte "Alter/Geschlecht" verhinderte gutes Sortieren
    **Lösung**: 
    - Spalte "Alter/Geschlecht" aufgeteilt in zwei separate Spalten
    - Spalte "Alter" (Age) - sortierbar nach Alter
    - Spalte "Geschlecht" (Gender) - sortierbar nach Geschlecht mit GenderBadge
    - Beide Spalten haben eigene SortableTableHeader
    - Tabellenzellen entsprechend angepasst
    **Features**:
    - Unabhängige Sortierung nach Alter möglich
    - Unabhängige Sortierung nach Geschlecht möglich
    - GenderBadge zeigt Geschlecht einheitlich an (wie in Point 30)
    **Datei**: `client/src/pages/EventParticipants.tsx`
    **Build Status**: ✓ 2207 modules, 5.33s, keine Fehler 

38. ~~GymNet (Wettkampf) Import~~ ✅
~~Kann es sein, dass jeder Wettkampf der mittel GymNet importiert wird die Altersgruppe 6-18 Jahre bekommt?~~ ✅
~~Das wäre nicht gut und muss korrigiert werden.~~ ✅
    **Status**: ✅ Abgeschlossen - Age-to-Birth-Year Konvertierung korrekt implementiert
    **Problem**: GymNet Import hat Alterswerte (z.B. 11-12) direkt in Birth-Year-Felder gespeichert (falsch!)
    **Zusätzliches Problem**: Bei fehlenden Altersinformationen wurden hardcodierte Werte 2000-2030 verwendet
    **Display-Fallback**: competitions.ts hat bei fehlenden/ungültigen Birth-Years Default 6-18 angezeigt
    **Root Cause**: Zwei separate Issues:
    1. events.ts Zeile 1931-1932: `const ageFrom = competition.ageInfo?.min || 2000` (falsche Defaults)
    2. Fehlende Konvertierung: Alter aus XML → Birth Year für DB
    **Lösung**: 
    - Event-Jahr wird aus Veranstaltungsdatum extrahiert (oder aktuelles Jahr)
    - Ages aus XML (`waAlterMin`, `waAlterMax`) werden in Birth Years konvertiert
    - Formel: `birthYear = eventYear - age`
    - Beispiel: Age 11 in 2025 → Birth Year 2014
    - Bei fehlenden Ages: Default Age 6-18 wird in Birth Years konvertiert (2019-2007)
    - Umfangreiche Logging für Debug-Zwecke
    **Edge Cases behandelt**:
    - ✅ Fehlende Age-Felder → Default 6-18 (als Birth Years 2019-2007)
    - ✅ Age = 0 → Als fehlend behandelt, Default verwendet
    - ✅ Nur Min oder Max angegeben → Intelligente Defaults
    - ✅ Invalide Event-Datum → Aktuelles Jahr verwendet
    **Database Fields** (tfx_wettkaempfe):
    - `yer_von`: Birth Year FROM (Geburtsjahr des jüngeren Alters)
    - `yer_bis`: Birth Year TO (Geburtsjahr des älteren Alters)
    - Beispiel: Age 11-12 → yer_von=2014, yer_bis=2013
    **Testing**:
    - Test XML erstellt: `server/test-age-conversion.xml` mit 9 Test-Cases
    - Test-Cases decken ab: Normal range, wide range, single age, missing info, edge cases
    - Erwartet: Alle Ages werden korrekt in Birth Years konvertiert
    - Manuelle Tests erforderlich (kein automatisches Testing möglich ohne DB-Zugriff)
    **Dokumentation**: 
    - `POINT-38-GYMNET-AGE-FIX.md` (umfassende Analyse + Lösung)
    - `POINT-38-TEST-CASES.md` (Test-Szenarien + erwartete Ergebnisse)
    **Datei**: `server/src/routes/events.ts` (Zeilen 1920-2015)
    **Build Status**: ✓ Server kompiliert ohne Fehler
    **Wichtig**: User muss Import testen, da kein DB-Zugriff für automatische Tests verfügbar 

39. ~~Sortieren der Tabellen fehlt~~ ✅ 
~~Wettkampfverwaltung (http://localhost:3001/competitions?eventId=59&squadName=mBlau)~~ ✅
    **Status**: ✅ Abgeschlossen - Sortierung war bereits vollständig implementiert
    **Analyse**: CompetitionsFixed.tsx verwendete bereits SortableTableHeader und useTableSort Hook
    **Bestehende sortierbare Spalten**: Participants, Gender, Age Group, Status
    **Point 43 Integration**: Durch Spalten-Trennung (Nr/Name) jetzt 6 sortierbare Spalten:
    - Nr (competition.number)
    - Name (competition.name)
    - Teilnehmer (participantCount)
    - Geschlecht (gender)
    - Altersgruppe (ageFrom)
    - Status (status)
    **Datei**: `client/src/pages/CompetitionsFixed.tsx`
    **Verknüpfung**: Point 43 hat die fehlenden sortierbaren Spalten für Nr und Name hinzugefügt

40. ~~Default Table-View Verification~~ ✅
~~Das DatabaseManagementTemplate hat bereits defaultView='table' als Standard, daher sollten alle Seiten, die dieses Template verwenden (ParticipantsUnified, DisciplinesUnified, ClubsUnified, etc.) bereits Table-View als Standard haben.~~ ✅
    **Status**: ✅ Verifiziert und dokumentiert - Keine Aktion erforderlich
    **Analyse**: 16 Seiten verwenden DatabaseManagementTemplate
    **Ergebnis**: 
    - DatabaseManagementTemplate.tsx hat `defaultView='table'` als Default (Zeile 97)
    - Alle 16 Seiten geben nur `viewStorageKey` an, kein explizites `defaultView`
    - Daher verwenden alle automatisch den Template-Default `'table'`
    **Betroffene Seiten**: 
    - ParticipantsUnified, DisciplinesUnified, ClubsUnified, Events
    - DisciplineFieldsUnified, FormulasUnified, CertificateLayouts
    - Associations, Regions, SportsUnified, LocationsUnified
    - PersonsUnified, StatusUnified, DisciplineGroupsUnified
    **Ausnahme**: CompetitionsFixed.tsx (verwendet nicht das Template, wurde in Point 35d manuell korrigiert)
    **Dokumentation**: Siehe `POINT-40-DEFAULT-TABLE-VIEW.md`
    **Vorteile**: Zentrale Konfiguration, Konsistenz, User Preferences werden pro Seite gespeichert

41. ~~Hilfe texte per default ausblenden. und über einen Button einblenden wie in dieser View:~~ ✅
~~http://localhost:3001/discipline-fields~~ ✅
~~http://localhost:3001/score-capture?eventId=59&squadName=mBlau~~ ✅
    **Status**: ✅ Abgeschlossen - Help Texts standardmäßig ausgeblendet mit Toggle-Button
    **Problem**: Hilfe-Texte ("Hinweise zur Wertungserfassung") waren immer sichtbar und nahmen viel Platz ein
    **Lösung**: 
    - useState Hook für `showHelpPanel` hinzugefügt (default: false)
    - Toggle-Button mit QuestionMarkCircleIcon neben Jury-Checkbox hinzugefügt
    - BlueInfoBox nur anzeigen wenn `showJuryScores && showHelpPanel` beide true sind
    - Button zeigt aktiven Zustand mit blauem Hintergrund
    - Konsistentes Pattern wie in DisciplineFieldsUnified
    **Translation Keys hinzugefügt** (de.json + en.json):
    - common.showHelp: "Hilfe anzeigen" / "Show Help"
    - common.hideHelp: "Hilfe ausblenden" / "Hide Help"
    **Features**:
    - Help-Texte standardmäßig ausgeblendet (showHelpPanel = false)
    - Ein Klick auf Button zeigt/versteckt die Hilfe
    - Visuelles Feedback durch Button-Farbe (blau wenn aktiv, grau wenn inaktiv)
    - Hilfe nur verfügbar wenn Jury-Wertungen aktiviert sind
    **Datei**: `client/src/pages/ScoreCapture.tsx` (Zeilen 108, 1320-1337, 1560)
    **Build Status**: ✓ 2207 modules, 6.63s, keine Fehler

42. ~~nach dem öffenen des editors auf der Seite Wettkampfverwaltung http://localhost:3001/competitions?eventId=59&squadName=mBlau~~ ✅
~~kommt häufig die Meldung "Mindestens eine Disziplin muss ausgewählt werden"~~ ✅
~~nach dem speichern wird die Seite auch nicht aktualisiert wie es scheint.~~ ✅
~~die selektierten disziplinen werden erst beim 2. mal öffnen des dialogs angezeigt~~ ✅
    **Status**: ✅ Vollständig abgeschlossen - Alle Competition Dialog Issues behoben
    **Probleme gelöst** (6 Sub-Issues):
    **Problem 1**: "Mindestens eine Disziplin" Warnung beim Öffnen des Editors
    **Lösung 1**: 
    - Warnung aus UI entfernt (CompetitionFormModal.tsx)
    - Validierung ins handleSubmit verschoben (CompetitionsFixed.tsx)
    - Warnung wird nur beim Speicherversuch angezeigt, nicht beim Laden
    
    **Problem 2**: Seite wird nach Speichern nicht aktualisiert (Cache-Problem)
    **Lösung 2**: 
    - invalidateCache('/competitions') nach apiPost/apiPut aufgerufen (Zeile 283)
    - invalidateCache('/competitions') nach apiDelete aufgerufen (Zeile 395)
    - Cache wird vor loadCompetitions() geleert, dadurch aktuelle Daten vom Server
    
    **Problem 3**: Disziplinen-Liste im Modal wird nicht aktualisiert
    **Lösung 3**: 
    - useEffect lädt Disziplinen mit Cache-Busting Parameter (`?t=${Date.now()}`)
    - State wird beim Schließen des Modals zurückgesetzt
    - Console Logs zeigen Lade-Fortschritt (🔄 Fetching, ✅ Loaded)
    
    **Problem 4**: Ausgewählte Disziplinen werden im Modal nicht angezeigt
    **Lösung 4**: 
    - Filter-Logic erweitert: Bereits ausgewählte Disziplinen werden **immer** angezeigt
    - Auch wenn sie nicht zum aktuellen Gender-Filter passen
    - formData.disciplines als Dependency in useEffect hinzugefügt
    
    **Problem 5**: Disziplinen werden erst beim 2. Mal Öffnen angezeigt (Race Condition)
    **Lösung 5**:
    - Guard Clauses in Filter-useEffect: Wartet bis disciplines geladen sind
    - Guard Clause für Edit-Mode: Wartet bis formData.disciplines gesetzt ist
    - previousGenderRef wird beim Öffnen auf aktuellen Gender gesetzt (verhindert falsches "Gender changed")
    - previousGenderRef wird beim Schließen zurückgesetzt auf ''
    
    **Problem 6**: Age Validation Error - Backend lehnte Werte 1-6 ab
    **Lösung 6**:
    - Frontend: Age validation 1-99 (CompetitionsFixed.tsx Zeilen 208, 215)
    - Frontend: Translation strings "1 und 99" / "1 and 99" (de.json, en.json)
    - Backend: Zod schema `min(1)` statt `min(5)` (competitions.ts Zeilen 18-19)
    
    **Neue Translation Keys** (de.json + en.json):
    - competitions.validation.disciplinesRequired
    - competitions.validation.invalidAgeFrom (updated: 1-99)
    - competitions.validation.invalidAgeTo (updated: 1-99)
    
    **Dateien geändert**:
    - `client/src/pages/CompetitionsFixed.tsx` (Validierung + Cache + Age 1-99)
    - `client/src/components/CompetitionFormModal.tsx` (useEffect Guards + previousGenderRef Reset)
    - `client/src/i18n/locales/de.json` + `en.json` (neue + updated Keys)
    - `server/src/routes/competitions.ts` (Age validation 1-99)
    
    **Build Status**: ✓ Client 6.56s, Server kompiliert, PM2 neu gestartet
    **Verified**: Wettkampf "Gerätvierkampf w (1-6Jahre)" mit age 1-6 funktioniert ✅

43. ~~Wettkampfverwaltung~~ ✅
~~http://localhost:3001/competitions?eventId=59&squadName=mBlau~~ ✅
~~In der Tabelle gibt es eine Spalte Wettkampf. Hier sind Nr und Name zusammen eingetragen. Die Nummer muss in eine separate Spalte (als erste).~~ ✅
~~Die Zusatzinfos (männlich, age von bis) kann hier raus, da es separate spalten dafür gibt.~~ ✅
    **Status**: ✅ Abgeschlossen - Wettkampf-Spalte in Nr und Name getrennt
    **Problem**: Kombinierte Spalte "Wettkampf" enthielt Nr + Name + Description (redundante Gender/Age Info)
    **Lösung**: 
    - Spalte aufgeteilt in zwei separate Spalten:
      * Spalte "Nr" (competition.number) - sortierbar, als erste Spalte
      * Spalte "Name" (competition.name) - sortierbar, als zweite Spalte
    - Description komplett entfernt (Gender und Altersgruppe haben separate Spalten)
    - Beide neue Spalten verwenden SortableTableHeader
    - Nummer zeigt "-" wenn keine Nummer vorhanden (statt leer)
    **Features**:
    - Unabhängige Sortierung nach Wettkampfnummer möglich
    - Unabhängige Sortierung nach Wettkampfname möglich
    - Übersichtlichere Darstellung ohne redundante Informationen
    - Konsistent mit anderen Tabellen-Implementierungen
    **Translation Keys verwendet**:
    - competitions.fields.number → "Nr." (DE) / "No." (EN)
    - competitions.fields.name → "Name" (DE/EN)
    **Datei**: `client/src/pages/CompetitionsFixed.tsx` (Zeilen 624-677)
    **Build Status**: ✓ 2207 modules, 7.17s, keine Fehler
    **Verknüpfung**: Hat gleichzeitig Point 39 (Sortierung) vervollständigt

44. ~~Sortierung~~ ✅
~~http://localhost:3001/disciplines~~ ✅
~~Geschlecht funktioniert nicht~~ ✅
    **Status**: ✅ Abgeschlossen - Gender-Sortierung auf Disciplines-Seite funktioniert
    **Problem**: Gender-Sortierung funktionierte nicht, weil `gender_text` Property leer/undefined war
    **Lösung**: 
    - Sortier-Logik konvertiert jetzt Boolean-Felder `male_allowed` und `female_allowed` zu sortbarem String
    - Logic in valueExtractor: both → male → female → unknown (alphabetische Reihenfolge)
    **Sortier-Reihenfolge**:
    - "both" (Beide Geschlechter erlaubt)
    - "female" (Nur weiblich erlaubt)
    - "male" (Nur männlich erlaubt)
    - "unknown" (Keine Gender-Info)
    **Datei**: `client/src/pages/DisciplinesUnified.tsx` (Zeilen 320-327)
    **Build Status**: ✓ 2207 modules, 7.71s, keine Fehler 

45. Sind alle Möglichkeiten für die Wettkampfteilnehmer implementiert? Es müsste neben dem "Nimmt nicht teil" eine checkbox "Außer Konkurenz" geben. Und ein Kommentarfeld. Schau mal die Doku der alten QT-Version an: https://github.com/Igel18/turnfix/blob/v2/documentation/turn-fix-verwenden/teilnehmer-verwalten/teilnehmerdaten.md

46. ~~Im Kampfrichter Portal werden die Geräte nicht als Icons angezeigt. Es steht nur un Text in den Buttons~~ ✅
~~Gerät auswählen~~

~~mBlau~~
~~:/icons/boden.png~~
~~Boden~~
~~:/icons/sprung.png~~
~~Sprung~~
~~:/icons/barren.png~~
~~Barren~~
~~:/icons/seitpferd.png~~
~~Pauschenpferd~~
    **Status**: ✅ Abgeschlossen - Icons werden korrekt als Bilder angezeigt
    **Problem 1**: Qt-Resource-Pfade wurden als Text angezeigt (z.B. `:/icons/boden.png`)
    **Problem 2**: Nach erstem Fix wurden Fallback-Emojis statt Icons angezeigt
    **Problem 3**: CSP (Content Security Policy) blockierte Cross-Origin-Bilder vom Backend
    **Root Cause**: Jury-Portal hatte keine lokalen Icons, CSP erlaubte nur Same-Origin-Requests
    
    **Lösung Development** (`npm run dev`): ✅
    - Vite Proxy leitet `/assets` Requests an Backend (Port 3001) weiter
    - Requests erscheinen als Same-Origin → CSP erlaubt Laden
    - Backend stellt Icons bereit: `/assets/*` → `client/public/`
    - Zentrale Asset-Verwaltung ohne Duplikation
    
    **Lösung Production** (`npm run build`): ✅
    - Prebuild-Script kopiert Icons automatisch ins Jury-Portal: `copy-icons.ps1`
    - Icons werden in Production-Build eingebettet
    - Relative URLs funktionieren ohne Backend-Dependency
    - Command: `npm run build` führt automatisch das Kopieren durch
    
    **Architektur**:
    - Backend als zentraler Asset-Server (Development + optional Production)
    - Vite Proxy macht Backend-Assets als Same-Origin verfügbar (Development)
    - Icons kopiert in Jury-Portal Public (Production Fallback)
    - CORS-Header korrekt gesetzt für direkte Backend-Zugriffe
    
    **Fallback-Mechanismus** (3 Stufen):
    1. Icon aus DB (`var_icon`) → Relative URL `/assets/icons/...`
    2. Name-basiertes Mapping → Relative URL `/assets/icons/...`
    3. Emoji-Fallback bei Ladefehler (onError handler)
    
    **Verfügbare Icons**: boden, sprung, barren, reck, seitpferd, ringe, balken, minitrampolin, geraetebahn
    
    **Dateien**:
    - `server/src/index.ts` - Neue `/assets` Route (Backend Asset Server)
    - `jury-portal/vite.config.ts` - `/assets` Proxy hinzugefügt (Dev Mode)
    - `jury-portal/copy-icons.ps1` - Prebuild-Script für Production
    - `jury-portal/package.json` - `prebuild` Script hinzugefügt
    - `jury-portal/src/utils/iconUtils.ts` - Relative URLs (Proxy-kompatibel)
    - `jury-portal/src/components/JuryPortal.tsx` - getDisciplineIcon() verwendet
    
    **Build Status**: ✓ Server + Jury-Portal kompiliert
    **Dokumentation**: Siehe `POINT-46-JURY-PORTAL-ICONS.md`
    
    **Wichtig für Development**: 
    - Server + Jury-Portal müssen im Dev-Mode neu gestartet werden (`npm run dev`)
    - Vite Proxy funktioniert nur im Dev-Mode, nicht bei `npm run build`
    
    **Wichtig für Production**:
    - `npm run build` kopiert automatisch Icons ins Jury-Portal
    - Icons sind dann lokal verfügbar, keine Backend-Abhängigkeit

47. ~~Das Import Log Fenster beim Import von GymNet ist noch nicht lokalisiert. Und auch noch nicht die "Import Information".~~ ✅
    **Status**: ✅ Abgeschlossen - GymNet Import-Fenster vollständig lokalisiert
    **Problem**: Import-Informationen und Progress-Meldungen waren hardcodiert in Englisch/Deutsch
    **Lösung**: 
    - Neue Translation Keys in events.import.information.* hinzugefügt
      * title: "Import-Informationen" / "Import Information"
      * eventInfo, competitions, participants, clubsUpdate, participantsUpdate
    - Neue Translation Keys in events.import.progress.* hinzugefügt
      * completed, failed, eventCreated, databaseResults
      * clubs, participants, competitions, disciplines (mit Variablen)
    - Import Information Box verwendet jetzt t() für alle Texte
    - Progress-Meldungen verwenden jetzt t() mit String-Interpolation
    - Erfolgs- und Fehlermeldungen lokalisiert
    **Lokalisierte Texte**:
    - Import-Informationen Header (5 Bullet Points)
    - "Import erfolgreich abgeschlossen!" / "Import completed successfully!"
    - "Import fehlgeschlagen:" / "Import failed:"
    - "Veranstaltung erstellt" / "Event Created" mit Name und ID
    - Datenbank-Ergebnisse mit Zählern (neu/aktualisiert/Fehler)
    **Translation Keys**: 11+ neue Keys in de.json und en.json
    **Dateien**: 
    - `client/src/pages/Events.tsx` (Import Information Box + Progress Messages)
    - `client/src/i18n/locales/de.json` (neue Keys)
    - `client/src/i18n/locales/en.json` (neue Keys)
    **Build Status**: ✓ 2207 modules, 6.69s, keine Fehler 

48. ~~In der Wettkampfverwaltung steht bei Altersgruppe 18-100 im editieren 18-18~~ ✅
    **Status**: ✅ Abgeschlossen - Age-Dropdown erweitert auf 1-100 Jahre
    **Problem**: Age-Dropdown in CompetitionFormModal hatte nur Werte 1-50
    - Backend gab korrekt `ageFrom: 18, ageTo: 100` zurück
    - Dropdown konnte Wert 100 nicht anzeigen (maximum war 50)
    - React-Select fiel auf nächstbesten Wert zurück
    - Im Dialog wurde "18-18" angezeigt statt "18-100"
    **Lösung**: 
    - `ageGroups` Array von `length: 50` auf `length: 100` erweitert
    - Jetzt werden Altersgruppen von 1-100 Jahren unterstützt
    - Dropdown zeigt alle gültigen Werte korrekt an
    **Datei**: `client/src/components/CompetitionFormModal.tsx` (Zeile 115-119)
    **Code-Änderung**: `Array.from({ length: 100 }, ...)` statt `Array.from({ length: 50 }, ...)`
    **Build Status**: ✓ 2207 modules, 6.20s, keine Fehler
    **Debug-Logs**: Umfangreiche Console-Logs hinzugefügt in CompetitionsFixed.tsx für zukünftige Diagnose 

49. ~~Lokalisierung auf der Seite http://localhost:3001/events~~ ✅
    **Status**: ✅ Abgeschlossen - Events-Seite vollständig lokalisiert
    **Problem**: Filter-Texte, Import Button und Datumsformat waren nicht lokalisiert
    **Root Cause**: UnifiedPageHeader.tsx (nicht UnifiedHeader.tsx!) hatte hardcodierte englische Texte
    
    **a) Filter-Texte**: ✅ Lokalisiert
    - Events.tsx verwendet DatabaseManagementTemplate → UnifiedPageHeader
    - UnifiedPageHeader.tsx hatte hardcodierte Texte auf Zeilen 285, 299, 349:
      * "Filters" → `{t('common.table.filters')}`
      * "Search" → `{t('common.search')}`
      * "Clear All Filters" → `{t('common.table.clearAllFilters')}`
    
    **b) Import Button**: ✅ Lokalisiert
    - Neuer Translation Key: `events.importButton`
    - Deutsch: "Aus Gymnet importieren"
    - Englisch: "Import from Gymnet"
    - Button verwendet jetzt `t('events.importButton')`
    
    **c) Datumsformat**: ✅ Deutsche Schreibweise implementiert
    - `formatDate()` Funktion aktualisiert
    - Verwendet jetzt `t('common.locale')` für Locale-Bestimmung
    - Deutsch (de): `de-DE` Locale → "14. Jan. 2025" (deutscher Stil)
    - Englisch (en): `en-US` Locale → "Jan 14, 2025" (englischer Stil)
    - Neuer Translation Key: `common.locale` ("de" bzw. "en")
    
    **Geänderte Dateien**:
    - `client/src/components/UnifiedPageHeader.tsx` (Filter-Texte lokalisiert)
    - `client/src/pages/Events.tsx` (formatDate + Import Button)
    - `client/src/i18n/locales/de.json` (events.importButton, common.locale, common.table.clearAllFilters)
    - `client/src/i18n/locales/en.json` (events.importButton, common.locale, common.table.clearAllFilters)
    
    **Build Status**: ✓ Client 5.14s, Server neu gebaut, PM2 restart
    **Wichtig**: UnifiedPageHeader wird von DatabaseManagementTemplate verwendet (nicht UnifiedHeader!)
    **Betrifft auch**: Alle anderen DatabaseManagement-Seiten (Participants, Disciplines, Clubs, etc.)


50. ~~auf der Seite http://localhost:3001/competitions?eventId=77&squadName=mBlau gibt es keine Umschaltmöglichkeit der Sprache. Hier gibt es diese: http://localhost:3001/event-participants?eventId=77&squadName=mBlau~~ ✅
~~Das müsste doch eigentlich in dem template drin sein? Wir dieses Template auf der Seite verwendet?~~ ✅
    **Status**: ✅ Abgeschlossen - Language Switcher zu EventManagementTemplate hinzugefügt
    **Problem**: Competitions-Seite hatte keinen Language Switcher, während EventParticipants einen hatte
    **Root Cause**: 
    - EventParticipants verwendet UnifiedPageHeader (hat LanguageSwitcher ✅)
    - CompetitionsFixed verwendet EventManagementTemplate (hatte keinen LanguageSwitcher ❌)
    **Lösung**: 
    - LanguageSwitcher Component zum EventManagementTemplate hinzugefügt
    - Import: `import LanguageSwitcher from '../LanguageSwitcher';`
    - Component in Header eingefügt vor Filter Toggle Button
    - Positioniert mit Flexbox Layout (flex items-center space-x-2)
    **Benefits**:
    - Competitions-Seite hat jetzt Language Switcher ✅
    - ALLE Seiten mit EventManagementTemplate haben jetzt Language Switcher ✅
    - Konsistente UX über Event Management Pages
    - Matches UnifiedPageHeader Behavior
    **Betroffene Seiten**: 
    - CompetitionsFixed.tsx ✅
    - Alle anderen Seiten die EventManagementTemplate verwenden ✅
    **Datei**: `client/src/components/templates/EventManagementTemplate.tsx` (Zeilen 16, 117-118)
    **Build Status**: ✓ Client 5.21s, PM2 neu gestartet
    **Template Entscheidung**: Templates NICHT zusammenführen ✅
    - EventManagementTemplate: Für Event-bezogene Seiten (einfacher, Event-Kontext)
    - DatabaseManagementTemplate: Für DB-Verwaltung (Pagination, komplexe Filter)
    - Gemeinsame Components nutzen (LanguageSwitcher, UnifiedActionButtons, etc.)
    - Separation of Concerns beibehalten


51. ~~macht das sinn UnifiedHeader und UnifiedPageHeader zusammenzuführen?~~ ✅
    **Status**: ✅ Abgeschlossen - UnifiedHeader.tsx gelöscht, UnifiedPageHeader ist die einzige Header-Komponente
    **Problem**: Code-Duplikation zwischen UnifiedHeader.tsx und UnifiedPageHeader.tsx
    **Analyse**: 
    - UnifiedHeader.tsx wurde NIRGENDWO mehr verwendet (0 imports gefunden)
    - UnifiedPageHeader.tsx wird von 15+ Seiten aktiv verwendet
    - Beide Komponenten hatten fast identische Funktionalität
    **Lösung**: 
    - UnifiedHeader.tsx gelöscht (287 Zeilen obsoleter Code)
    - Keine Migration nötig, da keine aktive Verwendung
    - UnifiedPageHeader bietet alle notwendigen Features
    **Vorteile**:
    - ✅ DRY-Prinzip: Nur noch eine Header-Komponente
    - ✅ Wartbarkeit: Änderungen nur an einer Stelle
    - ✅ Konsistenz: Garantiert einheitliches Look & Feel
    - ✅ Vollständig lokalisiert: Profitiert von Point 49
    **Features von UnifiedPageHeader**:
    - Filters & Search mit Toggle
    - Actions (Add, Import, Export CSV/PDF, Print)
    - View Toggle (Table/Grid)
    - Event Context Display
    - Help Panel mit Toggle
    - Custom Actions
    - Language Switcher integriert
    - Responsive Design
    **Dokumentation**: Siehe `POINT-51-UNIFIED-HEADER-CLEANUP.md`
    **Gelöschte Dateien**: `client/src/components/UnifiedHeader.tsx`
    **Bereinigte Code-Duplikation**: ~280 Zeilen 

52. Browser Icon ✅
bitte ein browser icon hinzufügen. am besten das, welches auch bei der QT implementierung als Programm-Icon verwendet wurde 
für das Jury-Portal & den Server
    **Status**: ✅ Abgeschlossen
    **Implementierung**:
    - Qt-Icon `resources/turnfix.ico` als Favicon verwendet (Windows)
    - PNG-Version `resources/icons/turnfix-gross.png` für iOS/iPad hinzugefügt
    - Kopiert nach `client/public/favicon.ico` und `apple-touch-icon.png`
    - Kopiert nach `jury-portal/public/favicon.ico` und `apple-touch-icon.png`
    - HTML-Referenzen aktualisiert in beiden `index.html` Dateien
    - Vite-Standard-Icon (vite.svg) ersetzt durch turnfix.ico
    - Zusätzliche PNG-Icons für mobile Kompatibilität (192x192, Apple Touch Icon)
    - Client neu gebaut (7.58s)
    - Jury-Portal neu gebaut (2.18s)
    - PM2 Server neu gestartet
    **Resultat**:
    - ✅ Einheitliches Branding zwischen Desktop (Qt) und Web Version
    - ✅ TurnFix-Icon sichtbar in Browser-Tabs für Client & Jury-Portal
    - ✅ iOS/iPad Unterstützung mit PNG-Icons (Apple Touch Icon)
    - ✅ Automatisch in Production-Build integriert (dist/favicon.ico, apple-touch-icon.png)
    **Betroffene Dateien**:
    - `client/public/favicon.ico` (NEU - Windows)
    - `client/public/apple-touch-icon.png` (NEU - iOS/iPad)
    - `client/public/favicon-192.png` (NEU - Android)
    - `jury-portal/public/favicon.ico` (NEU - Windows)
    - `jury-portal/public/apple-touch-icon.png` (NEU - iOS/iPad)
    - `jury-portal/public/favicon-192.png` (NEU - Android)
    - `client/index.html` (Zeile 5-7: icon links aktualisiert)
    - `jury-portal/index.html` (Zeile 5-7: icon links aktualisiert)

53. ~~Riegen status~~ ✅
~~Hier wird nichts angezeigt.~~ ✅
    **Status**: ✅ Abgeschlossen - Squad Status mit automatischer Generierung funktioniert
    **Problem 1**: Seite blieb leer wenn kein Event ausgewählt → ✅ Behoben
    **Problem 2**: Keine Daten für ausgewählte Veranstaltung → ✅ Hilfreiche Meldung hinzugefügt
    **Problem 3**: User hatte Riegen mit Teilnehmern, aber tfx_riegen_x_disziplinen Tabelle leer → ✅ Auto-Generate Funktion hinzugefügt
    
    **Root Causes**: 
    1. useEffect prüfte nur `if (selectedEventId)` was auch für leeren String `''` true ist
    2. API-Call wurde mit leerem eventId Parameter ausgeführt und schlug fehl
    3. Keine Hilfe wenn tfx_riegen_x_disziplinen Tabelle leer ist
    4. **HAUPTPROBLEM**: Tabelle wird nicht automatisch befüllt wenn Teilnehmer Riegen zugewiesen werden
    
    **Lösungen**: 
    **Lösung 1 - Kein Event ausgewählt**:
    - useEffect prüft jetzt `if (selectedEventId && selectedEventId !== '')`
    - Bei leerem selectedEventId wird `loadEvents()` aufgerufen statt `loadData()`
    - Neue Event-Auswahl-Ansicht mit Icon und Dropdown
    
    **Lösung 2 - Keine Daten vorhanden**:
    - Erweiterte "Keine Daten"-Meldung mit Hilfe-Box
    - 3-Schritte-Anleitung zum Erstellen von Riege-Disziplin-Zuordnungen:
      1. Gehen Sie zu 'Riegen verwalten'
      2. Erstellen Sie Riegen und weisen Sie Teilnehmer zu
      3. System erstellt automatisch die Kombinationen
    - Hinweis: "Riege-Disziplin-Kombinationen werden automatisch generiert"
    - Blauer Info-Kasten mit strukturierter Anleitung
    
    **Lösung 3 - Auto-Generate Funktion (NEU)**:
    - Neue Backend-Route: `POST /api/squad-disciplines/generate`
    - Analysiert vorhandene Riegen aus tfx_wertungen (via var_riege)
    - Analysiert vorhandene Disziplinen aus tfx_wettkaempfe_x_disziplinen
    - Erstellt automatisch alle Kombinationen (Riegen × Disziplinen)
    - Vermeidet Duplikate durch Existenz-Check
    - Verwendet Default-Status aus tfx_status
    - Frontend: Lila "Kombinationen automatisch generieren" Button mit Sparkles-Icon
    - Zeigt Erfolgsmeldung mit Statistik (neu erstellt, bereits vorhanden, gesamt)
    
    **Backend Implementation**:
    - File: `server/src/routes/squad-disciplines.ts`
    - Neue Route mit Validation Schema
    - Umfangreiches Logging für Debug-Zwecke
    - Intelligente Duplikat-Vermeidung mit Set-basiertem Check
    - Batch-Insert mit Prisma createMany
    
    **Frontend Implementation**:
    - File: `client/src/pages/SquadStatusManagement.tsx`
    - SparklesIcon aus Heroicons hinzugefügt
    - generateCombinations() Funktion mit Loading-State
    - Button als customAction in UnifiedPageHeader
    - Alert mit detaillierter Erfolgsstatistik
    - Automatisches Reload nach erfolgreicher Generierung
    
    **Neue Translation Keys** (de.json + en.json):
    - squadStatus.generateButton: "Kombinationen automatisch generieren" / "Auto-generate Combinations"
    - squadStatus.generating: "Generiere..." / "Generating..."
    - squadStatus.generateSuccess: Erfolgsmeldung
    - squadStatus.generateError: Fehlermeldung
    - squadStatus.created: "Neu erstellt" / "Newly created"
    - squadStatus.existing: "Bereits vorhanden" / "Already existing"
    - squadStatus.total: "Gesamt" / "Total"
    - squadStatus.autoGenerateInfo: Info-Text über Auto-Generate Button
    
    **Test-Ergebnis**:
    - Event 59 hatte 11 Riegen mit 121 Teilnehmern
    - 7 Disziplinen in Wettkämpfen konfiguriert
    - Auto-Generate erstellte erfolgreich 77 Kombinationen (11×7)
    - Alle Kombinationen werden jetzt auf Squad Status Seite angezeigt
    
    **Features**:
    - ✅ Klare Meldung wenn kein Event ausgewählt
    - ✅ Event-Dropdown wird angezeigt wenn verfügbar
    - ✅ Hilfreiche Anleitung wenn keine Daten vorhanden
    - ✅ Erklärt wie Daten erstellt werden
    - ✅ **NEU**: Ein-Klick Auto-Generierung für existierende Riegen/Disziplinen
    - ✅ Konsistentes UI mit UnifiedPageHeader
    - ✅ Keine leere Seite mehr
    
    **Workflow für User**:
    1. Veranstaltung auswählen
    2. Falls leer: 
       - **SCHNELL**: Button "Kombinationen automatisch generieren" klicken ✨
       - **ODER**: Manuelle Anleitung befolgen → "Riegen verwalten" öffnen
    3. Squad Status zeigt dann automatisch alle Kombinationen
    
    **Dateien**:
    - Backend: `server/src/routes/squad-disciplines.ts` (neue POST /generate Route)
    - Frontend: `client/src/pages/SquadStatusManagement.tsx` (generateCombinations + Button)
    - Translations: `client/src/i18n/locales/de.json` + `en.json` (8 neue Keys)
    
    **Build Status**: ✓ Client 6.03s, Server kompiliert, PM2 neu gestartet
    **Test**: http://localhost:3001/squad-status - 77 Kombinationen erfolgreich erstellt und angezeigt

54. Jury Portal
Automatisch filtern der Events auf den heutigen Tag (default), soll aber in den Einstellungen deaktiviert werden können für development zwecke. 

55. ~~Tabelle lässt sich nicht sortieren~~ ✅
~~a) http://localhost:3001/squad-status?eventId=59&squadName=mBlau~~ ✅
    **Status**: ✅ Abgeschlossen - Squad Status Tabelle vollständig sortierbar
    **Problem**: Table headers waren nicht klickbar für Sortierung
    **Lösung**: 
    - SortableTableHeader Component und useTableSort Hook implementiert
    - 5 sortierbare Spalten hinzugefügt:
      * Squad (squadName)
      * Discipline (disciplineName)
      * Status (status.name mit custom valueExtractor)
      * Round (round)
      * First Apparatus (isFirstApparatus)
    - Custom value extractor für nested property `status.name`
    - Sortierung funktioniert in Table-View und Grid-View
    **Features**:
    - Click-to-Sort: Aufsteigend/Absteigend Toggle
    - Visuelle Indikatoren: ↑ ↓ Pfeile zeigen aktive Sortierung
    - Funktioniert mit gefilterten Daten
    - Case-insensitive String-Sortierung
    - Konsistentes Pattern wie Point 33 (DisciplinesUnified, ParticipantsUnified, etc.)
    **Datei**: `client/src/pages/SquadStatusManagement.tsx`
    **Build Status**: ✓ 2207 modules, 5.41s, keine Fehler
    **Pattern**: useTableSort() Hook → sortData() → SortableTableHeader Props

~~b) http://localhost:3001/competition-status?eventId=59&squadName=mBlau~~ ✅
    **Status**: ✅ Abgeschlossen (Prio 3) - Competition Status Tabelle vollständig sortierbar in Table und Grid View
    **Problem**: Grid View verwendete `filteredCompetitions` statt `sortedFilteredCompetitions`, wodurch Sortierung nur in Table View funktionierte
    **Root Cause**: 
    - Table View (Zeile 446): Korrekt `sortedFilteredCompetitions.map()` 
    - Grid View (Zeile 535): Falsch `filteredCompetitions.map()` ohne Sortierung
    - useTableSort Hook war bereits importiert und konfiguriert
    - SortableTableHeader Components waren bereits implementiert (5 Spalten)
    **Lösung**:
    - Grid View von `filteredCompetitions` auf `sortedFilteredCompetitions` umgestellt
    - TypeScript-Fehler behoben: Expliziter Typ für status Parameter in map()
    - Value extractor erweitert um `number` und `round` Felder für zukünftige Erweiterungen
    **Sortierbare Spalten** (5):
    1. Competition (name) - Wettkampfname
    2. Age Group (ageFrom) - Altersgruppe von-bis
    3. Gender (gender) - Geschlecht (männlich/weiblich)
    4. Overall Status (overallStatus) - Gesamtstatus (completed/in_progress/not_started)
    5. Progress (progress) - Fortschritt in % (berechnet aus completedSquadDisciplines/totalSquadDisciplines)
    **Value Extractor Felder**: name, number, round, ageFrom, gender, overallStatus, progress
    **Features**:
    - Sortierung funktioniert jetzt in beiden Views (Table + Grid)
    - Konsistente Datendarstellung zwischen Views
    - Custom value extractor für berechnete Werte (z.B. progress percentage)
    - Visuelles Feedback mit ↑ ↓ Pfeilen
    **Dateien**: `client/src/pages/CompetitionStatusManagement.tsx` (Zeilen 296-304, 535)
    **Build Status**: ✓ 2237 modules, 7.28s, keine Fehler
    **Test URL**: http://localhost:5173/competition-status?eventId=59&squadName=mBlau


56. Prio 5 Doppelte Info
Beschreibung und Zusätzliche Informationen ist das enthält die gleiche Information. Wenn es das nicht separat in der DB gibt, dann sollte Zusätzliche Informationen weg. 
http://localhost:3001/event-management?eventId=59&squadName=mBlau

57. Prio 5 Punkte Validierung nach max. Punktzahl in der UI Wertungserfassung. Falls die Validierung fehl schlägt, soll das Feld Rot umrahmt werden. Der wert soll aber trotzdem übernommen werden. 

58. Prio 4 Disziplingruppen nicht auswählbar in Wettkampf bearbeiten 
http://localhost:3001/competitions?eventId=77&squadName=m

~~59. Prio 2 Auf der Seite passen die Statistik nicht von männlich und weiblich~~ ✅
~~http://localhost:3001/event-management?eventId=53&squadName=m~~
~~Vielleicht wäre es sinnvoll. Die selection des Gender in dem Server zu machen statt in der UI?~~ ✅
    **Status**: ✅ Abgeschlossen - Gender-Statistiken zeigen jetzt korrekte Werte für gesamte Veranstaltung
    **Problem**: squadName URL-Parameter wurde an Statistics API gesendet und verfälschte die Haupt-Statistiken
    **Root Cause**: 
    - Frontend: EventManagement.tsx sendete squadName Parameter an `/events/:id/statistics`
    - Backend: squadName Filter wurde auf ALLE Statistik-Queries angewendet
    - Resultat: Bei URL `?squadName=m` wurden nur Teilnehmer aus männlichen Riegen gezählt
    **Lösung Backend** (`server/src/routes/events.ts`):
    - Haupt-Statistiken (totalParticipants, maleParticipants, femaleParticipants) zeigen IMMER komplette Veranstaltung
    - squadName Filter wird nur auf Detail-Breakdowns angewendet (clubBreakdown, ageGroups, disciplines)
    - Separate WHERE-Clause für Haupt-Stats ohne squadName
    **Lösung Frontend** (`client/src/pages/EventManagement.tsx`):
    - squadName Parameter wird NICHT mehr an Statistics API gesendet
    - Nur gender und club Filter werden optional weitergeleitet
    - Kommentar hinzugefügt: "Main statistics should show entire event"
    **Resultat**: 
    - Event 53 zeigt jetzt korrekt: 105 Teilnehmer gesamt, 20 männlich, 6 weiblich
    - Unabhängig vom squadName URL-Parameter
    - Detail-Breakdowns können optional gefiltert werden
    **Dateien**: 
    - `server/src/routes/events.ts` (Zeilen 2310-2370)
    - `client/src/pages/EventManagement.tsx` (Zeilen 167-183)
    **Build Status**: ✓ Server + Client kompiliert, PM2 neu gestartet

~~60. Prio 2 Neu hinzugefügte Athletes werden nicht beim wettkampf zum hinzufügen angezeigt. Jonathan Bader~~ ✅
    **Status**: ✅ Vollständig abgeschlossen - Alle Athletes aus Datenbank werden im Add Modal angezeigt
    **Problem 1**: Neu hinzugefügte Athletes (z.B. "Jonathan Bader") wurden nicht im "Add Participant to Event" Modal angezeigt
    **Problem 2**: Modal zeigte nur die ersten 50 Athletes aus der Datenbank
    **Root Causes**:
    - Available Participants wurden nur beim ersten Laden geladen (nicht wenn Modal geöffnet wird)
    - Backend `/participants` API hat Default limit=50
    - Frontend sendete keinen limit Parameter → nur erste 50 Athletes wurden geladen
    - Neu hinzugefügte Athletes waren nicht in den ersten 50
    **Lösung 1 - Modal Refresh** (`client/src/pages/EventParticipants.tsx` Zeilen 384-389):
    - useEffect hinzugefügt mit `showAddModal` dependency
    - Lädt availableParticipants neu JEDES Mal wenn Modal geöffnet wird
    - Console Log: "🔄 Add Modal opened - refreshing available participants..."
    **Lösung 2 - Cache-Busting** (`client/src/pages/EventParticipants.tsx` Zeile 431):
    - Timestamp-Parameter hinzugefügt: `?_t=${Date.now()}`
    - Verhindert gecachte API-Antworten
    - Garantiert frische Daten bei jedem Load
    **Lösung 3 - HAUPTFIX: Limit erhöht** (`client/src/pages/EventParticipants.tsx` Zeile 431):
    - API-Call geändert von `/participants?_t=...` zu `/participants?limit=10000&_t=...`
    - Lädt jetzt ALLE Athletes aus der Datenbank (nicht nur erste 50)
    - 10000 ist hoch genug für realistische Szenarien
    **Zusätzliche Verbesserungen**:
    - Console Logs hinzugefügt: "🔄 Available participants data loaded", "✅ Loaded X participants"
    - Besseres Error-Handling beibehalten
    **Resultat**: 
    - Add Modal zeigt jetzt ALLE Athletes aus der Datenbank
    - "Jonathan Bader" und alle anderen neu hinzugefügten Personen sind sofort verfügbar
    - Modal refresht automatisch bei jedem Öffnen
    **Dateien**: `client/src/pages/EventParticipants.tsx` (Zeilen 384-389, 426-465)
    **Build Status**: ✓ Client kompiliert

~~61. Prio 2 Layout editor hat häufig fehler.~~ ✅
~~z.B. Ein DB-Feld oder Bild hinzugefügt und gespeichert:~~ ✅
~~POST http://localhost:3001/api/layouts/28/fields~~ ✅
~~[HTTP/1.1 400 Bad Request 13ms]~~ ✅
~~API request failed for /api/layouts/28/fields : Error: Validation error~~ ✅
    **Status**: ✅ Abgeschlossen - Layout Fields können ohne Validierungsfehler hinzugefügt werden
    **Problem**: Backend Validation Schema war zu streng für x/y Koordinaten
    **Root Cause**: 
    - Zod Schema validierte `x: z.number().min(0)` und `y: z.number().min(0)`
    - Während des Editierens können Koordinaten temporär negativ sein
    - Koordinaten außerhalb [0,1] Range waren möglich bei Drag & Drop
    - Validation schlug fehl bevor UI-Constraints greifen konnten
    **Lösung** (`server/src/routes/layouts.ts` Zeilen 301-323):
    - x und y Koordinaten: `z.number()` ohne min(0) Constraint
    - Erlaubt beliebige Zahlen (auch negativ oder > 1)
    - Kommentar hinzugefügt: "Coordinates can be negative or outside [0,1] range during editing"
    - Width und Height behalten min(0) Constraint (müssen positiv sein)
    **Verbessertes Error-Handling** (`server/src/routes/layouts.ts` Zeilen 305, 357-364):
    - Request Body wird komplett geloggt: `console.log('📝 Creating layout field - Request body:', JSON.stringify(req.body))`
    - Validation Success: `console.log('✅ Validation passed - Creating layout field')`
    - Validation Errors: Detailliertes Logging mit allen Zod issues
    - Error Response erweitert mit `message` Field: Zeigt exakt welches Feld das Problem verursacht
    **Resultat**: 
    - DB-Felder können hinzugefügt werden ✅
    - Bilder können hinzugefügt werden ✅
    - Bessere Fehlermeldungen bei anderen Validierungsproblemen
    - Debugging deutlich vereinfacht durch umfassendes Logging
    **Dateien**: `server/src/routes/layouts.ts` (Zeilen 301-364)
    **Build Status**: ✓ Server kompiliert, PM2 neu gestartet ✅
    s http://localhost:3001/assets/index-TsMcNJXE.js:158
    Rm http://localhost:3001/assets/index-TsMcNJXE.js:158
    Jn http://localhost:3001/assets/index-TsMcNJXE.js:158
    EE/L/k.current[X.int_layout_felderid]< http://localhost:3001/assets/index-TsMcNJXE.js:365
    setTimeout handler*L http://localhost:3001/assets/index-TsMcNJXE.js:365
    ie http://localhost:3001/assets/index-TsMcNJXE.js:362
    onClick http://localhost:3001/assets/index-TsMcNJXE.js:362
    a4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    o4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    l4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    S1 http://localhost:3001/assets/index-TsMcNJXE.js:37
    Fy http://localhost:3001/assets/index-TsMcNJXE.js:37
    Of http://localhost:3001/assets/index-TsMcNJXE.js:37
    T0 http://localhost:3001/assets/index-TsMcNJXE.js:40
    ty http://localhost:3001/assets/index-TsMcNJXE.js:37
    Of http://localhost:3001/assets/index-TsMcNJXE.js:37
    c0 http://localhost:3001/assets/index-TsMcNJXE.js:37
    S4 http://localhost:3001/assets/index-TsMcNJXE.js:37
index-TsMcNJXE.js:158:62723
Error saving field: -352 Error: Validation error
    s http://localhost:3001/assets/index-TsMcNJXE.js:158
    Rm http://localhost:3001/assets/index-TsMcNJXE.js:158
    Jn http://localhost:3001/assets/index-TsMcNJXE.js:158
    EE/L/k.current[X.int_layout_felderid]< http://localhost:3001/assets/index-TsMcNJXE.js:365
    setTimeout handler*L http://localhost:3001/assets/index-TsMcNJXE.js:365
    ie http://localhost:3001/assets/index-TsMcNJXE.js:362
    onClick http://localhost:3001/assets/index-TsMcNJXE.js:362
    a4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    o4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    l4 http://localhost:3001/assets/index-TsMcNJXE.js:37
    S1 http://localhost:3001/assets/index-TsMcNJXE.js:37
    Fy http://localhost:3001/assets/index-TsMcNJXE.js:37
    Of http://localhost:3001/assets/index-TsMcNJXE.js:37
    T0 http://localhost:3001/assets/index-TsMcNJXE.js:40
    ty http://localhost:3001/assets/index-TsMcNJXE.js:37
    Of http://localhost:3001/assets/index-TsMcNJXE.js:37
    c0 http://localhost:3001/assets/index-TsMcNJXE.js:37
    S4 http://localhost:3001/assets/index-TsMcNJXE.js:37

62. ~~Prio 1 Wertungen werden nicht richtig gespeichert. Sowohl im Jury als auch in der Wertungserfassung. Diese sind zwar synchron, aber die Werte werden nicht in Turnfix angezeigt. Wahrscheinlich wird beim Leistung erfassen die Person einem Anderen Wettkampf zusätzlich zugeordnet und darum wird die Wertung nicht in dem korrekten gespeichert.~~ ✅
    **Status**: ✅ Abgeschlossen - Daten-Synchronisation zwischen beiden Tabellen implementiert
    **Root Cause**: Web-App verwendete zwei verschiedene Tabellen für Wertungen ohne Synchronisation:
    1. **`tfx_wertungen_details`** - für normale Disziplinwerte (`/api/scores/save-value`)
    2. **`tfx_jury_results`** - für Jury-Feldwerte (`/api/jury-results/save-field-score`)
    **Problem**: Qt-App benötigt konsistente Daten zwischen beiden Tabellen für JOIN-Query
    **Lösung**: 
    - **ScoreSynchronizer-Klasse** erstellt (`server/src/utils/scoreSynchronizer.ts`)
    - **ensureWertungsDetailsEntry()**: Erstellt Placeholder-Einträge in tfx_wertungen_details für jeden tfx_jury_results Eintrag
    - **updateWertungsDetailsScore()**: Vereinheitlichte Score-Updates
    - **findCorrectCompetitionId()**: Intelligente Competition-Zuordnung
    **Implementierung**:
    - Beide APIs verwenden jetzt ScoreSynchronizer
    - Automatische Erstellung fehlender Einträge für Qt-Kompatibilität
    - Vereinheitlichte Competition-Assignment-Logik
    **Qt-Kompatibilität**: JOIN zwischen beiden Tabellen funktioniert jetzt korrekt

63. ~~Prio 1~~ ✅
~~die Teilnehmer sind in zwei Wettkämpfen. Ggf. ist der grund in 62.~~ ✅
~~http://localhost:3001/score-capture?eventId=59&squadName=wBlau~~ 
    **Status**: ✅ Abgeschlossen - Competition-Assignment vereinheitlicht
    **Root Cause**: Verschiedene APIs verwendeten unterschiedliche Logik für `competitionId`-Bestimmung
    **Problem**: 
    - `/scores/save-value`: Fallback auf erste verfügbare Competition (inkorrekt)
    - `/jury-results/save-field-score`: Strenge competitionId + eventId Validierung
    **Lösung**: 
    - **ScoreSynchronizer.findCorrectCompetitionId()** implementiert
    - Intelligente Logik: Prüft zuerst provided competitionId, dann Participant-Discipline-Zuordnung
    - Beide APIs verwenden jetzt dieselbe Competition-Finding-Logik
    - Automatische Ermittlung wenn competitionId fehlt oder ungültig
    **Resultat**: Teilnehmer werden konsistent der korrekten Competition zugeordnet 

64. Prio 4 Wettkampf zu Alter und Gender validieren in 
http://localhost:3001/event-participants?eventId=59&squadName=mRot 
Editfenster. 

~~65. Prio 1 Zu viele Zugriffe über diese IP. Firewallregel?~~ ✅
    **Status**: ✅ Abgeschlossen - Rate Limiting deaktiviert
    **Problem**: "Zu viele Anfragen von dieser IP" Fehlermeldung bei Multi-Client-Zugriff  
    **Lösung**: Rate Limiting vollständig deaktiviert in `server/src/index.ts`
    **Code**: `limiter` und `app.use(limiter)` auskommentiert
    **Kommentar**: "Rate limiting is fully disabled for all IPs"
    **Ergebnis**: Keine IP-basierten Request-Limits mehr, Multi-Client-Zugriff funktioniert

~~66. Prio 3 Wenn jemand als "nimmt nicht teil" gekennzeichnet ist, darf er trotz wertungen nicht in der siegerliste auftauchen~~ ✅
    **Status**: ✅ Abgeschlossen (Prio 3) - Teilnehmer mit "nimmt nicht teil" werden aus Siegerauswertung ausgeschlossen
    **Problem**: Teilnehmer, die als "nimmt nicht teil" markiert sind, erschienen trotzdem in der Siegerliste/Ergebnissen
    **Root Cause**: Results.tsx filterte nicht nach dem `startet_nicht` (bol_startet_nicht) Feld
    **Lösung**: 
    - Participant Interface erweitert um `startet_nicht?: boolean` Feld
    - Filter vor map() hinzugefügt: `.filter((participant: any) => !participant.startet_nicht)`
    - Feld wird von `/event-participants` API mitgeliefert
    **Implementierung**:
    ```typescript
    const participantsList: Participant[] = participants
      .filter((participant: any) => !participant.startet_nicht) // Exclude "does not participate"
      .map((participant: any) => {
        // ... participant mapping
        startet_nicht: participant.startet_nicht || false,
        // ...
      })
    ```
    **Effekt**: 
    - Teilnehmer mit `bol_startet_nicht = true` erscheinen nicht in Ranglisten
    - Gilt für Single Competition View und Competition Groups View
    - Ranking-Berechnung erfolgt ohne diese Teilnehmer
    - Ränge werden korrekt ohne Lücken vergeben
    **Datenbank-Feld**: `tfx_wertungen.bol_startet_nicht` (Boolean)
    **API-Feld**: `startet_nicht` in `/event-participants` Response
    **Dateien**: `client/src/pages/Results.tsx` (Zeilen 19-26, 328-330, 343)
    **Build Status**: ✓ 2237 modules, 5.67s, keine Fehler
    **Test**: Teilnehmer mit startet_nicht=true erscheinen nicht in Results
    **Resultat**: Siegerlisten zeigen nur aktiv teilnehmende Athleten

~~67. Prio 1. Siehe auch 65.~~ ✅
~~Ich bekomme immer die FEhlermeldung: "Zu viele Anfragen von dieser IP" wenn ich mit einem anderen Rechner auf diesen Server zugreife. bitte beheben.~~ ✅  
~~Vielleicht wäre es auch gut sich auf Änderungen zu registrieren und bei einer Änderung in der DB (z.b. über zyklische abfrage jede Minute), dass sich der Server den Wert in der UI ändert.~~ ✅
    **Status**: ✅ Vollständig abgeschlossen - Rate Limiting deaktiviert + Socket.IO implementiert
    **Problem 1**: "Zu viele Anfragen von dieser IP" → ✅ Gelöst durch Rate Limiting Deaktivierung
    **Problem 2**: Live Updates für DB-Änderungen → ✅ Gelöst durch Socket.IO Real-time Updates
    **Socket.IO Implementation**:
    - **Client**: `socket.io-client` + `socket.ts` Utils
    - **Server**: `socket.io` WebSocket Server 
    - **Real-time Events**: score-update, result-update, medal-update
    - **Auto-Reconnection**: 5 attempts, 1s delay
    **Bessere Lösung als zyklische Abfrage**: Echte Real-time Updates via WebSockets statt Polling

68. pdf dokumente serverseitig generieren und dann runterladen. 
-> Erledigt! 

~~70. Prio 2 bei den Wettkampfergebnissen muss der Filter erweitert werden um gender~~ ✅
    **Status**: ✅ Abgeschlossen (Prio 2) - Gender-Filter in Wettkampfergebnissen korrekt implementiert und lokalisiert
    **Problem**: Gender-Filter war bereits in der UI vorhanden, aber verwendete englische Werte ('male', 'female', 'other') während die Datenbank deutsche Werte speichert ('männlich', 'weiblich', 'gemischt')
    **Root Cause**: 
    - Backend API `/event-participants` gab englische Gender-Werte zurück: 'male', 'female', 'other'
    - Frontend Filter-Optionen verwendeten ebenfalls englische Werte
    - Datenbank speichert deutsche Werte: int_geschlecht = 1 ('männlich'), 2 ('weiblich'), 0 ('unbekannt')
    - Filter funktionierte nicht, da Vergleich 'male' !== 'männlich' immer false ergab
    **Lösung**:
    1. **Backend** (`server/src/routes/eventParticipants.ts`):
       - CASE-Statement in SQL-Queries geändert: 'male'→'männlich', 'female'→'weiblich', 'other'→'unbekannt' (Zeilen 53-57, 199-203)
       - TypeScript Type-Annotations aktualisiert: `'male' | 'female'` → `'männlich' | 'weiblich' | 'unbekannt'` (Zeilen 169, 226)
       - Prisma-Mapping angepasst für alle Participant-Queries (3 Stellen)
       - Update-Logic korrigiert: `gender === 'male'` → `gender === 'männlich'` (Zeile 675)
    2. **Frontend** (`client/src/pages/Results.tsx`):
       - Filter-Optionen von englisch auf deutsch umgestellt (Zeile 128-131)
       - Fallback-Wert korrigiert: `'other'` → `'unbekannt'` (Zeile 337)
       - Lokalisierungs-Keys hinzugefügt statt Hardcoded Strings
    3. **Lokalisierung** (`client/src/i18n/locales/`):
       - Neue Filter-Keys in de.json und en.json hinzugefügt:
         * `results.filters.competition` - "Wettkampf" / "Competition"
         * `results.filters.gender` - "Geschlecht" / "Gender"
         * `results.filters.male` - "Männlich" / "Male"
         * `results.filters.female` - "Weiblich" / "Female"
         * `results.filters.both` - "Gemischt" / "Mixed"
         * `results.filters.unknown` - "Unbekannt" / "Unknown"
    **Filter-Optionen**: Wettkampf (Competition), Geschlecht (männlich/weiblich/gemischt)
    **Filter-Logic**: Zeilen 1183-1190 (filteredRanking), 1228-1238 (filteredCompetitionGroups)
    **Kompatibilität**: GenderBadge Component unterstützt bereits beide Formate via normalizeGender()
    **Dateien**: 
    - Backend: `server/src/routes/eventParticipants.ts` (4 Änderungen)
    - Frontend: `client/src/pages/Results.tsx` (2 Änderungen)
    - Lokalisierung: `client/src/i18n/locales/de.json`, `en.json`
    **Build Status**: 
    - ✓ Server: tsc kompiliert, PM2 restart count 16
    - ✓ Client: 2237 modules, 5.76s, keine Fehler
    **Test URL**: http://localhost:5173/results?eventId=59
    **Resultat**: Gender-Filter funktioniert jetzt korrekt mit deutschen Datenbankwerten und zeigt lokalisierte Labels

~~71. Prio 3 Auf der Seite~~ ✅
~~http://localhost:3001/results?eventId=59&squadName=mRot~~
~~Müssen alle Werte ohne Scrollen dargestellt werden. z.B. über insgesamt breitere Tabelle (aber dann im TEmplate) oder über eine möglichkeit die Einzelwertungen auszublenden.~~ ✅
    **Status**: ✅ Abgeschlossen (Prio 3) - Toggle-Button zum Ein-/Ausblenden von Einzelwertungen implementiert
    **Problem**: Tabelle wurde bei vielen Disziplinen sehr breit und erforderte horizontales Scrollen
    **Lösung**: 
    - Toggle-Button "Details anzeigen/ausblenden" als customAction im UnifiedPageHeader
    - State `showDisciplineScores` (default: true) steuert Sichtbarkeit der Disziplin-Spalten
    - Button zeigt Icon 📊 und aktuellen Status
    - Conditional Rendering: `{showDisciplineScores && disciplines.map(...)}`
    - Funktioniert in beiden Ansichten:
      * Single Competition View (Zeilen 1386-1388, 1442-1456)
      * Competition Groups View (Zeilen 1509-1529, 1565-1579)
    **Features**:79. Es gibt ja diese Live-Updates der Wertungen. Für diese benötige ich eine 
    - Kompakte Ansicht: Nur Rang, Startnummer, Name, Verein, Alter, Gesamtwertung
    - Detail-Ansicht: Zusätzlich alle Einzelwertungen pro Disziplin
    - Visuelles Feedback: Button-Farbe ändert sich (blau aktiv, grau inaktiv)
    - Tooltip zeigt vollständigen Text
    - State bleibt während Navigation erhalten
    **UI-Pattern**: Konsistent mit anderen Toggle-Funktionen (Filter, View-Mode)
    **Lokalisierung**: 
    - `results.showDetails` / `results.hideDetails`
    - `results.showDisciplineScores` / `results.hideDisciplineScores`
    **Dateien**: 
    - Frontend: `client/src/pages/Results.tsx` (6 Änderungen)
    - Lokalisierung: `client/src/i18n/locales/de.json`, `en.json`
    **Build Status**: ✓ 2237 modules, 6.12s, keine Fehler
    **Test URL**: http://localhost:5173/results?eventId=59&squadName=mRot
    **Resultat**: Tabelle passt nun ohne Scrollen auf den Bildschirm wenn Details ausgeblendet sind
 
~~72. Prio 3 Die Tabellen auf dieser Seite müssen nach der Wettkampfnummer sortiert werden:~~ ✅
~~http://localhost:3001/results?eventId=59&squadName=mRot~~ ✅
    **Status**: ✅ Abgeschlossen (Prio 3) - Competition Groups werden jetzt nach Wettkampfnummer sortiert
    **Problem**: Competition Groups wurden alphabetisch nach Name sortiert statt nach Wettkampfnummer
    **Root Cause**: Sortierung verwendete nur `competitionName.localeCompare()` (Zeile 438)
    **Lösung**: Intelligente Sortierung implementiert mit 3-stufiger Logik:
    1. **Beide haben Nummer**: Sortierung nach Nummer (numerisch, z.B. "1" vor "10")
    2. **Nur eine hat Nummer**: Competition mit Nummer kommt zuerst
    3. **Keine haben Nummer**: Fallback auf alphabetische Sortierung nach Name
    **Sortier-Logik**:
    ```typescript
    groups.sort((a, b) => {
      const compA = availableCompetitions.find(c => c.id === a.competitionId)
      const compB = availableCompetitions.find(c => c.id === b.competitionId)
      
      if (compA?.number && compB?.number) {
        return compA.number.localeCompare(compB.number, undefined, { numeric: true })
      }
      if (compA?.number && !compB?.number) return -1
      if (!compA?.number && compB?.number) return 1
      return a.competitionName.localeCompare(b.competitionName)
    })
    ```
    **Features**:
    - Numerische Sortierung: "1", "2", "10" statt "1", "10", "2"
    - Robuste Fallbacks für fehlende Nummern
    - Kompatibel mit verschiedenen Nummerierungsformaten
    **Dateien**: `client/src/pages/Results.tsx` (Zeilen 438-453)
    **Build Status**: ✓ 2237 modules, 7.08s, keine Fehler
    **Test URL**: http://localhost:5173/results?eventId=59&squadName=mRot
    **Resultat**: Competition Groups werden korrekt nach Wettkampfnummer sortiert angezeigt

72. Prio 4 http://localhost:3001/results?eventId=77&squadName=mRot
Der Button "Print" muss besser heißen z.B. "Generate Certificats PDF"

~~73. Prio 4 Die UI für das Jury-Portal muss überarbeitet werden:~~ ✅
~~Es muss immer die Liste aller Teilnehmer sichtbar sein.~~ ✅
~~Ich könnte mir so etwas vorstellen:~~ ✅
~~- Es wird die Liste aller Turner links dargestellt~~ ✅
~~- Der aktuelle Turner wird in der Liste selektiert und die Eingabe der Wertung hervorgehoben (wie sie bisher aus sah)~~ ✅ 
~~- Die Eingabe der Wertung wird auf der Rechten Seite dargestellt, wie so ein großer Pfeil.~~ ✅
    **Status**: ✅ Vollständig implementiert - Split-View Layout für Jury-Portal
    **Implementierung**:
    **Layout**: ✅ Split-View mit scrollbarer Teilnehmerliste links (w-2/5 lg:w-1/3) und fixierter Eingabe rechts
    **Teilnehmerliste**: ✅ Scrollbar NUR in linker Liste, mit Startnummern-Badge, Status-Anzeige, Fortschrittsbalken
    **Eingabe**: ✅ Große Score-Eingabe rechts, komplett sichtbar ohne Scrollen, optimiert für Querformat
    **Header**: ✅ Minimiert für Querformat (p-2 sm:p-4, kleinere Icons/Text)
    **Mobile**: ✅ Touch-optimiert, landscape-first Design, kompakte Elemente
    **Navigation**: ✅ Vor/Zurück-Buttons, direktes Anklicken von Teilnehmern in Liste
    **Visual Feedback**: ✅ Aktueller Teilnehmer highlighted, erledigte grün markiert
    **File**: `jury-portal/src/components/JuryPortal.tsx` Lines 695-936

~~74. Statt Point 67. wäre das hier denkbar:~~ ✅
~~Die Echtzeit-Updates per Socket.IO werden für mehrere Seiten benötigt:~~ ✅
~~- Ergebnisse~~ ✅ 
~~- Wettkampfstatus~~ ✅
~~- Riegenstatus~~ ✅
~~- Wertungserfassung~~ ✅
~~- Medallienspiegel~~ ✅
    **Status**: ✅ Vollständig implementiert - Socket.IO Real-time Updates für alle genannten Bereiche
    **Implementierung**:
    **Wertungserfassung**: ✅ `scores.ts` emittiert `score-update` und `result-update` Events
    **Ergebnisse**: ✅ Medal Updates via `useMedals.ts` Hook mit Socket.IO Listener
    **Medallienspiegel**: ✅ Real-time Medal Updates über Socket Events
    **Wettkampfstatus**: ✅ Competition Status Updates via Socket.IO
    **Riegenstatus**: ✅ Squad Status Updates implementiert
    **Architektur**:
    - **Client**: `socket.ts` Utils mit Auto-Reconnection (5 attempts, 1s delay)
    - **Server**: Socket.IO Server auf Port 3001 mit CORS für Multi-Client
    - **Events**: score-update, result-update, medal-update, competition-update
    - **Transports**: WebSocket + Polling Fallback
    **Vorteile**: Instant Updates ohne Polling, bessere Performance, echte Real-time UX 

75. Prio 9 der TurnFix-Manager.bat hätte eigentlich neu bauen sollen. das hat er nicht. 
C:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\client> npm run build
PS C:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\server> npm run build   

76. Prio 9 Falls ein Prozess läuft und den port blokiert muss der prozess gestoppt und der Server neu gestartet werden. 

~~77. Prio 5 Im Jury-Portal muss auch das Live werte aktualisieren umgesetzt werden.~~ ✅
~~- Use Cache-Buster techniques for live updates of the client.~~ ✅
~~- Use socket.io for live updates from server to client when data changes.~~ ✅
    **Status**: ✅ Vollständig implementiert - Socket.IO Live-Updates im Jury-Portal
    **Implementierung**:
    **Socket.IO Client**: ✅ Installiert und konfiguriert in jury-portal (v4.x)
    **Socket Utils**: ✅ `jury-portal/src/utils/socket.ts` mit Auto-Reconnection (5 attempts, 1s delay)
    **Live-Updates**: ✅ Real-time Score-Updates für aktuelles Event und Gerät
    **Event Listeners**: ✅ `score-update` und `result-update` Events
    **Auto-Update**: ✅ Teilnehmerliste aktualisiert sich automatisch bei neuen Scores
    **Context-Aware**: ✅ Updates nur für aktuelles Event und Disziplin
    **Visual Feedback**: ✅ Teilnehmer-Status ändert sich live von "pending" zu "completed"
    **Architektur**: ✅ Gleiche Socket.IO-Infrastruktur wie Haupt-Client (Port 3001)
    **Files**: 
    - `jury-portal/src/utils/socket.ts` - Socket.IO Connection Manager
    - `jury-portal/src/components/JuryPortal.tsx` Lines 402-452 - Live-Update Logic
    **Bundle Size**: JS wuchs von 165KB auf 208KB (+43KB für Socket.IO Client)

78. Prio 6 Die Status Seite 
http://localhost:3001/squad-status?eventId=59&squadName=m 
sollte überarbeitet werden: 
- Das sollte besser wie die meldematrix aufgebaut sein http://localhost:3001/meldematrix
- Hierfür müsste ein template erstellt werden, dass die matrix immer gleich aussehen 
- Die Zeilen sollten die Riegenbezeichnungen haben 
- Die Spalten sollten die Gerätebezeichnungen haben 
- Die Zellen sollten den jeweiligen status anzeigen. Aber der Status sollte auch geändert werden können (auswahl als DropDown) 

79. Prio 10 Es gibt ja diese Live-Updates der Wertungen. Für diese benötige ich eine neue UI, welche die letzen Werte als Liste darstellt. Also irgendwie so: Person Wettkampf Gerät Punkte und das dann als liste mit konfigurierbaren anzahl an einträgen. Die Konfiguration muss in den Einstellungen stattfinden. Das sollte doch mit den Live-Updates möglich sein... 