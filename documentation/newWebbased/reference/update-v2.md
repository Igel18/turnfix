# 🎉 TurnFix v2.0 - Production-Modus Update

## ✨ Was ist neu?

### **Frontend wird jetzt vom Backend serviert!**

Ab sofort läuft TurnFix im Production-Modus **nur noch auf 2 Ports** statt 3:

```
✅ NEU:
Port 3001: Hauptanwendung (Backend + Frontend integriert)
Port 3002: Kampfrichter-Portal

❌ ALT:
Port 5173: Frontend (Vite Dev Server)
Port 3001: Backend API
Port 3002: Kampfrichter-Portal
```

## 🚀 Vorteile

1. **Einfacheres Setup**: Nur noch 2 Prozesse statt 3
2. **Keine CORS-Probleme**: Frontend und Backend auf gleichem Port
3. **Bessere Performance**: Statische Dateien mit Caching
4. **Weniger Ports**: Einfachere Firewall-Konfiguration
5. **Ein-Klick-Start**: TurnFix-Manager macht alles automatisch

## 📦 Was wurde geändert?

### 1. **Backend (server/src/index.ts)**
```typescript
// NEU: Frontend-Serving im Production-Modus
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}
```

### 2. **Build-Prozess (server/package.json)**
```json
"build:all": "npm run build && cd ../client && npm run build"
```

### 3. **TurnFix-Manager (turnfix-manager.ps1)**
- Baut automatisch Backend + Frontend
- Zeigt Netzwerk-URLs an
- Prüft alle Komponenten

## 🔧 Migration / Upgrade

### Für bestehende Installationen:

1. **Code aktualisieren** (Git Pull)
   ```bash
   git pull origin WebInterface
   ```

2. **Dependencies installieren**
   ```bash
   cd newWebBased/server
   npm install
   cd ../client
   npm install
   ```

3. **Neu bauen**
   ```bash
   cd ../server
   npm run build:all
   ```

4. **PM2 neu starten**
   ```bash
   npm run pm2:stop
   npm run pm2:start:prod
   ```

### ODER: Einfach mit TurnFix-Manager:

```batch
TurnFix-Manager.bat
→ Option 8: Erweiterte Optionen
→ Option 3: Build neu erstellen
→ Zurück zum Hauptmenü
→ Option 3: TurnFix NEU STARTEN
```

## 🌐 Zugriff nach dem Update

### Lokal:
- **Hauptanwendung**: http://localhost:3001 ✅
- **Kampfrichter**: http://localhost:3002 ✅

### Im Netzwerk:
- **Hauptanwendung**: http://192.168.1.108:3001 ✅
- **Kampfrichter**: http://192.168.1.108:3002 ✅

*(IP-Adresse kann variieren - siehe TurnFix-Manager Option 8 → 4)*

## ⚠️ Breaking Changes

### Für Entwickler:

**Development-Modus bleibt unverändert:**
```bash
# Weiterhin 2 Terminals:
npm run dev:server  # Port 3001
npm run dev:client  # Port 5173
```

**Production-Modus hat sich geändert:**
- ~~Frontend läuft separat auf Port 5173~~ ❌
- Frontend wird vom Backend auf Port 3001 serviert ✅

### Für Anwender:

**Keine Änderungen nötig!** TurnFix-Manager macht alles automatisch.

## 📝 Checkliste

- [ ] Git Pull durchgeführt
- [ ] Dependencies installiert (`npm install`)
- [ ] Build erstellt (`npm run build:all`)
- [ ] PM2 neu gestartet
- [ ] http://localhost:3001 funktioniert
- [ ] http://localhost:3002 funktioniert
- [ ] Firewall-Regeln aktiviert (für Netzwerk-Zugriff)

## 🐛 Troubleshooting

### Problem: "Cannot GET /"
**Lösung**: Frontend nicht gebaut
```bash
cd newWebBased/server
npm run build:all
npm run pm2:restart
```

### Problem: "Port 3001 already in use"
**Lösung**: PM2 läuft bereits
```bash
npx pm2 stop all
npm run pm2:start:prod
```

### Problem: "Frontend zeigt alte Version"
**Lösung**: Browser-Cache leeren
- Chrome/Edge: `Ctrl + Shift + R`
- Firefox: `Ctrl + F5`

## 📚 Weitere Dokumentation

- **PRODUCTION_DEPLOYMENT.md**: Vollständige Deployment-Anleitung
- **README.md**: Allgemeine Projektinformationen
- **GETTING_STARTED.md**: Erste Schritte

---

**Version**: 2.0.0  
**Datum**: 15. Oktober 2025  
**Breaking Change**: Ja (nur für Development/Production-Setup)
