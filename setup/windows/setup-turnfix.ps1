# TurnFix Application Setup Script
# This script clones TurnFix from GitHub and sets up the application

param(
    [string]$InstallPath = "C:\TurnFix",
    [string]$GitRepository = "https://github.com/Igel18/turnfix.git",
    [string]$Branch = "WebInterface",
    [switch]$SkipClone,
    [switch]$SkipDependencies,
    [switch]$SkipDatabase
)

Write-Host "=== TurnFix Application Setup ===" -ForegroundColor Green
Write-Host "Setting up TurnFix application..." -ForegroundColor Yellow
Write-Host ""

# Function to check if command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$missingPrereqs = @()

if (-not (Test-CommandExists "node")) {
    $missingPrereqs += "Node.js"
}

if (-not (Test-CommandExists "npm")) {
    $missingPrereqs += "npm"
}

if (-not (Test-CommandExists "git")) {
    $missingPrereqs += "Git"
}

if ($missingPrereqs.Count -gt 0) {
    Write-Host "ERROR: Missing prerequisites: $($missingPrereqs -join ', ')" -ForegroundColor Red
    Write-Host "Please run 'install-prerequisites.ps1' first!" -ForegroundColor Yellow
    exit 1
}

Write-Host "All prerequisites found!" -ForegroundColor Green
Write-Host ""

# Clone or update repository
if (-not $SkipClone) {
    if (Test-Path $InstallPath) {
        Write-Host "TurnFix directory already exists at: $InstallPath" -ForegroundColor Yellow
        $choice = Read-Host "Do you want to update it? (y/N)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            Write-Host "Updating TurnFix repository..." -ForegroundColor Yellow
            Push-Location $InstallPath
            git pull origin $Branch
            Pop-Location
        }
    } else {
        Write-Host "Cloning TurnFix repository to: $InstallPath" -ForegroundColor Yellow
        git clone -b $Branch $GitRepository $InstallPath
        
        if (-not (Test-Path $InstallPath)) {
            Write-Host "ERROR: Failed to clone repository!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Repository cloned successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "Skipping repository clone (--SkipClone flag)" -ForegroundColor Yellow
}

Write-Host ""

# Navigate to TurnFix directory
if (-not (Test-Path $InstallPath)) {
    Write-Host "ERROR: TurnFix directory not found at: $InstallPath" -ForegroundColor Red
    exit 1
}

Push-Location $InstallPath

# Setup backend (server)
if (-not $SkipDependencies) {
    Write-Host "Setting up backend dependencies..." -ForegroundColor Yellow
    $serverPath = Join-Path $InstallPath "newWebBased\server"
    
    if (Test-Path $serverPath) {
        Push-Location $serverPath
        
        Write-Host "Installing server dependencies..." -ForegroundColor Cyan
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to install server dependencies!" -ForegroundColor Red
            Pop-Location
            Pop-Location
            exit 1
        }
        
        Write-Host "Server dependencies installed successfully!" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "WARNING: Server directory not found at: $serverPath" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Setup frontend (client)
    Write-Host "Setting up frontend dependencies..." -ForegroundColor Yellow
    $clientPath = Join-Path $InstallPath "newWebBased\client"
    
    if (Test-Path $clientPath) {
        Push-Location $clientPath
        
        Write-Host "Installing client dependencies..." -ForegroundColor Cyan
        npm install
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Failed to install client dependencies!" -ForegroundColor Red
            Pop-Location
            Pop-Location
            exit 1
        }
        
        Write-Host "Client dependencies installed successfully!" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "WARNING: Client directory not found at: $clientPath" -ForegroundColor Yellow
    }
} else {
    Write-Host "Skipping dependency installation (--SkipDependencies flag)" -ForegroundColor Yellow
}

Write-Host ""

# Setup environment configuration
Write-Host "Setting up environment configuration..." -ForegroundColor Yellow
$serverPath = Join-Path $InstallPath "newWebBased\server"
$envPath = Join-Path $serverPath ".env"
$envTemplatePath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.template"

