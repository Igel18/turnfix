# Archivierte Dokumentation

**Datum**: 5. November 2025  
**Status**: ✅ Migriert zu GitBook-Struktur

## 📁 Was ist hier?

Dieser Ordner enthält **43 Markdown-Dateien**, die aus dem `newWebBased/`-Verzeichnis in die neue GitBook-kompatible Dokumentationsstruktur migriert wurden.

**Neue Dokumentations-Location**:
```
c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\documentation\newWebbased\
```

## ✅ Migrierte Dateien

Diese Dateien wurden **erfolgreich reorganisiert** und sind nun Teil der strukturierten GitBook-Dokumentation:

### Getting Started (1)
- ✅ `GETTING_STARTED.md` → `getting-started/quickstart.md`

### Deployment (2)
- ✅ `FIREWALL_SETUP.md` → `deployment/firewall.md`
- ✅ `NETWORK_ACCESS_FIXES.md` → `deployment/network-fixes.md`

### Developer Features (20)
- ✅ `POINT_135_DOCUMENTATION.md` → `developer-guide/features/point-135-start-devices.md` ⭐
- ✅ `POINT-30-GENDER-UNIFICATION.md` → `developer-guide/features/gender-unification.md`
- ✅ `POINT-34-PDF-UNIFICATION.md` → `developer-guide/features/pdf-system.md`
- ✅ `POINT-38-IMPLEMENTATION-SUMMARY.md` → `developer-guide/features/gymnet-import.md`
- ✅ `POINT-11-IMPLEMENTATION.md` → `developer-guide/features/setup-automation.md`
- ✅ `POINT-31-LOCALIZATION.md` → `developer-guide/features/table-localization.md`
- ✅ `POINT-32-HORIZONTAL-SCROLLING.md` → `developer-guide/features/table-scrolling.md`
- ✅ `POINT-33-SORTABLE-TABLES.md` → `developer-guide/features/table-sorting.md`
- ✅ `POINT-40-DEFAULT-TABLE-VIEW.md` → `developer-guide/features/default-views.md`
- ✅ `POINT-46-JURY-PORTAL-ICONS.md` → `developer-guide/features/jury-icons.md`
- ✅ `POINT-47-GYMNET-IMPORT-LOCALIZATION.md` → `developer-guide/features/gymnet-localization.md`
- ✅ `POINT-49-EVENTS-LOCALIZATION.md` → `developer-guide/features/events-localization.md`
- ✅ `POINT-51-UNIFIED-HEADER-CLEANUP.md` → `developer-guide/features/header-unification.md`
- ✅ `CONFIGURATION_LOCALIZATION_STATUS.md` → `developer-guide/features/configuration-localization.md`
- ✅ `MANAGEMENT_CENTER_COMPLETE_LOCALIZATION.md` → `developer-guide/features/management-localization.md`
- ✅ `PARTICIPANTS_LOCALIZATION_STATUS.md` → `developer-guide/features/participants-localization.md`
- ✅ `DISCIPLINE_ICONS_IMPLEMENTATION.md` → `developer-guide/features/discipline-icons.md`
- ✅ `JURY_SCORES_FEATURE.md` → `developer-guide/features/jury-scores.md`
- ✅ `POINT-38-HOTFIX.md` → `developer-guide/features/gymnet-hotfix.md`
- ✅ `POINT-46-PRODUCTION-SOLUTION.md` → `developer-guide/features/jury-production.md`

### Developer Architecture (4)
- ✅ `DYNAMIC_FIELD_MAPPING.md` → `developer-guide/architecture/field-mapping.md`
- ✅ `JURY_PORTAL_CONCEPT.md` → `developer-guide/architecture/jury-portal.md`
- ✅ `JURY_PORTAL_COMPARISON.md` → `developer-guide/architecture/jury-comparison.md`
- ✅ `LIVE_UPDATE_INDICATOR.md` → `developer-guide/architecture/live-updates.md`

### Developer Best Practices (3)
- ✅ `TEMPLATE-UNIFICATION.md` → `developer-guide/best-practices/templates.md`
- ✅ `PRISMA_SINGLETON_FIX.md` → `developer-guide/best-practices/database.md`
- ✅ `TYPESCRIPT_BUILD_FIXES.md` → `developer-guide/best-practices/typescript.md`

### Developer Testing (3)
- ✅ `TESTING.md` → `developer-guide/testing/strategy.md`
- ✅ `TESTING_SETUP_SUMMARY.md` → `developer-guide/testing/setup.md`
- ✅ `POINT-38-TEST-CASES.md` → `developer-guide/testing/gymnet-test-cases.md`

### Reference (2)
- ✅ `DEVELOPMENT_SCRIPTS.md` → `reference/scripts.md`

### Historische/Status-Dokumente (8)
Diese wurden archiviert, da sie historischen Kontext darstellen:
- `PHASE-1-COMPLETE.md`
- `PHASE-1-SUMMARY.md`
- `PHASE-1-TESTING.md`
- `DOC-UPDATE-SUMMARY.md`
- `COMPLETE_FUNCTIONALITY_ANALYSIS.md`
- `PRODUCTION_READY.md`
- `DEPLOYMENT.md`
- `HARDENING-PLAN.md`
- `POINT-38-GYMNET-AGE-FIX.md`

## 🔄 Wiederherstellung

Falls eine Datei benötigt wird:

```powershell
# Einzelne Datei zurückkopieren
Copy-Item "_archive_docs\FILENAME.md" ".\"

# Alle Dateien wiederherstellen
Copy-Item "_archive_docs\*.md" ".\"
```

## 🗑️ Kann gelöscht werden?

**JA** - Diese Dateien können nach erfolgreicher Verifikation der neuen Dokumentation gelöscht werden.

**Empfehlung**: Noch 1-2 Wochen behalten, dann nach Git-Commit löschen.

## 📚 Neue Dokumentations-Struktur

Die vollständige, reorganisierte Dokumentation finden Sie hier:

```
c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\documentation\newWebbased\
├── README.md                    # GitBook Landing Page
├── SUMMARY.md                   # Inhaltsverzeichnis
├── getting-started/
├── user-guide/
├── developer-guide/
│   ├── features/               # 20 Feature-Docs
│   ├── architecture/           # 4 Architecture-Docs
│   ├── best-practices/         # 3 Best-Practice-Docs
│   └── testing/                # 3 Testing-Docs
├── deployment/
├── reference/
└── images/
```

## 📖 GitBook Zugriff

**Lokal testen**:
```bash
cd c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\documentation\newWebbased
gitbook serve
# → http://localhost:4000
```

**Online** (nach Veröffentlichung):
- URL wird noch konfiguriert

---

**Letzte Aktualisierung**: 5. November 2025  
**Migriert von**: `newWebBased/` → `documentation/newWebbased/`  
**Anzahl Dateien**: 43  
**Status**: ✅ Migration abgeschlossen
