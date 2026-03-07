# TurnFix Test-Abdeckung — Übersicht

**Stand**: 7. März 2026
**Gesamt**: ~3.470 Tests in ~149 Dateien

---

## Zusammenfassung

| Kategorie | Dateien | Tests |
|-----------|---------|-------|
| E2E Specs (Playwright) | 33 | 477 |
| E2E Setup/Teardown | 4 | 41 |
| Client Unit/Integration/Component (Vitest) | 46 | 1.171 |
| **Client Gesamt** | **83** | **1.689** |
| Server Unit/Integration/Component (Jest) | 66 | 1.781 |
| **Server Gesamt** | **66** | **1.781** |
| **Gesamt** | **~149** | **~3.470** |

---

## Seiten/Routen — Abdeckungsstatus

### ✅ Abgedeckt (37 von 37 Routen = 100%)

| Route | Seite | E2E | Integration | Component/Unit |
|-------|-------|:---:|:-----------:|:--------------:|
| `/` | Home | ✅ | — | — |
| `/login` | Login | ✅ | — | — |
| `/management` | ManagementCenter | ✅ | — | — |
| `/events` | Events | ✅ | ✅ | — |
| `/event-management` | EventManagement | ✅ | — | — |
| `/clubs` | ClubsUnified | ✅ | — | — |
| `/regions` | Regions | ✅ | ✅ | — |
| `/associations` | Associations | ✅ | — | — |
| `/participants` | ParticipantsUnified | ✅ | — | ✅ FilterMenus |
| `/disciplines` | DisciplinesUnified | ✅ | ✅ | ✅ FilterMenus |
| `/discipline-fields` | DisciplineFieldsUnified | — | ✅ disciplineSettings | — |
| `/sports` | SportsUnified | ✅ | — | — |
| `/competitions` | Competitions | ✅ | ✅ | ✅ FilterMenus, CompetitionFormModal |
| `/event-participants` | EventParticipants | ✅ | ✅ | ✅ FilterMenus |
| `/squads` | SquadManagement | ✅ | — | — |
| `/score-capture` | ScoreCapture | ✅ | — | — |
| `/results` | Results | ✅ | — | ✅ FilterMenus |
| `/configuration` | Configuration | ✅ | ✅ | — |
| `/jury` | JuryPortal | ✅ | — | — |
| `/groups` | GroupsUnified | — | ✅ | — |
| `/teams` | Teams | — | ✅ | ✅ teamsFilter |
| `/competition-status` | CompetitionStatusManagement | — | ✅ | — |
| `/meldematrix` | Meldematrix | — | ✅ | — |
| `/formulas` | FormulasUnified | 🟡 Smoke | — | — |
| `/locations` | LocationsUnified | 🟡 Smoke | — | — |
| `/group-scoring` | GroupScoreCapture | ✅ | ✅ | ✅ |
| `/team-scoring` | TeamScoreCapture | ✅ | ✅ | ✅ |
| `/time-planning` | TimePlanning | ✅ | ✅ | ✅ |
| `/squad-status` | SquadStatusManagement | ✅ | — | ✅ |
| `/live-scores` | LiveScoresPage | ✅ | — | ✅ |
| `/medallienspiegel` | Medallienspiegel | ✅ | ✅ | ✅ |
| `/areas` | Areas | ✅ | — | — |
| `/discipline-groups` | DisciplineGroupsUnified | ✅ | ✅ | — |
| `/persons` | PersonsUnified | ✅ | ✅ | — |
| `/certificate-layouts` | CertificateLayouts | ✅ | ✅ | — |
| `/documents` | Documents | — | ✅ | ✅ FileUploadButton |
| `/status-management` | StatusUnified | ✅ | ✅ | — |

---

## E2E Tests (Playwright) — Details

