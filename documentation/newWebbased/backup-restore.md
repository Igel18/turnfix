# Sicherung und Wiederherstellung

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

Für die Wiederherstellung stehen der direkt ausführbare Datenbank-Assistent und weiterhin eine eigenständige Offline-CLI zur Verfügung. Beide verarbeiten ausschließlich Sicherungsordner mit `manifest.json` und einem PostgreSQL-Custom-Dump `database.dump`; ältere Formate werden nicht unterstützt. Beide stellen Dateien zunächst nur in einem Staging-Verzeichnis bereit und schalten die wiederhergestellte Datenbank nicht automatisch aktiv.

## Wiederherstellung mit dem Assistenten

Der TurnFix-Server muss für diesen Weg laufen. Der Assistent unter Einstellungen > Datenbank führt die Wiederherstellung selbst über `POST /api/configuration/backup/restore` aus. Er verwendet die aktive Datenbank-Server-Konfiguration einschließlich deren Zugangsdaten, erstellt auf diesem PostgreSQL-Server atomar eine **neue** Datenbank aus `template0` und stellt den Dump dort wieder her. Eine bereits vorhandene Datenbank wird nicht übernommen oder überschrieben. Die bisher aktive Datenbank bleibt aktiv; auch nach Erfolg findet keine automatische Umschaltung statt.

### Vorbereitung und Zugriff

- Nur vertrauenswürdige Sicherungen verwenden: PostgreSQL-Dumps können ausführbaren SQL-Code enthalten. Die passende TurnFix-Version und PostgreSQL müssen bereitstehen.
- PostgreSQL-Clientwerkzeuge installieren. `pg_restore` muss im `PATH` oder unter `Program Files/PostgreSQL/<Version>/bin` verfügbar und mit dem Dump kompatibel sein. Der konfigurierte Datenbankbenutzer benötigt Zugriff auf die administrative Datenbank `postgres`, das Recht zum Erstellen einer Datenbank und ausreichende Rechte für die Wiederherstellung.
- Ein bereits vorhandenes, leeres Staging-Verzeichnis **außerhalb** des Installationsverzeichnisses auswählen. Es darf das Installationsverzeichnis weder enthalten noch darin liegen. Sicherungs- und Staging-Pfad müssen absolute, für den Serverprozess erreichbare Pfade sein; keine Symlinks oder Windows-Junctions in den Pfaden und gesicherten Quellen verwenden. Sicherung und Staging während des Vorgangs nicht verändern.
- Den Assistenten auf dem Rechner des TurnFix-Servers über eine lokale Adresse öffnen, beispielsweise `http://localhost:3001` oder im Entwicklungsbetrieb `http://localhost:5173`. Die API akzeptiert nur eine Loopback-Verbindung mit lokalem `Host` und, wenn vorhanden, lokalem HTTP(S)-`Origin` auf Port 3001, 5173 oder dem Port des Servers. Bei Anfragen ohne `Origin` ist der Header `X-TurnFix-Restore: 1` erforderlich; der Wizard setzt ihn. Fernzugriff und nichtlokale Origins werden abgelehnt.
- Die lokale Prüfung ersetzt keinen Zugangsschutz: Rechner, Benutzerkonten, TurnFix-Zugriff und Datenbankzugang durch geeignete Betriebssystem- und Netzwerkrechte schützen. Unbefugte lokale Benutzer und Prozesse dürfen die API nicht aufrufen oder Dateien und Zugangsdaten verändern können.

