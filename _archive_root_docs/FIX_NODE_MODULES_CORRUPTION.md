# Node_modules Korruption beheben

## Problem
```
Error: Cannot find module './internal/streams/buffer_list'
```

Dieser Fehler bedeutet, dass die `node_modules` beschädigt sind (speziell das `readable-stream` Paket).

## Lösung - Auf dem anderen PC ausführen

### Schritt 1: PM2 stoppen (stoppt den Error-Spam)
```powershell
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix\newWebBased\server"
npx pm2 stop all
npx pm2 delete all
```

### Schritt 2: Alle node_modules löschen
```powershell
# Im Server-Verzeichnis
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix\newWebBased\server"
Remove-Item -Recurse -Force node_modules

# Im Client-Verzeichnis
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix\newWebBased\client"
Remove-Item -Recurse -Force node_modules

# Im Jury-Portal-Verzeichnis
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix\newWebBased\jury-portal"
Remove-Item -Recurse -Force node_modules
```

### Schritt 3: Neueste Version holen
```powershell
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix"
git pull
```

### Schritt 4: TurnFix-Manager verwenden (installiert alles neu)
```powershell
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix"
.\TurnFix-Manager.bat
```

Dann:
- **Option 1** wählen (TurnFix STARTEN)
- Der Manager wird automatisch:
  - Alle `node_modules` neu installieren
  - Alle Komponenten bauen
  - PM2 starten

## Alternative: Manuelle Neuinstallation

Falls der Manager nicht funktioniert:

```powershell
# Server
cd "C:\Users\Turnuntergau2 UA\Softwareentwicklung\GitHub\turnfix\newWebBased\server"
npm install
npm run build

# Client
cd ..\client
npm install
npm run build

# Jury-Portal
cd ..\jury-portal
npm install
npm run build

# Starten
cd ..\server
npx pm2 start ecosystem.config.js --env production
```

## Wichtig
- **Force Rebuild** (Option 8 → 3) funktioniert nur wenn `node_modules` korrekt installiert sind
- Bei korrupten `node_modules` muss man sie **löschen und neu installieren**
- Der Fehler kommt **nicht** vom Build, sondern von fehlenden Paket-Dateien

## Warum passiert das?
- Unterbrochene `npm install` (z.B. PC-Neustart während Installation)
- Netzwerkfehler während Installation
- Antivirus blockiert Dateien
- Festplatte voll während Installation
