# TurnFix v2.0 - Webbasierte Wettkampfverwaltung

**Moderne Webanwendung für Turnwettkämpfe**

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com/Igel18/turnfix)
[![Status](https://img.shields.io/badge/status-production-green.svg)](https://github.com/Igel18/turnfix)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](https://github.com/Igel18/turnfix)

## 📖 Über diese Dokumentation

Diese Dokumentation beschreibt die webbasierte Version von TurnFix v2.0 - ein vollständiges Rewrite der Desktop-Anwendung als moderne Full-Stack-Webanwendung.

### Zielgruppen

- 👥 **Anwender**: Turnvereine, Wettkampfveranstalter, Kampfrichter
- 👨‍💻 **Entwickler**: Beitragende, Maintainer, System-Administratoren

## 🚀 Schnellstart

- [Installation & Setup](getting-started/installation.md)
- [Erste Schritte](getting-started/first-steps.md)
- [Veranstaltung anlegen](user-guide/event-management/create-event.md)

## 📚 Dokumentations-Bereiche

### Für Anwender

- [**Benutzerhandbuch**](user-guide/README.md) - Vollständige Anleitung zur Bedienung
- [**Workflows**](user-guide/workflows/README.md) - Schritt-für-Schritt Anleitungen
- [**Features**](user-guide/features/README.md) - Funktionsübersicht

### Für Entwickler

- [**Entwicklerhandbuch**](developer-guide/README.md) - Technische Dokumentation
- [**Architektur**](developer-guide/architecture/README.md) - System-Design & Patterns
- [**API-Referenz**](developer-guide/api/README.md) - Backend-Schnittstellen
- [**Contributing**](developer-guide/contributing.md) - Beiträge & Standards

### Deployment & Administration

- [**Produktiv-Deployment**](deployment/production.md) - Server-Installation
- [**Netzwerk-Setup**](deployment/network.md) - Multi-Client-Betrieb
- [**Troubleshooting**](deployment/troubleshooting.md) - Fehlerbehandlung

## 🎯 Hauptfunktionen

✅ **Veranstaltungsverwaltung** - Events, Wettkämpfe, Teilnehmer
✅ **Riegenverwaltung** - Squad-Zuordnung, Rotation-Planning
✅ **Wertungserfassung** - Live-Scoring mit Socket.IO
✅ **Kampfrichter-Portal** - Eigenständiges Jury-Interface
✅ **Zeitplanung** - Gantt-Charts, Rotations-Übersicht
✅ **Urkunden & Export** - PDF-Generation, CSV-Export
✅ **GymNet-Import** - XML-Import von DTB GymNet

## 🛠️ Technologie-Stack

- **Backend**: Node.js 18+, Express, TypeScript, Prisma ORM
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Datenbank**: PostgreSQL (Legacy-Schema-kompatibel)
- **Real-time**: Socket.io für Live-Updates
- **Process Manager**: PM2

## 📊 Projekt-Status

**Version**: 2.0 (Production Ready)
**Letztes Update**: 5. November 2025
**Entwicklungsstatus**: ✅ Aktiv

### Abgeschlossene Features (86/221 Points)

- ✅ Vollständige Lokalisierung (DE/EN)
- ✅ Gender-Unification über alle UIs
- ✅ PDF-Export-System
- ✅ GymNet XML-Import
- ✅ Socket.IO Live-Updates
- ✅ Startgeräte-Verwaltung (Point 135)

[Vollständiger Fortschritt](developer-guide/development-status.md)

## 🔗 Wichtige Links

- **Haupt-Repository**: [github.com/Igel18/turnfix](https://github.com/Igel18/turnfix)
- **Issue Tracker**: [GitHub Issues](https://github.com/Igel18/turnfix/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## 📞 Support & Kontakt

Bei Fragen oder Problemen:

- 📧 Email: [Support kontaktieren]
- 💬 GitHub Discussions: [Diskussionen](https://github.com/Igel18/turnfix/discussions)
- 🐛 Bug Reports: [Issues erstellen](https://github.com/Igel18/turnfix/issues/new)

---

**Hinweis**: Diese Dokumentation ersetzt die Legacy-Dokumentation für die Qt/C++-Version. Für die alte Desktop-Version siehe [Legacy-Dokumentation](../legacy/README.md).