Im Vite-Entwicklungsserver prüft eine zusätzliche Middleware den direkten Socket des Clients sowie den ursprünglichen `Host` und gegebenenfalls `Origin`, bevor die Restore-Anfrage an den Backend-Proxy weitergeleitet wird. Erlaubt sind lokale Hosts auf Port 5173 oder dem tatsächlichen Vite-Socket-Port; `X-Forwarded-*` wird für diese Entscheidung nicht vertraut. Die unabhängige Backend-Prüfung bleibt bestehen und kann insbesondere einen Origin mit abweichendem Vite-Port ablehnen. Andere Endpunkte bleiben unverändert. Dies schützt nur den direkten Zugriff auf diesen Vite-Proxy: Ein weiterer vorgeschalteter Proxy kann für Vite oder das Backend selbst als lokaler Client erscheinen. Solche Proxies müssen den Zugriff auf die Restore-API eigenständig beschränken oder die Route vollständig sperren; direkte Backend-Zugriffe müssen ebenfalls abgesichert bleiben. Lokale Prozesse werden dadurch nicht ausgeschlossen.

### Ablauf

1. Im Datenbank-Assistenten die Wiederherstellung öffnen und den absoluten Pfad zum Sicherungsordner und zum vorbereiteten Staging-Verzeichnis eingeben.
2. Einen **noch nicht vorhandenen** Datenbanknamen eingeben: maximal 63 Zeichen, beginnend mit einem ASCII-Kleinbuchstaben, danach nur ASCII-Kleinbuchstaben, Ziffern und Unterstriche. Die aktive Datenbank und `postgres` sind als Ziel ausgeschlossen.
3. Die Bestätigung im Assistenten markieren und die Wiederherstellung starten. Der Server prüft Sicherung und Staging, erstellt die neue Datenbank und führt `pg_restore` aus; anschließend kopiert er die gesicherten Dateien ins Staging. Eine Datenbankerstellung durch den Betreiber ist für den Wizard nicht erforderlich.
4. Die Erfolgsmeldung mit Datenbankname und Staging-Pfad abwarten. Die neue Datenbank ist damit **nicht** aktiv. Erst für die anschließende manuelle Übernahme Server, Jury-Server, automatische Neustarts und alle anderen Clients stoppen und wie unter „Manuelle Übernahme“ beschrieben fortfahren.

### Fehler und erneuter Versuch

Wird der Datenbankname bereits verwendet, einen anderen freien Namen wählen; eine vorhandene Datenbank darf nicht als Restore-Ziel benutzt werden. Nach einem Fehler, einer unterbrochenen Verbindung oder einem unbekannten Ergebnis auf dem konfigurierten PostgreSQL-Server prüfen, ob die angegebene Datenbank angelegt wurde und welchen Zustand sie hat. Insbesondere kann eine neu erstellte Datenbank nach einem Fehler bestehen bleiben; sie wird nicht automatisch gelöscht. Eine unklare oder unvollständige Wiederherstellung nicht aktivieren. Vor einem erneuten Versuch die verbliebene Datenbank nur nach eindeutiger Identifikation und gesonderter Entscheidung des Administrators entfernen oder einen anderen freien Namen verwenden.

Ein Fehler beim Kopieren kann eine bereits wiederhergestellte Datenbank und ein **teilweise gefülltes** Staging hinterlassen. Das Staging nicht übernehmen, Inhalt prüfen und vor einem vollständigen erneuten Lauf manuell leeren. Für den erneuten Wizard-Lauf eine neue Datenbank mit freiem Namen verwenden. Erst nach bestätigtem Erfolg Datenbank und Dateien gemeinsam prüfen und übernehmen.

## Offline-Wiederherstellung per CLI

Die CLI ist unabhängig vom Server und wird nicht automatisch beim Start ausgeführt. Im Unterschied zum Wizard erstellt sie keine Datenbank: Der Betreiber bereitet eine separate leere Zieldatenbank und eine eigene Zielkonfigurationsdatei vor.

### Voraussetzungen