| Datei | Tests | Abgedeckte Seiten |
|-------|:-----:|-------------------|
| `navigation.spec.ts` | 16 | Smoke-Tests für 13 Routen, Navigationsfluss |
| `master-data.spec.ts` | 13 | `/regions` — CRUD, Suche, Ansichtswechsel |
| `master-data-sports.spec.ts` | 10 | `/sports` — CRUD, Filter, Ansichtswechsel |
| `master-data-participants.spec.ts` | 10 | `/participants` — CRUD, Filter, Ansichtswechsel |
| `master-data-disciplines.spec.ts` | 10 | `/disciplines` — CRUD, Filter, Ansichtswechsel |
| `master-data-clubs.spec.ts` | 10 | `/clubs` — CRUD, Filter, Ansichtswechsel |
| `master-data-associations.spec.ts` | 11 | `/associations` — CRUD, CSV-Export, Filter |
| `event-management.spec.ts` | 13 | `/events`, `/management`, `/event-management`, `/configuration` |
| `competition.spec.ts` | 12 | `/competitions`, `/event-participants`, `/squads` |
| `import-verification.spec.ts` | 17 | `/configuration`, `/events` — DB-Wizard, Seeding, XML-Import |
| `statistical.spec.ts` | 19 | API-Tests: Score-Counts, Duplikate, Isolation |
| `score-entry.spec.ts` | 11 | `/score-capture` — Damen/Herren Wertungseingabe |
| `results.spec.ts` | 14 | `/results` — Rankings, Gruppenansicht, Medaillenspiegel |
| `placement.spec.ts` | 17 | API-Tests: Platzierungen, Tie-Breaking, Score-Änderungen |
| `jury-portal.spec.ts` | 28 | `/jury` — Navigation, Score-Anzeige, Eingabe, Live-Updates |
| `status.spec.ts` | 19 | Riegen-/Wettkampfstatus-Übergänge, Workflow-Validierung |
| `pdf-export.spec.ts` | 25 | PDF-Export für 6 Seiten: Button, Download, **Dateigröße >1KB, keine Console-Errors** (je Seite) |
| `load-test.spec.ts` | 20 | Last-/Stresstests: Concurrent Writes, Race Conditions, Benchmarks |
| `master-data-areas.spec.ts` | 7 | `/areas` — CRUD, Suche, Ansichtswechsel, Löschen |
| `master-data-persons.spec.ts` | 8 | `/persons` — CRUD, Suche, Pflichtfelder, Ansichtswechsel |
| `master-data-discipline-groups.spec.ts` | 6 | `/discipline-groups` — CRUD, Suche, Löschen |
| `master-data-statuses.spec.ts` | 6 | `/status-management` — CRUD, Suche, Löschen |
| `master-data-certificate-layouts.spec.ts` | 6 | `/certificate-layouts` — CRUD, Detail-Ansicht, Löschen |
| `time-planning.spec.ts` | 10 | `/time-planning` — Ansichten, Durchgänge, API-Validierung |
| `group-scoring.spec.ts` | 10 | `/group-scoring` — Selektions-Panel, Dropdowns, API-Tests |
| `team-scoring.spec.ts` | 10 | `/team-scoring` — Entity-Selector, API-Tests, Validierung |
| `squad-status.spec.ts` | 16 | `/squad-status` — Matrix/Tabellen-Ansicht, Filter, API, CSV, **API-Integration (Struktur, Filter, Refresh nach Score)** |
| `live-scores.spec.ts` | 15 | `/live-scores` — Einstellungen, Socket.IO, Auto-Refresh, **Socket.IO-Integration (Score via API → Live-Feed, Reihenfolge, Teilnehmer-Infos, Timestamp)** |
| `medallienspiegel.spec.ts` | 13 | `/medallienspiegel` — Medaillentabelle, API-Standings, Statistiken, **PDF-Export (Download, Dateigröße, PDF-Header, Fehlerfreiheit)** |
| `jury-server-access.spec.ts` | 13 | Jury-Server Zugriffskontrolle: Port-Restriktionen (3002), API-Blockierung |
| `team-competition.spec.ts` | 44 | Mannschaftswettkampf: Setup, Teams, Riegen, Wertungen, Platzierungen, XML-Import |
| `squad-auto-assign.spec.ts` | 10 | Automatische Riegeneinteilung: Dialog, Kriterien, Vorschlag generieren/anwenden |
| `configuration.spec.ts` | 31 | `/configuration` — Sektionen, DB-Wizard, Druck, WiFi, Firewall, Suche, Speichern, Persistenz, Validierung |
| `formula-crossview.spec.ts` | 11 | Formel Cross-View: Self-contained Setup `5,5*x`, raw vs. transformierte Scores über API, ScoreCapture, Results |

