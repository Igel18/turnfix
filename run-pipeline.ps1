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
    npx playwright test
}

# ── 7. Installer erstellen ────────────────────────────────────────────────
Invoke-Step -Name "Installer erstellen (Inno Setup)" -Skip:$SkipInstaller -Action {
    $args = @("-SkipBuild")           # Build wurde oben bereits gemacht
    if ($SkipDownload) { $args += "-SkipDownload" }
    & $InstallerScript @args
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

Write-Host ""
exit $(if ($hasFailed) { 1 } else { 0 })
