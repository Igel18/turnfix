# Datenbanksicherung beim Setup

Die Sicherung ist im Setup standardmaessig eingeschaltet und kann auf der
Seite "Datenbanksicherung" abgewahlt werden. Ohne Sicherung besteht bei
Datenbankaenderungen das Risiko eines Datenverlusts. Fuer unbeaufsichtigte
Installationen kann sie mit dem Setup-Parameter `/NOBACKUP` ausgeschaltet
werden. Ohne diesen Parameter bleibt sie standardmaessig aktiviert.

Bei aktivierter Sicherung sichert das Setup vor einem Update die in der bestehenden Serverkonfiguration
eingetragene PostgreSQL-Datenbank. Die Sicherung wird vor dem Stoppen des
TurnFix-Dienstes erstellt. Schlaegt die Sicherung fehl, wird das Update
abgebrochen und der Dienst nicht vom Setup gestoppt.

Bei einer Neuinstallation erstellt das Setup keine Datenbank und fuehrt keinen
Schema-Abgleich aus. Eine neue Datenbank wird anschliessend in den Einstellungen
mit dem Datenbank-Setup-Assistenten angelegt. Der Assistent ist fuer neue,
leere Datenbanken vorgesehen. Bei einer bestehenden Datenbank muss vor einer
manuellen Schemaaenderung eine eigene Sicherung erstellt werden; die
Setup-Sicherung schuetzt nur bestehende TurnFix-Installationen beim Update.

Das Setup verwendet das konfigurierte Ziel der zyklischen Sicherung und legt
seine Sicherungen darin im Unterordner `setup` ab. Ist kein Ziel konfiguriert,
wird `%ProgramData%\TurnFix\Backups\setup` verwendet. Der vollstaendige Pfad
der erstellten Sicherung wird im Setup angezeigt und protokolliert. Der
Unterordner verhindert, dass die Aufraeumroutine der zyklischen Sicherung die
Setup-Sicherung entfernt.

Die Sicherung enthaelt neben dem Datenbank-Dump auch Konfigurationsdateien,
unter anderem die Server-`.env` mit Zugangsdaten. Das Sicherungsziel muss vor
unbefugtem Zugriff geschuetzt werden. Fuer die Sicherung muss ein passendes
PostgreSQL-Programm `pg_dump` erreichbar sein.

Bei Updates bleiben die bestehende Server-`.env` und die Datenbankauswahl
erhalten. Der pauschale Prisma-Schema-Abgleich wird beim Update nicht
ausgefuehrt; zukuenftige Datenbankmigrationen muessen nach der Sicherung
ausdruecklich in den Update-Ablauf aufgenommen werden.