> ✅ `configuration.spec.ts` wurde seit 7. März 2026 um 28 Tests erweitert (war zuvor 3 Tests für Wizard-Dialog).
> ✅ `formula-crossview.spec.ts` ist seit 7. März 2026 neu und prüft Formel-Konsistenz über mehrere Ansichten.

### E2E Setup/Teardown — Details

| Datei | Tests | Beschreibung |
|-------|:-----:|--------------|
| `create-event.setup.ts` | 16 | Setup Event A: Sportart, Halle, Vereine, Teilnehmer, Disziplinen, Wettkämpfe via API |
| `import-event.setup.ts` | 7 | Setup Event B: GymNet-XML-Import, Verifikation |
| `create-team-event.setup.ts` | 15 | Setup Team-Event: Mannschaftswettkampf mit 12 Teilnehmern, Teams, 48 Wertungen |
| `teardown.setup.ts` | 3 | Cleanup: Event A, Event B, State-Dateien löschen |

---

## Integration Tests (Vitest + MSW) — Details

| Datei | Tests | Abgedeckte Seiten |
|-------|:-----:|-------------------|
| `regionsPage.test.tsx` | 7 | `/regions` — Rendering, API-Daten, Suche, Laden, Fehlerbehandlung |
| `disciplinesEdit.test.tsx` | ~5 | `/disciplines` — Rendering, Erstellung mit Formel |
| `databaseSetupWizard.test.tsx` | ~49 | `/configuration` — Hook, WizardStepItem, Wizard-Integration |
| `competitionsManagement.test.tsx` | ~10 | `/competitions` — Anzeige, Ansichtswechsel, Filter, Erstellung |
| `eventParticipants.test.tsx` | ~10 | `/event-participants` — Anzeige, Suche, Zuweisung |
| `eventManagement.test.tsx` | ~10 | `/events` — Event-Liste, Status-Filter, Formvalidierung |
| `groupsTeamsManagement.test.tsx` | ~8 | `/groups`, `/teams` — Anzeige, Erstellung, Mitgliederverwaltung |
| `xmlImport.test.tsx` | 5 | `/events` — Import-Dialog, Dateiauswahl, Validierung |
| `documentsPage.test.tsx` | 13 | `/documents` — Daten laden, Filterung, Upload-Bereich, Vorschau, Löschen, Kategorien |

---

