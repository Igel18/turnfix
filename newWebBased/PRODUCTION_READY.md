# TurnFix Production Deployment - FINALE LÖSUNG

## ✅ Alle Probleme behoben!

### Was wurde gelöst:

1. **❌ TypeScript Build-Fehler** → **✅ Test-Dateien ausgeschlossen**
2. **❌ CSP/CORS Netzwerk-Fehler** → **✅ Helmet & CORS konfiguriert**
3. **❌ Jury-Portal zeigt Home statt ScoreCapture** → **✅ Automatische Weiterleitung implementiert**
4. **❌ NODE_ENV nicht gesetzt** → **✅ PM2 mit Production-Mode**

---

## 🚀 Schnellstart

### Mit TurnFix-Manager (Empfohlen)
```cmd
.\TurnFix-Manager.bat
```
Wähle Option 1 oder 2 zum Starten.

### Manuell mit PM2
```powershell
cd newWebBased
npx pm2 start ecosystem.config.js --env production
npx pm2 logs
npx pm2 status
```

---

## 📡 Zugriff

### Lokal (auf diesem PC)
- **Hauptapplikation**: http://localhost:3001
- **Jury-Portal**: http://localhost:3002

### Netzwerk (von allen Geräten im LAN)
- **Hauptapplikation**: http://192.168.1.108:3001
- **Jury-Portal**: http://192.168.1.108:3002

*(Ersetze 192.168.1.108 mit deiner aktuellen IP)*

---

## 🔧 Technische Details

### Architektur
```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│  http://192.168.1.108:3001 (Main App)   │
│  http://192.168.1.108:3002 (Jury)       │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌───────▼─────────┐
│ Main Server  │  │  Jury Server    │
│ Port 3001    │  │  Port 3002      │
│              │  │                 │
│ • Frontend   │  │ • Frontend      │
│ • API        │  │ • API Proxy ────┼──┐
│ • Database   │  │   → Main Server │  │
└──────────────┘  └─────────────────┘  │
       ▲                                │
       └────────────────────────────────┘
```

### PM2 Konfiguration (`ecosystem.config.js`)
- **turnfix-server**: Port 3001, serviert Frontend + API
- **turnfix-jury-server**: Port 3002, serviert Jury-Frontend + API-Proxy

### Automatische Weiterleitung
```typescript
// In App.tsx
const isJuryPortal = window.location.port === '3002';

<Route path="/" element={
  isJuryPortal 
    ? <Navigate to="/score-capture" replace /> 
    : <Home />
} />
```

---

## 🛠️ PM2 Befehle

### Server-Management
```powershell
# Status anzeigen
npx pm2 status

# Logs anzeigen
npx pm2 logs

# Server neu starten
npx pm2 restart all

# Server stoppen
npx pm2 stop all

# Server löschen
npx pm2 delete all

# Monitoring
npx pm2 monit
```

### Build-Befehle
```powershell
# Kompletter Build (Server + Client + Jury)
cd newWebBased/server
npm run build:all
cd ../client
npm run jury:build

# Nur Server
cd newWebBased/server
npm run build

# Nur Frontend
cd newWebBased/client
npm run build

# Nur Jury-Portal
cd newWebBased/client
npm run jury:build
```

---

## 📁 Dateistruktur

```
newWebBased/
├── server/
│   ├── dist/              # Kompilierter Server-Code
│   ├── src/
│   │   └── index.ts       # Hauptserver (NODE_ENV=production → serviert Frontend)
│   └── package.json       # Scripts: build, build:all, pm2:start:prod
│
├── client/
│   ├── dist/              # Hauptapplikation Build
│   ├── dist-jury/         # Jury-Portal Build
│   ├── src/
│   │   ├── App.tsx        # Routing mit Jury-Weiterleitung
│   │   └── main.tsx       # Entry-Point
│   └── package.json       # Scripts: build, jury:build
│
├── jury-server/
│   ├── src/
│   │   └── index.js       # Jury-Server mit API-Proxy
│   └── package.json
│
├── ecosystem.config.js    # PM2 Konfiguration
└── logs/                  # PM2 Logs
    ├── server-out.log
    ├── server-error.log
    ├── jury-out.log
    └── jury-error.log
```

