# Network Access Fixes

## Problembeschreibung

Bei Zugriff über Netzwerk-IP (z.B. http://192.168.1.108:3001) traten folgende Probleme auf:

1. **CSP (Content-Security-Policy) Fehler**
   - Browser versuchte HTTP → HTTPS Upgrade
   - Blockierung von Assets (JS, CSS)
   - Fehler: "Upgrade der unsicheren Anfrage zur Verwendung von 'https'"

2. **CORS-Fehler**
   - Cross-Origin Anfragen wurden blockiert
   - Nur localhost-Origins waren erlaubt
   - Fehler: "CORS-Anfrage schlug fehl"

3. **Falscher Jury-Portal Link**
   - Hardcoded URL `http://localhost:5174`
   - Redirect führte zu localhost statt Netzwerk-IP

## Gelöste Probleme

### 1. Content-Security-Policy (CSP) Fix

**Datei**: `server/src/index.ts`

**Problem**: Helmet's Standard-CSP war zu restriktiv für statisches Frontend-Serving.

**Lösung**: Helmet mit angepasster CSP konfiguriert:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

**Ergebnis**: 
- Kein HTTP → HTTPS Upgrade mehr
- Assets werden korrekt geladen
- Self-hosted resources erlaubt

### 2. CORS Network Access Fix

**Datei**: `server/src/index.ts`

**Problem**: CORS erlaubte nur statische localhost-Origins.

**Lösung**: Dynamische Origin-Validierung mit Regex:

```typescript
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Allow localhost/127.0.0.1 on any port
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow any IP address on ports 3001, 3002, 5173, 5174
    const urlPattern = /^http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(3001|3002|5173|5174)$/;
    if (urlPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Allow specific configured origins
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

**Ergebnis**:
- ✅ Netzwerk-Zugriff von beliebigen IPs erlaubt
- ✅ Ports 3001, 3002, 5173, 5174 validiert
- ✅ Localhost weiterhin unterstützt
- ✅ Credentials/Cookies funktionieren

### 3. Dynamische Jury-Portal URLs

**Datei**: `client/src/pages/Home.tsx`

**Problem**: Hardcoded `http://localhost:5174` führte zu localhost-Redirects.

**Vorher**:
```tsx
href="http://localhost:5174"
```

**Nachher**:
```tsx
href={`${window.location.protocol}//${window.location.hostname}:3002`}
```

**Ergebnis**:
- Bei Zugriff via `http://192.168.1.108:3001` → Jury-Portal: `http://192.168.1.108:3002`
- Bei Zugriff via `http://localhost:3001` → Jury-Portal: `http://localhost:3002`
- Automatische Anpassung an aktuellen Host

## Testen

### 1. Lokaler Zugriff
```
http://localhost:3001         → Hauptapplikation
http://localhost:3002         → Jury-Portal
```

### 2. Netzwerk-Zugriff
```
http://192.168.1.108:3001     → Hauptapplikation (von jedem Gerät im Netzwerk)
http://192.168.1.108:3002     → Jury-Portal (von jedem Gerät im Netzwerk)
```

### 3. Browser-Konsole Prüfung
- ✅ Keine CSP-Warnungen mehr
- ✅ Keine CORS-Fehler
- ✅ Alle Assets laden korrekt
- ✅ Jury-Portal Link nutzt korrekte IP

## Port-Übersicht

| Port | Service | Zugriff | Zweck |
|------|---------|---------|-------|
| 3001 | Main Server + Frontend | Netzwerk (0.0.0.0) | Hauptapplikation (Production) |
| 3002 | Jury Portal | Netzwerk (0.0.0.0) | Kampfrichter-Interface |
| 5173 | Vite Dev Server | Localhost only | Development (optional) |
| 5174 | ~~Jury Dev~~ | ❌ Nicht mehr verwendet | Ersetzt durch 3002 |

## Deployment

Nach diesen Fixes:

```bash
# Build
npm run build:all

# Start with PM2
pm2 start ecosystem.config.js --env production

# Check
pm2 list
pm2 logs
```

Oder mit TurnFix-Manager:
```bash
.\TurnFix-Manager.bat
# Option 2: Build and start servers
```

## Sicherheitshinweise

### Produktionsumgebung
Für echte Production-Deployments sollten:

1. **HTTPS aktiviert werden**
   ```typescript
   // CSP dann verschärfen:
   upgradeInsecureRequests: []
   ```

2. **Spezifische IPs whitelisten**
   ```typescript
   const allowedIPs = ['192.168.1.0/24'];
   ```

3. **Rate-Limiting verschärfen**
   ```typescript
   max: 100, // statt 10000
   ```

### Entwicklungsumgebung
Aktuelle Konfiguration ist optimal für:
- ✅ Lokales Netzwerk (LAN)
- ✅ Entwicklung und Testing
- ✅ Interne Veranstaltungen

## Changelog

### 2024-01-XX
- ✅ CSP-Konfiguration für Frontend-Serving angepasst
- ✅ CORS für Netzwerk-IPs erweitert
- ✅ Dynamische Jury-Portal URLs implementiert
- ✅ Port 5174 entfernt, nur noch 3001/3002 in Production