- Nur vertrauenswürdige Sicherungen verwenden. PostgreSQL-Dumps können ausführbaren SQL-Code enthalten; ein manipulierter Dump ist kein sicheres Eingabeformat.
- **Server, Jury-Server, automatische Neustarts und alle anderen Clients stoppen.** Der Betreiber muss während des gesamten Vorgangs sicherstellen, dass sich niemand mit der Zieldatenbank verbindet und niemand Sicherung, Zielkonfiguration oder Staging-Verzeichnis verändert. Die Prüfung und `pg_restore` sind keine exklusive Sperre gegen spätere Verbindungen oder Änderungen.
- Eine separate, ausdrücklich vorbereitete leere PostgreSQL-Datenbank verwenden, vorzugsweise neu aus `template0` erstellt. Niemals eine produktive oder laufende Datenbank als Ziel auswählen. Die CLI erstellt, löscht oder leert keine Datenbanken.
- PostgreSQL-Clientwerkzeuge installieren. `pg_restore` muss im `PATH` oder unter `Program Files/PostgreSQL/<Version>/bin` verfügbar sein und das Dumpformat der Sicherung unterstützen.
- Ein bereits vorhandenes, leeres Staging-Verzeichnis sowie eine separate Zielkonfigurationsdatei anlegen. Alle drei übergebenen Pfade müssen absolut sein. Keine Symlinks oder Windows-Junctions in den Pfaden und gesicherten Quellen verwenden.
- Das Konto muss alle Katalogabfragen ausführen und die Wiederherstellung durchführen dürfen. Bei unzureichenden Rechten schlägt die Prüfung geschlossen fehl.

### Zielkonfiguration

Eine separate JSON-Datei mit den Zugangsdaten **der leeren Zieldatenbank** anlegen, zum Beispiel `C:\\restore\\target.json`:

```json
{
  "databaseUrl": "postgresql://restore_user:PASSWORT@localhost:5432/turnfix_restore"
}
```

Sonderzeichen in Benutzername, Passwort und Datenbankname müssen URL-kodiert sein. Der Datenbankname darf höchstens 63 Zeichen lang sein, nur ASCII-Buchstaben, Ziffern, Unterstrich, Bindestrich und `$` enthalten und muss mit einem Buchstaben, einer Ziffer oder einem Unterstrich beginnen. Als URL-Parameter wird nur `sslmode` unterstützt. Die Datei enthält ein Klartextpasswort und muss durch Betriebssystemrechte geschützt und anschließend sicher entfernt werden. Die CLI liest weder automatisch die laufende Anwendungskonfiguration noch die Datenbankverbindung aus Umgebungsvariablen.

### Aufruf

Nach dem Kompilieren des Servers, aus dem Repository-Hauptverzeichnis in PowerShell:

```powershell
node .\newWebBased\server\dist\scripts\restoreBackup.js --backup 'C:\restore\turnfix-backup-2026-01-01' --target-config 'C:\restore\target.json' --staging 'C:\restore\staging' --confirm-empty-database 'turnfix_restore'
```

Der Bestätigungswert muss exakt dem dekodierten Datenbanknamen aus der Zielkonfiguration entsprechen. Er ist kein Passwort. Die CLI prüft die Kataloge und lehnt belegte Datenbanken und bereits vorhandene andere Verbindungen ab. Ein Passwort wird nicht als Prozessargument übergeben; `pg_restore` erhält es über `PGPASSWORD`. PostgreSQL-Zugangsdaten in Umgebungsvariablen können je nach Betriebssystem für andere Prozesse sichtbar sein; den Rechner entsprechend absichern.

`pg_restore` wird ohne Shell und mit `--single-transaction`, `--exit-on-error`, `--no-owner` und `--no-acl` gestartet. Bei Datenbankfehlern werden keine Dateien im Staging-Verzeichnis angelegt. Bei einem Fehler während des anschließenden Kopierens kann das Staging unvollständig sein, während die Datenbank bereits wiederhergestellt ist: Inhalt kontrollieren, Staging manuell leeren und für einen erneuten vollständigen Lauf eine neu vorbereitete leere Datenbank verwenden. Auf einen erfolgreichen Abschluss prüfen, bevor Dateien übernommen werden.

## Manuelle Übernahme

Die benannten Quellen aus dem Manifest werden unter ihrem jeweiligen Namen ins Staging kopiert, etwa `server-config`, `server-env`, `uploads`, `server-icons`, `root-config` oder `exports`. Quellen, die bei der Sicherung nicht vorhanden waren, fehlen auch im Staging. Es werden keine Dateien automatisch in die Installation zurückgeschrieben.

