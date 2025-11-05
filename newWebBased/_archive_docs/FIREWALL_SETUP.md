# Firewall Setup für Jury Portal

Das Jury Portal läuft auf **Port 5174** und kann für andere Geräte im Netzwerk zugänglich gemacht werden.

## Windows Firewall Regel erstellen

### Option 1: PowerShell (Als Administrator ausführen)

```powershell
# Regel für eingehende Verbindungen erstellen
New-NetFirewallRule -DisplayName "TurnFix Jury Portal" `
    -Direction Inbound `
    -LocalPort 5174 `
    -Protocol TCP `
    -Action Allow `
    -Profile Domain,Private `
    -Description "Erlaubt Zugriff auf das TurnFix Jury Portal (Port 5174)"
```

### Option 2: GUI (Graphische Oberfläche)

1. **Windows Firewall öffnen**
   - Drücke `Windows + R`
   - Gebe ein: `wf.msc`
   - Enter drücken

2. **Neue Regel erstellen**
   - Klicke auf "Eingehende Regeln" im linken Menü
   - Klicke auf "Neue Regel..." im rechten Menü

3. **Regeltyp**
   - Wähle "Port"
   - Klicke "Weiter"

4. **Protokoll und Ports**
   - Wähle "TCP"
   - Wähle "Bestimmte lokale Ports"
   - Gebe ein: `5174`
   - Klicke "Weiter"

5. **Aktion**
   - Wähle "Verbindung zulassen"
   - Klicke "Weiter"

6. **Profile**
   - Aktiviere "Domäne", "Privat"
   - Deaktiviere "Öffentlich" (aus Sicherheitsgründen)
   - Klicke "Weiter"

7. **Name**
   - Name: `TurnFix Jury Portal`
   - Beschreibung: `Erlaubt Zugriff auf das TurnFix Jury Portal (Port 5174)`
   - Klicke "Fertig stellen"

## Zugriff von anderen Geräten

Nach dem Erstellen der Firewall-Regel können andere Geräte im Netzwerk auf das Jury Portal zugreifen:

```
http://<SERVER-IP>:5174
```

**Beispiel:**
```
http://192.168.1.100:5174
```

### Server-IP-Adresse herausfinden

**PowerShell:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*"} | Select-Object IPAddress, InterfaceAlias
```

**CMD:**
```cmd
ipconfig
```
(Suche nach "IPv4-Adresse" unter deinem aktiven Netzwerkadapter)

## Sicherheitshinweise

⚠️ **Wichtig:**
- Aktiviere die Firewall-Regel nur in **vertrauenswürdigen Netzwerken** (z.B. Heim- oder Vereinsnetzwerk)
- Verwende die Regel **NICHT** in öffentlichen Netzwerken
- Nach dem Wettkampf kann die Regel wieder deaktiviert werden

## Regel deaktivieren/löschen

### PowerShell (Als Administrator)
```powershell
# Regel deaktivieren
Disable-NetFirewallRule -DisplayName "TurnFix Jury Portal"

# Regel wieder aktivieren
Enable-NetFirewallRule -DisplayName "TurnFix Jury Portal"

# Regel löschen
Remove-NetFirewallRule -DisplayName "TurnFix Jury Portal"
```

### GUI
1. Öffne `wf.msc`
2. Klicke auf "Eingehende Regeln"
3. Suche "TurnFix Jury Portal"
4. Rechtsklick → "Regel deaktivieren" oder "Regel löschen"

## Jury Portal starten

Das Jury Portal wird automatisch mit dem Haupt-Startskript gestartet:

```cmd
cd newWebBased
start-dev.bat
```

Oder manuell:

```cmd
cd newWebBased\jury-portal
npm run dev
```

## Zugriff testen

1. Öffne auf dem Server: `http://localhost:5174`
2. Öffne auf einem anderen Gerät: `http://<SERVER-IP>:5174`

Wenn beides funktioniert, ist die Konfiguration erfolgreich! ✅