## Component & Hook Tests — Details

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `GenderBadge.test.tsx` | 16 | Geschlechts-Badge: Rendering, Normalisierung, Styling |
| `SortableTableHeader.test.ts` | 31 | Sortier-Hook: Strings, Zahlen, Daten, Nullwerte, große Datenmengen |
| `FilterMenus.test.ts` | 62 | 7 Filter-Systeme seitenübergreifend |
| `CompetitionFormModal.test.ts` | 8 | Race-Condition-Fix, Disziplin-Geschlecht-Interaktion |
| `useFormulaCalculation.test.ts` | 13 | Formel-Anzeige/Berechnung |
| `useResultsHelpers.test.ts` | 11 | Score-Formatierung, Rang-Styling |
| `useScoreValidation.test.ts` | 28 | Disziplin-/Teilnehmer-Filterung, Score-Validierung |
| `useSquadDisciplineStatus.test.ts` | 9 | Status-API, Guard-Bedingungen |
| `usePagination.test.ts` | 31 | Paginierung: Navigation, Edge-Cases |
| `GroupScoreCapture.test.tsx` | 20 | Gruppen-Wertungseingabe: Rendering, Auswahl-Workflow, Score-Berechnung, MSW-Daten |
| `TeamScoreCapture.test.tsx` | 24 | Team-Wertungseingabe: Rendering, Wettkampftyp-Filter, Disziplin-Filter, Score-Matrix |
| `LiveScoresPage.test.tsx` | 17 | Live-Ergebnisse: Rendering, Einstellungen-Persistenz (localStorage), Widget-Props |
| `Medallienspiegel.test.tsx` | 22 | Medallienspiegel: Sortierlogik, PDF-Export, Fehler-/Leer-Zustände, Statistiken |
| `SquadStatusManagement.test.tsx` | 26 | Riegen-Status: Farbparsing (JSON/rgb/hex), Filter, Matrix, CSV-Export, Statuswechsel |
| `TimePlanning.test.tsx` | 30 | Zeitplanung: Zeitberechnung, Slot-Generierung, Session-Gruppierung, Geräte-Schedule |
| `DisciplineFormModal.test.tsx` | 16 | Disziplin-Formular: Icon-Picker API-Mapping (Objekte→Strings), Suche/Filter, Submit, Edit-Modus, Fehler |
| `FileUploadButton.test.tsx` | 13 | Upload-Button: Hidden File-Input, FormData-Konstruktion, Erfolg/Fehler-Callbacks, Disabled-State, Re-Upload |
| `JuryQRCode.test.tsx` | 16 | Jury QR-Code: QR-Rendering für Jury-URLs, Voll/Kompakt-Modus, IP-Selektor, Kopieren/Refresh |
| `WifiQRCode.test.tsx` | 24 | WiFi QR-Code: WiFi-QR-String-Generierung, WPA/WEP/Open, Voll/Kompakt-Modus, Netzwerk-Selektor |
| `WifiSettings.test.tsx` | 14 | WiFi-Einstellungen: Toggle, Netzwerke hinzufügen/entfernen, QR-Vorschau, Speichern, Validierung |

---

## Utility Tests — Details

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `api.test.ts` | 18 | API-Helper: CRUD, Caching, Fehlerbehandlung |
| `csvExport.test.ts` | 34 | CSV-Escaping, Generierung, Spezialzeichen |
| `csvExportMappings.test.ts` | 24 | CSV-Mappings: Status, Scores, Teilnehmer |
| `debug.test.ts` | 25 | Debug-Modus: localStorage, URL-Parameter |
| `formulaCalculator.test.ts` | 61 | Formel-Engine: Parsing, Auswertung, BODMAS |
| `formulaUtils.test.ts` | 40 | Formel-Utilities: Symbole, Parsing, Validierung |
| `genderHelpers.test.ts` | 22 | Geschlechter-Normalisierung, DB-Mapping |
| `inputMaskUtils.test.ts` | 51 | Eingabemasken: Dezimal, Komma, Zeit |
| `pdfUtils.test.ts` | 35 | PDF-Generierung: Header, Footer, Tabellen, Badges |
| `pdfWideTable.test.ts` | 15 | Breite-Tabelle-PDF: Aufteilung, Formatierung |
| `scoreFormatter.test.ts` | 72 | Score-Formatierung: Typerkennung, Zeit, Dezimal, Runden |
| `documentsHelpers.test.ts` | 21 | Dokument-Helfer: Dateigröße-Formatierung, Kategorie-Farben, Bild-MIME-Erkennung, akzeptierte MIME-Typen |
| `imageUrlUtils.test.ts` | 33 | Bild-URL-Auflösung für LayoutDesigner: `resolveImageUrl`, `isLocalPath`, `isUploadingIndicator`, `extractFilename` |
| `liveScoreUtils.test.ts` | 6 | Live-Score Disziplinname: Vollname vs. Abkürzungs-Fallback-Logik |
| `customFormula.test.ts` | 33 | Custom-Formel-Engine: Symbol-Extraktion, Parsing, Berechnung, Validierung, `detectFormulaType`, Variablen-Substitution |

---

## Server Tests — Überblick

