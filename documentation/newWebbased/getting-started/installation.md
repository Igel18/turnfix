# TurnFix - Schnellstart für Anwender

## Installation

Installieren Sie TurnFix mit dem Windows-Installer aus den Projekt-Releases. Anwendung und Node.js-Laufzeit gehören zur Installation; PostgreSQL, Windows-Dienste, Firewall-Regeln und Tray sind optionale Komponenten. Wählen Sie die Dienst-Komponente, wenn der Installer die TurnFix-Dienste einrichten soll. Das Tray kann unabhängig davon ausgewählt werden; sein Autostart bei der Windows-Anmeldung ist eine zusätzliche Option.

Ohne Dienst-Komponente werden keine TurnFix-Dienste eingerichtet. Das Tray allein ersetzt keinen laufenden Server. Die Einrichtung aus dem Quellcode für Entwickler ist ein separater Betriebsweg; siehe [Produktiv-Deployment](../deployment/production.md).

## TurnFix öffnen

1. Prüfen Sie im optionalen Tray oder in der Windows-Diensteverwaltung (`services.msc`), ob `TurnFixServer` läuft, und starten Sie ihn bei Bedarf. Der Dienst ist nach erfolgreicher Installation für den automatischen Start eingerichtet.
2. Öffnen Sie [http://localhost:3001](http://localhost:3001) im Browser oder verwenden Sie die installierte Browser-Verknüpfung.
3. Für das Jury-Portal prüfen Sie zusätzlich `TurnFixJuryServer` und öffnen [http://localhost:3002](http://localhost:3002). Der Jury-Dienst wird nur eingerichtet, wenn die Jury-Server-Dateien vorhanden sind.

Die Ports 3001 und 3002 sind die Standardwerte; verwenden Sie abweichend konfigurierte Ports. Dienstaktionen können Administratorrechte erfordern. Das optionale Tray benötigt Administratorrechte und kann zur Statusprüfung und Dienststeuerung verwendet werden. Installierte Dienste laufen unabhängig davon, ob das Tray geöffnet ist.

## Zugriff im Netzwerk

Ermitteln Sie die lokale IPv4-Adresse des TurnFix-PCs mit `ipconfig`. Öffnen Sie auf einem Gerät im selben Netzwerk beispielsweise `http://192.168.1.105:3001` für die Verwaltung oder `http://192.168.1.105:3002` für das Jury-Portal. Ersetzen Sie die Beispieladresse durch die tatsächliche Adresse und passen Sie gegebenenfalls die Ports an. Für den Netzwerkzugriff müssen die passenden Firewall-Regeln eingerichtet sein; die Firewall-Komponente des Installers ist optional.

## Bei Problemen

- **Seite lädt nicht:** Prüfen Sie den Dienststatus, den verwendeten Port und gegebenenfalls die Protokolle im Installationsverzeichnis unter `server/logs/`.
- **Dienst startet nicht:** Prüfen Sie, ob PostgreSQL läuft und die Datenbankverbindung konfiguriert ist. Kontrollieren Sie die Dienst-Logs.
- **Dienst oder Tray fehlt:** Prüfen Sie, ob die jeweilige optionale Komponente installiert wurde. Ohne Tray können installierte Dienste über `services.msc` verwaltet werden.
- **Tablet erreicht TurnFix nicht:** Prüfen Sie Netzwerk, IPv4-Adresse, Port und Firewall-Regeln.

Während laufender Eingaben sollten Dienste nicht neu gestartet werden. Exportieren und sichern Sie die Ergebnisse nach dem Wettkampf.

## Weitere Hilfe

- [Produktiv-Deployment](../deployment/production.md)
- [Installer-Build und Komponenten](../deployment/installer-build.md)
- [GitHub Issues](https://github.com/Igel18/turnfix/issues)
