# TurnFix Windows Setup - Prerequisites Installer (Improved Version)
# This script installs all required components for TurnFix with enhanced version checking

param(
    [switch]$SkipNodeJS,
    [switch]$SkipPostgreSQL,
    [switch]$SkipGit,
    [switch]$SkipVSCode,
    [string]$PostgreSQLPassword = "turnfix2024",
    [switch]$ForceUpdate
)

# Required versions
$REQUIRED_NODE_MAJOR = 18  # Minimum Node.js major version
$REQUIRED_POSTGRES_VERSION = 15
$POSTGRES_DIRECT_DOWNLOAD = "https://get.enterprisedb.com/postgresql/postgresql-15.8-1-windows-x64.exe"

Write-Host "=== TurnFix Windows Setup - Prerequisites Installer (Enhanced) ===" -ForegroundColor Green
Write-Host "This script will install:" -ForegroundColor Yellow
Write-Host "- Chocolatey Package Manager" -ForegroundColor White
Write-Host "- Node.js v$REQUIRED_NODE_MAJOR+ (LTS)" -ForegroundColor White
Write-Host "- PostgreSQL $REQUIRED_POSTGRES_VERSION with pgAdmin" -ForegroundColor White
Write-Host "- Git for Windows" -ForegroundColor White
Write-Host "- Visual Studio Code (optional)" -ForegroundColor White
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to compare versions
function Test-MinimumVersion {
    param(
        [string]$currentVersion,
        [int]$requiredMajor
    )
    
    # Extract major version number from version string like "v18.20.0" or "18.20.0"
    if ($currentVersion -match 'v?(\d+)\.') {
        $majorVersion = [int]$Matches[1]
        return $majorVersion -ge $requiredMajor
    }
    return $false
}

