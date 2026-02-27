# ============================================================================
# TurnFix Installer Build Script
# ============================================================================
# This script prepares all files and compiles the Inno Setup installer.
#
# Prerequisites:
#   - Inno Setup 6 installed (https://jrsoftware.org/isinfo.php)
#   - Node.js installed (for building server/client)
#   - Internet connection (for downloading Node.js portable & NSSM)
#
# Usage:
#   .\build-installer.ps1
#   .\build-installer.ps1 -SkipBuild          # Skip npm build step
#   .\build-installer.ps1 -SkipDownload       # Skip downloading Node.js/NSSM
#   .\build-installer.ps1 -InnoSetupPath "C:\Program Files (x86)\Inno Setup 6"
# ============================================================================

param(
    [switch]$SkipBuild,
    [switch]$SkipDownload,
    [string]$InnoSetupPath = "",
    [string]$NodeVersion = "20.11.1",
    [string]$NssmVersion = "2.24"
)

$ErrorActionPreference = "Stop"

# === Paths ===
$ScriptDir = $PSScriptRoot
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$ServerDir = Join-Path $RepoRoot "newWebBased\server"
$ClientDir = Join-Path $RepoRoot "newWebBased\client"
$JuryDir = Join-Path $RepoRoot "newWebBased\jury-portal"
$StagingDir = Join-Path $ScriptDir "staging"
$DownloadDir = Join-Path $ScriptDir "downloads"
$OutputDir = Join-Path $ScriptDir "output"

# === Banner ===
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          TurnFix Installer Build Script                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# === Find Inno Setup ===
function Find-InnoSetup {
    if ($InnoSetupPath -and (Test-Path (Join-Path $InnoSetupPath "ISCC.exe"))) {
        return Join-Path $InnoSetupPath "ISCC.exe"
    }
    
    # Common installation paths
    $searchPaths = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 5\ISCC.exe"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    # Try PATH
    $iscc = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
    if ($iscc) { return $iscc.Source }
    
    return $null
}

$ISCC = Find-InnoSetup
if (-not $ISCC) {
    Write-Host "❌ Inno Setup nicht gefunden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte installieren Sie Inno Setup 6:" -ForegroundColor Yellow
    Write-Host "  https://jrsoftware.org/isdl.php" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Oder geben Sie den Pfad an:" -ForegroundColor Yellow
    Write-Host "  .\build-installer.ps1 -InnoSetupPath 'C:\Program Files (x86)\Inno Setup 6'" -ForegroundColor White
    exit 1
}
Write-Host "✓ Inno Setup gefunden: $ISCC" -ForegroundColor Green

