# TurnFix Manager - Einfache Bedienung für Anwender
# Dieses Script bietet ein benutzerfreundliches Menü zum Starten, Stoppen und Überwachen von TurnFix

# Farben und Formatierung
function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                    TurnFix Manager                         ║" -ForegroundColor Cyan
    Write-Host "║          Turnwettkampf Verwaltungssystem v2.0             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Status {
    Write-Host "Status wird geprüft..." -ForegroundColor Yellow
    Write-Host ""
    
    # Prüfe PM2 Status
    try {
        # Unterdrücke Fehlerausgabe und prüfe ob PM2 verfügbar ist
        $ErrorActionPreference = 'SilentlyContinue'
        $pm2Output = npx pm2 jlist 2>&1
        $ErrorActionPreference = 'Continue'
        
        # Prüfe ob die Ausgabe gültiges JSON ist
        if (-not $pm2Output) {
            throw "PM2 nicht initialisiert"
        }
        
        $pm2Status = $pm2Output | ConvertFrom-Json
        
        if ($pm2Status -and $pm2Status.Count -gt 0) {
            $mainServer = $pm2Status | Where-Object { $_.name -eq "turnfix-server" }
            $juryServer = $pm2Status | Where-Object { $_.name -eq "turnfix-jury-server" }
            
            Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Green
            Write-Host "│             TurnFix Server Status                   │" -ForegroundColor Green
            Write-Host "├─────────────────────────────────────────────────────┤" -ForegroundColor Green
            
            if ($mainServer) {
                $status = if ($mainServer.pm2_env.status -eq "online") { "✓ LÄUFT" } else { "✗ GESTOPPT" }
                $color = if ($mainServer.pm2_env.status -eq "online") { "Green" } else { "Red" }
                $uptime = [math]::Round($mainServer.pm2_env.pm_uptime / 1000 / 60, 1)
                $memory = [math]::Round($mainServer.monit.memory / 1024 / 1024, 1)
                
                Write-Host "│ Haupt-Server:     $status" -ForegroundColor $color
                Write-Host "│   Adresse:        http://localhost:3001" -ForegroundColor White
                Write-Host "│   Laufzeit:       $uptime Minuten" -ForegroundColor White
                Write-Host "│   Speicher:       $memory MB" -ForegroundColor White
                Write-Host "│   Neustarts:      $($mainServer.pm2_env.restart_time)" -ForegroundColor White
            } else {
                Write-Host "│ Haupt-Server:     ✗ NICHT GESTARTET" -ForegroundColor Red
            }
            
            Write-Host "│" -ForegroundColor Green
            
            if ($juryServer) {
                $status = if ($juryServer.pm2_env.status -eq "online") { "✓ LÄUFT" } else { "✗ GESTOPPT" }
                $color = if ($juryServer.pm2_env.status -eq "online") { "Green" } else { "Red" }
                $uptime = [math]::Round($juryServer.pm2_env.pm_uptime / 1000 / 60, 1)
                $memory = [math]::Round($juryServer.monit.memory / 1024 / 1024, 1)
                
                Write-Host "│ Kampfrichter:     $status" -ForegroundColor $color
                Write-Host "│   Adresse:        http://localhost:3002" -ForegroundColor White
                Write-Host "│   Laufzeit:       $uptime Minuten" -ForegroundColor White
                Write-Host "│   Speicher:       $memory MB" -ForegroundColor White
                Write-Host "│   Neustarts:      $($juryServer.pm2_env.restart_time)" -ForegroundColor White
            } else {
                Write-Host "│ Kampfrichter:     ✗ NICHT GESTARTET" -ForegroundColor Red
            }
            
            Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Green
        } else {
            Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Yellow
            Write-Host "│  ⚠ Keine Server gestartet                          │" -ForegroundColor Yellow
            Write-Host "│  Wählen Sie Option 1 zum ersten Start              │" -ForegroundColor Yellow
            Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Yellow
        }
    } catch {
        # PM2 ist nicht initialisiert oder es gibt keine Prozesse
        Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Yellow
        Write-Host "│  ℹ TurnFix ist noch nicht gestartet                │" -ForegroundColor Yellow
        Write-Host "│                                                     │" -ForegroundColor Yellow
        Write-Host "│  Wählen Sie Option 1 zum ersten Start:             │" -ForegroundColor Yellow
        Write-Host "│  • Baut die Anwendung falls nötig                  │" -ForegroundColor White
        Write-Host "│  • Startet Haupt-Server (Port 3001)                │" -ForegroundColor White
        Write-Host "│  • Startet Kampfrichter-Portal (Port 3002)         │" -ForegroundColor White
        Write-Host "│                                                     │" -ForegroundColor Yellow
        Write-Host "│  Dies kann beim ersten Mal einige Minuten dauern.  │" -ForegroundColor DarkGray
        Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Yellow
    }
    Write-Host ""
}