### Unit Tests (~27 Dateien, ~640+ Tests)
Kritische Business-Logik: Konfiguration, Disziplin-Daten, Gender-Mapping, GymNet-Presets, Formel-Berechnung, Wettkampf-Helfer, Import-Pipelines, Score-Filter, Score-Synchronisation, **Startnummer-Utilities**, **DB-Setup-Wizard (configurationDatabase)**, **Icon-Utilities**, **Konfigurations-Validierung**

### Integration Tests (~39 Dateien, ~1.141+ Tests)
API-Endpunkte: Associations, Competitions, Disciplines, Events, EventParticipants, Participants, Results, Scores, Squads, Teams, Venues, Clubs, Areas, Discipline-Fields, Discipline-Groups, Formulas, **Startnummern (Start Numbers)**, **Teilnehmer-Einstellungen (participantSettings)**, **Wettkampf-Einstellungen (competitionSettings)**, **Disziplin-Einstellungen (disciplineSettings)**, **GroupScores**, **TeamScores**, **TimePlanning**, **Medals**, **Layouts**, **Persons**, **DisciplineGroups**, **Statuses**, **Documents**

**Neu hinzugekommen:**

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `participantSettings.test.ts` | 23 | `bol_startet_nicht`: update-status, update-details, Effekt auf competition-status participantCount, Meldematrix/Statistiken. `bol_ak`: POST/PUT scores, DB-Verifikation, AK vs. Nicht-AK |
| `competitionSettings.test.ts` | 17 | `qualifiers` (int_qualifikation): Erstellen, Default, Update, Listenabruf. `dropWorstScore`+`dropCount` (bol_streichwertung+int_anz_streich): Alle CRUD-Szenarien. `useApparatusPoints` (bol_gerpkt): Alle CRUD-Szenarien. Kombinierte Einstellungen, Isolation zwischen Wettkämpfen |
| `disciplineSettings.test.ts` | 29 | `var_icon`, `var_kurz1/2/kuerzel`, `var_einheit`, `int_sportid`, `var_maske`, `tfx_disziplinen_felder`, `var_formel`+`int_formelid` (COALESCE-Priorität), `bol_m`/`bol_w`. Propagation: GET /disciplines/:id (Management) und GET /competitions/:id/disciplines (Jury-Portal) |
| `groupScores.test.ts` | 13 | `/api/scores/group` — GET mit Filtern, POST Erstellung/Upsert/Validierung, DELETE |
| `teamScores.test.ts` | 14 | `/api/scores/team` — GET mit Filtern, POST Erstellung/Upsert/Validierung, DELETE |
| `timePlanning.test.ts` | 14 | `/api/time-planning` — GET Zeitplanung/Bahnen, POST Durchgänge, PUT Bahnen/Runden |
| `medals.test.ts` | 13 | `/api/medals` — GET Übersicht/Standings/Statistiken, POST Vergabe, DELETE, Event-spezifisch |
| `layouts.test.ts` | 18 | `/api/layouts` — Vollständiges CRUD + Felder-CRUD + Duplizierung |
| `persons.test.ts` | 16 | `/api/persons` — CRUD mit Suche, Paginierung, Pflichtfeld-Validierung |
| `disciplineGroups.test.ts` | 16 | `/api/discipline-groups` — CRUD mit Disziplin-Zuweisungen, Duplikat-Prüfung |
| `statuses.test.ts` | 14 | `/api/statuses` — CRUD mit Farben, Boolean-Flags, Suche |
| `scoreValidationEdgeCases.test.ts` | 71 | Score-Validierung bei ungültigen Eingaben: Zod-Schema-Ablehnungen, Typfehler, Grenzwerte, SQL-Injection, fehlende Felder, Null/Undefined, Save-Value Manual-Validation, Group/Team/Medal Edge Cases |
| `concurrentWrites.test.ts` | 12 | Concurrent-Write-Szenarien: Gleichzeitige Score-Erstellung, Upsert Race Conditions, Duplikat-Erkennung, Read-While-Write-Konsistenz, Burst-Resilienz, Datenintegrität nach Lastspitzen |
| `documents.test.ts` | 43 | `/api/documents` — Kategorien, Datei-Listing/Filterung, Upload (MIME-Validierung), Löschen, Download, Icons-Endpunkt |
| `configurationDatabase.test.ts` | 41 | DB-Setup-Wizard (Unit): test-connection, create-database, create-schema, init-database — Mocked Prisma + child_process, Fehlerklassifizierung (AUTH_FAILED, CONNECTION_REFUSED, etc.) |
| `iconUtils.test.ts` | 16 | Qt-Ressource-Pfad → Web-URL-Konvertierung (`getIconUrl`, `getIconFilename`), Null/Leer/Ungültig-Behandlung |
| `configurationValidation.test.ts` | 15 | Konfigurations-Validierung: db_host/db_name Verwechslungsprävention, DATABASE_URL-Parsing, URL-Aufbau mit SSL |
| `configurationHelpers.test.ts` | 8 | Enum-Helfer: Gender-Werte, Wettkampf-Status, Medaillen-Typen, DB↔Teilnehmer Gender-Konvertierung |