# === Create directories ===
foreach ($dir in @($StagingDir, $DownloadDir, $OutputDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
}

# === Step 1: Download Node.js Portable ===
if (-not $SkipDownload) {
    Write-Host ""
    Write-Host "━━━ Step 1: Download Dependencies ━━━" -ForegroundColor Yellow
    
    # Node.js
    $nodeZip = Join-Path $DownloadDir "node-v${NodeVersion}-win-x64.zip"
    $nodeUrl = "https://nodejs.org/dist/v${NodeVersion}/node-v${NodeVersion}-win-x64.zip"
    
    if (-not (Test-Path $nodeZip)) {
        Write-Host "  📥 Downloading Node.js v${NodeVersion}..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
        Write-Host "  ✓ Node.js downloaded" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Node.js already downloaded" -ForegroundColor Green
    }
    
    # NSSM (Non-Sucking Service Manager)
    $nssmZip = Join-Path $DownloadDir "nssm-${NssmVersion}.zip"
    $nssmUrls = @(
        "https://nssm.cc/release/nssm-${NssmVersion}.zip",
        "https://nssm.cc/ci/nssm-${NssmVersion}.zip"
    )
    
    if (-not (Test-Path $nssmZip)) {
        Write-Host "  📥 Downloading NSSM v${NssmVersion}..." -ForegroundColor Cyan
        $downloaded = $false
        foreach ($nssmUrl in $nssmUrls) {
            try {
                Write-Host "    Trying: $nssmUrl" -ForegroundColor DarkGray
                Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing -TimeoutSec 30
                if ((Get-Item $nssmZip).Length -gt 1000) {
                    $downloaded = $true
                    Write-Host "  ✓ NSSM downloaded" -ForegroundColor Green
                    break
                } else {
                    Remove-Item $nssmZip -Force -ErrorAction SilentlyContinue
                }
            } catch {
                Write-Host "    Failed: $($_.Exception.Message)" -ForegroundColor DarkGray
                Remove-Item $nssmZip -Force -ErrorAction SilentlyContinue
            }
        }
        if (-not $downloaded) {
            Write-Host "  ⚠ NSSM download failed from all sources" -ForegroundColor Yellow
            Write-Host "    Please download manually from https://nssm.cc/release/nssm-2.24.zip" -ForegroundColor Yellow
            Write-Host "    and place it in: $DownloadDir" -ForegroundColor Yellow
            Write-Host "    The installer will work without NSSM but won't install Windows services." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✓ NSSM already downloaded" -ForegroundColor Green
    }
    
    # PostgreSQL installer
    $pgInstaller = Join-Path $DownloadDir "postgresql-16-windows-x64.exe"
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.6-1-windows-x64.exe"
    
    if (-not (Test-Path $pgInstaller)) {
        Write-Host "  📥 Downloading PostgreSQL 16 installer (~300MB)..." -ForegroundColor Cyan
        Write-Host "     Dies kann einige Minuten dauern..." -ForegroundColor DarkGray
        try {
            Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstaller -UseBasicParsing
            Write-Host "  ✓ PostgreSQL downloaded" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ PostgreSQL download failed" -ForegroundColor Yellow
            Write-Host "    Users will need to install PostgreSQL manually" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✓ PostgreSQL already downloaded" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "━━━ Step 1: Skipping Downloads ━━━" -ForegroundColor Yellow
}

# === Step 2: Build Application ===
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "━━━ Step 2: Build Application ━━━" -ForegroundColor Yellow
    
    # Shared package build (must be built before server/client/jury-portal)
    Write-Host "  [0/3] Building Shared Package..." -ForegroundColor Cyan
    $SharedDir = Join-Path $WebDir "shared"
    if (Test-Path $SharedDir) {
        Push-Location $SharedDir
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "Shared package build failed" }
            Write-Host "  ✓ Shared package built" -ForegroundColor Green
        } finally { Pop-Location }
    }
    
    # Server build
    Write-Host "  [1/3] Building Server..." -ForegroundColor Cyan
    Push-Location $ServerDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Server build failed" }
        Write-Host "  ✓ Server built" -ForegroundColor Green
    } finally { Pop-Location }
    
    # Client build
    Write-Host "  [2/3] Building Client..." -ForegroundColor Cyan
    Push-Location $ClientDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Client build failed" }
        Write-Host "  ✓ Client built" -ForegroundColor Green
    } finally { Pop-Location }
    
    # Jury Portal build
    if (Test-Path $JuryDir) {
        Write-Host "  [3/3] Building Jury Portal..." -ForegroundColor Cyan
        Push-Location $JuryDir
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "Jury Portal build failed" }
            Write-Host "  ✓ Jury Portal built" -ForegroundColor Green
        } finally { Pop-Location }
    }
} else {
    Write-Host ""
    Write-Host "━━━ Step 2: Skipping Build ━━━" -ForegroundColor Yellow
}

# === Step 3: Prepare Staging Directory ===
Write-Host ""
Write-Host "━━━ Step 3: Prepare Staging Directory ━━━" -ForegroundColor Yellow

# Clean staging
if (Test-Path $StagingDir) {
    Write-Host "  🗑 Cleaning staging directory..." -ForegroundColor DarkGray
    Remove-Item -Path $StagingDir -Recurse -Force
}
New-Item -Path $StagingDir -ItemType Directory -Force | Out-Null

