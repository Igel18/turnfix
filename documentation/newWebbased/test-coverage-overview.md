# TurnFix Test-Abdeckung — Übersicht

**Stand**: 31. Oktober 2025
**Gesamt**: ~2.661 Tests in ~119 Dateien

---

## Zusammenfassung

| Kategorie | Dateien | Tests |
|-----------|---------|-------|
| E2E Specs (Playwright) | 29 | ~346 |
| E2E Setup/Teardown | 3 | 26 |
| Client Unit/Integration/Component (Vitest) | 30 | 786 |
| **Client Gesamt** | **62** | **~1.158** |
| Server Unit/Integration/Component (Jest) | ~58 | ~1.576 |
| **Server Gesamt** | **~58** | **~1.576** |
| **Gesamt** | **~119** | **~2.661** |

---

## Seiten/Routen — Abdeckungsstatus

### ✅ Abgedeckt (36 von 37 Routen = 97%)

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
| `/group-scoring` | GroupScoreCapture | ✅ | ✅ | — |
| `/team-scoring` | TeamScoreCapture | ✅ | ✅ | — |
| `/time-planning` | TimePlanning | ✅ | ✅ | — |
| `/squad-status` | SquadStatusManagement | ✅ | — | — |
| `/live-scores` | LiveScoresPage | ✅ | — | — |
| `/medallienspiegel` | Medallienspiegel | ✅ | ✅ | — |
| `/areas` | Areas | ✅ | — | — |
| `/discipline-groups` | DisciplineGroupsUnified | ✅ | ✅ | — |
| `/persons` | PersonsUnified | ✅ | ✅ | — |
| `/certificate-layouts` | CertificateLayouts | ✅ | ✅ | — |
| `/status-management` | StatusUnified | ✅ | ✅ | — |

### ❌ Nicht abgedeckt (1 von 37 Routen = 3%)

| Route | Seite | Risiko | Beschreibung |
|-------|-------|:------:|-------------|
| `/locations-debug` | LocationsDebug | ⚪ DEBUG | Debug-Seite |

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
| `jury-portal.spec.ts` | 26 | `/jury` — Navigation, Score-Anzeige, Eingabe, Live-Updates |
| `status.spec.ts` | 19 | Riegen-/Wettkampfstatus-Übergänge, Workflow-Validierung |
| `pdf-export.spec.ts` | 13 | PDF-Export für 6 Seiten: Ergebnisse, Teilnehmer, Urkunden |
| `load-test.spec.ts` | 17 | Last-/Stresstests: Concurrent Writes, Race Conditions, Benchmarks |
| `master-data-areas.spec.ts` | 7 | `/areas` — CRUD, Suche, Ansichtswechsel, Löschen |
| `master-data-persons.spec.ts` | 8 | `/persons` — CRUD, Suche, Pflichtfelder, Ansichtswechsel |
| `master-data-discipline-groups.spec.ts` | 6 | `/discipline-groups` — CRUD, Suche, Löschen |
| `master-data-statuses.spec.ts` | 6 | `/status-management` — CRUD, Suche, Löschen |
| `master-data-certificate-layouts.spec.ts` | 6 | `/certificate-layouts` — CRUD, Detail-Ansicht, Löschen |
| `time-planning.spec.ts` | 11 | `/time-planning` — Ansichten, Durchgänge, API-Validierung |
| `group-scoring.spec.ts` | 10 | `/group-scoring` — Selektions-Panel, Dropdowns, API-Tests |
| `team-scoring.spec.ts` | 11 | `/team-scoring` — Entity-Selector, API-Tests, Validierung |
| `squad-status.spec.ts` | 11 | `/squad-status` — Matrix/Tabellen-Ansicht, Filter, API, CSV |
| `live-scores.spec.ts` | 11 | `/live-scores` — Einstellungen, Socket.IO, Auto-Refresh |
| `medallienspiegel.spec.ts` | 9 | `/medallienspiegel` — Medaillentabelle, API-Standings, Statistiken |

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

---

## Server Tests — Überblick

### Unit Tests (~23 Dateien, ~560+ Tests)
Kritische Business-Logik: Konfiguration, Disziplin-Daten, Gender-Mapping, GymNet-Presets, Formel-Berechnung, Wettkampf-Helfer, Import-Pipelines, Score-Filter, Score-Synchronisation, **Startnummer-Utilities**

### Integration Tests (~35 Dateien, ~1.016+ Tests)
API-Endpunkte: Associations, Competitions, Disciplines, Events, EventParticipants, Participants, Results, Scores, Squads, Teams, Venues, Clubs, Areas, Discipline-Fields, Discipline-Groups, Formulas, **Startnummern (Start Numbers)**, **Teilnehmer-Einstellungen (participantSettings)**, **Wettkampf-Einstellungen (competitionSettings)**, **Disziplin-Einstellungen (disciplineSettings)**, **GroupScores**, **TeamScores**, **TimePlanning**, **Medals**, **Layouts**, **Persons**, **DisciplineGroups**, **Statuses**

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

> **Letzte bestätigte Zahlen**: 58 Test-Suites, 1.576 Tests (alle bestanden)

---

## Empfohlene nächste Tests (nach Risiko-Priorität)

Alle 12 zuvor nicht abgedeckten Routen sind jetzt mit Server-Integration- und/oder E2E-Tests abgedeckt.

### Mögliche Vertiefungen
1. **Component-Tests** für die neuen Seiten (GroupScoreCapture, TeamScoreCapture, etc.)
2. **Socket.IO-Integration** — Tiefere Tests für Live-Updates in `/live-scores` und `/squad-status`
3. **PDF-Export** — Medallienspiegel PDF-Export testen
4. **Edge Cases** — Score-Validierung bei ungültigen Eingaben, Concurrent-Write-Szenarien für neue Endpunkte
