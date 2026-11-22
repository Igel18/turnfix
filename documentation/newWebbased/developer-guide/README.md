# Entwicklerhandbuch

Willkommen zum TurnFix v2.0 Entwicklerhandbuch! Diese Dokumentation richtet sich an Entwickler, die an TurnFix beitragen oder das System erweitern möchten.

## 📋 Übersicht

TurnFix v2.0 ist eine moderne Full-Stack-Webanwendung, die die Legacy Qt/C++-Desktop-Anwendung ersetzt.

### Technologie-Stack

**Backend**:
- Node.js 18+
- Express.js
- TypeScript 5+
- Prisma ORM
- PostgreSQL

**Frontend**:
- React 18
- TypeScript 5+
- Tailwind CSS 3
- Vite 5
- Socket.IO Client

**Infrastructure**:
- PM2 (Process Manager)
- Socket.IO (Real-time)
- Windows Server (primary)

## 🗂️ Dokumentations-Struktur

### Architektur

Verstehen Sie die System-Architektur:

- [Feldzuordnung](architecture/field-mapping.md)
- [Gruppen und Mannschaften](architecture/groups-teams.md)
- [Jury-Portal](architecture/jury-portal.md)
- [Live-Updates](architecture/live-updates.md)
- [Jury-Vergleich](architecture/jury-comparison.md)

### Features & Implementation

Detaillierte Feature-Dokumentationen:

- [**Point 135**: Startgeräte-Verwaltung](features/point-135-start-devices.md) ⭐ NEU
- [Gender-Unification](features/gender-unification.md)
- [PDF-Export-System](features/pdf-system.md)
- [GymNet XML-Import](features/gymnet-import.md)
- [Dynamic Field Mapping](architecture/field-mapping.md)

> Eine vollständige REST-API-Referenz ist in dieser Dokumentationsfassung nicht enthalten.

### Best Practices

Code-Standards und Patterns:

- [TypeScript-Guidelines](best-practices/typescript.md)
- [Database-Queries](best-practices/database.md)
- [Template-System](best-practices/templates.md)

### Testing

Test-Strategie und Guidelines:

- [Test-Strategie](testing/strategy.md)
- [Setup & Configuration](testing/setup.md)
- [Test-Cases (GymNet)](testing/gymnet-test-cases.md)

## 🚀 Quick Start für Entwickler

### 1. Repository klonen

```bash
git clone https://github.com/Igel18/turnfix.git
cd turnfix/newWebBased
```

### 2. Dependencies installieren

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Datenbank einrichten

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Development Server starten

```bash
# Server (Port 3001)
cd server
npm run dev

# Client (Port 5173)
cd client
npm run dev
```

→ Detaillierte Anleitung: [Setup-Automation](features/setup-automation.md)

## 📐 Architektur-Prinzipien

### Backend-Architektur

```
server/
├── src/
│   ├── routes/          # REST API Endpoints
│   ├── middleware/      # Express Middleware
│   ├── utils/           # Helper Functions
│   ├── db/              # Prisma Client
│   └── index.ts         # Server Entry Point
├── prisma/
│   └── schema.prisma    # Database Schema (READONLY!)
└── ecosystem.config.js  # PM2 Configuration
```

**Wichtig**: Datenbank-Schema NIEMALS ändern! (Legacy-Kompatibilität)

### Frontend-Architektur

```
client/
├── src/
│   ├── pages/           # Route Components
│   ├── components/      # Reusable UI Components
│   ├── utils/           # Helper Functions
│   ├── i18n/            # Translations (DE/EN)
│   └── types/           # TypeScript Types
└── index.html
```

**Pattern**: EventManagementTemplate für konsistente UIs

## 🎯 Development Guidelines

### Core Rules

1. ✅ **NIEMALS** Datenbank-Schema ändern
2. ✅ **IMMER** Feld-Mapping (camelCase ↔ snake_case)
3. ✅ **ALLE** UI-Texte lokalisieren (DE/EN)
4. ✅ **ALLE** Components mit TypeScript
5. ✅ **TESTS** schreiben für neue Features

### Code-Standards

```typescript
// ✅ RICHTIG: Field Mapping
const mapped = {
  id: row.int_disziplinenid,
  name: row.var_name,
  maleAllowed: row.bol_m
};

// ❌ FALSCH: DB-Felder direkt im Client
<td>{row.int_disziplinenid}</td>
```

