# Test Coverage Summary

**Stand**: 7. März 2026

## ✅ Server Tests — Alle bestanden

### Gesamtzahlen
```
✅ Test Suites: 66 passed, 66 total
✅ Tests:       1.781 passed, 1.781 total
```

### Unit Tests (27 Dateien, ~640 Tests)

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `configurationDatabase.test.ts` | 41 | DB-Setup-Wizard: test-connection, create-database, create-schema, init-database (Mocked Prisma + child_process) |
| `configurationValidation.test.ts` | 15 | Config-Validierung: db_host/db_name, DATABASE_URL-Parsing, URL-Aufbau mit SSL |
| `configurationUtils.test.ts` | — | Konfigurations-Utilities |
| `configurationHelpers.test.ts` | 8 | Enum-Helfer: Gender, Status, Medaillen-Typen, DB↔Teilnehmer Konvertierung |
| `iconUtils.test.ts` | 16 | Qt-Ressource-Pfad → Web-URL (`getIconUrl`, `getIconFilename`) |
| `disciplineData.test.ts` | — | Disziplin-Daten-Verarbeitung |
| `formulaUtils.test.ts` | — | Formel-Utilities: Parsing, Validierung |
| `builtInFormula.test.ts` | — | Built-In Formel-Engine |
| `genderHelpers.test.ts` | — | Geschlechter-Normalisierung, DB-Mapping |
| `gymnetPreset.test.ts` | — | GymNet-Preset-Daten |
| `gymnetXmlExtraction.test.ts` | — | XML-Extraktion |
| `gymnetMappingFunctions.test.ts` | — | GymNet-Mapping-Funktionen |
| `wedDisNrMapping.test.ts` | — | Wettkampf-Disziplin-Nummer-Mapping |
| `productionDisciplinesImport.test.ts` | — | Produktions-Disziplinen-Import |
| `disciplineGroupsImport.test.ts` | — | Disziplingruppen-Import |
| `sampleDataImport.test.ts` | — | Sample-Daten-Import |
| `copySharedLogic.test.ts` | — | Shared-Logic-Kopierung |
| `squadAutoAssign.test.ts` | — | Automatische Riegeneinteilung |
| `scoresJuryResultsFilter.test.ts` | — | Score-/Jury-Ergebnis-Filterung |
| `competitionHelpers.test.ts` | — | Wettkampf-Helfer-Funktionen |
| `startNumberUtils.test.ts` | — | Startnummer-Utilities |
| `routes.test.ts` | — | Route-Registrierung |
| `api.test.ts` | — | API-Helfer |
| `middleware.test.ts` | — | Express-Middleware |
| `prismaReconnect.test.ts` | — | Prisma-Reconnect-Logik |
| `dynamicPrismaClient.test.ts` | — | Dynamischer Prisma-Client |
| `ecosystemConfig.test.ts` | — | PM2-Ecosystem-Konfiguration |

### Integration Tests (39 Dateien, ~1.141 Tests)

| Datei | Tests | Was wird getestet |
|-------|:-----:|-------------------|
| `documents.test.ts` | 43 | Kategorien, Datei-Listing/Filterung, Upload (MIME-Validierung), Löschen, Download, Icons |
| `scoreValidationEdgeCases.test.ts` | 71 | Zod-Schema, Typfehler, Grenzwerte, SQL-Injection, Null/Undefined, Group/Team/Medal Edge Cases |
| `participantSettings.test.ts` | 23 | `bol_startet_nicht`, `bol_ak`: update-status, competition-status, Meldematrix |
| `disciplineSettings.test.ts` | 29 | Icons, Kürzel, Einheiten, Masken, Formeln, Gender-Flags, Propagation |
| `competitionSettings.test.ts` | 17 | Qualifiers, DropWorstScore, useApparatusPoints, kombinierte Settings |
| `layouts.test.ts` | 18 | CRUD + Felder-CRUD + Duplizierung |
| `persons.test.ts` | 16 | CRUD mit Suche, Paginierung, Pflichtfeld-Validierung |
| `disciplineGroups.test.ts` | 16 | CRUD mit Disziplin-Zuweisungen, Duplikat-Prüfung |
| `statuses.test.ts` | 14 | CRUD mit Farben, Boolean-Flags, Suche |
| `timePlanning.test.ts` | 14 | Zeitplanung, Bahnen, Durchgänge, Runden |
| `medals.test.ts` | 13 | Übersicht, Standings, Statistiken, Vergabe, Event-spezifisch |
| `groupScores.test.ts` | 13 | GET mit Filtern, POST Erstellung/Upsert/Validierung, DELETE |
| `teamScores.test.ts` | 14 | GET mit Filtern, POST Erstellung/Upsert/Validierung, DELETE |
| `concurrentWrites.test.ts` | 12 | Race Conditions, Burst-Resilienz, Datenintegrität |
| `events.test.ts` | — | Event-CRUD, Paginierung, Status |
| `competitions.test.ts` | — | Wettkampf-CRUD, Disziplinen |
| `participants.test.ts` | — | Teilnehmer-CRUD |
| `scores.test.ts` | — | Score-CRUD |
| `results.test.ts` | — | Ergebnis-Abfragen |
| `clubs.test.ts` | — | Verein-CRUD |
| `associations.test.ts` | — | Verband-CRUD |
| `disciplines.test.ts` | — | Disziplin-CRUD |
| `areas.test.ts` | — | Bereich-CRUD |
| `venues.test.ts` | — | Hallen-CRUD |
| `teams.test.ts` | — | Team-CRUD |
| `eventParticipants.test.ts` | — | Event-Teilnehmer |
| `squadManagement.test.ts` | — | Riegen-Verwaltung |
| `startNumbers.test.ts` | — | Startnummern |
| `api-comprehensive.test.ts` | — | Cross-Cutting API-Tests |
| `competition-disciplines.test.ts` | — | Wettkampf-Disziplinen |
| `specialized.test.ts` | — | Spezialisierte Tests |
| `administrative.test.ts` | — | Administrative Endpunkte |
| `builtin-formula-ranking.test.ts` | — | Built-In Formel-Ranking |
| `results-pagination.test.ts` | — | Ergebnis-Paginierung |
| `formula-priority.test.ts` | — | Formel-Priorität |
| `import-gender-validation.test.ts` | — | Import Gender-Validierung |
| `seed-data.test.ts` | — | Seed-Daten |
| `gymnetTeamImport.test.ts` | — | GymNet Team-Import |
| `system-utility.test.ts` | — | System-Utilities |

## 📊 Fortschritt

| Datum | Suites | Tests | Änderungen |
|-------|--------|-------|------------|
| Erstfassung | 2 | 30 | Events + API-Comprehensive |
| 5. März 2026 | 60 | 1.659 | +58 Suites, +1.629 Tests |
| 7. März 2026 | 66 | 1.781 | +6 Suites, +122 Tests (Documents API, DB-Setup-Wizard, Icon-Utils, Config-Validierung, Config-Helpers) |