# Function to install Chocolatey
function Install-Chocolatey {
    Write-Host "Installing Chocolatey Package Manager..." -ForegroundColor Yellow
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "✓ Chocolatey installed successfully!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Chocolatey installation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install Node.js
function Install-NodeJS {
    if ($SkipNodeJS) {
        Write-Host "Skipping Node.js installation (--SkipNodeJS flag)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
    
    $needsInstall = $false
    $needsUpdate = $false
    
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        Write-Host "Found Node.js: $nodeVersion" -ForegroundColor White
        
        if (Test-MinimumVersion $nodeVersion $REQUIRED_NODE_MAJOR) {
            Write-Host "✓ Node.js version is compatible (v$REQUIRED_NODE_MAJOR+ required)" -ForegroundColor Green
            
            $npmVersion = npm --version
            Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
            
            if (-not $ForceUpdate) {
                return
            } else {
                Write-Host "⚠ ForceUpdate flag set - will reinstall" -ForegroundColor Yellow
                $needsUpdate = $true
            }
        } else {
            Write-Host "⚠ Node.js version is outdated (v$REQUIRED_NODE_MAJOR+ required)" -ForegroundColor Yellow
            $needsUpdate = $true
        }
    } else {
        Write-Host "Node.js is not installed" -ForegroundColor Yellow
        $needsInstall = $true
    }
    
    if ($needsInstall -or $needsUpdate) {
        Write-Host "Installing Node.js LTS (v$REQUIRED_NODE_MAJOR+)..." -ForegroundColor Yellow
        
        try {
            if ($needsUpdate) {
                choco upgrade nodejs-lts -y
            } else {
                choco install nodejs-lts -y
            }
            
            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            if (Test-CommandExists "node") {
                $nodeVersion = node --version
                $npmVersion = npm --version
                Write-Host "✓ Node.js installed successfully: $nodeVersion" -ForegroundColor Green
                Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
            } else {
                Write-Host "✗ Node.js installation failed!" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Node.js installation error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Function to download file with progress
function Download-FileWithProgress {
    param(
        [string]$url,
        [string]$outputPath
    )
    
    try {
        Write-Host "Downloading from: $url" -ForegroundColor Cyan
        
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($url, $outputPath)
        
        Write-Host "✓ Download completed: $outputPath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Download failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to install PostgreSQL
function Install-PostgreSQL {
    if ($SkipPostgreSQL) {
        Write-Host "Skipping PostgreSQL installation (--SkipPostgreSQL flag)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Checking PostgreSQL installation..." -ForegroundColor Yellow
    
    # Check if PostgreSQL is already installed
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and -not $ForceUpdate) {
        Write-Host "✓ PostgreSQL service is already installed and running" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing PostgreSQL $REQUIRED_POSTGRES_VERSION with pgAdmin..." -ForegroundColor Yellow
    Write-Host "PostgreSQL password will be set to: $PostgreSQLPassword" -ForegroundColor Cyan
    
    # Try Chocolatey first
    $chocoSuccess = $false
    try {
        Write-Host "Attempting installation via Chocolatey..." -ForegroundColor Yellow
        choco install postgresql$REQUIRED_POSTGRES_VERSION --params "/Password:$PostgreSQLPassword" -y
        
        # Wait for service
        Start-Sleep -Seconds 5
        
        $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
        if ($pgService) {
            $chocoSuccess = $true
        }
    } catch {
        Write-Host "⚠ Chocolatey installation failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # Fallback to direct download if Chocolatey failed
    if (-not $chocoSuccess) {
        Write-Host "Attempting direct download installation..." -ForegroundColor Yellow
        
        $tempDir = Join-Path $env:TEMP "turnfix-setup"
        if (-not (Test-Path $tempDir)) {
            New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        }
        
        $installerPath = Join-Path $tempDir "postgresql-installer.exe"
        
        if (Download-FileWithProgress $POSTGRES_DIRECT_DOWNLOAD $installerPath) {
            Write-Host "Running PostgreSQL installer..." -ForegroundColor Yellow
            Write-Host "Please follow the installer prompts..." -ForegroundColor Cyan
            Write-Host "IMPORTANT: Set password to: $PostgreSQLPassword" -ForegroundColor Red
            
            # Run installer with unattended mode parameters
            $installArgs = "--mode unattended --superpassword `"$PostgreSQLPassword`" --serverport 5432 --enable-components server,pgAdmin,commandlinetools"
            Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait
            
            # Clean up
            Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host "✗ Failed to download PostgreSQL installer" -ForegroundColor Red
            Write-Host "Please download manually from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
            return
        }
    }
    
    # Install pgAdmin if not included
    try {
        choco install pgadmin4 -y
    } catch {
        Write-Host "⚠ pgAdmin installation skipped" -ForegroundColor Yellow
    }
    
    # Wait for PostgreSQL service to start
    Write-Host "Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Verify installation
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Write-Host "✓ PostgreSQL installed and running successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠ PostgreSQL service may not be running. Please check manually." -ForegroundColor Yellow
        Write-Host "Check services: services.msc" -ForegroundColor Cyan
    }
}

# Function to install Git
function Install-Git {
    if ($SkipGit) {
        Write-Host "Skipping Git installation (--SkipGit flag)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Checking Git installation..." -ForegroundColor Yellow
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Host "✓ Git is already installed: $gitVersion" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing Git for Windows..." -ForegroundColor Yellow
    
    try {
        choco install git -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Test-CommandExists "git") {
            $gitVersion = git --version
            Write-Host "✓ Git installed successfully: $gitVersion" -ForegroundColor Green
        } else {
            Write-Host "✗ Git installation failed!" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Git installation error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to install Visual Studio Code
function Install-VSCode {
    if ($SkipVSCode) {
        Write-Host "Skipping Visual Studio Code installation (--SkipVSCode flag)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Checking Visual Studio Code installation..." -ForegroundColor Yellow
    
    if (Test-CommandExists "code") {
        Write-Host "✓ Visual Studio Code is already installed" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing Visual Studio Code..." -ForegroundColor Yellow
    
    try {
        choco install vscode -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        if (Test-CommandExists "code") {
            Write-Host "✓ Visual Studio Code installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠ Visual Studio Code may not be properly installed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ VS Code installation error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main installation process
try {
    Write-Host "Starting installation process..." -ForegroundColor Green
    Write-Host ""
    
    # Install Chocolatey first
    if (-not (Test-CommandExists "choco")) {
        Install-Chocolatey
    } else {
        Write-Host "✓ Chocolatey is already installed" -ForegroundColor Green
    }
    
    Write-Host ""
    
    # Install all components
    Install-NodeJS
    Write-Host ""
    
    Install-PostgreSQL
    Write-Host ""
    
    Install-Git
    Write-Host ""
    
    Install-VSCode
    Write-Host ""
    
    Write-Host "=== Installation Summary ===" -ForegroundColor Green
    Write-Host "Prerequisites installation completed!" -ForegroundColor Green
    Write-Host ""
    
    # Display installed versions
    Write-Host "Installed versions:" -ForegroundColor Cyan
    
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "✓ Node.js: $nodeVersion (v$REQUIRED_NODE_MAJOR+ required)" -ForegroundColor White
        Write-Host "✓ npm: $npmVersion" -ForegroundColor White
    } else {
        Write-Host "✗ Node.js: Not installed" -ForegroundColor Red
    }
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Host "✓ Git: $gitVersion" -ForegroundColor White
    } else {
        Write-Host "✗ Git: Not installed" -ForegroundColor Red
    }
    
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "✓ PostgreSQL: Service running (Status: $($pgService.Status))" -ForegroundColor White
        Write-Host "  Password: $PostgreSQLPassword" -ForegroundColor Cyan
    } else {
        Write-Host "✗ PostgreSQL: Service not found" -ForegroundColor Red
    }
    
    if (Test-CommandExists "code") {
        Write-Host "✓ Visual Studio Code: Installed" -ForegroundColor White
    } else {
        Write-Host "⚠ Visual Studio Code: Not installed (optional)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run 'setup-database.ps1' to create the TurnFix database" -ForegroundColor White
    Write-Host "2. Run 'setup-turnfix.ps1' to clone and configure the TurnFix application" -ForegroundColor White
    Write-Host "   OR use 'complete-setup.ps1' to run all steps automatically" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: You may need to restart your terminal/PowerShell to use the new commands!" -ForegroundColor Red
    
} catch {
    Write-Host "✗ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error and try again" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Ensure you are running as Administrator" -ForegroundColor White
    Write-Host "- Check your internet connection" -ForegroundColor White
    Write-Host "- Disable antivirus temporarily" -ForegroundColor White
    Write-Host "- Check Windows Event Viewer for details" -ForegroundColor White
    exit 1
}

Write-Host ""
Read-Host "Press Enter to continue"
