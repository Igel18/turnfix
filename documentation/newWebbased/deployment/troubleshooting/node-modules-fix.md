# Beschädigte Node.js-Abhängigkeiten beheben

Ein Fehler wie `Cannot find module './internal/streams/buffer_list'` kann auf unvollständig installierte oder beschädigte Abhängigkeiten hinweisen.

## Windows-Installer-Installation

Prüfen Sie zuerst den Status der installierten TurnFix-Dienste über das optionale Tray oder die Windows-Diensteverwaltung und sehen Sie die Protokolle im Installationsverzeichnis unter `server/logs/` ein. Windows-Dienste und Tray sind getrennte optionale Installer-Komponenten; ohne Dienst-Komponente werden keine TurnFix-Dienste eingerichtet. Bei beschädigten installierten Dateien verwenden Sie den aktuellen Windows-Installer erneut. Anschließend die installierten Dienste prüfen und die Anwendung unter `http://localhost:3001` öffnen.

## Quellcode-Installation für Entwickler

Diese Befehle gelten für einen Checkout, nicht für die installierte Anwendung. Stoppen Sie zunächst die selbst gestarteten Entwicklungs- oder PM2-Prozesse. Sichern Sie lokale Änderungen und prüfen Sie Ihre Netzwerkverbindung und den verfügbaren Speicherplatz. Führen Sie anschließend im Verzeichnis `newWebBased` aus:

```powershell
npm run install:all
npm run build
```

Falls die Abhängigkeiten weiterhin beschädigt sind, können die betroffenen `node_modules`-Verzeichnisse im Checkout nach Prüfung entfernt und mit `npm run install:all` neu installiert werden. Starten Sie danach Ihren Entwicklungs- oder PM2-Betrieb entsprechend der [Deployment-Anleitung](../production.md). Betreiben Sie ihn nicht gleichzeitig mit installierten Diensten auf denselben Ports.
