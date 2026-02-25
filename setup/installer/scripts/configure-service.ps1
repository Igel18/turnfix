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

$ErrorActionPreference = "Continue"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         TurnFix Windows Service Configuration              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ServerDir = Join-Path $InstallDir "server"
$ServerScript = Join-Path $ServerDir "dist\index.js"
$EnvFile = Join-Path $ServerDir ".env"

# Verify files exist
if (-not (Test-Path $NodePath)) {
    Write-Host "❌ Node.js not found at: $NodePath" -ForegroundColor Red
    Write-Host "  Available files in install dir:" -ForegroundColor Yellow
    Get-ChildItem $InstallDir -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $($_.Name)" }
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
    Write-Host "  Contents of server dir:" -ForegroundColor Yellow
    Get-ChildItem $ServerDir -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $($_.Name)" }
    if (Test-Path (Join-Path $ServerDir "dist")) {
        Write-Host "  Contents of dist/:" -ForegroundColor Yellow
        Get-ChildItem (Join-Path $ServerDir "dist") -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $($_.Name)" }
    }
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

# Install service with minimal nssm install, then configure via registry
# PowerShell's argument quoting to external commands is unreliable with paths containing spaces
# So we install with just the service name and set paths directly in the registry
$installOutput = & $NssmPath install $serviceName $NodePath 2>&1
Write-Host "  NSSM install output: $installOutput" -ForegroundColor DarkGray
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install service $serviceName (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "  NodePath: $NodePath" -ForegroundColor Yellow
    Write-Host "  ServerScript: $ServerScript" -ForegroundColor Yellow
    exit 1
}

# Set paths directly via registry to guarantee correct quoting for paths with spaces
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$serviceName\Parameters"
Set-ItemProperty -Path $regPath -Name "Application" -Value $NodePath
Set-ItemProperty -Path $regPath -Name "AppParameters" -Value "`"$ServerScript`""
Set-ItemProperty -Path $regPath -Name "AppDirectory" -Value $ServerDir
Write-Host "  Registry paths set (Application, AppParameters, AppDirectory)" -ForegroundColor DarkGray

# Configure service - redirect stderr to avoid false failures
& $NssmPath set $serviceName DisplayName $serviceDisplayName 2>&1 | Out-Null
& $NssmPath set $serviceName Description $serviceDescription 2>&1 | Out-Null
& $NssmPath set $serviceName Start SERVICE_AUTO_START 2>&1 | Out-Null
& $NssmPath set $serviceName ObjectName LocalSystem 2>&1 | Out-Null

# Environment variables - include DATABASE_URL from .env file
$envVars = @("NODE_ENV=production", "PORT=$ServerPort")
if (Test-Path $EnvFile) {
    foreach ($line in (Get-Content $EnvFile)) {
        if ($line -match '^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$') {
            $envVars += "DATABASE_URL=$($Matches[1])"
        }
        if ($line -match '^\s*JWT_SECRET\s*=\s*"?(.+?)"?\s*$') {
            $envVars += "JWT_SECRET=$($Matches[1])"
        }
        if ($line -match '^\s*JWT_REFRESH_SECRET\s*=\s*"?(.+?)"?\s*$') {
            $envVars += "JWT_REFRESH_SECRET=$($Matches[1])"
        }
    }
}
& $NssmPath set $serviceName AppEnvironmentExtra $envVars 2>&1 | Out-Null
# Also write via registry as MultiString to ensure correct handling
Set-ItemProperty -Path $regPath -Name "AppEnvironmentExtra" -Value $envVars -Type MultiString

# Logging - set paths via registry to handle spaces in paths
$logsDir = Join-Path $ServerDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "AppStdout" -Value (Join-Path $logsDir "service-out.log")
Set-ItemProperty -Path $regPath -Name "AppStderr" -Value (Join-Path $logsDir "service-err.log")
Set-ItemProperty -Path $regPath -Name "AppStdoutCreationDisposition" -Value 4 -Type DWord
Set-ItemProperty -Path $regPath -Name "AppStderrCreationDisposition" -Value 4 -Type DWord
Set-ItemProperty -Path $regPath -Name "AppRotateFiles" -Value 1 -Type DWord
Set-ItemProperty -Path $regPath -Name "AppRotateBytes" -Value 5242880 -Type DWord

# Restart settings
Set-ItemProperty -Path $regPath -Name "AppRestartDelay" -Value 5000 -Type DWord
Set-ItemProperty -Path $regPath -Name "AppThrottle" -Value 10000 -Type DWord
# AppExit still via nssm (it takes a special format)
& $NssmPath set $serviceName AppExit Default Restart 2>&1 | Out-Null

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

# Install jury service, then configure paths via registry
$installOutput = & $NssmPath install $juryServiceName $NodePath 2>&1
Write-Host "  NSSM install output: $installOutput" -ForegroundColor DarkGray
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install service $juryServiceName (exit code: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

# Set paths directly via registry to guarantee correct quoting for paths with spaces
$juryRegPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$juryServiceName\Parameters"
Set-ItemProperty -Path $juryRegPath -Name "Application" -Value $NodePath
Set-ItemProperty -Path $juryRegPath -Name "AppParameters" -Value "`"$ServerScript`""
Set-ItemProperty -Path $juryRegPath -Name "AppDirectory" -Value $ServerDir
Write-Host "  Registry paths set (Application, AppParameters, AppDirectory)" -ForegroundColor DarkGray

# Configure
& $NssmPath set $juryServiceName DisplayName $juryDisplayName 2>&1 | Out-Null
& $NssmPath set $juryServiceName Description $juryDescription 2>&1 | Out-Null
& $NssmPath set $juryServiceName Start SERVICE_DEMAND_START 2>&1 | Out-Null
& $NssmPath set $juryServiceName ObjectName LocalSystem 2>&1 | Out-Null

# Environment variables - include DATABASE_URL from .env file
$juryEnvVars = @("NODE_ENV=production", "PORT=$JuryPort", "JURY_MODE=true")
if (Test-Path $EnvFile) {
    foreach ($line in (Get-Content $EnvFile)) {
        if ($line -match '^\s*DATABASE_URL\s*=\s*"?(.+?)"?\s*$') {
            $juryEnvVars += "DATABASE_URL=$($Matches[1])"
        }
        if ($line -match '^\s*JWT_SECRET\s*=\s*"?(.+?)"?\s*$') {
            $juryEnvVars += "JWT_SECRET=$($Matches[1])"
        }
        if ($line -match '^\s*JWT_REFRESH_SECRET\s*=\s*"?(.+?)"?\s*$') {
            $juryEnvVars += "JWT_REFRESH_SECRET=$($Matches[1])"
        }
    }
}
& $NssmPath set $juryServiceName AppEnvironmentExtra $juryEnvVars 2>&1 | Out-Null
# Also write via registry as MultiString to ensure correct handling
Set-ItemProperty -Path $juryRegPath -Name "AppEnvironmentExtra" -Value $juryEnvVars -Type MultiString

# Logging - set paths via registry to handle spaces in paths
Set-ItemProperty -Path $juryRegPath -Name "AppStdout" -Value (Join-Path $logsDir "jury-service-out.log")
Set-ItemProperty -Path $juryRegPath -Name "AppStderr" -Value (Join-Path $logsDir "jury-service-err.log")
Set-ItemProperty -Path $juryRegPath -Name "AppStdoutCreationDisposition" -Value 4 -Type DWord
Set-ItemProperty -Path $juryRegPath -Name "AppStderrCreationDisposition" -Value 4 -Type DWord
Set-ItemProperty -Path $juryRegPath -Name "AppRotateFiles" -Value 1 -Type DWord
Set-ItemProperty -Path $juryRegPath -Name "AppRotateBytes" -Value 5242880 -Type DWord

# Restart settings
Set-ItemProperty -Path $juryRegPath -Name "AppRestartDelay" -Value 5000 -Type DWord
& $NssmPath set $juryServiceName AppExit Default Restart 2>&1 | Out-Null

Write-Host "  ✓ Service $juryDisplayName installed" -ForegroundColor Green

# === Start main service ===
Write-Host ""
Write-Host "  Starting TurnFix Server..." -ForegroundColor Cyan
& $NssmPath start $serviceName
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ TurnFix Server gestartet!" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Server konnte noch nicht gestartet werden." -ForegroundColor Yellow
    Write-Host "    Dies kann normal sein, wenn PostgreSQL noch initialisiert wird." -ForegroundColor Yellow
    Write-Host "    Der Service startet automatisch beim nächsten Systemstart." -ForegroundColor Yellow
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

# Service installation was successful, exit 0 even if start failed
exit 0