# -- Node.js portable --
Write-Host "  📦 Extracting Node.js..." -ForegroundColor Cyan
$nodeStaging = Join-Path $StagingDir "nodejs"
$nodeZip = Join-Path $DownloadDir "node-v${NodeVersion}-win-x64.zip"
if (Test-Path $nodeZip) {
    Expand-Archive -Path $nodeZip -DestinationPath "$StagingDir\_node_temp" -Force
    # Move inner folder to clean path
    $innerFolder = Get-ChildItem "$StagingDir\_node_temp" | Select-Object -First 1
    Move-Item -Path $innerFolder.FullName -Destination $nodeStaging
    Remove-Item "$StagingDir\_node_temp" -Recurse -Force
    Write-Host "  ✓ Node.js extracted" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Node.js zip not found - installer will require Node.js on system" -ForegroundColor Yellow
}

# -- NSSM --
Write-Host "  📦 Extracting NSSM..." -ForegroundColor Cyan
$nssmZip = Join-Path $DownloadDir "nssm-${NssmVersion}.zip"
$nssmStaging = Join-Path $StagingDir "nssm"
if (Test-Path $nssmZip) {
    Expand-Archive -Path $nssmZip -DestinationPath "$StagingDir\_nssm_temp" -Force
    $nssmInner = Get-ChildItem "$StagingDir\_nssm_temp" | Select-Object -First 1
    New-Item -Path $nssmStaging -ItemType Directory -Force | Out-Null
    # Copy only win64 exe
    $nssmExe = Join-Path $nssmInner.FullName "win64\nssm.exe"
    if (Test-Path $nssmExe) {
        Copy-Item $nssmExe -Destination $nssmStaging
    }
    Remove-Item "$StagingDir\_nssm_temp" -Recurse -Force
    Write-Host "  ✓ NSSM extracted" -ForegroundColor Green
} else {
    Write-Host "  ⚠ NSSM zip not found" -ForegroundColor Yellow
}

# -- PostgreSQL installer --
Write-Host "  📦 Copying PostgreSQL installer..." -ForegroundColor Cyan
$pgStaging = Join-Path $StagingDir "postgresql"
New-Item -Path $pgStaging -ItemType Directory -Force | Out-Null
$pgInstaller = Join-Path $DownloadDir "postgresql-16-windows-x64.exe"
if (Test-Path $pgInstaller) {
    Copy-Item $pgInstaller -Destination (Join-Path $pgStaging "postgresql-installer.exe")
    Write-Host "  ✓ PostgreSQL installer copied" -ForegroundColor Green
} else {
    Write-Host "  ⚠ PostgreSQL installer not found - will be optional" -ForegroundColor Yellow
}

# -- Server dist --
Write-Host "  📦 Copying server files..." -ForegroundColor Cyan
$serverStaging = Join-Path $StagingDir "server"
New-Item -Path $serverStaging -ItemType Directory -Force | Out-Null

# Copy dist
$serverDist = Join-Path $ServerDir "dist"
if (Test-Path $serverDist) {
    Copy-Item -Path $serverDist -Destination (Join-Path $serverStaging "dist") -Recurse
}

# Copy prisma
$prismaSrc = Join-Path $ServerDir "prisma"
if (Test-Path $prismaSrc) {
    $prismaStaging = Join-Path $serverStaging "prisma"
    New-Item -Path $prismaStaging -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $prismaSrc "schema.prisma") -Destination $prismaStaging
    # Copy migrations if they exist
    $migrationsDir = Join-Path $prismaSrc "migrations"
    if (Test-Path $migrationsDir) {
        Copy-Item -Path $migrationsDir -Destination (Join-Path $prismaStaging "migrations") -Recurse
    }
}

# Copy package.json and package-lock.json for npm ci --production
Copy-Item (Join-Path $ServerDir "package.json") -Destination $serverStaging
$packageLock = Join-Path $ServerDir "package-lock.json"
if (Test-Path $packageLock) {
    Copy-Item $packageLock -Destination $serverStaging
}

