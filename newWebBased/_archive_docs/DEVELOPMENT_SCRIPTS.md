# TurnFix Development Scripts

Dieses Verzeichnis enthält Entwicklungs-Skripte für Windows, die das Starten, Stoppen und Überwachen der TurnFix-Anwendung vereinfachen.

## 📋 Verfügbare Skripte

### 1. start-dev.bat
**Hauptskript zum Starten aller Services**

**Features:**
- ✅ Automatisches Beenden bereits laufender Prozesse
- ✅ Startet alle 3 Services in separaten Fenstern:
  - Backend Server (Port 3001) - Blaues Fenster
  - Frontend Client (Port 5173) - Gelbes Fenster
  - Jury Portal (Port 5174) - Lila Fenster
- ✅ Erstellt automatisch Test-User
- ✅ Farbcodierte, detaillierte Logs
- ✅ Zeigt alle Zugriffs-URLs an
- ✅ Netzwerkzugriff automatisch konfiguriert

**Verwendung:**
```cmd
start-dev.bat
```

**Output:**
```
========================================
   TurnFix Web Application Startup
========================================

[INFO] Current directory: C:\...\newWebBased

========================================
   Step 1: Stopping existing processes
========================================

[INFO] Checking for processes on ports 3001, 3002, 5173, 5174...
[SUCCESS] All ports cleared

========================================
   Step 2: Starting Backend Server
========================================

[SUCCESS] Backend server starting...

... (weitere Schritte)

========================================
   TurnFix Application Started!
========================================

Access URLs:
> http://localhost:5173  (Frontend)
> http://localhost:5174  (Jury Portal)
```

### 2. stop-dev.bat
**Stoppt alle laufenden TurnFix Services**

**Features:**
- ✅ Stoppt Prozesse auf allen TurnFix-Ports
- ✅ Schließt Fenster nach Titel
- ✅ Zeigt Anzahl gestoppter Prozesse
- ✅ Fehlerbehandlung für bereits gestoppte Services

**Verwendung:**
```cmd
stop-dev.bat
```

**Output:**
```
========================================
   TurnFix Application Shutdown
========================================

[ACTION] Stopping process 12345 on port 3001
[SUCCESS] Process 12345 stopped

[SUCCESS] Stopped 3 process(es)
```

### 3. status-check.bat
**Überprüft den Status aller Services**

**Features:**
- ✅ Zeigt Status aller Ports
- ✅ Listet Process-IDs
- ✅ Zusammenfassung laufender Services
- ✅ Zeigt alle Node.js-Prozesse
- ✅ Gibt Handlungsempfehlungen

**Verwendung:**
```cmd
status-check.bat
```

**Output:**
```
========================================
   TurnFix Service Status Check
========================================

[CHECK] Backend Server (Port 3001)...
[RUNNING] Backend is running on port 3001
[INFO] Process ID: 12345

[CHECK] Frontend Client (Port 5173)...
[RUNNING] Frontend is running on port 5173
[INFO] Process ID: 12346

[CHECK] Jury Portal (Port 5174)...
[RUNNING] Jury Portal is running on port 5174
[INFO] Process ID: 12347

========================================
   Summary
========================================

Services running: 3 / 3
[SUCCESS] All services are running!
```

## 🎯 Typische Workflows

### Normaler Start
```cmd
# 1. Alle Services starten
start-dev.bat

# 2. Warten bis alle Services laufen (ca. 10-20 Sekunden)
# 3. Browser öffnen: http://localhost:5173
```

### Nach Code-Änderungen
```cmd
# Services laufen weiter und reloaden automatisch (Hot Reload)
# Kein Neustart nötig!
```

### Bei Problemen
```cmd
# 1. Status prüfen
status-check.bat

# 2. Alle Services stoppen
stop-dev.bat

# 3. Neu starten
start-dev.bat
```

### Vor dem Commit
```cmd
# 1. Services stoppen
stop-dev.bat

# 2. Git operations durchführen
git add .
git commit -m "..."
```

## 🌐 Netzwerkzugriff

### Lokaler Zugriff (auf dem Entwicklungs-PC)
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Jury Portal: http://localhost:5174

### Netzwerkzugriff (von anderen Geräten)
1. IP-Adresse herausfinden:
   ```cmd
   ipconfig
   ```
   
2. Von anderen Geräten zugreifen:
   - Frontend: http://192.168.1.X:5173
   - Jury Portal: http://192.168.1.X:5174

3. Firewall konfigurieren (siehe [FIREWALL_SETUP.md](FIREWALL_SETUP.md))

## 🎨 Fenster-Farben

Die Services laufen in separaten Fenstern mit Farbcodierung:

| Service | Farbe | Port |
|---------|-------|------|
| Backend | 🔵 Blau | 3001 |
| Frontend | 🟡 Gelb | 5173 |
| Jury Portal | 🟣 Lila | 5174 |
| Start-Script | 🟢 Grün | - |
| Stop-Script | 🔴 Rot | - |
| Status-Script | 🔵 Blau | - |

## 🐛 Fehlerbehebung

### "Port already in use"
```cmd
# Lösung: Services stoppen und neu starten
stop-dev.bat
start-dev.bat
```

### "Cannot find module"
```cmd
# Lösung: Dependencies neu installieren
cd server
npm install
cd ../client
npm install
cd ../jury-portal
npm install
cd ..
```

### Services starten nicht
```cmd
# 1. Status prüfen
status-check.bat

# 2. Manuell alle Node-Prozesse beenden
taskkill /F /IM node.exe

# 3. Neu starten
start-dev.bat
```

### Jury Portal startet nicht
```cmd
# Prüfen ob package.json existiert
cd jury-portal
if exist package.json (echo Exists) else (echo Missing!)

# Falls fehlend: Dependencies installieren
npm install
```

## 📝 Hinweise

- **Fenster nicht schließen**: Die Service-Fenster zeigen Live-Logs. Bei Problemen hier nachsehen!
- **Auto-Reload**: Frontend und Jury Portal unterstützen Hot Module Replacement (HMR)
- **Backend**: Verwendet nodemon für automatisches Neuladen bei Code-Änderungen
- **Test-User**: Wird automatisch beim Start erstellt (falls nicht vorhanden)
- **Netzwerk-Binding**: Frontend und Jury Portal binden auf 0.0.0.0 für Netzwerkzugriff

## 🔗 Weitere Dokumentation

- [FIREWALL_SETUP.md](FIREWALL_SETUP.md) - Windows Firewall Konfiguration für Netzwerkzugriff
- [GETTING_STARTED.md](GETTING_STARTED.md) - Erste Schritte und Setup-Anleitung
- [README.md](README.md) - Haupt-Dokumentation

## ⚡ Schnellreferenz

```cmd
# Starten
start-dev.bat

# Status
status-check.bat

# Stoppen
stop-dev.bat

# IP finden
ipconfig

# Logs ansehen
# → Siehe separate Fenster (Blau/Gelb/Lila)
```
