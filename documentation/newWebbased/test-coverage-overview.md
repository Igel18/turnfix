# TurnFix Test-Abdeckung — Übersicht

**Stand**: 26. Februar 2026
**Gesamt**: ~2.473 Tests in ~100 Dateien

---

## Zusammenfassung

| Kategorie | Dateien | Tests |
|-----------|---------|-------|
| E2E Specs (Playwright) | 18 | 258 |
| E2E Setup/Teardown | 3 | 26 |
| Client Unit/Integration/Component (Vitest) | 30 | 786 |
| **Client Gesamt** | **51** | **1.070** |
| Server Unit/Integration/Component (Jest) | ~49 | ~1.402+ |
| **Server Gesamt** | **~49** | **~1.402** |
| **Gesamt** | **~100** | **~2.473** |

---

## Seiten/Routen — Abdeckungsstatus

### ✅ Abgedeckt (25 von 37 Routen = 67%)

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

### ❌ Nicht abgedeckt (12 von 37 Routen = 32%)

| Route | Seite | Risiko | Beschreibung |
|-------|-------|:------:|-------------|
| `/group-scoring` | GroupScoreCapture | 🔴 HOCH | Mannschafts-Wertungseingabe |
| `/team-scoring` | TeamScoreCapture | 🔴 HOCH | Team-Wertungseingabe |
| `/time-planning` | TimePlanning | 🟠 MITTEL | Komplexe Zeitplanung mit Durchgängen |
| `/squad-status` | SquadStatusManagement | 🟠 MITTEL | Riegen-Status-Verwaltung |
| `/live-scores` | LiveScoresPage | 🟠 MITTEL | Echtzeit-Ergebnisanzeige |
| `/medallienspiegel` | Medallienspiegel | 🟢 NIEDRIG | Nur Lesezugriff |
| `/areas` | Areas | 🟢 NIEDRIG | Stammdaten-CRUD |
| `/discipline-groups` | DisciplineGroupsUnified | 🟢 NIEDRIG | Stammdaten-CRUD |
| `/persons` | PersonsUnified | 🟢 NIEDRIG | Stammdaten-CRUD |
| `/certificate-layouts` | CertificateLayouts | 🟢 NIEDRIG | Urkunden-Layout-Konfiguration |
| `/status-management` | StatusUnified | 🟢 NIEDRIG | Stammdaten-CRUD |
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

### Integration Tests (~26 Dateien, ~843+ Tests)
API-Endpunkte: Associations, Competitions, Disciplines, Events, EventParticipants, Participants, Results, Scores, Squads, Teams, Venues, Clubs, Areas, Discipline-Fields, Discipline-Groups, Formulas, **Startnummern (Start Numbers)**, **Teilnehmer-Einstellungen (participantSettings)**, **Wettkampf-Einstellungen (competitionSettings)**, **Disziplin-Einstellungen (disciplineSettings)**

**Neu hinzugekommen:**

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `participantSettings.test.ts` | 23 | `bol_startet_nicht`: update-status, update-details, Effekt auf competition-status participantCount, Meldematrix/Statistiken. `bol_ak`: POST/PUT scores, DB-Verifikation, AK vs. Nicht-AK |
| `competitionSettings.test.ts` | 17 | `qualifiers` (int_qualifikation): Erstellen, Default, Update, Listenabruf. `dropWorstScore`+`dropCount` (bol_streichwertung+int_anz_streich): Alle CRUD-Szenarien. `useApparatusPoints` (bol_gerpkt): Alle CRUD-Szenarien. Kombinierte Einstellungen, Isolation zwischen Wettkämpfen |
| `disciplineSettings.test.ts` | 29 | `var_icon`, `var_kurz1/2/kuerzel`, `var_einheit`, `int_sportid`, `var_maske`, `tfx_disziplinen_felder`, `var_formel`+`int_formelid` (COALESCE-Priorität), `bol_m`/`bol_w`. Propagation: GET /disciplines/:id (Management) und GET /competitions/:id/disciplines (Jury-Portal) |

> **Letzte bestätigte Zahlen**: 49 Test-Suites, ~1.402 Tests (alle bestanden)

---

## Empfohlene nächste Tests (nach Risiko-Priorität)

### 🔴 Höchste Priorität
1. **`/group-scoring`** — Mannschaftswertung: Eingabe, Berechnung, Validierung
2. **`/team-scoring`** — Teamwertung: Eingabe, Berechnung, Validierung

### 🟠 Mittlere Priorität
3. **`/time-planning`** — Zeitplanung: Durchgänge erstellen, Zeitstrahl, Rotation
4. **`/squad-status`** — Riegen-Status: Status setzen, Workflow
5. **`/live-scores`** — Live-Ergebnisse: WebSocket-Verbindung, Echtzeit-Updates

### 🟢 Niedrige Priorität
6. **`/areas`** — CRUD analog zu anderen Stammdaten-Tests
7. **`/discipline-groups`** — CRUD analog
8. **`/persons`** — CRUD analog
9. **`/certificate-layouts`** — Layout-Konfiguration
10. **`/status-management`** — CRUD analog
11. **`/medallienspiegel`** — Nur Lesezugriff, geringe Fehleranfälligkeit
