# TurnFix v2.0 - UI Screenshots & Feature-Übersicht

**Screenshot-Beispiele**: aufgenommen am 14. Oktober 2025

Die Bilder zeigen ausgewählte Ansichten der Web-Oberfläche mit Beispieldaten. Die Oberfläche kann sich seit der Aufnahme verändert haben; maßgeblich sind die aktuellen Beschriftungen in TurnFix. Die Screenshots sind nach Bereichen unter [images/ui-screenshots](../images/ui-screenshots/README.md) sortiert.

![Verwaltungszentrale mit Datenverwaltung, Veranstaltungsverwaltung und Einstellungen](../images/ui-screenshots/overview/management-center.png)

---

## 📊 Stammdaten-Verwaltung

### Regionen & Verbände

**Regionen-Verwaltung**
- Übersicht aller Regionen (Bereiche)
- CRUD-Operationen (Erstellen, Bearbeiten, Löschen)
- Zuordnung zu Verbänden
- Suchfunktion

**Verbände-Verwaltung**
- Liste aller Verbände
- Detaillierte Verbandsinformationen
- Kontaktverwaltung

### Vereine & Personen

**Vereinsverwaltung**
- Umfassende Vereinsdatenbank
- Adressverwaltung
- Kontaktpersonen
- Statistiken pro Verein
- Export-Funktionen

**Wettkampforte/Standorte**
- Verwaltung von Veranstaltungsorten
- Adressdaten und Kontaktinformationen
- Zuordnung zu Events

---

## 👤 Teilnehmer & Athleten

### Athleten-Datenbank

**Athleten-Verwaltung**
- Zentrale Athleten-Datenbank
- Geburtsdaten, Geschlecht
- Vereinszuordnung
- Suchfunktion mit Filtern
- Table/Card View Toggle

### Event-Teilnehmer

**Event-Teilnehmer**
- Event-spezifische Teilnehmerliste
- Startnummern-Verwaltung
- Riegen-Zuordnung
- Wettkampf-Zuordnungen
- Massenoperationen

![Teilnehmerliste einer Veranstaltung](../images/ui-screenshots/participants/event-participants.png)

**Teilnehmer-Details bearbeiten**
- Detailansicht einzelner Teilnehmer
- Wettkampf-Zuordnung
- Startnummer
- Status-Verwaltung
- Außer-Konkurrenz-Kennzeichnung

**Teilnehmer-Etiketten**
- PDF-Generierung für Namensschilder
- Sortierung nach Gender/Riege/Verein
- Druckbare Etiketten-Vorlagen
- Konfigurierbare Layouts

---

## 🏆 Wettkampf-Verwaltung

### Veranstaltungen

**Veranstaltungsverwaltung**
- Übersicht aller Events
- Event-Status tracking
- Veranstaltungsorte
- Zeiträume
- Schnellzugriff auf Event-Funktionen

**Management Center**
- Event-Auswahl
- Zentrale Steuerung
- Navigation zu Event-Funktionen
- Event-Context für alle Operationen

![Veranstaltungsworkflow mit den Bereichen Aufbau, Wettkampftag und Ergebnisse](../images/ui-screenshots/events/event-workflow.png)

![Veranstaltungsdetails und Kennzahlen](../images/ui-screenshots/events/event-details.png)

![Aktionen im Bereich Veranstaltungsaufbau](../images/ui-screenshots/events/setup-section.png)

![Aktionen im Bereich Wettkampftag](../images/ui-screenshots/events/competition-day-section.png)

### Wettkämpfe

**Wettkampf-Übersicht**
- Alle Wettkämpfe eines Events
- Altersgruppen
- Disziplinen
- Teilnehmerzahlen
- Status-Übersicht

**Wettkampf-Editor**
- Detaillierte Wettkampf-Konfiguration
- Disziplinen-Auswahl
- Altersgruppen-Definition
- Geschlechter-Zuordnung
- Formel-Konfiguration

![Wettkampfübersicht mit Disziplinen und Altersgruppen](../images/ui-screenshots/competitions/competition-list.png)

![Alternative Ansicht der Wettkampfverwaltung](../images/ui-screenshots/competitions/competition-overview.png)

### Riegen

**Riegen-Management**
- Riegen-Übersicht
- Wettkampf-Zuordnung
- Teilnehmer pro Riege
- Drag & Drop Zuordnung
- Automatische Riegen-Generierung

---

## 📋 Disziplinen & Konfiguration

### Disziplinen

**Disziplinen-Verwaltung**
- Alle Disziplinen/Geräte
- Icons für Geräte
- Geschlechter-Zuordnung (m/w/beide)
- Kategorie-Zuordnung
- Feldkonfiguration

**Disziplin-Editor**
- Detaillierte Disziplin-Konfiguration
- Feld-Zuordnung (A-Note, B-Note, etc.)
- Formel-Definition
- Icon-Auswahl
- Geschlechter-Einstellungen

![Disziplinformular mit Formel- und Eingabeeinstellungen](../images/ui-screenshots/Disciplines_Edit.png)

## ⚙️ Systemeinstellungen

![Einstieg in die Systemeinstellungen](../images/ui-screenshots/settings/settings-entry.png)

---

## 🎖️ Urkunden & Layouts

**Urkunden-Layout-Verwaltung**
- Vordefinierte Layouts
- Layout-Vorschau
- Layout-Auswahl pro Event
- Bearbeitung