# Copy .env.example
$envExample = Join-Path $ServerDir ".env.example"
if (Test-Path $envExample) {
    Copy-Item $envExample -Destination (Join-Path $serverStaging ".env.example")
}

# Copy ecosystem.config.js
$ecosystemConfig = Join-Path $ServerDir "ecosystem.config.js"
if (Test-Path $ecosystemConfig) {
    Copy-Item $ecosystemConfig -Destination $serverStaging
}

# Copy public directory (icons etc.)
$publicDir = Join-Path $ServerDir "public"
if (Test-Path $publicDir) {
    Copy-Item -Path $publicDir -Destination (Join-Path $serverStaging "public") -Recurse
}

# Install production node_modules
Write-Host "  📦 Installing production dependencies..." -ForegroundColor Cyan
Push-Location $serverStaging
try {
    # Use the system Node.js to install production deps
    npm ci --omit=dev --ignore-scripts 2>&1 | Out-Null
    
    # Generate Prisma client
    npx prisma generate 2>&1 | Out-Null
    
    Write-Host "  ✓ Production dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Failed to install production deps: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    Copying full node_modules instead..." -ForegroundColor Yellow
    
    # Fallback: copy node_modules  
    if (Test-Path (Join-Path $serverStaging "node_modules")) {
        Remove-Item (Join-Path $serverStaging "node_modules") -Recurse -Force
    }
    Copy-Item -Path (Join-Path $ServerDir "node_modules") -Destination (Join-Path $serverStaging "node_modules") -Recurse
}
finally { Pop-Location }

Write-Host "  ✓ Server files copied" -ForegroundColor Green

# -- Client dist --
Write-Host "  📦 Copying client build..." -ForegroundColor Cyan
$clientStaging = Join-Path $StagingDir "client"
New-Item -Path $clientStaging -ItemType Directory -Force | Out-Null
$clientDist = Join-Path $ClientDir "dist"
if (Test-Path $clientDist) {
    Copy-Item -Path $clientDist -Destination (Join-Path $clientStaging "dist") -Recurse
}
# Copy client public (icons etc.)
$clientPublic = Join-Path $ClientDir "public"
if (Test-Path $clientPublic) {
    Copy-Item -Path $clientPublic -Destination (Join-Path $clientStaging "public") -Recurse
}
Write-Host "  ✓ Client build copied" -ForegroundColor Green

# -- Jury Portal dist --
if (Test-Path $JuryDir) {
    Write-Host "  📦 Copying Jury Portal build..." -ForegroundColor Cyan
    $juryStaging = Join-Path $StagingDir "jury-portal"
    New-Item -Path $juryStaging -ItemType Directory -Force | Out-Null
    $juryDist = Join-Path $JuryDir "dist"
    if (Test-Path $juryDist) {
        Copy-Item -Path $juryDist -Destination (Join-Path $juryStaging "dist") -Recurse
    }
    Write-Host "  ✓ Jury Portal build copied" -ForegroundColor Green
}

# -- Copy installer scripts --
Write-Host "  📦 Copying installer scripts..." -ForegroundColor Cyan
$scriptsStaging = Join-Path $StagingDir "scripts"
New-Item -Path $scriptsStaging -ItemType Directory -Force | Out-Null

$scriptFiles = @(
    "post-install.ps1",
    "install-postgresql.ps1",
    "setup-database.ps1",
    "configure-service.ps1",
    "configure-firewall.ps1",
    "uninstall-service.ps1",
    "turnfix-tray.ps1"
)
foreach ($sf in $scriptFiles) {
    $src = Join-Path $ScriptDir "scripts\$sf"
    if (Test-Path $src) {
        Copy-Item $src -Destination $scriptsStaging
    }
}
Write-Host "  ✓ Installer scripts copied" -ForegroundColor Green

