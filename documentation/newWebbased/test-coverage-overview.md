# TurnFix Test-Abdeckung — Übersicht

**Stand**: 24. Februar 2026  
**Gesamt**: ~1.430+ Tests in ~87 Dateien

---

## Zusammenfassung

| Kategorie | Dateien | Tests |
|-----------|---------|-------|
| E2E Specs (Playwright) | 14 | 169 |
| E2E Setup | 3 | 25 |
| Integration (Vitest + MSW) | 8 | ~70 |
| Component (Vitest) | 4 | 117 |
| Hook (Vitest) | 5 | 92 |
| Utility (Vitest) | 11 | 397 |
| Sonstige Client | 2 | ~11 |
| **Client Gesamt** | **47** | **~881** |
| Server Unit | ~20 | ~300+ |
| Server Integration | ~20 | ~250+ |
| **Server Gesamt** | **~40** | **~550+** |
| **Gesamt** | **~87** | **~1.430+** |

---

## Seiten/Routen — Abdeckungsstatus

### ✅ Abgedeckt (21 von 37 Routen = 57%)

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
| `/sports` | SportsUnified | ✅ | — | — |
| `/competitions` | Competitions | ✅ | ✅ | ✅ FilterMenus, CompetitionFormModal |
| `/event-participants` | EventParticipants | ✅ | ✅ | ✅ FilterMenus |
| `/squads` | SquadManagement | ✅ | — | — |
| `/score-capture` | ScoreCapture | ✅ | — | — |
| `/results` | Results | ✅ | — | ✅ FilterMenus |
| `/configuration` | Configuration | ✅ | ✅ | — |
| `/groups` | GroupsUnified | — | ✅ | — |
| `/teams` | Teams | — | ✅ | ✅ teamsFilter |
| `/formulas` | FormulasUnified | 🟡 Smoke | — | — |
| `/locations` | LocationsUnified | 🟡 Smoke | — | — |

### ❌ Nicht abgedeckt (16 von 37 Routen = 43%)

| Route | Seite | Risiko | Beschreibung |
|-------|-------|:------:|-------------|
| `/jury` | JuryPortal | 🔴 HOCH | Externe Jury-Oberfläche, kritisch für Wettkampf |
| `/group-scoring` | GroupScoreCapture | 🔴 HOCH | Mannschafts-Wertungseingabe |
| `/team-scoring` | TeamScoreCapture | 🔴 HOCH | Team-Wertungseingabe |
| `/time-planning` | TimePlanning | 🟠 MITTEL | Komplexe Zeitplanung mit Durchgängen |
| `/squad-status` | SquadStatusManagement | 🟠 MITTEL | Riegen-Status-Verwaltung |
| `/competition-status` | CompetitionStatusManagement | 🟠 MITTEL | Wettkampf-Status-Verwaltung |
| `/live-scores` | LiveScoresPage | 🟠 MITTEL | Echtzeit-Ergebnisanzeige |
| `/meldematrix` | Meldematrix | 🟠 MITTEL | Meldungs-Übersichtsmatrix |
| `/medallienspiegel` | Medallienspiegel | 🟢 NIEDRIG | Nur Lesezugriff |
| `/areas` | Areas | 🟢 NIEDRIG | Stammdaten-CRUD |
| `/discipline-fields` | DisciplineFieldsUnified | 🟢 NIEDRIG | Stammdaten-CRUD |
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
| `master-data.spec.ts` | 9 | `/regions` — CRUD, Suche, Ansichtswechsel |
| `master-data-sports.spec.ts` | 10 | `/sports` — CRUD, Filter, Ansichtswechsel |
| `master-data-participants.spec.ts` | 10 | `/participants` — CRUD, Filter, Ansichtswechsel |
| `master-data-disciplines.spec.ts` | 10 | `/disciplines` — CRUD, Filter, Ansichtswechsel |
| `master-data-clubs.spec.ts` | 10 | `/clubs` — CRUD, Filter, Ansichtswechsel |
| `master-data-associations.spec.ts` | 11 | `/associations` — CRUD, CSV-Export, Filter |
| `event-management.spec.ts` | 14 | `/events`, `/management`, `/event-management`, `/configuration` |
| `competition.spec.ts` | 10 | `/competitions`, `/event-participants`, `/squads` |
| `import-verification.spec.ts` | 14 | `/configuration`, `/events` — DB-Wizard, Seeding, XML-Import |
| `statistical.spec.ts` | 17 | API-Tests: Score-Counts, Duplikate, Isolation |
| `score-entry.spec.ts` | 11 | `/score-capture` — Damen/Herren Wertungseingabe |
| `results.spec.ts` | 13 | `/results` — Rankings, Gruppenansicht, Medaillenspiegel |
| `placement.spec.ts` | 14 | API-Tests: Platzierungen, Tie-Breaking, Score-Änderungen |

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

### Unit Tests (~20 Dateien, ~300+ Tests)
Kritische Business-Logik: Konfiguration, Disziplin-Daten, Gender-Mapping, GymNet-Presets, Formel-Berechnung, Wettkampf-Helfer, Import-Pipelines, Score-Filter

### Integration Tests (~20 Dateien, ~250+ Tests)
API-Endpunkte: Associations, Competitions, Disciplines, Events, EventParticipants, Participants, Results, Scores, Squads, Teams, Venues, Clubs, Areas, Discipline-Fields, Discipline-Groups, Formulas

---

## Empfohlene nächste Tests (nach Risiko-Priorität)

### 🔴 Höchste Priorität
1. **`/jury`** — Jury-Portal: Authentifizierung, Score-Eingabe-Flow, Echtzeit-Updates
2. **`/group-scoring`** — Mannschaftswertung: Eingabe, Berechnung, Validierung
3. **`/team-scoring`** — Teamwertung: Eingabe, Berechnung, Validierung

### 🟠 Mittlere Priorität
4. **`/time-planning`** — Zeitplanung: Durchgänge erstellen, Zeitstrahl, Rotation
5. **`/squad-status`** — Riegen-Status: Status setzen, Workflow
6. **`/competition-status`** — Wettkampf-Status: Status-Übergänge
7. **`/live-scores`** — Live-Ergebnisse: WebSocket-Verbindung, Echtzeit-Updates
8. **`/meldematrix`** — Meldematrix: Korrekte Darstellung, Filter

### 🟢 Niedrige Priorität
9. **`/areas`** — CRUD analog zu anderen Stammdaten-Tests
10. **`/discipline-fields`** — CRUD analog
11. **`/discipline-groups`** — CRUD analog
12. **`/persons`** — CRUD analog
13. **`/certificate-layouts`** — Layout-Konfiguration
14. **`/status-management`** — CRUD analog
15. **`/medallienspiegel`** — Nur Lesezugriff, geringe Fehleranfälligkeit