function Show-Menu {
    Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "│                   Hauptmenü                         │" -ForegroundColor Cyan
    Write-Host "├─────────────────────────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "│                                                     │" -ForegroundColor Cyan
    Write-Host "│  [1] ▶  TurnFix STARTEN                            │" -ForegroundColor Green
    Write-Host "│  [2] ■  TurnFix STOPPEN                            │" -ForegroundColor Red
    Write-Host "│  [3] ↻  TurnFix NEU STARTEN                        │" -ForegroundColor Yellow
    Write-Host "│                                                     │" -ForegroundColor Cyan
    Write-Host "│  [4] 📊 Status anzeigen                             │" -ForegroundColor Cyan
    Write-Host "│  [5] 📋 Live-Logs anzeigen                          │" -ForegroundColor Cyan
    Write-Host "│  [6] 💻 System-Monitor öffnen                       │" -ForegroundColor Cyan
    Write-Host "│                                                     │" -ForegroundColor Cyan
    Write-Host "│  [7] 🌐 Webseiten öffnen                            │" -ForegroundColor Magenta
    Write-Host "│  [8] 🔧 Erweiterte Optionen                         │" -ForegroundColor DarkGray
    Write-Host "│                                                     │" -ForegroundColor Cyan
    Write-Host "│  [0] ✖  BEENDEN                                     │" -ForegroundColor DarkGray
    Write-Host "│                                                     │" -ForegroundColor Cyan
    Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""
}

