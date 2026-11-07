# Offline-Wiederherstellung

## Automatische Sicherung

Unter Einstellungen > Sicherung lassen sich die automatische Sicherung, das Intervall, ein absolutes Zielverzeichnis und die Anzahl der aufzubewahrenden Sicherungen konfigurieren. Die Funktion ist zunächst ausgeschaltet; die Vorgaben sind 30 Minuten und 20 Sicherungen. Das Speichern der allgemeinen Konfiguration kann einen PM2-Neustart auslösen und den Betrieb vorübergehend unterbrechen. Sobald der Server wieder läuft, beginnt er innerhalb von 30 Sekunden mit der ersten Sicherung. Danach wird das Intervall ab dem letzten erfolgreichen Abschluss gemessen. Der Server muss laufen; im ausgeschalteten Zustand finden keine Sicherungen statt. Bei einem Serverneustart wird erneut eine Sicherung gestartet.

Das Ziel sollte auf einem anderen physischen Datenträger oder einem verfügbaren Netzlaufwerk liegen. Ein Laufwerksbuchstabe muss für das Konto des TurnFix-Serverprozesses erreichbar sein; bei Windows-Diensten ist ein UNC-Pfad oft geeigneter. Der Statusbereich in den Einstellungen zeigt den letzten Erfolg oder Fehler seit dem Serverstart. Nach Einrichtung unbedingt eine Sicherung und eine Wiederherstellung auf einem Ersatzrechner erproben.

Der Server verwendet `pg_dump` im PostgreSQL-Custom-Format sowie separate Kopien der Dateien. PostgreSQL-Clientwerkzeuge müssen installiert und mit der Serverversion kompatibel sein. Gesichert werden die aktive Datenbank und, soweit vorhanden:

| Sicherungsname | Ursprünglicher Ort |
| --- | --- |
| `server-config` | `newWebBased/server/config` oder das konfigurierte Verzeichnis der Anwendungskonfiguration |
| `app-config` | Aktive Anwendungskonfiguration, auch bei abweichendem Dateipfad |
| `app-settings` | Aktive Anwendungseinstellungen, auch bei abweichendem Dateipfad |
| `server-env` | Aktive Server-Umgebungsdatei |
| `uploads` | `uploads` relativ zum Arbeitsverzeichnis des Serverprozesses, einschließlich Bildern, XML und GymNet-Metadaten |
| `server-icons` | `newWebBased/server/public/icons` |
| `root-config` | `config` im Repository-Hauptverzeichnis |
| `exports` | `exports` relativ zum Arbeitsverzeichnis des Serverprozesses |

Die Sicherung enthält keine vollständige TurnFix- oder PostgreSQL-Installation. Auf dem Ersatzrechner müssen die passende TurnFix-Version, PostgreSQL, Benutzer und Berechtigungen bereitstehen. Die Datenbank wird konsistent gesichert; gleichzeitig veränderte Dateien können jedoch einen anderen Zeitpunkt als der Datenbank-Dump abbilden. Für eine streng abgestimmte Momentaufnahme Änderungen während der Sicherung vermeiden.

Nach erfolgreicher Sicherung werden ältere erkannte TurnFix-Sicherungen über der eingestellten Anzahl entfernt. Meldet das Ziel beim Schreiben Platzmangel, wird der unvollständige Versuch entfernt. Wenn mindestens zwei ältere erkannte Sicherungen vorhanden sind, wird die älteste gelöscht und erneut versucht; die letzte ältere Sicherung bleibt erhalten. Bei anderen Fehlern wird keine alte Sicherung zur Platzgewinnung gelöscht. Nicht jede lokalisierte Fehlermeldung von `pg_dump` lässt sich als Platzmangel erkennen; der Fehler erscheint dann im Status. Der Zielordner sollte ausschließlich für Sicherungen dieser Installation verwendet werden.

## Leistung messen

Der Dump liest Daten aus PostgreSQL und komprimiert sie; das Kopieren der Dateien verursacht zusätzlichen Datenträger- und gegebenenfalls Netzwerkverkehr. Datenbankgröße, Dateimenge, CPU, Zielmedium und gleichzeitiger Betrieb bestimmen Dauer und Last. Es gibt keine allgemeingültige Zahl und keine automatische Begrenzung der CPU- oder Datenträgerlast. Der Prozess läuft nicht parallel zu einem weiteren Sicherungslauf, kann aber den normalen Betrieb trotzdem verlangsamen.

Vor einem Wettkampf mit typischer Datenmenge eine Probesicherung ausführen und im Windows-Task-Manager CPU, Datenträgerauslastung sowie die Dauer bis zur Erfolgsmeldung beobachten. Währenddessen typische Eingaben und Abfragen prüfen. Bei merklicher Beeinträchtigung das Intervall verlängern oder ein schnelleres externes Ziel verwenden. Für 20 Sicherungen ist ungefähr das 20-Fache einer Sicherung plus Platz für einen weiteren gerade laufenden Versuch einzuplanen; die Größen können sich ändern.

Die Wiederherstellung ist eine eigenständige CLI. Sie wird weder vom Server noch automatisch beim Start ausgeführt. Sie verarbeitet ausschließlich neue Sicherungsordner mit `manifest.json` und einem PostgreSQL-Custom-Dump `database.dump`. Ältere Formate werden nicht unterstützt.

## Voraussetzungen

