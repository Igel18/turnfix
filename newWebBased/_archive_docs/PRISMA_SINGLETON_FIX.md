# Prisma Connection Pool Fix

## Problem
Nach der Implementierung des dynamischen Feld-Mappings traten folgende Fehler auf:

```
Error: Too many database connections opened: FATAL: tut mir leid, schon zu viele Verbindungen
Error: Can't reach database server at `192.168.1.51:5432`
```

### Ursache
In allen Route-Dateien wurde jeweils eine neue `PrismaClient`-Instanz erstellt:

```typescript
// FALSCH - Erstellt bei jedem Request eine neue Verbindung
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

Dies führte zu:
- **Connection Pool Exhaustion**: Hunderte offene Datenbankverbindungen
- **Memory Leaks**: Jede PrismaClient-Instanz benötigt Speicher
- **Performance-Probleme**: Langsame Responses durch Verbindungs-Overhead

## Lösung: Singleton Pattern

### 1. Zentraler Prisma Client
Neue Datei `server/src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.DEBUG === 'true' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

### 2. Verwendung in Routes
```typescript
// RICHTIG - Importiert den Singleton
import prisma from '../lib/prisma';

// ENTFERNT:
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
```

## Betroffene Dateien

### Sofort behoben (wegen 500 Errors):
- ✅ `server/src/routes/formulas.ts`
- ✅ `server/src/routes/disciplineGroups.ts`
- ✅ `server/src/routes/layouts.ts`

### TODO - Alle anderen Route-Dateien sollten aktualisiert werden:
- `server/src/routes/auditLogs.ts`
- `server/src/routes/competition-status.ts`
- `server/src/routes/configuration.ts`
- `server/src/routes/eventParticipants.ts`
- `server/src/routes/events.ts`
- `server/src/routes/medals_broken.ts`
- `server/src/routes/medals-simple.ts`
- `server/src/routes/medals_old.ts`
- `server/src/routes/medals_ultra_simple.ts`
- `server/src/routes/meldematrix.ts`
- `server/src/routes/participants_simple.ts`
- `server/src/routes/persons.ts`
- `server/src/routes/refreshTokens.ts`
- `server/src/routes/regions.ts`
- `server/src/routes/sports.ts`
- `server/src/routes/scores.ts`
- `server/src/routes/statuses.ts`
- `server/src/routes/teams.ts`
- `server/src/routes/squadManagement.ts`

## Vorteile

### 1. Performance
- ✅ Wiederverwendung der Datenbankverbindung
- ✅ Kein Connection Pool Exhaustion
- ✅ Schnellere Request-Zeiten

### 2. Ressourcen
- ✅ Reduzierter Speicherverbrauch
- ✅ Weniger DB-Verbindungen
- ✅ Effiziente Connection Pool Nutzung

### 3. Stabilität
- ✅ Keine "Too many connections" Fehler mehr
- ✅ Konsistentes Logging (zentral konfigurierbar)
- ✅ Bessere Fehlerbehandlung

## Debug-Modus
Wenn `DEBUG=true` gesetzt ist, werden alle Queries geloggt:

```typescript
new PrismaClient({
  log: process.env.DEBUG === 'true' ? ['query', 'error', 'warn'] : ['error'],
})
```

## Best Practices

### DO ✅
```typescript
import prisma from '../lib/prisma';

router.get('/', async (req, res) => {
  const data = await prisma.tfx_formeln.findMany();
  res.json(data);
});
```

### DON'T ❌
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();  // Creates new instance!

router.get('/', async (req, res) => {
  const data = await prisma.tfx_formeln.findMany();
  res.json(data);
});
```

## Datum
2025-01-15 - Implementiert als Hotfix für Connection Pool Probleme nach Dynamic Field Mapping