> **Letzte bestätigte Zahlen**: 66 Test-Suites, 1.781 Tests (alle bestanden)
 
---

## Empfohlene nächste Tests (nach Risiko-Priorität)

Alle 12 zuvor nicht abgedeckten Routen sind jetzt mit Server-Integration- und/oder E2E-Tests abgedeckt.
Seit 7. März 2026: `/documents`-Route vollständig abgedeckt (Server + Client).

### Mögliche Vertiefungen
1. ~~**Component-Tests** für die neuen Seiten (GroupScoreCapture, TeamScoreCapture, etc.)~~ ✅ Erledigt (139 Tests in 6 Dateien)
2. ~~**Socket.IO-Integration** — Tiefere Tests für Live-Updates in `/live-scores` und `/squad-status`~~ ✅ Erledigt (5. März 2026: 4 Socket.IO-Tests in live-scores, 5 API-Integration-Tests in squad-status)
3. ~~**PDF-Export** — Medallienspiegel PDF-Export testen~~ ✅ Erledigt (5. März 2026: 4 Tests — Download, Dateigröße >1KB, PDF-Header `%PDF-`, Fehlerfreiheit)
4. ~~**Edge Cases** — Score-Validierung bei ungültigen Eingaben, Concurrent-Write-Szenarien für neue Endpunkte~~ ✅ Erledigt (71 + 12 = 83 Tests in 2 Dateien)
5. ~~**DB-Setup-Wizard Backend** — Server-seitige Unit-Tests für configurationDatabase-Endpunkte~~ ✅ Erledigt (7. März 2026: 41 Tests mit gemocktem Prisma + child_process)
6. ~~**Documents API** — Server-seitige Integration-Tests~~ ✅ Erledigt (7. März 2026: 43 Tests — Kategorien, Upload, MIME-Validierung, Löschen, Download)
7. ~~**Bild-URL-Utilities** — Client-seitige Unit-Tests für LayoutDesigner Image-Auflösung~~ ✅ Erledigt (7. März 2026: 33 Tests in imageUrlUtils.test.ts)

### Offene Vertiefungen
8. ~~**PDF-Export Tiefenprüfung für alle Seiten**~~ ✅ Erledigt (5. März 2026: +12 Tests in `pdf-export.spec.ts` — Dateigröße >1KB + keine Console-Errors für alle 6 Seiten)
   - ⚠️ **TimePlanning** (`/time-planning`) hat `showExportPDF=true`, ist aber bewusst nicht in `pdf-export.spec.ts` enthalten (vorerst ausgenommen)
9. **Server-seitige Socket.IO-Events für Squad-Status** — Client-Code lauscht auf `squad-status-updated` und `competition-status-updated`, aber kein Server-Route emittiert diese Events aktuell
10. **E2E DB-Setup-Wizard Durchklick** — Nur 3 oberflächliche E2E-Tests vorhanden (Button sichtbar, Dialog öffnet, Dialog schließt). Vollständiger Wizard-Durchlauf mit gemockter DB wäre wünschenswert.