**Layout-Designer**
- Visual Layout-Editor
- Feld-Zuordnung
- Textblöcke positionieren
- Schriftarten & Größen
- Vorschau-Funktion

---

## 📊 Wertungserfassung & Ergebnisse

### Score Capture

**Score Capture - Hauptansicht**
- Dynamisches Scoring-System
- Generische Formel-Engine
- Automatische Berechnungen
- Live-Updates
- Filter nach Riege/Wettkampf/Gerät

![Wertungserfassung mit Riegen- und Geräteauswahl](../images/ui-screenshots/score-capture.png)

**Live-Scoring Ansicht**
- Echtzeit-Wertungsanzeige
- Aktueller Stand
- Rangliste
- Socket.IO Live-Updates

### Ergebnisse

**Ergebnis-Übersicht**
- Vollständige Ergebnislisten
- Ranglisten
- Gesamt- und Einzelwertungen
- Export-Funktionen
- Filterung nach Wettkampf/Riege

![Wettkampfergebnisse mit Rangliste und Gerätewertungen](../images/ui-screenshots/results/competition-results.png)

**Urkunden-Druck**
- PDF-Generierung
- Layout-Auswahl
- Batch-Druck
- Vorschau
- Filter nach Platzierung

**Medaillenspiegel**
- Vereinswertung
- Gold/Silber/Bronze Zählung
- Gesamtübersicht
- Sortierung
- Export-Möglichkeit

---

## ⚖️ Kampfrichter-Portal (Jury Portal)

Der typische Ablauf im Jury-Portal führt von der Veranstaltungs- über die Riegen- und Geräteauswahl zur Wertungseingabe:

![Veranstaltung im Jury-Portal auswählen](../images/ui-screenshots/jury/event-selection.png)

![Riege im Jury-Portal auswählen](../images/ui-screenshots/jury/squad-selection.png)

![Gerät im Jury-Portal auswählen](../images/ui-screenshots/jury/device-selection.png)

![Wertung erfassen und den Fortschritt der Riege verfolgen](../images/ui-screenshots/jury/score-entry.png)

![Weitere Ansicht der Wertungseingabe](../images/ui-screenshots/jury/score-entry-alternate.png)

### Hauptansicht

**Jury Portal - Landing Page**
- Wettkampf-Auswahl
- Riegen-Auswahl
- Geräte-Navigation
- Eigenständiges Interface

### Wertungseingabe

**Gerät-Auswahl**
- Visuelle Geräte-Icons
- Schnellzugriff
- Farbcodierung

**Teilnehmer-Übersicht**
- Alle Turner der Riege
- Startnummern
- Wertungs-Status
- Schnellnavigation

**Wertungs-Erfassung**
- Gerätespezifische Felder
- Dynamische Formular-Generierung
- Automatische Berechnungen
- Speichern-Funktion
- Validierung

---

## 🎯 Feature-Highlights

### Einheitliches UI-Design
- ✅ **Unified Header System** - Konsistente Navigation
- ✅ **Table/Card View Toggle** - Flexible Daten-Ansicht
- ✅ **Responsive Design** - Mobile-freundlich
- ✅ **Dark Mode Ready** - Moderne Oberfläche

### Lokalisierung
- ✅ **Deutsch & Englisch** - Vollständige Übersetzung
- ✅ **Gender-Unification** - Einheitliche Darstellung (m/w/gemischt)
- ✅ **Format-Konsistenz** - Datum, Zeit, Zahlen

### Export & Druck
- ✅ **PDF-Generation** - Urkunden, Reports, Etiketten
- ✅ **CSV-Export** - Alle Stammdaten
- ✅ **Batch-Operations** - Massenexport

### Real-time Features
- ✅ **Socket.IO** - Live-Updates
- ✅ **Live Scoring** - Echtzeit-Synchronisation
- ✅ **Multi-User** - Gleichzeitige Nutzung

### Daten-Management
- ✅ **CRUD-Complete** - Alle Entitäten verwaltbar
- ✅ **Search & Filter** - Erweiterte Suchfunktionen
- ✅ **Pagination** - Performance-optimiert
- ✅ **Validation** - Umfassende Validierung

---

## 🔄 Von Legacy zu Modern

Diese Screenshots zeigen den Fortschritt vom alten Qt/C++-Desktop zu einer modernen Webanwendung:

### Verbesserungen
- **Zugänglichkeit**: Browser statt Desktop-Installation
- **Multi-Device**: PC, Tablet, Smartphone
- **Kollaboration**: Mehrere Nutzer gleichzeitig
- **Updates**: Automatische Updates ohne Neuinstallation
- **Plattformunabhängig**: Windows, Mac, Linux

### Legacy-Kompatibilität
- **Datenbank**: Gleiche PostgreSQL-DB
- **Alt + Neu**: Beide Versionen parallel nutzbar
- **Migration**: Nahtloser Übergang

---

## 📖 Weitere Informationen

Für detaillierte Anleitungen siehe:
- [Benutzerhandbuch](../SUMMARY.md)
- [Entwicklerhandbuch](../developer-guide/README.md)
- [Deployment Guide](../deployment/production.md)

---

**Letzte Aktualisierung**: 22. November 2026
**Screenshot-Beispiele**: 16 neu einsortierte Aufnahmen vom 14. Oktober 2025
**Version**: TurnFix v2.0
