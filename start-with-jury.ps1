# TurnFix with Jury Portal Startup Script
Write-Host "Starting TurnFix with Jury Portal..." -ForegroundColor Green

# Get the script directory and change to the repository root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
$currentDir = Get-Location
Write-Host "Working directory: $currentDir" -ForegroundColor Cyan

# Define paths relative to current directory
$serverPath = Join-Path $currentDir "newWebBased\server"
$clientPath = Join-Path $currentDir "newWebBased\client"
$juryPortalPath = Join-Path $currentDir "newWebBased\jury-portal"

# Verify paths exist
if (-not (Test-Path $serverPath)) {
    Write-Host "Server path not found: $serverPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $clientPath)) {
    Write-Host "Client path not found: $clientPath" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $juryPortalPath)) {
    Write-Host "Jury Portal path not found: $juryPortalPath" -ForegroundColor Red
    exit 1
}

Write-Host "All paths verified:" -ForegroundColor Green
Write-Host "  Server: $serverPath" -ForegroundColor White
Write-Host "  Client: $clientPath" -ForegroundColor White
Write-Host "  Jury Portal: $juryPortalPath" -ForegroundColor White

# Stop any existing processes first
Write-Host "Stopping any existing servers..." -ForegroundColor Red
try {
    Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*3001*" -or $_.MainWindowTitle -like "*5173*" -or $_.MainWindowTitle -like "*5174*" } | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {
    # Ignore errors
}

# Get the network IP address
$networkIP = try {
    (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254.*" }).IPAddress
} catch {
    try {
        (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254.*" }).IPAddress
    } catch {
        "localhost"
    }
}

if (-not $networkIP) {
    $networkIP = "localhost"
}

Write-Host "Network IP detected: $networkIP" -ForegroundColor Yellow

# Set environment variable for API URL (without /api suffix - Vite proxy will add it)
$env:VITE_API_URL = "http://${networkIP}:3001"

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host "  Main Server (API): http://localhost:3001" -ForegroundColor White
Write-Host "  Main Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "  Jury Portal: http://localhost:5174" -ForegroundColor Yellow
Write-Host "  Network Jury Portal: http://${networkIP}:5174" -ForegroundColor Green

Write-Host ""
Write-Host "Access URLs for Jury:" -ForegroundColor Magenta
Write-Host "  Desktop: http://localhost:5174" -ForegroundColor White
Write-Host "  Mobile: http://${networkIP}:5174" -ForegroundColor White

Write-Host ""
Write-Host "Starting servers concurrently..." -ForegroundColor Green

# Start main server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$serverPath'; Write-Host 'Starting Main Server...' -ForegroundColor Blue; npm run dev"

Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow

# Wait for server to be ready with health check
$maxAttempts = 20
$attempt = 0
$serverReady = $false

while (-not $serverReady -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempt++
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/configuration" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response) {
            $serverReady = $true
            Write-Host "Server is ready!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  Attempt $attempt/$maxAttempts - Server not ready yet..." -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "Server failed to start after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "Please check the server logs and try again." -ForegroundColor Red
    exit 1
}

# Start main client  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$clientPath'; Write-Host 'Starting Main Client...' -ForegroundColor Blue; npm run dev"

# Wait a moment
Start-Sleep -Seconds 3

# Start jury portal (separate app)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$juryPortalPath'; Write-Host 'Starting Jury Portal (Separate)...' -ForegroundColor Yellow; npm run dev"

Write-Host ""
Write-Host "All services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Jury Portal Features:" -ForegroundColor Cyan
Write-Host "  Dedicated port (5174) - no dashboard confusion" -ForegroundColor White
Write-Host "  Real data from database" -ForegroundColor White  
Write-Host "  Actual participants per squad/device" -ForegroundColor White
Write-Host "  Mobile-friendly interface" -ForegroundColor White
Write-Host "  Network accessible for tablets/phones" -ForegroundColor White

Write-Host ""
Write-Host "Please wait 10-15 seconds for client services to be ready..." -ForegroundColor Yellow
Write-Host "Server is already verified and running!" -ForegroundColor Green

# Optional: Open browsers
Write-Host ""
$openBrowser = Read-Host "Open browsers automatically? (y/n)"
if ($openBrowser -eq "y") {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:5173"  # Main app
    Start-Process "http://localhost:5174"  # Jury portal
}

Write-Host ""
Write-Host "Setup complete! All services should be running." -ForegroundColor Green