if (Test-Path $envTemplatePath) {
    if (-not (Test-Path $envPath)) {
        Copy-Item $envTemplatePath $envPath
        Write-Host "Environment file created at: $envPath" -ForegroundColor Green
        Write-Host "Please review and update the configuration if needed!" -ForegroundColor Yellow
    } else {
        Write-Host "Environment file already exists: $envPath" -ForegroundColor Green
    }
} else {
    Write-Host "WARNING: Environment template not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file manually in the server directory" -ForegroundColor Yellow
}

# Setup database schema
if (-not $SkipDatabase) {
    Write-Host "Setting up database schema..." -ForegroundColor Yellow
    $serverPath = Join-Path $InstallPath "newWebBased\server"
    
    if (Test-Path $serverPath) {
        Push-Location $serverPath
        
        Write-Host "Generating Prisma client..." -ForegroundColor Cyan
        npx prisma generate
        
        Write-Host "Running database migrations..." -ForegroundColor Cyan
        npx prisma db push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Database schema created successfully!" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Database schema setup may have failed!" -ForegroundColor Yellow
            Write-Host "Please check your database connection and try again" -ForegroundColor Yellow
        }
        
        Pop-Location
    }
} else {
    Write-Host "Skipping database setup (--SkipDatabase flag)" -ForegroundColor Yellow
}

Pop-Location

Write-Host ""
Write-Host "=== TurnFix Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Installation Details:" -ForegroundColor Cyan
Write-Host "- Installation Path: $InstallPath" -ForegroundColor White
Write-Host "- Server Path: $InstallPath\newWebBased\server" -ForegroundColor White
Write-Host "- Client Path: $InstallPath\newWebBased\client" -ForegroundColor White
Write-Host ""
Write-Host "To start TurnFix:" -ForegroundColor Yellow
Write-Host "1. Open two PowerShell/Command Prompt windows" -ForegroundColor White
Write-Host "2. In first window:" -ForegroundColor White
Write-Host "   cd `"$InstallPath\newWebBased\server`"" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host "3. In second window:" -ForegroundColor White
Write-Host "   cd `"$InstallPath\newWebBased\client`"" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Open your browser and go to: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "For convenience, you can also use the start-turnfix.ps1 script!" -ForegroundColor Yellow

# Create start script
$startScriptContent = @"
# TurnFix Startup Script
# This script starts both the backend and frontend servers

param(
    [string]`$TurnFixPath = "$InstallPath"
)

Write-Host "=== Starting TurnFix Application ===" -ForegroundColor Green
Write-Host ""

`$serverPath = Join-Path `$TurnFixPath "newWebBased\server"
`$clientPath = Join-Path `$TurnFixPath "newWebBased\client"

# Check if paths exist
if (-not (Test-Path `$serverPath)) {
    Write-Host "ERROR: Server path not found: `$serverPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path `$clientPath)) {
    Write-Host "ERROR: Client path not found: `$clientPath" -ForegroundColor Red
    exit 1
}

Write-Host "Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '`$serverPath'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting frontend client..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '`$clientPath'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "TurnFix is starting up!" -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please wait a moment for both servers to start completely." -ForegroundColor Yellow

Start-Sleep -Seconds 5

# Try to open browser
try {
    Start-Process "http://localhost:5173"
    Write-Host "Browser opened automatically!" -ForegroundColor Green
} catch {
    Write-Host "Please open your browser manually and go to: http://localhost:5173" -ForegroundColor Yellow
}
"@

$startScriptPath = Join-Path $InstallPath "start-turnfix.ps1"
$startScriptContent | Out-File -FilePath $startScriptPath -Encoding UTF8
Write-Host "Startup script created at: $startScriptPath" -ForegroundColor Green

Write-Host ""
Read-Host "Press Enter to continue"
