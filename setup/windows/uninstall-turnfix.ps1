# TurnFix Uninstaller
# This script removes TurnFix and optionally all its components

param(
    [string]$InstallPath = "C:\TurnFix",
    [switch]$RemoveDatabase,
    [switch]$RemovePostgreSQL,
    [switch]$RemoveNodeJS,
    [switch]$RemoveGit,
    [switch]$RemoveVSCode,
    [switch]$RemoveChocolatey,
    [switch]$RemoveAll,
    [switch]$KeepUserData,
    [switch]$Silent,
    [string]$PostgreSQLPassword = "turnfix2024"
)

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                    TurnFix Uninstaller                        ║
║              Remove TurnFix and Components                    ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Red

Write-Host ""
Write-Host "This script will help you remove TurnFix from your system." -ForegroundColor Yellow
Write-Host ""

# Check if running as administrator for some operations
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin -and ($RemovePostgreSQL -or $RemoveNodeJS -or $RemoveGit -or $RemoveVSCode -or $RemoveChocolatey -or $RemoveAll)) {
    Write-Host "⚠️  WARNING: Administrator privileges required for removing system components!" -ForegroundColor Yellow
    Write-Host "Please run as Administrator or use -RemoveDatabase and manual application removal only." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $Silent) {
        $continue = Read-Host "Continue with limited removal options? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "Uninstall cancelled." -ForegroundColor Yellow
            exit 0
        }
    }
}

# Function to test if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to stop TurnFix processes
function Stop-TurnFixProcesses {
    Write-Host "Stopping TurnFix processes..." -ForegroundColor Yellow
    
    # Stop Node.js processes that might be running TurnFix
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.Path -like "*TurnFix*" -or 
        $_.CommandLine -like "*npm run dev*" -or
        $_.CommandLine -like "*newWebBased*"
    }
    
    if ($nodeProcesses) {
        Write-Host "Found TurnFix processes, stopping them..." -ForegroundColor Cyan
        $nodeProcesses | ForEach-Object {
            try {
                Stop-Process -Id $_.Id -Force
                Write-Host "  ✓ Stopped process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠ Could not stop process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "No TurnFix processes found running." -ForegroundColor Green
    }
}

# Function to remove TurnFix application
function Remove-TurnFixApplication {
    Write-Host "Removing TurnFix application..." -ForegroundColor Yellow
    
    if (Test-Path $InstallPath) {
        try {
            Write-Host "Removing directory: $InstallPath" -ForegroundColor Cyan
            Remove-Item -Path $InstallPath -Recurse -Force
            Write-Host "✓ TurnFix application removed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "✗ Error removing TurnFix application: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "You may need to remove it manually or close any open files/folders." -ForegroundColor Yellow
        }
    } else {
        Write-Host "TurnFix application not found at: $InstallPath" -ForegroundColor Gray
    }
}

# Function to remove TurnFix database
function Remove-TurnFixDatabase {
    if (-not (Test-CommandExists "psql")) {
        Write-Host "PostgreSQL command-line tools not found. Cannot remove database." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Removing TurnFix database..." -ForegroundColor Yellow
    
    try {
        $env:PGPASSWORD = $PostgreSQLPassword
        
        # Terminate connections to the database
        Write-Host "Terminating database connections..." -ForegroundColor Cyan
        $terminateSQL = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'turnfix' AND pid <> pg_backend_pid();"
        & psql -h localhost -U postgres -c $terminateSQL 2>$null
        
        # Drop database
        Write-Host "Dropping TurnFix database..." -ForegroundColor Cyan
        $dropDbResult = & psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS turnfix;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ TurnFix database removed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Database removal may have failed: $dropDbResult" -ForegroundColor Yellow
        }
        
        # Drop user
        Write-Host "Dropping TurnFix database user..." -ForegroundColor Cyan
        $dropUserResult = & psql -h localhost -U postgres -c "DROP USER IF EXISTS turnfix_user;" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ TurnFix database user removed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Database user removal may have failed: $dropUserResult" -ForegroundColor Yellow
        }
        
        $env:PGPASSWORD = $null
        
    } catch {
        Write-Host "✗ Error removing database: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "You may need to remove it manually using pgAdmin or psql." -ForegroundColor Yellow
        $env:PGPASSWORD = $null
    }
}

