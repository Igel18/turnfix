# ============================================================================
# TurnFix - Windows Service Configuration Script
# ============================================================================
# Uses NSSM to install TurnFix as a Windows Service
# Called by the Inno Setup installer during post-install
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallDir,
    
    [Parameter(Mandatory=$true)]
    [string]$NodePath,
    
    [Parameter(Mandatory=$true)]
    [string]$NssmPath,
    
    [string]$ServerPort = "3001",
    [string]$JuryPort = "3002"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         TurnFix Windows Service Configuration             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ServerDir = Join-Path $InstallDir "server"
$ServerScript = Join-Path $ServerDir "dist\index.js"
$EnvFile = Join-Path $ServerDir ".env"

# Verify files exist
if (-not (Test-Path $NodePath)) {
    Write-Host "❌ Node.js not found at: $NodePath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $NssmPath)) {
    Write-Host "⚠ NSSM not found at: $NssmPath" -ForegroundColor Yellow
    Write-Host "  Windows-Dienst kann nicht installiert werden." -ForegroundColor Yellow
    Write-Host "  TurnFix kann stattdessen über TurnFix-Manager.bat gestartet werden." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Um NSSM nachträglich zu installieren:" -ForegroundColor Cyan
    Write-Host "    1. Herunterladen von https://nssm.cc/release/nssm-2.24.zip" -ForegroundColor White
    Write-Host "    2. nssm.exe nach $NssmPath kopieren" -ForegroundColor White
    Write-Host "    3. Dieses Script erneut ausführen" -ForegroundColor White
    exit 0
}
if (-not (Test-Path $ServerScript)) {
    Write-Host "❌ Server script not found at: $ServerScript" -ForegroundColor Red
    exit 1
}

# === Main TurnFix Service ===
$serviceName = "TurnFixServer"
$serviceDisplayName = "TurnFix Server"
$serviceDescription = "TurnFix Turnwettkampf Verwaltung - Haupt-Server (Port $ServerPort)"

Write-Host "  Installing service: $serviceDisplayName..." -ForegroundColor Cyan

# Remove existing service if present
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "  Removing existing service..." -ForegroundColor Yellow
    & $NssmPath stop $serviceName 2>&1 | Out-Null
    & $NssmPath remove $serviceName confirm 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}

# Install service
& $NssmPath install $serviceName $NodePath $ServerScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install service $serviceName" -ForegroundColor Red
    exit 1
}

# Configure service
& $NssmPath set $serviceName DisplayName $serviceDisplayName
& $NssmPath set $serviceName Description $serviceDescription
& $NssmPath set $serviceName AppDirectory $ServerDir
& $NssmPath set $serviceName Start SERVICE_AUTO_START
& $NssmPath set $serviceName ObjectName LocalSystem

# Environment variables
& $NssmPath set $serviceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$ServerPort"

# Logging
$logsDir = Join-Path $ServerDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
}
& $NssmPath set $serviceName AppStdout (Join-Path $logsDir "service-out.log")
& $NssmPath set $serviceName AppStderr (Join-Path $logsDir "service-err.log")
& $NssmPath set $serviceName AppStdoutCreationDisposition 4
& $NssmPath set $serviceName AppStderrCreationDisposition 4
& $NssmPath set $serviceName AppRotateFiles 1
& $NssmPath set $serviceName AppRotateBytes 5242880

# Restart settings
& $NssmPath set $serviceName AppExit Default Restart
& $NssmPath set $serviceName AppRestartDelay 5000
& $NssmPath set $serviceName AppThrottle 10000

Write-Host "  ✓ Service $serviceDisplayName installed" -ForegroundColor Green

# === Jury Portal Service ===
$juryServiceName = "TurnFixJuryServer"
$juryDisplayName = "TurnFix Jury Server"
$juryDescription = "TurnFix Kampfrichter-Portal (Port $JuryPort)"

Write-Host "  Installing service: $juryDisplayName..." -ForegroundColor Cyan

# Remove existing
$existingJury = Get-Service -Name $juryServiceName -ErrorAction SilentlyContinue
if ($existingJury) {
    & $NssmPath stop $juryServiceName 2>&1 | Out-Null
    & $NssmPath remove $juryServiceName confirm 2>&1 | Out-Null
    Start-Sleep -Seconds 2
}

# Install jury service
& $NssmPath install $juryServiceName $NodePath $ServerScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install service $juryServiceName" -ForegroundColor Red
    exit 1
}

# Configure
& $NssmPath set $juryServiceName DisplayName $juryDisplayName
& $NssmPath set $juryServiceName Description $juryDescription
& $NssmPath set $juryServiceName AppDirectory $ServerDir
& $NssmPath set $juryServiceName Start SERVICE_DEMAND_START
& $NssmPath set $juryServiceName ObjectName LocalSystem

# Environment
& $NssmPath set $juryServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$JuryPort" "JURY_MODE=true"

# Logging
& $NssmPath set $juryServiceName AppStdout (Join-Path $logsDir "jury-service-out.log")
& $NssmPath set $juryServiceName AppStderr (Join-Path $logsDir "jury-service-err.log")
& $NssmPath set $juryServiceName AppStdoutCreationDisposition 4
& $NssmPath set $juryServiceName AppStderrCreationDisposition 4
& $NssmPath set $juryServiceName AppRotateFiles 1
& $NssmPath set $juryServiceName AppRotateBytes 5242880

# Restart settings
& $NssmPath set $juryServiceName AppExit Default Restart
& $NssmPath set $juryServiceName AppRestartDelay 5000

Write-Host "  ✓ Service $juryDisplayName installed" -ForegroundColor Green

# === Start main service ===
Write-Host ""
Write-Host "  Starting TurnFix Server..." -ForegroundColor Cyan
& $NssmPath start $serviceName
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ TurnFix Server gestartet!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Server konnte nicht gestartet werden." -ForegroundColor Yellow
    Write-Host "    Bitte starten Sie den Service manuell über die Windows-Dienstverwaltung." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Services installiert:" -ForegroundColor White
Write-Host "    • $serviceDisplayName (Port $ServerPort) - Autostart" -ForegroundColor White
Write-Host "    • $juryDisplayName (Port $JuryPort) - Manueller Start" -ForegroundColor White
Write-Host ""
Write-Host "  Verwaltung über:" -ForegroundColor DarkGray
Write-Host "    services.msc (Windows-Dienstverwaltung)" -ForegroundColor DarkGray
Write-Host "    oder TurnFix-Manager.bat" -ForegroundColor DarkGray
Write-Host ""
