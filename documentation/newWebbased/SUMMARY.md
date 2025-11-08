# Summary

[Einleitung](README.md)

## 🚀 Erste Schritte

* [Installation](getting-started/installation.md)
* [Schnellstart](getting-started/quickstart.md)
* [Systemanforderungen](getting-started/requirements.md)

## 👥 Benutzerhandbuch

* [Übersicht](user-guide/README.md)
* [UI-Übersicht & Screenshots](user-guide/ui-overview.md)

### Stammdaten (Vorbereitung)

* [Vereine verwalten](user-guide/master-data/clubs.md)
* [Athleten verwalten](user-guide/master-data/athletes.md)
* [Disziplinen](user-guide/master-data/disciplines.md)

### Workflow: Veranstaltung durchführen

#### 1. Event anlegen

* [Event erstellen](user-guide/event-management/create-event.md)

#### 2. Wettkämpfe anlegen

* [Wettkämpfe konfigurieren](user-guide/event-management/competitions.md)
* [Disziplinen zuweisen](user-guide/event-management/disciplines.md)

#### 3. Teilnehmer hinzufügen

* [Teilnehmer verwalten](user-guide/event-management/participants.md)
* [GymNet Import](user-guide/workflows/gymnet-import.md)
* [Startnummern generieren](user-guide/event-management/start-numbers.md)

#### 4. Riegen einteilen

* [Riegen zuordnen](user-guide/event-management/squads.md)

#### 5. Zeitplanung

* [Durchgänge planen](user-guide/time-planning/sessions.md)
* [Startgeräte festlegen](user-guide/time-planning/start-devices.md)
* [Gantt-Chart](user-guide/time-planning/gantt.md)
* [Rotations-Übersicht](user-guide/time-planning/rotation.md)

#### 6. Wertungen erfassen

* [Score Capture](user-guide/score-capture/overview.md)
* [Kampfrichter-Portal](user-guide/score-capture/jury-portal.md)
* [Jury-Setup](user-guide/workflows/jury-setup.md)
* [Live-Updates](user-guide/score-capture/live-updates.md)

#### 7. Urkunden & Siegerlisten drucken

* [Urkunden drucken](user-guide/results/certificates.md)
* [Wettkampfstatus](user-guide/results/competition-status.md)
* [PDF-Export](user-guide/results/pdf-export.md)
* [CSV-Export](user-guide/results/csv-export.md)

### Feature-Guides (Detaillierte Anleitungen)

* [Wettkämpfe erstellen & verwalten](user-guide/event-competition-management.md)
* [Teilnehmer verwalten](user-guide/participant-management.md)
* [Zeitplanung für Wettkämpfe](user-guide/time-planning.md)
* [Wertungserfassung & Kampfrichter-Portal](user-guide/score-capture.md)
* [Urkunden erstellen & drucken](user-guide/certificate-creation.md)

### Komplette Workflows

* [Komplette Veranstaltung A-Z](user-guide/workflows/complete-event.md)

## 👨‍💻 Entwicklerhandbuch

* [Übersicht](developer-guide/README.md)

### Architektur

* [System-Architektur](developer-guide/architecture/overview.md)
* [Backend-Struktur](developer-guide/architecture/backend.md)
* [Frontend-Struktur](developer-guide/architecture/frontend.md)
* [Datenbank-Schema](developer-guide/architecture/database.md)
* [Real-time Updates](developer-guide/architecture/socket-io.md)
* [Gender Helpers System](developer-guide/architecture/gender-helpers.md)
* [Groups & Teams Analysis](developer-guide/architecture/groups-teams.md)

### API-Referenz

* [REST API Übersicht](developer-guide/api/overview.md)
* [Events API](developer-guide/api/events.md)
* [Participants API](developer-guide/api/participants.md)
* [Competitions API](developer-guide/api/competitions.md)
* [Scores API](developer-guide/api/scores.md)
* [Time Planning API](developer-guide/api/time-planning.md)

### UI-Komponenten

* [Component Library](developer-guide/ui-components/overview.md)
* [Templates](developer-guide/ui-components/templates.md)
* [Design System](developer-guide/ui-components/design-system.md)
* [Lokalisierung](developer-guide/ui-components/localization.md)

### Features & Implementation

* [Point 135: Startgeräte-Verwaltung](developer-guide/features/point-135-start-devices.md)
* [Point 133: Bahn-Konzept](developer-guide/features/point-133-bahn.md)
* [Point 131: Modal Integration](developer-guide/features/point-131-modal.md)
* [Point 114B: Date Support](developer-guide/features/point-114b-date-support.md)
* [Gender-Unification](developer-guide/features/gender-unification.md)
* [PDF-Export-System](developer-guide/features/pdf-system.md)
* [GymNet XML-Import](developer-guide/features/gymnet-import.md)
* [API Route Fixes](developer-guide/features/api-route-fixes.md)
* [Discipline Validation Fix](developer-guide/features/discipline-validation-fix.md)
* [Start Numbers Localization](developer-guide/features/start-numbers-fix.md)

### Best Practices

* [Code-Standards](developer-guide/best-practices/code-standards.md)
* [TypeScript](developer-guide/best-practices/typescript.md)
* [React Patterns](developer-guide/best-practices/react-patterns.md)
* [Database Queries](developer-guide/best-practices/database.md)
* [Error Handling](developer-guide/best-practices/error-handling.md)

### Testing

* [Test-Strategie](developer-guide/testing/strategy.md)
* [Unit Tests](developer-guide/testing/unit-tests.md)
* [Integration Tests](developer-guide/testing/integration-tests.md)

### Contributing

* [Contribution Guide](developer-guide/contributing.md)
* [Development Workflow](developer-guide/workflow.md)
* [Point-System](developer-guide/point-system.md)
* [Commit Guidelines](developer-guide/commit-guidelines.md)

## 🚀 Deployment

* [Produktiv-Deployment](deployment/production.md)
* [Netzwerk-Konfiguration](deployment/network.md)
* [PM2 Setup](deployment/pm2.md)
* [Frontend Serving](deployment/frontend-serving.md)
* [Firewall-Konfiguration](deployment/firewall-platform.md)
* [Firewall GUI](deployment/firewall-gui.md)
* [Admin Rights Detection](deployment/admin-rights.md)
* [Jury Portal Access](deployment/jury-portal-access.md)
* [Backup & Recovery](deployment/backup.md)
* [Monitoring](deployment/monitoring.md)
* [Troubleshooting](deployment/troubleshooting.md)
  * [Node Modules Fix](deployment/troubleshooting/node-modules-fix.md)
  * [Hard Refresh](deployment/troubleshooting/hard-refresh.md)

## 📚 Referenz

* [Entwicklungsstatus](reference/development-status.md)
* [Feature-Liste](reference/features.md)
* [Changelog](reference/changelog.md)
* [Project README](reference/project-readme.md)
* [Update v2.0](reference/update-v2.md)
* [FAQ](reference/faq.md)
* [Glossar](reference/glossary.md)

## 📎 Anhang

* [Migrationsguide (Qt → Web)](appendix/migration-guide.md)
* [Legacy-Kompatibilität](appendix/legacy-compatibility.md)
* [Keyboard Shortcuts](appendix/keyboard-shortcuts.md)
* [Screenshots](appendix/screenshots.md)