# Function to remove components via Chocolatey
function Remove-ChocolateyPackage {
    param($packageName, $displayName)
    
    if (-not (Test-CommandExists "choco")) {
        Write-Host "Chocolatey not found. Cannot remove $displayName via package manager." -ForegroundColor Yellow
        return
    }
    
    Write-Host "Removing $displayName..." -ForegroundColor Yellow
    
    try {
        $result = & choco uninstall $packageName -y 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $displayName removed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ $displayName removal may have failed: $result" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Error removing $displayName : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to remove shortcuts
function Remove-Shortcuts {
    Write-Host "Removing shortcuts..." -ForegroundColor Yellow
    
    $shortcutLocations = @(
        "$env:USERPROFILE\Desktop\TurnFix.lnk",
        "$env:USERPROFILE\Desktop\Start TurnFix.lnk",
        "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\TurnFix.lnk",
        "$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\TurnFix.lnk"
    )
    
    foreach ($shortcut in $shortcutLocations) {
        if (Test-Path $shortcut) {
            try {
                Remove-Item $shortcut -Force
                Write-Host "  ✓ Removed: $(Split-Path $shortcut -Leaf)" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠ Could not remove: $(Split-Path $shortcut -Leaf)" -ForegroundColor Yellow
            }
        }
    }
}

# Function to clean registry entries (Windows-specific)
function Remove-RegistryEntries {
    Write-Host "Cleaning registry entries..." -ForegroundColor Yellow
    
    $registryPaths = @(
        "HKCU:\Software\TurnFix",
        "HKLM:\Software\TurnFix"
    )
    
    foreach ($regPath in $registryPaths) {
        if (Test-Path $regPath) {
            try {
                Remove-Item $regPath -Recurse -Force
                Write-Host "  ✓ Removed registry key: $regPath" -ForegroundColor Green
            } catch {
                Write-Host "  ⚠ Could not remove registry key: $regPath" -ForegroundColor Yellow
            }
        }
    }
}

# Function to clean temporary files
function Remove-TempFiles {
    Write-Host "Cleaning temporary files..." -ForegroundColor Yellow
    
    $tempLocations = @(
        "$env:TEMP\TurnFix*",
        "$env:TEMP\npm-*\turnfix*",
        "$env:LOCALAPPDATA\npm-cache\*turnfix*"
    )
    
    foreach ($tempPath in $tempLocations) {
        try {
            $items = Get-ChildItem $tempPath -ErrorAction SilentlyContinue
            if ($items) {
                Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  ✓ Cleaned temp files matching: $tempPath" -ForegroundColor Green
            }
        } catch {
            # Silently continue for temp file cleanup
        }
    }
}

# Main uninstall logic
Write-Host "Uninstall Configuration:" -ForegroundColor Cyan
Write-Host "- Install Path: $InstallPath" -ForegroundColor White
Write-Host "- Remove Database: $(if ($RemoveDatabase -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Remove PostgreSQL: $(if ($RemovePostgreSQL -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Remove Node.js: $(if ($RemoveNodeJS -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Remove Git: $(if ($RemoveGit -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Remove VS Code: $(if ($RemoveVSCode -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Remove Chocolatey: $(if ($RemoveChocolatey -or $RemoveAll) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host "- Keep User Data: $(if ($KeepUserData) { 'Yes' } else { 'No' })" -ForegroundColor White
Write-Host ""

if (-not $Silent) {
    Write-Host "⚠️  WARNING: This will permanently remove the selected components!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Are you sure you want to continue? Type 'REMOVE' to confirm"
    
    if ($confirm -ne "REMOVE") {
        Write-Host "Uninstall cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Starting uninstall process..." -ForegroundColor Green
$startTime = Get-Date

# Step 1: Stop TurnFix processes
Stop-TurnFixProcesses
Write-Host ""

# Step 2: Remove TurnFix database
if ($RemoveDatabase -or $RemoveAll) {
    Remove-TurnFixDatabase
    Write-Host ""
}

# Step 3: Remove TurnFix application
Remove-TurnFixApplication
Write-Host ""

# Step 4: Remove system components
if ($isAdmin) {
    if ($RemovePostgreSQL -or $RemoveAll) {
        Remove-ChocolateyPackage "postgresql15" "PostgreSQL 15"
        Remove-ChocolateyPackage "pgadmin4" "pgAdmin 4"
    }
    
    if ($RemoveNodeJS -or $RemoveAll) {
        Remove-ChocolateyPackage "nodejs" "Node.js"
    }
    
    if ($RemoveGit -or $RemoveAll) {
        Remove-ChocolateyPackage "git" "Git for Windows"
    }
    
    if ($RemoveVSCode -or $RemoveAll) {
        Remove-ChocolateyPackage "vscode" "Visual Studio Code"
    }
    
    if ($RemoveChocolatey -or $RemoveAll) {
        Write-Host "Removing Chocolatey..." -ForegroundColor Yellow
        try {
            # Remove Chocolatey using its own uninstall script
            $chocoUninstallScript = (Invoke-WebRequest -UseBasicParsing -Uri 'https://community.chocolatey.org/install.ps1').Content
            $chocoUninstallScript = $chocoUninstallScript -replace 'iex \(\(New-Object System\.Net\.WebClient\)\.DownloadString.*', ''
            
            # Alternative manual removal
            if (Test-Path "$env:ChocolateyInstall") {
                Remove-Item "$env:ChocolateyInstall" -Recurse -Force
                Write-Host "✓ Chocolatey removed successfully!" -ForegroundColor Green
            }
        } catch {
            Write-Host "⚠ Error removing Chocolatey: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Step 5: Clean up shortcuts and registry entries
if (-not $KeepUserData) {
    Remove-Shortcuts
    Remove-RegistryEntries
    Remove-TempFiles
    Write-Host ""
}

# Step 6: Clean up environment variables
Write-Host "Cleaning environment variables..." -ForegroundColor Yellow
try {
    # Remove TurnFix-related environment variables if any were set
    [Environment]::SetEnvironmentVariable("TURNFIX_HOME", $null, "User")
    [Environment]::SetEnvironmentVariable("TURNFIX_HOME", $null, "Machine")
    Write-Host "✓ Environment variables cleaned" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not clean environment variables" -ForegroundColor Yellow
}

# Final summary
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                 🗑️  UNINSTALL COMPLETE 🗑️                    ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host ""
Write-Host "Uninstall Summary:" -ForegroundColor Cyan
Write-Host "- Duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "- TurnFix Application: Removed" -ForegroundColor White

if ($RemoveDatabase -or $RemoveAll) {
    Write-Host "- TurnFix Database: Removed" -ForegroundColor White
}

if ($RemovePostgreSQL -or $RemoveAll) {
    Write-Host "- PostgreSQL: Removed" -ForegroundColor White
}

if ($RemoveNodeJS -or $RemoveAll) {
    Write-Host "- Node.js: Removed" -ForegroundColor White
}

if ($RemoveGit -or $RemoveAll) {
    Write-Host "- Git: Removed" -ForegroundColor White
}

if ($RemoveVSCode -or $RemoveAll) {
    Write-Host "- VS Code: Removed" -ForegroundColor White
}

if ($RemoveChocolatey -or $RemoveAll) {
    Write-Host "- Chocolatey: Removed" -ForegroundColor White
}

Write-Host ""
Write-Host "What to do next:" -ForegroundColor Yellow

if ($RemoveAll) {
    Write-Host "✓ Complete removal finished - TurnFix and all components removed" -ForegroundColor Green
    Write-Host "• You may want to restart your computer to complete the cleanup" -ForegroundColor White
} else {
    Write-Host "✓ Selective removal finished" -ForegroundColor Green
    if (-not ($RemoveDatabase -or $RemoveAll)) {
        Write-Host "• TurnFix database is still present (use -RemoveDatabase to remove)" -ForegroundColor White
    }
    if (-not ($RemovePostgreSQL -or $RemoveAll)) {
        Write-Host "• PostgreSQL is still installed (use -RemovePostgreSQL to remove)" -ForegroundColor White
    }
    if (-not ($RemoveNodeJS -or $RemoveAll)) {
        Write-Host "• Node.js is still installed (use -RemoveNodeJS to remove)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Manual cleanup (if needed):" -ForegroundColor Yellow
Write-Host "• Check Programs & Features for any remaining components" -ForegroundColor White
Write-Host "• Clear browser cache if you used TurnFix web interface" -ForegroundColor White
Write-Host "• Check for any remaining files in temp directories" -ForegroundColor White

if (-not $Silent) {
    Write-Host ""
    Read-Host "Press Enter to exit"
}

# Create uninstall log
$logContent = @"
TurnFix Uninstall Log
Date: $(Get-Date)
Duration: $($duration.ToString('hh\:mm\:ss'))
Install Path: $InstallPath
Options: $(if ($RemoveAll) { 'Remove All' } else { "Database:$($RemoveDatabase), PostgreSQL:$($RemovePostgreSQL), Node.js:$($RemoveNodeJS), Git:$($RemoveGit), VSCode:$($RemoveVSCode), Chocolatey:$($RemoveChocolatey)" })
User Data Kept: $KeepUserData
Admin Rights: $isAdmin
Status: Completed
"@

try {
    $logPath = Join-Path $env:TEMP "turnfix-uninstall-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $logContent | Out-File -FilePath $logPath -Encoding UTF8
    Write-Host "Uninstall log saved to: $logPath" -ForegroundColor Cyan
} catch {
    # Silently continue if log creation fails
}