---

## 🔒 Sicherheit

### Content-Security-Policy (CSP)
Beide Server (Main & Jury) haben angepasste CSP-Headers:
- ✅ Erlaubt self-hosted assets
- ✅ Erlaubt inline scripts/styles (für React)
- ✅ Erlaubt WebSocket-Verbindungen
- ✅ Cross-Origin Resource Sharing aktiviert

### CORS
Beide Server erlauben:
- ✅ Localhost (alle Ports)
- ✅ Netzwerk-IPs auf Ports 3001, 3002, 5173, 5174
- ✅ Credentials/Cookies
- ✅ Alle Standard-HTTP-Methoden

---

## 🐛 Troubleshooting

### Problem: "Address already in use"
```powershell
# Alle Node-Prozesse beenden
Get-Process node | Stop-Process -Force

# Oder spezifische Ports freigeben
netstat -ano | findstr ":3001"
# Dann: taskkill /PID <PID> /F
```

### Problem: Frontend zeigt 404
```powershell
# Prüfe NODE_ENV
npx pm2 env 0  # Sollte NODE_ENV=production zeigen

# Rebuild erforderlich
cd newWebBased/server
npm run build:all
npx pm2 restart all
```

### Problem: Jury-Portal zeigt Home statt ScoreCapture
```powershell
# Rebuild Jury-Portal
cd newWebBased/client
npm run jury:build

# PM2 neu starten
cd ../
npx pm2 restart turnfix-jury-server
```

### Problem: CSP/CORS Fehler im Browser
```powershell
# Prüfe Browser-Konsole
# Sollte KEINE Fehler zeigen wie:
# - "Content-Security-Policy blocked..."
# - "CORS request failed..."

# Falls doch:
cd newWebBased
npx pm2 logs turnfix-server --lines 50
# Prüfe auf Fehler im Log
```

---

## 📝 Wichtige Dateien

### Geändert für Production Deployment:
1. **server/src/index.ts**
   - Helmet CSP konfiguriert
   - CORS für Netzwerk-IPs
   - Frontend-Serving im Production-Mode

2. **jury-server/src/index.js**
   - Helmet hinzugefügt
   - CORS konfiguriert
   - CSP angepasst

3. **client/src/App.tsx**
   - Automatische Weiterleitung für Jury-Portal
   - `isJuryPortal` Erkennung via Port

4. **client/tsconfig.json**
   - Test-Dateien ausgeschlossen
   - Schnellerer Build

5. **ecosystem.config.js**
   - PM2 Konfiguration für beide Server
   - Environment-Variablen (production/development)

---

## ✅ Deployment Checklist

### Vor dem Start:
- [ ] PostgreSQL läuft
- [ ] Node.js installiert (v18+)
- [ ] npm installiert
- [ ] Dependencies installiert (`npm install` in server, client, jury-server)

### Erster Start:
- [ ] `npm run build:all` in `server/`
- [ ] `npm run jury:build` in `client/`
- [ ] `npx pm2 start ecosystem.config.js --env production`
- [ ] `npx pm2 save` (optional, speichert für Auto-Start)

### Testen:
- [ ] http://localhost:3001 → Zeigt Home-Page
- [ ] http://localhost:3002 → Zeigt ScoreCapture (Jury)
- [ ] http://192.168.1.108:3001 → Zeigt Home-Page
- [ ] http://192.168.1.108:3002 → Zeigt ScoreCapture (Jury)
- [ ] Browser-Konsole: Keine CSP/CORS Fehler

---

## 🎉 Fertig!

Dein TurnFix-System läuft jetzt im Production-Mode mit:
- ✅ PM2 Process Management
- ✅ Automatische Neustarts bei Fehlern
- ✅ Getrennte Logs für Server und Jury
- ✅ Netzwerk-Zugriff von allen Geräten
- ✅ Korrekte Jury-Portal Weiterleitung
- ✅ Production-optimierte Builds

**Viel Erfolg bei deinem Wettkampf! 🏆**
