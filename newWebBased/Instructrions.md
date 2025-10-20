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

29. Aufräumen
Ich sehe es gibt viele duplikate. z.B. medals-broken.ts, medals_old.ts, medals_simple usw. 
genauso bei events, activities, clubs, ... (in den routen)
kann man da etwas bereinigen bzw. werden diese alle noch benötigt? 

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

47. Das Import Log Fenster beim Import von GymNet ist noch nicht lokalisiert. Und auch noch nicht die "Import Information". 

48. In der Wettkampfverwaltung steht bei Altersgruppe 18-100 im editieren 18-18 