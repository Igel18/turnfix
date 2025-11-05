# GitBook-Konfiguration für TurnFix v2.0 Dokumentation

Dieses Verzeichnis enthält die vollständige Dokumentation für TurnFix v2.0 in GitBook-kompatibler Struktur.

## 📁 Struktur

```
documentation/newWebbased/
├── README.md                    # Hauptseite (GitBook Landing Page)
├── SUMMARY.md                   # Inhaltsverzeichnis (GitBook Navigation)
├── .gitbook.yaml               # GitBook-Konfiguration (optional)
│
├── getting-started/            # 🚀 Erste Schritte
│   ├── installation.md
│   ├── quickstart.md
│   ├── requirements.md
│   └── network-setup.md
│
├── user-guide/                 # 👥 Benutzerhandbuch
│   ├── README.md
│   ├── event-management/
│   ├── time-planning/
│   ├── score-capture/
│   ├── results/
│   ├── master-data/
│   └── workflows/
│
├── developer-guide/            # 👨‍💻 Entwicklerhandbuch
│   ├── README.md
│   ├── architecture/
│   ├── api/
│   ├── ui-components/
│   ├── features/
│   ├── best-practices/
│   ├── testing/
│   └── contributing.md
│
├── deployment/                 # 🚀 Deployment & Admin
│   ├── production.md
│   ├── network.md
│   ├── pm2.md
│   ├── firewall.md
│   └── troubleshooting.md
│
├── reference/                  # 📚 Referenz
│   ├── development-status.md
│   ├── features.md
│   ├── changelog.md
│   └── faq.md
│
├── appendix/                   # 📎 Anhang
│   ├── migration-guide.md
│   ├── legacy-compatibility.md
│   └── screenshots.md
│
└── images/                     # 🖼️ Bilder & Screenshots
    └── ui-screenshots/
```

## 🔧 GitBook Setup

### Lokale Vorschau

```bash
# GitBook CLI installieren
npm install -g gitbook-cli

# In diesem Verzeichnis
cd documentation/newWebbased

# GitBook initialisieren
gitbook init

# Lokalen Server starten
gitbook serve
# → http://localhost:4000
```

### Online-Publishing

1. **GitHub Integration**:
   - GitBook mit GitHub-Repository verbinden
   - Auto-Sync bei Commits aktivieren

2. **Custom Domain** (optional):
   - docs.turnfix.de einrichten

3. **Zugriffskontrolle**:
   - Public für Anwender-Doku
   - Private für interne Entwickler-Doku (optional)

## 📝 Dokumentations-Guidelines

### Markdown-Format

- **Überschriften**: `#` für H1, `##` für H2, etc.
- **Code-Blöcke**: Mit Syntax-Highlighting (```typescript, ```bash, etc.)
- **Links**: Relative Pfade verwenden (`[Text](../path/file.md)`)
- **Bilder**: In `images/` ablegen, relative Pfade nutzen

### Struktur-Regeln

1. **README.md**: Einführung in jeden Abschnitt
2. **SUMMARY.md**: Aktuell halten (GitBook-Navigation)
3. **Bilder**: Immer Alt-Text angeben
4. **Code-Beispiele**: Vollständig und lauffähig
5. **Verlinkung**: Cross-References nutzen

### Content-Guidelines

**Für Anwender**:
- ✅ Schritt-für-Schritt Anleitungen
- ✅ Screenshots mit Beschriftungen
- ✅ Häufige Probleme & Lösungen
- ❌ Technische Implementation-Details

**Für Entwickler**:
- ✅ Code-Beispiele mit Kontext
- ✅ Architektur-Diagramme
- ✅ API-Referenzen
- ✅ Best Practices mit Begründung

## 🗂️ Migration existierender Docs

### Bereits vorhandene MD-Dateien

Die folgenden Dateien aus `newWebBased/` müssen kategorisiert werden:

**Getting Started**:
- `GETTING_STARTED.md` → `getting-started/quickstart.md`
- `SCHNELLSTART.md` → `getting-started/installation.md`

