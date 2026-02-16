# ============================================================================
# TurnFix - PostgreSQL Installation Script
# ============================================================================
# Silent install of PostgreSQL (called by Inno Setup if bundled PG installer
# is not available - standalone usage)
# ============================================================================

param(
    [string]$InstallerPath = "",
    [string]$Password = "turnfix2024",
    [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║             PostgreSQL Installation                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if already installed
if (Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue) {
    Write-Host "  ✓ PostgreSQL is already installed" -ForegroundColor Green
    
    # Check if running
    $pgService = Get-Service -Name "postgresql*" | Where-Object { $_.Status -eq "Running" }
    if ($pgService) {
        Write-Host "  ✓ PostgreSQL is running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ PostgreSQL is installed but not running" -ForegroundColor Yellow
        Write-Host "  Starting PostgreSQL..." -ForegroundColor Cyan
        Get-Service -Name "postgresql*" | Start-Service
    }
    exit 0
}

# Find installer
if (-not $InstallerPath -or -not (Test-Path $InstallerPath)) {
    Write-Host "❌ PostgreSQL installer not found at: $InstallerPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download PostgreSQL manually:" -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

Write-Host "  Installing PostgreSQL (this may take several minutes)..." -ForegroundColor Cyan

# Run silent installation
$args = @(
    "--mode", "unattended",
    "--unattendedmodeui", "minimal",
    "--superpassword", $Password,
    "--serverport", $Port.ToString(),
    "--servicename", "postgresql-16",
    "--servicepassword", $Password,
    "--install_runtimes", "0"
)

$process = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru
if ($process.ExitCode -eq 0) {
    Write-Host "  ✓ PostgreSQL installed successfully" -ForegroundColor Green
    
    # Wait for service to start
    Write-Host "  Waiting for PostgreSQL service..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Write-Host "  ✓ PostgreSQL service is running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ PostgreSQL service may need manual start" -ForegroundColor Yellow
    }
    
    # Add to PATH for psql
    $pgBinPath = "C:\Program Files\PostgreSQL\16\bin"
    if (Test-Path $pgBinPath) {
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$pgBinPath*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$pgBinPath", "Machine")
            $env:PATH = "$env:PATH;$pgBinPath"
            Write-Host "  ✓ PostgreSQL added to system PATH" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ❌ PostgreSQL installation failed (Exit code: $($process.ExitCode))" -ForegroundColor Red
    exit 1
}

Write-Host ""
