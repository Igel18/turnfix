# ============================================================================
# TurnFix Full Pipeline
# ============================================================================
# Führt in einem Durchgang aus:
#   1. Build Shared (@turnfix/shared)
#   2. Build Server + Client
#   3. Build Jury-Portal
#   4. Server-Tests (Jest: Unit + Integration)
#   5. Client-Tests (Vitest: Unit + Integration + Component)
#   6. E2E-Tests (Playwright)
#   7. Installer erstellen (Inno Setup)
#
# Build zuerst: Compile-Fehler fallen sofort auf (schnelles Feedback),
# und Tests laufen garantiert gegen den aktuellen Stand.
#
# Verwendung:
#   .\run-pipeline.ps1                         # Alles ausführen
#   .\run-pipeline.ps1 -SkipTests              # Tests überspringen
#   .\run-pipeline.ps1 -SkipE2ETests           # Nur Playwright überspringen
#   .\run-pipeline.ps1 -SkipInstaller          # Kein Installer
#   .\run-pipeline.ps1 -SkipDownload           # Node.js/NSSM nicht neu laden
#   .\run-pipeline.ps1 -SkipTests -SkipDownload  # Nur bauen + Installer
#
# Voraussetzungen:
#   - Inno Setup 6 installiert  (nur für Installer-Schritt)
#   - PostgreSQL erreichbar     (nur für E2E-Tests)
# ============================================================================

param(
    [switch]$SkipTests,       # Alle Tests (Unit + E2E) überspringen
    [switch]$SkipUnitTests,   # Nur Jest + Vitest überspringen
    [switch]$SkipE2ETests,    # Nur Playwright überspringen
    [switch]$SkipBuild,       # npm-Build überspringen
    [switch]$SkipInstaller,   # Installer-Schritt überspringen
    [switch]$SkipDownload     # Node.js/NSSM-Download überspringen (an build-installer.ps1 weitergegeben)
)

$ErrorActionPreference = "Stop"
$pipelineStart         = Get-Date

# ── Pfade ──────────────────────────────────────────────────────────────────
$RootDir       = $PSScriptRoot
$WebDir        = Join-Path $RootDir "newWebBased"
$ServerDir     = Join-Path $WebDir  "server"
$ClientDir     = Join-Path $WebDir  "client"
$JuryPortalDir = Join-Path $WebDir  "jury-portal"
$InstallerScript = Join-Path $RootDir "setup\installer\build-installer.ps1"

# ── Ergebnis-Tracking ──────────────────────────────────────────────────────
$results = [ordered]@{}   # name → 'OK' | 'FEHLER' | 'ÜBERSPRUNGEN'

# ── Hilfsfunktionen ────────────────────────────────────────────────────────

function Write-Banner($text) {
    $line = "─" * 60
    Write-Host ""
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor Cyan
}

function Invoke-Step {
    param(
        [string]   $Name,
        [switch]   $Skip,
        [scriptblock] $Action
    )

    if ($Skip) {
        Write-Host ""
        Write-Host "  ⏭  $Name — übersprungen" -ForegroundColor DarkGray
        $script:results[$Name] = 'ÜBERSPRUNGEN'
        return
    }

    Write-Banner $Name
    $stepStart = Get-Date

    try {
        Push-Location $RootDir   # Sicherheits-Fallback; Action überschreibt bei Bedarf
        try { & $Action }
        finally { Pop-Location }

        if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
            throw "Prozess beendet mit Exit-Code $LASTEXITCODE"
        }

        $elapsed = [math]::Round(((Get-Date) - $stepStart).TotalSeconds, 1)
        Write-Host "  ✓  $Name — ${elapsed}s" -ForegroundColor Green
        $script:results[$Name] = 'OK'
    }
    catch {
        $elapsed = [math]::Round(((Get-Date) - $stepStart).TotalSeconds, 1)
        Write-Host "  ✗  $Name FEHLGESCHLAGEN (${elapsed}s): $($_.Exception.Message)" -ForegroundColor Red
        $script:results[$Name] = 'FEHLER'
        throw   # Pipeline abbrechen
    }
}

# ── Banner ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           TurnFix Full Pipeline                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  Start: $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"
Write-Host ""

# ── 1. Shared-Paket bauen ─────────────────────────────────────────────────
Invoke-Step -Name "Build Shared (@turnfix/shared)" -Skip:$SkipBuild -Action {
    Set-Location (Join-Path $WebDir "shared")
    npm run build
}

# ── 2. Build Server + Client ──────────────────────────────────────────────
Invoke-Step -Name "Build Server + Client" -Skip:$SkipBuild -Action {
    # Browserslist-Datenbank aktualisieren (caniuse-lite), damit Vite/PostCSS
    # aktuelle Browser-Targets kennt und keine Warnung ausgibt.
    Set-Location $ClientDir
    npx update-browserslist-db@latest --yes 2>&1 | Out-Null

    Set-Location $WebDir
    npm run build
}

# ── 3. Build Jury-Portal ──────────────────────────────────────────────────
Invoke-Step -Name "Build Jury-Portal" -Skip:$SkipBuild -Action {
    Set-Location $JuryPortalDir
    npm run build
}

# ── 4. Server-Tests (Jest) ─────────────────────────────────────────────────
Invoke-Step -Name "Server-Tests (Jest)" -Skip:($SkipTests -or $SkipUnitTests) -Action {
    Set-Location $ServerDir
    npm test -- --forceExit
}

# ── 5. Client-Tests (Vitest) ───────────────────────────────────────────────
Invoke-Step -Name "Client-Tests (Vitest)" -Skip:($SkipTests -or $SkipUnitTests) -Action {
    Set-Location $ClientDir
    npm run test:run
}