Vor der Übernahme Server, Jury-Server, automatische Neustarts und alle anderen Clients stoppen und während der Arbeiten gestoppt halten. Die Staging-Inhalte prüfen und die benötigten Dateien manuell an die zur eigenen Installation passenden Originalorte übertragen. Vorhandene Installationsdateien bei Bedarf separat sichern. Insbesondere können gesicherte Konfiguration und `.env` noch auf die ursprüngliche Datenbank und andere alte Ziele verweisen: Die tatsächlich verwendete Datenbankkonfiguration einschließlich Host, Port, Datenbankname und Zugangsdaten auf die neue Datenbank abstimmen und maschinenspezifische Pfade prüfen. Passwörter und andere Geheimnisse bei Bedarf für die Zielumgebung anpassen beziehungsweise bei Verdacht auf Offenlegung ändern; PostgreSQL-Rollen und ihre Passwörter werden durch den Dump nicht angelegt. Erst danach Dienste wieder starten und anhand der angezeigten Verbindung und wiederhergestellter Daten und Dateien prüfen, dass die richtige Datenbank verwendet wird.

## Wiederherstellung testen

Regelmäßig eine Sicherung auf einem isolierten Ersatz- oder Testsystem wiederherstellen und sowohl Datenbankinhalte als auch Dateien, Konfiguration, Zugriffsrechte und den anschließenden Neustart überprüfen. Den Fehlerfall und einen erneuten Versuch mit neuer Datenbank und leerem Staging einplanen; keine produktive Datenbank oder produktiven Installationsdateien als Testziel verwenden.

Für Entwickler prüfen die vorhandenen Tests den Wizard und die Restore-Logik gezielt. Auch die Server-Unit-Tests verwenden das globale Jest-Setup: Es erstellt, initialisiert und entfernt eine temporäre Testdatenbank. Dafür vorab eine isolierte PostgreSQL-Testumgebung mit passenden Zugangsdaten und ausreichenden Rechten konfigurieren; keinen produktiven PostgreSQL-Server verwenden. Aus dem Repository-Hauptverzeichnis:

```powershell
npm --prefix .\newWebBased\client run test:run -- src/test/integration/restoreWizard.test.tsx
npm --prefix .\newWebBased\client run test:run -- src/test/integration/restoreProxyGuard.test.ts
npm --prefix .\newWebBased\server test -- --runInBand tests/unit/wizardRestore.test.ts tests/unit/backupRestore.test.ts
```

Der zusätzliche Server-Integrationstest `tests/integration/wizardRestore.test.ts` benötigt eine ausdrücklich dafür vorgesehene PostgreSQL-Testumgebung mit `TEST_DATABASE_URL`, passenden aktiven Datenbankzugangsdaten und PostgreSQL-Clientwerkzeugen. Er erstellt und entfernt Testdatenbanken; niemals gegen einen produktiven PostgreSQL-Server ausführen.

## Vertraulichkeit und Grenzen

Die Sicherung einschließlich PostgreSQL-Dump, Konfiguration, `.env`, Uploads und Staging kann personenbezogene Daten, Zugangsdaten und Geheimnisse enthalten. Alle Verzeichnisse durch restriktive Rechte schützen, nur verschlüsselt übertragen und sicher aufbewahren. Staging und Zielkonfiguration nach Gebrauch sicher entsorgen.

Die Katalogprüfung ist eine konservative Schutzmaßnahme, kein Beweis gegen parallele Änderungen, manipulierte Dumps oder besondere PostgreSQL-Konfigurationen. Die manuelle Übernahme erfordert exklusive Offline-Wartung; vertrauenswürdige Sicherungen bleiben für beide Wege zwingend. Globale PostgreSQL-Rollen, Rechte und sonstige clusterweite Einstellungen werden nicht wiederhergestellt; Eigentümer und Berechtigungen müssen separat geprüft werden.