# -- Copy TurnFix Manager --
Write-Host "  📦 Copying TurnFix Manager..." -ForegroundColor Cyan
$managerBat = Join-Path $RepoRoot "TurnFix-Manager.bat"
$managerPs1 = Join-Path $RepoRoot "turnfix-manager.ps1"
if (Test-Path $managerBat) { Copy-Item $managerBat -Destination $StagingDir }
if (Test-Path $managerPs1) { Copy-Item $managerPs1 -Destination $StagingDir }
Write-Host "  ✓ TurnFix Manager copied" -ForegroundColor Green

# -- Build Documentation --
Write-Host "  📦 Building documentation..." -ForegroundColor Cyan
$docsScript = Join-Path $ScriptDir "scripts\build-docs.ps1"
$docsOutputDir = Join-Path $StagingDir "docs"
if (Test-Path $docsScript) {
    & $docsScript -OutputDir $docsOutputDir -DocsDir (Join-Path $RepoRoot "documentation\newWebbased")
    Write-Host "  ✓ Documentation built" -ForegroundColor Green
} else {
    Write-Host "  ⚠ build-docs.ps1 not found, skipping documentation" -ForegroundColor Yellow
}

# === Step 4: Calculate staging size ===
Write-Host ""
$stagingSize = (Get-ChildItem -Path $StagingDir -Recurse | Measure-Object -Property Length -Sum).Sum
$stagingSizeMB = [math]::Round($stagingSize / 1MB, 1)
Write-Host "  📊 Staging directory size: ${stagingSizeMB} MB" -ForegroundColor Cyan

# === Step 5: Compile Installer ===
Write-Host ""
Write-Host "━━━ Step 4: Compile Installer ━━━" -ForegroundColor Yellow

$issFile = Join-Path $ScriptDir "turnfix-setup.iss"
if (-not (Test-Path $issFile)) {
    Write-Host "❌ turnfix-setup.iss not found!" -ForegroundColor Red
    exit 1
}

# === Read build-info.json for version info ===
$buildInfoPath = Join-Path $StagingDir "server\dist\build-info.json"
$gitHash = "dev"
$buildDate = ""
$buildNumber = "0"

if (Test-Path $buildInfoPath) {
    try {
        $buildInfo = Get-Content $buildInfoPath -Raw | ConvertFrom-Json
        $gitHash = $buildInfo.gitHash
        if ($buildInfo.buildDate) {
            $buildDate = $buildInfo.buildDate
        }
        Write-Host "  📋 Git Hash:    $gitHash" -ForegroundColor White
        Write-Host "  📋 Build Date:  $buildDate" -ForegroundColor White
    } catch {
        Write-Host "  ⚠ Could not parse build-info.json: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ build-info.json not found, using defaults" -ForegroundColor Yellow
}

# Get build number from git commit count
try {
    Push-Location $RepoRoot
    $buildNumber = (git rev-list --count HEAD 2>$null)
    if (-not $buildNumber) { $buildNumber = "0" }
    Pop-Location
    Write-Host "  📋 Build #:     $buildNumber" -ForegroundColor White
} catch {
    Write-Host "  ⚠ Could not get git commit count: $_" -ForegroundColor Yellow
}

Write-Host "  🔨 Compiling with Inno Setup..." -ForegroundColor Cyan
& $ISCC /O"$OutputDir" /DMyStagingDir="$StagingDir" /DMyGitHash="$gitHash" /DMyBuildDate="$buildDate" "/DMyBuildNumber=$buildNumber" "$issFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║          ✓ INSTALLER ERFOLGREICH ERSTELLT!                ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    $outputFile = Get-ChildItem $OutputDir -Filter "TurnFix-Setup-*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($outputFile) {
        $outputSizeMB = [math]::Round($outputFile.Length / 1MB, 1)
        Write-Host "  📦 Output: $($outputFile.FullName)" -ForegroundColor White
        Write-Host "  📊 Size:   ${outputSizeMB} MB" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "❌ Inno Setup compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