**Deployment**:
- `PRODUCTION_DEPLOYMENT.md` → `deployment/production.md`
- `NETWORK_SETUP.md` → `deployment/network.md`
- `NETWORK_ACCESS_FIXES.md` → `deployment/troubleshooting.md`
- `FIREWALL_SETUP.md` → `deployment/firewall.md`

**Developer Guide - Features**:
- `POINT_135_DOCUMENTATION.md` → `developer-guide/features/point-135-start-devices.md`
- `POINT-30-GENDER-UNIFICATION.md` → `developer-guide/features/gender-unification.md`
- `POINT-34-PDF-UNIFICATION.md` → `developer-guide/features/pdf-system.md`
- `POINT-38-IMPLEMENTATION-SUMMARY.md` → `developer-guide/features/gymnet-import.md`

**Developer Guide - Architecture**:
- `DYNAMIC_FIELD_MAPPING.md` → `developer-guide/architecture/field-mapping.md`
- `JURY_PORTAL_CONCEPT.md` → `developer-guide/architecture/jury-portal.md`
- `LIVE_UPDATE_INDICATOR.md` → `developer-guide/architecture/socket-io.md`

**Developer Guide - Best Practices**:
- `TEMPLATE-UNIFICATION.md` → `developer-guide/best-practices/templates.md`
- `PRISMA_SINGLETON_FIX.md` → `developer-guide/best-practices/database.md`

**Reference**:
- `Instructions.md` → `reference/development-status.md` (gekürzt/umstrukturiert)
- `PRIORITY_FIXES_LOG.md` → `reference/changelog.md`

**Testing**:
- `TESTING.md` → `developer-guide/testing/strategy.md`
- `POINT-38-TEST-CASES.md` → `developer-guide/testing/test-cases.md`

### Zu archivierende Docs

Phase-Dokumente (historisch, evtl. archivieren):
- `PHASE-1-COMPLETE.md`
- `PHASE-1-SUMMARY.md`
- `PHASE-1-TESTING.md`

Status-Dokumente (konsolidieren):
- `DOC-UPDATE-SUMMARY.md`
- `COMPLETE_FUNCTIONALITY_ANALYSIS.md`
- `PRODUCTION_READY.md`

Implementierungs-Details (in Feature-Docs integrieren):
- Alle `POINT-XX-*.md` → Entsprechende Feature-Seiten

## 🎨 Styling & Branding

### GitBook Theme

- **Primary Color**: `#3B82F6` (Blue)
- **Logo**: TurnFix Logo (falls vorhanden)
- **Favicon**: turnfix-icon.ico

### Custom CSS (optional)

```css
/* .gitbook/styles/website.css */
.book .book-summary {
  background: #f9fafb;
}

.markdown-section code {
  background: #f3f4f6;
  color: #1f2937;
}
```

## 🔍 Suchfunktion

GitBook bietet eingebaute Suche:
- Volltextsuche über alle Seiten
- Automatische Indexierung
- Keine zusätzliche Konfiguration nötig

## 📊 Analytics (optional)

Google Analytics Integration:
```yaml
# .gitbook.yaml
root: ./

structure:
  readme: README.md
  summary: SUMMARY.md

plugins:
  - ga

pluginsConfig:
  ga:
    token: UA-XXXXXXXX-X
```

## 🚀 Nächste Schritte

1. ✅ Basis-Struktur erstellt (README.md, SUMMARY.md)
2. 🔄 Existierende MD-Dateien migrieren & reorganisieren
3. ⏳ Fehlende Seiten erstellen (User Guide, API-Referenz)
4. ⏳ Screenshots hinzufügen & dokumentieren
5. ⏳ GitBook lokal testen
6. ⏳ Online-Publishing einrichten

## 📞 Fragen?

Bei Fragen zur Dokumentations-Struktur:
- Siehe GitBook Docs: https://docs.gitbook.com
- Markdown Guide: https://www.markdownguide.org
