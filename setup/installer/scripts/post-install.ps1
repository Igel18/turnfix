# ============================================================================
# TurnFix - Post-Installation Script
# ============================================================================
# Runs after all files are installed. Performs final configuration steps.
# Can also be run standalone to reconfigure an existing installation.
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallDir,
    
    [string]$DbName = "turnfix",
    [string]$DbPassword = "turnfix2024",
    [string]$ServerPort = "3001",
    [string]$JuryPort = "3002"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           TurnFix Post-Installation                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ServerDir = Join-Path $InstallDir "server"
$NodePath = Join-Path $InstallDir "nodejs\node.exe"

# === Verify Installation ===
Write-Host "  Verifying installation..." -ForegroundColor Cyan

$checks = @(
    @{ Name = "Node.js"; Path = $NodePath },
    @{ Name = "Server dist"; Path = (Join-Path $ServerDir "dist\index.js") },
    @{ Name = "Prisma schema"; Path = (Join-Path $ServerDir "prisma\schema.prisma") },
    @{ Name = ".env file"; Path = (Join-Path $ServerDir ".env") }
)

$allOk = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "    ✓ $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "    ✗ $($check.Name) - NOT FOUND: $($check.Path)" -ForegroundColor Red
        $allOk = $false
    }
}

if (-not $allOk) {
    Write-Host ""
    Write-Host "  ⚠ Some components are missing. Installation may be incomplete." -ForegroundColor Yellow
}

# === Check Node.js version ===
Write-Host ""
Write-Host "  Node.js version:" -ForegroundColor Cyan
$nodeVersion = & $NodePath --version 2>&1
Write-Host "    $nodeVersion" -ForegroundColor White

# === Create logs directory ===
$logsDir = Join-Path $ServerDir "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -Path $logsDir -ItemType Directory -Force | Out-Null
    Write-Host "    ✓ Logs directory created" -ForegroundColor Green
}

# === Create uploads directory ===
$uploadsDir = Join-Path $ServerDir "uploads"
if (-not (Test-Path $uploadsDir)) {
    New-Item -Path $uploadsDir -ItemType Directory -Force | Out-Null
    Write-Host "    ✓ Uploads directory created" -ForegroundColor Green
}

# === Test database connection ===
Write-Host ""
Write-Host "  Testing database connection..." -ForegroundColor Cyan

$env:PGPASSWORD = $DbPassword
try {
    $pgResult = & pg_isready -h localhost -p 5432 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ PostgreSQL is not responding" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠ Could not check PostgreSQL (pg_isready not in PATH)" -ForegroundColor Yellow
}

# === Summary ===
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            ✓ Post-Installation Complete!                  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Installation: $InstallDir" -ForegroundColor White
Write-Host ""
Write-Host "  Nächste Schritte:" -ForegroundColor Yellow
Write-Host "    1. Öffnen Sie http://localhost:$ServerPort" -ForegroundColor White
Write-Host "    2. Folgen Sie dem Datenbank-Setup-Assistenten" -ForegroundColor White
Write-Host "    3. Importieren Sie Ihre GymNet-Daten" -ForegroundColor White
Write-Host ""