function Start-TurnFix {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              TurnFix wird gestartet...                     ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    # Prüfe ob Server-Verzeichnis existiert
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    if (-not (Test-Path $serverPath)) {
        Write-Host "✗ Fehler: Server-Verzeichnis nicht gefunden!" -ForegroundColor Red
        Write-Host "  Erwartet: $serverPath" -ForegroundColor Yellow
        Read-Host "Drücken Sie Enter zum Fortfahren"
        return
    }
    
    Set-Location $serverPath
    
    # Prüfe ob node_modules existiert
    $nodeModulesPath = Join-Path $serverPath "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "⚠ Node-Module nicht gefunden. Installiere Dependencies..." -ForegroundColor Yellow
        Write-Host "  Dies kann einige Minuten dauern..." -ForegroundColor DarkGray
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Installation fehlgeschlagen!" -ForegroundColor Red
            Read-Host "Drücken Sie Enter zum Fortfahren"
            return
        }
    }
    
    # Prüfe ob Build existiert
    $distPath = Join-Path $serverPath "dist"
    $clientDistPath = Join-Path $PSScriptRoot "newWebBased\client\dist"
    
    if (-not (Test-Path $distPath) -or -not (Test-Path $clientDistPath)) {
        Write-Host "⚠ Build-Dateien nicht gefunden. Erstelle Build..." -ForegroundColor Yellow
        Write-Host "  Backend wird kompiliert..." -ForegroundColor DarkGray
        Write-Host "  Frontend wird gebaut..." -ForegroundColor DarkGray
        Write-Host "  Dies kann einige Minuten dauern..." -ForegroundColor DarkGray
        npm run build:all
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Build fehlgeschlagen!" -ForegroundColor Red
            Read-Host "Drücken Sie Enter zum Fortfahren"
            return
        }
        Write-Host "✓ Build erfolgreich erstellt!" -ForegroundColor Green
        Write-Host ""
    }
    
    # Starte mit PM2
    Write-Host "Starte Server mit PM2..." -ForegroundColor Cyan
    Write-Host "  • Haupt-Server wird gestartet..." -ForegroundColor White
    Write-Host "  • Kampfrichter-Portal wird gestartet..." -ForegroundColor White
    Write-Host ""
    
    npm run pm2:start:prod
    
    if ($LASTEXITCODE -eq 0) {
        Start-Sleep -Seconds 2  # Kurze Pause damit PM2 hochfährt
        
        # Hole lokale IP-Adresse
        $localIP = "localhost"
        try {
            $networkAdapter = Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual | 
                              Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
                              Select-Object -First 1
            if ($networkAdapter) {
                $localIP = $networkAdapter.IPAddress
            }
        } catch {
            # Fallback auf localhost wenn IP-Erkennung fehlschlägt
        }
        
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║        ✓ TurnFix erfolgreich gestartet!                   ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""
        Write-Host "Lokal (nur dieser PC):" -ForegroundColor Cyan
        Write-Host "  📊 Verwaltung:        http://localhost:3001" -ForegroundColor White
        Write-Host "  👨‍⚖️  Kampfrichter:      http://localhost:3002" -ForegroundColor White
        Write-Host ""
        
        if ($localIP -ne "localhost") {
            Write-Host "Im Netzwerk (andere Geräte):" -ForegroundColor Cyan
            Write-Host "  📊 Verwaltung:        http://${localIP}:3001" -ForegroundColor Yellow
            Write-Host "  👨‍⚖️  Kampfrichter:      http://${localIP}:3002" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  ℹ️  Ihre IP-Adresse: $localIP" -ForegroundColor DarkGray
        }
        
        Write-Host ""
        Write-Host "Hinweise:" -ForegroundColor Yellow
        Write-Host "  • Die Server laufen jetzt im Hintergrund" -ForegroundColor DarkGray
        Write-Host "  • Sie können dieses Fenster schließen" -ForegroundColor DarkGray
        Write-Host "  • Die Server bleiben aktiv bis zum Stoppen oder PC-Neustart" -ForegroundColor DarkGray
        Write-Host "  • Für Netzwerkzugriff: Firewall-Regeln mit Option 8 aktivieren" -ForegroundColor DarkGray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "✗ Fehler beim Starten!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Mögliche Lösungen:" -ForegroundColor Yellow
        Write-Host "  • Prüfen Sie ob die Ports 3001 und 3002 frei sind" -ForegroundColor White
        Write-Host "  • Prüfen Sie die Logs mit Option 5" -ForegroundColor White
        Write-Host "  • Versuchen Sie Option 3 (Neustart)" -ForegroundColor White
        Write-Host ""
    }
    
    Read-Host "Drücken Sie Enter zum Fortfahren"
}

function Stop-TurnFix {
    Write-Host "TurnFix wird gestoppt..." -ForegroundColor Red
    Write-Host ""
    
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    Set-Location $serverPath
    
    npm run pm2:stop
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ TurnFix erfolgreich gestoppt!" -ForegroundColor Green
    } else {
        Write-Host "✗ Fehler beim Stoppen!" -ForegroundColor Red
    }
    
    Read-Host "Drücken Sie Enter zum Fortfahren"
}

function Restart-TurnFix {
    Write-Host "TurnFix wird neu gestartet..." -ForegroundColor Yellow
    Write-Host ""
    
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    Set-Location $serverPath
    
    npm run pm2:restart
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ TurnFix erfolgreich neu gestartet!" -ForegroundColor Green
    } else {
        Write-Host "✗ Fehler beim Neustart!" -ForegroundColor Red
    }
    
    Read-Host "Drücken Sie Enter zum Fortfahren"
}