→ Siehe die vorhandenen [TypeScript-](best-practices/typescript.md) und [Datenbankrichtlinien](best-practices/database.md).

## 🧩 Component-System

### Standard-Templates

- **EventManagementTemplate** - Basis für Event-Seiten
- **UnifiedPageHeader** - Konsistente Header
- **UnifiedDataView** - Table/Card/Grid Views
- **UnifiedFilter** - Standardisierte Filter
- **UnifiedDialog** - Modale Dialoge

→ Details: [Template-System](best-practices/templates.md)

## 🔄 Point-Based Development

TurnFix nutzt ein **Point-System** für Feature-Tracking:

- **Point 1-100**: Basis-Features (✅ größtenteils erledigt)
- **Point 101-135**: Erweiterte Features (🚧 in Arbeit)
- **Point 136+**: Zukünftige Features (⏳ geplant)

Aktueller Stand: **135 Points** (86 erledigt, 38.9%)

→ Siehe [Build-, Test- und Release-Workflow](build-test-release.md)

## 🛠️ Tools & Utilities

### Entwicklungs-Tools

```bash
# TypeScript Kompilierung prüfen
npm run build

# Linting
npm run lint

# Tests ausführen
npm test

# PM2 Management
pm2 status
pm2 logs turnfix-server
pm2 restart turnfix-server
```

### Debugging

```bash
# Server mit Debug-Logs
DEBUG=true npm run dev

# Client mit Source Maps
npm run dev
```

→ Mehr Scripts: [Development Scripts](../reference/scripts.md)

## 📊 Database Guidelines

### Prisma Best Practices

```typescript
// ✅ RICHTIG: Singleton Pattern
import prisma from '../lib/prisma';

// ❌ FALSCH: Neue Instanz
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

→ Details: [Database Best Practices](best-practices/database.md)

### Legacy-Kompatibilität

**Regel**: Datenbank-Struktur NICHT ändern!

- Felder behalten: `int_id`, `var_name`, `bol_flag`
- Alte Qt/C++-App muss weiterhin funktionieren
- Nur neue Felder hinzufügen (wenn unbedingt nötig)

## 🌍 Lokalisierung

Alle UI-Texte müssen übersetzt werden:

```typescript
// ✅ RICHTIG
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();

<button>{t('common.save')}</button>

// ❌ FALSCH
<button>Save</button>
```

Translation-Files:
- `client/src/i18n/locales/de.json`
- `client/src/i18n/locales/en.json`

## 🤝 Contributing

Möchten Sie zu TurnFix beitragen?


### Pull Request Workflow

1. **Feature Branch** erstellen (`feature/point-XXX`)
2. **Changes** implementieren
3. **Tests** schreiben
4. **Build** erfolgreich (`npm run build`)
5. **Commit** mit Point-Nummer
6. **PR** erstellen mit Beschreibung

### Commit-Message Format

```
[Action] Point XXX: Brief description

Detailed description:
- Change 1
- Change 2

Files modified:
- file1.ts
- file2.tsx
```


## 📚 Weitere Ressourcen

- [Architektur: Gruppen und Mannschaften](architecture/groups-teams.md)
- [Best Practices: Datenbank](best-practices/database.md)
- [Testing-Guide](testing/strategy.md)

## 🐛 Troubleshooting

Häufige Entwickler-Probleme:

| Problem | Lösung |
|---------|--------|
| Port 3001 belegt | `taskkill /F /PID <pid>` oder PM2 restart |
| TypeScript Fehler | `npm run build` im entsprechenden Ordner |
| Prisma Schema Fehler | NIEMALS Schema ändern! Nur via Prisma CLI |
| Socket.IO nicht verbunden | Server neu starten, Client Cache leeren |

→ Siehe [Hard-Refresh-Hinweise](../deployment/troubleshooting/hard-refresh.md)

## 📞 Support für Entwickler

- 💬 **Discussions**: [GitHub Discussions](https://github.com/Igel18/turnfix/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Igel18/turnfix/issues)
- 📧 **Direct Contact**: [Maintainer kontaktieren]

---

**Happy Coding! 🚀**
