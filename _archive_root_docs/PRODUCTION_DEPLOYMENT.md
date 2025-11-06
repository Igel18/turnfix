# 🚀 TurnFix Production Deployment Guide

## 📊 Port-Übersicht

### Development-Modus (für Entwickler)
```
Frontend (Vite):     http://localhost:5173
Jury-Portal (Vite):  http://localhost:5174  
Backend API:         http://localhost:3001
```

### Production-Modus (PM2 / TurnFix-Manager) ✅
```
Hauptanwendung:      http://localhost:3001  (Backend + Frontend integriert)
Kampfrichter-Portal: http://localhost:3002
```

## 🎯 **NEU: Frontend wird vom Backend serviert!**

Ab sofort wird das Frontend im Production-Modus **direkt vom Backend-Server** ausgeliefert:

- ✅ **Nur noch ein Port** (3001) für die Hauptanwendung
- ✅ **Keine separate Frontend-Instanz** nötig
- ✅ **Einfacheres Deployment** 
- ✅ **Bessere Performance** durch statische Dateien
- ✅ **SPA-Routing** funktioniert out-of-the-box

## 🔧 Wie funktioniert das?

### 1. **Build-Prozess**
```bash
# Im server-Verzeichnis:
npm run build:all

# Dieser Befehl:
# 1. Kompiliert TypeScript → JavaScript (Backend)
# 2. Baut React Frontend → statische Dateien (Client)
```

### 2. **Statische Dateien werden serviert**
```typescript
// server/src/index.ts
if (process.env.NODE_ENV === 'production') {
  // Serviere Frontend aus client/dist
  app.use(express.static(clientDistPath));
  
  // Alle anderen Routes → index.html (SPA-Routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}
```

### 3. **PM2 startet nur noch 2 Prozesse**
- `turnfix-server`: Port 3001 (Backend + Frontend)
- `turnfix-jury-server`: Port 3002 (Jury-Portal)

## 🌐 Netzwerk-Zugriff

### Lokal (nur dieser PC):
```
Verwaltung:     http://localhost:3001
Kampfrichter:   http://localhost:3002
```

### Im Netzwerk (Tablets, Handys, andere PCs):
```
Verwaltung:     http://192.168.1.108:3001
Kampfrichter:   http://192.168.1.108:3002
```
*(IP-Adresse variiert je nach Netzwerk)*

## 📦 Deployment mit TurnFix-Manager

### Erster Start:
```batch
TurnFix-Manager.bat
→ Option 1: TurnFix STARTEN
```

Das Script:
1. ✅ Prüft ob `node_modules` installiert sind
2. ✅ Prüft ob Backend kompiliert ist
3. ✅ Prüft ob Frontend gebaut ist
4. ✅ Baut fehlende Komponenten automatisch
5. ✅ Startet PM2 mit beiden Servern

### Build neu erstellen:
```batch
TurnFix-Manager.bat
→ Option 8: Erweiterte Optionen
→ Option 3: Build neu erstellen
```

## 🔥 Firewall-Konfiguration

Für Netzwerk-Zugriff müssen Windows Firewall-Regeln aktiviert werden:

```batch
TurnFix-Manager.bat
→ Option 8: Erweiterte Optionen
→ (wird in einem separaten Menü verwaltet)
```

### Benötigte Ports:
- **3001**: Hauptanwendung (Backend + Frontend)
- **3002**: Kampfrichter-Portal

## 🛠️ Manuelle Befehle

### Backend + Frontend bauen:
```bash
cd newWebBased/server
npm run build:all
```

### Nur Backend:
```bash
cd newWebBased/server
npm run build
```

### Nur Frontend:
```bash
cd newWebBased/client
npm run build
```

### PM2 starten:
```bash
cd newWebBased/server
npm run pm2:start:prod
```

### PM2 Status:
```bash
npx pm2 status
```

### PM2 Logs:
```bash
npx pm2 logs
```

### PM2 stoppen:
```bash
npx pm2 stop all
```

## 📁 Dateistruktur (Production)

```
newWebBased/
├── server/
│   ├── dist/              # Kompiliertes Backend (TypeScript → JavaScript)
│   │   └── index.js       # Haupt-Server
│   ├── src/               # Backend-Quellcode
│   └── package.json
├── client/
│   ├── dist/              # Gebautes Frontend (React → statische Dateien)
│   │   ├── index.html     # SPA Entry Point
│   │   ├── assets/        # CSS, JS, Bilder
│   │   └── ...
│   ├── src/               # Frontend-Quellcode
│   └── package.json
└── jury-portal/
    ├── dist/              # Gebautes Jury-Portal
    └── src/               # Jury-Portal-Quellcode
```

## ✅ Vorteile der neuen Architektur

| Feature | Vorher | Jetzt |
|---------|--------|-------|
| **Ports** | 3 (5173, 3001, 3002) | 2 (3001, 3002) |
| **Deployment** | 2 separate Prozesse | 1 Prozess für Haupt-App |
| **CORS-Probleme** | Möglich | Keine (gleicher Port) |
| **Caching** | Schwierig | Einfach (static files) |
| **Setup** | Komplex | Einfach (TurnFix-Manager) |

## 🎓 Für Entwickler

### Development-Modus (mit Hot-Reload):
```bash
# Terminal 1: Backend
cd newWebBased/server
npm run dev

# Terminal 2: Frontend
cd newWebBased/client
npm run dev

# → Frontend: http://localhost:5173
# → Backend:  http://localhost:3001
```

### Production-Test lokal:
```bash
cd newWebBased/server
npm run build:all
npm run pm2:start:prod

# → Hauptanwendung: http://localhost:3001
# → Jury-Portal:     http://localhost:3002
```

## 📞 Support

Bei Problemen:
1. TurnFix-Manager → Option 5: Live-Logs anzeigen
2. TurnFix-Manager → Option 4: Status anzeigen
3. GitHub Issues: https://github.com/Igel18/turnfix/issues

---

**Version**: 2.0.0  
**Letzte Aktualisierung**: 15. Oktober 2025