- Nur vertrauenswürdige Sicherungen verwenden. PostgreSQL-Dumps können ausführbaren SQL-Code enthalten; ein manipulierter Dump ist kein sicheres Eingabeformat.
- **Server, Jury-Server, automatische Neustarts und alle anderen Clients stoppen.** Der Betreiber muss während des gesamten Vorgangs sicherstellen, dass sich niemand mit der Zieldatenbank verbindet und niemand Sicherung, Zielkonfiguration oder Staging-Verzeichnis verändert. Die Prüfung und `pg_restore` sind keine exklusive Sperre gegen spätere Verbindungen oder Änderungen.
- Eine separate, ausdrücklich vorbereitete leere PostgreSQL-Datenbank verwenden, vorzugsweise neu aus `template0` erstellt. Niemals eine produktive oder laufende Datenbank als Ziel auswählen. Die CLI erstellt, löscht oder leert keine Datenbanken.
- PostgreSQL-Clientwerkzeuge installieren. `pg_restore` muss im `PATH` oder unter `Program Files/PostgreSQL/<Version>/bin` verfügbar sein und das Dumpformat der Sicherung unterstützen.
- Ein bereits vorhandenes, leeres Staging-Verzeichnis sowie eine separate Zielkonfigurationsdatei anlegen. Alle drei übergebenen Pfade müssen absolut sein. Keine Symlinks oder Windows-Junctions in den Pfaden und gesicherten Quellen verwenden.
- Das Konto muss alle Katalogabfragen ausführen und die Wiederherstellung durchführen dürfen. Bei unzureichenden Rechten schlägt die Prüfung geschlossen fehl.

## Zielkonfiguration

Eine separate JSON-Datei mit den Zugangsdaten **der leeren Zieldatenbank** anlegen, zum Beispiel `C:\\restore\\target.json`:

```json
{
  "databaseUrl": "postgresql://restore_user:PASSWORT@localhost:5432/turnfix_restore"
}
```

Sonderzeichen in Benutzername, Passwort und Datenbankname müssen URL-kodiert sein. Der Datenbankname darf höchstens 63 Zeichen lang sein, nur ASCII-Buchstaben, Ziffern, Unterstrich, Bindestrich und `$` enthalten und muss mit einem Buchstaben, einer Ziffer oder einem Unterstrich beginnen. Als URL-Parameter wird nur `sslmode` unterstützt. Die Datei enthält ein Klartextpasswort und muss durch Betriebssystemrechte geschützt und anschließend sicher entfernt werden. Die CLI liest weder automatisch die laufende Anwendungskonfiguration noch die Datenbankverbindung aus Umgebungsvariablen.

## Aufruf

Nach dem Kompilieren des Servers, aus dem Repository-Hauptverzeichnis in PowerShell:

```powershell
node .\newWebBased\server\dist\scripts\restoreBackup.js --backup 'C:\restore\turnfix-backup-2026-01-01' --target-config 'C:\restore\target.json' --staging 'C:\restore\staging' --confirm-empty-database 'turnfix_restore'
```

Der Bestätigungswert muss exakt dem dekodierten Datenbanknamen aus der Zielkonfiguration entsprechen. Er ist kein Passwort. Die CLI prüft die Kataloge und lehnt belegte Datenbanken und bereits vorhandene andere Verbindungen ab. Ein Passwort wird nicht als Prozessargument übergeben; `pg_restore` erhält es über `PGPASSWORD`. PostgreSQL-Zugangsdaten in Umgebungsvariablen können je nach Betriebssystem für andere Prozesse sichtbar sein; den Rechner entsprechend absichern.

`pg_restore` wird ohne Shell und mit `--single-transaction`, `--exit-on-error`, `--no-owner` und `--no-acl` gestartet. Bei Datenbankfehlern werden keine Dateien im Staging-Verzeichnis angelegt. Bei einem Fehler während des anschließenden Kopierens kann das Staging unvollständig sein, während die Datenbank bereits wiederhergestellt ist: Inhalt kontrollieren, Staging manuell leeren und für einen erneuten vollständigen Lauf eine neu vorbereitete leere Datenbank verwenden. Auf einen erfolgreichen Abschluss prüfen, bevor Dateien übernommen werden.

## Manuelle Übernahme

Die benannten Quellen aus dem Manifest werden unter ihrem jeweiligen Namen ins Staging kopiert, etwa `server-config`, `server-env`, `uploads`, `server-icons`, `root-config` oder `exports`. Quellen, die bei der Sicherung nicht vorhanden waren, fehlen auch im Staging. Es werden keine Dateien automatisch in die Installation zurückgeschrieben.

Bei weiterhin gestoppten Diensten die Staging-Inhalte prüfen und die benötigten Dateien manuell an die zur eigenen Installation passenden Originalorte übertragen. Vorhandene Installationsdateien bei Bedarf separat sichern. Insbesondere können gesicherte Konfiguration und `.env` auf die ursprüngliche Datenbank verweisen: Zugangsdaten, Datenbankziel und maschinenspezifische Pfade vor einem Neustart sorgfältig prüfen und anpassen. Erst danach Dienste wieder starten und die Wiederherstellung überprüfen.

## Vertraulichkeit und Grenzen

Die Sicherung einschließlich PostgreSQL-Dump, Konfiguration, `.env`, Uploads und Staging kann personenbezogene Daten, Zugangsdaten und Geheimnisse enthalten. Alle Verzeichnisse durch restriktive Rechte schützen, nur verschlüsselt übertragen und sicher aufbewahren. Staging und Zielkonfiguration nach Gebrauch sicher entsorgen.

Die Katalogprüfung ist eine konservative Schutzmaßnahme, kein Beweis gegen parallele Änderungen, manipulierte Dumps oder besondere PostgreSQL-Konfigurationen. Exklusive Offline-Wartung und vertrauenswürdige Sicherungen bleiben zwingend. Globale PostgreSQL-Rollen, Rechte und sonstige clusterweite Einstellungen werden nicht wiederhergestellt; Eigentümer und Berechtigungen müssen separat geprüft werden.