function Show-DetailedStatus {
    Write-Host "Detaillierter Status wird geladen..." -ForegroundColor Cyan
    Write-Host ""
    
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    Set-Location $serverPath
    
    npx pm2 status
    
    Write-Host ""
    Write-Host "Für detaillierte Informationen über einen Server:" -ForegroundColor Yellow
    Write-Host "  npx pm2 describe turnfix-server" -ForegroundColor White
    Write-Host "  npx pm2 describe turnfix-jury-server" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Drücken Sie Enter zum Fortfahren"
}

function Show-LiveLogs {
    Write-Host "Live-Logs werden geöffnet..." -ForegroundColor Cyan
    Write-Host "Drücken Sie STRG+C zum Beenden" -ForegroundColor Yellow
    Write-Host ""
    
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    Set-Location $serverPath
    
    npm run pm2:logs
}

function Show-SystemMonitor {
    Write-Host "System-Monitor wird geöffnet..." -ForegroundColor Cyan
    Write-Host "Drücken Sie STRG+C zum Beenden" -ForegroundColor Yellow
    Write-Host ""
    
    $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
    Set-Location $serverPath
    
    npm run pm2:monit
}

function Open-Websites {
    Write-Host "Webseiten werden geöffnet..." -ForegroundColor Magenta
    Write-Host ""
    
    # Prüfe ob Server laufen
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/configuration" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Haupt-Server läuft" -ForegroundColor Green
        Start-Process "http://localhost:3001"
    } catch {
        Write-Host "✗ Haupt-Server läuft nicht!" -ForegroundColor Red
        Write-Host "  Starten Sie TurnFix zuerst mit Option 1" -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 1
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "✓ Kampfrichter-Portal läuft" -ForegroundColor Green
        Start-Process "http://localhost:3002"
    } catch {
        Write-Host "✗ Kampfrichter-Portal läuft nicht!" -ForegroundColor Red
    }
    
    Write-Host ""
    Read-Host "Drücken Sie Enter zum Fortfahren"
}

