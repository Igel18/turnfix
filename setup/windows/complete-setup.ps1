# TurnFix Complete Windows Setup
# This is the master setup script that installs everything needed for TurnFix

param(
    [string]$InstallPath = "C:\TurnFix",
    [string]$PostgreSQLPassword = "turnfix2024",
    [string]$DatabasePassword = "turnfix_pass",
    [switch]$SkipPrerequisites,
    [switch]$SkipDatabase,
    [switch]$SkipApplication,
    [switch]$Interactive = $true
)

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                    TurnFix Complete Setup                     ║
║              Gymnastics Competition Management                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host ""
Write-Host "This script will set up a complete TurnFix installation on Windows." -ForegroundColor Yellow
Write-Host ""
Write-Host "What will be installed:" -ForegroundColor Cyan
Write-Host "✓ Prerequisites: Node.js, PostgreSQL, Git, VS Code" -ForegroundColor White
Write-Host "✓ Database: TurnFix database and user configuration" -ForegroundColor White
Write-Host "✓ Application: TurnFix source code and dependencies" -ForegroundColor White
Write-Host "✓ Configuration: Environment files and startup scripts" -ForegroundColor White
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  WARNING: This script should be run as Administrator for best results!" -ForegroundColor Yellow
    Write-Host "Some components may fail to install without administrator privileges." -ForegroundColor Yellow
    Write-Host ""
    
    if ($Interactive) {
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            Write-Host "Setup cancelled. Please run as Administrator and try again." -ForegroundColor Yellow
            exit 0
        }
    }
}

Write-Host "Installation Configuration:" -ForegroundColor Cyan
Write-Host "- Install Path: $InstallPath" -ForegroundColor White
Write-Host "- PostgreSQL Password: $PostgreSQLPassword" -ForegroundColor White
Write-Host "- Database Password: $DatabasePassword" -ForegroundColor White
Write-Host ""

if ($Interactive) {
    $proceed = Read-Host "Proceed with installation? (Y/n)"
    if ($proceed -eq "n" -or $proceed -eq "N") {
        Write-Host "Setup cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

$setupPath = $PSScriptRoot
$logFile = Join-Path $setupPath "setup-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"

Write-Host "Setup log will be saved to: $logFile" -ForegroundColor Cyan
Write-Host ""

# Function to log and display messages
function Write-LogMessage {
    param($message, $color = "White")
    Write-Host $message -ForegroundColor $color
    Add-Content -Path $logFile -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $message"
}

# Function to run setup step
function Invoke-SetupStep {
    param($stepName, $scriptPath, $parameters = @{})
    
    Write-LogMessage "=== Starting: $stepName ===" "Yellow"
    
    try {
        $paramString = ($parameters.GetEnumerator() | ForEach-Object { "-$($_.Key) $($_.Value)" }) -join " "
        $command = "& '$scriptPath' $paramString"
        
        Write-LogMessage "Executing: $command" "Cyan"
        Invoke-Expression $command
        
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-LogMessage "$stepName completed successfully!" "Green"
            return $true
        } else {
            Write-LogMessage "$stepName failed with exit code: $LASTEXITCODE" "Red"
            return $false
        }
    } catch {
        Write-LogMessage "$stepName failed with error: $($_.Exception.Message)" "Red"
        return $false
    }
}

# Start setup process
Write-LogMessage "Starting TurnFix complete setup..." "Green"
$startTime = Get-Date

$success = $true

# Step 1: Install Prerequisites
if (-not $SkipPrerequisites) {
    $prereqScript = Join-Path $setupPath "install-prerequisites.ps1"
    if (Test-Path $prereqScript) {
        $params = @{
            "PostgreSQLPassword" = $PostgreSQLPassword
        }
        
        if (-not (Invoke-SetupStep "Prerequisites Installation" $prereqScript $params)) {
            $success = $false
            Write-LogMessage "Prerequisites installation failed!" "Red"
            
            if ($Interactive) {
                $continue = Read-Host "Continue with remaining steps? (y/N)"
                if ($continue -ne "y" -and $continue -ne "Y") {
                    exit 1
                }
            }
        }
    } else {
        Write-LogMessage "Prerequisites script not found: $prereqScript" "Red"
        $success = $false
    }
} else {
    Write-LogMessage "Skipping prerequisites installation (--SkipPrerequisites flag)" "Yellow"
}

Write-Host ""

# Step 2: Setup Database
if (-not $SkipDatabase) {
    $dbScript = Join-Path $setupPath "setup-database.ps1"
    if (Test-Path $dbScript) {
        $params = @{
            "PostgreSQLPassword" = $PostgreSQLPassword
            "DatabasePassword" = $DatabasePassword
        }
        
        if (-not (Invoke-SetupStep "Database Setup" $dbScript $params)) {
            $success = $false
            Write-LogMessage "Database setup failed!" "Red"
            
            if ($Interactive) {
                $continue = Read-Host "Continue with application setup? (y/N)"
                if ($continue -ne "y" -and $continue -ne "Y") {
                    exit 1
                }
            }
        }
    } else {
        Write-LogMessage "Database script not found: $dbScript" "Red"
        $success = $false
    }
} else {
    Write-LogMessage "Skipping database setup (--SkipDatabase flag)" "Yellow"
}

Write-Host ""

# Step 3: Setup Application
if (-not $SkipApplication) {
    $appScript = Join-Path $setupPath "setup-turnfix.ps1"
    if (Test-Path $appScript) {
        $params = @{
            "InstallPath" = $InstallPath
        }
        
        if (-not (Invoke-SetupStep "Application Setup" $appScript $params)) {
            $success = $false
            Write-LogMessage "Application setup failed!" "Red"
        }
    } else {
        Write-LogMessage "Application script not found: $appScript" "Red"
        $success = $false
    }
} else {
    Write-LogMessage "Skipping application setup (--SkipApplication flag)" "Yellow"
}

# Final summary
$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-LogMessage "=== Setup Complete ===" "Green"
Write-LogMessage "Duration: $($duration.ToString('hh\:mm\:ss'))" "Cyan"

if ($success) {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                 🎉 SETUP SUCCESSFUL! 🎉                       ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

    Write-Host ""
    Write-Host "TurnFix has been successfully installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Quick Start:" -ForegroundColor Yellow
    Write-Host "1. Double-click: $InstallPath\start-turnfix.ps1" -ForegroundColor Cyan
    Write-Host "   OR" -ForegroundColor White
    Write-Host "2. Open browser to: http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Installation Details:" -ForegroundColor Yellow
    Write-Host "- Application: $InstallPath" -ForegroundColor White
    Write-Host "- Database: postgresql://localhost:5432/turnfix" -ForegroundColor White
    Write-Host "- Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host "- Backend API: http://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentation and support:" -ForegroundColor Yellow
    Write-Host "- GitHub: https://github.com/Igel18/turnfix" -ForegroundColor Cyan
    Write-Host "- Setup Log: $logFile" -ForegroundColor Cyan
    
} else {
    Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                 ⚠️  SETUP INCOMPLETE ⚠️                       ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Some components failed to install properly." -ForegroundColor Yellow
    Write-Host "Please check the setup log for details: $logFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "1. Run individual setup scripts manually" -ForegroundColor White
    Write-Host "2. Check system requirements and permissions" -ForegroundColor White
    Write-Host "3. Verify internet connection for downloads" -ForegroundColor White
}

Write-Host ""
if ($Interactive) {
    Read-Host "Press Enter to exit"
}
