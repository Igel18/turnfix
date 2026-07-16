# ============================================================================
# TurnFix - Database Setup Script
# ============================================================================
# Creates the TurnFix database and runs Prisma migrations
# Called by the Inno Setup installer during post-install
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$InstallDir,
    
    [string]$DbName = "turnfix",
    [string]$DbPassword = "turnfix2024",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    
    [Parameter(Mandatory=$true)]
    [string]$NodePath
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              TurnFix Database Setup                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ServerDir = Join-Path $InstallDir "server"
$NodeBinDir = Split-Path $NodePath -Parent
$PrismaCliPath = Join-Path $ServerDir "node_modules\prisma\build\index.js"
$SchemaPath = Join-Path $ServerDir "prisma\schema.prisma"

# === Check PostgreSQL availability ===
Write-Host "  Checking PostgreSQL connection..." -ForegroundColor Cyan

$pgReady = $false
$retries = 5

for ($i = 1; $i -le $retries; $i++) {
    try {
        $env:PGPASSWORD = $DbPassword
        $result = & pg_isready -h $DbHost -p $DbPort 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pgReady = $true
            break
        }
    } catch {
        # pg_isready not in PATH, try psql
    }
    
    if ($i -lt $retries) {
        Write-Host "  Waiting for PostgreSQL... (Versuch $i/$retries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $pgReady) {
    Write-Host "  ⚠ PostgreSQL ist noch nicht erreichbar." -ForegroundColor Yellow
    Write-Host "    Die Datenbank kann später über http://localhost:3001/configuration eingerichtet werden." -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "  ✓ PostgreSQL ist erreichbar" -ForegroundColor Green

# === Create Database ===
Write-Host "  Creating database '$DbName'..." -ForegroundColor Cyan

$env:PGPASSWORD = $DbPassword

# Check if database already exists
try {
    $dbExists = & psql -h $DbHost -p $DbPort -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>&1
    if ($dbExists -match "1") {
        Write-Host "  ✓ Database '$DbName' already exists" -ForegroundColor Green
    } else {
        & psql -h $DbHost -p $DbPort -U postgres -c "CREATE DATABASE `"$DbName`" ENCODING 'UTF8' LC_COLLATE 'German_Germany.1252' LC_CTYPE 'German_Germany.1252' TEMPLATE template0;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Database '$DbName' created" -ForegroundColor Green
        } else {
            # Try without locale settings
            & psql -h $DbHost -p $DbPort -U postgres -c "CREATE DATABASE `"$DbName`" ENCODING 'UTF8';" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Database '$DbName' created (default locale)" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ Could not create database. It may need to be created manually." -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "  ⚠ psql not found in PATH. Database will be created via the web UI." -ForegroundColor Yellow
    Write-Host "    Open http://localhost:3001/configuration after installation." -ForegroundColor Yellow
}

# === Run Prisma DB Push ===
Write-Host "  Running Prisma schema push..." -ForegroundColor Cyan

$env:DATABASE_URL = "postgresql://postgres:${DbPassword}@${DbHost}:${DbPort}/${DbName}?schema=public&connection_limit=20&pool_timeout=10"

Push-Location $ServerDir
try {
    if (-not (Test-Path $NodePath)) {
        throw "Node executable not found at $NodePath"
    }

    if (-not (Test-Path $PrismaCliPath)) {
        throw "Prisma CLI not found at $PrismaCliPath"
    }

    if (-not (Test-Path $SchemaPath)) {
        throw "Prisma schema not found at $SchemaPath"
    }

    # Execute Prisma via explicit node executable so this also works when
    # command resolution cannot find `node` in PATH.
    $env:PATH = "$NodeBinDir;$env:PATH"

    & $NodePath $PrismaCliPath db push --accept-data-loss --schema="$SchemaPath" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Database schema synchronized" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Prisma schema push had issues." -ForegroundColor Yellow
        Write-Host "    The schema can be applied via http://localhost:3001/configuration" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Prisma push failed: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "  ✓ Database setup complete" -ForegroundColor Green
Write-Host ""
Write-Host "  Nächster Schritt:" -ForegroundColor White
Write-Host "    Öffnen Sie http://localhost:3001/configuration" -ForegroundColor Cyan
Write-Host "    um den Datenbank-Setup-Assistenten zu starten." -ForegroundColor Cyan
Write-Host ""