# ── 6. E2E-Tests (Playwright) ──────────────────────────────────────────────
Invoke-Step -Name "E2E-Tests (Playwright)" -Skip:($SkipTests -or $SkipE2ETests) -Action {
    Set-Location $ClientDir

    # Ensure required ports are free so Playwright webServer can start cleanly.
    $requiredPorts = @(3001, 3002, 5173)

    function Stop-ServiceByPidIfPossible {
        param([int]$PidToInspect)

        try {
            $svc = Get-CimInstance Win32_Service -Filter "ProcessId = $PidToInspect" -ErrorAction SilentlyContinue |
                Select-Object -First 1

            if ($svc -and $svc.State -eq 'Running') {
                Write-Host "  🔧 Stoppe Dienst $($svc.Name) (PID $PidToInspect)" -ForegroundColor Yellow
                Stop-Service -Name $svc.Name -Force -ErrorAction Stop
                return $true
            }
        }
        catch {
            Write-Host "  ⚠️  Dienst zu PID $PidToInspect konnte nicht gestoppt werden: $($_.Exception.Message)" -ForegroundColor Yellow
        }

        return $false
    }

    foreach ($port in $requiredPorts) {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pidToStop in $pids) {
                if ($pidToStop -and $pidToStop -ne $PID) {
                    try {
                        $stoppedService = Stop-ServiceByPidIfPossible -PidToInspect $pidToStop

                        if (-not $stoppedService) {
                            Stop-Process -Id $pidToStop -Force -ErrorAction Stop
                            Write-Host "  🔧 Port $port freigegeben (PID $pidToStop beendet)" -ForegroundColor Yellow
                        }
                    }
                    catch {
                        Write-Host "  ⚠️  Port $port belegt, PID $pidToStop konnte nicht beendet werden: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                }
            }
        }

        $stillListening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($stillListening) {
            $busyPids = ($stillListening | Select-Object -ExpandProperty OwningProcess -Unique) -join ', '
            throw "Port $port bleibt belegt (PID(s): $busyPids). Bitte TurnFix-Dienste stoppen und erneut ausführen."
        }
    }

    # Force CI mode so Playwright does not reuse arbitrary local dev/PM2 servers.
    # This makes the pipeline deterministic and avoids flaky 500s from stale processes.
    $previousCi = $env:CI
    $previousAllowReuse = $env:TURNFIX_E2E_ALLOW_REUSE
    $env:CI = "1"
    $env:TURNFIX_E2E_ALLOW_REUSE = "1"
    try {
        # Run with both list (console) and html (report) reporters
        npx playwright test
    }
    finally {
        if ($null -eq $previousCi -or $previousCi -eq "") {
            Remove-Item Env:CI -ErrorAction SilentlyContinue
        }
        else {
            $env:CI = $previousCi
        }

        if ($null -eq $previousAllowReuse -or $previousAllowReuse -eq "") {
            Remove-Item Env:TURNFIX_E2E_ALLOW_REUSE -ErrorAction SilentlyContinue
        }
        else {
            $env:TURNFIX_E2E_ALLOW_REUSE = $previousAllowReuse
        }
    }
    # Show report hint regardless of pass/fail
    $reportPath = Join-Path $ClientDir "playwright-report" "index.html"
    if (Test-Path $reportPath) {
        Write-Host ""
        Write-Host "  📊 HTML-Report: $reportPath" -ForegroundColor Cyan
        Write-Host "  📊 Öffnen mit:  npx playwright show-report" -ForegroundColor Cyan
    }
}

# ── 7. Installer erstellen ────────────────────────────────────────────────
Invoke-Step -Name "Installer erstellen (Inno Setup)" -Skip:$SkipInstaller -Action {
    # Hashtable splatting so switches are passed as named parameters, not positional strings
    $installerArgs = @{ SkipBuild = $true }
    if ($SkipDownload) { $installerArgs['SkipDownload'] = $true }
    & $InstallerScript @installerArgs
}

# ── Zusammenfassung ───────────────────────────────────────────────────────
$totalElapsed = [math]::Round(((Get-Date) - $pipelineStart).TotalMinutes, 1)
$hasFailed    = $results.Values -contains 'FEHLER'
$color        = if ($hasFailed) { 'Red' } else { 'Green' }
$status       = if ($hasFailed) { 'FEHLGESCHLAGEN' } else { 'ERFOLGREICH' }

Write-Host ""
Write-Host ("═" * 62) -ForegroundColor $color
Write-Host "  Pipeline $status — ${totalElapsed} min" -ForegroundColor $color
Write-Host ("═" * 62) -ForegroundColor $color

foreach ($entry in $results.GetEnumerator()) {
    $icon  = switch ($entry.Value) {
        'OK'            { '✓' }
        'FEHLER'        { '✗' }
        'ÜBERSPRUNGEN'  { '⏭' }
    }
    $c = switch ($entry.Value) {
        'OK'            { 'Green' }
        'FEHLER'        { 'Red' }
        'ÜBERSPRUNGEN'  { 'DarkGray' }
    }
    Write-Host "  $icon  $($entry.Key)" -ForegroundColor $c
}

# Show Playwright report hint if E2E tests were run
if (-not ($SkipTests -or $SkipE2ETests)) {
    $e2eReport = Join-Path $ClientDir "playwright-report" "index.html"
    if (Test-Path $e2eReport) {
        Write-Host ""
        Write-Host "  📊 Playwright HTML-Report:" -ForegroundColor Cyan
        Write-Host "     $e2eReport" -ForegroundColor Cyan
        Write-Host "     Öffnen: cd $ClientDir ; npx playwright show-report" -ForegroundColor Cyan
    }
}

Write-Host ""
exit $(if ($hasFailed) { 1 } else { 0 })
