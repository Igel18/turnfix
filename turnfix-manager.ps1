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
        $pm2Status = npx pm2 jlist 2>&1 | ConvertFrom-Json
        
        if ($pm2Status.Count -gt 0) {
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
            Write-Host "│  Wählen Sie Option 1 zum Starten                   │" -ForegroundColor Yellow
            Write-Host "└─────────────────────────────────────────────────────┘" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "┌─────────────────────────────────────────────────────┐" -ForegroundColor Yellow
        Write-Host "│  ⚠ PM2 noch nicht initialisiert                    │" -ForegroundColor Yellow
        Write-Host "│  Wählen Sie Option 1 zum ersten Start              │" -ForegroundColor Yellow
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
    Write-Host "TurnFix wird gestartet..." -ForegroundColor Green
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
    
    # Prüfe ob Build existiert
    $distPath = Join-Path $serverPath "dist"
    if (-not (Test-Path $distPath)) {
        Write-Host "⚠ Build-Dateien nicht gefunden. Erstelle Build..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Build fehlgeschlagen!" -ForegroundColor Red
            Read-Host "Drücken Sie Enter zum Fortfahren"
            return
        }
    }
    
    # Starte mit PM2
    Write-Host "Starte Server mit PM2..." -ForegroundColor Cyan
    npm run pm2:start:prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ TurnFix erfolgreich gestartet!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Zugangsdaten:" -ForegroundColor Cyan
        Write-Host "  Verwaltung:    http://localhost:3001" -ForegroundColor White
        Write-Host "  Kampfrichter:  http://localhost:3002" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "✗ Fehler beim Starten!" -ForegroundColor Red
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
            $serverPath = Join-Path $PSScriptRoot "newWebBased\server"
            Set-Location $serverPath
            npm run build
            Write-Host "✓ Build erstellt! Starten Sie TurnFix neu (Option 3)" -ForegroundColor Green
            Read-Host "Drücken Sie Enter zum Fortfahren"
        }
        "4" {
            Write-Host "Netzwerk-Informationen:" -ForegroundColor Cyan
            $networkIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" }).IPAddress | Select-Object -First 1
            Write-Host "  Ihre IP-Adresse: $networkIP" -ForegroundColor White
            Write-Host ""
            Write-Host "  Zugriff vom Tablet/Handy:" -ForegroundColor Yellow
            Write-Host "    Verwaltung:    http://${networkIP}:3001" -ForegroundColor White
            Write-Host "    Kampfrichter:  http://${networkIP}:3002" -ForegroundColor White
            Write-Host ""
            Write-Host "  WICHTIG: Stellen Sie sicher, dass:" -ForegroundColor Red
            Write-Host "    - Alle Geräte im gleichen WLAN sind" -ForegroundColor White
            Write-Host "    - Die Windows Firewall TurnFix erlaubt" -ForegroundColor White
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
