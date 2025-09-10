# TurnFix Windows Setup - Prerequisites Installer
# This script installs all required components for TurnFix

param(
    [switch]$SkipNodeJS,
    [switch]$SkipPostgreSQL,
    [switch]$SkipGit,
    [switch]$SkipVSCode,
    [string]$PostgreSQLPassword = "turnfix2024"
)

Write-Host "=== TurnFix Windows Setup - Prerequisites Installer ===" -ForegroundColor Green
Write-Host "This script will install:" -ForegroundColor Yellow
Write-Host "- Chocolatey Package Manager" -ForegroundColor White
Write-Host "- Node.js (LTS)" -ForegroundColor White
Write-Host "- PostgreSQL 15 with pgAdmin" -ForegroundColor White
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

# Function to install Chocolatey
function Install-Chocolatey {
    Write-Host "Installing Chocolatey Package Manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
}

# Function to install Node.js
function Install-NodeJS {
    if ($SkipNodeJS) {
        Write-Host "Skipping Node.js installation (--SkipNodeJS flag)" -ForegroundColor Yellow
        return
    }
    
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        Write-Host "Node.js is already installed: $nodeVersion" -ForegroundColor Green
        
        $npmVersion = npm --version
        Write-Host "npm version: $npmVersion" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing Node.js LTS..." -ForegroundColor Yellow
    choco install nodejs-lts -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Host "Node.js installed successfully: $nodeVersion" -ForegroundColor Green
        Write-Host "npm version: $npmVersion" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Node.js installation failed!" -ForegroundColor Red
    }
}

# Function to install PostgreSQL
function Install-PostgreSQL {
    if ($SkipPostgreSQL) {
        Write-Host "Skipping PostgreSQL installation (--SkipPostgreSQL flag)" -ForegroundColor Yellow
        return
    }
    
    # Check if PostgreSQL is already installed
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "PostgreSQL service is already installed" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing PostgreSQL 15 with pgAdmin..." -ForegroundColor Yellow
    Write-Host "PostgreSQL password will be set to: $PostgreSQLPassword" -ForegroundColor Cyan
    
    # Install PostgreSQL
    choco install postgresql15 --params "/Password:$PostgreSQLPassword" -y
    
    # Install pgAdmin (optional but recommended)
    choco install pgadmin4 -y
    
    # Wait for PostgreSQL service to start
    Write-Host "Waiting for PostgreSQL service to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check if PostgreSQL is running
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Write-Host "PostgreSQL installed and running successfully!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: PostgreSQL service may not be running. Please check manually." -ForegroundColor Yellow
    }
}

# Function to install Git
function Install-Git {
    if ($SkipGit) {
        Write-Host "Skipping Git installation (--SkipGit flag)" -ForegroundColor Yellow
        return
    }
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Host "Git is already installed: $gitVersion" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing Git for Windows..." -ForegroundColor Yellow
    choco install git -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Host "Git installed successfully: $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Git installation failed!" -ForegroundColor Red
    }
}

# Function to install Visual Studio Code
function Install-VSCode {
    if ($SkipVSCode) {
        Write-Host "Skipping Visual Studio Code installation (--SkipVSCode flag)" -ForegroundColor Yellow
        return
    }
    
    if (Test-CommandExists "code") {
        Write-Host "Visual Studio Code is already installed" -ForegroundColor Green
        return
    }
    
    Write-Host "Installing Visual Studio Code..." -ForegroundColor Yellow
    choco install vscode -y
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-CommandExists "code") {
        Write-Host "Visual Studio Code installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Visual Studio Code may not be properly installed" -ForegroundColor Yellow
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
        Write-Host "Chocolatey is already installed" -ForegroundColor Green
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
        Write-Host "- Node.js: $nodeVersion" -ForegroundColor White
        Write-Host "- npm: $npmVersion" -ForegroundColor White
    }
    
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Host "- Git: $gitVersion" -ForegroundColor White
    }
    
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-Host "- PostgreSQL: Service running" -ForegroundColor White
        Write-Host "- PostgreSQL Password: $PostgreSQLPassword" -ForegroundColor Cyan
    }
    
    if (Test-CommandExists "code") {
        Write-Host "- Visual Studio Code: Installed" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run 'setup-database.ps1' to create the TurnFix database" -ForegroundColor White
    Write-Host "2. Run 'setup-turnfix.ps1' to clone and configure the TurnFix application" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: You may need to restart your terminal/PowerShell to use the new commands!" -ForegroundColor Red
    
} catch {
    Write-Host "ERROR: Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Read-Host "Press Enter to continue"
