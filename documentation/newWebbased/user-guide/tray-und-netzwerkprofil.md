# Tray-App und Windows-Netzwerkprofil

Die optionale TurnFix-Tray-App zeigt den Status des TurnFix-Servers und des Jury-Servers an. Sie dient außerdem dazu, die installierten Serverdienste zu starten, zu stoppen oder neu zu starten. Die Tray-App ist nicht dasselbe wie die Windows-Taskleiste: Ihr Symbol befindet sich im Infobereich neben der Uhr und ist gegebenenfalls hinter dem Pfeil für ausgeblendete Symbole verborgen.

## Tray-App verwenden

Das Symbol ist je nach Status grün (beide Server laufen), gelb (nur ein Server läuft) oder rot (Server gestoppt). Mit Rechtsklick auf das Symbol stehen unter anderem diese Aktionen zur Verfügung:

- Server starten, stoppen oder neu starten
- TurnFix oder das Jury-Portal im Browser öffnen
- den Log-Ordner öffnen
- **Netzwerkprofile verwalten...**

Die Tray-App ist eine optionale Installer-Komponente. Starten, Stoppen und Neustarten steuern je nach Installation den Windows-Dienst oder den PM2-Prozess; für die Verwaltung von Windows-Diensten benötigt die Tray-App Administratorrechte.

## Was bedeutet „Netzwerkprofil“?

Das ist eine Windows-Einstellung für die aktuelle Netzwerkverbindung und **kein TurnFix-Benutzer-, Wettkampf- oder Anwendungsprofil**:

- **Öffentlich** ist für nicht vertrauenswürdige Netze gedacht, zum Beispiel öffentliches WLAN.
- **Privat** ist für ein vertrauenswürdiges Heim- oder Veranstaltungsnetz gedacht, in dem andere Geräte den TurnFix-Rechner erreichen dürfen.
- **Domäne** wird zentral durch eine Windows-Domäne verwaltet und kann in diesem Dialog nicht umgeschaltet werden.

Die im Installer angelegten TurnFix-Firewallregeln gelten für private Netzwerke. Ein Wechsel zu **Privat** kann daher nötig sein, wenn Tablets oder andere Rechner im selben vertrauenswürdigen Netzwerk auf die TurnFix-Verwaltung oder das Jury-Portal zugreifen sollen. Für die Nutzung ausschließlich am TurnFix-Rechner ist der Wechsel normalerweise nicht erforderlich.

## Netzwerkprofil sicher ändern

1. Mit Rechtsklick auf das TurnFix-Symbol **Netzwerkprofile verwalten...** wählen.
2. In der Liste die richtige Verbindung anhand von Netzwerkname und Schnittstelle auswählen.
3. **Profil wechseln** wählen und die Sicherheitsabfrage bestätigen.
4. Prüfen, ob Windows das gewünschte Profil anzeigt.

Der Wechsel ändert die Windows-Netzwerkkategorie und damit die Firewall-Behandlung für diese Verbindung; er betrifft nicht nur TurnFix. Nur ein Netzwerk, dem Sie vertrauen und dessen Geräte Sie kennen, auf **Privat** setzen. Ein öffentliches oder fremdes WLAN nicht auf privat umstellen. Den Netzwerkzugriff zusätzlich anhand der [Netzwerk- und Firewall-Konfiguration](../deployment/network.md) prüfen.

Beim Start des TurnFix-Servers kann die Tray-App außerdem auf öffentliche Verbindungen hinweisen. Das ist eine Warnung, nicht die Aufforderung, jedes Netzwerk auf privat umzustellen.