function Show-AdvancedMenu {
    Clear-Host
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor DarkGray
    Write-Host "║               Erweiterte Optionen                          ║" -ForegroundColor DarkGray
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  [1] Logs löschen (Flush)" -ForegroundColor White
    Write-Host "  [2] PM2 komplett neu starten" -ForegroundColor White
    Write-Host "  [3] Build neu erstellen" -ForegroundColor White
    Write-Host "  [4] Netzwerk-IP anzeigen (für Tablets)" -ForegroundColor White
    Write-Host "  [5] Datenbank-Status prüfen" -ForegroundColor White
    Write-Host "  [0] Zurück zum Hauptmenü" -ForegroundColor DarkGray
    Write-Host ""
    
    $choice = Read-Host "Ihre Wahl"
    
    switch ($choice) {
        "1" {
            Write-Host "Logs werden gelöscht..." -ForegroundColor Yellow
            $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
            Set-Location $serverPath
            npm run pm2:flush
            Write-Host "✓ Logs gelöscht!" -ForegroundColor Green
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
        "2" {
            Write-Host "PM2 wird komplett neu gestartet..." -ForegroundColor Yellow
            $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
            Set-Location $serverPath
            npx pm2 kill
            npm run pm2:start:prod
            Write-Host "✓ PM2 neu gestartet!" -ForegroundColor Green
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
        "3" {
            Write-Host "Build wird erstellt..." -ForegroundColor Yellow
            Write-Host "  Backend wird kompiliert..." -ForegroundColor Cyan
            Write-Host "  Frontend wird gebaut..." -ForegroundColor Cyan
            Write-Host ""
            $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
            Set-Location $serverPath
            npm run build:all
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "✓ Build erfolgreich erstellt!" -ForegroundColor Green
                Write-Host "  Starten Sie TurnFix neu (Option 3 im Hauptmenü)" -ForegroundColor Yellow
            } else {
                Write-Host "✗ Build fehlgeschlagen!" -ForegroundColor Red
            }
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
        "4" {
            Write-Host ""
            Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
            Write-Host "║           Netzwerk-Zugriffsinformationen                   ║" -ForegroundColor Cyan
            Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
            Write-Host ""
            
            # Hole alle verfügbaren Netzwerk-IPs
            $networkIPs = Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual | 
                          Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } |
                          Select-Object IPAddress, InterfaceAlias
            
            if ($networkIPs) {
                Write-Host "Ihre Netzwerk-Adresse(n):" -ForegroundColor Yellow
                Write-Host ""
                
                foreach ($ip in $networkIPs) {
                    $ipAddr = $ip.IPAddress
                    $adapter = $ip.InterfaceAlias
                    
                    Write-Host "  📡 $adapter" -ForegroundColor DarkGray
                    Write-Host "     IP-Adresse: $ipAddr" -ForegroundColor White
                    Write-Host ""
                    Write-Host "     Zugriff vom Tablet/Handy/Laptop:" -ForegroundColor Cyan
                    Write-Host "       📊 Verwaltung:        http://${ipAddr}:3001" -ForegroundColor Green
                    Write-Host "       👨‍⚖️  Kampfrichter:      http://${ipAddr}:3002" -ForegroundColor Green
                    Write-Host ""
                }
                
                Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Yellow
                Write-Host "│  ⚠️  WICHTIG für Netzwerkzugriff:                  │" -ForegroundColor Yellow
                Write-Host "├─────────────────────────────────────────────────────┤" -ForegroundColor Yellow
                Write-Host "│                                                     │" -ForegroundColor Yellow
                Write-Host "│  1. Alle Geräte müssen im gleichen WLAN sein       │" -ForegroundColor White
                Write-Host "│  2. Windows Firewall muss Ports freigeben          │" -ForegroundColor White
                Write-Host "│     → Zurück zum Hauptmenü → Option 8              │" -ForegroundColor White
                Write-Host "│     → Dort Firewall-Regeln aktivieren              │" -ForegroundColor White
                Write-Host "│  3. Router darf Geräte nicht isolieren             │" -ForegroundColor White
                Write-Host "│     (AP-Isolation/Client-Isolation deaktivieren)   │" -ForegroundColor White
                Write-Host "│                                                     │" -ForegroundColor Yellow
                Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Yellow
            } else {
                Write-Host "⚠️  Keine Netzwerk-Verbindung gefunden!" -ForegroundColor Red
                Write-Host ""
                Write-Host "Mögliche Ursachen:" -ForegroundColor Yellow
                Write-Host "  • Kein WLAN/LAN verbunden" -ForegroundColor White
                Write-Host "  • Nur Loopback-Adapter aktiv" -ForegroundColor White
                Write-Host ""
            }
            
            Write-Host ""
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
        "5" {
            Write-Host "Datenbank-Verbindung wird geprüft..." -ForegroundColor Cyan
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3001/api/configuration" -UseBasicParsing -TimeoutSec 5
                Write-Host "✓ Datenbank-Verbindung OK!" -ForegroundColor Green
            } catch {
                Write-Host "✗ Datenbank-Verbindung fehlgeschlagen!" -ForegroundColor Red
                Write-Host "  Prüfen Sie ob PostgreSQL läuft" -ForegroundColor Yellow
            }
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
    }
}

# Hauptschleife
$running = $true
while ($running) {
    Show-Header
    Show-Status
    Show-Menu
    
    $choice = Read-Host "Ihre Wahl"
    
    switch ($choice) {
        "1" { Start-TurnFix }
        "2" { Stop-TurnFix }
        "3" { Restart-TurnFix }
        "4" { Show-DetailedStatus }
        "5" { Show-LiveLogs }
        "6" { Show-SystemMonitor }
        "7" { Open-Websites }
        "8" { Show-AdvancedMenu }
        "0" { 
            Write-Host ""
            Write-Host "TurnFix Manager wird beendet..." -ForegroundColor Yellow
            Write-Host "Auf Wiedersehen!" -ForegroundColor Cyan
            Write-Host ""
            $running = $false
        }
        default {
            Write-Host "Ungültige Eingabe! Bitte wählen Sie 0-8" -ForegroundColor Red
            Start-Sleep -Seconds 2
        }
    }
}
